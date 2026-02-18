/**
 * KONNEKT SCAN ENGINE — Unified Backend Resolver + Executor
 * 
 * POST /scan-engine
 * 
 * RESOLVE MODE: { scanned_data, role? }
 *   → Returns: { status, qr_type, scenario, next_action, message, financial_impact, data }
 * 
 * EXECUTE MODE: { action, order_id, action_data?, role? }
 *   → Executes: deposit, transit, delivery, weight_adjust, pickup, stock
 *   → Returns: { status: "executed", scenario, message, data }
 * 
 * State Machine: SCANNED → VALIDATED → AUTHORIZED → EXECUTED | FAILED
 * 
 * ALL scan decisions and mutations go through this engine.
 * No frontend DB writes for scan-triggered actions.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════ TYPES ═══════════════

type QRType =
  | "QR_COLIS"
  | "QR_USER"
  | "QR_GP"
  | "QR_PAYMENT"
  | "QR_ADJUSTMENT"
  | "QR_CONFIRMATION"
  | "QR_EXTERNAL"
  | "QR_ADMIN"
  | "QR_MISSION";

type EngineStatus = "scanned" | "validated" | "authorized" | "executed" | "failed";
type UserRole = "client" | "gp" | "admin" | "agent_logistique" | "external";

type ExecuteAction =
  | "deposit_confirm"
  | "weight_modify"
  | "mark_transit"
  | "confirm_delivery"
  | "pickup_confirm"
  | "stock_confirm"
  | "confirm_reception";

interface ScanRequest {
  scanned_data?: string;
  role?: UserRole;
  // Execute mode
  action?: ExecuteAction;
  order_id?: string;
  action_data?: Record<string, any>;
}

interface ScanResponse {
  status: EngineStatus;
  qr_type: QRType;
  scenario: string;
  next_action: string;
  message: string;
  financial_impact?: {
    amount?: number;
    currency?: string;
    type?: string;
  } | null;
  data?: Record<string, any>;
  error?: string;
}

// ═══════════════ STATUS RULES ═══════════════

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "collected", "cancelled"],
  accepted: ["collected", "cancelled"],
  collected: ["in_transit", "cancelled"],
  in_transit: ["arrived", "delivered"],
  arrived: ["delivered"],
};

const TERMINAL_STATUSES = new Set(["delivered", "cancelled", "disputed"]);

const ROLE_ACTIONS: Record<string, Set<string>> = {
  client: new Set(["view", "confirm_reception"]),
  gp: new Set(["view", "deposit_confirm", "weight_modify", "mark_transit", "confirm_delivery"]),
  agent_logistique: new Set(["view", "pickup_confirm", "delivery_confirm", "stock_confirm", "confirm_delivery"]),
  admin: new Set(["view", "deposit_confirm", "weight_modify", "mark_transit", "confirm_delivery", "pickup_confirm", "stock_confirm", "confirm_reception"]),
};

// ═══════════════ QR DETECTION ═══════════════

interface ParsedQR {
  type: QRType;
  reference_id?: string;
  raw: string;
  signature?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

function detectQRType(scannedData: string): ParsedQR {
  const trimmed = scannedData.trim();

  // 1. JSON parse
  try {
    const json = JSON.parse(trimmed);
    if (json.type && json.reference_id) {
      const typeMap: Record<string, QRType> = {
        order: "QR_COLIS", colis: "QR_COLIS", user: "QR_USER",
        gp_profile: "QR_GP", payment: "QR_PAYMENT", adjustment: "QR_ADJUSTMENT",
        confirmation: "QR_CONFIRMATION", admin: "QR_ADMIN", mission: "QR_MISSION",
      };
      return {
        type: typeMap[json.type] || "QR_EXTERNAL",
        reference_id: json.reference_id || json.gp_id || json.id,
        raw: trimmed, signature: json.signature, timestamp: json.timestamp, metadata: json,
      };
    }
    if (json.type === "gp_profile" && json.gp_id) {
      return { type: "QR_GP", reference_id: json.gp_id, raw: trimmed, metadata: json };
    }
  } catch { /* Not JSON */ }

  // 2. CMD number
  if (/^CMD-[\dA-Z-]+$/i.test(trimmed)) {
    return { type: "QR_COLIS", raw: trimmed };
  }
  // 3. User URL
  const userUrlMatch = trimmed.match(/\/track\/user\/([a-f0-9-]{36})/i);
  if (userUrlMatch) return { type: "QR_USER", reference_id: userUrlMatch[1], raw: trimmed };
  // 4. Protocol
  const protocolMatch = trimmed.match(/konnekt:\/\/(?:user|gp)\/([a-f0-9-]{36})/i);
  if (protocolMatch) {
    const isGP = trimmed.includes("konnekt://gp/");
    return { type: isGP ? "QR_GP" : "QR_USER", reference_id: protocolMatch[1], raw: trimmed };
  }
  // 5. GP URL
  const gpUrlMatch = trimmed.match(/\/client\/transporteurs\/([a-f0-9-]{36})/i);
  if (gpUrlMatch) return { type: "QR_GP", reference_id: gpUrlMatch[1], raw: trimmed };
  // 6. UUID
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)) {
    return { type: "QR_USER", reference_id: trimmed, raw: trimmed };
  }
  // 7. URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { type: "QR_EXTERNAL", raw: trimmed, metadata: { is_url: true } };
  }
  // 8. Default
  return { type: "QR_EXTERNAL", raw: trimmed };
}

