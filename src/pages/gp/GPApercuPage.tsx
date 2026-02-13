/**
 * GPApercuPage — Dashboard GP V1 Terrain (refactored)
 * 
 * Hierarchy: Quick Actions → Active Parcels → Performance → Departures
 * Finance block moved to Wallet page only.
 * Mobile-first, max 6 elements per screen, scan-centric.
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plane, Send, AlertTriangle, Clock, ChevronRight,
  Calendar, RefreshCw, Scale, Wallet, Plus, ScanLine,
  TrendingUp, Shield, History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { SmartVoyageForm } from "@/components/gp/SmartVoyageForm";
import { CreateManualParcelDialog } from "@/components/gp/CreateManualParcelDialog";
import { ManualParcelBadge } from "@/components/gp/ManualParcelBadge";
import { GPKYCProgressCard } from "@/components/gp/GPKYCProgressCard";
import { QRCameraScanner } from "@/components/gp/QRCameraScanner";
import { GPScanSheet } from "@/components/scan/GPScanSheet";
import { useGPProfile } from "@/hooks/useGPProfile";
import { getOrderStatusLabel, getOrderStatusColor } from "@/lib/transportTypes";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DashboardData {
  wallet: { balance: number; pending: number; totalMonth: number; commissionRate: number; commissionDue: number; currency: string; totalEarned: number; totalWithdrawn: number; locked: number } | null;
  activeParcels: any[];
  manualParcels: any[];
  departures: any[];
  stats: { delivered: number; successRate: number; disputes: number; manualPercent: number };
  pendingActions: { weightAlerts: number; pendingOrders: number; customRequests: number };
}

export default function GPApercuPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { gpProfile, loading: profileLoading, pendingCount, activeCount } = useGPProfile();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showVoyageForm, setShowVoyageForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [colisFilter, setColisFilter] = useState<"transit" | "deliver" | "manual" | "dispute">("transit");

  // Camera scanner
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanSheetOpen, setScanSheetOpen] = useState(false);

  useEffect(() => {
    if (gpProfile) loadAll();
  }, [gpProfile]);

  const loadAll = async (refresh = false) => {
    if (!gpProfile) return;
    if (refresh) setRefreshing(true);

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [ordersRes, offersRes, walletRes, manualRes, ktpRes, monthLedger] = await Promise.all([
        supabase.from("orders")
          .select("id, order_number, origin_city, destination_city, weight, status, total_price, currency, created_at, client_id")
          .eq("gp_id", gpProfile.id).not("status", "eq", "cancelled"),
        supabase.from("gp_offers")
          .select("id, departure_date, origin_city, destination_city, available_capacity, flight_number")
          .eq("gp_id", gpProfile.id).eq("status", "active")
          .gte("departure_date", now.toISOString())
          .order("departure_date", { ascending: true }).limit(3),
        supabase.from("gp_wallets")
          .select("balance, pending_balance, currency, commission_rate, commission_due, total_earned, total_withdrawn, locked_balance")
          .eq("gp_id", gpProfile.id).maybeSingle(),
        supabase.from("manual_parcels")
          .select("id, order_number, origin_city, destination_city, weight, status, client_name, amount_paid, currency, created_at")
          .eq("gp_id", gpProfile.id),
        supabase.from("ktp_status")
          .select("trust_score, ktp_level")
          .eq("gp_id", gpProfile.id).maybeSingle(),
        supabase.from("konnekt_ledger")
          .select("amount_fcfa")
          .eq("gp_id", gpProfile.id).eq("type", "release")
          .gte("created_at", monthStart),
      ]);

      const orders = ordersRes.data || [];
      const manuals = manualRes.data || [];
      const statuses = orders.map(o => o.status as string);
      const delivered = statuses.filter(s => s === "delivered").length;
      const total = orders.length;
      const totalMonth = (monthLedger.data || []).reduce((s, e) => s + (e.amount_fcfa || 0), 0);

      const activeParcels = orders.filter(o => 
        ["accepted", "collected", "in_transit", "arrived"].includes(o.status as string)
      ).slice(0, 5);

      const manualActive2 = manuals.filter(m => m.status !== "delivered").slice(0, 5);

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
          locked: walletRes.data.locked_balance || 0,
        } : null,
        activeParcels,
        manualParcels: manualActive2,
        departures: (offersRes.data || []).filter(o => isAfter(new Date(o.departure_date), startOfDay(now))),
        stats: {
          delivered,
          successRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
          disputes: statuses.filter(s => s === "disputed").length,
          manualPercent: (total + manuals.length) > 0 ? Math.round((manuals.length / (total + manuals.length)) * 100) : 0,
        },
        pendingActions: {
          weightAlerts: statuses.filter(s => s === "pending_client_validation").length,
          pendingOrders: pendingCount,
          customRequests: 0,
        },
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleScanFromCamera = (code: string) => {
    setCameraOpen(false);
    // Navigate to scan page with the code
    navigate("/gp/scan", { state: { scannedCode: code } });
  };

  const isPending = gpProfile?.status === "pending";
  const w = data?.wallet;
  const currency = w?.currency || "XOF";

  const filteredColis = useMemo(() => {
    if (!data) return [];
    if (colisFilter === "transit") return data.activeParcels.filter(c => ["collected", "in_transit"].includes(c.status));
    if (colisFilter === "deliver") return data.activeParcels.filter(c => c.status === "arrived");
    if (colisFilter === "manual") return data.manualParcels;
    if (colisFilter === "dispute") return data.activeParcels.filter(c => c.status === "disputed");
    return data?.activeParcels || [];
  }, [colisFilter, data]);

  if (profileLoading || loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile || !data) return null;

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeCount}
      activeTab="aujourdhui"
      onNewVoyage={() => setShowVoyageForm(true)}
    >
      <div className="px-4 py-4 space-y-5">
        {/* ─── PENDING ACCOUNT ─── */}
        {isPending && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-sm">Compte en attente</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Konnekt vérifie votre profil. Les fonctions terrain seront débloquées après validation.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {!isPending && (
          <>
            {/* ─── HEADER — Route + Refresh ─── */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Aperçu</h2>
                {gpProfile.base_origin_city && gpProfile.base_destination_city && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Plane className="w-3 h-3" />
                    {gpProfile.base_origin_city} → {gpProfile.base_destination_city}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadAll(true)} disabled={refreshing}>
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              </Button>
            </div>

            {/* ─── Compact wallet shortcut ─── */}
            {w && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/gp/wallet")}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold">{w.balance.toLocaleString()} {getCurrencySymbol(currency as any)}</p>
                  <p className="text-[11px] text-muted-foreground">Solde disponible</p>
                </div>
                {w.commissionDue > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    Dû: {w.commissionDue.toLocaleString()}
                  </Badge>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </motion.button>
            )}

            {/* ═══════════════════════════════════
                KYC PROGRESSION CARD
            ═══════════════════════════════════ */}
            <GPKYCProgressCard
              kycLevel={gpProfile.kyc_level ?? 0}
              kycStatus={gpProfile.kyc_status ?? "none"}
              status={gpProfile.status}
              hasIdDocument={!!gpProfile.id_document_url}
              hasSelfie={!!gpProfile.selfie_url}
              hasBusinessReg={!!gpProfile.business_registration_url}
              onActivateBadge={() => navigate("/gp/profil-public")}
            />

            {/* ═══════════════════════════════════
                3️⃣ ACTIONS RAPIDES — SCAN OPENS CAMERA DIRECTLY
            ═══════════════════════════════════ */}
            <div className="grid grid-cols-4 gap-2">
              <QuickAction
                icon={ScanLine}
                label="Scanner"
                primary
                onClick={() => setScanSheetOpen(true)}
              />
              <QuickAction
                icon={Package}
                label="Demandes"
                badge={pendingCount}
                onClick={() => navigate("/gp/demandes")}
              />
              <QuickAction
                icon={Plus}
                label="Voyage"
                onClick={() => setShowVoyageForm(true)}
              />
              <QuickAction
                icon={History}
                label="Historique"
                onClick={() => navigate("/gp/historique")}
              />
            </div>

            {/* ─── ALERTS ─── */}
            {(data.pendingActions.weightAlerts > 0) && (
              <AlertRow
                icon={Scale} color="text-destructive" bg="bg-destructive/10 border-destructive/30"
                text={`${data.pendingActions.weightAlerts} poids modifié(s) — validation client`}
                onClick={() => navigate("/gp/colis?filter=pending_client_validation")}
              />
            )}

            {/* ═══════════════════════════════════
                4️⃣ COLIS ACTIFS
            ═══════════════════════════════════ */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Colis actifs</h3>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/gp/colis")}>
                  Voir tout <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              </div>

              {/* Horizontal filters */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                {([
                  { key: "transit" as const, label: "En transit", count: data.activeParcels.filter(c => ["collected", "in_transit"].includes(c.status)).length },
                  { key: "deliver" as const, label: "À livrer", count: data.activeParcels.filter(c => c.status === "arrived").length },
                  { key: "manual" as const, label: "Manuel", count: data.manualParcels.length },
                  { key: "dispute" as const, label: "Litige", count: data.activeParcels.filter(c => c.status === "disputed").length },
                ]).map(f => (
                  <button key={f.key}
                    onClick={() => setColisFilter(f.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                      colisFilter === f.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground"
                    )}>
                    {f.label}
                    {f.count > 0 && (
                      <span className={cn("w-4 h-4 rounded-full text-[10px] flex items-center justify-center",
                        colisFilter === f.key ? "bg-primary-foreground/20" : "bg-muted-foreground/20"
                      )}>{f.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Parcel cards */}
              {filteredColis.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  Aucun colis dans cette catégorie
                </div>
              ) : (
                <AnimatePresence>
                  {filteredColis.map((c: any, i: number) => {
                    const isManual = colisFilter === "manual";
                    return (
                      <motion.div key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}>
                        <Card
                          className={cn(
                            "cursor-pointer active:scale-[0.98] transition-all",
                            isManual && "border-amber-500/30"
                          )}
                          onClick={() => !isManual && navigate(`/gp/order/${c.id}`)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                              isManual ? "bg-amber-500/10" :
                              c.status === "in_transit" ? "bg-blue-500/10" :
                              c.status === "arrived" ? "bg-purple-500/10" :
                              "bg-muted/50"
                            )}>
                              <Package className={cn("w-5 h-5",
                                isManual ? "text-amber-500" :
                                c.status === "in_transit" ? "text-blue-500" :
                                c.status === "arrived" ? "text-purple-500" :
                                "text-muted-foreground"
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold truncate">
                                  {c.origin_city} → {c.destination_city}
                                </p>
                                {isManual && <ManualParcelBadge />}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  #{(c.order_number || "").slice(-6)}
                                </span>
                                <span className="text-[11px] text-muted-foreground">{c.weight} kg</span>
                                {isManual && <span className="text-[11px] text-muted-foreground">{c.client_name}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Badge className={cn("text-[10px]", getOrderStatusColor(c.status))}>
                                {getOrderStatusLabel(c.status)}
                              </Badge>
                              {!isManual && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 bg-primary/10 hover:bg-primary/20"
                                  onClick={(e) => { e.stopPropagation(); setCameraOpen(true); }}>
                                  <ScanLine className="w-4 h-4 text-primary" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* ═══════════════════════════════════
                5️⃣ PERFORMANCE
            ═══════════════════════════════════ */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold">Performance du mois</h3>
              <div className="grid grid-cols-2 gap-2">
                <PerfCard label="Livraisons" value={String(data.stats.delivered)} icon={Send} />
                <PerfCard label="Taux réussite" value={`${data.stats.successRate}%`} icon={TrendingUp} />
                <PerfCard label="Litiges" value={String(data.stats.disputes)} icon={AlertTriangle} highlight={data.stats.disputes > 0} />
                <PerfCard label="% Manuel" value={`${data.stats.manualPercent}%`} icon={Package} highlight={data.stats.manualPercent > 20} />
              </div>
              {data.stats.manualPercent > 20 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-muted-foreground flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  Passez sous 20% de colis manuels pour booster votre score KTP.
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════
                PROCHAINS DÉPARTS
            ═══════════════════════════════════ */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Prochains départs</h3>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/gp/calendrier")}>
                  Voir tout
                </Button>
              </div>
              {data.departures.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-6 text-center text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">Aucun départ planifié</p>
                    <Button variant="link" size="sm" className="mt-1 text-xs" onClick={() => setShowVoyageForm(true)}>
                      Ajouter un voyage
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                data.departures.map((dep: any) => (
                  <Card key={dep.id} className="cursor-pointer active:scale-[0.98] transition-all" onClick={() => navigate("/gp/calendrier")}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Plane className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{dep.origin_city} → {dep.destination_city}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(dep.departure_date), "EEE d MMM", { locale: fr })}
                          {dep.flight_number && ` · ${dep.flight_number}`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">{dep.available_capacity} kg</Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* KTP pedagogy */}
            {data.manualParcels.length > 0 && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground">
                💡 Les réservations complètes Konnekt améliorent votre score KTP et votre visibilité.
              </div>
            )}
          </>
        )}
      </div>



      {/* ═══════════════════════════════════
          QR CAMERA SCANNER — DIRECT
      ═══════════════════════════════════ */}
      <QRCameraScanner
        isOpen={cameraOpen}
        onScan={handleScanFromCamera}
        onClose={() => setCameraOpen(false)}
      />

      {/* GP Scan Sheet — opens from Scanner quick action */}
      <GPScanSheet
        open={scanSheetOpen}
        onOpenChange={setScanSheetOpen}
        gpId={gpProfile?.id}
        isVerified={gpProfile?.status === "verified" || gpProfile?.status === "premium" || gpProfile?.status === "starter"}
      />

      {gpProfile && (
        <>
          <SmartVoyageForm open={showVoyageForm} onClose={() => setShowVoyageForm(false)}
            gpId={gpProfile.id} onSuccess={() => { setShowVoyageForm(false); loadAll(); }} />
          <CreateManualParcelDialog open={showManualForm} onClose={() => setShowManualForm(false)}
            gpId={gpProfile.id} gpCurrency={gpProfile.default_currency || "XOF"} onSuccess={() => loadAll(true)} />
        </>
      )}
    </GPDashboardLayout>
  );
}

/* ─── Quick Action Button ─── */
function QuickAction({ icon: Icon, label, primary, variant, badge, onClick }: {
  icon: any; label: string; primary?: boolean; variant?: "amber"; badge?: number; onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all relative",
        primary ? "bg-primary text-primary-foreground shadow-lg" :
        variant === "amber" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
        "bg-muted/60 text-foreground"
      )}
    >
      <div className="relative">
        <Icon className="w-5 h-5" />
        {!!badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-semibold">{label}</span>
    </motion.button>
  );
}

/* ─── Alert Row ─── */
function AlertRow({ icon: Icon, color, bg, text, onClick }: {
  icon: any; color: string; bg: string; text: string; onClick: () => void;
}) {
  return (
    <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      whileTap={{ scale: 0.98 }} onClick={onClick}
      className={cn("w-full p-3 rounded-xl border flex items-center gap-3 text-left", bg)}>
      <Icon className={cn("w-5 h-5 flex-shrink-0", color)} />
      <p className="text-sm font-medium flex-1">{text}</p>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </motion.button>
  );
}

/* ─── Performance Card ─── */
function PerfCard({ label, value, icon: Icon, highlight }: {
  label: string; value: string; icon: any; highlight?: boolean;
}) {
  return (
    <div className={cn(
      "p-3 rounded-xl border bg-card",
      highlight && "border-amber-500/30 bg-amber-500/5"
    )}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-3.5 h-3.5", highlight ? "text-amber-500" : "text-muted-foreground")} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-xl font-bold", highlight ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>{value}</p>
    </div>
  );
}

