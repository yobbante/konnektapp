import { supabase } from "@/integrations/supabase/client";

export type LogisticsMissionType = "pickup" | "delivery";
export type LogisticsPhase = "origin" | "destination";

interface LogisticsOptions {
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  order_id: string;
  id: string;
}

/**
 * V1.1 Konnekt Logistique — Synchronization Hook
 * 
 * Manages the relationship between GP status changes and admin logistics missions.
 * 
 * RULES:
 * - GP never handles first/last km when internal logistics is active
 * - Admin takes over as soon as GP accepts (origin pickup) or marks "arrived" (destination delivery)
 * - GP cannot mark "delivered" if admin handles last-mile
 */
export async function checkLogisticsOptions(orderId: string): Promise<LogisticsOptions | null> {
  const { data } = await supabase
    .from("order_logistics_options")
    .select("id, order_id, pickup_enabled, delivery_enabled")
    .eq("order_id", orderId)
    .maybeSingle();

  return data;
}

/**
 * Checks if GP can mark order as delivered directly
 * Returns false if admin handles delivery (last-mile)
 */
export async function canGPMarkDelivered(orderId: string): Promise<boolean> {
  const logistics = await checkLogisticsOptions(orderId);
  
  // If no logistics options or delivery not enabled, GP can deliver directly
  if (!logistics || !logistics.delivery_enabled) {
    return true;
  }
  
  // If delivery is enabled but not yet completed by admin, GP cannot deliver
  const { data } = await supabase
    .from("order_logistics_options")
    .select("delivery_status")
    .eq("order_id", orderId)
    .single();

  // GP can only mark delivered if admin has already delivered
  return data?.delivery_status === "delivered";
}

/**
 * Checks if destination has internal logistics active
 */
export async function hasLastMileLogistics(orderId: string): Promise<boolean> {
  const logistics = await checkLogisticsOptions(orderId);
  return logistics?.delivery_enabled === true;
}

/**
 * Checks if origin has internal logistics active
 */
export async function hasPickupLogistics(orderId: string): Promise<boolean> {
  const logistics = await checkLogisticsOptions(orderId);
  return logistics?.pickup_enabled === true;
}

/**
 * Trigger admin notification when GP accepts and pickup logistics is enabled
 * Called when GP accepts an order with pickup_enabled = true
 */
export async function notifyAdminPickupMission(
  orderId: string,
  orderNumber: string,
  gpName: string
): Promise<void> {
  try {
    // Get all admin users
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "moderator"]);

    if (!adminUsers || adminUsers.length === 0) return;

    // Create notifications for all admins
    const notifications = adminUsers.map((admin) => ({
      user_id: admin.user_id,
      type: "logistics_mission",
      title: "🚚 Nouvelle mission d'enlèvement",
      message: `GP ${gpName} a accepté la commande ${orderNumber}. Enlèvement à effectuer à Dakar.`,
      related_type: "order",
      related_id: orderId,
    }));

    await supabase.from("notifications").insert(notifications);

    // Set pickup status to pending if not set
    await supabase
      .from("order_logistics_options")
      .update({ pickup_status: "pending" })
      .eq("order_id", orderId)
      .is("pickup_status", null);

    console.log("[LogisticsSync] Admin notified of pickup mission for order:", orderNumber);
  } catch (error) {
    console.error("[LogisticsSync] Failed to notify admin:", error);
  }
}

/**
 * Trigger admin notification when GP marks "arrived" and delivery logistics is enabled
 * Called when GP sets status to "in_transit" completion (simulating "arrived")
 */
