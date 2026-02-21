/**
 * ClientScanSheet — Intelligent Client Hub V2
 *
 * Layer 1: Smart context dashboard — loads real order states from backend
 * Layer 2: Inline scanner (camera always ready) + QR + Mes Colis tabs
 *
 * Rules:
 * - No frontend state mutations
 * - No direct order.status changes
 * - No redirections for core actions (all in-scan)
 * - All logic via scanHeartV2 / backend
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, CreditCard, ShieldCheck, Clock,
  PackageCheck, TrendingUp, Eye, EyeOff, ArrowLeft,
  Lock, ChevronRight, X, Layers, Loader2,
  AlertCircle, CheckCircle2, Package, Zap, Wallet
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSwipeDown } from "@/hooks/useSwipeDown";
import { supabase } from "@/integrations/supabase/client";
import { ScanHeart } from "./ScanHeart";
import { ScanQRTab } from "./ScanQRTab";
import { ScanColisTab } from "./ScanColisTab";
import { useScanEngine } from "@/hooks/useScanEngine";

interface ClientScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BG = "linear-gradient(180deg, #0F1923 0%, #15232F 55%, #1A2B3A 100%)";

// ─── Types ─────────────────────────────────────────────────────────────────────
type TabKey = "scanner" | "mon_qr" | "mes_colis";
type Mode = "hub" | "scanner_sheet" | "pay_supplement" | "confirm_reception" | "track_parcel";

interface ContextOrder {
  id: string;
  order_number: string;
  status: string;
  destination_city: string;
  weight: number;
  supplement_amount?: number;
  new_weight?: number;
}

interface ClientContext {
  supplement_orders: ContextOrder[];
  delivery_orders: ContextOrder[];
  in_transit_orders: ContextOrder[];
  wallet_balance: number;
  loading: boolean;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "scanner",   label: "Scanner" },
  { key: "mon_qr",    label: "Mon QR" },
  { key: "mes_colis", label: "Mes Colis" },
];

// ─── Supplement Payment Mode ────────────────────────────────────────────────────
function PaySupplementMode({
  orders,
  onBack,
  onDone,
  darkMode,
}: {
  orders: ContextOrder[];
  onBack: () => void;
  onDone: () => void;
  darkMode: boolean;
}) {
  const [selected, setSelected] = useState<ContextOrder | null>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const { executeAction } = useScanEngine({ autoNavigate: false });

  const confirmPay = async () => {
    if (!selected) return;
    setPaying(true);
    const res = await executeAction("pay_weight_supplement" as any, selected.id, {});
    setPaying(false);
    if (res?.status === "executed") {
      setPaid(true);
      setTimeout(onDone, 2000);
    }
  };

  if (paid) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 gap-4">
      <CheckCircle2 className="w-14 h-14 text-emerald-400" />
      <p className="text-white font-bold text-lg">Paiement confirmé</p>
      <p className="text-white/40 text-sm">Transport débloqué</p>
    </motion.div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08]">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div>
          <h3 className="text-sm font-bold text-white">Payer supplément poids</h3>
          <p className="text-[10px] text-white/35">Sélectionnez la commande concernée</p>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-10 text-white/30 text-sm">
          Aucun supplément en attente
        </div>
      )}

      {!selected && orders.map(o => (
        <motion.button
          key={o.id}
          onClick={() => setSelected(o)}
          className="w-full text-left p-4 rounded-2xl border border-amber-400/20 bg-amber-500/8 flex items-center gap-3"
          whileTap={{ scale: 0.97 }}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">{o.order_number}</p>
            <p className="text-[10px] text-white/40">{o.destination_city} · {o.new_weight ?? o.weight} kg</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold text-amber-400">
              +{(o.supplement_amount ?? 0).toLocaleString()} FCFA
            </p>
            <p className="text-[9px] text-white/30">Supplément</p>
          </div>
        </motion.button>
      ))}

      {selected && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4">
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] space-y-2">
            <p className="text-[10px] text-white/35 uppercase tracking-wider">Commande</p>
            <p className="text-base font-bold text-white">{selected.order_number}</p>
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Poids initial</span>
              <span className="text-white/70">{selected.weight} kg</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Nouveau poids</span>
              <span className="text-amber-400 font-semibold">{selected.new_weight ?? selected.weight} kg</span>
            </div>
            <div className="h-px bg-white/[0.06]" />
            <div className="flex justify-between text-sm font-bold">
              <span className="text-white/60">Montant supplément</span>
              <span className="text-amber-400">{(selected.supplement_amount ?? 0).toLocaleString()} FCFA</span>
            </div>
          </div>

          <motion.button
            onClick={confirmPay}
            disabled={paying}
            className="w-full py-3.5 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 font-bold text-sm flex items-center justify-center gap-2"
            whileTap={{ scale: 0.97 }}
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {paying ? "Confirmation…" : "Payer maintenant"}
          </motion.button>

          <button onClick={() => setSelected(null)} className="text-xs text-white/30 text-center">
            Annuler
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Confirm Reception Mode ─────────────────────────────────────────────────────
function ConfirmReceptionMode({
  orders,
  onBack,
  onDone,
}: {
  orders: ContextOrder[];
  onBack: () => void;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<ContextOrder | null>(null);
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { executeAction } = useScanEngine({ autoNavigate: false });

  // Separate orders by status
  const arrivedOrders = orders.filter(o => o.status === "arrived_destination");
  const pendingDeliveryOrders = orders.filter(o => o.status === "delivery_pending");

  // Request delivery: notify GP + create notification
  const handleRequestDelivery = async (order: ContextOrder) => {
    setRequesting(true);
    setError(null);
    try {
      // Get GP user_id for this order
      const { data: orderData } = await supabase
        .from("orders")
        .select("gp_id, order_number, gp_profiles!inner(user_id, business_name)")
        .eq("id", order.id)
        .single();

      if (!orderData) {
        setError("Commande introuvable.");
        setRequesting(false);
        return;
      }

      const gpUserId = (orderData as any).gp_profiles?.user_id;
      if (!gpUserId) {
        setError("Transporteur introuvable.");
        setRequesting(false);
        return;
      }

      // Send notification to GP requesting delivery initiation
      await supabase.from("notifications").insert({
        user_id: gpUserId,
        title: "Demande de livraison",
        message: `Le client demande la livraison de la commande ${order.order_number} (${order.destination_city}). Veuillez initier la livraison depuis votre espace.`,
        type: "delivery_request",
        related_id: order.id,
        related_type: "order",
      });

      setRequestSent(order.id);
      setRequesting(false);
    } catch (err) {
      console.error("Request delivery error:", err);
      setError("Erreur lors de l'envoi de la demande.");
      setRequesting(false);
    }
  };

  const handleConfirm = async () => {
    if (!selected || code.length !== 6) return;
    setConfirming(true);
    setError(null);
    const res = await executeAction("confirm_delivery" as any, selected.id, { code });
    setConfirming(false);
    if (res?.status === "executed") {
      setConfirmed(true);
      setTimeout(onDone, 2200);
    } else {
      setError("Code invalide ou expiré. Vérifiez le SMS reçu.");
      setCode("");
      inputRef.current?.focus();
    }
  };

  if (confirmed) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 gap-4">
      <CheckCircle2 className="w-14 h-14 text-emerald-400" />
      <p className="text-white font-bold text-lg">Livraison confirmée !</p>
      <p className="text-white/40 text-sm">Fonds libérés au transporteur</p>
    </motion.div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08]">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div>
          <h3 className="text-sm font-bold text-white">Confirmer réception</h3>
          <p className="text-[10px] text-white/35">Gérez vos livraisons en attente</p>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-10 space-y-2">
          <PackageCheck className="w-10 h-10 text-white/15 mx-auto" />
          <p className="text-white/30 text-sm">Aucune commande en attente de réception</p>
          <p className="text-white/20 text-[10px]">Vos colis arrivés apparaîtront ici</p>
        </div>
      )}

      {/* ─── Code entry mode (selected delivery_pending order) ─── */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4">
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">Livraison en cours</p>
            <p className="text-sm font-bold text-white">{selected.order_number}</p>
            <p className="text-[10px] text-white/40 mt-0.5">→ {selected.destination_city}</p>
          </div>

          <div className="p-3 rounded-xl border border-emerald-400/15 bg-emerald-500/5">
            <p className="text-[11px] text-emerald-400/80 font-medium mb-0.5">💬 Votre transporteur a initié la livraison</p>
            <p className="text-[10px] text-white/35">Un code à 6 chiffres vous a été communiqué. Saisissez-le ci-dessous.</p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-white/50 font-medium">Code de livraison :</p>
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}
                  className={cn(
                    "flex-1 h-12 rounded-xl border flex items-center justify-center text-lg font-bold transition-all",
                    code[i]
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-400"
                      : "border-white/[0.10] bg-white/[0.03] text-white/20"
                  )}
                >
                  {code[i] || "·"}
                </div>
              ))}
            </div>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={e => e.key === "Enter" && handleConfirm()}
              className="sr-only"
              aria-label="Code de livraison"
            />
            <button
              onClick={() => inputRef.current?.focus()}
              className="text-[11px] text-emerald-400/70 font-medium text-center"
            >
              Appuyer pour saisir le code
            </button>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl border border-red-400/20 bg-red-500/10">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </motion.div>
          )}

          <motion.button
            onClick={handleConfirm}
            disabled={code.length !== 6 || confirming}
            className="w-full py-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            whileTap={{ scale: 0.97 }}
          >
            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {confirming ? "Validation…" : "Confirmer réception"}
          </motion.button>

          <button onClick={() => { setSelected(null); setCode(""); setError(null); }}
            className="text-xs text-white/30 text-center">
            Annuler
          </button>
        </motion.div>
      )}

      {/* ─── Order lists (not in code-entry mode) ─── */}
      {!selected && (
        <>
          {/* Section 1: Orders ready for delivery request (arrived_destination) */}
          {arrivedOrders.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
                📦 Colis arrivés — Demander la livraison
              </p>
              {arrivedOrders.map(o => (
                <motion.div
                  key={o.id}
                  className="w-full p-4 rounded-2xl border border-sky-400/20 bg-sky-500/8 space-y-3"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white">{o.order_number}</p>
                      <p className="text-[10px] text-white/40">→ {o.destination_city} · {o.weight} kg</p>
                    </div>
                    <div className="px-2 py-0.5 rounded-full text-[9px] font-bold border border-sky-400/20 text-sky-400 bg-sky-500/10">
                      Arrivé
                    </div>
                  </div>

                  {requestSent === o.id ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 p-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-emerald-400">Demande envoyée !</p>
                        <p className="text-[10px] text-white/35">Votre transporteur va initier la livraison et vous recevrez un code.</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      onClick={() => handleRequestDelivery(o)}
                      disabled={requesting}
                      className="w-full py-3 rounded-xl bg-sky-500/15 border border-sky-400/25 text-sky-400 font-bold text-xs flex items-center justify-center gap-2"
                      whileTap={{ scale: 0.97 }}
                    >
                      {requesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      {requesting ? "Envoi…" : "Demander la livraison"}
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Section 2: Orders with delivery initiated (delivery_pending — code ready) */}
          {pendingDeliveryOrders.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
                🔑 Code reçu — Confirmer la réception
              </p>
              {pendingDeliveryOrders.map(o => (
                <motion.button
                  key={o.id}
                  onClick={() => { setSelected(o); setTimeout(() => inputRef.current?.focus(), 200); }}
                  className="w-full text-left p-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/8 flex items-center gap-3"
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <PackageCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">{o.order_number}</p>
                    <p className="text-[10px] text-white/40">→ {o.destination_city}</p>
                    <p className="text-[9px] text-emerald-400/60 mt-0.5">Code reçu · Prêt à confirmer</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400/50 flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl border border-red-400/20 bg-red-500/10">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Track Parcel Mode ──────────────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: "paid_held",          label: "Paiement confirmé",     icon: CreditCard },
  { key: "checked_in",         label: "Dépôt enregistré",      icon: Package },
  { key: "scheduled_departure",label: "Départ programmé",      icon: Clock },
  { key: "in_transit",         label: "En transit",            icon: TrendingUp },
  { key: "arrived_destination",label: "Arrivé à destination",  icon: CheckCircle2 },
  { key: "delivery_confirmed", label: "Livraison confirmée",   icon: PackageCheck },
];

function TrackParcelMode({
  orders,
  onBack,
}: {
  orders: ContextOrder[];
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<ContextOrder | null>(null);

  const currentStep = (status: string) =>
    STATUS_STEPS.findIndex(s => s.key === status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08]">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div>
          <h3 className="text-sm font-bold text-white">Suivre mes colis</h3>
          <p className="text-[10px] text-white/35">Suivi en temps réel</p>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-10 text-white/30 text-sm">
          Aucun colis en cours de transport
        </div>
      )}

      {!selected && orders.map(o => (
        <motion.button
          key={o.id}
          onClick={() => setSelected(o)}
          className="w-full text-left p-4 rounded-2xl border border-sky-400/20 bg-sky-500/8 flex items-center gap-3"
          whileTap={{ scale: 0.97 }}
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">{o.order_number}</p>
            <p className="text-[10px] text-white/40">{o.destination_city}</p>
          </div>
          <div className="flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border border-sky-400/20 text-sky-400 bg-sky-500/10 uppercase">
            {o.status.replace(/_/g, " ")}
          </div>
        </motion.button>
      ))}

      {selected && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4">
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">Commande</p>
            <p className="text-sm font-bold text-white">{selected.order_number}</p>
            <p className="text-[10px] text-white/40 mt-0.5">→ {selected.destination_city}</p>
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-0">
            {STATUS_STEPS.map((step, idx) => {
              const activeIdx = currentStep(selected.status);
              const isDone = idx <= activeIdx;
              const isCurrent = idx === activeIdx;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all",
                      isCurrent
                        ? "border-sky-400 bg-sky-500/20"
                        : isDone
                          ? "border-emerald-400/60 bg-emerald-500/10"
                          : "border-white/10 bg-white/[0.03]"
                    )}>
                      <Icon className={cn(
                        "w-3.5 h-3.5",
                        isCurrent ? "text-sky-400" : isDone ? "text-emerald-400" : "text-white/20"
                      )} />
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={cn(
                        "w-0.5 h-6",
                        isDone ? "bg-emerald-400/30" : "bg-white/[0.06]"
                      )} />
                    )}
                  </div>
                  <div className="pt-1.5 pb-4">
                    <p className={cn(
                      "text-xs font-semibold",
                      isCurrent ? "text-sky-400" : isDone ? "text-white/70" : "text-white/25"
                    )}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-[10px] text-sky-400/60 mt-0.5">En cours</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={() => setSelected(null)}
            className="text-xs text-white/30 text-center mt-2">
            ← Retour
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function ClientScanSheet({ open, onOpenChange }: ClientScanSheetProps) {
  const [mode, setMode] = useState<Mode>("hub");
  const [activeTab, setActiveTab] = useState<TabKey>("scanner");
  const [showBalance, setShowBalance] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [ctx, setCtx] = useState<ClientContext>({
    supplement_orders: [],
    delivery_orders: [],
    in_transit_orders: [],
    wallet_balance: 0,
    loading: true,
  });

  const swipeHub = useSwipeDown(() => onOpenChange(false));

  // ── Load client context from backend ──
  const loadContext = useCallback(async () => {
    setCtx(c => ({ ...c, loading: true }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCtx(c => ({ ...c, loading: false })); return; }
    setUserId(user.id);

    const [ordersRes, walletRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, status, destination_city, weight, adjustment_amount, declared_weight, price_per_kg, currency")
        .eq("client_id", user.id)
        .not("status", "in", '("cancelled","released","disputed")')
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("client_wallets")
        .select("available_balance")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const orders: ContextOrder[] = (ordersRes.data ?? []).map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      destination_city: o.destination_city,
      weight: o.declared_weight ?? o.weight,
      new_weight: o.weight,
      supplement_amount: o.adjustment_amount ?? (o.weight && o.declared_weight && o.price_per_kg
        ? Math.round((o.weight - o.declared_weight) * o.price_per_kg)
        : 0),
    }));

    setCtx({
      supplement_orders: orders.filter(o => o.status === "weight_pending_payment"),
      delivery_orders:   orders.filter(o => ["arrived_destination", "delivery_pending"].includes(o.status)),
      in_transit_orders: orders.filter(o => ["checked_in","scheduled_departure","in_transit"].includes(o.status)),
      wallet_balance:    walletRes.data?.available_balance ?? 0,
      loading: false,
    });
  }, []);

  useEffect(() => {
    if (open) {
      loadContext();
      setMode("hub");
      setActiveTab("scanner");
    }
  }, [open, loadContext]);

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen) { setMode("hub"); setActiveTab("scanner"); }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  // ─── Context alert badges ────────────────────────────────────────────────────
  const hasUrgent = ctx.supplement_orders.length > 0;
  const hasDelivery = ctx.delivery_orders.length > 0;

  // ─── Quick action definitions (in-scan, no redirect) ────────────────────────
  const SMART_ACTIONS = [
    {
      icon: CreditCard,
      label: "Payer supplément",
      sub: "Ajustement poids",
      accent: "amber" as const,
      badge: ctx.supplement_orders.length,
      urgent: hasUrgent,
      onClick: () => setMode("pay_supplement"),
    },
    {
      icon: PackageCheck,
      label: "Confirmer réception",
      sub: "Code 6 chiffres",
      accent: "emerald" as const,
      badge: ctx.delivery_orders.length,
      urgent: hasDelivery,
      onClick: () => setMode("confirm_reception"),
    },
    {
      icon: TrendingUp,
      label: "Suivre colis",
      sub: "Suivi en temps réel",
      accent: "sky" as const,
      badge: ctx.in_transit_orders.length,
      urgent: false,
      onClick: () => setMode("track_parcel"),
    },
    {
      icon: Wallet,
      label: "Mon wallet",
      sub: `${ctx.wallet_balance.toLocaleString()} FCFA`,
      accent: "primary" as const,
      badge: 0,
      urgent: false,
      onClick: () => setMode("scanner_sheet"),
    },
    {
      icon: ShieldCheck,
      label: "Assurance",
      sub: "Protection colis",
      accent: "primary" as const,
      badge: 0,
      urgent: false,
      onClick: () => setMode("scanner_sheet"),
    },
    {
      icon: Clock,
      label: "Historique",
      sub: "Toutes commandes",
      accent: "white" as const,
      badge: 0,
      urgent: false,
      onClick: () => setMode("scanner_sheet"),
    },
  ] as const;

  type AccentKey = "amber" | "emerald" | "sky" | "primary" | "white";
  const ACCENT_STYLES: Record<AccentKey, { icon: string; bg: string; border: string }> = {
    amber:   { icon: "text-amber-400",   bg: "bg-amber-500/12",   border: "border-amber-400/20" },
    emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/12", border: "border-emerald-400/20" },
    sky:     { icon: "text-sky-400",     bg: "bg-sky-500/12",     border: "border-sky-400/20" },
    primary: { icon: "text-primary",     bg: "bg-primary/12",     border: "border-primary/20" },
    white:   { icon: "text-white/60",    bg: "bg-white/[0.05]",   border: "border-white/[0.08]" },
  };

  // ─── In-scan mode content ─────────────────────────────────────────────────────
  const renderMode = () => {
    switch (mode) {
      case "pay_supplement":
        return (
          <PaySupplementMode
            orders={ctx.supplement_orders}
            onBack={() => setMode("hub")}
            onDone={() => { setMode("hub"); loadContext(); }}
            darkMode
          />
        );
      case "confirm_reception":
        return (
          <ConfirmReceptionMode
            orders={ctx.delivery_orders}
            onBack={() => setMode("hub")}
            onDone={() => { setMode("hub"); loadContext(); }}
          />
        );
      case "track_parcel":
        return (
          <TrackParcelMode
            orders={ctx.in_transit_orders}
            onBack={() => setMode("hub")}
          />
        );
      default:
        return null;
    }
  };

  // ─── Scanner Sheet (Layer 2 — tabbed, inline camera) ─────────────────────────
  const isInMode = mode !== "hub" && mode !== "scanner_sheet";
  const showScannerSheet = mode === "scanner_sheet";

  return (
    <>
      {/* ══ LAYER 2 — Scanner sheet (camera + QR + Colis) ══ */}
      <Sheet open={open && showScannerSheet} onOpenChange={(o) => { if (!o) setMode("hub"); }}>
        <SheetContent
          side="bottom"
          className="h-[95vh] rounded-t-3xl p-0 border-t-0 overflow-hidden z-[60]"
          style={{ background: BG }}
        >
          <div className="flex flex-col h-full">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center gap-3 px-5 pt-1 pb-3">
              <button
                onClick={() => setMode("hub")}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08]"
              >
                <ArrowLeft className="w-4 h-4 text-white/60" />
              </button>
              <div>
                <h2 className="text-[15px] font-bold text-white leading-tight">Konnekt Scan</h2>
                <p className="text-[10px] text-white/30 font-medium">Powered by Konnekt Engine V2</p>
              </div>
              <div className="ml-auto px-2.5 py-1 rounded-full text-[9px] font-bold border border-emerald-400/25 text-emerald-400 bg-emerald-500/10">
                CLIENT
              </div>
            </div>

            <div className="px-5 pb-3">
              <div className="flex rounded-xl overflow-hidden border border-emerald-400/20 bg-white/[0.02]">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex-1 py-2.5 text-xs font-semibold transition-all duration-200",
                      activeTab === tab.key
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-white/35 hover:text-white/60"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6">
              <AnimatePresence mode="wait">
                {activeTab === "scanner" && (
                  <motion.div key="scanner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <ScanHeart role="client" accent="emerald" darkMode autoClose={false} />
                  </motion.div>
                )}
                {activeTab === "mon_qr" && (
                  <motion.div key="mon_qr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <ScanQRTab role="client" accent="emerald" darkMode onSwitchToScanner={() => setActiveTab("scanner")} />
                  </motion.div>
                )}
                {activeTab === "mes_colis" && (
                  <motion.div key="mes_colis" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <ScanColisTab role="client" accent="emerald" darkMode userId={userId} onClose={() => setMode("hub")} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══ LAYER 1 — Intelligent Client Hub ══ */}
      <Sheet open={open && !showScannerSheet} onOpenChange={handleClose}>
        <SheetContent
          side="bottom"
          className="h-[90vh] rounded-t-3xl p-0 border-t-0 overflow-hidden"
          style={{ background: BG }}
        >
          <div className="flex flex-col h-full" {...swipeHub}>
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 flex-shrink-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  {isInMode ? (
                    <h2 className="text-lg font-bold text-white">
                      {mode === "pay_supplement" && "Payer supplément"}
                      {mode === "confirm_reception" && "Confirmer réception"}
                      {mode === "track_parcel" && "Suivre mes colis"}
                    </h2>
                  ) : (
                    <>
                      <h2 className="text-lg font-bold text-white">Espace Client</h2>
                      <p className="text-xs text-white/35 mt-0.5">Actions intelligentes · Scan direct</p>
                    </>
                  )}
                </div>
                <button
                  onClick={() => isInMode ? setMode("hub") : handleClose(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08]"
                >
                  {isInMode
                    ? <ArrowLeft className="w-4 h-4 text-white/50" />
                    : <X className="w-4 h-4 text-white/50" />
                  }
                </button>
              </div>

              {/* Hub: Wallet strip + inline scanner CTA */}
              {!isInMode && (
                <div className="flex gap-3">
                  {/* Wallet card */}
                  <div className="flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                    <p className="text-[9px] text-white/35 uppercase tracking-wider font-medium mb-1.5">Solde wallet</p>
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={() => setShowBalance(v => !v)} className="flex items-center gap-1.5">
                        {showBalance
                          ? <EyeOff className="w-3 h-3 text-white/30" />
                          : <Eye className="w-3 h-3 text-white/30" />
                        }
                        {ctx.loading
                          ? <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                          : showBalance
                            ? <span className="text-base font-bold text-white">{ctx.wallet_balance.toLocaleString()} FCFA</span>
                            : <span className="text-sm tracking-[0.3em] text-white/30">••••••</span>
                        }
                      </button>
                    </div>
                    <button onClick={() => setMode("scanner_sheet")}
                      className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                      Voir le wallet <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* ─── INLINE SCAN CTA — opens scanner sheet with camera ready ─── */}
                  <motion.button
                    onClick={() => setMode("scanner_sheet")}
                    className="relative w-[90px] rounded-2xl overflow-hidden flex-shrink-0"
                    whileTap={{ scale: 0.94 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-2xl border-2 border-emerald-400/50"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="absolute inset-[3px] rounded-xl flex flex-col items-center justify-center gap-1.5 bg-emerald-500/10 h-full">
                      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                        <ScanLine className="w-8 h-8 text-emerald-400" />
                      </motion.div>
                      <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Scanner</span>
                    </div>
                    {["top-1 left-1 border-t-2 border-l-2 rounded-tl", "top-1 right-1 border-t-2 border-r-2 rounded-tr",
                      "bottom-1 left-1 border-b-2 border-l-2 rounded-bl", "bottom-1 right-1 border-b-2 border-r-2 rounded-br",
                    ].map((pos) => (
                      <div key={pos} className={cn("absolute w-2.5 h-2.5 border-emerald-400/70", pos)} />
                    ))}
                  </motion.button>
                </div>
              )}

              {/* Urgent alerts */}
              {!isInMode && (hasUrgent || hasDelivery) && (
                <div className="mt-3 space-y-1.5">
                  {hasUrgent && (
                    <motion.button
                      onClick={() => setMode("pay_supplement")}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-amber-400/25 bg-amber-500/10"
                      whileTap={{ scale: 0.97 }}
                    >
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <p className="text-[11px] font-bold text-amber-400">
                          {ctx.supplement_orders.length} supplément{ctx.supplement_orders.length > 1 ? "s" : ""} en attente
                        </p>
                        <p className="text-[9px] text-amber-400/60">Transport bloqué — Payer maintenant</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400/50" />
                    </motion.button>
                  )}
                  {hasDelivery && (
                    <motion.button
                      onClick={() => setMode("confirm_reception")}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-emerald-400/25 bg-emerald-500/10"
                      whileTap={{ scale: 0.97 }}
                    >
                      <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <p className="text-[11px] font-bold text-emerald-400">
                          {ctx.delivery_orders.length} colis arrivé{ctx.delivery_orders.length > 1 ? "s" : ""}
                        </p>
                        <p className="text-[9px] text-emerald-400/60">Confirmer réception avec code SMS</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-400/50" />
                    </motion.button>
                  )}
                </div>
              )}

              {/* Escrow badge */}
              {!isInMode && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <p className="text-[10px] text-white/35">
                    Paiement sécurisé en escrow — libéré à la livraison uniquement
                  </p>
                </div>
              )}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              <AnimatePresence mode="wait">
                {isInMode ? (
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderMode()}
                  </motion.div>
                ) : (
                  <motion.div
                    key="hub"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Loading shimmer */}
                    {ctx.loading ? (
                      <div className="grid grid-cols-3 gap-2.5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-[88px] rounded-2xl bg-white/[0.04] animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3">
                          Actions disponibles
                        </p>
                        <div className="grid grid-cols-3 gap-2.5">
                          {SMART_ACTIONS.map((action) => {
                            const s = ACCENT_STYLES[action.accent as AccentKey];
                            return (
                              <motion.button
                                key={action.label}
                                onClick={action.onClick}
                                className={cn(
                                  "relative flex flex-col items-start gap-2.5 p-3.5 rounded-2xl border text-left transition-all",
                                  s.bg, s.border
                                )}
                                whileTap={{ scale: 0.94 }}
                              >
                                {action.badge > 0 && (
                                  <div className={cn(
                                    "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold",
                                    action.urgent ? "bg-red-500 text-white" : "bg-white/20 text-white/70"
                                  )}>
                                    {action.badge}
                                  </div>
                                )}
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/20">
                                  <action.icon className={cn(s.icon)} style={{ width: "1.1rem", height: "1.1rem" }} />
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold leading-tight text-white/85">{action.label}</p>
                                  <p className="text-[9px] text-white/30 mt-0.5 leading-tight">{action.sub}</p>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>

                        {/* Advanced scan entry */}
                        <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                          <button
                            onClick={() => setMode("scanner_sheet")}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.04] transition-colors"
                          >
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                              <Layers className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold text-white/80">Mode scan avancé</p>
                              <p className="text-[10px] text-white/35">QR · Mes colis · Identité numérique</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/25 flex-shrink-0" />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
