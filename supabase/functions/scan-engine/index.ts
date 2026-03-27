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
  | "confirm_reception"
  | "prepare_delivery";

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

// ═══════════════ STATUS RULES — Aligné avec State Machine V2 (Section VIII) ═══════════════

// États terminaux : aucune action possible
const TERMINAL_STATUSES = new Set(["released", "cancelled"]);

// Map état → actions autorisées par rôle (Section XI)
const STATUS_GP_ACTIONS: Record<string, string> = {
  pending:                "check_in",          // GP enregistre le dépôt
  accepted:               "check_in",
  paid_held:              "check_in",          // Escrow verrouillé → check-in possible
  checked_in:             "confirm_delivery",  // TEST PHASE: GP peut livrer dès J+1
  weight_pending_payment: "none",              // Attente paiement supplément client
  scheduled_departure:    "confirm_delivery",  // TEST PHASE: GP peut livrer dès départ programmé
  collected:              "confirm_delivery",  // TEST PHASE: GP peut livrer
  in_transit:             "confirm_delivery",  // En transit → livraison
  arrived_destination:    "confirm_delivery",  // Arrivé → livraison
  delivery_pending:       "confirm_delivery",
  delivery_confirmed:     "none",              // Code validé, release en cours
  delivered:              "none",
  released:               "none",
  cancelled:              "none",
  disputed:               "none",             // Bloqué par litige
};

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

  // 2. Simple prefix formats: USER:{uuid} and GP:{uuid}
  const userPrefixMatch = trimmed.match(/^USER:([a-f0-9-]{36})$/i);
  if (userPrefixMatch) return { type: "QR_USER", reference_id: userPrefixMatch[1], raw: trimmed };
  const gpPrefixMatch = trimmed.match(/^GP:([a-f0-9-]{36})$/i);
  if (gpPrefixMatch) return { type: "QR_GP", reference_id: gpPrefixMatch[1], raw: trimmed };

  // 3. CMD or ORD number (support both prefixes)
  if (/^(CMD|ORD)-[\dA-Za-z-]+$/i.test(trimmed)) {
    return { type: "QR_COLIS", raw: trimmed };
  }
  // 4. User URL
  const userUrlMatch = trimmed.match(/\/track\/user\/([a-f0-9-]{36})/i);
  if (userUrlMatch) return { type: "QR_USER", reference_id: userUrlMatch[1], raw: trimmed };
  // 5. Protocol
  const protocolMatch = trimmed.match(/konnekt:\/\/(?:user|gp)\/([a-f0-9-]{36})/i);
  if (protocolMatch) {
    const isGP = trimmed.includes("konnekt://gp/");
    return { type: isGP ? "QR_GP" : "QR_USER", reference_id: protocolMatch[1], raw: trimmed };
  }
  // 6. GP URL
  const gpUrlMatch = trimmed.match(/\/client\/transporteurs\/([a-f0-9-]{36})/i);
  if (gpUrlMatch) return { type: "QR_GP", reference_id: gpUrlMatch[1], raw: trimmed };
  // 7. UUID (full)
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)) {
    return { type: "QR_USER", reference_id: trimmed, raw: trimmed };
  }
  // 7b. Short UUID (first 8 chars) — lookup later in resolver
  if (/^[a-f0-9]{8}$/i.test(trimmed)) {
    return { type: "QR_USER", reference_id: trimmed, raw: trimmed, metadata: { short_id: true } };
  }
  // 8. URL — check if it's a Konnekt URL first
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    // Re-check Konnekt URLs that didn't match specific patterns above
    // Some native cameras add trailing slashes or query params
    const cleanUrl = trimmed.split("?")[0].replace(/\/$/, "");
    const userMatch = cleanUrl.match(/\/track\/user\/([a-f0-9-]{36})/i);
    if (userMatch) return { type: "QR_USER", reference_id: userMatch[1], raw: trimmed };
    const gpMatch = cleanUrl.match(/\/client\/transporteurs\/([a-f0-9-]{36})/i);
    if (gpMatch) return { type: "QR_GP", reference_id: gpMatch[1], raw: trimmed };
    const trackMatch = cleanUrl.match(/\/track\/([a-f0-9-]{36})/i);
    if (trackMatch) return { type: "QR_COLIS", reference_id: trackMatch[1], raw: trimmed };

    // Support /tracking?id={uuid} format used by OrderDetailSheet QR codes
    const trackingQueryMatch = trimmed.match(/\/tracking\?id=([a-f0-9-]{36})/i);
    if (trackingQueryMatch) return { type: "QR_COLIS", reference_id: trackingQueryMatch[1], raw: trimmed };

    // Support /order/{uuid}/qrcode format
    const orderPageMatch = trimmed.match(/\/order\/([a-f0-9-]{36})\/qrcode/i);
    if (orderPageMatch) return { type: "QR_COLIS", reference_id: orderPageMatch[1], raw: trimmed };

    // Support /public-tracking?order={uuid} format
    const publicTrackMatch = trimmed.match(/\/public-tracking\?order=([a-f0-9-]{36})/i);
    if (publicTrackMatch) return { type: "QR_COLIS", reference_id: publicTrackMatch[1], raw: trimmed };

    return { type: "QR_EXTERNAL", raw: trimmed, metadata: { is_url: true } };
  }
  // 9. Default
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
    .select("id, order_number, status, weight, total_price, currency, price_per_kg, client_id, gp_id, origin_city, destination_city, delivery_code, recipient_name, recipient_phone, recipient_user_id, financial_status, insurance_amount, weight_adjustment_count, delivery_attempt_count, delivery_blocked_until")
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

  // 5. Idempotency — Skip for actions that have their own guards (weight_modify has count limit, confirm_delivery has code check, prepare_delivery is idempotent by design)
  const skipIdempotency = ["weight_modify", "confirm_delivery", "prepare_delivery", "confirm_reception"].includes(action);
  if (!skipIdempotency) {
    const idempKey = generateIdempotencyKey(userId, "ACTION", orderId, action);
    const canProceed = await checkIdempotency(supabase, idempKey);
    if (!canProceed) {
      return {
        status: "failed", qr_type: "QR_COLIS", scenario: "duplicate_action",
        next_action: "none", message: "Cette action a déjà été effectuée sur cette commande.",
      };
    }
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
      result = await execConfirmDelivery(supabase, order, userId, role, actionData);
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
    case "prepare_delivery":
      result = await execPrepareDelivery(supabase, order, userId, role);
      break;
    default:
      result = {
        status: "failed", qr_type: "QR_COLIS", scenario: "invalid_action",
        next_action: "none", message: "Action non reconnue.",
      };
  }

  // 7. Mark idempotency + log
  if (result.status === "executed") {
    if (!skipIdempotency) {
      const idempKey = generateIdempotencyKey(userId, "ACTION", orderId, action);
      await markIdempotency(supabase, idempKey, { action, orderId, at: new Date().toISOString() });
    }

    try {
      const logIdempKey = skipIdempotency ? `${userId}:${action}:${orderId}:${Date.now()}` : generateIdempotencyKey(userId, "ACTION", orderId, action);
      await supabase.from("scan_logs").insert({
        user_id: userId, user_role: role, action,
        scan_type: "engine_action", qr_type: "QR_COLIS",
        order_id: orderId, engine_status: "executed",
        financial_impact: result.financial_impact || null,
        idempotency_key: logIdempKey,
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
  if (!["pending", "accepted", "paid_held", "collected"].includes(order.status)) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_status", next_action: "none", message: "Le dépôt n'est possible qu'en statut « En attente », « Acceptée » ou « Paiement reçu »." };
  }

  const actualWeight = actionData?.actual_weight || actionData?.weight || order.weight;
  const hasWeightChange = Math.abs(actualWeight - order.weight) > 0.01;
  const hasFlatRateChange = actionData?.flat_rate_items != null;

  if (hasWeightChange) {
    return execWeightModify(supabase, order, userId, role, { 
      actual_weight: actualWeight,
      ...(hasFlatRateChange ? { flat_rate_items: actionData.flat_rate_items, flat_rate_total: actionData.flat_rate_total, new_total_price: actionData.new_total_price } : {}),
    });
  }

  // Build update payload
  const updatePayload: Record<string, any> = { status: "checked_in", weight: actualWeight };

  // If flat rate items were modified by GP during deposit
  if (hasFlatRateChange) {
    const flatRateItems = actionData.flat_rate_items;
    const flatRateTotal = flatRateItems.reduce((s: number, it: any) => s + (it.price || 0) * (it.quantity || 0), 0);
    const kiloTotal = actualWeight * order.price_per_kg;
    const insuranceAmount = order.insurance_amount || 0;
    const newTotalPrice = kiloTotal + flatRateTotal + insuranceAmount;
    
    updatePayload.flat_rate_items = flatRateItems;
    updatePayload.total_price = newTotalPrice;
  }

  // Standard deposit: update status to checked_in (state machine V2)
  await supabase.from("orders").update(updatePayload).eq("id", order.id);
  await supabase.from("order_status_history").insert({
    order_id: order.id, status: "checked_in", changed_by: userId, changed_by_type: role,
    notes: `Dépôt confirmé par scan${hasFlatRateChange ? ' — articles forfaitaires modifiés' : ''} — check-in effectué`,
  });
  // Notification client: colis ENREGISTRÉ (pas livré)
  await supabase.from("notifications").insert({
    user_id: order.client_id, type: "order_update",
    title: "📦 Colis enregistré au dépôt", message: `Votre colis ${order.order_number} a été déposé et enregistré par le transporteur. Le départ sera automatique à l'heure prévue.`,
    related_type: "order", related_id: order.id,
  });

  return {
    status: "executed", qr_type: "QR_COLIS", scenario: "deposit_confirmed",
    next_action: "none", message: "✅ Dépôt confirmé. Colis enregistré (check-in). Le client a été notifié.",
    data: { order: { ...order, status: "checked_in", ...(hasFlatRateChange ? { flat_rate_items: actionData.flat_rate_items, total_price: updatePayload.total_price } : {}) } },
  };
}

async function execWeightModify(
  supabase: any, order: any, userId: string, role: string, actionData?: Record<string, any>
): Promise<ScanResponse> {
  if (!["pending", "accepted", "paid_held", "checked_in", "collected"].includes(order.status)) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_status", next_action: "none", message: "La modification de poids n'est possible qu'à l'étape de dépôt ou collecte." };
  }

  const rawWeight = actionData?.actual_weight;
  const actualWeight = typeof rawWeight === "string" ? parseFloat(rawWeight) : rawWeight;
  if (!actualWeight || typeof actualWeight !== "number" || isNaN(actualWeight) || actualWeight <= 0) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_data", next_action: "none", message: "Poids réel invalide." };
  }

  // Anti-fraud: max 50% variation
  const orderWeight = order.weight || 1;
  const maxVariation = orderWeight * 0.5;
  if (Math.abs(actualWeight - orderWeight) > maxVariation && orderWeight > 0) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "weight_abuse", next_action: "none", message: `Variation de poids trop importante (max ±50%). Contactez le support.` };
  }

  const basePricePerKg = order.price_per_kg || 0;
  const forfait23kg = Math.round(basePricePerKg * 23 * 0.85);
  
  // Calculate transport using GP pricing engine rules
  const oldPrice = order.total_price || 0;
  const previousWeight = Number(order.declared_weight ?? order.weight ?? 0);
  const previousTransportPrice = calculatePrice(previousWeight, {
    basePricePerKg,
    forfaitValise23kg: forfait23kg,
    currency: order.currency || "",
  });
  const newTransportPrice = calculatePrice(actualWeight, {
    basePricePerKg,
    forfaitValise23kg: forfait23kg,
    currency: order.currency || "",
  });

  // Recalculate total: transport + insurance + logistics (insurance/logistics stay the same)
  const insuranceAmount = order.insurance_amount || 0;
  // Load logistics
  const { data: logOpts } = await supabase
    .from("order_logistics_options")
    .select("pickup_price, delivery_price, pickup_enabled, delivery_enabled")
    .eq("order_id", order.id)
    .maybeSingle();
  const logisticsTotal = logOpts
    ? ((logOpts.pickup_enabled ? (logOpts.pickup_price || 0) : 0) + (logOpts.delivery_enabled ? (logOpts.delivery_price || 0) : 0))
    : 0;

  const newTotalPrice = oldPrice + (newTransportPrice - previousTransportPrice);
  const priceDiff = newTransportPrice - previousTransportPrice;

  // Update order with ACTUAL weight, total_price, and status
  const updateData: Record<string, any> = {
    weight: actualWeight,
    declared_weight: actualWeight,
    total_price: newTotalPrice,
    weight_tier_applied: actualWeight.toString(),
    weight_adjustment_count: (order.weight_adjustment_count || 0) + 1,
  };
  
  if (priceDiff > 0) {
    // Supplement required → block transit
    updateData.status = "weight_pending_payment";
    updateData.financial_status = "adjustment_required";
    updateData.adjustment_amount = priceDiff;
  }
  
  const { error: updateError } = await supabase.from("orders").update(updateData).eq("id", order.id);
  if (updateError) {
    console.error("Weight modify order update error:", updateError);
    return { status: "failed", qr_type: "QR_COLIS", scenario: "engine_error", next_action: "none", message: "Erreur lors de la mise à jour du poids. Réessayez." };
  }

  // Update escrow if exists
  const { data: escrow } = await supabase
    .from("escrow_transactions")
    .select("id, amount, commission_amount")
    .eq("order_id", order.id)
    .eq("status", "held")
    .maybeSingle();

  if (escrow) {
    const newEscrowAmount = priceDiff > 0 ? escrow.amount + priceDiff : Math.max(0, escrow.amount + priceDiff);
    const newCommission = Math.ceil(newTransportPrice * 0.05);
    const newNetGP = newTransportPrice - newCommission;

    await supabase.from("escrow_transactions").update({
      amount: newEscrowAmount,
      commission_amount: newCommission,
      net_to_gp: newNetGP,
      updated_at: new Date().toISOString(),
    }).eq("id", escrow.id);

    await supabase.from("escrow_logs").insert({
      order_id: order.id,
      action: "weight_adjusted",
      previous_amount: escrow.amount,
      new_amount: newEscrowAmount,
      commission_amount: newCommission,
      actor: `${role}:${userId}`,
    });
  }

  // Update TVA record if exists
  const newCommissionForTVA = Math.max(Math.ceil(newTransportPrice * 0.05), 1000);
  const tvaRate = 18;
  const tvaAmountFCFA = Math.round(newCommissionForTVA * tvaRate / (100 + tvaRate));
  const commissionHTFCFA = newCommissionForTVA - tvaAmountFCFA;
  await supabase.from("tva_records").update({
    commission_amount_fcfa: newCommissionForTVA,
    tva_amount_fcfa: tvaAmountFCFA,
    commission_ht_fcfa: commissionHTFCFA,
    tva_amount_display: tvaAmountFCFA,
    commission_ht_display: commissionHTFCFA,
  }).eq("order_id", order.id);

  // Refund client if weight decreased
  if (priceDiff < 0) {
    const credit = Math.abs(priceDiff);
    const { data: cw } = await supabase.from("client_wallets")
      .select("available_balance, escrow_balance")
      .eq("user_id", order.client_id)
      .maybeSingle();
    if (cw) {
      await supabase.from("client_wallets").update({
        available_balance: cw.available_balance + credit,
        escrow_balance: Math.max(0, cw.escrow_balance - credit),
        updated_at: new Date().toISOString(),
      }).eq("user_id", order.client_id);
    }
  }

  // Weight adjustment log (best-effort, ignore errors if table doesn't exist)
  try {
    await supabase.from("weight_adjustment_log").insert({
      order_id: order.id,
      actor_id: userId,
      actor_role: role,
      original_weight: order.weight,
      declared_weight: actualWeight,
      delta_amount: priceDiff,
      blocked: false,
    });
  } catch (_e) { /* ignore */ }
  
  await supabase.from("order_status_history").insert({
    order_id: order.id, status: priceDiff > 0 ? "weight_pending_payment" : order.status, changed_by: userId, changed_by_type: role,
    notes: `⚠️ POIDS MODIFIÉ: ${order.weight} kg → ${actualWeight} kg. Diff prix: ${priceDiff > 0 ? "+" : ""}${priceDiff} ${order.currency}`,
  });
  
  await supabase.from("notifications").insert({
    user_id: order.client_id, type: "weight_validation_required",
    title: priceDiff > 0 ? "⚠️ Supplément de poids requis" : "ℹ️ Poids modifié",
    message: priceDiff > 0 
      ? `Le poids de votre colis ${order.order_number} a été ajusté de ${order.weight}kg à ${actualWeight}kg. Un supplément de ${priceDiff.toLocaleString()} ${order.currency} est requis pour continuer.`
      : `Le poids de votre colis ${order.order_number} a été ajusté de ${order.weight}kg à ${actualWeight}kg.`,
    related_type: "order", related_id: order.id,
  });

  return {
    status: "executed", qr_type: "QR_COLIS", scenario: "weight_modified",
    next_action: priceDiff > 0 ? "await_client_payment" : "none", 
    message: priceDiff > 0 
      ? `⚠️ Poids modifié — supplément de ${priceDiff.toLocaleString()} ${order.currency} requis. Le client doit payer pour débloquer.`
      : "✅ Poids modifié — aucun supplément requis.",
    data: { order: { ...order, weight: actualWeight, total_price: newTotalPrice }, declared_weight: order.weight, actual_weight: actualWeight, price_diff: priceDiff, new_total: newTotalPrice },
    financial_impact: priceDiff !== 0 ? { amount: Math.abs(priceDiff), currency: order.currency, type: "adjustment" } : null,
  };
}