// ═══════════════ RATE LIMITING ═══════════════

async function checkRateLimit(supabase: any, userId: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  const { count } = await supabase
    .from("scan_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneMinuteAgo);
  return (count || 0) < 30;
}

// ═══════════════ IDEMPOTENCY ═══════════════

function generateIdempotencyKey(userId: string, qrType: string, referenceId: string | undefined, action: string): string {
  return `${userId}:${qrType}:${referenceId || "none"}:${action}`;
}

async function checkIdempotency(supabase: any, key: string): Promise<boolean> {
  const { data } = await supabase
    .from("idempotency_keys")
    .select("key")
    .eq("key", key)
    .maybeSingle();
  return !data; // true if key doesn't exist (action not yet performed)
}

async function markIdempotency(supabase: any, key: string, result: any): Promise<void> {
  try {
    await supabase.from("idempotency_keys").upsert({ key, result }, { onConflict: "key" });
  } catch { /* ignore */ }
}

// ═══════════════ ACTION EXECUTOR ═══════════════

async function executeAction(
  supabase: any,
  action: ExecuteAction,
  orderId: string,
  userId: string,
  role: UserRole,
  actionData?: Record<string, any>
): Promise<ScanResponse> {
  // 1. Validate role permission
  const allowedActions = ROLE_ACTIONS[role];
  if (!allowedActions || !allowedActions.has(action)) {
    return {
      status: "failed", qr_type: "QR_COLIS", scenario: "unauthorized",
      next_action: "none", message: "Votre rôle ne vous autorise pas cette action.",
    };
  }

  // 2. Fetch order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, status, weight, total_price, currency, price_per_kg, client_id, gp_id, origin_city, destination_city, delivery_code, recipient_name, recipient_phone, recipient_user_id, financial_status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return {
      status: "failed", qr_type: "QR_COLIS", scenario: "order_not_found",
      next_action: "none", message: "Commande non trouvée.",
    };
  }

  // 3. Terminal status check
  if (TERMINAL_STATUSES.has(order.status)) {
    return {
      status: "failed", qr_type: "QR_COLIS", scenario: "terminal_status",
      next_action: "none", message: `Commande déjà « ${order.status} ». Aucune action possible.`,
    };
  }

  // 4. Ownership check
  if (role === "gp") {
    const { data: gpProfile } = await supabase.from("gp_profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!gpProfile || gpProfile.id !== order.gp_id) {
      return {
        status: "failed", qr_type: "QR_COLIS", scenario: "unauthorized",
        next_action: "none", message: "Ce colis n'est pas associé à votre profil.",
      };
    }
  }
  if (role === "client" && order.client_id !== userId && order.recipient_user_id !== userId) {
    return {
      status: "failed", qr_type: "QR_COLIS", scenario: "unauthorized",
      next_action: "none", message: "Ce colis ne vous appartient pas.",
    };
  }

  // 5. Idempotency
  const idempKey = generateIdempotencyKey(userId, "ACTION", orderId, action);
  const canProceed = await checkIdempotency(supabase, idempKey);
  if (!canProceed) {
    return {
      status: "failed", qr_type: "QR_COLIS", scenario: "duplicate_action",
      next_action: "none", message: "Cette action a déjà été effectuée sur cette commande.",
    };
  }

  // 6. Execute by action type
  let result: ScanResponse;

  switch (action) {
    case "deposit_confirm":
      result = await execDepositConfirm(supabase, order, userId, role, actionData);
      break;
    case "weight_modify":
      result = await execWeightModify(supabase, order, userId, role, actionData);
      break;
    case "mark_transit":
      result = await execMarkTransit(supabase, order, userId, role);
      break;
    case "confirm_delivery":
      result = await execConfirmDelivery(supabase, order, userId, role);
      break;
    case "pickup_confirm":
      result = await execPickupConfirm(supabase, order, userId, role);
      break;
    case "stock_confirm":
      result = await execStockConfirm(supabase, order, userId, role);
      break;
    case "confirm_reception":
      result = await execConfirmReception(supabase, order, userId, role, actionData);
      break;
    default:
      result = {
        status: "failed", qr_type: "QR_COLIS", scenario: "invalid_action",
        next_action: "none", message: "Action non reconnue.",
      };
  }

  // 7. Mark idempotency + log
  if (result.status === "executed") {
    await markIdempotency(supabase, idempKey, { action, orderId, at: new Date().toISOString() });

    try {
      await supabase.from("scan_logs").insert({
        user_id: userId, user_role: role, action,
        scan_type: "engine_action", qr_type: "QR_COLIS",
        order_id: orderId, engine_status: "executed",
        financial_impact: result.financial_impact || null,
        idempotency_key: idempKey,
        metadata: { scenario: result.scenario, action_data: actionData },
      });
    } catch { /* non-blocking log */ }
  }

  return result;
}

