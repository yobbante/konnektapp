import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Package, MapPin, Calendar, User, Phone, 
  MessageCircle, Weight, Truck, ArrowRight, 
  Check, X, Navigation, AlertTriangle, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { RefusalReasonDialog } from "@/components/routier/RefusalReasonDialog";

interface MissionDetails {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  origin_country: string;
  destination_country: string;
  weight: number;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
  pickup_date: string | null;
  client_id: string;
  description: string | null;
}

interface ClientProfile {
  full_name: string | null;
  phone: string | null;
}

interface RoutierMissionDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  onAccept?: () => void;
  onRefuse?: () => void;
  showActions?: boolean;
}

/**
 * RoutierMissionDetailsSheet - Mission details for road transport
 * 
 * Features:
 * - Estimated distance & price
 * - Vehicle type inference
 * - Accept with disclaimer
 * - Refuse with reason
 */
export function RoutierMissionDetailsSheet({ 
  open, 
  onClose, 
  orderId,
  onAccept,
  onRefuse,
  showActions = true
}: RoutierMissionDetailsSheetProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mission, setMission] = useState<MissionDetails | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [actionLoading, setActionLoading] = useState<"accept" | "refuse" | null>(null);
  const [showRefusalDialog, setShowRefusalDialog] = useState(false);

  // Estimated values (would be calculated by system)
  const estimatedDistance = Math.floor(Math.random() * 200) + 50;
  const estimatedDuration = Math.ceil(estimatedDistance / 50);

  useEffect(() => {
    if (open && orderId) {
      loadMissionDetails();
    }
  }, [open, orderId]);

  const loadMissionDetails = async () => {
    setLoading(true);
    try {
      const { data: orderData, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error) throw error;
      setMission(orderData);

      if (orderData?.client_id) {
        const { data: clientData } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", orderData.client_id)
          .single();

        if (clientData) {
          setClient(clientData);
        }
      }
    } catch (error) {
      console.error("Error loading mission:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!mission) return;
    setActionLoading("accept");
    
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "accepted" })
        .eq("id", mission.id);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("order_status_history").insert({
          order_id: mission.id,
          status: "accepted",
          changed_by: user.id,
          changed_by_type: "gp",
          notes: "Mission acceptée par le transporteur routier",
        });

        await supabase.from("notifications").insert({
          user_id: mission.client_id,
          type: "order_update",
          title: "✅ Mission acceptée",
          message: `Un transporteur a accepté votre demande ${mission.order_number}`,
          related_type: "order",
          related_id: mission.id,
        });
      }

      toast({
        title: "✅ Mission acceptée",
        description: "Le client a été notifié",
      });

      onAccept?.();
      onClose();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefuseWithReason = async (reason: string) => {
    if (!mission) return;
    setActionLoading("refuse");
    
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", mission.id);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("order_status_history").insert({
          order_id: mission.id,
          status: "cancelled",
          changed_by: user.id,
          changed_by_type: "gp",
          notes: `Mission refusée: ${reason}`,
        });
      }

      toast({ title: "Mission refusée" });
      setShowRefusalDialog(false);
      onRefuse?.();
      onClose();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const isPending = mission?.status === "pending";

  // Infer vehicle type from description
  const inferVehicleType = (desc: string | null): string => {
    if (!desc) return "Camion standard";
    const lower = desc.toLowerCase();
    if (lower.includes("ciment") || lower.includes("sable") || lower.includes("gravier")) {
      return "Camion benne";
    }
    if (lower.includes("meuble") || lower.includes("déménagement")) {
      return "Fourgon";
    }
    if (lower.includes("container") || lower.includes("20 pieds")) {
      return "Semi-remorque";
    }
    return "Camion standard";
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                Détails de la mission
              </span>
              {mission && (
                <Badge variant={isPending ? "warning" : "secondary"}>
                  {isPending ? "Nouvelle" : mission.status}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : mission ? (
            <div className="space-y-4 py-4">
              {/* Route Card */}
              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="font-bold">{mission.origin_city}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <ArrowRight className="w-5 h-5 text-blue-500" />
                      <span className="text-[10px] text-muted-foreground mt-1">
                        ~{estimatedDistance} km
                      </span>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="font-bold">{mission.destination_city}</span>
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estimates */}
              <div className="grid grid-cols-3 gap-2">
                <Card>
                  <CardContent className="p-3 text-center">
                    <Navigation className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="font-bold text-sm">~{estimatedDistance} km</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Durée</p>
                    <p className="font-bold text-sm">~{estimatedDuration}h</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <Truck className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Véhicule</p>
                    <p className="font-bold text-xs">{inferVehicleType(mission.description)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Client */}
              {client && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{client.full_name || "Client"}</p>
                          {client.phone && (
                            <p className="text-xs text-muted-foreground">{client.phone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Freight Details */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Marchandise
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Poids</p>
                      <p className="font-bold text-lg">{mission.weight} kg</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Prix estimé</p>
                      <p className="font-bold text-lg text-blue-600">
                        {mission.total_price.toLocaleString()} {getCurrencySymbol(mission.currency)}
                      </p>
                    </div>
                  </div>

                  {mission.description && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{mission.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Disclaimer */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-medium">Prix et distance estimés</p>
                    <p className="mt-1">
                      Les valeurs affichées sont des estimations. Le prix final sera ajusté 
                      selon les conditions réelles du trajet.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions for Pending */}
              {showActions && isPending && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 pt-4 border-t"
                >
                  <Button
                    variant="outline"
                    className="flex-1 h-12 border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => setShowRefusalDialog(true)}
                    disabled={actionLoading !== null}
                  >
                    <X className="w-5 h-5 mr-2" />
                    Refuser
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
                    onClick={handleAccept}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === "accept" ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Accepter
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Mission non trouvée
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Refusal Reason Dialog */}
      <RefusalReasonDialog
        open={showRefusalDialog}
        onOpenChange={setShowRefusalDialog}
        onConfirm={async (reason, notes) => {
          await handleRefuseWithReason(`${reason}${notes ? `: ${notes}` : ''}`);
        }}
        orderId={orderId}
      />
    </>
  );
}