export async function notifyAdminDeliveryMission(
  orderId: string,
  orderNumber: string,
  gpName: string,
  gpPhone?: string
): Promise<void> {
  try {
    // Get all admin users
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "moderator"]);

    if (!adminUsers || adminUsers.length === 0) return;

    // Create notifications for all admins
    const notifications = adminUsers.map((admin) => ({
      user_id: admin.user_id,
      type: "logistics_mission",
      title: "📦 Colis arrivé - Livraison dernier km",
      message: `Le colis ${orderNumber} est arrivé à Dakar chez ${gpName}. Livraison dernier km à effectuer.`,
      related_type: "order",
      related_id: orderId,
    }));

    await supabase.from("notifications").insert(notifications);

    // Set delivery status to pending if not set
    await supabase
      .from("order_logistics_options")
      .update({ 
        delivery_status: "pending",
        // Store GP info for admin pickup
        logistics_status: "awaiting_admin_delivery"
      })
      .eq("order_id", orderId)
      .is("delivery_status", null);

    console.log("[LogisticsSync] Admin notified of delivery mission for order:", orderNumber);
  } catch (error) {
    console.error("[LogisticsSync] Failed to notify admin:", error);
  }
}

/**
 * Get the next available status for GP considering logistics constraints
 * V1.1: "arrived" is an intermediate status that triggers admin delivery
 */
export function getAvailableGPActions(
  currentStatus: string,
  hasDeliveryLogistics: boolean
): { status: string; label: string; icon: string; blocked?: boolean; blockReason?: string }[] {
  const actions: { status: string; label: string; icon: string; blocked?: boolean; blockReason?: string }[] = [];

  switch (currentStatus) {
    case "accepted":
      actions.push({ status: "collected", label: "Collecté", icon: "Package" });
      break;
    case "collected":
      actions.push({ status: "in_transit", label: "En transit", icon: "Truck" });
      break;
    case "in_transit":
      if (hasDeliveryLogistics) {
        // GP can mark "arrived" but cannot deliver directly
        actions.push({ 
          status: "arrived", 
          label: "Arrivé", 
          icon: "MapPin",
        });
        // Show blocked delivery option
        actions.push({ 
          status: "delivered", 
          label: "Livré", 
          icon: "CheckCircle",
          blocked: true,
          blockReason: "Livraison gérée par l'équipe Konnekt"
        });
      } else {
        // No logistics - GP delivers directly
        actions.push({ status: "delivered", label: "Livré", icon: "CheckCircle" });
      }
      break;
    // "arrived" is a virtual status - once set, wait for admin
    case "arrived":
      // GP cannot do anything - waiting for admin delivery
      break;
  }

  return actions;
}

/**
 * Handle the "arrived" status - this is V1.1's key feature
 * Marks the order as ready for admin delivery handoff
 */
export async function handleArrivedStatus(
  orderId: string,
  gpProfileId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get order details
    const { data: order } = await supabase
      .from("orders")
      .select("order_number, gp_id")
      .eq("id", orderId)
      .single();

    if (!order) {
      return { success: false, error: "Commande non trouvée" };
    }

    // Get GP details for notification
    const { data: gp } = await supabase
      .from("gp_profiles")
      .select("business_name, phone")
      .eq("id", gpProfileId)
      .single();

    // Update order_logistics_options to mark as "awaiting_admin_delivery"
    await supabase
      .from("order_logistics_options")
      .update({
        logistics_status: "awaiting_admin_delivery",
        delivery_status: "pending",
        gp_arrived_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);

    // Log status history
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status: "in_transit", // Still technically in_transit in DB
      changed_by: userId,
      changed_by_type: "gp",
      notes: "GP a marqué le colis comme ARRIVÉ - En attente de livraison admin",
    });

    // Notify admin of delivery mission
    await notifyAdminDeliveryMission(
      orderId, 
      order.order_number, 
      gp?.business_name || "GP",
      gp?.phone
    );

    return { success: true };
  } catch (error: any) {
    console.error("[LogisticsSync] handleArrivedStatus error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if order is in "arrived" state (waiting for admin delivery)
 */
export async function isOrderAwaitingAdminDelivery(orderId: string): Promise<boolean> {
  const { data } = await supabase
    .from("order_logistics_options")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  return (data as any)?.logistics_status === "awaiting_admin_delivery";
}
