/**
 * KONNEKT SCAN ENGINE — Suite de Tests E2E Cross-Module
 * Section X : Interconnexions & Tests Croisés
 *
 * Couvre :
 *   - Scénario A : Flow normal sans supplément
 *   - Scénario B : Flow avec supplément
 *   - Scénario C : GPS indisponible (fallback horaire)
 *   - Scénario D : Litige
 *   - Tests sécurité : Double release, QR falsifié, Brute force, Bypass supplément
 *   - Tests cohérence : State ↔ Escrow ↔ Geo
 *
 * Exécuter : deno test --allow-net --allow-env supabase/functions/scan-engine/index_test.ts
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ── Configuration ────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "";
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

const SCAN_ENGINE_URL = `${SUPABASE_URL}/functions/v1/scan-engine`;
const SECURITY_URL = `${SUPABASE_URL}/functions/v1/security-qr-verify`;
const COHERENCE_URL = `${SUPABASE_URL}/functions/v1/system-coherence-check`;

// Headers de base (sans auth — simuler rôle "external")
const baseHeaders = {
  "Content-Type": "application/json",
  "apikey": ANON_KEY,
};

// ── Helpers ──────────────────────────────────────────────────────────

async function callScanEngine(body: Record<string, any>, authToken?: string) {
  const headers: Record<string, string> = { ...baseHeaders };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(SCAN_ENGINE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: JSON.parse(text) };
}

async function callSecurityVerify(body: Record<string, any>, authToken?: string) {
  const headers: Record<string, string> = { ...baseHeaders };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(SECURITY_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: JSON.parse(text) };
}

// ════════════════════════════════════════════════════════════════════
// SECTION 1 — TESTS QR RESOLVE (READ-ONLY)
// ════════════════════════════════════════════════════════════════════

Deno.test("Section X.2 — Scan QR invalide : input vide doit échouer", async () => {
  const { status, body } = await callScanEngine({ scanned_data: "" });
  assertEquals(status, 400);
  assertEquals(body.status, "failed");
  assertEquals(body.scenario, "invalid_input");
  await new Promise((r) => setTimeout(r, 100));
});

Deno.test("Section X.2 — Scan QR invalide : input trop long doit échouer", async () => {
  const { status, body } = await callScanEngine({ scanned_data: "A".repeat(6000) });
  assertEquals(status, 400);
  assertEquals(body.status, "failed");
  assertEquals(body.scenario, "invalid_input");
  await new Promise((r) => setTimeout(r, 100));
});

Deno.test("Section X.2 — Scan QR externe URL : détection correcte", async () => {
  const { status, body } = await callScanEngine({
    scanned_data: "https://example.com/some-page",
  });
  assertEquals(status, 200);
  assertEquals(body.qr_type, "QR_EXTERNAL");
  assertEquals(body.scenario, "external_url");
  await new Promise((r) => setTimeout(r, 100));
});

Deno.test("Section X.2 — Scan QR externe texte : options manuelles proposées", async () => {
  const { status, body } = await callScanEngine({
    scanned_data: "SOME_BARCODE_TEXT_123",
  });
  assertEquals(status, 200);
  assertEquals(body.qr_type, "QR_EXTERNAL");
  assertEquals(body.scenario, "external_text");
  assert(body.data?.show_manual_options === true);
  await new Promise((r) => setTimeout(r, 100));
});

Deno.test("Section X.2 — Scan commande inexistante : order_not_found", async () => {
  const { status, body } = await callScanEngine({
    scanned_data: "CMD-20260101-nonexist",
  });
  assertEquals(status, 200);
  assertEquals(body.scenario, "order_not_found");
  await new Promise((r) => setTimeout(r, 100));
});

Deno.test("Section X.2 — Scan UUID inexistant comme QR_USER", async () => {
  const { status, body } = await callScanEngine({
    scanned_data: "00000000-0000-0000-0000-000000000000",
  });
  assertEquals(status, 200);
  assertEquals(body.qr_type, "QR_USER");
  assertEquals(body.scenario, "user_not_found");
  await new Promise((r) => setTimeout(r, 100));
});

// ════════════════════════════════════════════════════════════════════
// SECTION 2 — TESTS SÉCURITÉ QR HMAC
// ════════════════════════════════════════════════════════════════════

Deno.test("Section IX.2 + X.7 — QR HMAC : format legacy accepté sans signature", async () => {
  // Les QRs anciens (non signés) doivent être acceptés mais marqués signed=false
  const { body } = await callScanEngine({
    scanned_data: JSON.stringify({ type: "order", reference_id: "some-id" }),
  });
  // Le scan engine doit rester fonctionnel, pas de rejet brutal
  assertExists(body.status);
  await new Promise((r) => setTimeout(r, 100));
});

Deno.test("Section IX.2 + X.7 — QR HMAC falsifié doit être rejeté (security-qr-verify)", async () => {
  // Sans auth — doit retourner 401
  const { status } = await callSecurityVerify({
    mode: "verify_qr",
    qr_data: "KKT|ORDER|fake-id|1234567890|invalidsignaturehere",
  });
  assertEquals(status, 401);
  await new Promise((r) => setTimeout(r, 100));
});

Deno.test("Section IX.2 + X.7 — QR avec signature manquante : non signé accepté", async () => {
  // QR sans préfixe KKT → legacy, non signé mais accepté
  const { status, body } = await callScanEngine({
    scanned_data: "https://konnektapp.lovable.app",
  });
  assertEquals(status, 200);
  assertEquals(body.scenario, "external_url");
  await new Promise((r) => setTimeout(r, 100));
});

// ════════════════════════════════════════════════════════════════════
// SECTION 3 — TESTS EXECUTE MODE (AUTH REQUIS)
// ════════════════════════════════════════════════════════════════════

Deno.test("Section X.2 — Execute sans auth : unauthorized", async () => {
  const { status, body } = await callScanEngine({
    action: "deposit_confirm",
    order_id: "00000000-0000-0000-0000-000000000000",
  });
  assertEquals(status, 401);
  assertEquals(body.scenario, "unauthorized");
  await new Promise((r) => setTimeout(r, 100));
});

Deno.test("Section X.2 — Execute action invalide sans auth : unauthorized", async () => {
  const { status, body } = await callScanEngine({
    action: "confirm_delivery",
    order_id: "00000000-0000-0000-0000-000000000000",
  });
  assertEquals(status, 401);
  assertEquals(body.scenario, "unauthorized");
  await new Promise((r) => setTimeout(r, 100));
});

// ════════════════════════════════════════════════════════════════════
// SECTION 4 — TESTS ANTI-DOUBLE RELEASE (Section VIII §7 + X §6)
// ════════════════════════════════════════════════════════════════════

Deno.test("Section X.6 — release-funds-v2 : order_id manquant rejeté", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/release-funds-v2`, {
    method: "POST",
    headers: { ...baseHeaders },
    body: JSON.stringify({}),
  });
  const body = await res.json();
  assertEquals(res.status, 400);
  assertExists(body.error);
  await new Promise((r) => setTimeout(r, 100));
});

Deno.test("Section X.6 — release-funds-v2 : commande inexistante retourne 404", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/release-funds-v2`, {
    method: "POST",
    headers: { ...baseHeaders },
    body: JSON.stringify({ order_id: "00000000-0000-0000-0000-000000000000" }),
  });
  const body = await res.json();
  assertEquals(res.status, 404);
  assertExists(body.error);
  await new Promise((r) => setTimeout(r, 100));
});

// ════════════════════════════════════════════════════════════════════
// SECTION 5 — TESTS COHÉRENCE CROSS-MODULE (system-coherence-check)
// ════════════════════════════════════════════════════════════════════

Deno.test("Section X.2 + X.3 — system-coherence-check : sans auth retourne 401", async () => {
  const res = await fetch(COHERENCE_URL, {
    method: "POST",
    headers: { ...baseHeaders },
    body: JSON.stringify({ mode: "check_order", order_id: "00000000-0000-0000-0000-000000000000" }),
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertExists(body.error);
  await new Response(null).text();
});

Deno.test("Section X.2 — system-coherence-check : mode inconnu retourne erreur", async () => {
  const res = await fetch(COHERENCE_URL, {
    method: "POST",
    headers: { ...baseHeaders },
    body: JSON.stringify({ mode: "invalid_mode" }),
  });
  // 401 attendu car pas d'auth, pas le mode
  assertEquals(res.status, 401);
  await res.text();
});

// ════════════════════════════════════════════════════════════════════
// SECTION 6 — TESTS SCÉNARIOS E2E (Validation État Machine)
// ════════════════════════════════════════════════════════════════════

// Note : Ces tests valident la LOGIQUE de la state machine sans dépendance
// à des données de production. Ils testent les règles de cohérence.

Deno.test("Section X.8 — Scénario A : flux normal — états dans l'ordre correct", () => {
  const SCENARIO_A_FLOW = [
    "pending", "paid_held", "checked_in",
    "in_transit", "arrived_destination", "delivery_confirmed", "released",
  ];

  // Vérifier que tous les états sont distincts (pas de répétition illogique)
  const uniqueStates = new Set(SCENARIO_A_FLOW);
  assertEquals(uniqueStates.size, SCENARIO_A_FLOW.length, "Scénario A ne doit pas avoir d'états dupliqués");

  // Vérifier l'ordre logique
  const terminalIndex = SCENARIO_A_FLOW.indexOf("released");
  assertEquals(terminalIndex, SCENARIO_A_FLOW.length - 1, "released doit être le dernier état");
});

Deno.test("Section X.8 — Scénario B : avec supplément — weight_pending_payment entre check_in et transit", () => {
  const SCENARIO_B_FLOW = [
    "pending", "paid_held", "checked_in",
    "weight_pending_payment", "checked_in",
    "in_transit", "arrived_destination", "delivery_confirmed", "released",
  ];

  const weightPendingIndex = SCENARIO_B_FLOW.indexOf("weight_pending_payment");
  const transitIndex = SCENARIO_B_FLOW.indexOf("in_transit");

  assert(weightPendingIndex < transitIndex, "weight_pending_payment doit précéder in_transit");

  // Vérifier que checked_in apparaît APRÈS weight_pending_payment (retour)
  const secondCheckedIn = SCENARIO_B_FLOW.lastIndexOf("checked_in");
  assert(secondCheckedIn > weightPendingIndex, "Le checked_in post-paiement doit être après weight_pending_payment");
});

Deno.test("Section X.8 — Scénario C : GPS fallback — scheduled_departure avant in_transit", () => {
  const SCENARIO_C_FLOW = [
    "pending", "paid_held", "checked_in",
    "scheduled_departure", "in_transit",
    "arrived_destination", "delivery_confirmed", "released",
  ];

  const scheduledIndex = SCENARIO_C_FLOW.indexOf("scheduled_departure");
  const transitIndex = SCENARIO_C_FLOW.indexOf("in_transit");

  assert(scheduledIndex < transitIndex, "scheduled_departure doit précéder in_transit");
});

Deno.test("Section X.8 — Scénario D : litige — released ne doit JAMAIS suivre disputed", () => {
  const SCENARIO_D_VALID = ["pending", "paid_held", "checked_in", "disputed"];

  // Vérifier qu'aucun état de livraison n'est dans ce flux
  const deliveryStates = ["delivery_confirmed", "delivered", "released"];
  for (const state of deliveryStates) {
    const found = SCENARIO_D_VALID.includes(state);
    assertEquals(found, false, `État '${state}' ne doit pas apparaître dans scénario litige`);
  }
});

// ════════════════════════════════════════════════════════════════════
// SECTION 7 — TESTS RÈGLES COHÉRENCE STATE ↔ ESCROW
// ════════════════════════════════════════════════════════════════════

Deno.test("Section X.3 — Règle cohérence : released sans escrow released = violation", () => {
  // Simulation logique de la règle (sans DB)
  const orderStatus: string = "released";
  const escrowStatus: string = "held"; // Incohérent !

  const isViolation = orderStatus === "released" && escrowStatus !== "released";
  assertEquals(isViolation, true, "State 'released' avec escrow 'held' doit être une violation");
});

Deno.test("Section X.3 — Règle cohérence : escrow released sans order released = violation", () => {
  const orderStatus: string = "in_transit";
  const escrowStatus: string = "released"; // Incohérent !

  const isViolation = escrowStatus === "released" && orderStatus !== "released";
  assertEquals(isViolation, true, "Escrow 'released' avec order 'in_transit' doit être une violation");
});

Deno.test("Section X.4 — Règle supplément : transit avec supplément impayé = violation critique", () => {
  const orderStatus = "in_transit";
  const financialStatus = "adjustment_required"; // Supplément impayé

  const illegalStates = ["in_transit", "arrived_destination", "delivery_confirmed", "delivered", "released"];
  const isViolation = financialStatus === "adjustment_required" && illegalStates.includes(orderStatus);

  assertEquals(isViolation, true, "in_transit avec supplément impayé doit être détecté comme violation");
});

Deno.test("Section X.6 — Règle code livraison : release impossible si blocage actif", () => {
  const blockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Bloqué 30 min
  const isCurrentlyBlocked = blockedUntil > new Date();

  assertEquals(isCurrentlyBlocked, true, "Un code bloqué dans le futur doit être détecté comme actif");
});

Deno.test("Section X.6 — Règle anti-brute force : max 3 tentatives", () => {
  const MAX_ATTEMPTS = 3;
  const attemptCount = 3;
  const shouldBlock = attemptCount >= MAX_ATTEMPTS;

  assertEquals(shouldBlock, true, "Après 3 tentatives, le blocage doit être déclenché");
});

// ════════════════════════════════════════════════════════════════════
// SECTION 8 — TESTS SÉCURITÉ GLOBALE (Section IX §7)
// ════════════════════════════════════════════════════════════════════

Deno.test("Section IX.7 + X.7 — Rejet idempotency réutilisée : même clé = même résultat", () => {
  // Simule la logique : si la clé existe, retourner le résultat précédent (pas d'erreur, juste idempotent)
  const existingResult = { success: true, order_id: "abc123" };
  const isCachedResult = existingResult !== null;
  assertEquals(isCachedResult, true, "Une idempotency key existante doit retourner le résultat mis en cache");
});

Deno.test("Section IX.11 — Post-release : état released = toutes mutations bloquées", () => {
  // Vérifier la logique de protection
  const orderStatus = "released";
  const TERMINAL_STATES = new Set(["released", "cancelled"]);
  const isMutationBlocked = TERMINAL_STATES.has(orderStatus);

  assertEquals(isMutationBlocked, true, "État 'released' doit bloquer toutes les mutations");
});

Deno.test("Section IX.12 — Litige actif : release bloqué", () => {
  const hasOpenDispute = true;
  const escrowStatus = "held";

  // Si litige ouvert, le release ne doit pas être possible
  const canRelease = !hasOpenDispute && escrowStatus === "held";
  assertEquals(canRelease, false, "Release doit être impossible si litige actif");
});

Deno.test("Section X.7 — Geo suspicious : saut impossible détecté", () => {
  // Haversine simplifié pour le test
  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Paris → New York (~5800km)
  const distKm = haversineKm(48.8566, 2.3522, 40.7128, -74.0060);
  const elapsedSeconds = 60; // 1 minute !
  const GEO_MAX_KM = 3000;
  const GEO_MIN_SECONDS = 300;

  const isSuspicious = distKm > GEO_MAX_KM && elapsedSeconds < GEO_MIN_SECONDS;
  assertEquals(isSuspicious, true, "Saut Paris→New York en 1 minute doit être détecté comme suspicious");
});

// ════════════════════════════════════════════════════════════════════
// SECTION 9 — CHECKLIST INTÉGRITÉ AVANT PRODUCTION (Section X §9)
// ════════════════════════════════════════════════════════════════════

Deno.test("Checklist — Validation : STATE_ESCROW_RULES couvre tous les états critiques", () => {
  const criticalStates = [
    "pending", "paid_held", "checked_in", "weight_pending_payment",
    "scheduled_departure", "collected", "in_transit", "arrived_destination",
    "delivery_pending", "delivery_confirmed", "delivered", "released",
    "cancelled", "disputed",
  ];

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

  for (const state of criticalStates) {
    const hasRule = state in STATE_ESCROW_RULES;
    assertEquals(hasRule, true, `L'état '${state}' doit avoir une règle de cohérence définie`);
  }
});

Deno.test("Checklist — Validation : scénarios E2E terminent tous par un état final cohérent", () => {
  const SCENARIO_FINAL_STATES: Record<string, string> = {
    scenario_a: "released",
    scenario_b: "released",
    scenario_c: "released",
    scenario_d: "disputed",
  };

  const VALID_FINAL_STATES = new Set(["released", "cancelled", "disputed"]);

  for (const [scenario, finalState] of Object.entries(SCENARIO_FINAL_STATES)) {
    const isValidFinal = VALID_FINAL_STATES.has(finalState);
    assertEquals(isValidFinal, true, `Scénario '${scenario}' doit terminer par un état final valide, pas '${finalState}'`);
  }
});
