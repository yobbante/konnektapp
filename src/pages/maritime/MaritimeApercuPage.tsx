/**
 * MaritimeApercuPage — Smart Dashboard Maritime (Compact)
 * 
 * 4 pillars: Groupage LCL, Conteneur FCL, Véhicule, Marketplace
 * Ocean blue theme via .theme-maritime
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package, Ship, Bell, ChevronRight,
  RefreshCw, Wallet, Plus, ScanLine,
  History, CheckCircle2, Activity,
  AlertTriangle, Anchor, Calendar,
  ArrowRight, Container
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MaritimeDashboardLayout } from "@/components/layout/MaritimeDashboardLayout";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { GPScanSheet } from "@/components/scan/GPScanSheet";
import { MaritimeConsolidationCard } from "@/components/maritime/MaritimeConsolidationCard";
import { MaritimeAutoRoutes } from "@/components/maritime/MaritimeAutoRoutes";
import { getOrderStatusLabel, getOrderStatusColor } from "@/lib/transportTypes";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DashboardData {
  wallet: { balance: number; pending: number; currency: string } | null;
  activeShipments: any[];
  pendingShipments: any[];
  stats: { delivered: number; successRate: number; disputes: number; total: number };
  departures: any[];
}

export default function MaritimeApercuPage() {
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
      .from("gp_profiles").select("*").eq("user_id", user.id).eq("gp_type", "maritime").maybeSingle();
    if (!gp) { navigate("/transporteur/inscription"); return; }
    setGpProfile(gp);
  };

  useEffect(() => { if (gpProfile) loadAll(); }, [gpProfile]);

  const loadAll = useCallback(async (refresh = false) => {
    if (!gpProfile) return;
    if (refresh) setRefreshing(true);
    try {
      const [ordersRes, walletRes, departuresRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, origin_city, destination_city, weight, status, total_price, currency, created_at, description")
          .eq("gp_id", gpProfile.id).not("status", "eq", "cancelled").order("created_at", { ascending: false }),
        supabase.from("gp_wallets").select("balance, pending_balance, currency").eq("gp_id", gpProfile.id).maybeSingle(),
        supabase.from("maritime_departures").select("*")
          .eq("gp_id", gpProfile.id).eq("status", "active").order("departure_date", { ascending: true }),
      ]);

      const orders = ordersRes.data || [];
      const pending = orders.filter(o => o.status === "pending");
      const active = orders.filter(o => ["accepted", "collected", "checked_in", "in_transit", "arrived_destination", "delivery_pending"].includes(o.status));
      const delivered = orders.filter(o => ["delivered", "released"].includes(o.status));

      setData({
        wallet: walletRes.data ? { balance: walletRes.data.balance, pending: walletRes.data.pending_balance, currency: walletRes.data.currency || "XOF" } : null,
        activeShipments: active.slice(0, 8),
        pendingShipments: pending.slice(0, 5),
        stats: {
          delivered: delivered.length,
          successRate: orders.length > 0 ? Math.round(delivered.length / orders.length * 100) : 0,
          disputes: orders.filter(o => o.status === "disputed").length,
          total: orders.length,
        },
        departures: departuresRes.data || [],
      });
    } catch (err) {
      console.error("Maritime dashboard load error:", err);
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

  if (loading) return <TransportPageLoader message="Chargement maritime..." vehicle="truck" />;
  if (!gpProfile || !data) return null;

  const w = data.wallet;
  const currency = w?.currency || "XOF";
  const pendingCount = data.pendingShipments.length;

  return (
    <MaritimeDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={data.activeShipments.length}>
      <div className="px-3 py-3 space-y-3 pb-24">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">Maritime</h2>
            <p className="text-[10px] text-muted-foreground">Fret maritime, groupage & véhicules</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadAll(true)} disabled={refreshing}>
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* URGENT ALERTS */}
        {pendingCount > 0 && (
          <motion.button initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/maritime/demandes")}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-left">
            <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-destructive">{pendingCount} expédition{pendingCount > 1 ? "s" : ""} en attente</p>
              <p className="text-[10px] text-muted-foreground">Répondez rapidement</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-destructive/60 flex-shrink-0" />
          </motion.button>
        )}

        {/* QUICK ACTIONS — 4 pillars */}
        <div className="grid grid-cols-4 gap-1.5">
          <QuickAction icon={ScanLine} label="Scanner" primary onClick={() => setScanSheetOpen(true)} />
          <QuickAction icon={Package} label="Expéditions" badge={pendingCount} onClick={() => navigate("/maritime/demandes")} />
          <QuickAction icon={Plus} label="Publier" onClick={() => navigate("/maritime/publier")} />
          <QuickAction icon={History} label="Historique" onClick={() => navigate("/maritime/historique")} />
        </div>

        {/* MARITIME TYPE SELECTOR — Client-facing pillars */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold flex items-center gap-1.5">
            <Anchor className="w-3.5 h-3.5 text-primary" />
            Services maritimes
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "", title: "Groupage LCL", desc: "Réservation au m³", path: "/maritime/publier" },
              { icon: "", title: "Conteneur FCL", desc: "20ft / 40ft dédié", path: "/maritime/publier" },
              { icon: "", title: "Véhicule", desc: "RoRo / Conteneur", path: "/maritime/publier" },
              { icon: "", title: "Devis libre", desc: "Demande sur mesure", path: "/maritime/publier" },
            ].map((s) => (
              <Card key={s.title} className="cursor-pointer active:scale-[0.98] transition-all border-primary/15 hover:border-primary/40" onClick={() => navigate(s.path)}>
                <CardContent className="p-2.5 flex items-center gap-2">
                  <span className="text-lg">{s.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold truncate">{s.title}</p>
                    <p className="text-[9px] text-muted-foreground">{s.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* WALLET */}
        {w && (
          <Card className="cursor-pointer active:scale-[0.98] transition-all" onClick={() => navigate("/maritime/wallet")}>
            <CardContent className="p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">Solde disponible</p>
                  <p className="text-base font-bold leading-tight">{w.balance.toLocaleString()} {getCurrencySymbol(currency as any)}</p>
                </div>
                {w.pending > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-muted-foreground">En attente</p>
                    <p className="text-xs font-semibold text-accent">+{w.pending.toLocaleString()}</p>
                  </div>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* DEPARTURES / CONTAINERS */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Ship className="w-3.5 h-3.5 text-primary" />
              <h3 className="text-xs font-bold">Mes départs publiés</h3>
            </div>
            <Button variant="ghost" size="sm" className="text-[10px] h-6 gap-1 px-2" onClick={() => navigate("/maritime/publier")}>
              <Plus className="w-3 h-3" /> Publier
            </Button>
          </div>

          {data.departures.length === 0 ? (
            <Card className="border-dashed border-primary/30">
              <CardContent className="py-5 text-center">
                <Ship className="w-7 h-7 mx-auto mb-1.5 text-primary/30" />
                <p className="text-xs font-medium text-muted-foreground">Aucun départ publié</p>
                <Button variant="outline" size="sm" className="mt-2 h-7 text-[10px] border-primary/40 text-primary" onClick={() => navigate("/maritime/publier")}>
                  <Plus className="w-3 h-3 mr-1" /> Publier un départ
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {data.departures.map((dep: any) => {
                const fillPercent = dep.total_capacity_m3 > 0 ? Math.round(((dep.total_capacity_m3 - dep.available_capacity_m3) / dep.total_capacity_m3) * 100) : 0;
                const isLCL = dep.maritime_type === "lcl";
                const typeLabel = dep.maritime_type?.toUpperCase() || "LCL";
                return (
                  <Card key={dep.id} className="cursor-pointer active:scale-[0.99] transition-all border-primary/20">
                    <CardContent className="p-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Ship className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold truncate">{dep.origin_port} → {dep.destination_port}</p>
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-primary/30 text-primary">{typeLabel}</Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {dep.departure_date && format(new Date(dep.departure_date), "d MMM yyyy", { locale: fr })}
                            </span>
                            <span className="text-[9px] text-muted-foreground">·</span>
                            <span className="text-[9px] font-medium text-primary">
                              {isLCL ? `${dep.price_per_m3?.toLocaleString()} ${dep.currency}/m³` : `${dep.price_total?.toLocaleString()} ${dep.currency}`}
                            </span>
                            {dep.transit_days && (
                              <>
                                <span className="text-[9px] text-muted-foreground">·</span>
                                <span className="text-[9px] text-muted-foreground">{dep.transit_days}j</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-bold text-primary">{fillPercent}%</p>
                          <div className="w-14 h-1.5 bg-muted rounded-full mt-0.5 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", fillPercent >= 80 ? "bg-destructive" : fillPercent >= 50 ? "bg-accent" : "bg-primary")}
                              style={{ width: `${Math.max(5, fillPercent)}%` }}
                            />
                          </div>
                          <p className="text-[8px] text-muted-foreground mt-0.5">{dep.available_capacity_m3} m³ dispo</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* PENDING ORDERS */}
        {data.pendingShipments.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold">Action requise</h3>
              <Badge variant="destructive" className="text-[9px] h-4">{data.pendingShipments.length}</Badge>
            </div>
            <div className="space-y-1.5">
              {data.pendingShipments.map((c: any) => (
                <Card key={c.id} className="border-destructive/20 bg-destructive/5">
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                        <Ship className="w-3.5 h-3.5 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{c.origin_city} → {c.destination_city}</p>
                        <span className="text-[10px] text-muted-foreground">{c.weight} kg · {formatDistanceToNow(new Date(c.created_at), { locale: fr, addSuffix: true })}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5 border-destructive/40 text-destructive"
                          onClick={() => handleQuickStatusUpdate(c.id, "cancelled")} disabled={updatingOrder === c.id}>✕</Button>
                        <Button size="sm" className="h-6 text-[10px] px-2"
                          onClick={() => handleQuickStatusUpdate(c.id, "accepted")} disabled={updatingOrder === c.id}>
                          {updatingOrder === c.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : "✓"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ACTIVE SHIPMENTS */}
        {data.activeShipments.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold">En cours ({data.activeShipments.length})</h3>
              <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => navigate("/maritime/en-cours")}>
                Tout voir <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
            <div className="space-y-1">
              {data.activeShipments.slice(0, 4).map((c: any) => (
                <Card key={c.id} className="cursor-pointer active:scale-[0.99]">
                  <CardContent className="p-2 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Ship className="w-3 h-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate">{c.origin_city} → {c.destination_city}</p>
                      <span className="text-[9px] text-muted-foreground">{c.weight}kg · #{c.order_number?.slice(-6)}</span>
                    </div>
                    <Badge className={cn("text-[8px] h-3.5 shrink-0", getOrderStatusColor(c.status))}>
                      {getOrderStatusLabel(c.status)}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {data.pendingShipments.length === 0 && data.activeShipments.length === 0 && data.departures.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-muted-foreground">
              <Ship className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs font-medium">Aucune activité maritime</p>
              <p className="text-[10px] mt-0.5">Publiez votre premier départ conteneur</p>
              <Button variant="outline" size="sm" className="mt-2 h-7 text-[10px]" onClick={() => navigate("/maritime/publier")}>
                <Plus className="w-3 h-3 mr-1" /> Publier un départ
              </Button>
            </CardContent>
          </Card>
        )}

        {/* SMART CONSOLIDATION */}
        <MaritimeConsolidationCard gpId={gpProfile.id} onCreateDeparture={() => navigate("/maritime/publier")} />

        {/* AUTO-ROUTES */}
        <MaritimeAutoRoutes gpId={gpProfile.id} onCreateDeparture={(origin, dest) => navigate("/maritime/publier")} />

        {/* PERFORMANCE */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold">Performance</h3>
          <div className="grid grid-cols-4 gap-1.5">
            <MiniStat label="Livrés" value={String(data.stats.delivered)} icon={CheckCircle2} color="text-primary" />
            <MiniStat label="Réussite" value={`${data.stats.successRate}%`} icon={Activity} color="text-primary" />
            <MiniStat label="Litiges" value={String(data.stats.disputes)} icon={AlertTriangle} color={data.stats.disputes > 0 ? "text-destructive" : "text-muted-foreground"} />
            <MiniStat label="Total" value={String(data.stats.total)} icon={Ship} color="text-muted-foreground" />
          </div>
        </div>

        {/* CORRIDORS */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold flex items-center gap-1.5">
            <Anchor className="w-3.5 h-3.5 text-primary" />
            Corridors prioritaires
          </h3>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {["Marseille ↔ Dakar", "Le Havre ↔ Dakar", "New York ↔ Dakar", "Dubaï ↔ Abidjan", "Casablanca ↔ Dakar"].map((c) => (
              <Badge key={c} variant="outline" className="shrink-0 text-[9px] px-2 py-1 border-primary/30 text-primary">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <GPScanSheet gpId={gpProfile.id} isVerified={gpProfile.status === "verified"} open={scanSheetOpen} onOpenChange={setScanSheetOpen} />
    </MaritimeDashboardLayout>
  );
}

function QuickAction({ icon: Icon, label, badge, primary, onClick }: {
  icon: any; label: string; badge?: number; primary?: boolean; onClick?: () => void;
}) {
  return (
    <motion.button whileTap={{ scale: 0.95 }} onClick={onClick}
      className={cn("flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-xl transition-all relative",
        primary ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-card border border-border hover:bg-muted"
      )}>
      {badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[8px] rounded-full flex items-center justify-center font-bold">{badge}</span>
      )}
      <Icon className="w-4 h-4" />
      <span className="text-[10px] font-medium">{label}</span>
    </motion.button>
  );
}

function MiniStat({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="p-2 text-center">
        <Icon className={cn("w-3.5 h-3.5 mx-auto mb-0.5", color)} />
        <p className={cn("text-sm font-bold", color)}>{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
