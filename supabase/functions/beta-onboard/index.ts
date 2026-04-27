// Beta transporter onboarding (zero-friction).
// Creates user (idempotent via createUser→fallback), gp_profile, gp_offer, then
// returns a session for the client. Service role bypasses RLS so this works
// before the freshly created session has propagated.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  name: string;
  phone: string;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  capacity_kg: number;
  source?: string;
  session_id?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function bad(msg: string, status = 400) {
  return json({ error: msg }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
      return bad("Server misconfigured", 500);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: Payload;
    try { body = await req.json(); } catch { return bad("Invalid JSON"); }

    const name = (body.name || "").trim();
    const phoneRaw = (body.phone || "").trim();
    const cleanPhone = phoneRaw.replace(/\D/g, "");
    const origin = (body.origin_city || "").trim();
    const destination = (body.destination_city || "").trim();
    const date = body.departure_date;
    const capacity = Number(body.capacity_kg);

    if (!name || cleanPhone.length < 6 || !origin || !destination || !date || !(capacity > 0)) {
      return bad("Champs invalides");
    }

    const email = `t${cleanPhone}@konnekt.beta`;
    // Deterministic password derived from phone — lets us re-sign-in on retries
    const password = `Knkt!${cleanPhone}_beta2027`;

    // 1) Create or recover user (no listUsers — that endpoint is slow/paginated)
    let userId: string | null = null;
    {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, source: body.source ?? null, beta: true },
      });
      if (created?.user) {
        userId = created.user.id;
      } else if (cErr) {
        // Likely "User already registered" — sign in to recover the id
        const anonClient = createClient(SUPABASE_URL, ANON_KEY);
        const { data: signIn, error: siErr } = await anonClient.auth.signInWithPassword({ email, password });
        if (signIn?.user) {
          userId = signIn.user.id;
        } else {
          return bad(`AUTH: ${cErr.message ?? siErr?.message ?? "create failed"}`, 500);
        }
      }
    }
    if (!userId) return bad("AUTH: no user id", 500);

    // 2) GP profile (create if missing)
    let gpId: string | null = null;
    {
      const { data: existing } = await admin
        .from("gp_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        gpId = (existing as any).id;
      } else {
        const { data: gp, error: gpErr } = await admin
          .from("gp_profiles")
          .insert({
            user_id: userId,
            business_name: name,
            phone: phoneRaw,
            whatsapp: phoneRaw,
            city: origin,
            country_code: "SN",
            gp_type: "bagages_international",
            status: "verified",
            kyc_status: "pending",
            kyc_level: 0,
          } as any)
          .select("id")
          .single();
        if (gpErr) return bad(`GP: ${gpErr.message}`, 500);
        gpId = (gp as any).id;
      }
    }

    // 3) Departure (gp_offers)
    const { data: offer, error: oErr } = await admin
      .from("gp_offers")
      .insert({
        gp_id: gpId,
        origin_city: origin,
        destination_city: destination,
        departure_date: date,
        total_capacity: capacity,
        available_capacity: capacity,
        price_per_kg: 0,
        currency: "XOF",
        transport_type: "bagages_international",
        status: "active",
      } as any)
      .select("id")
      .single();
    if (oErr) return bad(`OFFER: ${oErr.message}`, 500);

    // 4) Sign in to return a session (deterministic password makes this reliable)
    let session: { access_token: string; refresh_token: string } | null = null;
    {
      const anonClient = createClient(SUPABASE_URL, ANON_KEY);
      const { data: signIn } = await anonClient.auth.signInWithPassword({ email, password });
      if (signIn?.session) {
        session = {
          access_token: signIn.session.access_token,
          refresh_token: signIn.session.refresh_token,
        };
      }
    }

    // 5) Tracking event (best-effort, never fail the request)
    try {
      await admin.from("beta_tracking_events").insert({
        event_type: "departure_published",
        gp_id: gpId,
        user_id: userId,
        session_id: body.session_id ?? null,
        source: body.source ?? null,
        metadata: { origin, destination, date, capacity },
      } as any);
    } catch { /* noop */ }

    return json({
      user_id: userId,
      gp_id: gpId,
      offer_id: (offer as any)?.id,
      session,
      account_ready: !!session,
    });
  } catch (e: any) {
    console.error("[beta-onboard] fatal", e);
    return bad(`SERVER: ${e?.message ?? String(e)}`, 500);
  }
});
