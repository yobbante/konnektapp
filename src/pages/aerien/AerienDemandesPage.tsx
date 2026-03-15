/**
 * AerienDemandesPage — Full air cargo mission hub for transporters
 * Tabs: Demandes (orders) | Missions (marketplace) | Consolidation | Routes
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Package, RefreshCw, Bell, ChevronRight, Users, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AerienDashboardLayout } from "@/components/layout/AerienDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { AerienMissionsTab } from "@/components/air/AerienMissionsTab";
import { AerienConsolidationCard } from "@/components/air/AerienConsolidationCard";
import { AerienAutoRoutes } from "@/components/air/AerienAutoRoutes";
import { useToast } from "@/hooks/use-toast";
import { getOrderStatusLabel, getOrderStatusColor } from "@/lib/transportTypes";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function AerienDemandesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: gp } = await supabase
        .from("gp_profiles").select("*").eq("user_id", user.id)
        .in("gp_type", ["aerien", "agence"]).maybeSingle();
      if (!gp) { navigate("/transporteur/inscription"); return; }
      setGpProfile(gp);

      const { data: ordersData } = await supabase
        .from("orders").select("*").eq("gp_id", gp.id)
        .not("status", "eq", "cancelled")
        .order("created_at", { ascending: false }).limit(50);

      setOrders(ordersData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    try {
      const { error } = await supabase.from("orders").update({ status: newStatus as any }).eq("id", orderId);
      if (error) throw error;
      toast({ title: "Statut mis à jour ✓" });
      loadData(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setUpdatingOrder(null); }
  };

  if (loading) return <TransportPageLoader message="Chargement cargo aérien..." vehicle="truck" />;
  if (!gpProfile) return null;

  const pendingOrders = orders.filter(o => o.status === "pending");
  const activeOrders = orders.filter(o => ["accepted", "collected", "checked_in", "in_transit", "arrived_destination", "delivery_pending"].includes(o.status));

  return (
    <AerienDashboardLayout gpProfile={gpProfile} pendingCount={pendingOrders.length} activeOrdersCount={activeOrders.length}>
      <div className="px-3 py-3 space-y-3 pb-24">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <Plane className="w-4 h-4 text-primary" /> Expéditions cargo
          </h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="orders" className="text-[10px] data-[state=active]:text-primary">
              Demandes {pendingOrders.length > 0 && <Badge variant="destructive" className="ml-1 text-[8px] h-3.5 px-1">{pendingOrders.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="missions" className="text-[10px] data-[state=active]:text-primary">Missions</TabsTrigger>
            <TabsTrigger value="consolidation" className="text-[10px] data-[state=active]:text-primary">Groupage</TabsTrigger>
            <TabsTrigger value="routes" className="text-[10px] data-[state=active]:text-primary">Routes</TabsTrigger>
          </TabsList>

          {/* ORDERS TAB */}
          <TabsContent value="orders" className="mt-3 space-y-2">
            {pendingOrders.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-destructive flex items-center gap-1">
                  <Bell className="w-3 h-3" /> Action requise ({pendingOrders.length})
                </h3>
                {pendingOrders.map(o => (
                  <Card key={o.id} className="border-destructive/20 bg-destructive/5">
                    <CardContent className="p-2.5 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                        <Plane className="w-3.5 h-3.5 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{o.origin_city} → {o.destination_city}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {o.weight} kg · {formatDistanceToNow(new Date(o.created_at), { locale: fr, addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5 border-destructive/40 text-destructive"
                          onClick={() => handleStatusUpdate(o.id, "cancelled")} disabled={updatingOrder === o.id}>✕</Button>
                        <Button size="sm" className="h-6 text-[10px] px-2"
                          onClick={() => handleStatusUpdate(o.id, "accepted")} disabled={updatingOrder === o.id}>
                          {updatingOrder === o.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : "✓"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeOrders.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold">En cours ({activeOrders.length})</h3>
                {activeOrders.slice(0, 6).map(o => (
                  <Card key={o.id}>
                    <CardContent className="p-2.5 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Plane className="w-3 h-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold truncate">{o.origin_city} → {o.destination_city}</p>
                        <span className="text-[9px] text-muted-foreground">{o.weight}kg · #{o.order_number?.slice(-6)}</span>
                      </div>
                      <Badge className={cn("text-[8px] h-3.5 shrink-0", getOrderStatusColor(o.status))}>
                        {getOrderStatusLabel(o.status)}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {pendingOrders.length === 0 && activeOrders.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Plane className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Aucune expédition en cours</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* MISSIONS MARKETPLACE TAB */}
          <TabsContent value="missions" className="mt-3">
            <AerienMissionsTab gpId={gpProfile.id} />
          </TabsContent>

          {/* CONSOLIDATION TAB */}
          <TabsContent value="consolidation" className="mt-3 space-y-3">
            <div className="bg-muted/50 rounded-xl p-3 border border-border">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold">Smart Consolidation Cargo</h3>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Regroupez automatiquement les demandes clients sur un même corridor pour optimiser vos expéditions.
              </p>
            </div>
            <AerienConsolidationCard gpId={gpProfile.id} onCreateDeparture={() => navigate("/aerien/publier")} />
          </TabsContent>

          {/* AUTO ROUTES TAB */}
          <TabsContent value="routes" className="mt-3 space-y-3">
            <div className="bg-muted/50 rounded-xl p-3 border border-border">
              <div className="flex items-center gap-2 mb-1.5">
                <Plane className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold">Routes suggérées</h3>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Corridors aériens à forte demande que vous ne couvrez pas encore.
              </p>
            </div>
            <AerienAutoRoutes gpId={gpProfile.id} onCreateDeparture={(origin, dest) => navigate("/aerien/publier")} />
          </TabsContent>
        </Tabs>
      </div>
    </AerienDashboardLayout>
  );
}