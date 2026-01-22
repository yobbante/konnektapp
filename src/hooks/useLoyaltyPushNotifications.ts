import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface UseLoyaltyPushNotificationsProps {
  userId: string | null;
  enabled?: boolean;
}

export function useLoyaltyPushNotifications({
  userId,
  enabled = true,
}: UseLoyaltyPushNotificationsProps) {
  const { permission, showNotification, isSupported } = usePushNotifications();

  // Check for approaching tier notifications
  const checkTierProgress = useCallback(async () => {
    if (!userId || permission !== "granted") return;

    try {
      // Get user's loyalty data
      const { data: loyalty } = await supabase
        .from("client_loyalty")
        .select("total_orders, total_spent, current_tier_id")
        .eq("user_id", userId)
        .single();

      if (!loyalty) return;

      // Get all tiers
      const { data: tiers } = await supabase
        .from("loyalty_tiers")
        .select("*")
        .order("min_orders", { ascending: true });

      if (!tiers || tiers.length === 0) return;

      // Find current tier index
      const currentTierIndex = loyalty.current_tier_id
        ? tiers.findIndex((t) => t.id === loyalty.current_tier_id)
        : 0;

      // If not at max tier, check progress to next
      if (currentTierIndex < tiers.length - 1) {
        const nextTier = tiers[currentTierIndex + 1];

        // Calculate progress
        const ordersProgress = (loyalty.total_orders / nextTier.min_orders) * 100;
        const spentProgress = (loyalty.total_spent / nextTier.min_spent) * 100;
        const overallProgress = Math.min(ordersProgress, spentProgress);

        // Check if we've already notified for this tier
        const { data: existingNotif } = await supabase
          .from("loyalty_tier_notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("tier_id", nextTier.id)
          .eq("notification_type", "approaching")
          .maybeSingle();

        // If at 80%+ and haven't notified yet
        if (overallProgress >= 80 && !existingNotif) {
          // Record notification
          await supabase.from("loyalty_tier_notifications").insert({
            user_id: userId,
            tier_id: nextTier.id,
            notification_type: "approaching",
          });

          // Send push notification
          const remainingOrders = Math.max(0, nextTier.min_orders - loyalty.total_orders);
          const remainingSpent = Math.max(0, nextTier.min_spent - loyalty.total_spent);

          let message = `Plus que `;
          if (remainingOrders > 0) {
            message += `${remainingOrders} commande${remainingOrders > 1 ? "s" : ""}`;
          }
          if (remainingOrders > 0 && remainingSpent > 0) {
            message += " ou ";
          }
          if (remainingSpent > 0) {
            message += `${(remainingSpent / 1000).toFixed(0)}k FCFA`;
          }
          message += ` pour débloquer ${nextTier.discount_percent}% de réduction !`;

          showNotification(`🎉 Niveau ${nextTier.name} en vue !`, {
            body: message,
            tag: `loyalty-tier-${nextTier.id}`,
            data: { type: "loyalty", tierId: nextTier.id },
          });
        }
      }

      // Check for tier upgrade (when they've just reached a new tier)
      if (tiers.length > 0) {
        // Find which tier they should be at based on current stats
        let achievedTierIndex = 0;
        for (let i = 0; i < tiers.length; i++) {
          if (
            loyalty.total_orders >= tiers[i].min_orders &&
            loyalty.total_spent >= tiers[i].min_spent
          ) {
            achievedTierIndex = i;
          } else {
            break;
          }
        }

        // If they've reached a new tier
        if (achievedTierIndex > currentTierIndex) {
          const newTier = tiers[achievedTierIndex];

          // Check if we've already notified for this upgrade
          const { data: upgradeNotif } = await supabase
            .from("loyalty_tier_notifications")
            .select("id")
            .eq("user_id", userId)
            .eq("tier_id", newTier.id)
            .eq("notification_type", "upgraded")
            .maybeSingle();

          if (!upgradeNotif) {
            // Record notification
            await supabase.from("loyalty_tier_notifications").insert({
              user_id: userId,
              tier_id: newTier.id,
              notification_type: "upgraded",
            });

            // Update user's tier
            await supabase
              .from("client_loyalty")
              .update({
                current_tier_id: newTier.id,
                tier_updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId);

            // Send push notification
            showNotification(`🏆 Félicitations ! Niveau ${newTier.name} atteint !`, {
              body: `Vous bénéficiez maintenant de ${newTier.discount_percent}% de réduction sur toutes vos commandes !`,
              tag: `loyalty-upgrade-${newTier.id}`,
              data: { type: "loyalty-upgrade", tierId: newTier.id },
            });
          }
        }
      }
    } catch (error) {
      console.error("Error checking tier progress:", error);
    }
  }, [userId, permission, showNotification]);

  // Subscribe to order status changes to trigger tier check
  useEffect(() => {
    if (!userId || !enabled || permission !== "granted") return;

    // Check immediately on mount
    checkTierProgress();

    // Subscribe to order completions
    const channel = supabase
      .channel(`loyalty-orders-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `client_id=eq.${userId}`,
        },
        (payload) => {
          const order = payload.new;
          const oldOrder = payload.old;

          // Check progress when an order is delivered
          if (order.status === "delivered" && oldOrder.status !== "delivered") {
            // Small delay to ensure loyalty table is updated
            setTimeout(() => {
              checkTierProgress();
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, enabled, permission, checkTierProgress]);

  return {
    checkTierProgress,
    isSupported,
    permission,
  };
}
