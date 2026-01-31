import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OrderStatusUpdate {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  gp_id: string;
  client_id: string;
  updated_at: string;
}

interface UseOrderRealtimeOptions {
  orderId?: string;
  clientId?: string;
  gpId?: string;
  onStatusChange?: (order: OrderStatusUpdate) => void;
}

/**
 * Hook for real-time order status synchronization
 * 
 * Subscribes to order updates and triggers callbacks/notifications
 * when status changes occur.
 */
export function useOrderRealtime({
  orderId,
  clientId,
  gpId,
  onStatusChange,
}: UseOrderRealtimeOptions) {
  const { toast } = useToast();
  const [latestUpdate, setLatestUpdate] = useState<OrderStatusUpdate | null>(null);

  const handleOrderChange = useCallback((payload: any) => {
    const order = payload.new as OrderStatusUpdate;
    const oldOrder = payload.old as OrderStatusUpdate | undefined;

    // Check if this update is relevant to our subscription
    if (orderId && order.id !== orderId) return;
    if (clientId && order.client_id !== clientId) return;
    if (gpId && order.gp_id !== gpId) return;

    setLatestUpdate(order);

    // Detect status change
    if (oldOrder && order.status !== oldOrder.status) {
      const statusLabels: Record<string, string> = {
        pending: "En attente",
        accepted: "Acceptée",
        collected: "Colis reçu",
        in_transit: "En transit",
        delivered: "Livré",
        cancelled: "Annulée",
      };

      // Notify based on new status
      const newLabel = statusLabels[order.status] || order.status;

      if (order.status === "accepted") {
        toast({
          title: "🎉 Réservation acceptée !",
          description: `Commande ${order.order_number} - Voir les infos de dépôt`,
        });
      } else if (order.status === "collected") {
        toast({
          title: "📦 Colis reçu",
          description: `Votre colis ${order.order_number} a été pris en charge`,
        });
      } else if (order.status === "in_transit") {
        toast({
          title: "🚚 En transit",
          description: `Votre colis ${order.order_number} est en route`,
        });
      } else if (order.status === "delivered") {
        toast({
          title: "🎉 Livré !",
          description: `Votre colis ${order.order_number} a été livré avec succès`,
        });
      }

      onStatusChange?.(order);
    }
  }, [orderId, clientId, gpId, onStatusChange, toast]);

  useEffect(() => {
    // Create filter based on provided IDs
    const filter = orderId 
      ? `id=eq.${orderId}`
      : clientId 
        ? `client_id=eq.${clientId}`
        : gpId 
          ? `gp_id=eq.${gpId}`
          : undefined;

    if (!filter) return;

    const channel = supabase
      .channel(`orders-realtime-${orderId || clientId || gpId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter,
        },
        handleOrderChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, clientId, gpId, handleOrderChange]);

  return {
    latestUpdate,
  };
}

/**
 * Hook for checking if order transitions are valid
 */
export function useOrderStatusFlow() {
  const validTransitions: Record<string, string[]> = {
    pending: ["accepted", "cancelled"],
    accepted: ["collected", "cancelled"],
    collected: ["in_transit"],
    in_transit: ["delivered"],
    delivered: [], // Terminal state
    cancelled: [], // Terminal state
  };

  const canTransitionTo = (currentStatus: string, targetStatus: string): boolean => {
    const allowed = validTransitions[currentStatus] || [];
    return allowed.includes(targetStatus);
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const transitions = validTransitions[currentStatus] || [];
    // Return the non-cancelled next status
    return transitions.find(s => s !== "cancelled") || null;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: "En attente",
      accepted: "Acceptée",
      collected: "Colis reçu",
      in_transit: "En transit",
      delivered: "Livré",
      cancelled: "Annulée",
    };
    return labels[status] || status;
  };

  return {
    canTransitionTo,
    getNextStatus,
    getStatusLabel,
  };
}