// ═══════════════ ACTION IMPLEMENTATIONS ═══════════════

async function execDepositConfirm(
  supabase: any, order: any, userId: string, role: string, actionData?: Record<string, any>
): Promise<ScanResponse> {
  if (!["pending", "accepted"].includes(order.status)) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_status", next_action: "none", message: "Le dépôt n'est possible qu'en statut « En attente » ou « Acceptée »." };
  }

  const actualWeight = actionData?.actual_weight || order.weight;
  const hasWeightChange = Math.abs(actualWeight - order.weight) > 0.01;

  if (hasWeightChange) {
    // Weight change detected → delegate to weight_modify
    return execWeightModify(supabase, order, userId, role, { actual_weight: actualWeight });
  }

  // Standard deposit: update status to collected
  await supabase.from("orders").update({ status: "collected", weight: actualWeight }).eq("id", order.id);
  await supabase.from("order_status_history").insert({
    order_id: order.id, status: "collected", changed_by: userId, changed_by_type: role,
    notes: "Dépôt confirmé par scan — poids conforme",
  });
  await supabase.from("notifications").insert({
    user_id: order.client_id, type: "order_update",
    title: "📦 Colis reçu", message: `Votre colis ${order.order_number} a été reçu par le transporteur`,
    related_type: "order", related_id: order.id,
  });

  return {
    status: "executed", qr_type: "QR_COLIS", scenario: "deposit_confirmed",
    next_action: "none", message: "✅ Dépôt confirmé avec succès.",
    data: { order: { ...order, status: "collected" } },
  };
}

async function execWeightModify(
  supabase: any, order: any, userId: string, role: string, actionData?: Record<string, any>
): Promise<ScanResponse> {
  if (!["pending", "accepted"].includes(order.status)) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_status", next_action: "none", message: "La modification de poids n'est possible qu'à l'étape de dépôt." };
  }

  const actualWeight = actionData?.actual_weight;
  if (!actualWeight || typeof actualWeight !== "number" || actualWeight <= 0) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_data", next_action: "none", message: "Poids réel invalide." };
  }

  const weightDiff = actualWeight - order.weight;
  const priceDiff = Math.round(weightDiff * order.price_per_kg);

  // Update weight_tier_applied, don't change status (frozen for client validation)
  await supabase.from("orders").update({ weight_tier_applied: actualWeight.toString() }).eq("id", order.id);
  await supabase.from("order_status_history").insert({
    order_id: order.id, status: order.status, changed_by: userId, changed_by_type: role,
    notes: `⚠️ POIDS MODIFIÉ — VALIDATION REQUISE: ${order.weight} kg → ${actualWeight} kg. Diff prix: ${priceDiff > 0 ? "+" : ""}${priceDiff} ${order.currency}`,
  });
  await supabase.from("notifications").insert({
    user_id: order.client_id, type: "weight_validation_required",
    title: "⚠️ Validation requise — Poids modifié",
    message: `Poids modifié pour ${order.order_number}. Validez depuis votre espace.`,
    related_type: "order", related_id: order.id,
  });

  return {
    status: "executed", qr_type: "QR_COLIS", scenario: "weight_modified",
    next_action: "await_client_validation", message: "⚠️ Poids modifié — en attente validation client.",
    data: { order, declared_weight: order.weight, actual_weight: actualWeight, price_diff: priceDiff },
    financial_impact: { amount: Math.abs(priceDiff), currency: order.currency, type: "adjustment" },
  };
}

