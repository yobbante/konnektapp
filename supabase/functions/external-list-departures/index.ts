/**
 * External Departures Endpoint — Yobbanté Global Flow integration
 *
 * Returns active GP departures from Konnekt, filterable by origin/destination/date.
 *
 * Auth: dual mode
 *  - X-Yobbante-Api-Key header matching YOBBANTE_API_KEY secret (partner trusted call), OR
 *  - Public read (no auth) — only non-sensitive fields are exposed.
 *
 * Never exposes GP personal info (no contacts, no addresses, no user_id).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-yobbante-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    // Optional partner key check (logged but not required for read)
    const partnerKey = req.headers.get("X-Yobbante-Api-Key");
    const isPartner =
      !!partnerKey && partnerKey === Deno.env.get("YOBBANTE_API_KEY");

    const origin = params.get("origin_city")?.trim();
    const destination = params.get("destination_city")?.trim();
    const originCountry = params.get("origin_country")?.trim();
    const destinationCountry = params.get("destination_country")?.trim();
    const fromDate = params.get("from_date") || new Date().toISOString();
    const limit = Math.min(parseInt(params.get("limit") || "20"), 100);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ⚠️ BETA INTEGRATION: pas de filtre sur kyc/verified — un départ "active" est visible
    // pour Yobbanté quel que soit le statut du transporteur. Seuls comptent :
    //   - status = 'active'
    //   - available_capacity > 0
    //   - departure_date >= now (sauf override via from_date)
    let query = supabase
      .from("gp_offers")
      .select(
        `id, origin_city, origin_country, destination_city, destination_country,
         departure_date, arrival_date, available_capacity, total_capacity,
         price_per_kg, currency, transport_type, airline, flight_number,
         min_weight, max_weight, baggage_types_accepted, explicit_restrictions,
         created_at, updated_at`
      )
      .eq("status", "active")
      .gt("available_capacity", 0)
      .gte("departure_date", fromDate)
      .order("departure_date", { ascending: true })
      .limit(limit);

    if (origin) query = query.ilike("origin_city", `%${origin}%`);
    if (destination) query = query.ilike("destination_city", `%${destination}%`);
    if (originCountry) query = query.eq("origin_country", originCountry);
    if (destinationCountry)
      query = query.eq("destination_country", destinationCountry);

    const { data, error } = await query;
    if (error) throw error;

    const departures = (data || []).map((d: any) => ({
      konnekt_offer_id: d.id,
      origin: { city: d.origin_city, country: d.origin_country },
      destination: { city: d.destination_city, country: d.destination_country },
      departure_date: d.departure_date,
      arrival_date: d.arrival_date,
      capacity: {
        available_kg: Number(d.available_capacity),
        total_kg: Number(d.total_capacity),
      },
      pricing: {
        price_per_kg: Number(d.price_per_kg),
        currency: d.currency,
      },
      transport_type: d.transport_type,
      airline: d.airline,
      flight_reference: d.flight_number,
      weight_limits: { min_kg: d.min_weight, max_kg: d.max_weight },
      accepted_baggage: d.baggage_types_accepted || [],
      restrictions: d.explicit_restrictions || [],
    }));

    return new Response(
      JSON.stringify({
        source: "konnekt",
        partner_authenticated: isPartner,
        count: departures.length,
        generated_at: new Date().toISOString(),
        departures,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    console.error("[external-list-departures] error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