async function execMarkTransit(
  supabase: any, order: any, userId: string, role: string
): Promise<ScanResponse> {
  // Accept both checked_in and collected (legacy) for transit transition
  if (!["checked_in", "collected", "scheduled_departure"].includes(order.status)) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_status", next_action: "none", message: "Le colis doit être « Déposé/Collecté » pour passer en transit." };
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

async function execPrepareDelivery(
  supabase: any, order: any, userId: string, role: string
): Promise<ScanResponse> {
  // TEST PHASE: allow prepare_delivery from checked_in/scheduled_departure (J+1)
  const validStates = ["arrived_destination", "in_transit", "checked_in", "scheduled_departure", "collected"];
  if (!validStates.includes(order.status)) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_status", next_action: "none", message: "Le colis doit être enregistré ou en transit pour préparer la livraison." };
  }

  // Generate delivery code if not exists
  let deliveryCode = order.delivery_code;
  if (!deliveryCode) {
    deliveryCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await supabase.from("orders").update({ delivery_code: deliveryCode, status: "delivery_pending" }).eq("id", order.id);
  } else {
    await supabase.from("orders").update({ status: "delivery_pending" }).eq("id", order.id);
  }

  // Notify client + recipient — persistent delivery code notification
  await supabase.from("notifications").insert({
    user_id: order.client_id, type: "delivery_code",
    title: "Code de livraison", message: `Votre code pour ${order.order_number} : ${deliveryCode}. Communiquez-le au transporteur.`,
    related_type: "order", related_id: order.id,
    persistent: true,
  });
  if (order.recipient_user_id && order.recipient_user_id !== order.client_id) {
    await supabase.from("notifications").insert({
      user_id: order.recipient_user_id, type: "delivery_code",
      title: "Code de livraison", message: `Code pour ${order.order_number} : ${deliveryCode}. Donnez-le au livreur.`,
      related_type: "order", related_id: order.id,
      persistent: true,
    });
  }

  await supabase.from("order_status_history").insert({
    order_id: order.id, status: "delivery_pending", changed_by: userId, changed_by_type: role,
    notes: "📦 Livraison préparée — code envoyé au client/destinataire",
  });

  return {
    status: "executed", qr_type: "QR_COLIS", scenario: "delivery_prepared",
    next_action: "confirm_delivery", message: "✅ Code envoyé. Demandez-le au client pour confirmer.",
    data: { order: { ...order, status: "delivery_pending", delivery_code: deliveryCode }, delivery_code_sent: true },
  };
}