async function execMarkTransit(
  supabase: any, order: any, userId: string, role: string
): Promise<ScanResponse> {
  if (order.status !== "collected") {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_status", next_action: "none", message: "Le colis doit être « Collecté » pour passer en transit." };
  }

  await supabase.from("orders").update({ status: "in_transit" }).eq("id", order.id);
  await supabase.from("order_status_history").insert({
    order_id: order.id, status: "in_transit", changed_by: userId, changed_by_type: role,
    notes: "Colis marqué en transit par scan QR",
  });
  await supabase.from("notifications").insert({
    user_id: order.client_id, type: "order_update",
    title: "🚚 Colis en transit", message: `Votre colis ${order.order_number} est en route vers ${order.destination_city}`,
    related_type: "order", related_id: order.id,
  });

  return {
    status: "executed", qr_type: "QR_COLIS", scenario: "transit_confirmed",
    next_action: "none", message: "🚚 Colis en transit.",
    data: { order: { ...order, status: "in_transit" } },
  };
}

async function execConfirmDelivery(
  supabase: any, order: any, userId: string, role: string
): Promise<ScanResponse> {
  if (!["in_transit", "arrived", "collected"].includes(order.status)) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_status", next_action: "none", message: "Le colis doit être « En transit » ou « Arrivé » pour confirmer la livraison." };
  }

  const now = new Date().toISOString();
  await supabase.from("orders").update({ status: "delivered", actual_delivery_date: now }).eq("id", order.id);

  // Update logistics if exists
  await supabase.from("order_logistics_options").update({
    delivery_status: "delivered", delivery_completed_at: now, logistics_status: "completed",
  }).eq("order_id", order.id);

  await supabase.from("order_status_history").insert({
    order_id: order.id, status: "delivered", changed_by: userId, changed_by_type: role,
    notes: `🎉 Livraison confirmée par scan QR (${role})`,
  });
  await supabase.from("notifications").insert({
    user_id: order.client_id, type: "order_update",
    title: "🎉 Colis livré !", message: `Votre colis ${order.order_number} a été livré avec succès`,
    related_type: "order", related_id: order.id,
  });

  return {
    status: "executed", qr_type: "QR_COLIS", scenario: "delivery_confirmed",
    next_action: "none", message: "🎉 Livraison confirmée avec succès.",
    data: { order: { ...order, status: "delivered" } },
    financial_impact: { amount: order.total_price, currency: order.currency, type: "release" },
  };
}

async function execPickupConfirm(
  supabase: any, order: any, userId: string, role: string
): Promise<ScanResponse> {
  if (!["pending", "accepted"].includes(order.status)) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_status", next_action: "none", message: "L'enlèvement n'est possible qu'en statut « En attente » ou « Acceptée »." };
  }

  await supabase.from("order_logistics_options").update({
    pickup_status: "collected", pickup_collected_at: new Date().toISOString(),
  }).eq("order_id", order.id);

  await supabase.from("order_status_history").insert({
    order_id: order.id, status: order.status, changed_by: userId, changed_by_type: role === "admin" ? "admin" : "agent",
    notes: "📦 Colis enlevé par agent Konnekt",
  });
  await supabase.from("notifications").insert({
    user_id: order.client_id, type: "logistics_update",
    title: "📦 Colis enlevé", message: `Votre colis ${order.order_number} a été enlevé par un agent Konnekt`,
    related_type: "order", related_id: order.id,
  });

  return {
    status: "executed", qr_type: "QR_COLIS", scenario: "pickup_confirmed",
    next_action: "none", message: "✅ Enlèvement confirmé.",
    data: { order },
  };
}

