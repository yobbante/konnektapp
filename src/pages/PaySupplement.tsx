import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BG = "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)";

const paymentMethods = [
  { id: "wallet", label: "Konnekt Wallet", icon: "💳", desc: "Solde disponible" },
  { id: "wave", label: "Wave", icon: "🌊", desc: "Mobile money" },
  { id: "orange", label: "Orange Money", icon: "🟠", desc: "Mobile money" },
];

export default function PaySupplement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("wallet");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  const handlePay = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }
    setLoading(true);
    // Simulate payment processing
    await new Promise(r => setTimeout(r, 1500));
    setPaid(true);
    setLoading(false);
    toast.success("Supplément payé avec succès !");
  };

  if (paid) {
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
          <h2 className="text-xl font-bold text-white">Paiement confirmé</h2>
          <p className="text-white/50 text-sm text-center">
            Votre supplément de {parseInt(amount).toLocaleString()} FCFA a été payé via {paymentMethods.find(m => m.id === selectedMethod)?.label}.
          </p>
          {orderId && (
            <p className="text-white/30 text-xs font-mono">Commande: {orderId}</p>
          )}
          <Button
            onClick={() => navigate(-1)}
            className="mt-4 bg-emerald-500/20 text-emerald-400 border border-emerald-400/25 hover:bg-emerald-500/30"
          >
            Retour
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-safe pb-4 pt-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Payer un supplément</h1>
          <p className="text-xs text-white/40">Ajustement de poids ou frais additionnels</p>
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-sky-400/20 bg-sky-500/10">
          <Info className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-sky-300/80 leading-relaxed">
            Un supplément peut être demandé si le poids réel dépasse la déclaration initiale ou pour des services additionnels.
          </p>
        </div>

        {/* Order reference */}
        {orderId && (
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.03]">
            <p className="text-xs text-white/40">Commande</p>
            <p className="text-sm font-semibold text-white font-mono mt-0.5">{orderId}</p>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="text-xs font-semibold text-white/60 mb-2 block">Montant (FCFA)</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ex: 2500"
            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 text-lg font-bold h-14"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="text-xs font-semibold text-white/60 mb-2 block">Motif (optionnel)</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Poids supérieur de 2kg"
            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
          />
        </div>

        {/* Payment method */}
        <div>
          <label className="text-xs font-semibold text-white/60 mb-2 block">Mode de paiement</label>
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  selectedMethod === method.id
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : "border-white/[0.06] bg-white/[0.03]"
                }`}
              >
                <span className="text-xl">{method.icon}</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{method.label}</p>
                  <p className="text-[11px] text-white/40">{method.desc}</p>
                </div>
                {selectedMethod === method.id && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pay button */}
        <motion.button
          onClick={handlePay}
          disabled={loading || !amount}
          className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          whileTap={{ scale: 0.97 }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Payer {amount ? `${parseInt(amount).toLocaleString()} FCFA` : ""}
            </>
          )}
        </motion.button>

        <div className="pb-10" />
      </div>
    </div>
  );
}
