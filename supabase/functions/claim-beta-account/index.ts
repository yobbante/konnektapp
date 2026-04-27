// Claim a beta transporter account.
// Called AFTER the user has updated their email/password (or signed in via Google).
// Server-side guarantees:
//   1) The new email is not already claimed by another GP profile.
//   2) The current authenticated user owns a gp_profile (created via beta-onboard).
//   3) Marks the profile as claimed (beta_claimed_at + beta_claimed_email).
//   4) Returns { claimed: true } so the client can hide the banner permanently.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
      return json({ error: "Server misconfigured" }, 500);
    }

    // Validate caller's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claims.claims.sub as string;
    const claimedEmail = (claims.claims.email as string | undefined)?.toLowerCase().trim();

    if (!claimedEmail || claimedEmail.endsWith("@konnekt.beta")) {
      return json({ error: "Email réel requis pour réclamer le compte" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Find the caller's gp_profile
    const { data: gp, error: gpErr } = await admin
      .from("gp_profiles")
      .select("id, beta_claimed_at, beta_claimed_email, phone")
      .eq("user_id", userId)
      .maybeSingle();

    if (gpErr) return json({ error: gpErr.message }, 500);
    if (!gp) return json({ error: "Aucun profil transporteur trouvé" }, 404);

    // Idempotent: already claimed → just return current state
    if ((gp as any).beta_claimed_at) {
      return json({
        claimed: true,
        gp_id: (gp as any).id,
        beta_claimed_email: (gp as any).beta_claimed_email,
        already_claimed: true,
      });
    }

    // 2) Uniqueness check: ensure no OTHER gp_profile has this email already claimed
    const { data: conflict } = await admin
      .from("gp_profiles")
      .select("id, user_id")
      .ilike("beta_claimed_email", claimedEmail)
      .neq("user_id", userId)
      .maybeSingle();

    if (conflict) {
      return json({
        error: "Cet email est déjà utilisé par un autre compte transporteur.",
        code: "EMAIL_ALREADY_CLAIMED",
      }, 409);
    }

    // 3) Mark profile as claimed
    const { error: updErr } = await admin
      .from("gp_profiles")
      .update({
        beta_claimed_at: new Date().toISOString(),
        beta_claimed_email: claimedEmail,
      } as any)
      .eq("id", (gp as any).id);

    if (updErr) {
      // Unique index violation = race condition with another concurrent claim
      if (updErr.message?.toLowerCase().includes("duplicate") ||
          updErr.message?.toLowerCase().includes("unique")) {
        return json({
          error: "Cet email vient d'être utilisé par un autre compte.",
          code: "EMAIL_ALREADY_CLAIMED",
        }, 409);
      }
      return json({ error: updErr.message }, 500);
    }

    // 4) Tracking event (best-effort)
    try {
      await admin.from("beta_tracking_events").insert({
        event_type: "account_claimed",
        gp_id: (gp as any).id,
        user_id: userId,
        metadata: { method: "post_auth_link", email: claimedEmail },
      } as any);
    } catch { /* noop */ }

    return json({
      claimed: true,
      gp_id: (gp as any).id,
      beta_claimed_email: claimedEmail,
    });
  } catch (e: any) {
    console.error("[claim-beta-account] fatal", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
