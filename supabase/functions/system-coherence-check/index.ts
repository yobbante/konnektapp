/**
 * system-coherence-check — Section X : Validateur Cross-Module
 *
 * Vérifie la cohérence globale entre tous les modules :
 *   Scan ↔ State Machine ↔ Escrow ↔ Geo ↔ Livraison ↔ Sécurité
 *
 * Modes :
 *   POST { mode: "check_order", order_id }
 *     → Audit complet d'une commande
 *
 *   POST { mode: "system_health" }
 *     → Détecte les incohérences globales dans les 24 dernières heures
 *
 *   POST { mode: "scenario_validate", scenario, order_id }
 *     → Valide qu'un scénario E2E est dans l'état attendu
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Règles de cohérence State ↔ Escrow ──────────────────────────────
// Définit pour chaque état de commande l'état escrow ATTENDU
const STATE_ESCROW_RULES: Record<string, { escrow_status: string[]; financial_status: string[] }> = {
  pending:               { escrow_status: ["pending", "held"], financial_status: ["pending_payment"] },
  accepted:              { escrow_status: ["pending", "held"], financial_status: ["pending_payment", "escrow_locked"] },
  paid_held:             { escrow_status: ["held"],            financial_status: ["escrow_locked"] },
  checked_in:            { escrow_status: ["held"],            financial_status: ["escrow_locked"] },
  weight_pending_payment:{ escrow_status: ["held"],            financial_status: ["adjustment_required"] },
  scheduled_departure:   { escrow_status: ["held"],            financial_status: ["escrow_locked"] },
  collected:             { escrow_status: ["held"],            financial_status: ["escrow_locked"] },
  in_transit:            { escrow_status: ["held"],            financial_status: ["escrow_locked"] },
  arrived_destination:   { escrow_status: ["held"],            financial_status: ["escrow_locked"] },
  delivery_pending:      { escrow_status: ["held"],            financial_status: ["escrow_locked"] },
  delivery_confirmed:    { escrow_status: ["held"],            financial_status: ["escrow_locked"] },
  delivered:             { escrow_status: ["held", "released"],financial_status: ["escrow_locked", "completed"] },
  released:              { escrow_status: ["released"],         financial_status: ["completed"] },
  cancelled:             { escrow_status: ["cancelled", "refunded", "pending"], financial_status: ["cancelled", "refunded", "pending_payment"] },
  disputed:              { escrow_status: ["held"],            financial_status: ["escrow_locked"] },
};

interface CoherenceIssue {
  type: string;
  severity: "info" | "warn" | "critical";
  order_id?: string;
  order_number?: string;
  message: string;
  details?: Record<string, any>;
}

// ── Audit complet d'une commande ─────────────────────────────────────
async function checkOrderCoherence(supabase: any, orderId: string): Promise<CoherenceIssue[]> {
  const issues: CoherenceIssue[] = [];

  // Charger toutes les données en parallèle
  const [orderRes, escrowRes, disputeRes, idempRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, financial_status, geo_suspicious, delivery_attempt_count, delivery_blocked_until, gp_id, client_id")
      .eq("id", orderId)
      .maybeSingle(),
    supabase
      .from("escrow_transactions")
      .select("id, status, amount, commission_amount, net_to_gp, released_at")
      .eq("order_id", orderId)
      .maybeSingle(),
    supabase
      .from("disputes")
      .select("id, status, category")
      .eq("order_id", orderId),
    supabase
      .from("idempotency_keys")
      .select("key, action")
      .eq("order_id", orderId),
  ]);

  const order = orderRes.data;
  const escrow = escrowRes.data;
  const disputes = disputeRes.data || [];
  const idempKeys = idempRes.data || [];

  if (!order) {
    return [{ type: "ORDER_NOT_FOUND", severity: "critical", message: "Commande introuvable", order_id: orderId }];
  }

  // ── CHECK 1 : Cohérence State ↔ Escrow ────────────────────────────
  const rule = STATE_ESCROW_RULES[order.status];
  if (rule && escrow) {
    if (!rule.escrow_status.includes(escrow.status)) {
      issues.push({
        type: "STATE_ESCROW_MISMATCH",
        severity: "critical",
        order_id: orderId,
        order_number: order.order_number,
        message: `État '${order.status}' incompatible avec escrow '${escrow.status}'`,
        details: {
          expected_escrow: rule.escrow_status,
          actual_escrow: escrow.status,
          order_status: order.status,
        },
      });
    }
    if (!rule.financial_status.includes(order.financial_status || "")) {
      issues.push({
        type: "FINANCIAL_STATUS_MISMATCH",
        severity: "warn",
        order_id: orderId,
        order_number: order.order_number,
        message: `financial_status '${order.financial_status}' non conforme pour état '${order.status}'`,
        details: {
          expected_financial: rule.financial_status,
          actual_financial: order.financial_status,
        },
      });
    }
  }

  // ── CHECK 2 : État released sans escrow released ───────────────────
  if (order.status === "released" && escrow && escrow.status !== "released") {
    issues.push({
      type: "RELEASE_WITHOUT_ESCROW",
      severity: "critical",
      order_id: orderId,
      order_number: order.order_number,
      message: "Commande released mais escrow non libéré — incohérence critique",
      details: { escrow_status: escrow.status },
    });
  }

  // ── CHECK 3 : Litige actif ↔ Release ──────────────────────────────
  const openDisputes = disputes.filter((d: any) => ["open", "under_review", "awaiting_response"].includes(d.status));
  if (openDisputes.length > 0 && escrow && escrow.status === "released") {
    issues.push({
      type: "RELEASE_DURING_DISPUTE",
      severity: "critical",
      order_id: orderId,
      order_number: order.order_number,
      message: "Fonds libérés malgré litige ouvert — audit requis immédiatement",
      details: { dispute_ids: openDisputes.map((d: any) => d.id) },
    });
  }

  // ── CHECK 4 : Supplément impayé → transit/livraison ───────────────
  if (order.financial_status === "adjustment_required") {
    const illegalStates = ["in_transit", "arrived_destination", "delivery_pending", "delivery_confirmed", "delivered", "released"];
    if (illegalStates.includes(order.status)) {
      issues.push({
        type: "TRANSIT_WITH_UNPAID_SUPPLEMENT",
        severity: "critical",
        order_id: orderId,
        order_number: order.order_number,
        message: "Colis en transit/livré avec supplément impayé — bypass détecté",
        details: { order_status: order.status, financial_status: order.financial_status },
      });
    }
  }

  // ── CHECK 5 : Geo suspicious sans flag order ───────────────────────
  if (order.geo_suspicious) {
    const terminatedStates = ["delivered", "released", "cancelled"];
    if (!terminatedStates.includes(order.status)) {
      issues.push({
        type: "GEO_SUSPICIOUS_ACTIVE",
        severity: "warn",
        order_id: orderId,
        order_number: order.order_number,
        message: "Anomalie géographique non résolue sur commande active",
        details: { geo_suspicious: true, order_status: order.status },
      });
    }
  }

  // ── CHECK 6 : Code livraison bloqué ───────────────────────────────
  if (order.delivery_blocked_until && new Date(order.delivery_blocked_until) > new Date()) {
    issues.push({
      type: "DELIVERY_CODE_BLOCKED",
      severity: "warn",
      order_id: orderId,
      order_number: order.order_number,
      message: `Code livraison bloqué jusqu'à ${order.delivery_blocked_until}`,
      details: {
        blocked_until: order.delivery_blocked_until,
        attempt_count: order.delivery_attempt_count,
      },
    });
  }

  // ── CHECK 7 : Escrow avec net_to_gp négatif ───────────────────────
  if (escrow && escrow.net_to_gp < 0) {
    issues.push({
      type: "NEGATIVE_NET_TO_GP",
      severity: "critical",
      order_id: orderId,
      order_number: order.order_number,
      message: "net_to_gp négatif dans escrow — calcul financier corrompu",
      details: { net_to_gp: escrow.net_to_gp, commission_amount: escrow.commission_amount },
    });
  }

  // ── CHECK 8 : Idempotency doublons ────────────────────────────────
  const actionGroups = new Map<string, number>();
  for (const key of idempKeys) {
    if (key.action) {
      actionGroups.set(key.action, (actionGroups.get(key.action) || 0) + 1);
    }
  }
  for (const [action, count] of actionGroups) {
    if (count > 1) {
      issues.push({
        type: "IDEMPOTENCY_DUPLICATE",
        severity: "warn",
        order_id: orderId,
        order_number: order.order_number,
        message: `Action '${action}' exécutée ${count} fois — vérifier idempotency`,
        details: { action, count },
      });
    }
  }

  return issues;
}

// ── Health check global (24h) ─────────────────────────────────────────
async function systemHealthCheck(supabase: any): Promise<{
  total_checked: number;
  issues: CoherenceIssue[];
  critical_count: number;
  warn_count: number;
}> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Orders modifiés dans les 24h (actifs ou récemment terminés)
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id")
    .gte("updated_at", since)
    .limit(200);

  const allIssues: CoherenceIssue[] = [];
  const orderIds = (recentOrders || []).map((o: any) => o.id);

  // Checker par batch de 10 (performance)
  const batchSize = 10;
  for (let i = 0; i < orderIds.length; i += batchSize) {
    const batch = orderIds.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((id: string) => checkOrderCoherence(supabase, id)));
    results.forEach((issues) => allIssues.push(...issues));
  }

  const criticals = allIssues.filter((i) => i.severity === "critical");
  const warns = allIssues.filter((i) => i.severity === "warn");

  // Persister les critiques dans security_audit_log
  if (criticals.length > 0) {
    await supabase.from("security_audit_log").insert(
      criticals.map((issue) => ({
        event_type: issue.type,
        order_id: issue.order_id || null,
        details: { message: issue.message, ...issue.details },
        severity: "critical",
      }))
    ).catch(() => {});
  }

  return {
    total_checked: orderIds.length,
    issues: allIssues,
    critical_count: criticals.length,
    warn_count: warns.length,
  };
}

// ── Validation scénario E2E ──────────────────────────────────────────
type E2EScenario = "scenario_a" | "scenario_b" | "scenario_c" | "scenario_d";

// Étapes attendues par scénario (Section X §8)
const SCENARIO_EXPECTED_FLOW: Record<E2EScenario, string[]> = {
  scenario_a: ["pending", "paid_held", "checked_in", "in_transit", "arrived_destination", "delivery_confirmed", "released"],
  scenario_b: ["pending", "paid_held", "checked_in", "weight_pending_payment", "checked_in", "in_transit", "arrived_destination", "delivery_confirmed", "released"],
  scenario_c: ["pending", "paid_held", "checked_in", "scheduled_departure", "in_transit", "arrived_destination", "delivery_confirmed", "released"],
  scenario_d: ["pending", "paid_held", "checked_in", "disputed"],
};

async function validateScenario(supabase: any, scenario: E2EScenario, orderId: string): Promise<{
  scenario: E2EScenario;
  order_id: string;
  current_status: string;
  expected_flow: string[];
  status_history: string[];
  is_coherent: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // Charger historique des états
  const { data: history } = await supabase
    .from("order_status_history")
    .select("status, changed_at")
    .eq("order_id", orderId)
    .order("changed_at", { ascending: true });

  const { data: order } = await supabase
    .from("orders")
    .select("status, financial_status")
    .eq("id", orderId)
    .maybeSingle();

  const statusHistory: string[] = (history || []).map((h: any) => h.status);
  const currentStatus = order?.status || "unknown";
  const expectedFlow = SCENARIO_EXPECTED_FLOW[scenario] || [];

  // Vérifier que les états traversés sont dans le flux attendu
  for (const state of statusHistory) {
    if (!expectedFlow.includes(state)) {
      issues.push(`État inattendu '${state}' pour le scénario ${scenario}`);
    }
  }

  // Vérifier cohérence escrow/fin
  const lastExpected = expectedFlow[expectedFlow.length - 1];
  if (currentStatus === "released" && scenario !== "scenario_d") {
    // Vérifier escrow released
    const { data: escrow } = await supabase
      .from("escrow_transactions")
      .select("status")
      .eq("order_id", orderId)
      .maybeSingle();

    if (escrow && escrow.status !== "released") {
      issues.push("State machine 'released' mais escrow pas libéré");
    }
    if (order?.financial_status !== "completed") {
      issues.push(`financial_status '${order?.financial_status}' attendu 'completed' pour état final`);
    }
  }

  if (scenario === "scenario_d" && currentStatus !== "disputed") {
    if (["released", "delivered"].includes(currentStatus)) {
      issues.push("Livraison/release effectué malgré scénario litige — CRITIQUE");
    }
  }

  return {
    scenario,
    order_id: orderId,
    current_status: currentStatus,
    expected_flow: expectedFlow,
    status_history: statusHistory,
    is_coherent: issues.length === 0,
    issues,
  };
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth obligatoire
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { mode } = body;

    // ── Vérifier que l'utilisateur est admin ou ownership ─────────────
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (userRoles || []).some((r: any) => ["admin", "moderator"].includes(r.role));

    // MODE 1 : Audit d'une commande
    if (mode === "check_order") {
      const { order_id } = body;
      if (!order_id) {
        return new Response(JSON.stringify({ error: "order_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Vérifier ownership si non-admin
      if (!isAdmin) {
        const { data: order } = await supabase
          .from("orders")
          .select("client_id, gp_id")
          .eq("id", order_id)
          .maybeSingle();
        const { data: gpProfile } = await supabase
          .from("gp_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        const isOwner = order?.client_id === userId || (gpProfile && order?.gp_id === gpProfile.id);
        if (!isOwner) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const issues = await checkOrderCoherence(supabase, order_id);
      const hasBlocker = issues.some((i) => i.severity === "critical");

      return new Response(
        JSON.stringify({
          order_id,
          coherent: issues.length === 0,
          has_critical: hasBlocker,
          issue_count: issues.length,
          issues,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE 2 : System health (admin uniquement)
    if (mode === "system_health") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await systemHealthCheck(supabase);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE 3 : Validation scénario E2E
    if (mode === "scenario_validate") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { scenario, order_id } = body;
      if (!scenario || !order_id) {
        return new Response(JSON.stringify({ error: "scenario and order_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await validateScenario(supabase, scenario as E2EScenario, order_id);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown mode. Use: check_order | system_health | scenario_validate" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("system-coherence-check error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
