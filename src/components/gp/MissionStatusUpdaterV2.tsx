import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, Truck, MapPin, CheckCircle, ChevronDown, AlertTriangle, Clock, Sparkles
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
import { cn } from "@/lib/utils";

// Status config with colors for gamification
const STATUS_CONFIG: Record<string, { 
  icon: React.ElementType; 
  bgColor: string; 
  textColor: string;
  borderColor: string;
  glowColor: string;
  label: string;
}> = {
  collected: { 
    icon: Package, 
    bgColor: "bg-blue-500", 
    textColor: "text-white",
    borderColor: "border-blue-400",
    glowColor: "shadow-blue-500/30",
    label: "Colis collecté"
  },
  in_transit: { 
    icon: Truck, 
    bgColor: "bg-amber-500", 
    textColor: "text-white",
    borderColor: "border-amber-400",
    glowColor: "shadow-amber-500/30",
    label: "En transit"
  },
  arrived: { 
    icon: MapPin, 
    bgColor: "bg-purple-500", 
    textColor: "text-white",
    borderColor: "border-purple-400",
    glowColor: "shadow-purple-500/30",
    label: "Arrivé"
  },
  delivered: { 
    icon: CheckCircle, 
    bgColor: "bg-green-500", 
    textColor: "text-white",
    borderColor: "border-green-400",
    glowColor: "shadow-green-500/30",
    label: "Livré"
  },
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
 * MissionStatusUpdaterV2 - V2.0 with gamification and visual feedback
 * 
 * Features:
 * - Color-coded status buttons for visual appeal
 * - Pulsing animation to encourage action
 * - Detects if internal logistics is active
 * - Shows "Arrivé" button when destination has delivery logistics
 * - Blocks GP from marking "Livré" when admin handles last-mile
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
  const [showSuccess, setShowSuccess] = useState(false);

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

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        
        toast({
          title: "📍 Colis marqué ARRIVÉ",
          description: "L'équipe Konnekt a été notifiée pour la livraison",
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
            description: "La livraison est gérée par l'équipe Konnekt",
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

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

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
  const getAvailableActions = (): { status: string; label: string; config: typeof STATUS_CONFIG[string]; blocked?: boolean; blockReason?: string }[] => {
    const actions: { status: string; label: string; config: typeof STATUS_CONFIG[string]; blocked?: boolean; blockReason?: string }[] = [];

    // If awaiting admin delivery, no actions available
    if (awaitingAdminDelivery) {
      return [];
    }

    switch (currentStatus) {
      case "accepted":
        actions.push({ status: "collected", label: "Colis collecté", config: STATUS_CONFIG.collected });
        break;
      case "collected":
        actions.push({ status: "in_transit", label: "En transit", config: STATUS_CONFIG.in_transit });
        break;
      case "in_transit":
        if (hasDeliveryLogistics) {
          // V1.1: GP marks "arrived", admin handles delivery
          actions.push({ 
            status: "arrived", 
            label: "Arrivé à destination", 
            config: STATUS_CONFIG.arrived 
          });
        } else {
          // No logistics - direct delivery
          actions.push({ status: "delivered", label: "Livré", config: STATUS_CONFIG.delivered });
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
          L'équipe Konnekt effectue la livraison dernier km.
        </AlertDescription>
      </Alert>
    );
  }

  // No actions available (delivered, cancelled, etc.)
  if (!nextAction || currentStatus === "delivered") {
    return null;
  }

  // Success overlay animation
  const SuccessOverlay = () => (
    <AnimatePresence>
      {showSuccess && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center bg-green-500/90 rounded-xl z-10"
        >
          <CheckCircle className="w-8 h-8 text-white" />
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Compact mode - single animated button
  if (compact) {
    const Icon = nextAction.config.icon;
    
    return (
      <div className="space-y-2 relative">
        <SuccessOverlay />
        <motion.div
          animate={{ 
            scale: [1, 1.02, 1],
            boxShadow: [
              `0 0 0 0 ${nextAction.config.glowColor}`,
              `0 0 20px 4px ${nextAction.config.glowColor}`,
              `0 0 0 0 ${nextAction.config.glowColor}`,
            ]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="rounded-xl"
        >
          <Button 
            size="sm" 
            className={cn(
              "gap-2 w-full font-semibold transition-all",
              nextAction.config.bgColor,
              nextAction.config.textColor,
              "hover:opacity-90 shadow-lg",
              nextAction.config.glowColor
            )}
            onClick={() => handleStatusUpdate(nextAction.status)}
            disabled={loading}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Icon className="w-4 h-4" />
                {nextAction.label}
                <Sparkles className="w-3 h-3 ml-1 opacity-70" />
              </>
            )}
          </Button>
        </motion.div>
        
        {hasDeliveryLogistics && currentStatus === "in_transit" && (
          <p className="text-xs text-muted-foreground text-center">
            📍 Livraison dernier km par Konnekt
          </p>
        )}
      </div>
    );
  }

  // Full mode - interactive dropdown with colored options
  return (
    <div className="space-y-2 relative">
      <SuccessOverlay />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.div
            animate={{ 
              scale: [1, 1.01, 1],
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Button 
              size="sm" 
              className={cn(
                "gap-2 w-full font-semibold shadow-lg transition-all",
                nextAction.config.bgColor,
                nextAction.config.textColor,
                "hover:opacity-90"
              )}
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Changer statut
                  <ChevronDown className="w-3 h-3 ml-1" />
                </>
              )}
            </Button>
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2">
          {availableActions.map((action) => {
            const Icon = action.config.icon;
            return (
              <DropdownMenuItem
                key={action.status}
                onClick={() => !action.blocked && handleStatusUpdate(action.status)}
                className={cn(
                  "gap-3 p-3 rounded-lg cursor-pointer transition-all mb-1",
                  action.blocked ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02]",
                  action.config.bgColor,
                  action.config.textColor
                )}
                disabled={action.blocked}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  "bg-white/20"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="font-medium">{action.label}</span>
                  {action.blocked && action.blockReason && (
                    <p className="text-xs opacity-70">{action.blockReason}</p>
                  )}
                </div>
                <Sparkles className="w-4 h-4 opacity-50" />
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Logistics indicator */}
      {hasDeliveryLogistics && (
        <Badge variant="outline" className="w-full justify-center text-xs gap-1 py-1 bg-purple-50 border-purple-200 text-purple-700">
          <Truck className="w-3 h-3" />
          Logistique interne active
        </Badge>
      )}
    </div>
  );
}
