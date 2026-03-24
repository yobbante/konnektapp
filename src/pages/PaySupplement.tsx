import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Info, CheckCircle2, Scale, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BG = "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)";

const paymentMethods = [
  { id: "wallet", label: "Konnekt Wallet", icon: "", desc: "Solde disponible" },
  { id: "wave", label: "Wave", icon: "", desc: "Mobile money" },
  { id: "orange", label: "Orange Money", icon: "🟠", desc: "Mobile money" },
];

interface OrderDetails {
  id: string;
  order_number: string;
  weight: number;
  total_price: number;
  currency: string;
  price_per_kg: number;
  weight_tier_applied: string | null;
  financial_status: string;
  status: string;
}

export default function PaySupplement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [selectedMethod, setSelectedMethod] = useState("wallet");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [supplement, setSupplement] = useState(0);

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, weight, total_price, currency, price_per_kg, weight_tier_applied, financial_status, status")
        .eq("id", orderId)
        .maybeSingle();
      
      if (error || !data) {
        toast.error("Commande non trouvée");
        navigate(-1);
        return;
      }
      
      setOrder(data);
      
      // Calculate supplement from weight difference
      const newWeight = parseFloat(data.weight_tier_applied || "0");
      const oldWeight = data.weight;
      const basePricePerKg = data.price_per_kg;
      
      if (newWeight > 0 && newWeight !== oldWeight) {
        // TMA: for <1kg, tarif minimum = basePricePerKg * 1.5
        let newPrice: number;
        if (newWeight > 0 && newWeight <= 1) {
          newPrice = Math.round(basePricePerKg * 1.5);
        } else {
          newPrice = Math.round(newWeight * basePricePerKg);
        }
        const diff = newPrice - data.total_price;
        setSupplement(Math.max(0, diff));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!order || supplement <= 0) return;
    setPaying(true);
    
    try {
      const newWeight = parseFloat(order.weight_tier_applied || "0");
      const newTotal = order.total_price + supplement;
      
      // Update order: pay supplement, update weight, unblock transit
      const { error } = await supabase.from("orders").update({
        weight: newWeight,
        total_price: newTotal,
        financial_status: "escrow_locked",
        status: "checked_in", // Unblock back to checked_in
      }).eq("id", order.id);
      
      if (error) throw error;

      // Sync escrow_transactions with new amount
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("escrow_transactions").update({
        amount: newTotal,
      }).eq("order_id", order.id).eq("status", "held");

      // Update client wallet escrow_balance with supplement delta
      if (user) {
        const { data: cw } = await supabase
          .from("client_wallets")
          .select("escrow_balance")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cw) {
          await supabase.from("client_wallets").update({
            escrow_balance: (cw.escrow_balance || 0) + supplement,
            updated_at: new Date().toISOString(),
          }).eq("user_id", user.id);
        }
      }
      
      // Log in order history
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: "checked_in",
        changed_by: user?.id,
        changed_by_type: "client",
        notes: `Supplément de ${supplement.toLocaleString()} ${order.currency} payé via ${selectedMethod}. Poids: ${order.weight}kg → ${newWeight}kg. Transit débloqué.`,
      });

      // Log supplement in escrow_logs
      await supabase.from("escrow_logs").insert({
        order_id: order.id,
        action: "supplement_paid",
        previous_amount: order.total_price,
        new_amount: newTotal,
        commission_amount: 0,
        actor: "client",
      });
      
      setPaid(true);
      toast.success("Supplément payé ! Transit débloqué.");
    } catch (err) {
      console.error("Payment error:", err);
      toast.error("Erreur lors du paiement");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

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
            Supplément de {supplement.toLocaleString()} {order?.currency} payé. Votre colis peut maintenant partir en transit.
          </p>
          {order && (
            <p className="text-white/30 text-xs font-mono">{order.order_number}</p>
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
      <div className="flex items-center gap-3 px-5 pt-safe pb-4 pt-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Payer le supplément</h1>
          <p className="text-xs text-white/40">Ajustement de poids détecté</p>
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* Weight change details */}
        {order && (
          <div className="p-4 rounded-xl border border-amber-400/20 bg-amber-500/10 space-y-3">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-amber-400 text-sm">Modification de poids</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/[0.05]">
                <p className="text-[10px] text-white/40 uppercase">Poids déclaré</p>
                <p className="text-lg font-bold text-white">{order.weight} kg</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-400/20">
                <p className="text-[10px] text-amber-400 uppercase">Poids réel</p>
                <p className="text-lg font-bold text-white">{order.weight_tier_applied || order.weight} kg</p>
              </div>
            </div>
            <p className="text-white/30 text-xs font-mono">{order.order_number}</p>
          </div>
        )}

        {/* Supplement amount */}
        <div className="p-5 rounded-xl border-2 border-red-400/30 bg-red-500/10 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-sm font-semibold text-red-400">Supplément à payer</p>
          </div>
          <p className="text-3xl font-bold text-red-400">
            {supplement.toLocaleString()} {order?.currency || "FCFA"}
          </p>
          <p className="text-[11px] text-red-300/60">
            Ce montant doit être réglé pour débloquer le transit de votre colis
          </p>
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
          disabled={paying || supplement <= 0}
          className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          whileTap={{ scale: 0.97 }}
        >
          {paying ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Payer {supplement.toLocaleString()} {order?.currency || "FCFA"}
            </>
          )}
        </motion.button>

        <div className="pb-10" />
      </div>
    </div>
  );
}