async function execStockConfirm(
  supabase: any, order: any, userId: string, role: string
): Promise<ScanResponse> {
  if (!["collected", "in_transit"].includes(order.status)) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_status", next_action: "none", message: "La réception stock n'est possible qu'en statut « Collecté » ou « En transit »." };
  }

  await supabase.from("order_status_history").insert({
    order_id: order.id, status: order.status, changed_by: userId, changed_by_type: role === "admin" ? "admin" : "agent",
    notes: "📋 Réception stock Konnekt — Dakar",
  });

  return {
    status: "executed", qr_type: "QR_COLIS", scenario: "stock_confirmed",
    next_action: "none", message: "✅ Réception stock confirmée.",
    data: { order },
  };
}

async function execConfirmReception(
  supabase: any, order: any, userId: string, role: string, actionData?: Record<string, any>
): Promise<ScanResponse> {
  if (!["in_transit", "arrived", "delivered"].includes(order.status)) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_status", next_action: "none", message: "La confirmation de réception n'est possible que pour un colis en transit ou arrivé." };
  }

  // If delivery code is required, validate it
  if (order.delivery_code && actionData?.delivery_code) {
    if (actionData.delivery_code.toUpperCase() !== order.delivery_code.toUpperCase()) {
      return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_code", next_action: "none", message: "Code de livraison incorrect." };
    }
  }

  // Mark as delivered if not already
  if (order.status !== "delivered") {
    await supabase.from("orders").update({ status: "delivered", actual_delivery_date: new Date().toISOString() }).eq("id", order.id);
  }

  // Record confirmation
  await supabase.from("delivery_confirmations").insert({
    order_id: order.id,
    confirmed_by_phone: actionData?.phone || "app",
    confirmed_by_name: actionData?.name || null,
    created_user_id: userId,
  }).catch(() => {});

  await supabase.from("order_status_history").insert({
    order_id: order.id, status: "delivered", changed_by: userId, changed_by_type: "client",
    notes: "✅ Réception confirmée par le client via scan",
  });

  // Trigger escrow release via edge function
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceKey) {
      await fetch(`${supabaseUrl}/functions/v1/confirm-delivery-release`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ order_id: order.id }),
      }).catch(() => {});
    }
  } catch { /* best effort */ }

  return {
    status: "executed", qr_type: "QR_COLIS", scenario: "reception_confirmed",
    next_action: "none", message: "✅ Réception confirmée. Fonds en cours de libération.",
    data: { order: { ...order, status: "delivered" } },
    financial_impact: { amount: order.total_price, currency: order.currency, type: "escrow_release" },
  };
}

// ═══════════════ SCENARIO RESOLVERS (READ-ONLY) ═══════════════

async function resolveColisScenario(supabase: any, parsed: ParsedQR, role: UserRole, userId: string): Promise<ScanResponse> {
  let orderQuery = supabase.from("orders").select(
    "id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id, financial_status"
  );

  if (parsed.reference_id) {
    orderQuery = orderQuery.eq("id", parsed.reference_id);
  } else {
    orderQuery = orderQuery.or(`order_number.eq.${parsed.raw},tracking_code.eq.${parsed.raw}`);
  }

  const { data: order, error } = await orderQuery.maybeSingle();
  if (error || !order) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "order_not_found", next_action: "retry", message: "Commande non trouvée. Vérifiez le code et réessayez." };
  }

  if (role === "gp") {
    const { data: gpProfile } = await supabase.from("gp_profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!gpProfile || gpProfile.id !== order.gp_id) {
      return { status: "failed", qr_type: "QR_COLIS", scenario: "unauthorized", next_action: "none", message: "Ce colis n'est pas associé à votre profil." };
    }

    const actionMap: Record<string, { scenario: string; next_action: string; message: string }> = {
      pending: { scenario: "gp_deposit", next_action: "check_in", message: "Vérifiez le poids et confirmez le dépôt." },
      accepted: { scenario: "gp_deposit", next_action: "check_in", message: "Vérifiez le poids et confirmez le dépôt." },
      collected: { scenario: "gp_transit", next_action: "mark_transit", message: "Colis collecté. Marquez le départ en transit." },
      in_transit: { scenario: "gp_delivery", next_action: "confirm_delivery", message: "Colis en transit. Confirmez la livraison au destinataire." },
      delivered: { scenario: "gp_completed", next_action: "none", message: "Colis déjà livré. Aucune action disponible." },
      cancelled: { scenario: "gp_cancelled", next_action: "none", message: "Commande annulée." },
    };

    const action = actionMap[order.status] || { scenario: "gp_view", next_action: "view", message: "Consultez les détails du colis." };

    return {
      status: "authorized", qr_type: "QR_COLIS", ...action,
      data: { order, financial_status: order.financial_status },
      financial_impact: order.total_price ? { amount: order.total_price, currency: order.currency, type: "escrow" } : null,
    };
  }

  if (role === "client") {
    if (order.client_id !== userId && order.recipient_user_id !== userId) {
      return { status: "failed", qr_type: "QR_COLIS", scenario: "unauthorized", next_action: "none", message: "Ce colis ne vous appartient pas." };
    }

    const isDeliveryReady = ["in_transit", "arrived"].includes(order.status);
    return {
      status: "authorized", qr_type: "QR_COLIS",
      scenario: isDeliveryReady ? "client_confirm_reception" : "client_view",
      next_action: isDeliveryReady ? "confirm_reception" : "view",
      message: isDeliveryReady ? "Votre colis est prêt. Confirmez la réception." : `Statut actuel : ${order.status}`,
      data: { order },
      financial_impact: order.total_price ? { amount: order.total_price, currency: order.currency, type: "escrow" } : null,
    };
  }

  if (role === "admin" || role === "agent_logistique") {
    return {
      status: "authorized", qr_type: "QR_COLIS", scenario: "admin_full_access",
      next_action: order.status === "delivered" ? "none" : "manage",
      message: `Accès complet — Statut: ${order.status}`, data: { order },
    };
  }

  return {
    status: "authorized", qr_type: "QR_COLIS", scenario: "external_view",
    next_action: "redirect_public", message: "Suivez votre colis sur Konnekt.",
    data: { order_number: order.order_number, status: order.status },
  };
}

