/**
 * RoutierApercuPage — Dashboard Routier style GP
 * 
 * Miroir du dashboard GP mais adapté métier routier:
 * - Quick actions: Scanner, Missions, Ajouter Route, Historique
 * - Wallet shortcut
 * - Missions actives (commandes en cours)
 * - Performance du mois
 * - Prochaines routes/navettes
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Truck, Bell, Clock, ChevronRight,
  RefreshCw, Scale, Wallet, Plus, ScanLine,
  History, CheckCircle2, Activity,
  AlertTriangle, UserCheck, Zap, Car, MapPin,
  Route
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { GPScanSheet } from "@/components/scan/GPScanSheet";
import { getOrderStatusLabel, getOrderStatusColor } from "@/lib/transportTypes";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DashboardData {
  wallet: { balance: number; pending: number; currency: string } | null;
  activeMissions: any[];
  pendingMissions: any[];
  vehicles: any[];
  stats: { delivered: number; successRate: number; disputes: number; missions: number };
  pendingActions: { pendingOrders: number; customRequests: number };
  routes: any[];
}

const STATUS_FLOW: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "En attente", color: "text-amber-600", bg: "bg-amber-500/10" },
  accepted: { label: "Acceptée", color: "text-blue-600", bg: "bg-blue-500/10" },
  collected: { label: "Collecté", color: "text-indigo-600", bg: "bg-indigo-500/10" },
  in_transit: { label: "En route", color: "text-purple-600", bg: "bg-purple-500/10" },
  arrived_destination: { label: "Arrivé", color: "text-green-600", bg: "bg-green-500/10" },
  delivery_pending: { label: "Livraison", color: "text-green-600", bg: "bg-green-500/10" },
  delivered: { label: "Livré ✓", color: "text-green-700", bg: "bg-green-500/10" },
};

export default function RoutierApercuPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [scanSheetOpen, setScanSheetOpen] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data: gp } = await supabase
      .from("gp_profiles").select("*").eq("user_id", user.id).eq("gp_type", "routier").maybeSingle();

    if (!gp) { navigate("/routier/inscription"); return; }
    setGpProfile(gp);
  };

  useEffect(() => {
    if (gpProfile) loadAll();
  }, [gpProfile]);

  const loadAll = async (refresh = false) => {
    if (!gpProfile) return;
    if (refresh) setRefreshing(true);

    try {
      const [ordersRes, walletRes, vehiclesRes, customReqRes, routesRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, origin_city, destination_city, weight, status, total_price, currency, created_at, description")
          .eq("gp_id", gpProfile.id).not("status", "eq", "cancelled").order("created_at", { ascending: false }),
        supabase.from("gp_wallets").select("balance, pending_balance, currency").eq("gp_id", gpProfile.id).maybeSingle(),
        supabase.from("vehicles").select("id, name, vehicle_type, is_active, max_weight_kg").eq("gp_id", gpProfile.id),
        supabase.from("custom_requests").select("id").eq("status", "open"),
        supabase.from("gp_offers").select("id, origin_city, destination_city, departure_date, available_capacity, status, vehicle_id")
          .eq("gp_id", gpProfile.id).eq("status", "active").order("departure_date", { ascending: true }).limit(5),
      ]);

      const orders = ordersRes.data || [];
      const pending = orders.filter(o => o.status === "pending");
      const active = orders.filter(o => ["accepted", "collected", "in_transit", "arrived_destination", "delivery_pending"].includes(o.status));
      const delivered = orders.filter(o => o.status === "delivered");
      const total = orders.length;

      setData({
        wallet: walletRes.data ? { balance: walletRes.data.balance, pending: walletRes.data.pending_balance, currency: walletRes.data.currency || "XOF" } : null,
        activeMissions: active.slice(0, 8),
        pendingMissions: pending.slice(0, 5),
        vehicles: vehiclesRes.data || [],
        stats: {
          delivered: delivered.length,
          successRate: total > 0 ? Math.round(delivered.length / total * 100) : 0,
          disputes: orders.filter(o => o.status === "disputed").length,
          missions: total,
        },
        pendingActions: {
          pendingOrders: pending.length,
          customRequests: (customReqRes.data || []).length,
        },
        routes: routesRes.data || [],
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
      const { error } = await supabase.from("orders").update({ status: newStatus as any }).eq("id", orderId);
      if (error) throw error;
      toast({ title: "Statut mis à jour ✓" });
      loadAll(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setUpdatingOrder(null); }
  };

  if (loading) return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  if (!gpProfile || !data) return null;

  const w = data.wallet;
  const currency = w?.currency || "XOF";
  const activeVehicles = data.vehicles.filter(v => v.is_active);
  const urgentCount = data.pendingActions.pendingOrders + data.pendingActions.customRequests;
  const pendingCount = data.pendingActions.pendingOrders;

  return (
    <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={data.activeMissions.length}>
      <div className="px-4 py-4 space-y-5">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Bonjour 👋</h2>
            {gpProfile.zones_covered?.length > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Truck className="w-3 h-3" />
                {gpProfile.zones_covered.slice(0, 3).join(", ")}
                {gpProfile.zones_covered.length > 3 && ` +${gpProfile.zones_covered.length - 3}`}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadAll(true)} disabled={refreshing}>
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* ── URGENT ALERTS ── */}
        {urgentCount > 0 && (
          <div className="space-y-2">
            {data.pendingActions.pendingOrders > 0 && (
              <motion.button initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/routier/demandes")}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-secondary/10 border border-secondary/30 text-left">
                <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-secondary">
                    {data.pendingActions.pendingOrders} mission{data.pendingActions.pendingOrders > 1 ? "s" : ""} en attente
                  </p>
                  <p className="text-xs text-muted-foreground">Répondez rapidement</p>
                </div>
                <ChevronRight className="w-4 h-4 text-secondary/60 flex-shrink-0" />
              </motion.button>
            )}
            {data.pendingActions.customRequests > 0 && (
              <motion.button initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/routier/demandes")}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-primary/10 border border-primary/30 text-left">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-primary">
                    {data.pendingActions.customRequests} demande{data.pendingActions.customRequests > 1 ? "s" : ""} personnalisée{data.pendingActions.customRequests > 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-primary/60 flex-shrink-0" />
              </motion.button>
            )}
          </div>
        )}

        {/* ── QUICK ACTIONS (like GP) ── */}
        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={ScanLine} label="Scanner" primary onClick={() => setScanSheetOpen(true)} />
          <QuickAction icon={Package} label="Missions" badge={pendingCount} onClick={() => navigate("/routier/demandes")} />
          <QuickAction icon={Plus} label="Route" onClick={() => navigate("/routier/vehicules")} />
          <QuickAction icon={History} label="Historique" onClick={() => navigate("/routier/historique")} />
        </div>

        {/* ── WALLET SHORTCUT ── */}
        {w && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="cursor-pointer active:scale-[0.98] transition-all overflow-hidden" onClick={() => navigate("/routier/wallet")}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Solde disponible</p>
                    <p className="text-lg font-bold leading-tight">{w.balance.toLocaleString()} {getCurrencySymbol(currency as any)}</p>
                  </div>
                  {w.pending > 0 && (
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">En attente</p>
                      <p className="text-sm font-semibold text-secondary">+{w.pending.toLocaleString()} {getCurrencySymbol(currency as any)}</p>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── NO VEHICLE ALERT ── */}
        {activeVehicles.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all"
            onClick={() => navigate("/routier/vehicules")}>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Car className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Ajoutez un véhicule</p>
              <p className="text-xs text-muted-foreground">Sans véhicule actif, vous ne recevrez pas de missions</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-600/60" />
          </motion.div>
        )}

        {/* ── PENDING MISSIONS — Action requise ── */}
        {data.pendingMissions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">Action requise</h3>
                <Badge variant="destructive" className="text-[10px] h-4">{data.pendingMissions.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/routier/demandes")}>
                Voir tout <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {data.pendingMissions.map((c: any, i: number) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="border-secondary/30 bg-secondary/5 cursor-pointer active:scale-[0.99] transition-all">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center flex-shrink-0">
                          <Truck className="w-4 h-4 text-secondary" />
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
                            onClick={(e) => { e.stopPropagation(); handleQuickStatusUpdate(c.id, "cancelled"); }}
                            disabled={updatingOrder === c.id}>Refuser</Button>
                          <Button size="sm" className="h-7 text-xs px-2 bg-accent hover:bg-accent/90 text-accent-foreground"
                            onClick={(e) => { e.stopPropagation(); handleQuickStatusUpdate(c.id, "accepted"); }}
                            disabled={updatingOrder === c.id}>
                            {updatingOrder === c.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Accepter ✓"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACTIVE MISSIONS ── */}
        {data.activeMissions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Missions actives <span className="text-muted-foreground font-normal">({data.activeMissions.length})</span></h3>
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("/routier/en-cours")}>
                Tout voir <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-1.5">
              {data.activeMissions.slice(0, 5).map((c: any, i: number) => {
                const flow = STATUS_FLOW[c.status as string];
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className="cursor-pointer active:scale-[0.99] transition-all">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", flow?.bg || "bg-muted/50")}>
                          <Truck className={cn("w-3.5 h-3.5", flow?.color || "text-muted-foreground")} />
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
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {data.pendingMissions.length === 0 && data.activeMissions.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Truck className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Aucune mission en cours</p>
              <p className="text-xs mt-1">Ajoutez des véhicules et des routes pour recevoir des missions</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/routier/vehicules")}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Gérer ma flotte
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── FLEET SUMMARY ── */}
        {data.vehicles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Ma flotte</h3>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/routier/vehicules")}>
                Gérer <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {data.vehicles.map((v: any) => (
                <Card key={v.id} className={cn("shrink-0 w-36", !v.is_active && "opacity-50")}>
                  <CardContent className="p-3 text-center">
                    <div className={cn("w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center", v.is_active ? "bg-primary/10" : "bg-muted")}>
                      <Truck className={cn("w-5 h-5", v.is_active ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <p className="text-xs font-semibold truncate">{v.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{v.vehicle_type?.replace(/_/g, " ")}</p>
                    {v.max_weight_kg && <p className="text-[10px] text-muted-foreground">{(v.max_weight_kg / 1000).toFixed(0)}t</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── PERFORMANCE ── */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold">Performance du mois</h3>
          <div className="grid grid-cols-4 gap-2">
            <MiniStat label="Livrés" value={String(data.stats.delivered)} icon={CheckCircle2} color="text-green-600" />
            <MiniStat label="Réussite" value={`${data.stats.successRate}%`} icon={Activity} color="text-primary" />
            <MiniStat label="Litiges" value={String(data.stats.disputes)} icon={AlertTriangle} color={data.stats.disputes > 0 ? "text-destructive" : "text-muted-foreground"} />
            <MiniStat label="Missions" value={String(data.stats.missions)} icon={UserCheck} color="text-muted-foreground" />
          </div>
        </div>

        {/* ── ROUTES / NAVETTES ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Prochaines routes</h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/routier/vehicules")}>Voir tout</Button>
          </div>
          {data.routes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-5 text-center text-muted-foreground">
                <Route className="w-7 h-7 mx-auto mb-2 opacity-20" />
                <p className="text-xs">Aucune route planifiée</p>
                <Button variant="link" size="sm" className="mt-1 text-xs" onClick={() => navigate("/routier/vehicules")}>
                  Ajouter une route
                </Button>
              </CardContent>
            </Card>
          ) : (
            data.routes.map((dep: any) => (
              <Card key={dep.id} className="cursor-pointer active:scale-[0.98] transition-all">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{dep.origin_city} → {dep.destination_city}</p>
                    <p className="text-xs text-muted-foreground">
                      {dep.departure_date && new Date(dep.departure_date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{dep.available_capacity} kg</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Scan Sheet */}
      <GPScanSheet
        gpId={gpProfile.id}
        isVerified={gpProfile.status === "verified"}
        open={scanSheetOpen}
        onOpenChange={setScanSheetOpen}
      />
    </RoutierDashboardLayout>
  );
}

// ── Quick Action Button (same as GP) ──
function QuickAction({ icon: Icon, label, badge, primary, onClick }: {
  icon: any; label: string; badge?: number; primary?: boolean; onClick?: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all relative",
        primary
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
          : "bg-card border border-border hover:bg-muted"
      )}
    >
      {badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] rounded-full flex items-center justify-center font-bold">
          {badge}
        </span>
      )}
      <Icon className="w-5 h-5" />
      <span className="text-[11px] font-medium">{label}</span>
    </motion.button>
  );
}

// ── Mini Stat (same as GP) ──
function MiniStat({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: any; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-2.5 text-center">
        <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
        <p className={cn("text-base font-bold", color)}>{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
