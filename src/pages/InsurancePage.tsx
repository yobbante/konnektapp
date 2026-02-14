import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShieldCheck, Shield, ShieldAlert, CheckCircle2, Info, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BG = "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)";

interface InsuranceTier {
  id: string;
  label: string;
  category: string;
  max_declared_value: number;
  insurance_fee: number;
  is_active: boolean;
}

export default function InsurancePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") || "";

  const [tiers, setTiers] = useState<InsuranceTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    const { data } = await supabase
      .from("insurance_tiers")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    
    if (data) setTiers(data);
    setLoading(false);
  };

  const getTierIcon = (category: string) => {
    if (category === "premium" || category === "gold") return Star;
    if (category === "standard") return Shield;
    return ShieldCheck;
  };

  const getTierColor = (category: string) => {
    if (category === "premium" || category === "gold") return { border: "border-amber-400/30", bg: "bg-amber-500/10", text: "text-amber-400" };
    if (category === "standard") return { border: "border-sky-400/30", bg: "bg-sky-500/10", text: "text-sky-400" };
    return { border: "border-emerald-400/30", bg: "bg-emerald-500/10", text: "text-emerald-400" };
  };

  const handleSubscribe = async () => {
    if (!selectedTier) return;
    setSubscribing(true);
    await new Promise(r => setTimeout(r, 1500));
    setSubscribed(true);
    setSubscribing(false);
    toast.success("Assurance activée avec succès !");
  };

  if (subscribed) {
    const tier = tiers.find(t => t.id === selectedTier);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: BG }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Assurance activée</h2>
          <p className="text-white/50 text-sm text-center max-w-[280px]">
            Votre envoi est couvert jusqu'à {tier?.max_declared_value.toLocaleString()} FCFA avec l'assurance {tier?.label}.
          </p>
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
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Assurance Konnekt</h1>
          <p className="text-xs text-white/40">Protégez vos envois contre les imprévus</p>
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* Info */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-400/20 bg-emerald-500/5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-300">Protection complète</p>
            <p className="text-[11px] text-emerald-200/60 mt-0.5 leading-relaxed">
              L'assurance Konnekt couvre les dommages, pertes et retards au-delà des délais contractuels.
            </p>
          </div>
        </div>

        {/* Order ref */}
        {orderId && (
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.03]">
            <p className="text-xs text-white/40">Commande</p>
            <p className="text-sm font-semibold text-white font-mono mt-0.5">{orderId}</p>
          </div>
        )}

        {/* Tiers */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : tiers.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-white/60">Choisissez votre niveau de couverture</p>
            {tiers.map((tier) => {
              const colors = getTierColor(tier.category);
              const Icon = getTierIcon(tier.category);
              const isSelected = selectedTier === tier.id;

              return (
                <motion.button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? `${colors.border} ${colors.bg}`
                      : "border-white/[0.06] bg-white/[0.03]"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg}`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">{tier.label}</h3>
                        {isSelected && <CheckCircle2 className={`w-5 h-5 ${colors.text}`} />}
                      </div>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        Couverture jusqu'à {tier.max_declared_value.toLocaleString()} FCFA
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-base font-bold ${colors.text}`}>
                          {tier.insurance_fee.toLocaleString()} FCFA
                        </span>
                        <span className="text-[10px] text-white/30">/ envoi</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : (
          /* Fallback tiers when DB is empty */
          <div className="space-y-3">
            <p className="text-xs font-semibold text-white/60">Niveaux de couverture</p>
            {[
              { label: "Basique", max: 50000, fee: 500, cat: "basic" },
              { label: "Standard", max: 200000, fee: 1500, cat: "standard" },
              { label: "Premium", max: 500000, fee: 3000, cat: "premium" },
            ].map((tier, i) => {
              const colors = getTierColor(tier.cat);
              const Icon = getTierIcon(tier.cat);
              const fakeId = `tier-${i}`;
              const isSelected = selectedTier === fakeId;

              return (
                <motion.button
                  key={fakeId}
                  onClick={() => setSelectedTier(fakeId)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${
                    isSelected ? `${colors.border} ${colors.bg}` : "border-white/[0.06] bg-white/[0.03]"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg}`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">{tier.label}</h3>
                        {isSelected && <CheckCircle2 className={`w-5 h-5 ${colors.text}`} />}
                      </div>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        Couverture jusqu'à {tier.max.toLocaleString()} FCFA
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-base font-bold ${colors.text}`}>
                          {tier.fee.toLocaleString()} FCFA
                        </span>
                        <span className="text-[10px] text-white/30">/ envoi</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Subscribe button */}
        <motion.button
          onClick={handleSubscribe}
          disabled={!selectedTier || subscribing}
          className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 bg-emerald-500 text-white disabled:opacity-30 disabled:cursor-not-allowed"
          whileTap={{ scale: 0.97 }}
        >
          {subscribing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Activer l'assurance
            </>
          )}
        </motion.button>

        {/* Fine print */}
        <p className="text-[10px] text-white/25 text-center leading-relaxed pb-10">
          En activant l'assurance, vous acceptez les conditions générales de couverture Konnekt. 
          Remboursement sous 48h en cas de sinistre vérifié.
        </p>
      </div>
    </div>
  );
}
