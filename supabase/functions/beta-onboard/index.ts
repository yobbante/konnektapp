// Beta transporter onboarding (zero-friction).
// Creates a user (if needed), gp_profile (if needed) and gp_offer in a single
// service-role call so the RLS check `auth.uid() = user_id` cannot fail
// when the freshly created session hasn't propagated yet.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function bad(msg: string, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
  const password = `Knkt!${cleanPhone}${Math.floor(Math.random() * 9000 + 1000)}`;

  // 1) Find or create user (auto-confirmed via service role)
  let userId: string | null = null;
  try {
    const { data: existingList } = await admin.auth.admin.listUsers();
    const existing = existingList?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, source: body.source ?? null, beta: true },
      });
      if (cErr) throw cErr;
      userId = created.user!.id;
    }
  } catch (e: any) {
    return bad(`AUTH: ${e.message ?? e}`, 500);
  }

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

  // 4) Sign in to return a session for the client
  const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
  let session: any = null;
  const { data: signIn, error: siErr } = await anonClient.auth.signInWithPassword({ email, password });
  if (!siErr && signIn?.session) {
    session = {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    };
  } else {
    // existing user with unknown password -> generate a magic link token instead
    const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    session = { magic_link: link?.properties?.action_link ?? null };
  }

  // 5) Tracking event
  await admin.from("beta_tracking_events").insert({
    event_type: "departure_published",
    gp_id: gpId,
    user_id: userId,
    session_id: body.session_id ?? null,
    source: body.source ?? null,
    metadata: { origin, destination, date, capacity },
  } as any);

  return new Response(
    JSON.stringify({
      user_id: userId,
      gp_id: gpId,
      offer_id: (offer as any)?.id,
      session,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
