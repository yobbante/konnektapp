import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, Scale, Clock, Check, X, Truck, 
  ChevronDown, AlertCircle, RefreshCw, MapPin, Car, TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { RoutierMissionsTab } from "@/components/routier/RoutierMissionsTab";
import { RoutierOpportunitesTab } from "@/components/routier/RoutierOpportunitesTab";
import { RoutierPricingDashboard } from "@/components/routier/RoutierPricingDashboard";
import { useToast } from "@/hooks/use-toast";
import { RefusalReasonDialog, RefusalReason } from "@/components/routier/RefusalReasonDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { estimateDistance, formatPriceFCFA, getSizeFromWeight } from "@/lib/routierUtils";

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
  if (desc.includes("benne") || desc.includes("sable")) return { type: "Benne" };
  if (desc.includes("frigo")) return { type: "Frigo" };
  if (desc.includes("citerne")) return { type: "Citerne" };
  if (weight > 3500) return { type: "Camion" };
  if (weight > 1000) return { type: "Fourgon" };
  return { type: "Fourgonnette" };
};

// Distance estimation now imported from routierUtils

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
      toast({ title: "Mission acceptée" });
      setExpandedId(null);
      loadData();
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
  };

  const handleRefuseConfirm = async (reason: RefusalReason, notes?: string) => {
    if (!refusingOrderId) return;
    try {
      const refusalReason = notes ? `${reason} — ${notes}` : reason;
      const { data, error } = await supabase.functions.invoke("cancel-order", {
        body: {
          order_id: refusingOrderId,
          actor_type: "gp",
          reason: `Mission refusée: ${refusalReason}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Demande refusée",
        description: data?.refunded_amount > 0
          ? "Annulation et remboursement effectués."
          : undefined,
      });
      setRefusalDialogOpen(false);
      setRefusingOrderId(null);
      setExpandedId(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de refuser la demande",
        variant: "destructive",
      });
    }
  };

  if (loading) return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  if (!gpProfile) return null;

  return (
    <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={requests.length} activeOrdersCount={activeCount}>
      <div className="px-3 py-2 space-y-2">
        {/* Compact Stats Row */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: "Attente", value: requests.length, color: requests.length > 0 ? "text-amber-600" : "text-muted-foreground", pulse: requests.length > 0 },
            { label: "En route", value: activeCount, color: "text-primary" },
            { label: "Livrées", value: completedCount, color: "text-emerald-600" },
            { label: "Flotte", value: vehicleCount, color: "text-muted-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center py-2 rounded-md bg-muted/50 relative border border-border/50">
              {stat.pulse && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />}
              <span className={cn("font-bold text-base leading-none", stat.color)}>{stat.value}</span>
              <span className="text-[9px] text-muted-foreground mt-0.5">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Vehicle CTA */}
        {vehicleCount === 0 && (
          <div className="flex items-center gap-2 p-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30">
            <Car className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-800 dark:text-amber-200 flex-1">Ajoutez un véhicule pour recevoir des missions</p>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => navigate("/routier/vehicules")}>Ajouter</Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="opportunites" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="opportunites" className="text-[11px] h-7 gap-1">
              <Truck className="w-3 h-3" /> Corridors
            </TabsTrigger>
            <TabsTrigger value="pricing" className="text-[11px] h-7 gap-1">
              <TrendingUp className="w-3 h-3" /> Prix
            </TabsTrigger>
            <TabsTrigger value="missions" className="text-[11px] h-7 gap-1">
              <Package className="w-3 h-3" /> Missions
            </TabsTrigger>
            <TabsTrigger value="classic" className="text-[11px] h-7 gap-1">
              <MapPin className="w-3 h-3" /> Direct
              {requests.length > 0 && <Badge variant="destructive" className="ml-0.5 h-3.5 min-w-3.5 px-1 text-[8px]">{requests.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="opportunites" className="mt-2">
            <RoutierOpportunitesTab gpId={gpProfile.id} />
          </TabsContent>

          <TabsContent value="pricing" className="mt-2">
            <RoutierPricingDashboard />
          </TabsContent>

          <TabsContent value="missions" className="mt-2">
            <RoutierMissionsTab gpId={gpProfile.id} />
          </TabsContent>

          <TabsContent value="classic" className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commandes directes</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => loadData(true)} disabled={refreshing}>
                <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
              </Button>
            </div>

            {requests.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucune commande en attente</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <AnimatePresence>
                  {requests.map((req) => {
                    const vehicle = getVehicleType(req.description, req.weight);
                    const distance = estimateDistance(req.origin_city, req.destination_city);
                    const sizeInfo = getSizeFromWeight(req.weight);
                    const isExpanded = expandedId === req.id;

                    return (
                      <motion.div key={req.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}>
                        <Card className={cn("overflow-hidden cursor-pointer transition-all", isExpanded && "ring-1 ring-primary shadow-md")}
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}>
                          <CardContent className="p-0">
                            <div className="p-2.5">
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="font-semibold truncate text-xs">{req.origin_city}</span>
                                  <span className="text-muted-foreground text-[10px]">→</span>
                                  <span className="font-semibold truncate text-xs">{req.destination_city}</span>
                                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[9px] h-4 px-1">{vehicle.type}</Badge>
                                  <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 font-bold", sizeInfo.color, sizeInfo.bg)}>{sizeInfo.label}</Badge>
                                  <span className="text-[10px] text-muted-foreground">~{distance} km</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-primary text-xs">{req.total_price.toLocaleString()} {req.currency}</span>
                                  <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                                </div>
                              </div>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="px-2.5 pb-2.5 pt-2 border-t bg-muted/30 space-y-2">
                                    <div className="flex items-center gap-4 text-xs">
                                      <div className="flex items-center gap-1">
                                        <Scale className="w-3 h-3 text-muted-foreground" />
                                        <span className="font-medium">{req.weight} kg</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-muted-foreground">{format(new Date(req.created_at), "d MMM HH:mm", { locale: fr })}</span>
                                      </div>
                                    </div>
                                    {/* Pricing breakdown */}
                                    <div className="p-1.5 bg-background rounded border border-border/50 text-[10px] space-y-0.5">
                                      <div className="flex justify-between text-muted-foreground">
                                        <span>Taille colis</span>
                                        <span>{sizeInfo.label} ({sizeInfo.description})</span>
                                      </div>
                                      <div className="flex justify-between text-muted-foreground">
                                        <span>Distance estimée</span>
                                        <span>~{distance} km</span>
                                      </div>
                                      <div className="flex justify-between font-bold text-foreground pt-0.5 border-t border-border/30">
                                        <span>Budget client</span>
                                        <span>{req.total_price.toLocaleString("fr-FR")} {req.currency}</span>
                                      </div>
                                    </div>
                                    {req.description && (
                                      <p className="text-[10px] text-muted-foreground p-1.5 bg-background rounded">{req.description}</p>
                                    )}
                                    <div className="flex gap-2">
                                      <Button variant="outline" size="sm" className="flex-1 h-7 text-[11px] border-destructive/30 text-destructive hover:bg-destructive/10"
                                        onClick={e => { e.stopPropagation(); setRefusingOrderId(req.id); setRefusalDialogOpen(true); }}>
                                        <X className="w-3 h-3 mr-1" /> Refuser
                                      </Button>
                                      <Button size="sm" className="flex-1 h-7 text-[11px]"
                                        onClick={e => { e.stopPropagation(); handleAccept(req.id); }}>
                                        <Check className="w-3 h-3 mr-1" /> Accepter
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
