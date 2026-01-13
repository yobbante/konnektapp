import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications } from "./usePushNotifications";

interface UseAutoPushNotificationsProps {
  userId: string | null;
  userType: "client" | "gp" | null;
  enabled?: boolean;
}

/**
 * Automatic push notifications for:
 * - New reservations/bookings (for GPs)
 * - Order status changes (for clients)
 * - New messages
 * - GP profile status changes
 */
export function useAutoPushNotifications({
  userId,
  userType,
  enabled = true,
}: UseAutoPushNotificationsProps) {
  const { permission, showNotification, isSupported } = usePushNotifications();

  const canNotify = isSupported && permission === "granted" && enabled && userId;

  // Subscribe to new bookings/orders (for GPs)
  useEffect(() => {
    if (!canNotify || userType !== "gp") return;

    // Get GP profile ID first
    const subscribeToOrders = async () => {
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!gpProfile) return;

      const channel = supabase
        .channel(`gp-orders-push-${gpProfile.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "orders",
            filter: `gp_id=eq.${gpProfile.id}`,
          },
          (payload) => {
            const order = payload.new as any;
            showNotification("🎉 Nouvelle réservation !", {
              body: `${order.origin_city} → ${order.destination_city} • ${order.weight}kg`,
              tag: `new-order-${order.id}`,
              data: { type: "order", id: order.id, action: "new_booking" },
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    subscribeToOrders();
  }, [canNotify, userType, userId, showNotification]);

  // Subscribe to order status changes (for clients)
  useEffect(() => {
    if (!canNotify || userType !== "client") return;

    const channel = supabase
      .channel(`client-orders-push-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `client_id=eq.${userId}`,
        },
        (payload) => {
          const order = payload.new as any;
          const oldOrder = payload.old as any;

          // Only notify on status change
          if (order.status !== oldOrder.status) {
            const statusLabels: Record<string, string> = {
              pending: "en attente",
              accepted: "acceptée par le transporteur",
              collected: "collecté",
              in_transit: "en cours de livraison",
              delivered: "livré avec succès",
              cancelled: "annulée",
            };

            const statusEmoji: Record<string, string> = {
              accepted: "✅",
              collected: "📦",
              in_transit: "🚚",
              delivered: "🎉",
              cancelled: "❌",
            };

            const label = statusLabels[order.status] || order.status;
            const emoji = statusEmoji[order.status] || "📦";

            showNotification(`${emoji} Colis ${label}`, {
              body: `Commande ${order.order_number}: ${order.origin_city} → ${order.destination_city}`,
              tag: `order-status-${order.id}`,
              data: { type: "order", id: order.id, action: "status_change" },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canNotify, userType, userId, showNotification]);

  // Subscribe to GP profile status changes (for GPs)
  useEffect(() => {
    if (!canNotify || userType !== "gp") return;

    const subscribeToProfileStatus = async () => {
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!gpProfile) return;

      const channel = supabase
        .channel(`gp-profile-push-${gpProfile.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "gp_profiles",
            filter: `id=eq.${gpProfile.id}`,
          },
          (payload) => {
            const profile = payload.new as any;
            const oldProfile = payload.old as any;

            if (profile.status !== oldProfile.status) {
              const statusMessages: Record<string, { title: string; body: string }> = {
                verified: {
                  title: "🎉 Compte vérifié !",
                  body: "Votre compte a été approuvé. Vous pouvez maintenant publier des offres.",
                },
                suspended: {
                  title: "⚠️ Compte suspendu",
                  body: "Votre compte a été suspendu. Contactez le support pour plus d'informations.",
                },
                rejected: {
                  title: "❌ Demande refusée",
                  body: "Votre demande d'inscription a été refusée. Consultez vos messages.",
                },
              };

              const message = statusMessages[profile.status];
              if (message) {
                showNotification(message.title, {
                  body: message.body,
                  tag: `gp-status-${gpProfile.id}`,
                  data: { type: "gp_status", action: profile.status },
                });
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    subscribeToProfileStatus();
  }, [canNotify, userType, userId, showNotification]);

  // Subscribe to new messages
  useEffect(() => {
    if (!canNotify) return;

    const channel = supabase
      .channel(`messages-push-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const message = payload.new as any;
          
          // Don't notify for own messages
          if (message.sender_id === userId) return;

          // Check if conversation belongs to user
          const { data: conversation } = await supabase
            .from("conversations")
            .select("client_id, gp_id")
            .eq("id", message.conversation_id)
            .single();

          if (!conversation) return;

          // Check if user is part of this conversation
          const isParticipant =
            (userType === "client" && conversation.client_id === userId) ||
            (userType === "gp" && conversation.gp_id);

          if (isParticipant) {
            showNotification("💬 Nouveau message", {
              body: message.content.substring(0, 100) + (message.content.length > 100 ? "..." : ""),
              tag: `message-${message.id}`,
              data: { type: "message", conversationId: message.conversation_id },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canNotify, userId, userType, showNotification]);

  return {
    isEnabled: canNotify,
    permission,
  };
}
