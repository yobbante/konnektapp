import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, PackageCheck, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BG = "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)";

/**
 * ConfirmReception — Delivery confirmation page
 * 
 * Can be used by:
 * - Client: to confirm they received their parcel
 * - GP: to confirm delivery using the delivery code (alternative to client scan)
 * - Recipient: anyone with the delivery code can confirm
 * 
 * The delivery code is the primary mechanism — no scan required.
 */
export default function ConfirmReception() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") || "";

  const [deliveryCode, setDeliveryCode] = useState("");
  const [conditionOk, setConditionOk] = useState(false);
  const [contentOk, setContentOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [step, setStep] = useState<"verify" | "confirm">("verify");
  const [error, setError] = useState("");

  const canConfirm = deliveryCode.trim().length >= 4 && conditionOk && contentOk;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    setError("");
    
    try {
      // 1. Mark order as delivered
      if (orderId && orderId.length > 10) {
        await supabase
          .from("orders")
          .update({ status: "delivered", actual_delivery_date: new Date().toISOString() })
          .eq("id", orderId);
      }

      // 2. Release funds via release-funds-v2 (unique point de release)
      const { data, error: fnError } = await supabase.functions.invoke("release-funds-v2", {
        body: {
          order_id: orderId,
          delivery_code: deliveryCode.trim(),
          idempotency_key: `release-${orderId}-${Date.now()}`,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || "Erreur lors de la libération des fonds");
      }

      // Check if the response contains an error
      if (data?.error) {
        setError(data.error);
        setStep("verify");
        toast.error(data.error);
        return;
      }
      
      setConfirmed(true);
      toast.success("Réception confirmée ! Paiement libéré au transporteur.");
    } catch (err: any) {
      setError(err.message || "Erreur lors de la confirmation");
      toast.error(err.message || "Erreur lors de la confirmation");
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: BG }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Réception confirmée</h2>
          <p className="text-white/50 text-sm text-center max-w-[280px]">
            Votre colis a été marqué comme livré. Les fonds ont été libérés au transporteur.
          </p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500/10 border border-emerald-400/20">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-semibold">Escrow libéré</span>
          </div>
          <Button
            onClick={() => navigate("/historique")}
            className="mt-4 bg-emerald-500/20 text-emerald-400 border border-emerald-400/25 hover:bg-emerald-500/30"
          >
            Voir l'historique
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Confirmer la réception</h1>
          <p className="text-xs text-white/40">Code de livraison = clé de libération des fonds</p>
        </div>
      </div>

      <div className="px-5 space-y-5">
        <div className="flex gap-2">
          <div className={`flex-1 h-1 rounded-full ${step === "verify" ? "bg-emerald-400" : "bg-emerald-400"}`} />
          <div className={`flex-1 h-1 rounded-full ${step === "confirm" ? "bg-emerald-400" : "bg-white/10"}`} />
        </div>

        {step === "verify" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-400/20 bg-amber-500/10">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-300">Pas besoin de scanner</p>
                <p className="text-[11px] text-amber-200/60 mt-0.5 leading-relaxed">
                  Entrez le code de livraison fourni par le transporteur. Ce code confirme la réception et libère le paiement automatiquement. Le client ou le destinataire peut confirmer.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl border border-red-400/20 bg-red-500/10">
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {orderId && (
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                <p className="text-xs text-white/40">Commande</p>
                <p className="text-sm font-semibold text-white font-mono mt-0.5">{orderId.slice(0, 8)}...</p>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-white/60 mb-2 block">Code de livraison</label>
              <Input
                value={deliveryCode}
                onChange={(e) => { setDeliveryCode(e.target.value.toUpperCase()); setError(""); }}
                placeholder="Ex: AB12CD"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 text-lg font-bold tracking-widest h-14 text-center"
                maxLength={8}
              />
              <p className="text-[10px] text-white/30 mt-1">Code fourni par le transporteur lors de la remise</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-white/60">Checklist</p>
              
              <label className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.03] cursor-pointer">
                <Checkbox checked={conditionOk} onCheckedChange={(c) => setConditionOk(!!c)}
                  className="mt-0.5 border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-white">Emballage intact</p>
                  <p className="text-[11px] text-white/40">Le colis n'est pas endommagé</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.03] cursor-pointer">
                <Checkbox checked={contentOk} onCheckedChange={(c) => setContentOk(!!c)}
                  className="mt-0.5 border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-white">Contenu conforme</p>
                  <p className="text-[11px] text-white/40">Les articles correspondent</p>
                </div>
              </label>
            </div>

            <Button onClick={() => setStep("confirm")} disabled={!canConfirm}
              className="w-full py-6 bg-emerald-500/20 text-emerald-400 border border-emerald-400/25 hover:bg-emerald-500/30 disabled:opacity-30 font-bold text-base">
              Continuer
            </Button>
          </motion.div>
        )}

        {step === "confirm" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div className="p-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 flex flex-col items-center gap-3">
              <PackageCheck className="w-12 h-12 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Confirmer et libérer les fonds ?</h3>
              <p className="text-xs text-white/50 text-center leading-relaxed">
                En confirmant, le paiement escrow sera automatiquement libéré au transporteur.
              </p>
              <p className="text-[11px] text-white/30 font-mono">Code: {deliveryCode}</p>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setStep("verify")} variant="outline"
                className="flex-1 border-white/[0.08] text-white/60 bg-transparent hover:bg-white/[0.04]">
                Retour
              </Button>
              <motion.button onClick={handleConfirm} disabled={loading}
                className="flex-1 py-3 rounded-lg font-bold text-base bg-emerald-500 text-white disabled:opacity-40 flex items-center justify-center gap-2"
                whileTap={{ scale: 0.97 }}>
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><CheckCircle2 className="w-5 h-5" /> Confirmer</>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        <div className="pb-10" />
      </div>
    </div>
  );
}
