import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, CheckCircle2, Scale, AlertTriangle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { calculatePrice } from "@/lib/gpPricingEngine";
import { loadExchangeRates, convertAmount, type ExchangeRate } from "@/lib/currencyUtils";

const BG = "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)";

const paymentMethods = [
  { id: "wallet", label: "Konnekt Wallet", icon: "💳", desc: "Solde disponible" },
  { id: "wave", label: "Wave", icon: "🌊", desc: "Mobile money" },
  { id: "orange", label: "Orange Money", icon: "🟠", desc: "Mobile money" },
];

interface OrderDetails {
  id: string;
  order_number: string;
  weight: number;
  declared_weight: number | null;
  total_price: number;
  currency: string;
  price_per_kg: number;
  adjustment_amount: number | null;
  weight_tier_applied: string | null;
  financial_status: string;
  status: string;
  gp_id: string | null;
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
  const [supplementInOrderCurrency, setSupplementInOrderCurrency] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletCurrency, setWalletCurrency] = useState("USD");
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [lastPaidAmount, setLastPaidAmount] = useState(0);

  useEffect(() => {
    loadExchangeRates().then(setRates);
  }, []);

  useEffect(() => {
    if (orderId && rates.length > 0) loadOrder();
    loadWallet();
  }, [orderId, rates]);

  const loadWallet = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: wallet } = await supabase
      .from("client_wallets")
      .select("available_balance, currency")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (wallet) {
      setWalletBalance(wallet.available_balance || 0);
      setWalletCurrency(wallet.currency || "USD");
    } else {
      setWalletCurrency("USD");
      setWalletBalance(0);
    }
  };

  const loadOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, weight, declared_weight, total_price, currency, price_per_kg, adjustment_amount, weight_tier_applied, financial_status, status, gp_id")
        .eq("id", orderId)
        .maybeSingle();
      
      if (error || !data) {
        toast.error("Commande non trouvée");
        navigate(-1);
        return;
      }
      
      setOrder(data);

      // Calculate supplement in the ORDER's currency (GP currency) using pricing engine
      // IMPORTANT: once payment is done, we must trust persisted adjustment_amount/status
      // and never recompute a stale supplement from weights.
      const newWeight = parseFloat(data.weight_tier_applied || String(data.declared_weight || 0));
      const previousWeight = Number(data.weight ?? 0);
      const basePricePerKg = data.price_per_kg;
      const orderCurrency = data.currency || "XOF";

      let supplementInGpCurrency = 0;

      if (newWeight > 0 && previousWeight > 0 && newWeight !== previousWeight && basePricePerKg > 0) {
        const config = {
          basePricePerKg,
          forfaitValise23kg: Math.round(basePricePerKg * 23 * 0.85),
          currency: orderCurrency,
        };
        const nextTransport = calculatePrice(newWeight, config);
        const previousTransport = calculatePrice(previousWeight, config);
        supplementInGpCurrency = Math.max(0, nextTransport - previousTransport);
      }

      const isPendingSupplement = data.status === "weight_pending_payment";
      const persistedAdjustment = isPendingSupplement
        ? (typeof data.adjustment_amount === "number" && data.adjustment_amount > 0
            ? data.adjustment_amount
            : supplementInGpCurrency)
        : 0;

      // Store supplement in order currency
      setSupplementInOrderCurrency(persistedAdjustment);
      setSupplement(persistedAdjustment);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!order || supplement <= 0) return;
    setPaying(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("pay-weight-supplement", {
        body: {
          order_id: order.id,
          payment_method: selectedMethod,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setLastPaidAmount(supplementInOrderCurrency);

      if (data?.wallet) {
        setWalletBalance(data.wallet.available_balance || 0);
        setWalletCurrency(data.wallet.currency || walletCurrency || "USD");
      }

      if (data?.order) {
        setOrder(data.order);
      }

      setSupplement(0);
      setSupplementInOrderCurrency(0);
      setPaid(true);
      toast.success("Supplément payé ! Transit débloqué.");
    } catch (err) {
      console.error("Payment error:", err);
      toast.error(err instanceof Error ? err.message : "Erreur lors du paiement");
    } finally {
      setPaying(false);
    }
  };

  const currencySymbol = getCurrencySymbol(walletCurrency);
  const orderCurrencySymbol = getCurrencySymbol(order?.currency || "XOF");

  // Convert supplement to wallet currency for display on the wallet card
  let supplementInWalletCurrency = supplementInOrderCurrency;
  if (order && walletCurrency !== (order.currency || "XOF") && rates.length > 0) {
    supplementInWalletCurrency = Math.ceil(convertAmount(supplementInOrderCurrency, order.currency || "XOF", walletCurrency, rates));
  }

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
            Supplément de {lastPaidAmount.toLocaleString()} {orderCurrencySymbol} payé. Votre colis peut maintenant passer à l'étape suivante.
          </p>
          {selectedMethod === "wallet" && (
            <p className="text-white/40 text-xs">
              Solde restant : {walletBalance.toLocaleString("fr-FR")} {currencySymbol}
            </p>
          )}
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
        {/* Wallet balance card */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-white/40 uppercase tracking-wider">Solde Konnekt</p>
            <p className="text-lg font-bold text-white">
              {walletBalance.toLocaleString("fr-FR")} {currencySymbol}
            </p>
            {selectedMethod === "wallet" && supplementInWalletCurrency > 0 && (
              <p className="text-[10px] text-white/30">
                Après paiement : {Math.max(0, walletBalance - supplementInWalletCurrency).toLocaleString("fr-FR")} {currencySymbol}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate("/client/wallet")}
            className="text-[11px] text-emerald-400 font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-400/20"
          >
            Recharger
          </button>
        </div>

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
            {supplement.toLocaleString()} {orderCurrencySymbol}
          </p>
          {walletCurrency !== (order?.currency || "XOF") && supplementInWalletCurrency > 0 && (
            <p className="text-sm text-red-300/70">
              ≈ {supplementInWalletCurrency.toLocaleString("fr-FR")} {currencySymbol}
            </p>
          )}
          <p className="text-[11px] text-red-300/60">
            Ce montant doit être réglé pour débloquer le transit de votre colis
          </p>
        </div>

        {/* Payment method */}
        <div>
          <label className="text-xs font-semibold text-white/60 mb-2 block">Mode de paiement</label>
          <div className="space-y-2">
            {paymentMethods.map((method) => {
              const isWallet = method.id === "wallet";
              const insufficientBalance = isWallet && walletBalance < supplementInWalletCurrency;
              return (
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
                    <p className={`text-[11px] ${insufficientBalance ? 'text-red-400' : 'text-white/40'}`}>
                      {isWallet
                        ? `Solde: ${walletBalance.toLocaleString("fr-FR")} ${currencySymbol}${insufficientBalance ? ' — Insuffisant' : ''}`
                        : method.desc}
                    </p>
                  </div>
                  {selectedMethod === method.id && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                </button>
              );
            })}
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
              Payer {supplement.toLocaleString()} {orderCurrencySymbol}
            </>
          )}
        </motion.button>

        <div className="pb-10" />
      </div>
    </div>
  );
}
