import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, MapPin, Scale, Clock, Check, X, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { useToast } from "@/hooks/use-toast";
import { RefusalReasonDialog, RefusalReason } from "@/components/routier/RefusalReasonDialog";

/**
 * RoutierDemandesPage - Dashboard transporteur V1.1
 * 
 * Améliorations V1.1:
 * - Carte simplifiée (minimum d'infos, détail au clic)
 * - Motifs de refus structurés obligatoires
 * - Données de refus pour ajustement pricing
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
}

// Simulated vehicle type based on freight (same logic as client side)
const getVehicleType = (description: string, weight: number): string => {
  const desc = description?.toLowerCase() || "";
  if (desc.includes("benne") || desc.includes("sable") || desc.includes("ciment")) return "Camion benne";
  if (desc.includes("frigo") || desc.includes("alimentaire")) return "Camion frigorifique";
  if (desc.includes("liquide") || desc.includes("citerne")) return "Camion citerne";
  if (desc.includes("btp") || desc.includes("machine")) return "Plateau-grue";
  if (weight > 3500) return "Camion moyen";
  if (weight > 1000) return "Fourgon";
  return "Fourgonnette";
};

export default function RoutierDemandesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [requests, setRequests] = useState<FreightRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<FreightRequest | null>(null);
  const [refusalDialogOpen, setRefusalDialogOpen] = useState(false);
  const [refusingOrderId, setRefusingOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load GP profile
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

      // Load pending orders for this transporter
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("gp_id", gp.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!ordersError && orders) {
        setRequests(orders);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "accepted" as const })
        .eq("id", orderId);

      if (error) throw error;

      toast({ title: "Transport accepté ✓", description: "Le client a été notifié." });
      setSelectedRequest(null);
      loadData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  // V1.1: Open refusal dialog instead of direct refusal
  const handleRefuseClick = (orderId: string) => {
    setRefusingOrderId(orderId);
    setRefusalDialogOpen(true);
  };

  // V1.1: Process refusal with structured reason
  const handleRefuseConfirm = async (reason: RefusalReason, notes?: string) => {
    if (!refusingOrderId) return;

    try {
      // Update order status
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", refusingOrderId);

      if (error) throw error;

      // V1.1: Log refusal reason for pricing adjustment (in real app, store in dedicated table)
      console.log("[Routier V1.1] Refusal logged:", {
        orderId: refusingOrderId,
        reason,
        notes,
        timestamp: new Date().toISOString(),
      });

      toast({ 
        title: "Demande refusée", 
        description: "Merci pour votre retour, ces données aident à améliorer le système." 
      });
      
      setRefusalDialogOpen(false);
      setRefusingOrderId(null);
      setSelectedRequest(null);
      loadData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (loading) {
    return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  }

  if (!gpProfile) {
    return null;
  }

  const pendingCount = requests.length;

  return (
    <RoutierDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={0}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Missions disponibles</h2>
          <Badge variant="secondary">{pendingCount} en attente</Badge>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Aucune mission disponible</p>
              <p className="text-xs text-muted-foreground">
                Les missions compatibles avec vos véhicules apparaîtront ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const vehicleType = getVehicleType(request.description, request.weight);
              const isExpanded = selectedRequest?.id === request.id;

              return (
                <Card 
                  key={request.id} 
                  className={`overflow-hidden transition-all cursor-pointer ${isExpanded ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedRequest(isExpanded ? null : request)}
                >
                  <CardContent className="p-4">
                    {/* V1.1: Simplified card - Route only */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{request.origin_city}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{request.destination_city}</span>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0">
                        <Truck className="w-3 h-3 mr-1" />
                        {vehicleType.split(" ")[0]}
                      </Badge>
                    </div>

                    {/* V1.1: Expanded details on click */}
                    {isExpanded && (
                      <div className="pt-3 border-t space-y-3 animate-in slide-in-from-top-2">
                        {/* Details grid */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Scale className="w-3 h-3 text-muted-foreground" />
                            <span>{request.weight} kg</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span>{new Date(request.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                          <div className="font-semibold text-primary text-right">
                            {request.total_price.toLocaleString()} {request.currency}
                          </div>
                        </div>

                        {/* Vehicle type */}
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{vehicleType}</span>
                        </div>

                        {/* Description */}
                        {request.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {request.description}
                          </p>
                        )}

                        {/* V1.1: Actions with structured refusal */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-destructive border-destructive/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRefuseClick(request.id);
                            }}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAccept(request.id);
                            }}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accepter
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Collapsed hint */}
                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground text-center">
                        Appuyez pour voir les détails
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* V1.1: Refusal reason dialog */}
      <RefusalReasonDialog
        open={refusalDialogOpen}
        onOpenChange={setRefusalDialogOpen}
        onConfirm={handleRefuseConfirm}
        orderId={refusingOrderId || ""}
      />
    </RoutierDashboardLayout>
  );
}
