/**
 * GPApercuPage — Dashboard GP V2 Terrain
 * 
 * Hierarchy: Alerts → Quick Actions → Active Parcels → Stats → Departures
 * Clean design, contextual actions, smart flow colis
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plane, Send, AlertTriangle, Clock, ChevronRight,
  Calendar, RefreshCw, Scale, Wallet, Plus, ScanLine,
  TrendingUp, Shield, History, Camera, FileText, Check,
  Bell, Zap, Star, ArrowRight, CheckCircle2, Truck, Activity,
  UserCheck, AlertOctagon, ShieldAlert, Lock, Crown } from
"lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { SmartVoyageForm } from "@/components/gp/SmartVoyageForm";
import { CreateManualParcelDialog } from "@/components/gp/CreateManualParcelDialog";
import { GPKYCProgressCard } from "@/components/gp/GPKYCProgressCard";
import { QRCameraScanner } from "@/components/gp/QRCameraScanner";
import { GPScanSheet } from "@/components/scan/GPScanSheet";
import { SelfieVerificationSheet } from "@/components/gp/SelfieVerificationSheet";
import { DocumentVerificationSheet } from "@/components/gp/DocumentVerificationSheet";
import { PremiumCTABanner } from "@/components/gp/PremiumCTABanner";
import { useGPProfile } from "@/hooks/useGPProfile";
import { isGPPremium } from "@/lib/premiumGating";
import { getOrderStatusLabel, getOrderStatusColor } from "@/lib/transportTypes";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter, startOfDay, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DashboardData {
  wallet: {balance: number;pending: number;totalMonth: number;commissionRate: number;commissionDue: number;currency: string;totalEarned: number;totalWithdrawn: number;locked: number;} | null;
  activeParcels: any[];
  pendingParcels: any[];
  manualParcels: any[];
  departures: any[];
  stats: {delivered: number;successRate: number;disputes: number;manualPercent: number;};
  pendingActions: {weightAlerts: number;pendingOrders: number;customRequests: number;};
}

const STATUS_FLOW: Record<string, {label: string;next: string;nextLabel: string;color: string;bg: string;}> = {
  pending: { label: "En attente", next: "accepted", nextLabel: "Accepter", color: "text-amber-600", bg: "bg-amber-500/10" },
  accepted: { label: "À collecter", next: "collected", nextLabel: "Confirmer collecte", color: "text-blue-600", bg: "bg-blue-500/10" },
  collected: { label: "Collecté", next: "in_transit", nextLabel: "Départ", color: "text-indigo-600", bg: "bg-indigo-500/10" },
  in_transit: { label: "En transit", next: "arrived", nextLabel: "Arrivée destination", color: "text-purple-600", bg: "bg-purple-500/10" },
  arrived: { label: "Arrivé", next: "delivered", nextLabel: "Confirmer livraison", color: "text-green-600", bg: "bg-green-500/10" },
  delivered: { label: "Livré ✓", next: "", nextLabel: "", color: "text-green-700", bg: "bg-green-500/10" }
};

export default function GPApercuPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { gpProfile, loading: profileLoading, pendingCount, activeCount, reload: reloadProfile } = useGPProfile();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showVoyageForm, setShowVoyageForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanSheetOpen, setScanSheetOpen] = useState(false);
  const [selfieSheetOpen, setSelfieSheetOpen] = useState(false);
  const [documentSheetOpen, setDocumentSheetOpen] = useState(false);
  const [activationTransition, setActivationTransition] = useState(false);
  const [showRestrictionGate, setShowRestrictionGate] = useState(false);
  const [restrictionsValidated, setRestrictionsValidated] = useState(false);
  const [tarifsValidated, setTarifsValidated] = useState(false);

  // Handle return from validation pages
  useEffect(() => {
    const validated = searchParams.get("validated");
    if (validated === "restrictions") {
      setRestrictionsValidated(true);
      // Remove param but keep other params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("validated");
      setSearchParams(newParams, { replace: true });
    } else if (validated === "tarifs") {
      setTarifsValidated(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("validated");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);

  // When both validations complete, sync first departure price and dismiss gate
  useEffect(() => {
    if (restrictionsValidated && tarifsValidated && gpProfile) {
      syncFirstDeparturePrice();
    }
  }, [restrictionsValidated, tarifsValidated, gpProfile]);

  const syncFirstDeparturePrice = async () => {
    if (!gpProfile) return;
    try {
      // Sync all active offers' price with the GP's base_price_per_kg
      const basePrice = gpProfile.base_price_per_kg;
      if (basePrice && basePrice > 0) {
        await supabase
          .from("gp_offers")
          .update({ price_per_kg: basePrice })
          .eq("gp_id", gpProfile.id)
          .eq("status", "active");
      }
      // Reload to show the departure as active
      await reloadProfile();
      await loadAll(true);
    } catch (err) {
      console.error("Error syncing departure price:", err);
    }
  };

  useEffect(() => {
    if (gpProfile) loadAll();
  }, [gpProfile]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!gpProfile) return;
    const interval = setInterval(() => loadAll(true), 30000);
    return () => clearInterval(interval);
  }, [gpProfile]);

  const loadAll = async (refresh = false) => {
    if (!gpProfile) return;
    if (refresh) setRefreshing(true);

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [ordersRes, offersRes, walletRes, manualRes, monthLedger, customReqRes] = await Promise.all([
      supabase.from("orders").
      select("id, order_number, origin_city, destination_city, weight, status, total_price, currency, created_at, client_id, description").
      eq("gp_id", gpProfile.id).not("status", "eq", "cancelled").
      order("created_at", { ascending: false }),
      supabase.from("gp_offers").
      select("id, departure_date, origin_city, destination_city, available_capacity, flight_number, price_per_kg, status").
      eq("gp_id", gpProfile.id).eq("status", "active").
      gte("departure_date", startOfDay(now).toISOString()).
      order("departure_date", { ascending: true }).limit(5),
      supabase.from("gp_wallets").
      select("balance, pending_balance, currency, commission_rate, commission_due, total_earned, total_withdrawn, locked_balance").
      eq("gp_id", gpProfile.id).maybeSingle(),
      supabase.from("manual_parcels").
      select("id, order_number, origin_city, destination_city, weight, status, client_name, amount_paid, currency, created_at").
      eq("gp_id", gpProfile.id).neq("status", "delivered"),
      supabase.from("konnekt_ledger").
      select("amount_fcfa").
      eq("gp_id", gpProfile.id).eq("type", "release").
      gte("created_at", monthStart),
      supabase.from("custom_requests").
      select("id, status").
      eq("status", "open")
      ]);

      const orders = ordersRes.data || [];
      const manuals = manualRes.data || [];
      const statuses = orders.map((o) => o.status as string);
      const delivered = statuses.filter((s) => s === "delivered").length;
      const total = orders.length;
      const totalMonth = (monthLedger.data || []).reduce((s, e) => s + (e.amount_fcfa || 0), 0);

      const pendingParcels = orders.filter((o) => o.status === "pending").slice(0, 5);
      const activeParcels = orders.filter((o) =>
      ["accepted", "collected", "in_transit", "arrived"].includes(o.status as string)
      ).slice(0, 8);

      setData({
        wallet: walletRes.data ? {
          balance: walletRes.data.balance,
          pending: walletRes.data.pending_balance,
          totalMonth,
          commissionRate: walletRes.data.commission_rate || 5,
          commissionDue: walletRes.data.commission_due || 0,
          currency: walletRes.data.currency || "XOF",
          totalEarned: walletRes.data.total_earned || 0,
          totalWithdrawn: walletRes.data.total_withdrawn || 0,
          locked: walletRes.data.locked_balance || 0
        } : null,
        activeParcels,
        pendingParcels,
        manualParcels: manuals.slice(0, 5),
        departures: (offersRes.data || []),
        stats: {
          delivered,
          successRate: total > 0 ? Math.round(delivered / total * 100) : 0,
          disputes: statuses.filter((s) => s === "disputed").length,
          manualPercent: total + manuals.length > 0 ? Math.round(manuals.length / (total + manuals.length) * 100) : 0
        },
        pendingActions: {
          weightAlerts: statuses.filter((s) => s === "pending_client_validation").length,
          pendingOrders: pendingCount,
          customRequests: (customReqRes.data || []).length
        }
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleQuickStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    try {
      const { error } = await supabase.from("orders").
      update({ status: newStatus as any }).
      eq("id", orderId);
      if (error) throw error;
      toast({ title: "Statut mis à jour ✓", description: `Commande passée à "${getOrderStatusLabel(newStatus as any)}"` });
      loadAll(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const isPending = gpProfile?.status === "pending";
  const w = data?.wallet;
  const currency = w?.currency || "XOF";

  // Check if restrictions are missing (force review after activation)
  const hasRestrictions = (gpProfile?.explicit_restrictions?.length ?? 0) > 0;
  const needsRestrictionReview = !isPending && gpProfile?.status === "verified" && !hasRestrictions;
  const gateActive = (showRestrictionGate || needsRestrictionReview) && !(restrictionsValidated && tarifsValidated);

  const handleAutoActivated = () => {
    setActivationTransition(true);
    setSelfieSheetOpen(false);
    setDocumentSheetOpen(false);
    // Show celebration for 2.5s then reload
    setTimeout(async () => {
      await reloadProfile();
      await loadAll(true);
      setActivationTransition(false);
      setShowRestrictionGate(true);
    }, 2500);
  };

  if (profileLoading || loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile || !data) return null;

  const urgentCount = data.pendingActions.pendingOrders + data.pendingActions.weightAlerts + data.pendingActions.customRequests;

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeCount}
      activeTab="aujourdhui"
      onNewVoyage={() => setShowVoyageForm(true)}>

      {!isPending &&
      <GPKYCProgressCard
        kycLevel={gpProfile.kyc_level ?? 0}
        kycStatus={gpProfile.kyc_status ?? "none"}
        status={gpProfile.status}
        hasIdDocument={!!gpProfile.id_document_url}
        hasSelfie={!!gpProfile.selfie_url}
        hasBusinessReg={!!gpProfile.business_registration_url}
        subscription={(gpProfile as any).subscription}
        gpId={gpProfile.id} />

      }

      {/* ── ACTIVATION TRANSITION OVERLAY ── */}
      <AnimatePresence>
        {activationTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center gap-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
              className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center"
            >
              <CheckCircle2 className="w-12 h-12 text-accent" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center space-y-2"
            >
              <h2 className="text-xl font-bold">🎉 Compte activé !</h2>
              <p className="text-sm text-muted-foreground">Bienvenue sur Konnekt, votre compte est prêt.</p>
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "60%" }}
              transition={{ duration: 2, delay: 0.3 }}
              className="h-1 rounded-full bg-accent"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RESTRICTION GATE OVERLAY ── */}
      <AnimatePresence>
        {gateActive && !activationTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-sm space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8 text-secondary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold">Dernière étape obligatoire</h2>
                <p className="text-sm text-muted-foreground">
                  Avant de recevoir des commandes, validez ces 2 étapes :
                </p>
              </div>

              <div className="space-y-3">
                {restrictionsValidated ? (
                  <div className="w-full flex items-center gap-2 h-12 px-6 rounded-xl border-2 border-accent/50 bg-accent/10 text-accent justify-center text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Restrictions validées ✓
                  </div>
                ) : (
                  <motion.div
                    animate={{ x: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Button
                      className="w-full gap-2 h-12 text-sm"
                      variant="default"
                      onClick={() => navigate("/gp/restrictions?from=gate")}
                    >
                      <ArrowRight className="w-4 h-4" />
                      Définir mes restrictions (obligatoire)
                    </Button>
                  </motion.div>
                )}

                {tarifsValidated ? (
                  <div className="w-full flex items-center gap-2 h-12 px-6 rounded-xl border-2 border-accent/50 bg-accent/10 text-accent justify-center text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Tarifs validés ✓
                  </div>
                ) : (
                  <motion.div
                    animate={{ x: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                  >
                    <Button
                      className="w-full gap-2 h-12 text-sm"
                      variant="outline"
                      onClick={() => navigate("/gp/tarification?from=gate")}
                    >
                      <Scale className="w-4 h-4" />
                      Vérifier mes tarifs
                    </Button>
                  </motion.div>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground/60">
                Validez les deux pour accéder à votre dashboard.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 py-4 space-y-5">
        {/* ── PENDING ACCOUNT BANNER ── */}
        {isPending && <PendingAccountBanner gpProfile={gpProfile}
        onDocumentClick={() => setDocumentSheetOpen(true)}
        onSelfieClick={() => setSelfieSheetOpen(true)}
        navigate={navigate}
        onActivate={async () => {
          const { error } = await supabase.from("gp_profiles").
          update({ status: "verified" as any, kyc_status: "verified", kyc_level: 1, verified_at: new Date().toISOString() }).
          eq("id", gpProfile.id);
          if (!error) {toast({ title: "Compte activé ✅" });window.location.reload();}
        }} />
        }

        {!isPending &&
        <>

            {/* ── URGENT ALERTS BLOCK ── */}
            {urgentCount > 0 &&
          <div className="space-y-2">
                {data.pendingActions.pendingOrders > 0 &&
            <motion.button
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/gp/demandes")}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-secondary/10 border border-secondary/30 text-left">

                    <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-secondary">
                        {data.pendingActions.pendingOrders} nouvelle{data.pendingActions.pendingOrders > 1 ? "s" : ""} demande{data.pendingActions.pendingOrders > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">Répondez rapidement pour améliorer votre score</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-secondary/60 flex-shrink-0" />
                  </motion.button>
            }
                {data.pendingActions.customRequests > 0 &&
            <motion.button
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/gp/demandes?tab=custom")}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-primary/10 border border-primary/30 text-left">
                    <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-primary">
                        {data.pendingActions.customRequests} demande{data.pendingActions.customRequests > 1 ? "s" : ""} personnalisée{data.pendingActions.customRequests > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">Proposez un devis pour gagner la mission</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary/60 flex-shrink-0" />
                  </motion.button>
            }
                {data.pendingActions.weightAlerts > 0 &&
            <motion.button
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/gp/colis?filter=pending_client_validation")}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-destructive/8 border border-destructive/25 text-left">

                    <div className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center flex-shrink-0">
                      <Scale className="w-4.5 h-4.5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-destructive">{data.pendingActions.weightAlerts} correction(s) de poids</p>
                      <p className="text-xs text-muted-foreground">En attente de validation client</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-destructive/60 flex-shrink-0" />
                  </motion.button>
            }
              </div>
          }

            {/* ── QUICK ACTIONS ── */}
            <div className="grid grid-cols-4 gap-2">
              <QuickAction icon={ScanLine} label="Scanner" primary onClick={() => setScanSheetOpen(true)} />
              <QuickAction icon={Package} label="Demandes" badge={pendingCount} onClick={() => navigate("/gp/demandes")} />
              <QuickAction icon={Plus} label="Voyage" onClick={() => setShowVoyageForm(true)} />
              <QuickAction icon={History} label="Historique" onClick={() => navigate("/gp/historique")} />
            </div>

            {/* ── WALLET SHORTCUT ── */}
            {w && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card
                  className="cursor-pointer active:scale-[0.98] transition-all overflow-hidden"
                  onClick={() => navigate("/gp/wallet")}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                        <Wallet className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Solde disponible</p>
                        <p className="text-lg font-bold leading-tight">
                          {w.balance.toLocaleString()} {getCurrencySymbol(currency)}
                        </p>
                      </div>
                      {w.pending > 0 && (
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground">En attente</p>
                          <p className="text-sm font-semibold text-secondary">
                            +{w.pending.toLocaleString()} {getCurrencySymbol(currency)}
                          </p>
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── PENDING PARCELS — Action requise ── */}
            {data.pendingParcels.length > 0 &&
          <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">Action requise</h3>
                    <Badge variant="destructive" className="text-[10px] h-4">{data.pendingParcels.length}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/gp/demandes")}>
                    Voir tout <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {data.pendingParcels.map((c: any, i: number) =>
              <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Card className="border-secondary/30 bg-secondary/5 cursor-pointer active:scale-[0.99] transition-all"
                onClick={() => navigate(`/gp/order/${c.id}`)}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-secondary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{c.origin_city} → {c.destination_city}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-muted-foreground font-mono">#{c.order_number?.slice(-6)}</span>
                                <span className="text-[11px] text-muted-foreground">{c.weight} kg</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(c.created_at), { locale: fr, addSuffix: true })}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1.5">
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={(e) => {e.stopPropagation();handleQuickStatusUpdate(c.id, "refused" as any);}}
                        disabled={updatingOrder === c.id}>
                                Refuser
                              </Button>
                              <Button size="sm" className="h-7 text-xs px-2 bg-accent hover:bg-accent/90 text-accent-foreground"
                        onClick={(e) => {e.stopPropagation();handleQuickStatusUpdate(c.id, "accepted");}}
                        disabled={updatingOrder === c.id}>
                                {updatingOrder === c.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Accepter ✓"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
              )}
                </div>
              </div>
          }

            {/* ── ACTIVE PARCELS — Simple list ── */}
            {data.activeParcels.length > 0 &&
          <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Colis actifs <span className="text-muted-foreground font-normal">({data.activeParcels.length})</span></h3>
                  <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("/gp/colis")}>
                    Tout voir <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {data.activeParcels.slice(0, 5).map((c: any, i: number) => {
                const flow = STATUS_FLOW[c.status as string];
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <Card className="cursor-pointer active:scale-[0.99] transition-all" onClick={() => navigate(`/gp/order/${c.id}`)}>
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", flow?.bg || "bg-muted/50")}>
                              <Package className={cn("w-3.5 h-3.5", flow?.color || "text-muted-foreground")} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{c.origin_city} → {c.destination_city}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground font-mono">#{c.order_number?.slice(-6)}</span>
                                <span className="text-[10px] text-muted-foreground">{c.weight}kg</span>
                              </div>
                            </div>
                            <Badge className={cn("text-[8px] h-4 shrink-0", getOrderStatusColor(c.status))}>
                              {getOrderStatusLabel(c.status)}
                            </Badge>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          </CardContent>
                        </Card>
                      </motion.div>);
              })}
                </div>
                {data.activeParcels.length > 5 &&
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => navigate("/gp/colis")}>
                    +{data.activeParcels.length - 5} autre(s)
                  </Button>
            }
              </div>
          }

            {/* ── EMPTY STATE ── */}
            {data.pendingParcels.length === 0 && data.activeParcels.length === 0 &&
          <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Aucun colis en cours</p>
                  <p className="text-xs mt-1">Créez un voyage pour recevoir des réservations</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowVoyageForm(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Nouveau voyage
                  </Button>
                </CardContent>
              </Card>
          }

            {/* ── MANUEL PARCELS ── */}
            {data.manualParcels.length > 0 &&
          <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">Hors plateforme</h3>
                  <Badge variant="outline" className="text-[10px] h-4 border-secondary/40 text-secondary">{data.manualParcels.length}</Badge>
                </div>
                {data.manualParcels.slice(0, 3).map((m: any, i: number) =>
            <Card key={m.id} className="border-secondary/20 bg-secondary/5">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.client_name}</p>
                        <p className="text-[11px] text-muted-foreground">{m.origin_city} → {m.destination_city} · {m.weight} kg</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-secondary/30 text-secondary shrink-0">Manuel</Badge>
                    </CardContent>
                  </Card>
            )}
              </div>
          }

            {/* ── PERFORMANCE DU MOIS (Premium only) ── */}
            {isGPPremium((gpProfile as any)?.subscription) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">Performance du mois</h3>
                    <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[9px] h-4 gap-0.5">
                      <Crown className="w-2.5 h-2.5" /> Premium
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("/gp/performances")}>
                    Détails <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <MiniStat label="Livrés" value={String(data.stats.delivered)} icon={CheckCircle2} color="text-green-600" />
                  <MiniStat label="Réussite" value={`${data.stats.successRate}%`} icon={Activity} color="text-primary" />
                  <MiniStat label="Litiges" value={String(data.stats.disputes)} icon={AlertTriangle} color={data.stats.disputes > 0 ? "text-destructive" : "text-muted-foreground"} />
                  <MiniStat label="Manuel%" value={`${data.stats.manualPercent}%`} icon={UserCheck} color={data.stats.manualPercent > 20 ? "text-secondary" : "text-muted-foreground"} />
                </div>
                {data.stats.manualPercent > 20 &&
                  <div className="p-2.5 rounded-xl bg-secondary/10 border border-secondary/20 text-xs text-muted-foreground flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                    Passez sous 20% de colis manuels pour booster votre score KTP.
                  </div>
                }
              </div>
            )}

            {/* ── PREMIUM CTA (only for non-subscribers) ── */}
            {!isGPPremium((gpProfile as any)?.subscription) && (
              <PremiumCTABanner variant="banner" context="dashboard" isPremium={false} gpId={gpProfile.id} />
            )}

            {/* ── DEPARTURES ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Prochains départs</h3>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/gp/calendrier")}>
                  Voir tout
                </Button>
              </div>
              {data.departures.length === 0 ?
            <Card className="border-dashed">
                  <CardContent className="py-5 text-center text-muted-foreground">
                    <Calendar className="w-7 h-7 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">Aucun départ planifié</p>
                    <Button variant="link" size="sm" className="mt-1 text-xs" onClick={() => setShowVoyageForm(true)}>
                      Ajouter un voyage
                    </Button>
                  </CardContent>
                </Card> :

            data.departures.map((dep: any) =>
            <Card key={dep.id} className="cursor-pointer active:scale-[0.98] transition-all"
            onClick={() => navigate("/gp/calendrier")}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Plane className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{dep.origin_city} → {dep.destination_city}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(dep.departure_date), "EEE d MMM", { locale: fr })}
                          {dep.flight_number && ` · ${dep.flight_number}`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{dep.available_capacity} kg</Badge>
                    </CardContent>
                  </Card>
            )
            }
            </div>
          </>
        }
      </div>

      {/* ── DIALOGS ── */}
      <QRCameraScanner isOpen={cameraOpen} onScan={(code) => {setCameraOpen(false);navigate("/gp/scan", { state: { scannedCode: code } });}} onClose={() => setCameraOpen(false)} />
      <GPScanSheet open={scanSheetOpen} onOpenChange={setScanSheetOpen} gpId={gpProfile?.id}
      isVerified={gpProfile?.status === "verified" || gpProfile?.status === "premium" || gpProfile?.status === "starter"} />
      {gpProfile &&
      <>
          <SelfieVerificationSheet open={selfieSheetOpen} onClose={() => setSelfieSheetOpen(false)} gpId={gpProfile.id} onSuccess={() => { reloadProfile(); loadAll(true); }} onAutoActivated={handleAutoActivated} />
          <DocumentVerificationSheet open={documentSheetOpen} onClose={() => setDocumentSheetOpen(false)} gpId={gpProfile.id} onSuccess={() => { reloadProfile(); loadAll(true); }} onAutoActivated={handleAutoActivated} />
          <SmartVoyageForm open={showVoyageForm} onClose={() => setShowVoyageForm(false)} gpId={gpProfile.id} onSuccess={() => {setShowVoyageForm(false);loadAll();}} />
          <CreateManualParcelDialog open={showManualForm} onClose={() => setShowManualForm(false)} gpId={gpProfile.id} gpCurrency={gpProfile.default_currency || "XOF"} onSuccess={() => loadAll(true)} />
        </>
      }
    </GPDashboardLayout>);

}

/* ─── Sub-components ─── */

function PendingAccountBanner({ gpProfile, onDocumentClick, onSelfieClick, navigate, onActivate }: any) {
  const hasId = !!gpProfile.id_document_url;
  const hasSelfie = !!gpProfile.selfie_url;
  const hasRoute = !!gpProfile.base_origin_city && !!gpProfile.base_destination_city;
  const hasPrice = (gpProfile.base_price_per_kg ?? 0) > 0;
  const completedChecks = [hasId, hasSelfie, hasRoute, hasPrice].filter(Boolean).length;
  const progress = Math.round(completedChecks / 4 * 100);
  const allDone = completedChecks === 4;

  const steps = [
  { label: "Passeport ou CNI", done: hasId, action: "Photographier", onClick: onDocumentClick, icon: FileText },
  { label: "Selfie de vérification", done: hasSelfie, action: "Prendre", onClick: onSelfieClick, icon: Camera },
  { label: "Navette définie", done: hasRoute, action: "Configurer", onClick: () => navigate("/gp/parametres"), icon: Plane },
  { label: "Tarification", done: hasPrice, action: "Définir", onClick: () => navigate("/gp/tarification"), icon: Scale }];


  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
    className={cn("p-4 rounded-2xl border-2", allDone ? "bg-accent/10 border-accent/40" : "bg-primary/5 border-primary/20")}>

      <div className="flex items-start gap-3">
        <div className={cn("w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0", allDone ? "bg-accent/20" : "bg-primary/10")}>
          <Shield className={cn("w-5 h-5", allDone ? "text-accent" : "text-primary")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{allDone ? "Activation en cours... ✨" : "Activez votre compte"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allDone ? "Votre compte sera activé automatiquement." : `${4 - completedChecks} étape(s) restante(s)`}
          </p>
          <div className="mt-2.5 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }}
            className={cn("h-full rounded-full", allDone ? "bg-accent" : "bg-primary")} />
          </div>
          <div className="mt-3 space-y-1.5">
            {steps.map((step, i) =>
            <button key={i} onClick={() => !step.done && step.onClick?.()}
            disabled={step.done}
            className={cn("w-full flex items-center justify-between p-2 rounded-lg border transition-colors text-left",
            step.done ? "bg-accent/5 border-accent/20" : "bg-background/80 border-border/50 hover:border-primary/30"
            )}>
                <div className="flex items-center gap-2">
                  <span className={cn("w-5 h-5 rounded-full flex items-center justify-center", step.done ? "bg-accent/20" : "bg-muted")}>
                    {step.done ? <Check className="w-3 h-3 text-accent" /> : <step.icon className="w-3 h-3 text-muted-foreground" />}
                  </span>
                  <span className={cn("text-xs", step.done && "text-accent")}>{step.label}</span>
                </div>
                {!step.done && <span className="text-[11px] font-medium text-primary flex items-center gap-0.5">{step.action} <ChevronRight className="w-3 h-3" /></span>}
              </button>
            )}
          </div>
          {allDone &&
          <div className="mt-3 p-2.5 rounded-lg bg-accent/10 border border-accent/20 text-center">
              <p className="text-xs text-accent font-medium flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Activation automatique en cours...
              </p>
            </div>
          }
        </div>
      </div>
    </motion.div>);

}

function QuickAction({ icon: Icon, label, primary, badge, onClick

}: {icon: any;label: string;primary?: boolean;badge?: number;onClick: () => void;}) {
  return (
    <motion.button whileTap={{ scale: 0.88 }} onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all relative",
      primary ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted/60 text-foreground"
    )}>
      <div className="relative">
        <Icon className="w-5 h-5" />
        {!!badge && badge > 0 &&
        <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        }
      </div>
      <span className="text-[10px] font-semibold">{label}</span>
    </motion.button>);

}

function MiniStat({ label, value, icon: Icon, color }: {label: string;value: string;icon: any;color: string;}) {
  return (
    <div className="p-2.5 rounded-xl border bg-card text-center">
      <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
      <p className={cn("text-base font-bold leading-tight", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>);

}