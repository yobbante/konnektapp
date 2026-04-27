// Konnekt webhook receiver.
// - Public endpoint (verify_jwt = false in config.toml)
// - Validates HMAC-SHA256 signature in header `X-Konnekt-Signature`
//   over the raw request body using KONNEKT_WEBHOOK_SECRET.
// - Forward-only status update on `shipments.status` (a status cannot regress).
// - Inserts an immutable row in `timeline_events` so realtime subscribers see it.
//
// Supported events:
//   shipment.in_transit
//   shipment.customs
//   shipment.delivered
//   shipment.status_changed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-konnekt-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Forward-only status order. Anything outside the list is treated as terminal-neutral.
const STATUS_ORDER: Record<string, number> = {
  created: 0,
  picked_up: 1,
  in_transit: 2,
  customs: 3,
  out_for_delivery: 4,
  delivered: 5,
  cancelled: 99,
};

const EVENT_TO_STATUS: Record<string, string> = {
  "shipment.in_transit": "in_transit",
  "shipment.customs": "customs",
  "shipment.delivered": "delivered",
  // shipment.status_changed: status taken from payload.status
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Constant-time hex comparison
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function bufToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bufToHex(sig);
}

function nextStatus(current: string | null, incoming: string): string {
  if (!current) return incoming;
  const a = STATUS_ORDER[current] ?? -1;
  const b = STATUS_ORDER[incoming] ?? -1;
  // Forward-only: keep the highest known step. Unknown statuses don't downgrade.
  if (b > a) return incoming;
  return current;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SECRET = Deno.env.get("KONNEKT_WEBHOOK_SECRET");
  if (!SUPABASE_URL || !SERVICE_ROLE || !SECRET) {
    return json({ error: "Server misconfigured" }, 500);
  }

  // Read raw body BEFORE parsing so HMAC matches the exact bytes.
  const rawBody = await req.text();
  const provided = req.headers.get("x-konnekt-signature") ?? "";
  if (!provided) return json({ error: "Missing signature" }, 401);

  const expected = await hmacSha256Hex(SECRET, rawBody);
  // Allow optional `sha256=` prefix
  const cleaned = provided.startsWith("sha256=") ? provided.slice(7) : provided;
  if (!timingSafeEqualHex(cleaned.toLowerCase(), expected.toLowerCase())) {
    return json({ error: "Invalid signature" }, 401);
  }

  let body: any;
  try { body = JSON.parse(rawBody); } catch { return json({ error: "Invalid JSON" }, 400); }

  const eventType: string = body.event ?? body.type ?? "";
  const data = body.data ?? body;
  const externalId: string | undefined =
    data.shipment_id ?? data.external_id ?? data.id ?? body.shipment_id;

  if (!eventType || !externalId) {
    return json({ error: "Missing event or shipment id" }, 400);
  }

  const incomingStatus: string =
    EVENT_TO_STATUS[eventType] ?? data.status ?? data.new_status ?? "";

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Upsert shipment (forward-only on status)
  const { data: existing, error: selErr } = await admin
    .from("shipments")
    .select("id, status")
    .eq("konnekt_external_id", externalId)
    .maybeSingle();
  if (selErr) return json({ error: `DB: ${selErr.message}` }, 500);

  let shipmentId: string;
  const nowIso = new Date().toISOString();

  if (!existing) {
    const { data: created, error: insErr } = await admin
      .from("shipments")
      .insert({
        konnekt_external_id: externalId,
        status: incomingStatus || "created",
        carrier: data.carrier ?? null,
        origin_city: data.origin_city ?? null,
        destination_city: data.destination_city ?? null,
        metadata: data.metadata ?? {},
        last_event_at: nowIso,
      } as any)
      .select("id")
      .single();
    if (insErr) return json({ error: `DB: ${insErr.message}` }, 500);
    shipmentId = (created as any).id;
  } else {
    shipmentId = (existing as any).id;
    const newStatus = incomingStatus
      ? nextStatus((existing as any).status, incomingStatus)
      : (existing as any).status;
    const { error: updErr } = await admin
      .from("shipments")
      .update({ status: newStatus, last_event_at: nowIso })
      .eq("id", shipmentId);
    if (updErr) return json({ error: `DB: ${updErr.message}` }, 500);
  }

  // Append timeline event
  const { error: evtErr } = await admin.from("timeline_events").insert({
    shipment_id: shipmentId,
    event_type: eventType,
    status: incomingStatus || null,
    source: "konnekt",
    payload: body,
    occurred_at: data.occurred_at ?? nowIso,
  } as any);
  if (evtErr) return json({ error: `DB: ${evtErr.message}` }, 500);

  return json({ ok: true, shipment_id: shipmentId, event: eventType });
});
