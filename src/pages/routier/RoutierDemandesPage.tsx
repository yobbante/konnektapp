import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, Scale, Clock, Check, X, Truck, 
  ChevronDown, AlertCircle, RefreshCw, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { RoutierQuickStats } from "@/components/routier/dashboard/RoutierQuickStats";
import { useToast } from "@/hooks/use-toast";
import { RefusalReasonDialog, RefusalReason } from "@/components/routier/RefusalReasonDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

/**
 * RoutierDemandesPage V2 - Dashboard transporteur routier optimisé
 * 
 * Différences avec GP:
 * - Pas de tarification (prix auto système)
 * - Focus missions et flotte
 * - Estimation distance/véhicule
 */

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
  pickup_date?: string;
}

// Vehicle type inference
const getVehicleType = (description: string, weight: number): { type: string; icon: string } => {
  const desc = description?.toLowerCase() || "";
  if (desc.includes("benne") || desc.includes("sable") || desc.includes("ciment")) {
    return { type: "Camion benne", icon: "🚛" };
  }
  if (desc.includes("frigo") || desc.includes("alimentaire")) {
    return { type: "Frigorifique", icon: "❄️" };
  }
  if (desc.includes("liquide") || desc.includes("citerne")) {
    return { type: "Citerne", icon: "🛢️" };
  }
  if (desc.includes("btp") || desc.includes("machine")) {
    return { type: "Plateau-grue", icon: "🏗️" };
  }
  if (weight > 3500) return { type: "Camion", icon: "🚚" };
  if (weight > 1000) return { type: "Fourgon", icon: "🚐" };
  return { type: "Fourgonnette", icon: "🚙" };
};

// Estimate distance (simulation)
const estimateDistance = (origin: string, dest: string): number => {
  const distances: Record<string, number> = {
    "dakar-abidjan": 2450,
    "dakar-bamako": 1250,
    "abidjan-bamako": 1100,
    "dakar-conakry": 950,
    "default": Math.floor(Math.random() * 500) + 100,
  };
  const key = `${origin.toLowerCase()}-${dest.toLowerCase()}`;
  return distances[key] || distances["default"];
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: gp, error: gpError } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("gp_type", "routier")
        .maybeSingle();

      if (gpError || !gp) {
        navigate("/routier/inscription");
        return;
      }

      setGpProfile(gp);

      // Load all orders for stats
      const { data: allOrders } = await supabase
        .from("orders")
        .select("status")
        .eq("gp_id", gp.id);

      const pending = allOrders?.filter(o => o.status === "pending") || [];
      const active = allOrders?.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)) || [];
      const completed = allOrders?.filter(o => o.status === "delivered") || [];

      // Load vehicles count
      const { count: vCount } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .eq("gp_id", gp.id);

      // Load pending orders with full details
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("gp_id", gp.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!ordersError && orders) {
        setRequests(orders);
      }
      
      setActiveCount(active.length);
      setCompletedCount(completed.length);
      setVehicleCount(vCount || 0);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "accepted" as const })
        .eq("id", orderId);

      if (error) throw error;

      toast({ 
        title: "✅ Mission acceptée", 
        description: "Le client a été notifié. Rendez-vous dans 'En cours'." 
      });
      setExpandedId(null);
      loadData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleRefuseClick = (orderId: string) => {
    setRefusingOrderId(orderId);
    setRefusalDialogOpen(true);
  };

  const handleRefuseConfirm = async (reason: RefusalReason, notes?: string) => {
    if (!refusingOrderId) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", refusingOrderId);

      if (error) throw error;

      console.log("[Routier V2] Refusal logged:", {
        orderId: refusingOrderId,
        reason,
        notes,
        timestamp: new Date().toISOString(),
      });

      toast({ 
        title: "Demande refusée", 
        description: "Merci pour votre retour." 
      });
      
      setRefusalDialogOpen(false);
      setRefusingOrderId(null);
      setExpandedId(null);
      loadData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (loading) {
    return <TransportPageLoader message="Chargement des missions..." vehicle="truck" />;
  }

  if (!gpProfile) return null;

  return (
    <RoutierDashboardLayout
      gpProfile={gpProfile}
      pendingCount={requests.length}
      activeOrdersCount={activeCount}
    >
      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <RoutierQuickStats
          missionsEnAttente={requests.length}
          missionsEnCours={activeCount}
          livraisonsTerminees={completedCount}
          vehiculesActifs={vehicleCount}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Missions disponibles</h2>
            <p className="text-xs text-muted-foreground">
              Premier arrivé, premier servi
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* Mission Cards */}
        {requests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Zap className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Aucune mission disponible</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
                Les missions compatibles avec vos véhicules et zones apparaîtront ici automatiquement.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/routier/vehicules")}
              >
                Gérer ma flotte
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {requests.map((request) => {
                const vehicle = getVehicleType(request.description, request.weight);
                const distance = estimateDistance(request.origin_city, request.destination_city);
                const isExpanded = expandedId === request.id;

                return (
                  <motion.div
                    key={request.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card 
                      className={cn(
                        "overflow-hidden cursor-pointer transition-all",
                        isExpanded && "ring-2 ring-blue-500 shadow-lg"
                      )}
                      onClick={() => setExpandedId(isExpanded ? null : request.id)}
                    >
                      <CardContent className="p-0">
                        {/* Main Row - Always Visible */}
                        <div className="p-4">
                          {/* Route Line */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-200" />
                              <span className="font-semibold truncate">{request.origin_city}</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                              <div className="h-0.5 w-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full" />
                            </div>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <span className="font-semibold truncate">{request.destination_city}</span>
                              <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200" />
                            </div>
                          </div>

                          {/* Quick Info Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="gap-1">
                                <span>{vehicle.icon}</span>
                                {vehicle.type}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                ~{distance} km
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-600">
                                {request.total_price.toLocaleString()} {request.currency}
                              </span>
                              <ChevronDown 
                                className={cn(
                                  "w-5 h-5 text-muted-foreground transition-transform",
                                  isExpanded && "rotate-180"
                                )} 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-2 border-t bg-muted/30 space-y-4">
                                {/* Detail Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Scale className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Poids:</span>
                                    <span className="font-medium">{request.weight} kg</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Reçu:</span>
                                    <span className="font-medium">
                                      {format(new Date(request.created_at), "d MMM HH:mm", { locale: fr })}
                                    </span>
                                  </div>
                                </div>

                                {/* Description */}
                                {request.description && (
                                  <div className="p-3 bg-background rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                      {request.description}
                                    </p>
                                  </div>
                                )}

                                {/* Price Estimate Notice */}
                                <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-200">
                                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                  <p className="text-xs text-amber-700">
                                    Prix et distance estimés. Les conditions réelles peuvent varier.
                                  </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                  <Button
                                    variant="outline"
                                    className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRefuseClick(request.id);
                                    }}
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Refuser
                                  </Button>
                                  <Button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAccept(request.id);
                                    }}
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    Accepter
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
      </div>

      {/* Refusal Dialog */}
      <RefusalReasonDialog
        open={refusalDialogOpen}
        onOpenChange={setRefusalDialogOpen}
        onConfirm={handleRefuseConfirm}
        orderId={refusingOrderId || ""}
      />
    </RoutierDashboardLayout>
  );
}
