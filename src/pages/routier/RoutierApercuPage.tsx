/**
 * RoutierApercuPage — Dashboard Routier V2
 * 
 * Matches GP dashboard quality: Alerts → Quick Actions → Active Orders → Stats → Fleet
 * Dual-mode: Navette (publish fixed lines) + Mission (receive marketplace requests)
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Truck, Bell, Clock, ChevronRight,
  RefreshCw, Wallet, Plus, ScanLine,
  History, CheckCircle2, Activity,
  AlertTriangle, Zap, Car, Route,
  MapPin, Calendar, ArrowRight, Scale,
  Shield, Star, TrendingUp, Send
} from "lucide-react";
import { getSizeFromWeight, freightTypeLabels } from "@/lib/routierUtils";
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
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DashboardData {
  wallet: { balance: number; pending: number; currency: string } | null;
  activeMissions: any[];
  pendingMissions: any[];
  vehicles: any[];
  stats: { delivered: number; successRate: number; disputes: number; missions: number; avgRating: number };
  pendingActions: { pendingOrders: number; marketplaceMissions: number };
  navettes: any[];
  missionRequests: any[];
}

const STATUS_FLOW: Record<string, { label: string; next: string; nextLabel: string; color: string; bg: string }> = {
  pending: { label: "En attente", next: "accepted", nextLabel: "Accepter", color: "text-amber-600", bg: "bg-amber-500/10" },
  accepted: { label: "À collecter", next: "collected", nextLabel: "Collecté", color: "text-blue-600", bg: "bg-blue-500/10" },
  collected: { label: "Collecté", next: "in_transit", nextLabel: "Départ", color: "text-indigo-600", bg: "bg-indigo-500/10" },
  in_transit: { label: "En transit", next: "arrived_destination", nextLabel: "Arrivé", color: "text-purple-600", bg: "bg-purple-500/10" },
  arrived_destination: { label: "Arrivé", next: "delivered", nextLabel: "Livré", color: "text-teal-600", bg: "bg-teal-500/10" },
  delivered: { label: "Livré ✓", next: "", nextLabel: "", color: "text-green-700", bg: "bg-green-500/10" },
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

  useEffect(() => { if (gpProfile) loadAll(); }, [gpProfile]);

  const loadAll = useCallback(async (refresh = false) => {
    if (!gpProfile) return;
    if (refresh) setRefreshing(true);
    try {
      const [ordersRes, walletRes, vehiclesRes, navettesRes, missionsRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, origin_city, destination_city, weight, status, total_price, currency, created_at, description, recipient_name")
          .eq("gp_id", gpProfile.id).not("status", "eq", "cancelled").order("created_at", { ascending: false }),
        supabase.from("gp_wallets").select("balance, pending_balance, currency").eq("gp_id", gpProfile.id).maybeSingle(),
        supabase.from("vehicles").select("id, name, vehicle_type, is_active, max_weight_kg").eq("gp_id", gpProfile.id),
        supabase.from("gp_offers").select("id, origin_city, destination_city, departure_date, available_capacity, total_capacity, price_per_kg, currency, status, vehicle_id")
          .eq("gp_id", gpProfile.id).eq("status", "active").order("departure_date", { ascending: true }),
        supabase.from("routier_missions").select("id, origin_city, destination_city, weight_kg, freight_type, vehicle_type_required, client_budget, estimated_price, currency, urgency, created_at, status")
          .in("status", ["open", "matching", "negotiating"]).order("created_at", { ascending: false }).limit(5),
      ]);

      const orders = ordersRes.data || [];
      const pending = orders.filter(o => o.status === "pending");
      const active = orders.filter(o => ["accepted", "collected", "in_transit", "arrived_destination", "delivery_pending"].includes(o.status));
      const delivered = orders.filter(o => ["delivered", "released", "delivery_confirmed"].includes(o.status));

      setData({
        wallet: walletRes.data ? { balance: walletRes.data.balance, pending: walletRes.data.pending_balance, currency: walletRes.data.currency || "XOF" } : null,
        activeMissions: active.slice(0, 8),
        pendingMissions: pending.slice(0, 5),
        vehicles: vehiclesRes.data || [],
        stats: {
          delivered: delivered.length,
          successRate: orders.length > 0 ? Math.round(delivered.length / orders.length * 100) : 0,
          disputes: orders.filter(o => o.status === "disputed").length,
          missions: orders.length,
          avgRating: gpProfile.rating || 0,
        },
        pendingActions: { pendingOrders: pending.length, marketplaceMissions: (missionsRes.data || []).length },
        navettes: navettesRes.data || [],
        missionRequests: missionsRes.data || [],
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gpProfile]);

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
  const isShuttle = gpProfile.road_type === "shuttle" || gpProfile.road_type === "both" || gpProfile.road_type === "navette";
  const isMission = gpProfile.road_type === "mission" || gpProfile.road_type === "both";
  const pendingCount = data.pendingActions.pendingOrders;
  const isVerified = gpProfile.status === "verified" || gpProfile.status === "premium" || gpProfile.status === "starter";

  return (
    <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={data.activeMissions.length}>
      <div className="px-3 py-3 space-y-4 pb-24">

        {/* ── GREETING + REFRESH ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Bonjour 👋</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isShuttle && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-primary/20">🚌 Navette</Badge>}
              {isMission && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-accent/15 text-accent-foreground border-accent/20">🚛 Mission</Badge>}
              {data.stats.avgRating > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {data.stats.avgRating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadAll(true)} disabled={refreshing}>
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* ── URGENT ALERTS ── */}
        <AnimatePresence>
          {pendingCount > 0 && (
            <motion.button
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/routier/demandes")}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-destructive">{pendingCount} commande{pendingCount > 1 ? "s" : ""} en attente</p>
                <p className="text-xs text-muted-foreground">Répondez rapidement pour maintenir votre KTP</p>
              </div>
              <ChevronRight className="w-4 h-4 text-destructive/60 flex-shrink-0" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── QUICK ACTIONS — Row of 4 ── */}
        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={ScanLine} label="Scanner" primary onClick={() => setScanSheetOpen(true)} />
          <QuickAction icon={Package} label="Missions" badge={pendingCount} onClick={() => navigate("/routier/demandes")} />
          {isShuttle ? (
            <QuickAction icon={Plus} label="Publier" onClick={() => navigate("/routier/publier")} />
          ) : (
            <QuickAction icon={Car} label="Flotte" onClick={() => navigate("/routier/vehicules")} />
          )}
          <QuickAction icon={History} label="Historique" onClick={() => navigate("/routier/historique")} />
        </div>

        {/* ── WALLET CARD ── */}
        {w && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="cursor-pointer active:scale-[0.98] transition-all border-primary/20 bg-gradient-to-r from-primary/5 to-transparent" onClick={() => navigate("/routier/wallet")}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground font-medium">Solde disponible</p>
                    <p className="text-lg font-bold leading-tight">{w.balance.toLocaleString()} {getCurrencySymbol(currency as any)}</p>
                  </div>
                  {w.pending > 0 && (
                    <div className="text-right shrink-0">
                      <p className="text-[9px] text-muted-foreground">En attente</p>
                      <p className="text-sm font-semibold text-primary">+{w.pending.toLocaleString()}</p>
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
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-3 rounded-xl bg-accent/10 border border-accent/30 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all"
            onClick={() => navigate("/routier/vehicules")}
          >
            <Car className="w-8 h-8 text-accent" />
            <div className="flex-1">
              <p className="text-sm font-bold">Ajoutez un véhicule</p>
              <p className="text-xs text-muted-foreground">Requis pour publier ou recevoir des missions</p>
            </div>
            <ChevronRight className="w-4 h-4 text-accent/60" />
          </motion.div>
        )}

        {/* ── PENDING ORDERS — Action requise ── */}
        {data.pendingMissions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h3 className="text-sm font-bold">Action requise</h3>
              <Badge variant="destructive" className="text-[9px] h-4">{data.pendingMissions.length}</Badge>
            </div>
            <div className="space-y-2">
              {data.pendingMissions.map((c: any, i: number) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border-destructive/20 bg-destructive/5">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                          <Truck className="w-5 h-5 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{c.origin_city} → {c.destination_city}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{c.weight} kg</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(c.created_at), { locale: fr, addSuffix: true })}
                            </span>
                          </div>
                          {c.total_price && (
                            <p className="text-xs font-semibold text-primary mt-0.5">{c.total_price.toLocaleString()} {c.currency || currency}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="h-8 text-xs px-2 border-destructive/40 text-destructive"
                            onClick={() => handleQuickStatusUpdate(c.id, "cancelled")} disabled={updatingOrder === c.id}>
                            ✕
                          </Button>
                          <Button size="sm" className="h-8 text-xs px-3"
                            onClick={() => handleQuickStatusUpdate(c.id, "accepted")} disabled={updatingOrder === c.id}>
                            {updatingOrder === c.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Accepter"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── ACTIVE MISSIONS — With status flow ── */}
        {data.activeMissions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">En cours</h3>
                <Badge variant="secondary" className="text-[9px] h-4 bg-primary/15 text-primary">{data.activeMissions.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/routier/en-cours")}>
                Tout voir <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {data.activeMissions.slice(0, 4).map((c: any, i: number) => {
                const flow = STATUS_FLOW[c.status];
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className="cursor-pointer active:scale-[0.99] transition-all">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", flow?.bg || "bg-primary/10")}>
                            <Truck className={cn("w-5 h-5", flow?.color || "text-primary")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{c.origin_city} → {c.destination_city}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className={cn("text-[9px] h-4 px-1.5", getOrderStatusColor(c.status))}>
                                {flow?.label || getOrderStatusLabel(c.status)}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{c.weight}kg · #{c.order_number?.slice(-6)}</span>
                            </div>
                          </div>
                          {flow?.next && (
                            <Button size="sm" className="h-7 text-[10px] px-2 shrink-0"
                              onClick={(e) => { e.stopPropagation(); handleQuickStatusUpdate(c.id, flow.next); }}
                              disabled={updatingOrder === c.id}>
                              {updatingOrder === c.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : flow.nextLabel}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── NAVETTE LINES ── */}
        {isShuttle && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">Mes lignes navette</h3>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("/routier/publier")}>
                <Plus className="w-3.5 h-3.5" /> Publier
              </Button>
            </div>

            {data.navettes.length === 0 ? (
              <Card className="border-dashed border-primary/30">
                <CardContent className="py-8 text-center">
                  <Route className="w-10 h-10 mx-auto mb-2 text-primary/20" />
                  <p className="text-sm font-medium text-muted-foreground">Aucune ligne publiée</p>
                  <p className="text-xs text-muted-foreground mt-1">Publiez votre première ligne navette</p>
                  <Button variant="outline" size="sm" className="mt-3 h-8 text-xs border-primary/40 text-primary" onClick={() => navigate("/routier/publier")}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Créer une ligne
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {data.navettes.map((nav: any) => {
                  const fillPercent = nav.total_capacity > 0 ? Math.round((nav.available_capacity / nav.total_capacity) * 100) : 0;
                  return (
                    <Card key={nav.id} className="cursor-pointer active:scale-[0.99] transition-all border-primary/15 hover:border-primary/30">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Route className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{nav.origin_city} → {nav.destination_city}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {nav.departure_date && format(new Date(nav.departure_date), "d MMM", { locale: fr })}
                              </span>
                              <span className="text-xs font-medium text-primary">{nav.price_per_kg} {nav.currency}/kg</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-primary">{nav.available_capacity}/{nav.total_capacity} kg</p>
                            <div className="w-16 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.max(5, fillPercent)}%` }} />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── MARKETPLACE MISSIONS ── */}
        {isMission && data.missionRequests.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold">Missions disponibles</h3>
                <Badge variant="secondary" className="text-[9px] h-4 bg-accent/15 text-accent-foreground">{data.missionRequests.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/routier/demandes")}>
                Voir tout <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {data.missionRequests.slice(0, 3).map((m: any) => {
                const size = getSizeFromWeight(m.weight_kg || 0);
                const freight = freightTypeLabels[m.freight_type] || { label: m.freight_type, emoji: "📦" };
                const price = m.client_budget || m.estimated_price || 0;
                return (
                  <Card key={m.id} className="cursor-pointer active:scale-[0.99] border-accent/20"
                    onClick={() => navigate("/routier/demandes")}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-sm font-semibold truncate">{m.origin_city}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-sm font-semibold truncate">{m.destination_city}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs">{freight.emoji}</span>
                            <span className="text-xs text-muted-foreground">{m.weight_kg} kg</span>
                            <Badge className={cn("text-[9px] h-4 px-1.5 font-bold", size.bg, size.color)}>{size.label}</Badge>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-primary">{price.toLocaleString()} CFA</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── EMPTY STATE ── */}
        {data.pendingMissions.length === 0 && data.activeMissions.length === 0 && data.navettes.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Aucune activité</p>
              <p className="text-xs mt-1">
                {isShuttle ? "Publiez votre première ligne navette pour recevoir des réservations" : "Ajoutez des véhicules pour recevoir des missions"}
              </p>
              <Button variant="outline" size="sm" className="mt-3 h-8 text-xs" onClick={() => navigate(isShuttle ? "/routier/publier" : "/routier/vehicules")}>
                <Plus className="w-3.5 h-3.5 mr-1" /> {isShuttle ? "Publier une ligne" : "Gérer ma flotte"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── FLEET OVERVIEW ── */}
        {data.vehicles.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">Ma flotte</h3>
                <Badge variant="secondary" className="text-[9px] h-4 bg-primary/15 text-primary">
                  {activeVehicles.length}/{data.vehicles.length}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/routier/vehicules")}>
                Gérer <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {data.vehicles.map((v: any) => (
                <Card key={v.id} className={cn("shrink-0 w-32", !v.is_active && "opacity-50")}>
                  <CardContent className="p-3 text-center">
                    <div className={cn("w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center", v.is_active ? "bg-primary/10" : "bg-muted")}>
                      <Truck className={cn("w-5 h-5", v.is_active ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <p className="text-xs font-semibold truncate">{v.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{v.vehicle_type?.replace(/_/g, " ")}</p>
                    {v.max_weight_kg && <p className="text-[9px] text-primary mt-0.5">{v.max_weight_kg} kg max</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── PERFORMANCE STATS ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Performance</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <MiniStat label="Livrés" value={String(data.stats.delivered)} icon={CheckCircle2} color="text-primary" bg="bg-primary/10" />
            <MiniStat label="Réussite" value={`${data.stats.successRate}%`} icon={Activity} color="text-primary" bg="bg-primary/10" />
            <MiniStat label="Litiges" value={String(data.stats.disputes)} icon={AlertTriangle} color={data.stats.disputes > 0 ? "text-destructive" : "text-muted-foreground"} bg={data.stats.disputes > 0 ? "bg-destructive/10" : "bg-muted"} />
            <MiniStat label="Total" value={String(data.stats.missions)} icon={Truck} color="text-muted-foreground" bg="bg-muted" />
          </div>
        </motion.div>

        {/* ── QUICK LINKS ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate("/routier/profil-public")}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-all text-left"
            >
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Profil public</span>
            </button>
            <button
              onClick={() => navigate("/routier/parametres")}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-all text-left"
            >
              <Scale className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium">Paramètres</span>
            </button>
          </div>
        </motion.div>
      </div>

      <GPScanSheet gpId={gpProfile.id} isVerified={isVerified} open={scanSheetOpen} onOpenChange={setScanSheetOpen} />
    </RoutierDashboardLayout>
  );
}

/* ─── Quick Action Button ─── */
function QuickAction({ icon: Icon, label, badge, primary, onClick }: {
  icon: any; label: string; badge?: number; primary?: boolean; onClick?: () => void;
}) {
  return (
    <motion.button whileTap={{ scale: 0.95 }} onClick={onClick}
      className={cn("flex flex-col items-center justify-center gap-1 w-full aspect-square rounded-xl transition-all relative",
        primary ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-card border border-border hover:bg-muted/50"
      )}>
      {!!badge && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse ring-2 ring-card" />
      )}
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </motion.button>
  );
}

/* ─── Mini Stat Card ─── */
function MiniStat({ label, value, icon: Icon, color, bg }: { label: string; value: string; icon: any; color: string; bg: string }) {
  return (
    <Card>
      <CardContent className="p-2.5 text-center">
        <div className={cn("w-7 h-7 rounded-lg mx-auto mb-1 flex items-center justify-center", bg)}>
          <Icon className={cn("w-3.5 h-3.5", color)} />
        </div>
        <p className={cn("text-sm font-bold", color)}>{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