async function execConfirmDelivery(
  supabase: any, order: any, userId: string, role: string, actionData?: Record<string, any>
): Promise<ScanResponse> {
  // États valides : TEST PHASE — GP peut livrer dès checked_in (J+1 après dépôt)
  const validStates = ["checked_in", "scheduled_departure", "in_transit", "arrived_destination", "delivery_pending", "collected", "arrived"];
  
  // Si déjà confirmé, retourner succès (idempotent)
  if (order.status === "delivery_confirmed" || order.status === "delivered" || order.status === "released") {
    return {
      status: "executed", qr_type: "QR_COLIS", scenario: "delivery_already_confirmed",
      next_action: "none", message: "🎉 Livraison déjà confirmée. Fonds en cours de libération.",
      data: { order },
    };
  }
  
  if (!validStates.includes(order.status)) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_status", next_action: "none", message: "Le colis doit être au moins enregistré pour confirmer la livraison." };
  }

  // Vérifier supplément impayé — bloquer livraison
  if (order.financial_status === "adjustment_required") {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "supplement_unpaid", next_action: "await_payment", message: "⚠️ Supplément de poids impayé. Le client doit régler avant livraison." };
  }

  // Valider code livraison (brute force géré dans security-qr-verify)
  if (order.delivery_code) {
    const providedCode = actionData?.delivery_code;
    if (!providedCode) {
      return { status: "failed", qr_type: "QR_COLIS", scenario: "code_required", next_action: "enter_code", message: "Un code de livraison est requis. Demandez-le au client." };
    }
    if (providedCode.toUpperCase() !== order.delivery_code.toUpperCase()) {
      // Incrémenter le compteur d'échecs
      await supabase.from("orders").update({
        delivery_attempt_count: (order.delivery_attempt_count || 0) + 1,
        delivery_blocked_until: (order.delivery_attempt_count || 0) >= 2
          ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
          : null,
      }).eq("id", order.id);
      try {
        await supabase.rpc("log_delivery_attempt_failed", {
          p_order_id: order.id, p_actor_id: userId, p_attempt_count: (order.delivery_attempt_count || 0) + 1,
        });
      } catch (_e) { /* ignore */ }
      return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_code", next_action: "retry_code", message: "Code de livraison incorrect. Vérifiez et réessayez." };
    }
    // Code correct → réinitialiser compteur
    await supabase.from("orders").update({ delivery_attempt_count: 0, delivery_blocked_until: null }).eq("id", order.id);
  }

  const now = new Date().toISOString();
  // Passer à delivery_confirmed (state machine V2)
  await supabase.from("orders").update({ status: "delivery_confirmed", actual_delivery_date: now }).eq("id", order.id);

  // Update logistics if exists
  try {
    await supabase.from("order_logistics_options").update({
      delivery_status: "delivered", delivery_completed_at: now, logistics_status: "completed",
    }).eq("order_id", order.id);
  } catch (_e) { /* ignore */ }

  await supabase.from("order_status_history").insert({
    order_id: order.id, status: "delivery_confirmed", changed_by: userId, changed_by_type: role,
    notes: `🎉 Livraison confirmée par scan QR (${role}) — code validé`,
  });
  await supabase.from("notifications").insert({
    user_id: order.client_id, type: "order_update",
    title: "🎉 Colis livré !", message: `Votre colis ${order.order_number} a été livré. Fonds en cours de libération.`,
    related_type: "order", related_id: order.id,
  });

  // ── Déclencher release-funds-v2 (unique point de release) ────────
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceKey) {
      const idempKey = `delivery_release:${order.id}`;
      await fetch(`${supabaseUrl}/functions/v1/release-funds-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({ order_id: order.id, idempotency_key: idempKey }),
      }).catch((e) => console.error("release-funds-v2 call failed:", e));
    }
  } catch (e) { console.error("Release trigger error:", e); }

  return {
    status: "executed", qr_type: "QR_COLIS", scenario: "delivery_confirmed",
    next_action: "none", message: "🎉 Livraison confirmée. Fonds en cours de libération.",
    data: { order: { ...order, status: "delivery_confirmed" } },
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
  // États valides pour réception client (V2)
  const validStates = ["in_transit", "arrived_destination", "delivery_pending", "arrived", "delivered"];
  if (!validStates.includes(order.status)) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_status", next_action: "none", message: "La confirmation de réception n'est possible que pour un colis en transit ou arrivé." };
  }

  // Code de livraison obligatoire si défini
  if (order.delivery_code) {
    const providedCode = actionData?.delivery_code;
    if (!providedCode) {
      return { status: "failed", qr_type: "QR_COLIS", scenario: "code_required", next_action: "enter_code", message: "Saisissez le code de livraison fourni par votre transporteur." };
    }
    if (providedCode.toUpperCase() !== order.delivery_code.toUpperCase()) {
      return { status: "failed", qr_type: "QR_COLIS", scenario: "invalid_code", next_action: "retry_code", message: "Code de livraison incorrect." };
    }
  }

  const now = new Date().toISOString();

  // → delivery_confirmed (si pas déjà livré)
  if (!["delivered", "delivery_confirmed"].includes(order.status)) {
    await supabase.from("orders").update({ status: "delivery_confirmed", actual_delivery_date: now }).eq("id", order.id);
  }

  // Enregistrer confirmation physique
  try {
    await supabase.from("delivery_confirmations").insert({
      order_id: order.id,
      confirmed_by_phone: actionData?.phone || "app",
      confirmed_by_name: actionData?.name || null,
      created_user_id: userId,
    });
  } catch (_e) { /* ignore */ }

  await supabase.from("order_status_history").insert({
    order_id: order.id, status: "delivery_confirmed", changed_by: userId, changed_by_type: "client",
    notes: "✅ Réception confirmée par le client via scan",
  });

  // ── Déclencher release-funds-v2 (unique point de release) ────────
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceKey) {
      const idempKey = `client_reception_release:${order.id}`;
      await fetch(`${supabaseUrl}/functions/v1/release-funds-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({ order_id: order.id, idempotency_key: idempKey }),
      }).catch((e) => console.error("release-funds-v2 call failed:", e));
    }
  } catch (e) { console.error("Release trigger error:", e); }

  return {
    status: "executed", qr_type: "QR_COLIS", scenario: "reception_confirmed",
    next_action: "none", message: "✅ Réception confirmée. Fonds en cours de libération.",
    data: { order: { ...order, status: "delivery_confirmed" } },
    financial_impact: { amount: order.total_price, currency: order.currency, type: "escrow_release" },
  };
}


