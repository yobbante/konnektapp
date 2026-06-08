import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Payload {
  prenom: string;
  nom: string;
  phone: string;
  originCity?: string;
  originCountry?: string;
  destCity?: string;
  destCountry?: string;
  pricePerKg?: number | null;
  currency?: string | null;
  // legacy (ignored, kept for backward compat)
  destinations?: string[];
  modes?: string[];
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

    const originCity = (body.originCity || "Dakar").trim();
    const originCountry = (body.originCountry || "SN").trim().toUpperCase();
    const destCity = (body.destCity || "").trim();
    const destCountry = (body.destCountry || "").trim().toUpperCase();
    const pricePerKg =
      typeof body.pricePerKg === "number" && body.pricePerKg > 0 ? body.pricePerKg : null;
    const allowedCurrencies = ["XOF", "EUR", "USD", "CAD", "GBP", "MAD", "AED"];
    const currency = allowedCurrencies.includes((body.currency || "").toUpperCase())
      ? (body.currency as string).toUpperCase()
      : "XOF";

    if (!prenom || !nom || phone.length < 8) {
      return new Response(JSON.stringify({ error: "Champs obligatoires manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Tous les inscrits sont des GP transporteurs de bagages.
    const record: Record<string, unknown> = {
      prenom,
      nom,
      business_name: `${prenom} ${nom}`.trim(),
      phone,
      whatsapp: phone,
      whatsapp_phone: phone,
      gp_type: "bagages_international",
      status: "pending_whatsapp",
      city: originCity,
      country_code: originCountry,
      base_origin_city: originCity,
      base_origin_country: originCountry,
      beta_source: "rejoindre-gp",
      is_active: false,
      default_currency: currency,
    };
    if (destCity) {
      record.base_destination_city = destCity;
      record.base_destination_country = destCountry || null;
      record.international_destinations = [destCity];
    }
    if (pricePerKg !== null) record.base_price_per_kg = pricePerKg;

    // Match an existing profile by phone tail (9 digits)
    const tail = phone.replace(/\D/g, "").slice(-9);
    const { data: existing } = await admin
      .from("gp_profiles")
      .select("id")
      .ilike("phone", `%${tail}`)
      .maybeSingle();

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

    // Enregistrer la navette principale (trajet du GP)
    if (destCity) {
      const { data: existingNavette } = await admin
        .from("gp_navettes")
        .select("id")
        .eq("gp_id", profileId)
        .eq("origin_city", originCity)
        .eq("destination_city", destCity)
        .maybeSingle();

      if (!existingNavette?.id) {
        await admin.from("gp_navettes").insert({
          gp_id: profileId,
          origin_city: originCity,
          origin_country: originCountry,
          destination_city: destCity,
          destination_country: destCountry || null,
          is_primary: true,
          is_active: true,
        });
      }
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
