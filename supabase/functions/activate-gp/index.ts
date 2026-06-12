import { createClient } from "npm:@supabase/supabase-js@2";

const SHARED_SECRET = "konnekt-yobbante-2026";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ─── Auth ───
  const auth = req.headers.get("Authorization") || "";
  if (auth !== `Bearer ${SHARED_SECRET}`) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const ref = String(body?.ref || "").trim().toUpperCase();
    const phone = body?.phone ? String(body.phone).trim() : null;

    if (!ref) {
      return json({ success: false, error: "ref is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nowIso = new Date().toISOString();

    // 1) Chercher la fiche GP existante (insensible à la casse)
    const { data: existing, error: selErr } = await supabase
      .from("transporteurs")
      .select("id, reference, prenom, telephone_1")
      .ilike("reference", ref)
      .maybeSingle();

    if (selErr) {
      return json({ success: false, error: selErr.message }, 500);
    }

    // 2) Trouvé → activer
    if (existing) {
      const { error: updErr } = await supabase
        .from("transporteurs")
        .update({
          whatsapp_confirmed_at: nowIso,
          telephone_1: phone || existing.telephone_1,
          updated_at: nowIso,
        })
        .eq("id", existing.id);

      if (updErr) {
        return json({ success: false, error: updErr.message }, 500);
      }

      return json({ success: true, prenom: existing.prenom ?? null, ref: existing.reference });
    }

    // 3) Non trouvé → créer
    const { data: created, error: insErr } = await supabase
      .from("transporteurs")
      .insert({
        reference: ref,
        telephone_1: phone,
        whatsapp_confirmed_at: nowIso,
      })
      .select("reference, prenom")
      .maybeSingle();

    if (insErr) {
      return json({ success: false, error: insErr.message }, 500);
    }

    return json({ success: true, prenom: created?.prenom ?? null, ref: created?.reference ?? ref });
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
