import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, Scale, Clock, Check, X, Truck, 
  ChevronDown, AlertCircle, RefreshCw, Zap, MapPin, Car
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { RoutierMissionsTab } from "@/components/routier/RoutierMissionsTab";
import { useToast } from "@/hooks/use-toast";
import { RefusalReasonDialog, RefusalReason } from "@/components/routier/RefusalReasonDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FreightRequest {
  id: string;
  order_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  weight: number;
  description: string;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
}

const getVehicleType = (description: string, weight: number) => {
  const desc = description?.toLowerCase() || "";
  if (desc.includes("benne") || desc.includes("sable")) return { type: "Benne", icon: "🚛" };
  if (desc.includes("frigo")) return { type: "Frigo", icon: "❄️" };
  if (desc.includes("citerne")) return { type: "Citerne", icon: "🛢️" };
  if (weight > 3500) return { type: "Camion", icon: "🚚" };
  if (weight > 1000) return { type: "Fourgon", icon: "🚐" };
  return { type: "Fourgonnette", icon: "🚙" };
};

const estimateDistance = (origin: string, dest: string): number => {
  const key = `${origin.toLowerCase()}-${dest.toLowerCase()}`;
  const distances: Record<string, number> = {
    "dakar-abidjan": 2450, "dakar-bamako": 1250, "abidjan-bamako": 1100, "dakar-conakry": 950,
  };
  return distances[key] || Math.floor(Math.random() * 400) + 80;
};

export default function RoutierDemandesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [requests, setRequests] = useState<FreightRequest[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refusalDialogOpen, setRefusalDialogOpen] = useState(false);
  const [refusingOrderId, setRefusingOrderId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: gp } = await supabase
        .from("gp_profiles").select("*").eq("user_id", user.id).eq("gp_type", "routier").maybeSingle();

      if (!gp) { navigate("/routier/inscription"); return; }
      setGpProfile(gp);

      const { data: allOrders } = await supabase.from("orders").select("status").eq("gp_id", gp.id);
      const active = allOrders?.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)) || [];
      const completed = allOrders?.filter(o => o.status === "delivered") || [];

      const { count: vCount } = await supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("gp_id", gp.id);

      const { data: orders } = await supabase
        .from("orders").select("*").eq("gp_id", gp.id).eq("status", "pending").order("created_at", { ascending: false });

      setRequests(orders || []);
      setActiveCount(active.length);
      setCompletedCount(completed.length);
      setVehicleCount(vCount || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      const { error } = await supabase.from("orders").update({ status: "accepted" as const }).eq("id", orderId);
      if (error) throw error;
      toast({ title: "✅ Mission acceptée" });
      setExpandedId(null);
      loadData();
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
  };

  const handleRefuseConfirm = async (reason: RefusalReason, notes?: string) => {
    if (!refusingOrderId) return;
    try {
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", refusingOrderId);
      toast({ title: "Demande refusée" });
      setRefusalDialogOpen(false);
      setRefusingOrderId(null);
      setExpandedId(null);
      loadData();
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
  };

  if (loading) return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  if (!gpProfile) return null;

  return (
    <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={requests.length} activeOrdersCount={activeCount}>
      <div className="p-4 space-y-4">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "En attente", value: requests.length, color: requests.length > 0 ? "text-amber-600" : "text-muted-foreground", bg: requests.length > 0 ? "bg-amber-500/10" : "bg-muted", pulse: requests.length > 0 },
            { label: "En route", value: activeCount, color: "text-blue-600", bg: "bg-blue-500/10" },
            { label: "Livrées", value: completedCount, color: "text-green-600", bg: "bg-green-500/10" },
            { label: "Flotte", value: vehicleCount, color: "text-purple-600", bg: "bg-purple-500/10" },
          ].map((stat) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className={cn("flex flex-col items-center p-3 rounded-xl relative", stat.bg)}>
              {stat.pulse && <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
              <span className={cn("font-bold text-lg", stat.color)}>{stat.value}</span>
              <span className="text-[10px] text-muted-foreground text-center">{stat.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        {vehicleCount === 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Car className="w-8 h-8 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Ajoutez un véhicule</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">Sans véhicule, vous ne recevrez pas de missions.</p>
              </div>
              <Button size="sm" onClick={() => navigate("/routier/vehicules")}>Ajouter</Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs: Missions Marketplace + Classic Orders */}
        <Tabs defaultValue="missions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="missions" className="gap-1">🚛 Missions</TabsTrigger>
            <TabsTrigger value="classic" className="gap-1">
              📦 Commandes
              {requests.length > 0 && <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px]">{requests.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="missions" className="mt-4">
            <RoutierMissionsTab gpId={gpProfile.id} />
          </TabsContent>

          <TabsContent value="classic" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Commandes directes</h3>
              <Button variant="ghost" size="icon" onClick={() => loadData(true)} disabled={refreshing}>
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              </Button>
            </div>

            {requests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Zap className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucune commande en attente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {requests.map((req) => {
                    const vehicle = getVehicleType(req.description, req.weight);
                    const distance = estimateDistance(req.origin_city, req.destination_city);
                    const isExpanded = expandedId === req.id;

                    return (
                      <motion.div key={req.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}>
                        <Card className={cn("overflow-hidden cursor-pointer transition-all", isExpanded && "ring-2 ring-blue-500 shadow-lg")}
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}>
                          <CardContent className="p-0">
                            <div className="p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="flex items-center gap-2 flex-1">
                                  <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-200" />
                                  <span className="font-semibold truncate text-sm">{req.origin_city}</span>
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                  <div className="h-0.5 w-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full" />
                                </div>
                                <div className="flex items-center gap-2 flex-1 justify-end">
                                  <span className="font-semibold truncate text-sm">{req.destination_city}</span>
                                  <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200" />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="gap-1 text-xs">{vehicle.icon} {vehicle.type}</Badge>
                                  <span className="text-xs text-muted-foreground">~{distance} km</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-blue-600 text-sm">{req.total_price.toLocaleString()} {req.currency}</span>
                                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                                </div>
                              </div>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="px-4 pb-4 pt-2 border-t bg-muted/30 space-y-3">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div className="flex items-center gap-2">
                                        <Scale className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Poids:</span>
                                        <span className="font-medium">{req.weight} kg</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium text-xs">{format(new Date(req.created_at), "d MMM HH:mm", { locale: fr })}</span>
                                      </div>
                                    </div>
                                    {req.description && (
                                      <p className="text-xs text-muted-foreground p-2 bg-background rounded-lg">{req.description}</p>
                                    )}
                                    <div className="flex gap-3">
                                      <Button variant="outline" className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                                        onClick={e => { e.stopPropagation(); setRefusingOrderId(req.id); setRefusalDialogOpen(true); }}>
                                        <X className="w-4 h-4 mr-1" /> Refuser
                                      </Button>
                                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700"
                                        onClick={e => { e.stopPropagation(); handleAccept(req.id); }}>
                                        <Check className="w-4 h-4 mr-1" /> Accepter
                                      </Button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <RefusalReasonDialog open={refusalDialogOpen} onOpenChange={setRefusalDialogOpen} onConfirm={handleRefuseConfirm} orderId={refusingOrderId || ""} />
    </RoutierDashboardLayout>
  );
}