// ═══════════════ CROSS-MODULE COHERENCE VALIDATOR ═══════════════
//
// Section X — Interconnexions & Tests Croisés
// Vérifie la cohérence entre State ↔ Escrow ↔ Dispute ↔ Geo
// Appelé à chaque RESOLVE pour garantir la synchronisation totale.
//
// Retourne un tableau de violations détectées.
// Une violation "critical" bloque la réponse et retourne un scénario d'erreur.

interface CoherenceViolation {
  code: string;
  severity: "warn" | "critical";
  message: string;
  details?: Record<string, any>;
}

async function validateCrossModuleCoherence(
  supabase: any,
  orderId: string,
  role: UserRole
): Promise<CoherenceViolation[]> {
  const violations: CoherenceViolation[] = [];

  // Charger les données de tous les modules en parallèle
  const [orderRes, escrowRes, disputeRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, financial_status, geo_suspicious, delivery_blocked_until, delivery_attempt_count")
      .eq("id", orderId)
      .maybeSingle(),
    supabase
      .from("escrow_transactions")
      .select("id, status, amount, released_at")
      .eq("order_id", orderId)
      .maybeSingle(),
    supabase
      .from("disputes")
      .select("id, status")
      .eq("order_id", orderId)
      .in("status", ["open", "under_review", "awaiting_response"])
      .limit(1),
  ]);

  const order = orderRes.data;
  const escrow = escrowRes.data;
  const disputes = disputeRes.data || [];

  if (!order) return violations; // Pas de commande à valider

  // ── RÈGLE 1 : Escrow released ↔ State released ──────────────────
  // Les deux doivent évoluer ensemble (Section VIII §10)
  if (escrow) {
    if (escrow.status === "released" && order.status !== "released" && order.financial_status !== "completed") {
      violations.push({
        code: "ESCROW_STATE_DESYNC",
        severity: "critical",
        message: "Escrow libéré mais commande pas en état 'released'. Incohérence critique.",
        details: { order_status: order.status, escrow_status: escrow.status },
      });
    }

    if (order.status === "released" && escrow.status !== "released") {
      violations.push({
        code: "STATE_ESCROW_DESYNC",
        severity: "critical",
        message: "Commande 'released' mais escrow pas libéré. Incohérence critique.",
        details: { order_status: order.status, escrow_status: escrow.status },
      });
    }

    // ── RÈGLE 2 : Release impossible si litige ouvert ─────────────
    // (Section IX §12)
    if (disputes.length > 0 && escrow.status === "released") {
      violations.push({
        code: "RELEASE_DURING_DISPUTE",
        severity: "critical",
        message: "Fonds libérés malgré un litige ouvert. Audit requis.",
        details: { dispute_count: disputes.length },
      });
    }

    // ── RÈGLE 3 : Supplément bloqué → pas de transit ──────────────
    // (Section X §4 — Cas 1)
    if (order.financial_status === "adjustment_required" &&
        ["in_transit", "delivery_confirmed", "delivered", "released"].includes(order.status)) {
      violations.push({
        code: "SUPPLEMENT_BYPASS",
        severity: "critical",
        message: "Commande en transit/livrée avec supplément impayé. Anti-bypass déclenché.",
        details: { financial_status: order.financial_status, order_status: order.status },
      });
    }
  }

  // ── RÈGLE 4 : Litige → aucune action de livraison possible ───────
  // (Section IX §12 & Section X §8 Scénario D)
  if (disputes.length > 0) {
    const blockingStatuses = ["delivery_confirmed", "delivered", "released"];
    if (blockingStatuses.includes(order.status)) {
      violations.push({
        code: "DELIVERY_DURING_DISPUTE",
        severity: "warn",
        message: "Livraison confirmée malgré litige en cours. Vérifier la chronologie.",
        details: { dispute_ids: disputes.map((d: any) => d.id) },
      });
    }
  }

  // ── RÈGLE 5 : Geo suspicious → alerte scan ────────────────────────
  // (Section IX §8 & Section X §5)
  if (order.geo_suspicious && role === "gp") {
    violations.push({
      code: "GEO_SUSPICIOUS_ACTIVE",
      severity: "warn",
      message: "Anomalie géographique détectée sur cette commande.",
      details: { geo_suspicious: true },
    });
  }

  // ── RÈGLE 6 : Code livraison bloqué → pas de delivery ─────────
  // (Section IX §6 & Section X §6)
  if (order.delivery_blocked_until && new Date(order.delivery_blocked_until) > new Date()) {
    const remainingMin = Math.ceil((new Date(order.delivery_blocked_until).getTime() - Date.now()) / 60000);
    violations.push({
      code: "DELIVERY_CODE_BLOCKED",
      severity: "critical",
      message: `Code de livraison bloqué suite à 3 tentatives. Réessayez dans ${remainingMin} min.`,
      details: {
        blocked_until: order.delivery_blocked_until,
        attempt_count: order.delivery_attempt_count,
      },
    });
  }

  // ── LOG des violations critiques dans security_audit_log ─────────
  const criticals = violations.filter((v) => v.severity === "critical");
  if (criticals.length > 0) {
    try {
      await supabase.from("security_audit_log").insert(
        criticals.map((v) => ({
          event_type: "coherence_violation",
          order_id: orderId,
          details: { code: v.code, message: v.message, ...v.details },
          severity: "critical",
        }))
      );
    } catch (_e) { /* ignore */ }
  }

  return violations;
}

