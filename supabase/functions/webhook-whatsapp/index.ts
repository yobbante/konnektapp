// Webhook WhatsApp — Bot GP (numero 122)
// Gere les messages entrants. Detecte les inscriptions Konnekt AVANT
// le traitement des commandes GP. Public endpoint (verify_jwt = false).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PHONE = "+221786078080";

// Patterns d'inscription Konnekt (sans accents, minuscules)
const SIGNUP_PATTERNS = [
  "konnekt",
  "je viens de m inscrire",
  "inscription",
  "je m appelle",
  "nouveau transporteur",
  "nouveau gp",
];

const SIGNUP_REPLY = `Salam !
Bienvenue sur Konnekt.
Votre inscription a bien ete recue. Notre equipe l active sous 24h.

En attendant :
Pour declarer un depart :
DEP [ville] [date] [kg]
Ex : DEP Paris 15/06 25kg

Pour le menu complet :
Envoyez AIDE`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Normalise: minuscules, sans accents, ponctuation -> espace
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Garde uniquement les chiffres pour comparer des numeros
function digitsOnly(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

// Extrait expediteur + texte depuis differents formats (Twilio, Meta, simple)
function extractMessage(body: any): { sender: string; text: string } {
  // Format simple { from, body } ou { sender_phone, message }
  let sender = body.from ?? body.From ?? body.sender_phone ?? body.sender ?? "";
  let text = body.body ?? body.Body ?? body.message ?? body.text ?? "";

  // Format Meta WhatsApp Cloud API
  try {
    const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (msg) {
      sender = sender || msg.from || "";
      text = text || msg.text?.body || "";
    }
  } catch (_) { /* ignore */ }

  return { sender: String(sender), text: String(text) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "Server misconfigured" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { sender, text } = extractMessage(body);
  if (!sender) return json({ error: "Missing sender" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 0) PATTERN "CODE [ref]" — generation d'un lien magique d'acces GP
  // Traite AVANT toute autre logique.
  const codeMatch = String(text || "")
    .trim()
    .match(/^code\s+(gp\s*\d{3,})/i);
  if (codeMatch) {
    const ref = codeMatch[1].replace(/\s+/g, "").toUpperCase();
    const token = `${crypto.randomUUID()}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await admin.from("auth_tokens").insert({
      token,
      phone: sender,
      ref_gp: ref,
      expires_at: expiresAt,
      used: false,
    });

    // Recuperer le prenom pour la notification admin
    const { data: gp } = await admin
      .from("transporteurs")
      .select("prenom")
      .ilike("reference", ref)
      .maybeSingle();

    const link = `https://usekonnekt.com/gp/auth?token=${token}`;
    const reply =
      `🔐 Votre lien d'accès Konnekt :\n${link}\n\n` +
      `Valable 15 minutes. Ne le partagez pas.`;
    const adminNote = `🔐 GP ${ref} ${(gp as any)?.prenom || ""} a demandé un accès`;
    const AUTH_ADMIN_PHONE = "+221784604003";

    await admin.from("whatsapp_inbound_messages").insert({
      sender_phone: sender,
      message_body: text,
      tag: "gp_auth_code",
      is_known_gp: !!gp,
      bot_reply: reply,
      raw_payload: body,
    });

    return json({
      handled: true,
      type: "gp_auth_code",
      reply,
      admin_notify: { to: AUTH_ADMIN_PHONE, message: adminNote },
    });
  }

  const normalized = normalize(text);
  const senderDigits = digitsOnly(sender);

  // 1) Verifier si le numero est deja un GP connu (transporteur)
  const { data: gpRows } = await admin
    .from("gp_profiles")
    .select("id, phone, whatsapp, whatsapp_phone, phone_secondary");
  // Compare sur les 9 derniers chiffres (numero national) pour eviter
  // les faux positifs lies aux indicatifs pays.
  const senderTail = senderDigits.slice(-9);
  const isKnownGp = senderDigits.length >= 8 && (gpRows ?? []).some((g: any) => {
    const candidates = [g.phone, g.whatsapp, g.whatsapp_phone, g.phone_secondary]
      .filter(Boolean)
      .map((p: string) => digitsOnly(p))
      .filter((c: string) => c.length >= 8);
    return candidates.some((c: string) => c === senderDigits || c.slice(-9) === senderTail);
  });

  // 2) DETECTION INSCRIPTION KONNEKT — AVANT toute commande GP
  const matchesSignup = SIGNUP_PATTERNS.some((p) => normalized.includes(p));

  if (matchesSignup && !isKnownGp) {
    // Logger avec le tag konnekt_signup
    await admin.from("whatsapp_inbound_messages").insert({
      sender_phone: sender,
      message_body: text,
      tag: "konnekt_signup",
      is_known_gp: false,
      bot_reply: SIGNUP_REPLY,
      raw_payload: body,
    });

    // Notification admin (loggee egalement pour /admin/messages)
    const adminNote = `Nouveau GP inscrit Konnekt :\nTel : ${sender}\nValider dans /admin/terrain`;
    await admin.from("whatsapp_inbound_messages").insert({
      sender_phone: ADMIN_PHONE,
      message_body: adminNote,
      tag: "admin_notification",
      is_known_gp: false,
      raw_payload: { source: "konnekt_signup", from: sender },
    });

    return json({
      handled: true,
      type: "konnekt_signup",
      reply: SIGNUP_REPLY,
      admin_notify: { to: ADMIN_PHONE, message: adminNote },
    });
  }

  // 3) Sinon: logger comme message standard (commandes GP traitees ailleurs)
  await admin.from("whatsapp_inbound_messages").insert({
    sender_phone: sender,
    message_body: text,
    tag: isKnownGp ? "gp_command" : "unknown",
    is_known_gp: isKnownGp,
    raw_payload: body,
  });

  return json({ handled: false, is_known_gp: isKnownGp });
});
