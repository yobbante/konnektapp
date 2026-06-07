import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const WEBHOOK_URL = "https://yobbante.com/api/webhooks/konnekt-onboarding";
const REF_REGEX = /^GP\d{4}$/i;

interface Payload {
  ref_gp?: string;
  event?: "link_opened" | "registered";
  konnekt_user_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = (await req.json()) as Payload;
    const ref_gp = (body.ref_gp || "").trim().toUpperCase();
    const event = body.event;
    const konnekt_user_id = body.konnekt_user_id || null;

    if (!REF_REGEX.test(ref_gp)) {
      return json({ error: "Invalid ref_gp format" }, 400);
    }
    if (event !== "link_opened" && event !== "registered") {
      return json({ error: "Invalid event" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Is this ref already registered?
    const { data: existingReg } = await admin
      .from("gp_onboarding_events")
      .select("id")
      .eq("ref_gp", ref_gp)
      .eq("event", "registered")
      .limit(1)
      .maybeSingle();

    const already_registered = !!existingReg;
    const timestamp = new Date().toISOString();

    // Record the event in the database
    const { error: insertErr } = await admin.from("gp_onboarding_events").insert({
      ref_gp,
      event,
      konnekt_user_id,
      occurred_at: timestamp,
    });
    if (insertErr) throw insertErr;

    // Fire the webhook to Yobbanté (server-side, best-effort)
    const webhookPayload =
      event === "registered"
        ? { ref_gp, timestamp, konnekt_user_id, event }
        : { ref_gp, timestamp, event };

    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });
    } catch (whErr) {
      console.error("[gp-onboarding-track] webhook failed", String(whErr));
    }

    return json({ ok: true, already_registered });
  } catch (e) {
    console.error("[gp-onboarding-track] error", String((e as Error).message || e));
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
