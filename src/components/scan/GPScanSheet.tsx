/**
 * GPScanSheet — Cockpit Intelligent GP V2
 *
 * 4 modes in-scan, aucune redirection externe :
 *   1. Dépôt intelligent   → liste paid_held → check_in
 *   2. Livraison sécurisée → liste arrived → code 6 chiffres → confirm_delivery → release
 *   3. Ajustement poids    → liste checked_in → preview backend → weight_modify
 *   4. Retrait rapide      → wallet balance → withdraw (escrow already released)
 *
 * RÈGLES :
 *   - Aucune mutation order.status côté frontend
 *   - Toutes les actions passent par scan-engine / executeAction
 *   - Refresh obligatoire après chaque mutation
 *   - Aucune redirection page
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, X, PackageOpen, PackageCheck, Scale,
  Banknote, Eye, EyeOff, ArrowLeft, Zap, ShieldCheck,
  ChevronRight, Clock, Loader2, Layers, ArrowRight,
  KeyRound, AlertTriangle, CheckCircle, Truck, Package,
  Send, MapPin, RefreshCw, Wallet, CreditCard
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSwipeDown } from "@/hooks/useSwipeDown";
import { supabase } from "@/integrations/supabase/client";
import { ScanHeart } from "./ScanHeart";
import { ScanQRTab } from "./ScanQRTab";
import { useScanEngine } from "@/hooks/useScanEngine";

interface GPScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gpId?: string;
  isVerified?: boolean;
}

const BG = "linear-gradient(180deg, #0F1923 0%, #15232F 55%, #1A2B3A 100%)";

// ─── Types ─────────────────────────────────────────────────────────────────────
type ActiveMode =
  | "home"
  | "scan_engine"        // Scanner QR direct
  | "mon_qr"
  | "depot_list"         // Mode dépôt : liste paid_held
  | "depot_confirm"      // Mode dépôt : confirmation
  | "livraison_list"     // Mode livraison : liste arrived
  | "livraison_method"   // Mode livraison : choix méthode
  | "livraison_code"     // Mode livraison : saisie code
  | "poids_list"         // Mode poids : liste commandes
  | "poids_adjust"       // Mode poids : ajustement
  | "retrait";           // Retrait rapide

interface OrderItem {
  id: string;
  order_number: string;
  client_name?: string;
  origin_city: string;
  destination_city: string;
  weight: number;
  status: string;
  financial_status?: string;
  price_per_kg?: number;
  currency?: string;
}

// ─── Composant principal ────────────────────────────────────────────────────────
export function GPScanSheet({ open, onOpenChange, gpId, isVerified }: GPScanSheetProps) {
  const [activeMode, setActiveMode] = useState<ActiveMode>("home");
  const [showBalance, setShowBalance] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [executing, setExecuting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Poids
  const [newWeight, setNewWeight] = useState("");
  const [weightPreview, setWeightPreview] = useState<{ delta_amount: number; new_total: number; currency: string } | null>(null);
  const [weightPreviewLoading, setWeightPreviewLoading] = useState(false);

  // Livraison
  const [deliveryCode, setDeliveryCode] = useState("");
  const [deliveryAttempts, setDeliveryAttempts] = useState(0);

  // Retrait
  const [retraitAmount, setRetraitAmount] = useState("");
  const [retraitMethod, setRetraitMethod] = useState<"mobile_money" | "bank">("mobile_money");

  const swipe = useSwipeDown(() => {
    if (activeMode === "home") handleClose(false);
    else setActiveMode("home");
  });

  // ── Wallet ──
  useEffect(() => {
    if (!open || !gpId) return;
    setBalanceLoading(true);
    supabase
      .from("gp_wallets")
      .select("balance, available_balance:balance, pending_balance")
      .eq("gp_id", gpId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setWalletBalance((data as any).balance ?? 0);
        setBalanceLoading(false);
      });
  }, [open, gpId]);

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setActiveMode("home");
      setSelectedOrder(null);
      setSuccessMsg(null);
      setErrorMsg(null);
      setDeliveryCode("");
      setNewWeight("");
      setWeightPreview(null);
      setDeliveryAttempts(0);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  // ── Loader commandes contextuelles ──
  const loadOrders = useCallback(async (states: string[]) => {
    if (!gpId) return;
    setOrdersLoading(true);
    setOrders([]);
    try {
      let query = supabase
        .from("orders")
        .select(`
          id, order_number, origin_city, destination_city,
          weight, status, financial_status, price_per_kg, currency,
          profiles!orders_client_id_fkey(full_name)
        `)
        .eq("gp_id", gpId)
        .order("created_at", { ascending: false })
        .limit(20);

      // Filter by status — use filter with OR for type safety
      if (states.length === 1) {
        query = query.eq("status", states[0] as any);
      } else {
        query = query.in("status", states as any);
      }

      const { data } = await query;

      if (data) {
        setOrders(data.map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          client_name: o.profiles?.full_name,
          origin_city: o.origin_city,
          destination_city: o.destination_city,
          weight: o.weight,
          status: o.status,
          financial_status: o.financial_status,
          price_per_kg: o.price_per_kg,
          currency: o.currency,
        })));
      }
    } finally {
      setOrdersLoading(false);
    }
  }, [gpId]);

  // ── Feedback helpers ──
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => { setSuccessMsg(null); setActiveMode("home"); }, 2500);
  };
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // ── Action via scan-engine ──
  const { executeAction } = useScanEngine({ autoNavigate: false });

  const runAction = useCallback(async (
    action: string,
    orderId: string,
    data?: Record<string, any>
  ) => {
    setExecuting(true);
    setErrorMsg(null);
    try {
      const res = await executeAction(action as any, orderId, data);
      if (res?.status === "executed") {
        showSuccess(res.message || "Action effectuée ✓");
        return true;
      } else {
        showError(res?.message || "Action échouée.");
        return false;
      }
    } catch {
      showError("Erreur réseau. Réessayez.");
      return false;
    } finally {
      setExecuting(false);
    }
  }, [executeAction]);

  // ── Preview ajustement poids (lecture seule) ──
  const previewWeight = useCallback(async () => {
    if (!selectedOrder || !newWeight) return;
    const w = parseFloat(newWeight);
    if (isNaN(w) || w <= 0) return;
    setWeightPreviewLoading(true);
    try {
      const delta = w - selectedOrder.weight;
      const deltaAmount = Math.round(delta * (selectedOrder.price_per_kg || 0));
      // Preview local (le vrai calcul se fait côté backend à l'exécution)
      setWeightPreview({
        delta_amount: deltaAmount,
        new_total: Math.max(0, deltaAmount),
        currency: selectedOrder.currency || "XOF",
      });
    } finally {
      setWeightPreviewLoading(false);
    }
  }, [selectedOrder, newWeight]);

  // ═══════════════════════════════════════════════════════════
  //  RENDER — Mode screens
  // ═══════════════════════════════════════════════════════════

  const textSub = "text-white/45";
  const textPrimary = "text-white/90";
  const cardBg = "bg-white/[0.04] border-white/[0.07]";

  // ── Feedback banner (shared) ──
  const FeedbackBanner = () => (
    <AnimatePresence>
      {(successMsg || errorMsg) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            "mx-5 mb-3 px-4 py-3 rounded-2xl text-sm font-semibold text-center border",
            successMsg
              ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-400"
              : "bg-red-500/15 border-red-400/30 text-red-400"
          )}
        >
          {successMsg || errorMsg}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Header ──
  const ModeHeader = ({ title, sub }: { title: string; sub?: string }) => (
    <div className="flex items-center gap-3 px-5 pt-4 pb-3 flex-shrink-0">
      <button
        onClick={() => { setActiveMode("home"); setSelectedOrder(null); setWeightPreview(null); }}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08] active:bg-white/[0.15]"
      >
        <ArrowLeft className="w-4 h-4 text-white/60" />
      </button>
      <div>
        <h2 className="text-[15px] font-bold text-white leading-tight">{title}</h2>
        {sub && <p className="text-[10px] text-white/30">{sub}</p>}
      </div>
    </div>
  );

  // ── Order list (partagée par dépôt / livraison / poids) ──
  const OrderList = ({ onSelect, accentColor = "amber" }: {
    onSelect: (o: OrderItem) => void;
    accentColor?: string;
  }) => (
    <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2.5">
      {ordersLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className={`w-6 h-6 animate-spin text-${accentColor}-400`} />
        </div>
      )}
      {!ordersLoading && orders.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <Package className="w-10 h-10 text-white/20 mx-auto" />
          <p className={cn("text-sm", textSub)}>Aucune commande disponible</p>
        </div>
      )}
      {orders.map((order) => (
        <motion.button
          key={order.id}
          onClick={() => onSelect(order)}
          className={cn("w-full text-left rounded-2xl border p-4 space-y-2 active:opacity-80", cardBg)}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={cn("font-mono font-bold text-sm", textPrimary)}>{order.order_number}</p>
              <p className={cn("text-xs mt-0.5 flex items-center gap-1", textSub)}>
                {order.origin_city} <ChevronRight className="w-3 h-3" /> {order.destination_city}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/25 mt-1 flex-shrink-0" />
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className={cn("px-2 py-0.5 rounded-full bg-white/[0.06]", textSub)}>
              {order.weight} kg
            </span>
            {order.client_name && (
              <span className={cn("truncate", textSub)}>{order.client_name}</span>
            )}
          </div>
        </motion.button>
      ))}
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  MODE RENDER
  // ══════════════════════════════════════════════════════════════

  const renderMode = () => {
    // ── 1. HOME ──────────────────────────────────────────────
    if (activeMode === "home") return <HomeMode />;

    // ── 2. SCAN ENGINE ───────────────────────────────────────
    if (activeMode === "scan_engine") return (
      <div className="flex flex-col h-full">
        <ModeHeader title="Konnekt Scan" sub="Powered by Engine V2" />
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="flex rounded-xl overflow-hidden border border-amber-400/20 bg-white/[0.02]">
            {(["scanner", "mon_qr"] as const).map((tab) => (
              <button key={tab}
                onClick={() => tab === "mon_qr" ? setActiveMode("mon_qr") : null}
                className={cn(
                  "flex-1 py-2.5 text-xs font-semibold transition-all duration-200",
                  tab === "scanner" ? "bg-amber-500/20 text-amber-400" : "text-white/35"
                )}
              >
                {tab === "scanner" ? "Scanner" : "Mon QR"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <ScanHeart role="gp" accent="amber" darkMode gpId={gpId} autoClose={false} />
        </div>
      </div>
    );

    // ── 3. MON QR ────────────────────────────────────────────
    if (activeMode === "mon_qr") return (
      <div className="flex flex-col h-full">
        <ModeHeader title="Mon QR GP" sub="Identité numérique sécurisée" />
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <ScanQRTab role="gp" accent="amber" darkMode gpId={gpId} isVerified={isVerified}
            onSwitchToScanner={() => setActiveMode("scan_engine")} />
        </div>
      </div>
    );

    // ── 4a. DÉPÔT — Liste ────────────────────────────────────
    if (activeMode === "depot_list") return (
      <div className="flex flex-col h-full">
        <ModeHeader title="Enregistrer dépôt" sub="Commandes en attente de collecte" />
        <FeedbackBanner />
        <div className="px-5 pb-3 flex-shrink-0">
          <button onClick={() => loadOrders(["paid_held", "accepted"])}
            className="flex items-center gap-1.5 text-[11px] text-amber-400">
            <RefreshCw className="w-3 h-3" /> Actualiser
          </button>
        </div>
        <OrderList
          accentColor="amber"
          onSelect={(o) => { setSelectedOrder(o); setActiveMode("depot_confirm"); }}
        />
      </div>
    );

    // ── 4b. DÉPÔT — Confirmation ─────────────────────────────
    if (activeMode === "depot_confirm" && selectedOrder) {
      const w = parseFloat(newWeight) || selectedOrder.weight;
      const diff = w - selectedOrder.weight;
      const hasChange = Math.abs(diff) > 0.05;
      const priceDiff = Math.round(diff * (selectedOrder.price_per_kg || 0));

      return (
        <div className="flex flex-col h-full">
          <ModeHeader title="Confirmer le dépôt" sub={selectedOrder.order_number} />
          <FeedbackBanner />
          <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
            {/* Résumé commande */}
            <div className={cn("rounded-2xl border p-4 space-y-3", cardBg)}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <PackageOpen className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className={cn("font-mono font-bold text-sm", textPrimary)}>{selectedOrder.order_number}</p>
                  <p className={cn("text-xs", textSub)}>
                    {selectedOrder.origin_city} → {selectedOrder.destination_city}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={cn("rounded-xl p-2.5", "bg-white/[0.03]")}>
                  <p className={cn("text-[9px] uppercase tracking-wider", textSub)}>Client</p>
                  <p className={cn("font-semibold mt-0.5 truncate", textPrimary)}>{selectedOrder.client_name || "—"}</p>
                </div>
                <div className={cn("rounded-xl p-2.5", "bg-white/[0.03]")}>
                  <p className={cn("text-[9px] uppercase tracking-wider", textSub)}>Poids déclaré</p>
                  <p className={cn("font-semibold mt-0.5", textPrimary)}>{selectedOrder.weight} kg</p>
                </div>
              </div>
            </div>

            {/* Vérification poids réel */}
            <div className={cn("rounded-2xl border p-4 space-y-3", cardBg)}>
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                <p className={cn("text-sm font-semibold", textPrimary)}>Poids réel (balancé)</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className={cn("text-[9px] uppercase tracking-wider", textSub)}>Déclaré</p>
                  <p className={cn("text-xl font-bold mt-0.5", textPrimary)}>{selectedOrder.weight}<span className="text-sm font-normal ml-1">kg</span></p>
                </div>
                <div className="rounded-xl bg-amber-500/5 border-2 border-amber-400/30 p-3">
                  <p className="text-[9px] uppercase tracking-wider text-amber-400">Réel</p>
                  <input
                    type="number" step="0.1"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder={selectedOrder.weight.toString()}
                    className="w-full text-xl font-bold bg-transparent border-0 outline-none p-0 text-white mt-0.5"
                  />
                </div>
              </div>

              {/* Diff weight alert */}
              <AnimatePresence>
                {hasChange && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn("rounded-xl p-3 border", diff > 0
                      ? "bg-red-500/10 border-red-400/30"
                      : "bg-emerald-500/10 border-emerald-400/30"
                    )}
                  >
                    <p className={cn("text-xs font-semibold mb-1", diff > 0 ? "text-red-400" : "text-emerald-400")}>
                      {diff > 0 ? "⚠️ Excédent" : "✓ Inférieur au déclaré"}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className={textSub}>Diff.</p>
                        <p className={cn("font-bold", diff > 0 ? "text-red-400" : "text-emerald-400")}>
                          {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
                        </p>
                      </div>
                      <div>
                        <p className={textSub}>Supplément</p>
                        <p className={cn("font-bold", diff > 0 ? "text-red-400" : "text-emerald-400")}>
                          {priceDiff > 0 ? "+" : ""}{priceDiff.toLocaleString()} {selectedOrder.currency || "XOF"}
                        </p>
                      </div>
                    </div>
                    {diff > 0 && (
                      <p className="text-[10px] text-red-300/60 mt-1.5">
                        Le client sera notifié pour payer le supplément avant le départ.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              className="w-full h-12 font-semibold bg-amber-500 hover:bg-amber-600 text-white"
              disabled={executing}
              onClick={async () => {
                const actualWeight = parseFloat(newWeight) || selectedOrder.weight;
                const action = hasChange ? "weight_modify" : "deposit_confirm";
                await runAction(action, selectedOrder.id, {
                  actual_weight: actualWeight,
                  declared_weight: selectedOrder.weight,
                  price_diff: priceDiff,
                });
              }}
            >
              {executing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PackageOpen className="w-4 h-4 mr-2" />}
              {hasChange ? "Soumettre modification poids" : "Confirmer le dépôt ✓"}
            </Button>
          </div>
        </div>
      );
    }

    // ── 5a. LIVRAISON — Liste ────────────────────────────────
    if (activeMode === "livraison_list") return (
      <div className="flex flex-col h-full">
        <ModeHeader title="Confirmer livraison" sub="Commandes prêtes à livrer" />
        <FeedbackBanner />
        <div className="px-5 pb-3 flex-shrink-0">
          <button onClick={() => loadOrders(["arrived_destination", "delivery_pending", "in_transit"])}
            className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <RefreshCw className="w-3 h-3" /> Actualiser
          </button>
        </div>
        <OrderList
          accentColor="emerald"
          onSelect={(o) => { setSelectedOrder(o); setDeliveryCode(""); setDeliveryAttempts(0); setActiveMode("livraison_code"); }}
        />
      </div>
    );

    // ── 5b. LIVRAISON — Saisie code ──────────────────────────
    if (activeMode === "livraison_code" && selectedOrder) return (
      <div className="flex flex-col h-full">
        <ModeHeader title="Code de livraison" sub={selectedOrder.order_number} />
        <FeedbackBanner />
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
          {/* Info commande */}
          <div className={cn("rounded-2xl border p-4 space-y-2", cardBg)}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Truck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className={cn("font-mono font-bold text-sm", textPrimary)}>{selectedOrder.order_number}</p>
                <p className={cn("text-xs", textSub)}>
                  {selectedOrder.client_name || "Client"} · {selectedOrder.destination_city}
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className={cn("rounded-xl p-3 text-xs space-y-1.5", "bg-white/[0.03] border border-white/[0.06]")}>
            <p className={cn("font-medium", textPrimary)}>📱 Processus sécurisé :</p>
            <ol className={cn("space-y-1 pl-3 list-decimal", textSub)}>
              <li>Un code 6 chiffres a été envoyé au client/destinataire</li>
              <li>Demandez-lui ce code oralement</li>
              <li>Saisissez-le ci-dessous pour libérer le paiement</li>
            </ol>
          </div>

          {/* Code input */}
          <div className="rounded-2xl border-2 border-emerald-400/30 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">Saisir le code de livraison</p>
            </div>
            <Input
              value={deliveryCode}
              onChange={(e) => setDeliveryCode(e.target.value.toUpperCase())}
              placeholder="Ex: A3F29B"
              className="font-mono text-center text-2xl tracking-[0.5em] h-14 border-2 border-emerald-400/30 bg-emerald-500/5 text-white placeholder:text-white/20"
              maxLength={6}
              autoFocus
            />
            {deliveryAttempts > 0 && (
              <p className="text-[10px] text-red-400 text-center">
                {deliveryAttempts}/3 tentatives · {3 - deliveryAttempts} restante(s)
              </p>
            )}
          </div>

          <Button
            className="w-full h-12 font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={executing || deliveryCode.length < 4 || deliveryAttempts >= 3}
            onClick={async () => {
              const ok = await runAction("confirm_delivery", selectedOrder.id, { delivery_code: deliveryCode });
              if (!ok) {
                setDeliveryAttempts((n) => n + 1);
                setDeliveryCode("");
              }
            }}
          >
            {executing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Valider la livraison &rarr; libérer paiement
          </Button>

          {deliveryAttempts >= 3 && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-center space-y-2">
              <AlertTriangle className="w-5 h-5 text-red-400 mx-auto" />
              <p className="text-xs text-red-400 font-semibold">Max tentatives atteint</p>
              <p className="text-[11px] text-red-300/60">Contactez le support pour débloquer.</p>
            </div>
          )}
        </div>
      </div>
    );

    // ── 6a. POIDS — Liste ────────────────────────────────────
    if (activeMode === "poids_list") return (
      <div className="flex flex-col h-full">
        <ModeHeader title="Ajuster le poids" sub="Commandes collectées" />
        <FeedbackBanner />
        <div className="px-5 pb-3 flex-shrink-0">
          <p className="text-[11px] text-amber-400/80">
            ⚠️ Une seule modification autorisée par commande
          </p>
        </div>
        <OrderList
          accentColor="sky"
          onSelect={(o) => {
            setSelectedOrder(o);
            setNewWeight(o.weight.toString());
            setWeightPreview(null);
            setActiveMode("poids_adjust");
          }}
        />
      </div>
    );

    // ── 6b. POIDS — Ajustement ───────────────────────────────
    if (activeMode === "poids_adjust" && selectedOrder) {
      const w = parseFloat(newWeight) || 0;
      const diff = w - selectedOrder.weight;
      const hasChange = Math.abs(diff) > 0.05;
      const priceDiff = Math.round(diff * (selectedOrder.price_per_kg || 0));
      // Anti-fraude : max 50% du poids initial
      const isExcessive = Math.abs(diff) > selectedOrder.weight * 0.5;

      return (
        <div className="flex flex-col h-full">
          <ModeHeader title="Ajustement poids" sub={selectedOrder.order_number} />
          <FeedbackBanner />
          <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
            <div className={cn("rounded-2xl border p-4 space-y-3", cardBg)}>
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-sky-400" />
                <div>
                  <p className={cn("text-sm font-semibold", textPrimary)}>Modifier le poids</p>
                  <p className={cn("text-[11px]", textSub)}>Poids initial : {selectedOrder.weight} kg</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className={cn("text-[9px] uppercase tracking-wider", textSub)}>Initial</p>
                  <p className={cn("text-xl font-bold mt-0.5", textPrimary)}>
                    {selectedOrder.weight}<span className="text-sm font-normal ml-1">kg</span>
                  </p>
                </div>
                <div className="rounded-xl bg-sky-500/5 border-2 border-sky-400/30 p-3">
                  <p className="text-[9px] uppercase tracking-wider text-sky-400">Nouveau</p>
                  <input
                    type="number" step="0.1"
                    value={newWeight}
                    onChange={(e) => { setNewWeight(e.target.value); setWeightPreview(null); }}
                    className="w-full text-xl font-bold bg-transparent border-0 outline-none p-0 text-white mt-0.5"
                  />
                </div>
              </div>

              {/* Anti-fraude warning */}
              {isExcessive && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3">
                  <p className="text-xs text-red-400 font-semibold">🚨 Modification excessive détectée</p>
                  <p className="text-[10px] text-red-300/60 mt-1">
                    Variation {">"}= 50% du poids initial. Cette tentative sera enregistrée.
                  </p>
                </div>
              )}

              {/* Preview supplément */}
              {hasChange && !isExcessive && (
                <div className={cn("rounded-xl p-3 border", diff > 0
                  ? "bg-orange-500/10 border-orange-400/30"
                  : "bg-emerald-500/10 border-emerald-400/30"
                )}>
                  <p className={cn("text-xs font-semibold mb-1.5", diff > 0 ? "text-orange-400" : "text-emerald-400")}>
                    {diff > 0 ? "Supplément à facturer" : "Remboursement partiel"}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className={textSub}>Diff.</p>
                      <p className={cn("font-bold", diff > 0 ? "text-orange-400" : "text-emerald-400")}>
                        {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
                      </p>
                    </div>
                    <div>
                      <p className={textSub}>Montant</p>
                      <p className={cn("font-bold", diff > 0 ? "text-orange-400" : "text-emerald-400")}>
                        {priceDiff > 0 ? "+" : ""}{priceDiff.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className={textSub}>Devise</p>
                      <p className="font-bold text-white/70">{selectedOrder.currency || "XOF"}</p>
                    </div>
                  </div>
                  {diff > 0 && (
                    <p className={cn("text-[10px] mt-2", textSub)}>
                      Transport bloqué jusqu'au paiement client.
                    </p>
                  )}
                </div>
              )}

              <Button
                className="w-full h-12 font-semibold"
                style={{ background: isExcessive ? "#374151" : undefined }}
                disabled={executing || !hasChange || isExcessive || w <= 0}
                onClick={() => runAction("weight_modify", selectedOrder.id, {
                  actual_weight: w,
                  declared_weight: selectedOrder.weight,
                  price_diff: priceDiff,
                })}
              >
                {executing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Scale className="w-4 h-4 mr-2" />
                )}
                Soumettre l'ajustement
              </Button>
            </div>

            {/* Info anti-fraude */}
            <div className={cn("rounded-xl border p-3 text-[10px] space-y-1", "border-white/[0.06] bg-white/[0.02]", textSub)}>
              <p className="font-semibold text-white/50">🔒 Anti-fraude actif</p>
              <p>• 1 seule modification par commande</p>
              <p>• Toute tentative est enregistrée</p>
              <p>• Variation max : 50% du poids initial</p>
            </div>
          </div>
        </div>
      );
    }

    // ── 7. RETRAIT RAPIDE ────────────────────────────────────
    if (activeMode === "retrait") {
      const amount = parseFloat(retraitAmount) || 0;
      const maxAmount = walletBalance || 0;

      return (
        <div className="flex flex-col h-full">
          <ModeHeader title="Retrait rapide" sub="Solde wallet disponible" />
          <FeedbackBanner />
          <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
            {/* Solde */}
            <div className={cn("rounded-2xl border p-4 space-y-2", cardBg)}>
              <div className="flex items-center justify-between">
                <p className={cn("text-xs uppercase tracking-wider", textSub)}>Solde disponible</p>
                <button onClick={() => setShowBalance(!showBalance)} className="text-white/40">
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {balanceLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
              ) : showBalance ? (
                <p className="text-2xl font-bold text-white">
                  {maxAmount.toLocaleString()} <span className="text-sm font-normal text-white/50">XOF</span>
                </p>
              ) : (
                <p className="text-xl tracking-[0.4em] text-white/30 font-medium">••••••</p>
              )}
            </div>

            {/* Montant */}
            <div className={cn("rounded-2xl border p-4 space-y-3", cardBg)}>
              <p className={cn("text-sm font-semibold", textPrimary)}>Montant à retirer</p>
              <div className="relative">
                <input
                  type="number"
                  value={retraitAmount}
                  onChange={(e) => setRetraitAmount(e.target.value)}
                  placeholder="0"
                  className="w-full text-3xl font-bold bg-transparent border-0 outline-none text-white pr-16"
                />
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-white/40 font-medium">
                  XOF
                </span>
              </div>
              <div className="flex gap-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setRetraitAmount(Math.floor(maxAmount * pct / 100).toString())}
                    className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg bg-white/[0.05] text-white/50 hover:bg-white/[0.1] transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              {amount > maxAmount && (
                <p className="text-xs text-red-400">Montant supérieur au solde disponible</p>
              )}
            </div>

            {/* Méthode */}
            <div className={cn("rounded-2xl border p-4 space-y-3", cardBg)}>
              <p className={cn("text-sm font-semibold", textPrimary)}>Méthode</p>
              <div className="grid grid-cols-2 gap-2">
                {(["mobile_money", "bank"] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setRetraitMethod(method)}
                    className={cn(
                      "py-3 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center gap-1.5",
                      retraitMethod === method
                        ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-400"
                        : `${cardBg} text-white/40`
                    )}
                  >
                    {method === "mobile_money" ? <Wallet className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    {method === "mobile_money" ? "Mobile Money" : "Virement"}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full h-12 font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={executing || amount <= 0 || amount > maxAmount}
              onClick={async () => {
                // Appel wallet-withdraw edge function
                setExecuting(true);
                try {
                  const { error } = await supabase.functions.invoke("wallet-withdraw", {
                    body: { amount, method: retraitMethod, gp_id: gpId },
                  });
                  if (error) {
                    showError("Retrait refusé : " + (error.message || "erreur"));
                  } else {
                    setWalletBalance((prev) => (prev ?? 0) - amount);
                    showSuccess(`Retrait de ${amount.toLocaleString()} XOF initié ✓`);
                    setRetraitAmount("");
                  }
                } catch {
                  showError("Erreur réseau.");
                } finally {
                  setExecuting(false);
                }
              }}
            >
              {executing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Banknote className="w-4 h-4 mr-2" />
              )}
              Demander le retrait
            </Button>

            <p className={cn("text-[10px] text-center", textSub)}>
              Les fonds escrow libérés alimentent votre solde automatiquement.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  // ══════════════════════════════════════════════════════════════
  //  HOME MODE
  // ══════════════════════════════════════════════════════════════
  function HomeMode() {
    const ACTIONS = [
      {
        icon: PackageOpen,
        label: "Enregistrer dépôt",
        sub: "Check-in · poids réel",
        accent: "amber",
        onClick: () => { loadOrders(["paid_held", "accepted"]); setActiveMode("depot_list"); },
      },
      {
        icon: PackageCheck,
        label: "Confirmer livraison",
        sub: "Code 6 chiffres · escrow",
        accent: "emerald",
        onClick: () => { loadOrders(["arrived_destination", "delivery_pending", "in_transit"]); setActiveMode("livraison_list"); },
      },
      {
        icon: Scale,
        label: "Ajuster poids",
        sub: "Supplément · anti-fraude",
        accent: "sky",
        onClick: () => { loadOrders(["checked_in", "paid_held", "scheduled_departure"]); setActiveMode("poids_list"); },
      },
      {
        icon: Banknote,
        label: "Retrait rapide",
        sub: "Wallet · Mobile Money",
        accent: "emerald",
        onClick: () => setActiveMode("retrait"),
      },
      {
        icon: ScanLine,
        label: "Scanner QR",
        sub: "Konnekt Engine V2",
        accent: "amber",
        onClick: () => setActiveMode("scan_engine"),
      },
      {
        icon: ShieldCheck,
        label: "Mon QR GP",
        sub: "Identité numérique",
        accent: "primary",
        onClick: () => setActiveMode("mon_qr"),
      },
    ] as const;

    type HomeAccent = "amber" | "emerald" | "sky" | "primary";
    const ACCENT: Record<HomeAccent, { icon: string; bg: string; border: string }> = {
      amber:   { icon: "text-amber-400",   bg: "bg-amber-500/12",   border: "border-amber-400/20" },
      emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/12", border: "border-emerald-400/20" },
      sky:     { icon: "text-sky-400",     bg: "bg-sky-500/12",     border: "border-sky-400/20" },
      primary: { icon: "text-primary",     bg: "bg-primary/12",     border: "border-primary/20" },
    };

    return (
      <div className="flex flex-col h-full" {...swipe}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Espace GP</h2>
                {isVerified && (
                  <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-400/30 px-1.5 py-0">
                    <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Vérifié
                  </Badge>
                )}
              </div>
              <p className="text-xs text-white/35 mt-0.5">Cockpit intelligent · Konnekt Engine V2</p>
            </div>
            <button
              onClick={() => handleClose(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08] active:bg-white/[0.15]"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* Balance row */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
            <p className="text-[10px] text-white/35 uppercase tracking-wider font-medium mb-2">
              Solde disponible
            </p>
            <div className="flex items-center justify-between">
              <button onClick={() => setShowBalance(!showBalance)} className="flex items-center gap-2">
                {showBalance ? (
                  <EyeOff className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                )}
                {balanceLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                ) : showBalance ? (
                  <span className="text-xl font-bold text-white">
                    {walletBalance !== null ? `${walletBalance.toLocaleString()} FCFA` : "— FCFA"}
                  </span>
                ) : (
                  <span className="text-base tracking-[0.35em] text-white/30 font-medium">••••••</span>
                )}
              </button>
              <button
                onClick={() => setActiveMode("retrait")}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400"
              >
                Retirer <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Actions grid */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3">
            Actions intelligentes
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {ACTIONS.map((action) => {
              const s = ACCENT[action.accent as HomeAccent] || ACCENT.amber;
              return (
                <motion.button
                  key={action.label}
                  onClick={action.onClick}
                  className={cn(
                    "flex flex-col items-start gap-2.5 p-3.5 rounded-2xl border text-left transition-all",
                    s.bg, s.border
                  )}
                  whileTap={{ scale: 0.94 }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/20">
                    <action.icon className={cn("w-4.5 h-4.5", s.icon)} style={{ width: "1.1rem", height: "1.1rem" }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold leading-tight text-white/85">{action.label}</p>
                    <p className="text-[9px] text-white/30 mt-0.5 leading-tight">{action.sub}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Engine badge */}
          <div className="mt-5 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
            <Zap className="w-3 h-3 text-amber-400/60" />
            <span className="text-[10px] text-white/25 font-medium">
              Scan & QR powered by Konnekt Engine V2
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  SHEET RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="h-[92vh] rounded-t-3xl p-0 border-t-0 overflow-hidden"
        style={{ background: BG }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMode}
            initial={{ opacity: 0, x: activeMode === "home" ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col h-full"
          >
            {renderMode()}
          </motion.div>
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