async function resolveUserScenario(supabase: any, parsed: ParsedQR, role: UserRole, userId: string): Promise<ScanResponse> {
  if (!parsed.reference_id) {
    return { status: "failed", qr_type: "QR_USER", scenario: "invalid", next_action: "none", message: "QR utilisateur invalide." };
  }

  const scannedUserId = parsed.reference_id;
  const { data: profile } = await supabase.from("profiles").select("user_id, full_name, avatar_url, city").eq("user_id", scannedUserId).maybeSingle();

  if (!profile) {
    return { status: "failed", qr_type: "QR_USER", scenario: "user_not_found", next_action: "none", message: "Utilisateur non trouvé." };
  }

  const { data: gpProfile } = await supabase.from("gp_profiles")
    .select("id, business_name, gp_type, rating, total_deliveries, verified_at, status, deposit_address, reception_address")
    .eq("user_id", scannedUserId).maybeSingle();

  const isGP = !!gpProfile;

  if (role === "client" && isGP) {
    return {
      status: "authorized", qr_type: "QR_GP", scenario: "client_view_gp",
      next_action: "view_profile", message: `Profil transporteur : ${gpProfile.business_name}`,
      data: { user: profile, gp: gpProfile, redirect: `/client/transporteurs/${gpProfile.id}` },
    };
  }

  if (role === "gp") {
    const { data: gpSelf } = await supabase.from("gp_profiles").select("id").eq("user_id", userId).maybeSingle();
    if (gpSelf) {
      const { data: orders } = await supabase.from("orders")
        .select("id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id")
        .eq("gp_id", gpSelf.id).eq("client_id", scannedUserId)
        .in("status", ["pending", "accepted", "collected", "in_transit"]).limit(10);

      return {
        status: "authorized", qr_type: "QR_USER",
        scenario: orders?.length ? "gp_client_with_orders" : "gp_client_no_orders",
        next_action: orders?.length ? "select_order" : "view",
        message: orders?.length ? `${orders.length} commande(s) active(s) avec ${profile.full_name}` : `Aucune commande active avec ${profile.full_name}`,
        data: { user: profile, orders: orders || [] },
      };
    }
  }

  if (role === "admin" || role === "agent_logistique") {
    return {
      status: "authorized", qr_type: isGP ? "QR_GP" : "QR_USER", scenario: "admin_user_view",
      next_action: "manage", message: `Accès étendu — ${profile.full_name}`,
      data: { user: profile, gp: gpProfile },
    };
  }

  return {
    status: "authorized", qr_type: isGP ? "QR_GP" : "QR_USER", scenario: "external_discovery",
    next_action: "redirect_public", message: "Découvrez ce profil sur Konnekt.",
    data: { redirect: isGP ? `/client/transporteurs/${gpProfile!.id}` : `/track/user/${scannedUserId}` },
  };
}

