// Konnekt /beta landing — full registration with custom password.
// Looks up an existing GP profile by 4-char ref prefix when provided,
// creates or recovers the auth user, links/updates the gp_profile,
// and logs the referral.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  ref?: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  whatsapp?: string;
  city: string;
  modes: string[];
  password: string;
  source?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
const bad = (msg: string, status = 400) => json({ error: msg }, status);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: Payload;
    try { body = await req.json(); } catch { return bad("Invalid JSON"); }

    const first = (body.first_name || "").trim();
    const last = (body.last_name || "").trim();
    const phoneRaw = (body.phone || "").trim();
    const cleanPhone = phoneRaw.replace(/\D/g, "");
    const whatsapp = (body.whatsapp || phoneRaw).trim();
    const city = (body.city || "").trim();
    const modes = Array.isArray(body.modes) ? body.modes : [];
    const password = body.password || "";
    const ref = (body.ref || "").trim().toLowerCase().replace(/^gp/, "");

    if (!first || !last || cleanPhone.length < 6 || !city || modes.length === 0)
      return bad("Champs invalides");
    if (password.length < 6) return bad("Mot de passe trop court");

    const fullName = `${first} ${last}`.trim();
    const email = `t${cleanPhone}@konnekt.beta`;

    // 1) Look up existing GP by ref prefix (case-insensitive on uuid hex)
    let existingGp: { id: string; user_id: string | null } | null = null;
    if (ref && /^[0-9a-f]{4,8}$/.test(ref)) {
      const { data } = await admin
        .from("gp_profiles")
        .select("id, user_id")
        .ilike("id", `${ref}%`)
        .limit(1)
        .maybeSingle();
      if (data) existingGp = data as any;
    }

    // 2) Create or recover the auth user
    let userId: string | null = existingGp?.user_id || null;
    if (!userId) {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, beta: true, source: body.source ?? "beta_landing" },
      });
      if (created?.user) {
        userId = created.user.id;
      } else {
        // User likely exists — update password and recover id
        const anonClient = createClient(SUPABASE_URL, ANON_KEY);
        const { data: signIn } = await anonClient.auth.signInWithPassword({ email, password });
        if (signIn?.user) {
          userId = signIn.user.id;
        } else {
          // Try resetting password through admin then sign-in
          const { data: list } = await admin.auth.admin.listUsers();
          const found = list?.users?.find((u: any) => u.email === email);
          if (found) {
            await admin.auth.admin.updateUserById(found.id, { password });
            userId = found.id;
          } else {
            return bad(`AUTH: ${cErr?.message ?? "create failed"}`, 500);
          }
        }
      }
    } else {
      // Existing GP user — update its password so the user can sign in
      try { await admin.auth.admin.updateUserById(userId, { password }); } catch { /* noop */ }
    }
    if (!userId) return bad("AUTH: no user id", 500);

    // 3) Upsert gp_profile (link to user_id, refresh basic info)
    let gpId: string | null = existingGp?.id || null;
    const gpPayload: Record<string, unknown> = {
      user_id: userId,
      business_name: fullName,
      phone: phoneRaw,
      whatsapp,
      city,
      country_code: "SN",
      gp_type: "bagages_international",
      status: "verified",
      kyc_status: "pending",
      kyc_level: 0,
    };
    if (gpId) {
      await admin.from("gp_profiles").update(gpPayload).eq("id", gpId);
    } else {
      const { data: gp, error: gpErr } = await admin
        .from("gp_profiles")
        .insert(gpPayload as any)
        .select("id")
        .single();
      if (gpErr) return bad(`GP: ${gpErr.message}`, 500);
      gpId = (gp as any).id;
    }

    // 4) Profile name sync
    try {
      await admin.from("profiles").upsert({ user_id: userId, email, full_name: fullName } as any, { onConflict: "user_id" });
    } catch { /* noop */ }

    // 5) Referral log
    if (ref) {
      try {
        await admin.from("konnekt_beta_referrals").insert({
          gp_ref: ref.toUpperCase(),
          registered_user_id: userId,
          registered_gp_id: gpId,
          source: body.source ?? "beta_landing",
        } as any);
      } catch { /* noop */ }
    }

    // 6) Tracking
    try {
      await admin.from("beta_tracking_events").insert({
        event_type: "beta_registered",
        gp_id: gpId,
        user_id: userId,
        source: body.source ?? "beta_landing",
        metadata: { ref: ref || null, city, modes },
      } as any);
    } catch { /* noop */ }

    // 7) Sign in to return a session
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

    return json({
      user_id: userId,
      gp_id: gpId,
      gp_ref: gpId ? gpId.slice(0, 4).toUpperCase() : null,
      session,
      had_existing_gp: !!existingGp,
    });
  } catch (e: any) {
    console.error("[beta-register] fatal", e);
    return bad(`SERVER: ${e?.message ?? String(e)}`, 500);
  }
});
