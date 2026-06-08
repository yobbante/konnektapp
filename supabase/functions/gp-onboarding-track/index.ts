import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const WEBHOOK_URL = "https://yobbante.com/api/webhooks/konnekt-onboarding";
const REF_REGEX = /^GP\d{4}$/i;

// Numero WhatsApp 926 (Meta Cloud API)
const WHATSAPP_PHONE_NUMBER_ID = "1184502448069695";
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

interface Payload {
  ref_gp?: string;
  event?: "link_opened" | "registered" | "whatsapp_clicked";
  konnekt_user_id?: string | null;
}

function buildWelcomeMessage(prenom: string): string {
  const name = prenom?.trim() || "";
  return `Bienvenue sur Konnekt ${name} ! 🎉

Votre compte transporteur est activé. Voici comment commencer :

1️⃣ Enregistrez un départ
Envoyez : DEP [ville] [date] [capacité]kg
Exemple : DEP Paris 15/06 20kg

2️⃣ Recevez vos missions
On vous contacte automatiquement quand un colis correspond à votre trajet.

3️⃣ Consultez vos missions
Envoyez MES MISSIONS à tout moment.

Des questions ? Répondez directement ici.

L'équipe Konnekt 🟢`;
}

async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  if (!WHATSAPP_ACCESS_TOKEN) {
    console.warn("[gp-onboarding-track] WHATSAPP_ACCESS_TOKEN missing — skipping send");
    return false;
  }
  const recipient = (to || "").replace(/\D/g, "");
  if (!recipient) return false;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "text",
          text: { body: message },
        }),
      },
    );
    if (!res.ok) {
      console.error("[gp-onboarding-track] WhatsApp send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[gp-onboarding-track] WhatsApp send error", String(e));
    return false;
  }
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
    if (event !== "link_opened" && event !== "registered" && event !== "whatsapp_clicked") {
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

    // ----- Suivi onboarding sur le registre GP (transporteurs) -----
    // form_completed_at : formulaire validé (étape 2 → inscription réussie)
    if (event === "registered") {
      await admin
        .from("transporteurs")
        .update({ form_completed_at: timestamp })
        .ilike("reference", ref_gp)
        .is("form_completed_at", null);
    }
    // whatsapp_clicked_at : clic sur "Activer mon compte sur WhatsApp"
    if (event === "whatsapp_clicked") {
      await admin
        .from("transporteurs")
        .update({ whatsapp_clicked_at: timestamp })
        .ilike("reference", ref_gp)
        .is("whatsapp_clicked_at", null);
    }


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

    // On registration: send the Konnekt welcome WhatsApp from the 926 number.
    // Only once per GP (skip if welcome already sent).
    let welcome_sent = false;
    if (event === "registered") {
      const { data: gp } = await admin
        .from("transporteurs")
        .select("prenom, telephone_1, welcome_sent_at")
        .ilike("reference", ref_gp)
        .maybeSingle();

      if (gp?.telephone_1 && !gp.welcome_sent_at) {
        welcome_sent = await sendWhatsApp(gp.telephone_1, buildWelcomeMessage(gp.prenom ?? ""));
        if (welcome_sent) {
          await admin
            .from("transporteurs")
            .update({ welcome_sent_at: new Date().toISOString() })
            .ilike("reference", ref_gp);
        }
      }
    }

    return json({ ok: true, already_registered, welcome_sent });
  } catch (e) {
    console.error("[gp-onboarding-track] error", String((e as Error).message || e));
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
