// gp-bot — Bot WhatsApp unifie Konnekt / Yobbante (numero 926)
// Identification unifiee (transporteurs + profiles role gp), MES MISSIONS,
// DEP (depart dans les 2 systemes), STATUS (stats perso).
// Public endpoint (verify_jwt = false).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PHONE = "+221784604003";

const ONBOARD_REPLY = `Salam !
Vous n etes pas encore enregistre.
Inscrivez-vous gratuitement :
usekonnekt.com/beta

Deja inscrit ? Envoyez votre prenom.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnly(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

function extractMessage(body: any): { sender: string; text: string; imageId: string | null } {
  let sender = body.from ?? body.From ?? body.sender_phone ?? body.sender ?? "";
  let text = body.body ?? body.Body ?? body.message ?? body.text ?? "";
  // Image directe (formats simples)
  let imageId: string | null = body.image_id ?? body.media_id ?? body.image?.id ?? null;
  try {
    const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (msg) {
      sender = sender || msg.from || "";
      text = text || msg.text?.body || msg.image?.caption || "";
      if (!imageId && msg.type === "image" && msg.image?.id) imageId = msg.image.id;
    }
  } catch (_) { /* ignore */ }
  return { sender: String(sender), text: String(text), imageId: imageId ? String(imageId) : null };
}

// --- Vision flyer : telechargement media Meta + extraction Claude ---
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

async function downloadWhatsAppImage(mediaId: string): Promise<{ base64: string; mediaType: string } | null> {
  if (!WHATSAPP_ACCESS_TOKEN) {
    console.warn("[gp-bot] WHATSAPP_ACCESS_TOKEN manquant — impossible de telecharger l'image");
    return null;
  }
  try {
    // 1) Resoudre l'URL du media
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
    });
    if (!metaRes.ok) {
      console.error("[gp-bot] media meta fetch failed", metaRes.status, await metaRes.text());
      return null;
    }
    const meta = await metaRes.json();
    const url = meta?.url;
    const mediaType = meta?.mime_type || "image/jpeg";
    if (!url) return null;
    // 2) Telecharger le binaire (auth requise)
    const binRes = await fetch(url, { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } });
    if (!binRes.ok) {
      console.error("[gp-bot] media download failed", binRes.status);
      return null;
    }
    const buf = new Uint8Array(await binRes.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    return { base64: btoa(binary), mediaType };
  } catch (e) {
    console.error("[gp-bot] downloadWhatsAppImage error", String(e));
    return null;
  }
}

interface FlyerData {
  ville_depart: string | null;
  ville_arrivee: string | null;
  date_depart: string | null;
  capacite_kg: number | null;
}

async function extractFlyerWithClaude(base64: string, mediaType: string): Promise<FlyerData | null> {
  if (!ANTHROPIC_API_KEY) {
    console.warn("[gp-bot] ANTHROPIC_API_KEY manquant — extraction impossible");
    return null;
  }
  const system = `Tu es un assistant qui extrait les infos de départ depuis un flyer de transporteur GP. Réponds UNIQUEMENT en JSON strict :
{
  ville_depart: string,
  ville_arrivee: string,
  date_depart: string (format JJ/MM),
  capacite_kg: number ou null
}
Si une info est absente, mets null.`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: "Extrais les infos de depart de ce flyer." },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("[gp-bot] Claude API failed", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const raw = data?.content?.[0]?.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    return {
      ville_depart: parsed.ville_depart ?? null,
      ville_arrivee: parsed.ville_arrivee ?? null,
      date_depart: parsed.date_depart ?? null,
      capacite_kg: typeof parsed.capacite_kg === "number" ? parsed.capacite_kg : null,
    };
  } catch (e) {
    console.error("[gp-bot] extractFlyerWithClaude error", String(e));
    return null;
  }
}

// Compare deux numeros sur les 9 derniers chiffres (numero national)
function phoneMatches(a: string, b: string): boolean {
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (da.length < 8 || db.length < 8) return false;
  return da === db || da.slice(-9) === db.slice(-9);
}

const ACTIVE_DOSSIER_EXCLUDE = ["DELIVERED", "CANCELLED"];

async function getActiveMissions(admin: any, ref: string) {
  if (!ref) return [];
  const { data } = await admin
    .from("dossiers")
    .select("ref, ville, poids, status")
    .eq("assigned_transporteur_ref", ref)
    .not("status", "in", `(${ACTIVE_DOSSIER_EXCLUDE.join(",")})`);
  return data ?? [];
}

function dossierStatusLabel(status: string): string {
  const map: Record<string, string> = {
    CREATED: "A collecter",
    TO_COLLECT: "A collecter",
    COLLECTED: "Collecte",
    WEIGHT_PENDING: "Poids a enregistrer",
    IN_TRANSIT: "En transit",
  };
  return map[status] || status;
}

function formatMissions(missions: any[]): string {
  if (!missions.length) return "Vous n avez aucune mission active.";
  const lines = missions.map((m) => {
    const label = dossierStatusLabel(m.status);
    const action = m.status === "WEIGHT_PENDING"
      ? `POIDS ${m.ref} [kg]kg`
      : `COLLECTE ${m.ref}`;
    return `${m.ref} · ${m.ville ?? "?"} · ${m.poids ?? "?"}kg\nStatut : ${label}\n→ ${action}`;
  });
  return `Vos missions actives :\n\n${lines.join("\n\n")}`;
}

// DEP Paris 15/06 25kg  (ancien format)
// DEP Paris Dakar 15/06 25  (nouveau format : depart arrivee date capacite)
function parseDep(normalized: string): { origin: string | null; dest: string; date: string; kg: number | null } | null {
  // Nouveau format 4 champs : DEP <ville_depart> <ville_arrivee> <date> <capacite>
  const m4 = normalized.match(/^dep\s+(\S+)\s+(\S+)\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(\d+(?:\.\d+)?)\s*kg?$/);
  if (m4) {
    return { origin: m4[1].trim(), dest: m4[2].trim(), date: m4[3], kg: parseFloat(m4[4]) };
  }
  // Ancien format : DEP <destination> <date> <capacite>
  const m = normalized.match(/^dep\s+(.+?)\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(\d+(?:\.\d+)?)\s*kg?$/);
  if (!m) return null;
  return { origin: null, dest: m[1].trim(), date: m[2], kg: parseFloat(m[3]) };
}

async function createDeparture(
  admin: any,
  opts: { reference: string | null; gpProfileId: string | null; origin: string | null; dest: string; date: string; kg: number | null; sender: string },
) {
  await admin.from("manual_departures").insert({
    gp_reference: opts.reference,
    gp_profile_id: opts.gpProfileId,
    destination: opts.origin ? `${opts.origin} → ${opts.dest}` : opts.dest,
    date_depart: opts.date,
    poids_kg: opts.kg,
    source: "whatsapp_926",
    sender_phone: opts.sender,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Health-check (statut ligne 926) — aucun effet de bord
  if (req.method === "GET") return json({ status: "ok", line: "926" });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "Server misconfigured" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  // Ping de santé via POST { ping: true } — aucun effet de bord
  if (body && body.ping === true) return json({ status: "ok", line: "926" });

  const { sender, text, imageId } = extractMessage(body);
  if (!sender) return json({ error: "Missing sender" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const normalized = normalize(text);

  // ----- PARTIE 1 : Identification unifiee -----
  // 1) Table transporteurs (Yobbante)
  const { data: transporteurs } = await admin
    .from("transporteurs")
    .select("telephone_1, telephone_2, prenom, nom, reference");
  const yobbante = (transporteurs ?? []).find((t: any) =>
    phoneMatches(t.telephone_1 ?? "", sender) || phoneMatches(t.telephone_2 ?? "", sender)
  ) || null;

  // 2) Table profiles (Konnekt, GP)
  const { data: profilesGp } = await admin
    .from("profiles")
    .select("user_id, full_name, phone")
    .eq("is_gp", true);
  const konnektProfile = (profilesGp ?? []).find((p: any) => phoneMatches(p.phone ?? "", sender)) || null;

  // Reference GP cote Konnekt (gp_profiles)
  let gpProfile: any = null;
  if (konnektProfile) {
    const { data: gp } = await admin
      .from("gp_profiles")
      .select("id, reference, business_name, prenom, nom, phone")
      .eq("user_id", konnektProfile.user_id)
      .maybeSingle();
    gpProfile = gp || null;
  }
  if (!gpProfile) {
    // Fallback: match direct sur gp_profiles.phone
    const { data: gpRows } = await admin
      .from("gp_profiles")
      .select("id, reference, business_name, prenom, nom, phone");
    gpProfile = (gpRows ?? []).find((g: any) => phoneMatches(g.phone ?? "", sender)) || null;
  }

  const isUnified = !!yobbante && (!!konnektProfile || !!gpProfile);
  const reference = gpProfile?.reference || yobbante?.reference || null;
  const knownName = gpProfile?.prenom || gpProfile?.business_name || yobbante?.prenom || "GP";

  // Suivi onboarding : 1er message entrant d'un GP ayant cliqué "Activer sur WhatsApp"
  // → whatsapp_confirmed_at (uniquement si whatsapp_clicked_at non null et pas déjà confirmé)
  if (reference) {
    await admin
      .from("transporteurs")
      .update({ whatsapp_confirmed_at: new Date().toISOString() })
      .ilike("reference", reference)
      .not("whatsapp_clicked_at", "is", null)
      .is("whatsapp_confirmed_at", null);
  }


  // Inconnu dans les deux -> onboarding Konnekt + notif admin
  if (!yobbante && !konnektProfile && !gpProfile) {
    await admin.from("whatsapp_inbound_messages").insert({
      sender_phone: sender,
      message_body: text,
      tag: "unknown_926",
      is_known_gp: false,
      bot_reply: ONBOARD_REPLY,
      raw_payload: body,
    });
    const adminNote = `Nouveau contact inconnu sur 926 :\n${sender} · A identifier`;
    await admin.from("whatsapp_inbound_messages").insert({
      sender_phone: ADMIN_PHONE,
      message_body: adminNote,
      tag: "admin_notification",
      is_known_gp: false,
      raw_payload: { source: "unknown_926", from: sender },
    });
    return json({ handled: true, type: "onboarding", reply: ONBOARD_REPLY, admin_notify: { to: ADMIN_PHONE, message: adminNote } });
  }

  // ----- PARTIE IMAGE : Flyer GP analyse par Claude (vision) -----
  if (imageId) {
    const img = await downloadWhatsAppImage(imageId);
    const flyer = img ? await extractFlyerWithClaude(img.base64, img.mediaType) : null;
    const usable = flyer && (flyer.ville_depart || flyer.ville_arrivee || flyer.date_depart);

    if (!usable) {
      const reply = "Je n'arrive pas à lire cette image.\nTapez : DEP [ville] [destination] [date] [capacité]";
      await admin.from("whatsapp_inbound_messages").insert({
        sender_phone: sender, message_body: "[image]", tag: "flyer_unreadable", is_known_gp: true, bot_reply: reply, raw_payload: body,
      });
      return json({ handled: true, type: "flyer_unreadable", reply });
    }

    // Stocker en session (pending_dep) pour 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await admin.from("gp_sessions").upsert(
      {
        sender_phone: sender,
        gp_reference: reference,
        pending_dep: flyer,
        expires_at: expiresAt,
      },
      { onConflict: "sender_phone" },
    );

    const cap = flyer!.capacite_kg != null ? `${flyer!.capacite_kg}kg` : "non précisée";
    const reply = `✅ J'ai détecté les infos suivantes :
