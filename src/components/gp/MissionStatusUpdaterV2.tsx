import { useState, useEffect } from "react";
import { 
  Package, Truck, MapPin, CheckCircle, ChevronDown, AlertTriangle, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ORDER_STATUS_LABELS, 
  type OrderStatus,
  assertValidOrderStatus 
} from "@/lib/enumMappings";
import {
  hasLastMileLogistics,
  hasPickupLogistics,
  handleArrivedStatus,
  notifyAdminPickupMission,
  canGPMarkDelivered,
  isOrderAwaitingAdminDelivery,
} from "@/hooks/useLogisticsSync";

// Status icons mapping
const STATUS_ICONS: Record<string, any> = {
  collected: Package,
  in_transit: Truck,
  arrived: MapPin,
  delivered: CheckCircle,
};

interface MissionStatusUpdaterV2Props {
  orderId: string;
  currentStatus: string;
  gpProfileId: string;
  gpName: string;
  orderNumber: string;
  onStatusUpdated: () => void;
  compact?: boolean;
}

/**
 * MissionStatusUpdaterV2 - V1.1 with "ARRIVÉ" status and admin sync
 * 
 * Features:
 * - Detects if internal logistics is active
 * - Shows "Arrivé" button when destination has delivery logistics
 * - Blocks GP from marking "Livré" when admin handles last-mile
 * - Automatically triggers admin notifications
 */
export function MissionStatusUpdaterV2({
  orderId,
  currentStatus,
  gpProfileId,
  gpName,
  orderNumber,
  onStatusUpdated,
  compact = false,
}: MissionStatusUpdaterV2Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [hasDeliveryLogistics, setHasDeliveryLogistics] = useState(false);
  const [hasPickup, setHasPickup] = useState(false);
  const [awaitingAdminDelivery, setAwaitingAdminDelivery] = useState(false);

  // Check logistics options on mount and status change
  useEffect(() => {
    checkLogisticsState();
  }, [orderId, currentStatus]);

  const checkLogisticsState = async () => {
    const [delivery, pickup, awaiting] = await Promise.all([
      hasLastMileLogistics(orderId),
      hasPickupLogistics(orderId),
      isOrderAwaitingAdminDelivery(orderId),
    ]);
    setHasDeliveryLogistics(delivery);
    setHasPickup(pickup);
    setAwaitingAdminDelivery(awaiting);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    console.log("=== MissionStatusUpdaterV2 handleStatusUpdate ===");
    console.log("Order ID:", orderId);
    console.log("New Status:", newStatus);
    console.log("Has Delivery Logistics:", hasDeliveryLogistics);

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // SPECIAL CASE: "arrived" status (V1.1)
      if (newStatus === "arrived") {
        const result = await handleArrivedStatus(orderId, gpProfileId, user.id);
        if (!result.success) {
          throw new Error(result.error);
        }

        toast({
          title: "📍 Colis marqué ARRIVÉ",
          description: "L'équipe Yobbanté a été notifiée pour la livraison",
        });

        onStatusUpdated();
        return;
      }

      // Block delivery if admin handles last-mile
      if (newStatus === "delivered" && hasDeliveryLogistics) {
        const canDeliver = await canGPMarkDelivered(orderId);
        if (!canDeliver) {
          toast({
            title: "Action non autorisée",
            description: "La livraison est gérée par l'équipe Yobbanté",
            variant: "destructive",
          });
          return;
        }
      }

      // Validate enum for standard statuses
      const validatedStatus = assertValidOrderStatus(newStatus);

      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: validatedStatus,
          ...(validatedStatus === "delivered" ? { actual_delivery_date: new Date().toISOString() } : {}),
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Log status history
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: orderId,
          status: validatedStatus,
          changed_by: user.id,
          changed_by_type: "gp",
        });

      if (historyError) {
        console.error("History insert error:", historyError);
      }

      toast({
        title: "✅ Statut mis à jour",
        description: `Commande marquée comme "${ORDER_STATUS_LABELS[validatedStatus]}"`,
      });

      onStatusUpdated();
    } catch (error: any) {
      console.error("Status update error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine available actions based on current status and logistics
  const getAvailableActions = (): { status: string; label: string; icon: any; blocked?: boolean; blockReason?: string }[] => {
    const actions: { status: string; label: string; icon: any; blocked?: boolean; blockReason?: string }[] = [];

    // If awaiting admin delivery, no actions available
    if (awaitingAdminDelivery) {
      return [];
    }

    switch (currentStatus) {
      case "accepted":
        actions.push({ status: "collected", label: "Colis collecté", icon: Package });
        break;
      case "collected":
        actions.push({ status: "in_transit", label: "En transit", icon: Truck });
        break;
      case "in_transit":
        if (hasDeliveryLogistics) {
          // V1.1: GP marks "arrived", admin handles delivery
          actions.push({ 
            status: "arrived", 
            label: "Arrivé à destination", 
            icon: MapPin 
          });
        } else {
          // No logistics - direct delivery
          actions.push({ status: "delivered", label: "Livré", icon: CheckCircle });
        }
        break;
    }

    return actions;
  };

  const availableActions = getAvailableActions();
  const nextAction = availableActions[0];

  // Show waiting message if awaiting admin delivery
  if (awaitingAdminDelivery) {
    return (
      <Alert className="bg-amber-50 border-amber-200">
        <Clock className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-sm">
          <strong>En attente de livraison</strong>
          <br />
          L'équipe Yobbanté effectue la livraison dernier km.
        </AlertDescription>
      </Alert>
    );
  }

  // No actions available (delivered, cancelled, etc.)
  if (!nextAction || currentStatus === "delivered") {
    return null;
  }

  // Compact mode - single button for next action
  if (compact) {
    return (
      <div className="space-y-2">
        <Button 
          size="sm" 
          className="gap-1 w-full"
          onClick={() => handleStatusUpdate(nextAction.status)}
          disabled={loading || nextAction.blocked}
        >
          <nextAction.icon className="w-3 h-3" />
          {nextAction.label}
        </Button>
        
        {hasDeliveryLogistics && currentStatus === "in_transit" && (
          <p className="text-xs text-muted-foreground text-center">
            📍 Livraison dernier km par Yobbanté
          </p>
        )}
      </div>
    );
  }

  // Full mode - dropdown with all available actions
  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1 w-full" disabled={loading}>
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Changer statut
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {availableActions.map((action) => (
            <DropdownMenuItem
              key={action.status}
              onClick={() => !action.blocked && handleStatusUpdate(action.status)}
              className={`gap-2 ${action.blocked ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={action.blocked}
            >
              <action.icon className="w-4 h-4" />
              <div className="flex-1">
                <span>{action.label}</span>
                {action.blocked && action.blockReason && (
                  <p className="text-xs text-muted-foreground">{action.blockReason}</p>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Logistics indicator */}
      {hasDeliveryLogistics && (
        <Badge variant="outline" className="w-full justify-center text-xs gap-1 py-1">
          <Truck className="w-3 h-3" />
          Logistique interne active
        </Badge>
      )}
    </div>
  );
}
