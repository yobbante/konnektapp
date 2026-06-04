import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Payload {
  prenom: string;
  nom: string;
  phone: string;
  destinations: string[];
  modes: string[];
}

function normalizePhone(raw: string): string {
  let p = (raw || "").replace(/[^\d+]/g, "");
  if (!p.startsWith("+")) p = "+" + p.replace(/^\+/, "");
  return p;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    const prenom = (body.prenom || "").trim();
    const nom = (body.nom || "").trim();
    const phone = normalizePhone(body.phone || "");
    const destinations = Array.isArray(body.destinations) ? body.destinations : [];
    const modes = Array.isArray(body.modes) ? body.modes : [];

    if (!prenom || !nom || phone.length < 8) {
      return new Response(JSON.stringify({ error: "Champs obligatoires manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // bagages_international by default; if "Fret" only -> routier
    const wantsBagage = modes.some((m) => /soute|bagage/i.test(m)) || modes.some((m) => /deux/i.test(m));
    const wantsFret = modes.some((m) => /fret/i.test(m)) || modes.some((m) => /deux/i.test(m));
    const gpType = wantsBagage || !wantsFret ? "bagages_international" : "routier";

    // Look for an existing profile by phone (9-digit tail match)
    const tail = phone.replace(/\D/g, "").slice(-9);
    const { data: existing } = await admin
      .from("gp_profiles")
      .select("id, phone")
      .ilike("phone", `%${tail}`)
      .maybeSingle();

    const record = {
      prenom,
      nom,
      business_name: `${prenom} ${nom}`.trim(),
      phone,
      whatsapp: phone,
      whatsapp_phone: phone,
      gp_type: gpType,
      status: "pending_whatsapp",
      city: "Dakar",
      country_code: "SN",
      international_destinations: destinations,
      beta_source: "rejoindre-gp",
      is_active: false,
    };

    let profileId: string;
    if (existing?.id) {
      const { data, error } = await admin
        .from("gp_profiles")
        .update(record)
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error) throw error;
      profileId = data.id;
    } else {
      const { data, error } = await admin
        .from("gp_profiles")
        .insert(record)
        .select("id")
        .single();
      if (error) throw error;
      profileId = data.id;
    }

    return new Response(JSON.stringify({ ok: true, id: profileId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