📍 Départ : ${flyer!.ville_depart ?? "?"}
🏁 Destination : ${flyer!.ville_arrivee ?? "?"}
📅 Date : ${flyer!.date_depart ?? "?"}
⚖️ Capacité : ${cap}

Tapez OUI pour confirmer, ou corrigez avec :
DEP ${flyer!.ville_depart ?? "[ville]"} ${flyer!.ville_arrivee ?? "[destination]"} ${flyer!.date_depart ?? "[date]"} ${flyer!.capacite_kg ?? "[capacité]"}`;
    await admin.from("whatsapp_inbound_messages").insert({
      sender_phone: sender, message_body: "[image]", tag: "flyer_detected", is_known_gp: true, bot_reply: reply, raw_payload: body,
    });
    return json({ handled: true, type: "flyer_detected", reply, pending_dep: flyer });
  }

  // ----- PARTIE OUI : confirmation d'un depart detecte depuis un flyer -----
  if (normalized === "oui" || normalized === "ok" || normalized === "confirmer") {
    const { data: session } = await admin
      .from("gp_sessions")
      .select("pending_dep, expires_at")
      .eq("sender_phone", sender)
      .maybeSingle();
    const pending = session?.pending_dep as FlyerData | null;
    const stillValid = session && new Date(session.expires_at).getTime() > Date.now();

    if (pending && stillValid) {
      await createDeparture(admin, {
        reference,
        gpProfileId: gpProfile?.id ?? null,
        origin: pending.ville_depart,
        dest: pending.ville_arrivee ?? pending.ville_depart ?? "?",
        date: pending.date_depart ?? "",
        kg: pending.capacite_kg,
        sender,
      });
      await admin.from("gp_sessions").delete().eq("sender_phone", sender);
      const cap = pending.capacite_kg != null ? `${pending.capacite_kg}kg` : "?";
      const reply = `Depart enregistre :\n${pending.ville_depart ?? "?"} → ${pending.ville_arrivee ?? "?"} · ${pending.date_depart ?? "?"} · ${cap}\n${gpProfile ? "Visible dans votre dashboard Konnekt." : "Merci !"}`;
      await admin.from("whatsapp_inbound_messages").insert({
        sender_phone: sender, message_body: text, tag: "flyer_confirmed", is_known_gp: true, bot_reply: reply, raw_payload: body,
      });
      return json({ handled: true, type: "flyer_confirmed", reply });
    }
    // Pas de session valide : on laisse passer vers le menu
  }

  // ----- PARTIE 3 : DEP cree dans les 2 systemes -----
  const dep = parseDep(normalized);
  if (dep) {
    await createDeparture(admin, {
      reference,
      gpProfileId: gpProfile?.id ?? null,
      origin: dep.origin,
      dest: dep.dest,
      date: dep.date,
      kg: dep.kg,
      sender,
    });
    const route = dep.origin ? `${dep.origin} → ${dep.dest}` : dep.dest;
    const cap = dep.kg != null ? `${dep.kg}kg` : "?";
    const reply = `Depart enregistre :\n${route} · ${dep.date} · ${cap}\n${gpProfile ? "Visible dans votre dashboard Konnekt." : "Merci !"}`;
    await admin.from("whatsapp_inbound_messages").insert({
      sender_phone: sender, message_body: text, tag: "dep_declared", is_known_gp: true, bot_reply: reply, raw_payload: body,
    });
    return json({ handled: true, type: "dep", reply });
  }


  // ----- PARTIE 2 : MES MISSIONS -----
  if (normalized === "1" || normalized.includes("mes missions")) {
    const missions = await getActiveMissions(admin, reference);
    const reply = formatMissions(missions);
    await admin.from("whatsapp_inbound_messages").insert({
      sender_phone: sender, message_body: text, tag: "mes_missions", is_known_gp: true, bot_reply: reply, raw_payload: body,
    });
    return json({ handled: true, type: "missions", reply, unified: isUnified });
  }

  // ----- PARTIE 4 : STATUS (stats perso) -----
  if (normalized === "status" || normalized.includes("tableau de bord")) {
    const missions = await getActiveMissions(admin, reference);
    let delivered = 0, monthCount = 0; let nextDep: any = null;
    if (reference) {
      const { count: delCount } = await admin
        .from("dossiers").select("*", { count: "exact", head: true })
        .eq("assigned_transporteur_ref", reference).eq("status", "DELIVERED");
      delivered = delCount || 0;
      const since = new Date(); since.setDate(1);
      const { count: mCount } = await admin
        .from("dossiers").select("*", { count: "exact", head: true })
        .eq("assigned_transporteur_ref", reference).gte("created_at", since.toISOString());
      monthCount = mCount || 0;
    }
    if (gpProfile?.id) {
      const { data: deps } = await admin
        .from("manual_departures").select("destination, date_depart")
        .eq("gp_profile_id", gpProfile.id).order("created_at", { ascending: false }).limit(1);
      nextDep = deps?.[0] || null;
    }
    const reply = `Votre tableau de bord :\nMissions ce mois : ${monthCount}\nLivraisons reussies : ${delivered}\nEn cours : ${missions.length}\nProchain depart : ${nextDep ? `${nextDep.date_depart} · ${nextDep.destination}` : "aucun"}\n\nVotre profil Konnekt :\nusekonnekt.com/gp/dashboard`;
    await admin.from("whatsapp_inbound_messages").insert({
      sender_phone: sender, message_body: text, tag: "status", is_known_gp: true, bot_reply: reply, raw_payload: body,
    });
    return json({ handled: true, type: "status", reply });
  }

  // Profil connu mais commande non reconnue -> menu
  const menu = `Bonjour ${knownName} !\n\n1 ou MES MISSIONS : vos missions actives\nDEP [ville] [date] [kg] : declarer un depart\nSTATUS : votre tableau de bord`;
  await admin.from("whatsapp_inbound_messages").insert({
    sender_phone: sender, message_body: text, tag: "menu", is_known_gp: true, bot_reply: menu, raw_payload: body,
  });
  return json({ handled: true, type: "menu", reply: menu, unified: isUnified });
});