async function resolvePaymentScenario(supabase: any, parsed: ParsedQR, role: UserRole, userId: string): Promise<ScanResponse> {
  if (!parsed.reference_id) {
    return { status: "failed", qr_type: "QR_PAYMENT", scenario: "invalid", next_action: "none", message: "QR paiement invalide." };
  }

  const { data: escrow } = await supabase.from("escrow_transactions")
    .select("id, order_id, amount, currency, status, client_id, gp_id")
    .eq("order_id", parsed.reference_id).maybeSingle();

  if (!escrow) {
    return { status: "failed", qr_type: "QR_PAYMENT", scenario: "no_escrow", next_action: "none", message: "Aucune transaction trouvée pour ce QR." };
  }

  if (role === "client") {
    return {
      status: "authorized", qr_type: "QR_PAYMENT",
      scenario: escrow.status === "pending" ? "client_pay" : "client_payment_status",
      next_action: escrow.status === "pending" ? "pay" : "view",
      message: escrow.status === "pending" ? `Paiement requis : ${escrow.amount} ${escrow.currency}` : `Paiement ${escrow.status}`,
      data: { escrow }, financial_impact: { amount: escrow.amount, currency: escrow.currency, type: "payment" },
    };
  }

  if (role === "gp") {
    return {
      status: "authorized", qr_type: "QR_PAYMENT", scenario: "gp_verify_payment",
      next_action: "view", message: `Paiement ${escrow.status} — ${escrow.amount} ${escrow.currency}`,
      data: { escrow }, financial_impact: { amount: escrow.amount, currency: escrow.currency, type: "verification" },
    };
  }

  return {
    status: "authorized", qr_type: "QR_PAYMENT", scenario: "admin_payment",
    next_action: "manage", message: `Escrow: ${escrow.status}`, data: { escrow },
  };
}

async function resolveAdjustmentScenario(supabase: any, parsed: ParsedQR, role: UserRole, userId: string): Promise<ScanResponse> {
  if (!parsed.reference_id) {
    return { status: "failed", qr_type: "QR_ADJUSTMENT", scenario: "invalid", next_action: "none", message: "QR ajustement invalide." };
  }

  const { data: order } = await supabase.from("orders")
    .select("id, order_number, status, weight, total_price, currency, client_id, gp_id, price_per_kg")
    .eq("id", parsed.reference_id).maybeSingle();

  if (!order) {
    return { status: "failed", qr_type: "QR_ADJUSTMENT", scenario: "order_not_found", next_action: "none", message: "Commande non trouvée." };
  }

  if (role === "gp") {
    return { status: "authorized", qr_type: "QR_ADJUSTMENT", scenario: "gp_adjust_weight", next_action: "adjust", message: "Saisissez le poids réel pour ajustement.", data: { order } };
  }

  if (role === "client") {
    return { status: "authorized", qr_type: "QR_ADJUSTMENT", scenario: "client_pay_supplement", next_action: "pay_supplement", message: "Un ajustement de poids a été demandé. Validez le supplément.", data: { order, redirect: `/pay-supplement?orderId=${order.id}` } };
  }

  return { status: "authorized", qr_type: "QR_ADJUSTMENT", scenario: "admin_adjustment", next_action: "manage", message: "Ajustement en cours.", data: { order } };
}

async function resolveExternalScenario(parsed: ParsedQR, role: UserRole): Promise<ScanResponse> {
  const isUrl = parsed.metadata?.is_url || parsed.raw.startsWith("http");
  return {
    status: "validated", qr_type: "QR_EXTERNAL",
    scenario: isUrl ? "external_url" : "external_text",
    next_action: isUrl ? "open_browser" : "propose_manual",
    message: isUrl ? "QR externe détecté. Ouvrir dans le navigateur ?" : "Code inconnu. Associer à un colis ou créer un colis manuel ?",
    data: { raw: parsed.raw, is_url: isUrl, show_manual_options: !isUrl, options: isUrl ? ["open_url"] : ["associate_to_order", "create_manual_parcel"] },
  };
}