// Helper : Construire une réponse bloquée depuis une violation critique
function buildViolationResponse(violations: CoherenceViolation[]): ScanResponse | null {
  const critical = violations.find((v) => v.severity === "critical");
  if (!critical) return null;

  const codeToScenario: Record<string, string> = {
    ESCROW_STATE_DESYNC: "engine_error",
    STATE_ESCROW_DESYNC: "engine_error",
    RELEASE_DURING_DISPUTE: "unauthorized",
    SUPPLEMENT_BYPASS: "unauthorized",
    DELIVERY_CODE_BLOCKED: "rate_limited",
    DELIVERY_DURING_DISPUTE: "unauthorized",
  };

  return {
    status: "failed",
    qr_type: "QR_COLIS",
    scenario: codeToScenario[critical.code] || "engine_error",
    next_action: "none",
    message: critical.message,
    data: { violation_code: critical.code, details: critical.details },
  };
}

// ═══════════════ SCENARIO RESOLVERS (READ-ONLY) ═══════════════

async function resolveColisScenario(supabase: any, parsed: ParsedQR, role: UserRole, userId: string): Promise<ScanResponse> {
  let orderQuery = supabase.from("orders").select(
    "id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id, financial_status"
  );

  if (parsed.reference_id && /^[a-f0-9-]{36}$/i.test(parsed.reference_id)) {
    orderQuery = orderQuery.eq("id", parsed.reference_id);
  } else if (parsed.reference_id) {
    orderQuery = orderQuery.eq("order_number", parsed.reference_id);
  } else {
    orderQuery = orderQuery.or(`order_number.eq.${parsed.raw},tracking_code.eq.${parsed.raw}`);
  }

  const { data: order, error } = await orderQuery.maybeSingle();
  if (error || !order) {
    return { status: "failed", qr_type: "QR_COLIS", scenario: "order_not_found", next_action: "retry", message: "Commande non trouvée. Vérifiez le code et réessayez." };
  }

  // ── Section X : Validation cross-module obligatoire ──────────────
  // Vérifie cohérence State ↔ Escrow ↔ Dispute ↔ Geo avant toute réponse
  if (role !== "external") {
    const violations = await validateCrossModuleCoherence(supabase, order.id, role);
    const violationResponse = buildViolationResponse(violations);
    if (violationResponse) return violationResponse;

    // Ajouter les warnings non-bloquants aux données de réponse
    const warns = violations.filter((v) => v.severity === "warn");
    if (warns.length > 0) {
      order._coherence_warnings = warns.map((w) => ({ code: w.code, message: w.message }));
    }
  }

  if (role === "gp") {
    const { data: gpProfile } = await supabase.from("gp_profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!gpProfile || gpProfile.id !== order.gp_id) {
      return { status: "failed", qr_type: "QR_COLIS", scenario: "unauthorized", next_action: "none", message: "Ce colis n'est pas associé à votre profil." };
    }

    // ── Auto-send delivery code when GP scans a delivery-ready order ──
    // If status is arrived/delivery_pending, auto-generate code and notify client+recipient
    // TEST PHASE: auto-send delivery code from checked_in+ (J+1)
    const deliveryReadyStatuses = ["checked_in", "scheduled_departure", "collected", "in_transit", "arrived_destination", "delivery_pending"];
    if (deliveryReadyStatuses.includes(order.status)) {
      let deliveryCode = order.delivery_code;
      
      if (!deliveryCode) {
        // Generate 6-char code
        deliveryCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await supabase.from("orders").update({ delivery_code: deliveryCode }).eq("id", order.id);
        order.delivery_code = deliveryCode;
      }

      // Check if we already sent notification for this code (avoid spam on repeated scans)
      const { count: alreadyNotified } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("related_id", order.id)
        .eq("type", "delivery_code")
        .gte("created_at", new Date(Date.now() - 3600000).toISOString()); // last hour

      if (!alreadyNotified || alreadyNotified === 0) {
        // Notify client
        await supabase.from("notifications").insert({
          user_id: order.client_id,
          type: "delivery_code",
          title: "🔑 Code de livraison",
          message: `Votre code de livraison pour ${order.order_number} est : ${deliveryCode}. Communiquez-le au transporteur pour recevoir votre colis.`,
          related_type: "order",
          related_id: order.id,
        });

        // Notify recipient if different from client
        if (order.recipient_user_id && order.recipient_user_id !== order.client_id) {
          await supabase.from("notifications").insert({
            user_id: order.recipient_user_id,
            type: "delivery_code",
            title: "🔑 Code de livraison",
            message: `Code pour recevoir le colis ${order.order_number} : ${deliveryCode}. Donnez-le au livreur.`,
            related_type: "order",
            related_id: order.id,
          });
        }
      }
    }

    // Map état → action GP (aligné avec state machine V2)
    // TEST PHASE: checked_in, scheduled_departure, collected → delivery possible (J+1)
    const gpActionMap: Record<string, { scenario: string; next_action: string; message: string }> = {
      pending:                { scenario: "gp_deposit",   next_action: "deposit_confirm",  message: "Vérifiez le poids et confirmez le dépôt." },
      accepted:               { scenario: "gp_deposit",   next_action: "deposit_confirm",  message: "Vérifiez le poids et confirmez le dépôt." },
      paid_held:              { scenario: "gp_deposit",   next_action: "deposit_confirm",  message: "Paiement reçu. Procédez au check-in." },
      checked_in:             { scenario: "gp_delivery",  next_action: "confirm_delivery", message: "📦 Colis enregistré. Code envoyé — saisissez-le pour livrer." },
      weight_pending_payment: { scenario: "gp_blocked",   next_action: "none",             message: "⚠️ En attente du paiement supplément par le client." },
      scheduled_departure:    { scenario: "gp_delivery",  next_action: "confirm_delivery", message: "🛫 Départ programmé. Code envoyé — saisissez-le pour livrer." },
      collected:              { scenario: "gp_delivery",  next_action: "confirm_delivery", message: "📦 Colis collecté. Code envoyé — saisissez-le pour livrer." },
      in_transit:             { scenario: "gp_delivery",  next_action: "confirm_delivery", message: "🚚 En transit. Code envoyé au client. Saisissez-le pour confirmer." },
      arrived_destination:    { scenario: "gp_delivery",  next_action: "confirm_delivery", message: "✈️ Arrivé. Code envoyé au client/destinataire. Demandez-le pour livrer." },
      delivery_pending:       { scenario: "gp_delivery",  next_action: "confirm_delivery", message: "📦 Code envoyé. Saisissez le code du client pour confirmer la livraison." },
      delivery_confirmed:     { scenario: "gp_released",  next_action: "none",             message: "✅ Livraison confirmée. Paiement en cours de libération." },
      delivered:              { scenario: "gp_completed", next_action: "none",             message: "🎉 Colis livré. Aucune action disponible." },
      released:               { scenario: "gp_paid",      next_action: "none",             message: "💰 Paiement reçu sur votre wallet." },
      cancelled:              { scenario: "gp_cancelled", next_action: "none",             message: "❌ Commande annulée." },
      disputed:               { scenario: "gp_disputed",  next_action: "none",             message: "⚠️ Litige en cours. Contactez le support Konnekt." },
    };

    const action = gpActionMap[order.status] || { scenario: "gp_view", next_action: "view", message: "Consultez les détails du colis." };

    return {
      status: "authorized", qr_type: "QR_COLIS", ...action,
      data: { order, financial_status: order.financial_status, delivery_code_sent: deliveryReadyStatuses.includes(order.status) },
      financial_impact: order.total_price ? { amount: order.total_price, currency: order.currency, type: "escrow" } : null,
    };
  }

  if (role === "client") {
    if (order.client_id !== userId && order.recipient_user_id !== userId) {
      return { status: "failed", qr_type: "QR_COLIS", scenario: "unauthorized", next_action: "none", message: "Ce colis ne vous appartient pas." };
    }

    // États où le client peut confirmer la réception (V2)
    const clientCanConfirm = ["in_transit", "arrived_destination", "delivery_pending", "arrived", "delivered", "delivery_confirmed"].includes(order.status);
    // Supplément à payer ?
    const needsPayment = order.financial_status === "adjustment_required";

    return {
      status: "authorized", qr_type: "QR_COLIS",
      scenario: needsPayment ? "client_pay_supplement" : (clientCanConfirm ? "client_confirm_reception" : "client_view"),
      next_action: needsPayment ? "pay_supplement" : (clientCanConfirm ? "confirm_reception" : "view"),
      message: needsPayment
        ? "⚠️ Un supplément de poids est dû. Réglez pour débloquer la livraison."
        : (clientCanConfirm ? "Votre colis est arrivé. Confirmez la réception." : `Statut actuel : ${order.status}`),
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

  let scannedUserId = parsed.reference_id;

  // Short ID resolution: if 8 chars, lookup by prefix in profiles
  if (parsed.metadata?.short_id || /^[a-f0-9]{8}$/i.test(scannedUserId)) {
    const prefix = scannedUserId.toLowerCase();
    const { data: matches } = await supabase
      .from("profiles")
      .select("user_id")
      .like("user_id", `${prefix}%`)
      .limit(2);
    
    if (matches && matches.length === 1) {
      scannedUserId = matches[0].user_id;
    } else if (!matches || matches.length === 0) {
      return { status: "failed", qr_type: "QR_USER", scenario: "user_not_found", next_action: "none", message: "Aucun utilisateur trouvé avec cet identifiant court." };
    } else {
      return { status: "failed", qr_type: "QR_USER", scenario: "invalid", next_action: "none", message: "ID ambigu. Utilisez l'identifiant complet." };
    }
  }
  
  // Try profiles table first
  let { data: profile } = await supabase.from("profiles").select("user_id, full_name, avatar_url, city").eq("user_id", scannedUserId).maybeSingle();

  // Fallback: if no profile row, fetch from auth.users via admin and auto-create profile
  if (!profile) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    
    const { data: authData } = await adminClient.auth.admin.getUserById(scannedUserId);
    if (!authData?.user) {
      return { status: "failed", qr_type: "QR_USER", scenario: "user_not_found", next_action: "none", message: "Utilisateur non trouvé." };
    }
    
    const meta = authData.user.user_metadata || {};
    const fullName = meta.full_name || meta.name || authData.user.email?.split("@")[0] || "Utilisateur";
    
    // Auto-create profile for future scans
    try {
      await supabase.from("profiles").upsert({
        user_id: scannedUserId,
        email: authData.user.email,
        full_name: fullName,
      }, { onConflict: "user_id" });
    } catch { /* ignore */ }
    
    profile = { user_id: scannedUserId, full_name: fullName, avatar_url: null, city: null };
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
        .in("status", ["pending", "accepted", "collected", "paid_held", "checked_in", "weight_pending_payment", "scheduled_departure", "in_transit", "arrived_destination", "delivery_pending"]).limit(10);

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const body: ScanRequest = await req.json();

    // Auth — use anon client only for auth.getUser(), then service role for all DB queries
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let role: UserRole = body.role || "external";

    // Service role client for all DB operations (bypasses RLS for cross-role scan resolution)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (authHeader?.startsWith("Bearer ")) {
      // Use anon client with user's token ONLY to validate their identity
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();
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
        status: 200,
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
