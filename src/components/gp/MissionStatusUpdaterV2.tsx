import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, Truck, MapPin, CheckCircle, ChevronDown, AlertTriangle, Clock, Sparkles, ShieldAlert
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
import { useToast } from "@/hooks/use-toast";
import { ORDER_STATUS_LABELS } from "@/lib/enumMappings";
import {
  hasLastMileLogistics,
  hasPickupLogistics,
  isOrderAwaitingAdminDelivery,
} from "@/hooks/useLogisticsSync";
import { KonnektScanEngine, type ExecuteAction } from "@/lib/scanEngine";
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
 * Now uses KonnektScanEngine.executeAction() for ALL status transitions.
 * No direct DB calls — everything goes through the backend engine.
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

  /**
   * Map UI status selection to engine action
   */
  const getEngineAction = (newStatus: string): ExecuteAction | null => {
    switch (newStatus) {
      case "collected": return "deposit_confirm";
      case "in_transit": return "mark_transit";
      case "arrived": return "confirm_delivery"; // arrived = GP signals arrival
      case "delivered": return "confirm_delivery";
      default: return null;
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    console.log("=== MissionStatusUpdaterV2 handleStatusUpdate (ENGINE) ===");
    console.log("Order ID:", orderId);
    console.log("Current:", currentStatus, "→ New:", newStatus);

    const engineAction = getEngineAction(newStatus);
    if (!engineAction) {
      toast({ title: "Action non reconnue", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const response = await KonnektScanEngine.executeAction(engineAction, orderId, {
        target_status: newStatus,
        has_last_mile_logistics: hasDeliveryLogistics,
      });

      if (response.status === "executed") {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        toast({ title: response.message?.replace(/[✅⚠️📦🚚📍]/g, '').trim() || "Statut mis a jour" });
        onStatusUpdated();
      } else {
        toast({
          title: "⚠️ Action refusée",
          description: response.message || response.error,
          variant: "destructive",
        });
      }
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

    if (awaitingAdminDelivery) return [];

    switch (currentStatus) {
      case "accepted":
        actions.push({ status: "collected", label: "Colis collecté", config: STATUS_CONFIG.collected });
        break;
      case "collected":
        actions.push({ status: "in_transit", label: "En transit", config: STATUS_CONFIG.in_transit });
        break;
      case "in_transit":
        if (hasDeliveryLogistics) {
          actions.push({ 
            status: "arrived", 
            label: "Arrivé à destination", 
            config: STATUS_CONFIG.arrived 
          });
        } else {
          actions.push({ status: "delivered", label: "Livré", config: STATUS_CONFIG.delivered });
        }
        break;
    }

    return actions;
  };

  const availableActions = getAvailableActions();
  const nextAction = availableActions[0];

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

  if (!nextAction || currentStatus === "delivered") return null;

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
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="rounded-xl"
        >
          <Button 
            size="sm" 
            className={cn(
              "gap-2 w-full font-semibold transition-all",
              nextAction.config.bgColor, nextAction.config.textColor,
              "hover:opacity-90 shadow-lg", nextAction.config.glowColor
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

  return (
    <div className="space-y-2 relative">
      <SuccessOverlay />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.div
            animate={{ scale: [1, 1.01, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Button 
              size="sm" 
              className={cn(
                "gap-2 w-full font-semibold shadow-lg transition-all",
                nextAction.config.bgColor, nextAction.config.textColor,
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
                  action.config.bgColor, action.config.textColor
                )}
                disabled={action.blocked}
              >
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", "bg-white/20")}>
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

      {hasDeliveryLogistics && (
        <Badge variant="outline" className="w-full justify-center text-xs gap-1 py-1 bg-purple-50 border-purple-200 text-purple-700">
          <Truck className="w-3 h-3" />
          Logistique interne active
        </Badge>
      )}
    </div>
  );
}