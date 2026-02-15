/**
 * KONNEKT SCAN ENGINE — Unified Backend Resolver
 * 
 * POST /scan-engine
 * 
 * Receives: { scanned_data, user_id?, role? }
 * Returns: { status, qr_type, scenario, next_action, message, financial_impact, data }
 * 
 * State Machine: SCANNED → VALIDATED → AUTHORIZED → EXECUTED | FAILED
 * 
 * This engine handles ALL scan scenarios:
 * - QR_COLIS: Order/parcel QR
 * - QR_USER / QR_GP: User identity QR  
 * - QR_PAYMENT: Payment verification
 * - QR_ADJUSTMENT: Weight adjustment
 * - QR_EXTERNAL: Unknown/external QR
 * - QR_ADMIN: Admin operations
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

interface ScanRequest {
  scanned_data: string;
  role?: UserRole;
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

  // 1. Try JSON parse (structured Konnekt QR)
  try {
    const json = JSON.parse(trimmed);
    if (json.type && json.reference_id) {
      const typeMap: Record<string, QRType> = {
        order: "QR_COLIS",
        colis: "QR_COLIS",
        user: "QR_USER",
        gp_profile: "QR_GP",
        payment: "QR_PAYMENT",
        adjustment: "QR_ADJUSTMENT",
        confirmation: "QR_CONFIRMATION",
        admin: "QR_ADMIN",
        mission: "QR_MISSION",
      };
      return {
        type: typeMap[json.type] || "QR_EXTERNAL",
        reference_id: json.reference_id || json.gp_id || json.id,
        raw: trimmed,
        signature: json.signature,
        timestamp: json.timestamp,
        metadata: json,
      };
    }
    // GP profile QR (from GPScanPage)
    if (json.type === "gp_profile" && json.gp_id) {
      return {
        type: "QR_GP",
        reference_id: json.gp_id,
        raw: trimmed,
        metadata: json,
      };
    }
  } catch {
    // Not JSON, continue
  }

  // 2. Order number: CMD-XXXXXXXX
  const cmdMatch = trimmed.match(/^CMD-[\dA-Z-]+$/i);
  if (cmdMatch) {
    return { type: "QR_COLIS", raw: trimmed };
  }

  // 3. User URL: /track/user/{uuid}
  const userUrlMatch = trimmed.match(/\/track\/user\/([a-f0-9-]{36})/i);
  if (userUrlMatch) {
    return { type: "QR_USER", reference_id: userUrlMatch[1], raw: trimmed };
  }

  // 4. Protocol: konnekt://user/{uuid}
  const protocolMatch = trimmed.match(/konnekt:\/\/user\/([a-f0-9-]{36})/i);
  if (protocolMatch) {
    return { type: "QR_USER", reference_id: protocolMatch[1], raw: trimmed };
  }

  // 5. GP profile URL: /client/transporteurs/{uuid}
  const gpUrlMatch = trimmed.match(/\/client\/transporteurs\/([a-f0-9-]{36})/i);
  if (gpUrlMatch) {
    return { type: "QR_GP", reference_id: gpUrlMatch[1], raw: trimmed };
  }

  // 6. Raw UUID — could be user or GP
  const uuidMatch = trimmed.match(
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
  );
  if (uuidMatch) {
    return { type: "QR_USER", reference_id: trimmed, raw: trimmed };
  }

  // 7. URL — external
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { type: "QR_EXTERNAL", raw: trimmed, metadata: { is_url: true } };
  }

  // 8. Default: external/unknown
  return { type: "QR_EXTERNAL", raw: trimmed };
}

// ═══════════════ RATE LIMITING ═══════════════

async function checkRateLimit(
  supabase: any,
  userId: string
): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  const { count } = await supabase
    .from("scan_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneMinuteAgo);

  return (count || 0) < 30; // Max 30 scans per minute
}

// ═══════════════ IDEMPOTENCY ═══════════════

function generateIdempotencyKey(
  userId: string,
  qrType: string,
  referenceId: string | undefined,
  action: string
): string {
  return `${userId}:${qrType}:${referenceId || "none"}:${action}`;
}

// ═══════════════ SCENARIO RESOLVERS ═══════════════

async function resolveColisScenario(
  supabase: any,
  parsed: ParsedQR,
  role: UserRole,
  userId: string
): Promise<ScanResponse> {
  // Find order by CMD number or reference_id
  let orderQuery = supabase
    .from("orders")
    .select(
      "id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id, financial_status"
    );

  if (parsed.reference_id) {
    orderQuery = orderQuery.eq("id", parsed.reference_id);
  } else {
    orderQuery = orderQuery.or(
      `order_number.eq.${parsed.raw},tracking_code.eq.${parsed.raw}`
    );
  }

  const { data: order, error } = await orderQuery.maybeSingle();
  if (error || !order) {
    return {
      status: "failed",
      qr_type: "QR_COLIS",
      scenario: "order_not_found",
      next_action: "retry",
      message: "Commande non trouvée. Vérifiez le code et réessayez.",
    };
  }

  // Role-specific scenarios
  if (role === "gp") {
    // Verify GP owns this order
    const { data: gpProfile } = await supabase
      .from("gp_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!gpProfile || gpProfile.id !== order.gp_id) {
      return {
        status: "failed",
        qr_type: "QR_COLIS",
        scenario: "unauthorized",
        next_action: "none",
        message: "Ce colis n'est pas associé à votre profil.",
      };
    }

    // Determine next action based on status
    const actionMap: Record<string, { scenario: string; next_action: string; message: string }> = {
      pending: { scenario: "gp_deposit", next_action: "check_in", message: "Vérifiez le poids et confirmez le dépôt." },
      accepted: { scenario: "gp_deposit", next_action: "check_in", message: "Vérifiez le poids et confirmez le dépôt." },
      collected: { scenario: "gp_transit", next_action: "mark_transit", message: "Colis collecté. Marquez le départ en transit." },
      in_transit: { scenario: "gp_delivery", next_action: "confirm_delivery", message: "Colis en transit. Confirmez la livraison au destinataire." },
      delivered: { scenario: "gp_completed", next_action: "none", message: "Colis déjà livré. Aucune action disponible." },
      cancelled: { scenario: "gp_cancelled", next_action: "none", message: "Commande annulée." },
    };

    const action = actionMap[order.status] || {
      scenario: "gp_view",
      next_action: "view",
      message: "Consultez les détails du colis.",
    };

    return {
      status: "authorized",
      qr_type: "QR_COLIS",
      ...action,
      data: {
        order,
        financial_status: order.financial_status,
      },
      financial_impact: order.total_price
        ? { amount: order.total_price, currency: order.currency, type: "escrow" }
        : null,
    };
  }

  if (role === "client") {
    // Client can only view their orders
    if (order.client_id !== userId && order.recipient_user_id !== userId) {
      return {
        status: "failed",
        qr_type: "QR_COLIS",
        scenario: "unauthorized",
        next_action: "none",
        message: "Ce colis ne vous appartient pas.",
      };
    }

    const isDeliveryReady = ["in_transit", "arrived"].includes(order.status);
    return {
      status: "authorized",
      qr_type: "QR_COLIS",
      scenario: isDeliveryReady ? "client_confirm_reception" : "client_view",
      next_action: isDeliveryReady ? "confirm_reception" : "view",
      message: isDeliveryReady
        ? "Votre colis est prêt. Confirmez la réception."
        : `Statut actuel : ${order.status}`,
      data: { order },
      financial_impact: order.total_price
        ? { amount: order.total_price, currency: order.currency, type: "escrow" }
        : null,
    };
  }

  if (role === "admin" || role === "agent_logistique") {
    return {
      status: "authorized",
      qr_type: "QR_COLIS",
      scenario: "admin_full_access",
      next_action: order.status === "delivered" ? "none" : "manage",
      message: `Accès complet — Statut: ${order.status}`,
      data: { order },
    };
  }

  // External
  return {
    status: "authorized",
    qr_type: "QR_COLIS",
    scenario: "external_view",
    next_action: "redirect_public",
    message: "Suivez votre colis sur Konnekt.",
    data: { order_number: order.order_number, status: order.status },
  };
}

async function resolveUserScenario(
  supabase: any,
  parsed: ParsedQR,
  role: UserRole,
  userId: string
): Promise<ScanResponse> {
  if (!parsed.reference_id) {
    return {
      status: "failed",
      qr_type: "QR_USER",
      scenario: "invalid",
      next_action: "none",
      message: "QR utilisateur invalide.",
    };
  }

  const scannedUserId = parsed.reference_id;

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url, city")
    .eq("user_id", scannedUserId)
    .maybeSingle();

  if (!profile) {
    return {
      status: "failed",
      qr_type: "QR_USER",
      scenario: "user_not_found",
      next_action: "none",
      message: "Utilisateur non trouvé.",
    };
  }

  // Check if scanned user is a GP
  const { data: gpProfile } = await supabase
    .from("gp_profiles")
    .select("id, business_name, gp_type, rating, total_deliveries, verified_at, status, deposit_address, reception_address")
    .eq("user_id", scannedUserId)
    .maybeSingle();

  const isGP = !!gpProfile;

  if (role === "client" && isGP) {
    // Client scans GP → view profile + book
    return {
      status: "authorized",
      qr_type: "QR_GP",
      scenario: "client_view_gp",
      next_action: "view_profile",
      message: `Profil transporteur : ${gpProfile.business_name}`,
      data: {
        user: profile,
        gp: gpProfile,
        redirect: `/client/transporteurs/${gpProfile.id}`,
      },
    };
  }

  if (role === "gp") {
    // GP scans client → find active orders between them
    const { data: gpSelf } = await supabase
      .from("gp_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (gpSelf) {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_number, status, weight, total_price, currency")
        .eq("gp_id", gpSelf.id)
        .eq("client_id", scannedUserId)
        .in("status", ["pending", "accepted", "collected", "in_transit"])
        .limit(10);

      return {
        status: "authorized",
        qr_type: "QR_USER",
        scenario: orders?.length ? "gp_client_with_orders" : "gp_client_no_orders",
        next_action: orders?.length ? "select_order" : "view",
        message: orders?.length
          ? `${orders.length} commande(s) active(s) avec ${profile.full_name}`
          : `Aucune commande active avec ${profile.full_name}`,
        data: { user: profile, orders: orders || [] },
      };
    }
  }

  if (role === "admin" || role === "agent_logistique") {
    return {
      status: "authorized",
      qr_type: isGP ? "QR_GP" : "QR_USER",
      scenario: "admin_user_view",
      next_action: "manage",
      message: `Accès étendu — ${profile.full_name}`,
      data: { user: profile, gp: gpProfile },
    };
  }

  // External / unauthenticated
  return {
    status: "authorized",
    qr_type: isGP ? "QR_GP" : "QR_USER",
    scenario: "external_discovery",
    next_action: "redirect_public",
    message: "Découvrez ce profil sur Konnekt.",
    data: {
      redirect: isGP
        ? `/client/transporteurs/${gpProfile!.id}`
        : `/track/user/${scannedUserId}`,
    },
  };
}

async function resolvePaymentScenario(
  supabase: any,
  parsed: ParsedQR,
  role: UserRole,
  userId: string
): Promise<ScanResponse> {
  if (!parsed.reference_id) {
    return {
      status: "failed",
      qr_type: "QR_PAYMENT",
      scenario: "invalid",
      next_action: "none",
      message: "QR paiement invalide.",
    };
  }

  // Lookup escrow
  const { data: escrow } = await supabase
    .from("escrow_transactions")
    .select("id, order_id, amount, currency, status, client_id, gp_id")
    .eq("order_id", parsed.reference_id)
    .maybeSingle();

  if (!escrow) {
    return {
      status: "failed",
      qr_type: "QR_PAYMENT",
      scenario: "no_escrow",
      next_action: "none",
      message: "Aucune transaction trouvée pour ce QR.",
    };
  }

  if (role === "client") {
    return {
      status: "authorized",
      qr_type: "QR_PAYMENT",
      scenario: escrow.status === "pending" ? "client_pay" : "client_payment_status",
      next_action: escrow.status === "pending" ? "pay" : "view",
      message:
        escrow.status === "pending"
          ? `Paiement requis : ${escrow.amount} ${escrow.currency}`
          : `Paiement ${escrow.status}`,
      data: { escrow },
      financial_impact: { amount: escrow.amount, currency: escrow.currency, type: "payment" },
    };
  }

  if (role === "gp") {
    return {
      status: "authorized",
      qr_type: "QR_PAYMENT",
      scenario: "gp_verify_payment",
      next_action: "view",
      message: `Paiement ${escrow.status} — ${escrow.amount} ${escrow.currency}`,
      data: { escrow },
      financial_impact: { amount: escrow.amount, currency: escrow.currency, type: "verification" },
    };
  }

  return {
    status: "authorized",
    qr_type: "QR_PAYMENT",
    scenario: "admin_payment",
    next_action: "manage",
    message: `Escrow: ${escrow.status}`,
    data: { escrow },
  };
}

async function resolveAdjustmentScenario(
  supabase: any,
  parsed: ParsedQR,
  role: UserRole,
  userId: string
): Promise<ScanResponse> {
  if (!parsed.reference_id) {
    return {
      status: "failed",
      qr_type: "QR_ADJUSTMENT",
      scenario: "invalid",
      next_action: "none",
      message: "QR ajustement invalide.",
    };
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, weight, total_price, currency, client_id, gp_id, price_per_kg")
    .eq("id", parsed.reference_id)
    .maybeSingle();

  if (!order) {
    return {
      status: "failed",
      qr_type: "QR_ADJUSTMENT",
      scenario: "order_not_found",
      next_action: "none",
      message: "Commande non trouvée.",
    };
  }

  if (role === "gp") {
    return {
      status: "authorized",
      qr_type: "QR_ADJUSTMENT",
      scenario: "gp_adjust_weight",
      next_action: "adjust",
      message: "Saisissez le poids réel pour ajustement.",
      data: { order },
    };
  }

  if (role === "client") {
    return {
      status: "authorized",
      qr_type: "QR_ADJUSTMENT",
      scenario: "client_pay_supplement",
      next_action: "pay_supplement",
      message: "Un ajustement de poids a été demandé. Validez le supplément.",
      data: { order, redirect: `/pay-supplement?orderId=${order.id}` },
    };
  }

  return {
    status: "authorized",
    qr_type: "QR_ADJUSTMENT",
    scenario: "admin_adjustment",
    next_action: "manage",
    message: "Ajustement en cours.",
    data: { order },
  };
}

async function resolveExternalScenario(
  parsed: ParsedQR,
  role: UserRole
): Promise<ScanResponse> {
  const isUrl = parsed.metadata?.is_url || parsed.raw.startsWith("http");

  return {
    status: "validated",
    qr_type: "QR_EXTERNAL",
    scenario: isUrl ? "external_url" : "external_text",
    next_action: isUrl ? "open_browser" : "propose_manual",
    message: isUrl
      ? "QR externe détecté. Ouvrir dans le navigateur ?"
      : "Code inconnu. Associer à un colis ou créer un colis manuel ?",
    data: {
      raw: parsed.raw,
      is_url: isUrl,
      options: isUrl
        ? ["open_url"]
        : ["associate_to_order", "create_manual_parcel"],
    },
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

    // Parse request
    const body: ScanRequest = await req.json();
    const { scanned_data } = body;

    if (!scanned_data || typeof scanned_data !== "string" || scanned_data.length > 5000) {
      return new Response(
        JSON.stringify({
          status: "failed",
          qr_type: "QR_EXTERNAL",
          scenario: "invalid_input",
          next_action: "none",
          message: "Données de scan invalides.",
        } satisfies ScanResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let role: UserRole = body.role || "external";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (!claimsError && claimsData?.claims) {
        userId = claimsData.claims.sub as string;

        // Detect role from DB if not provided
        if (!body.role || body.role === "external") {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);

          const roleSet = new Set(roles?.map((r: any) => r.role) || []);

          if (roleSet.has("admin")) {
            role = "admin";
          } else if (roleSet.has("agent_logistique")) {
            role = "agent_logistique";
          } else {
            const { data: gp } = await supabase
              .from("gp_profiles")
              .select("id")
              .eq("user_id", userId)
              .maybeSingle();
            role = gp ? "gp" : "client";
          }
        }
      }
    }

    // ═══ STEP 1: DETECT QR TYPE ═══
    const parsed = detectQRType(scanned_data);

    // ═══ STEP 2: RATE LIMIT ═══
    if (userId) {
      const withinLimit = await checkRateLimit(supabase, userId);
      if (!withinLimit) {
        return new Response(
          JSON.stringify({
            status: "failed",
            qr_type: parsed.type,
            scenario: "rate_limited",
            next_action: "wait",
            message: "Trop de scans. Attendez une minute.",
          } satisfies ScanResponse),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ═══ STEP 3: RESOLVE SCENARIO ═══
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
          // Re-resolve as user scenario with GP context
          const gpParsed = { ...parsed, type: "QR_USER" as QRType };
          // First get user_id from gp_profiles
          const { data: gpData } = await supabase
            .from("gp_profiles")
            .select("user_id")
            .eq("id", parsed.reference_id)
            .maybeSingle();

          if (gpData) {
            gpParsed.reference_id = gpData.user_id;
            response = await resolveUserScenario(supabase, gpParsed, role, userId || "");
            response.qr_type = "QR_GP";
          } else {
            response = {
              status: "failed",
              qr_type: "QR_GP",
              scenario: "gp_not_found",
              next_action: "none",
              message: "Transporteur non trouvé.",
            };
          }
        } else {
          response = {
            status: "failed",
            qr_type: "QR_GP",
            scenario: "invalid",
            next_action: "none",
            message: "QR GP invalide.",
          };
        }
        break;
      case "QR_PAYMENT":
        response = await resolvePaymentScenario(supabase, parsed, role, userId || "");
        break;
      case "QR_ADJUSTMENT":
        response = await resolveAdjustmentScenario(supabase, parsed, role, userId || "");
        break;
      case "QR_CONFIRMATION":
        // Confirmation = client confirms reception
        response = {
          status: "authorized",
          qr_type: "QR_CONFIRMATION",
          scenario: role === "client" ? "client_confirm_reception" : "view",
          next_action: role === "client" ? "confirm_reception" : "view",
          message: "Confirmez la réception de votre colis.",
          data: { reference_id: parsed.reference_id, redirect: `/confirm-reception?orderId=${parsed.reference_id}` },
        };
        break;
      case "QR_EXTERNAL":
      default:
        response = await resolveExternalScenario(parsed, role);
        break;
    }

    // ═══ STEP 4: LOG SCAN ═══
    if (userId) {
      const idempotencyKey = generateIdempotencyKey(
        userId,
        parsed.type,
        parsed.reference_id,
        response.next_action
      );

      try {
        await supabase.from("scan_logs").insert({
          user_id: userId,
          user_role: role,
          action: response.next_action,
          scan_type: "engine",
          qr_type: parsed.type,
          reference_id: parsed.reference_id || null,
          order_id: response.data?.order?.id || null,
          engine_status: response.status,
          financial_impact: response.financial_impact || null,
          signature_valid: parsed.signature ? true : null,
          idempotency_key: idempotencyKey,
          metadata: {
            scenario: response.scenario,
            raw_length: scanned_data.length,
          },
        });
      } catch (logErr) {
        console.error("Scan log error:", logErr);
        // Don't fail the response for logging errors
      }
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Scan engine error:", err);
    return new Response(
      JSON.stringify({
        status: "failed",
        qr_type: "QR_EXTERNAL",
        scenario: "engine_error",
        next_action: "none",
        message: "Erreur du moteur de scan. Réessayez.",
        error: String(err),
      } satisfies ScanResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
