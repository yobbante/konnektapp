import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications } from "./usePushNotifications";

interface UseAutoPushNotificationsProps {
  userId: string | null;
  userType: "client" | "gp" | null;
  enabled?: boolean;
}

// Track which notifications have been shown to prevent duplicates
const shownNotifications = new Set<string>();

/**
 * Automatic push notifications for:
 * - New reservations/bookings (for GPs)
 * - Order status changes (for clients)
 * - New messages
 * - GP profile status changes
 * - New offers from favorite transporters (for clients)
 */
export function useAutoPushNotifications({
  userId,
  userType,
  enabled = true,
}: UseAutoPushNotificationsProps) {
  const { permission, showNotification, isSupported } = usePushNotifications();
  const channelsRef = useRef<any[]>([]);

  const canNotify = isSupported && permission === "granted" && enabled && userId;

  // Deduplicated notification helper
  const showDedupedNotification = useCallback((id: string, title: string, options: any) => {
    if (shownNotifications.has(id)) {
      console.log(`Skipping duplicate notification: ${id}`);
      return;
    }
    shownNotifications.add(id);
    // Remove from set after 30 seconds to allow re-notification
    setTimeout(() => shownNotifications.delete(id), 30000);
    showNotification(title, options);
  }, [showNotification]);

  // Cleanup all channels on unmount
  useEffect(() => {
    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, []);

  // Subscribe to new bookings/orders (for GPs)
  useEffect(() => {
    if (!canNotify || userType !== "gp") return;

    let channel: any = null;

    const subscribeToOrders = async () => {
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!gpProfile) return;

      // Remove existing channel with same name if exists
      const existingChannelIndex = channelsRef.current.findIndex(
        c => c.topic === `gp-orders-push-${gpProfile.id}`
      );
      if (existingChannelIndex >= 0) {
        supabase.removeChannel(channelsRef.current[existingChannelIndex]);
        channelsRef.current.splice(existingChannelIndex, 1);
      }

      channel = supabase
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
            const notifId = `new-order-${order.id}`;
            showDedupedNotification(notifId, "Nouvelle reservation !", {
              body: `${order.origin_city} → ${order.destination_city} • ${order.weight}kg`,
              tag: notifId,
              data: { type: "order", id: order.id, action: "new_booking" },
            });
          }
        )
        .subscribe();

      channelsRef.current.push(channel);
    };

    subscribeToOrders();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        const idx = channelsRef.current.indexOf(channel);
        if (idx >= 0) channelsRef.current.splice(idx, 1);
      }
    };
  }, [canNotify, userType, userId, showDedupedNotification]);

  // Subscribe to order status changes (for clients)
  useEffect(() => {
    if (!canNotify || userType !== "client") return;

    // Remove existing channel with same name if exists
    const existingChannelIndex = channelsRef.current.findIndex(
      c => c.topic === `client-orders-push-${userId}`
    );
    if (existingChannelIndex >= 0) {
      supabase.removeChannel(channelsRef.current[existingChannelIndex]);
      channelsRef.current.splice(existingChannelIndex, 1);
    }

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

            const label = statusLabels[order.status] || order.status;
            const notifId = `order-status-${order.id}-${order.status}`;

            showDedupedNotification(notifId, `Colis ${label}`, {
              body: `Commande ${order.order_number}: ${order.origin_city} → ${order.destination_city}`,
              tag: notifId,
              data: { 
                type: "order_status", 
                id: order.id, 
                trackingCode: order.tracking_code || order.order_number,
                action: "status_change" 
              },
            });
          }
        }
      )
      .subscribe();

    channelsRef.current.push(channel);

    return () => {
      supabase.removeChannel(channel);
      const idx = channelsRef.current.indexOf(channel);
      if (idx >= 0) channelsRef.current.splice(idx, 1);
    };
  }, [canNotify, userType, userId, showDedupedNotification]);

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
                  title: "Compte verifie !",
                  body: "Votre compte a été approuvé. Vous pouvez maintenant publier des offres.",
                },
                suspended: {
                  title: "Compte suspendu",
                  body: "Votre compte a été suspendu. Contactez le support pour plus d'informations.",
                },
                rejected: {
                  title: "Demande refusee",
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

          // Get GP profile ID for GP users
          let gpProfileId: string | null = null;
          if (userType === "gp") {
            const { data: gp } = await supabase
              .from("gp_profiles")
              .select("id")
              .eq("user_id", userId)
              .maybeSingle();
            gpProfileId = gp?.id || null;
          }

          // Check if user is part of this conversation
          const isParticipant =
            (userType === "client" && conversation.client_id === userId) ||
            (userType === "gp" && gpProfileId && conversation.gp_id === gpProfileId);

          if (isParticipant) {
            const notifId = `message-${message.id}`;
            showDedupedNotification(notifId, "Nouveau message", {
              body: message.content.substring(0, 100) + (message.content.length > 100 ? "..." : ""),
              tag: notifId,
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

  // Subscribe to new offers from favorite transporters (for clients)
  useEffect(() => {
    if (!canNotify || userType !== "client") return;

    const subscribeToFavoriteOffers = async () => {
      // Get user's favorite transporters
      const { data: favorites } = await supabase
        .from("transporter_favorites")
        .select("gp_id")
        .eq("user_id", userId);

      if (!favorites || favorites.length === 0) return;

      const favoriteGpIds = favorites.map(f => f.gp_id);

      const channel = supabase
        .channel(`favorite-offers-push-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "gp_offers",
          },
          async (payload) => {
            const offer = payload.new as any;
            
            // Check if this offer is from a favorite transporter
            if (!favoriteGpIds.includes(offer.gp_id)) return;

            // Get transporter name
            const { data: gpProfile } = await supabase
              .from("public_gp_profiles")
              .select("business_name")
              .eq("id", offer.gp_id)
              .single();

            const gpName = gpProfile?.business_name || "Un transporteur favori";

            showNotification(`Nouveau trajet de ${gpName}`, {
              body: `${offer.origin_city} → ${offer.destination_city} • ${new Date(offer.departure_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`,
              tag: `favorite-offer-${offer.id}`,
              data: { 
                type: "favorite_offer", 
                offerId: offer.id,
                gpId: offer.gp_id 
              },
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    subscribeToFavoriteOffers();
  }, [canNotify, userType, userId, showNotification]);

  return {
    isEnabled: canNotify,
    permission,
  };
}
