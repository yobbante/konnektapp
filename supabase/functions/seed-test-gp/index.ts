// One-off seeding function: creates the test GP account (auth user + profile + gp_profile).
// Idempotent: safe to call multiple times.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const EMAIL = "gptesting2@g.com";
const PASSWORD = "ffffffff1@";
const PHONE = "+221770000099";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Find or create the auth user
    let userId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === EMAIL);

    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, {
        password: PASSWORD,
        email_confirm: true,
      });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Testing GP" },
      });
      if (createErr) return json({ step: "createUser", error: createErr.message }, 500);
      userId = created.user.id;
    }

    if (!userId) return json({ error: "No user id" }, 500);

    // 2. Upsert profile (mark as GP)
    await admin.from("profiles").upsert(
      {
        user_id: userId,
        email: EMAIL,
        full_name: "Testing GP",
        phone: PHONE,
        country_code: "SN",
        city: "Dakar",
        is_gp: true,
      },
      { onConflict: "user_id" },
    );

    // 3. Upsert gp_profile
    const { data: existingGp } = await admin
      .from("gp_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingGp) {
      await admin
        .from("gp_profiles")
        .update({
          business_name: "Testing GP",
          phone: PHONE,
          whatsapp: PHONE,
          status: "verified",
          gp_type: "bagages_international",
          city: "Dakar",
          country_code: "SN",
        })
        .eq("id", existingGp.id);
    } else {
      const { error: gpErr } = await admin.from("gp_profiles").insert({
        user_id: userId,
        business_name: "Testing GP",
        phone: PHONE,
        whatsapp: PHONE,
        status: "verified",
        gp_type: "bagages_international",
        city: "Dakar",
        country_code: "SN",
      });
      if (gpErr) return json({ step: "insertGp", error: gpErr.message }, 500);
    }

    return json({ ok: true, userId, email: EMAIL });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
