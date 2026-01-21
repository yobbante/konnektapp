import { useState } from "react";
import { 
  Package, Truck, MapPin, CheckCircle, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// Statuts spécifiques GP bagages (avec "arrived" pour les GP)
const GP_BAGAGES_STATUS_FLOW: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: "collected", label: "Collecté", icon: Package },
  { status: "in_transit", label: "En transit", icon: Truck },
  // NOTE: "arrived" n'existe pas dans l'enum DB, on utilise un champ custom ou on garde in_transit
  // Pour l'instant on va directement vers "delivered"
  { status: "delivered", label: "Livré", icon: CheckCircle },
];

interface MissionStatusUpdaterProps {
  orderId: string;
  currentStatus: string;
  onStatusUpdated: () => void;
  compact?: boolean;
}

export function MissionStatusUpdater({
  orderId,
  currentStatus,
  onStatusUpdated,
  compact = false,
}: MissionStatusUpdaterProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    console.log("=== MissionStatusUpdater handleStatusUpdate ===");
    console.log("Order ID:", orderId);
    console.log("New Status:", newStatus);

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Validate enum
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

  // Déterminer les actions disponibles selon le statut actuel
  const getAvailableActions = () => {
    switch (currentStatus) {
      case "accepted":
        return GP_BAGAGES_STATUS_FLOW.slice(0, 1); // Collected
      case "collected":
        return GP_BAGAGES_STATUS_FLOW.slice(1, 2); // In transit
      case "in_transit":
        return GP_BAGAGES_STATUS_FLOW.slice(2); // Delivered
      default:
        return [];
    }
  };

  const availableActions = getAvailableActions();
  const nextAction = availableActions[0];

  if (!nextAction || currentStatus === "delivered") {
    return null;
  }

  if (compact) {
    return (
      <Button 
        size="sm" 
        className="gap-1"
        onClick={() => handleStatusUpdate(nextAction.status)}
        disabled={loading}
      >
        <nextAction.icon className="w-3 h-3" />
        {nextAction.label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1" disabled={loading}>
          Changer statut
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableActions.map((action) => (
          <DropdownMenuItem
            key={action.status}
            onClick={() => handleStatusUpdate(action.status)}
            className="gap-2"
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