// ═══════════════ MAIN HANDLER ═══════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const body: ScanRequest = await req.json();

    // Auth
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let role: UserRole = body.role || "external";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && authUser) {
        userId = authUser.id;

        if (!body.role || body.role === "external") {
          const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
          const roleSet = new Set(roles?.map((r: any) => r.role) || []);
          if (roleSet.has("admin")) role = "admin";
          else if (roleSet.has("agent_logistique")) role = "agent_logistique";
          else {
            const { data: gp } = await supabase.from("gp_profiles").select("id").eq("user_id", userId).maybeSingle();
            role = gp ? "gp" : "client";
          }
        }
      }
    }

    // ═══ EXECUTE MODE ═══
    if (body.action && body.order_id) {
      if (!userId) {
        return new Response(JSON.stringify({
          status: "failed", qr_type: "QR_COLIS", scenario: "unauthorized",
          next_action: "none", message: "Authentification requise pour exécuter une action.",
        } satisfies ScanResponse), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const response = await executeAction(supabase, body.action as ExecuteAction, body.order_id, userId, role, body.action_data);
      return new Response(JSON.stringify(response), {
        status: response.status === "failed" ? 400 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══ RESOLVE MODE ═══
    const { scanned_data } = body;
    if (!scanned_data || typeof scanned_data !== "string" || scanned_data.length > 5000) {
      return new Response(JSON.stringify({
        status: "failed", qr_type: "QR_EXTERNAL", scenario: "invalid_input",
        next_action: "none", message: "Données de scan invalides.",
      } satisfies ScanResponse), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate limit
    if (userId) {
      const withinLimit = await checkRateLimit(supabase, userId);
      if (!withinLimit) {
        return new Response(JSON.stringify({
          status: "failed", qr_type: "QR_EXTERNAL", scenario: "rate_limited",
          next_action: "wait", message: "Trop de scans. Attendez une minute.",
        } satisfies ScanResponse), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Detect + resolve
    const parsed = detectQRType(scanned_data);
    let response: ScanResponse;

    switch (parsed.type) {
      case "QR_COLIS":
        response = await resolveColisScenario(supabase, parsed, role, userId || "");
        break;
      case "QR_USER":
        response = await resolveUserScenario(supabase, parsed, role, userId || "");
        break;
      case "QR_GP":
        if (parsed.reference_id) {
          const { data: gpData } = await supabase.from("gp_profiles").select("user_id").eq("id", parsed.reference_id).maybeSingle();
          if (gpData) {
            const gpParsed = { ...parsed, type: "QR_USER" as QRType, reference_id: gpData.user_id };
            response = await resolveUserScenario(supabase, gpParsed, role, userId || "");
            response.qr_type = "QR_GP";
          } else {
            response = { status: "failed", qr_type: "QR_GP", scenario: "gp_not_found", next_action: "none", message: "Transporteur non trouvé." };
          }
        } else {
          response = { status: "failed", qr_type: "QR_GP", scenario: "invalid", next_action: "none", message: "QR GP invalide." };
        }
        break;
      case "QR_PAYMENT":
        response = await resolvePaymentScenario(supabase, parsed, role, userId || "");
        break;
      case "QR_ADJUSTMENT":
        response = await resolveAdjustmentScenario(supabase, parsed, role, userId || "");
        break;
      case "QR_CONFIRMATION":
        response = {
          status: "authorized", qr_type: "QR_CONFIRMATION",
          scenario: role === "client" ? "client_confirm_reception" : "view",
          next_action: role === "client" ? "confirm_reception" : "view",
          message: "Confirmez la réception de votre colis.",
          data: { reference_id: parsed.reference_id, redirect: `/confirm-reception?orderId=${parsed.reference_id}` },
        };
        break;
      default:
        response = await resolveExternalScenario(parsed, role);
        break;
    }

    // Log
    if (userId) {
      const idempotencyKey = generateIdempotencyKey(userId, parsed.type, parsed.reference_id, response.next_action);
      try {
        await supabase.from("scan_logs").insert({
          user_id: userId, user_role: role, action: response.next_action,
          scan_type: "engine", qr_type: parsed.type, reference_id: parsed.reference_id || null,
          order_id: response.data?.order?.id || null, engine_status: response.status,
          financial_impact: response.financial_impact || null, signature_valid: parsed.signature ? true : null,
          idempotency_key: idempotencyKey,
          metadata: { scenario: response.scenario, raw_length: scanned_data.length },
        });
      } catch { /* non-blocking log */ }
    }

    return new Response(JSON.stringify(response), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Scan engine error:", err);
    return new Response(JSON.stringify({
      status: "failed", qr_type: "QR_EXTERNAL", scenario: "engine_error",
      next_action: "none", message: "Erreur du moteur de scan. Réessayez.", error: String(err),
    } satisfies ScanResponse), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
