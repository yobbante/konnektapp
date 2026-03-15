/**
 * AerienApercuPage — Air Cargo Dashboard with air_departures integration
 * Shows published departures with fill gauges, weight tiers, and surcharges
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package, Plane, Bell, ChevronRight,
  RefreshCw, Wallet, Plus, ScanLine,
  History, Calendar, Weight
} from "lucide-react";
import { AerienConsolidationCard } from "@/components/air/AerienConsolidationCard";
import { AerienAutoRoutes } from "@/components/air/AerienAutoRoutes";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AerienDashboardLayout } from "@/components/layout/AerienDashboardLayout";
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
  activeShipments: any[];
  pendingShipments: any[];
  stats: { delivered: number; successRate: number; total: number };
  departures: any[];
  freightRequests: number;
}

export default function AerienApercuPage() {
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
      .from("gp_profiles").select("*").eq("user_id", user.id)
      .in("gp_type", ["aerien", "agence"]).maybeSingle();
    if (!gp) { navigate("/transporteur/inscription"); return; }
    setGpProfile(gp);
  };

  useEffect(() => { if (gpProfile) loadAll(); }, [gpProfile]);

  const loadAll = useCallback(async (refresh = false) => {
    if (!gpProfile) return;
    if (refresh) setRefreshing(true);
    try {
      const [ordersRes, walletRes, departuresRes, freightRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, origin_city, destination_city, weight, status, total_price, currency, created_at, description")
          .eq("gp_id", gpProfile.id).not("status", "eq", "cancelled").order("created_at", { ascending: false }),
        supabase.from("gp_wallets").select("balance, pending_balance, currency").eq("gp_id", gpProfile.id).maybeSingle(),
        supabase.from("air_departures" as any).select("*")
          .eq("gp_id", gpProfile.id).eq("status", "active").order("departure_date", { ascending: true }),
        supabase.from("freight_requests").select("id", { count: "exact" }).in("status", ["open", "has_proposals"]).eq("freight_mode", "air"),
      ]);

      const orders = ordersRes.data || [];
      const pending = orders.filter(o => o.status === "pending");
      const active = orders.filter(o => ["accepted", "collected", "checked_in", "in_transit", "arrived_destination", "delivery_pending"].includes(o.status));
      const delivered = orders.filter(o => ["delivered", "released"].includes(o.status));

      setData({
        wallet: walletRes.data ? { balance: walletRes.data.balance, pending: walletRes.data.pending_balance, currency: walletRes.data.currency || "EUR" } : null,
        activeShipments: active.slice(0, 8),
        pendingShipments: pending.slice(0, 5),
        stats: { delivered: delivered.length, successRate: orders.length > 0 ? Math.round(delivered.length / orders.length * 100) : 0, total: orders.length },
        departures: (departuresRes.data as any[]) || [],
        freightRequests: freightRes.count || 0,
      });
    } catch (err) {
      console.error("Aérien dashboard load error:", err);
    } finally { setLoading(false); setRefreshing(false); }
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

  if (loading) return <TransportPageLoader message="Chargement aérien..." vehicle="truck" />;
  if (!gpProfile || !data) return null;

  const w = data.wallet;
  const currency = w?.currency || "EUR";
  const pendingCount = data.pendingShipments.length;

  return (
    <AerienDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={data.activeShipments.length}>
      <div className="px-3 py-3 space-y-3 pb-24">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">Aérien Cargo</h2>
            <p className="text-[10px] text-muted-foreground">Fret aérien, cargo & express</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadAll(true)} disabled={refreshing}>
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* URGENT ALERTS */}
        {pendingCount > 0 && (
          <motion.button initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/aerien/demandes")}
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

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-4 gap-1.5">
          <QuickAction icon={ScanLine} label="Scanner" primary onClick={() => setScanSheetOpen(true)} />
          <QuickAction icon={Package} label="Fret" badge={pendingCount} onClick={() => navigate("/aerien/demandes")} />
          <QuickAction icon={Plus} label="Publier" onClick={() => navigate("/aerien/publier")} />
          <QuickAction icon={History} label="Historique" onClick={() => navigate("/aerien/historique")} />
        </div>

        {/* AIR SERVICES */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold flex items-center gap-1.5"><Plane className="w-3.5 h-3.5 text-primary" /> Services aériens</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { title: "Cargo léger", desc: "Réservation au kg", path: "/aerien/publier" },
              { title: "Fret express", desc: "Livraison rapide", path: "/aerien/publier" },
              { title: "Confier fret", desc: "Gestion complète", path: "/aerien/demande-fret" },
              { title: "Marketplace", desc: `${data.freightRequests} demandes`, path: "/aerien/marketplace" },
            ].map(s => (
              <Card key={s.title} className="cursor-pointer active:scale-[0.98] transition-all border-primary/15 hover:border-primary/40" onClick={() => navigate(s.path)}>
                <CardContent className="p-2.5 flex items-center gap-2">
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
          <Card className="cursor-pointer active:scale-[0.98] transition-all" onClick={() => navigate("/aerien/wallet")}>
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

        {/* PUBLISHED DEPARTURES from air_departures */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-primary" />
              <h3 className="text-xs font-bold">Mes vols publiés</h3>
            </div>
            <Button variant="ghost" size="sm" className="text-[10px] h-6 gap-1 px-2" onClick={() => navigate("/aerien/publier")}>
              <Plus className="w-3 h-3" /> Publier
            </Button>
          </div>

          {data.departures.length === 0 ? (
            <Card className="border-dashed border-primary/30">
              <CardContent className="py-5 text-center">
                <Plane className="w-7 h-7 mx-auto mb-1.5 text-primary/30" />
                <p className="text-xs font-medium text-muted-foreground">Aucun vol publié</p>
                <Button variant="outline" size="sm" className="mt-2 h-7 text-[10px] border-primary/40 text-primary" onClick={() => navigate("/aerien/publier")}>
                  <Plus className="w-3 h-3 mr-1" /> Publier un départ
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {data.departures.map((dep: any) => {
                const fillPercent = dep.total_capacity_kg > 0
                  ? Math.round(((dep.total_capacity_kg - dep.available_capacity_kg) / dep.total_capacity_kg) * 100)
                  : 0;
                const tiers = dep.weight_tiers || [];
                const hasTiers = Array.isArray(tiers) && tiers.length > 0;
                const surchargesTotal = (dep.fuel_surcharge || 0) + (dep.security_surcharge || 0) + (dep.handling_fee || 0) + (dep.documentation_fee || 0);

                return (
                  <Card key={dep.id} className="cursor-pointer active:scale-[0.99] transition-all border-primary/20">
                    <CardContent className="p-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Plane className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold truncate">{dep.origin_city} → {dep.destination_city}</p>
                            {dep.airline && <Badge variant="secondary" className="text-[8px] h-3.5">{dep.airline}</Badge>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {dep.departure_date && format(new Date(dep.departure_date), "d MMM yyyy", { locale: fr })}
                            </span>
                            {dep.cargo_cutoff_date && (
                              <>
                                <span className="text-[9px] text-muted-foreground">·</span>
                                <span className="text-[9px] text-destructive/80">Cut-off {format(new Date(dep.cargo_cutoff_date), "d MMM", { locale: fr })}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {hasTiers ? (
                              <span className="text-[9px] font-medium text-primary">
                                {Math.min(...tiers.map((t: any) => t.price_per_kg))}–{Math.max(...tiers.map((t: any) => t.price_per_kg))} {dep.currency}/kg
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-primary">{dep.price_per_kg} {dep.currency}/kg</span>
                            )}
                            {surchargesTotal > 0 && (
                              <span className="text-[8px] text-muted-foreground">+ {surchargesTotal.toLocaleString()} frais</span>
                            )}
                            {dep.transit_time_days && (
                              <span className="text-[8px] text-muted-foreground">· {dep.transit_time_days}j</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-bold text-primary">{fillPercent}%</p>
                          <div className="w-14 h-1.5 bg-muted rounded-full mt-0.5 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", fillPercent >= 80 ? "bg-destructive" : fillPercent >= 50 ? "bg-warning" : "bg-primary")}
                              style={{ width: `${Math.max(5, fillPercent)}%` }}
                            />
                          </div>
                          <p className="text-[8px] text-muted-foreground mt-0.5">
                            <Weight className="w-2.5 h-2.5 inline" /> {Math.round(dep.available_capacity_kg)} kg
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* SMART CONSOLIDATION + AUTO ROUTES */}
        <AerienConsolidationCard gpId={gpProfile.id} onCreateDeparture={() => navigate("/aerien/publier")} />
        <AerienAutoRoutes gpId={gpProfile.id} onCreateDeparture={(origin, dest) => navigate("/aerien/publier")} />

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
                        <Plane className="w-3.5 h-3.5 text-destructive" />
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
              <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => navigate("/aerien/en-cours")}>
                Tout voir <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
            <div className="space-y-1">
              {data.activeShipments.slice(0, 4).map((c: any) => (
                <Card key={c.id} className="cursor-pointer active:scale-[0.99]">
                  <CardContent className="p-2 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Plane className="w-3 h-3 text-primary" />
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
              <Plane className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs font-medium">Aucune activité aérienne</p>
              <p className="text-[10px] mt-0.5">Publiez votre premier vol cargo</p>
              <Button variant="outline" size="sm" className="mt-2 h-7 text-[10px]" onClick={() => navigate("/aerien/publier")}>
                <Plus className="w-3 h-3 mr-1" /> Publier un départ
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <GPScanSheet open={scanSheetOpen} onOpenChange={setScanSheetOpen} gpId={gpProfile?.id} isVerified={gpProfile?.status === "verified"} />
    </AerienDashboardLayout>
  );
}

function QuickAction({ icon: Icon, label, primary, badge, onClick }: {
  icon: any; label: string; primary?: boolean; badge?: number; onClick: () => void;
}) {
  return (
    <motion.button whileTap={{ scale: 0.93 }} onClick={onClick}
      className={cn("flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all relative",
        primary ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 hover:bg-muted"
      )}>
      <Icon className={cn("w-4 h-4", primary ? "" : "text-foreground")} />
      <span className="text-[9px] font-semibold">{label}</span>
      {!!badge && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">{badge}</span>
      )}
    </motion.button>
  );
}
