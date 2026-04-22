/**
 * External Match Shipment Endpoint — Yobbanté Global Flow integration
 *
 * Retourne 3 options packagées (Rapide / Économique / Volume) pour une expédition donnée,
 * avec prix calculé (FCFA) et ETA (jours), basées sur les départs GP actifs Konnekt.
 *
 * Auth: dual mode
 *  - X-Yobbante-Api-Key header matching YOBBANTE_API_KEY secret (partner trusted call), OR
 *  - Public read fallback (rate-limited, no GP personal info exposed).
 *
 * POST body:
 * {
 *   origin_city: string,
 *   destination_city: string,
 *   origin_country?: string,
 *   destination_country?: string,
 *   weight_kg: number,
 *   volume_m3?: number,
 *   declared_value?: number,
 *   urgency?: "low" | "normal" | "high",
 *   from_date?: string (ISO)
 * }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-yobbante-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const matchRequestSchema = z.object({
  origin_city: z.string().min(1).max(100),
  destination_city: z.string().min(1).max(100),
  origin_country: z.string().min(2).max(5).optional(),
  destination_country: z.string().min(2).max(5).optional(),
  weight_kg: z.number().min(0.1).max(10000),
  volume_m3: z.number().min(0).max(1000).optional(),
  declared_value: z.number().min(0).max(1000000000).optional(),
  urgency: z.enum(["low", "normal", "high"]).optional(),
  from_date: z.string().optional(),
});

// Speed/cost profile per transport_type (1.0 = baseline)
const transportProfile: Record<string, { speedDays: number; costMultiplier: number }> = {
  aerien: { speedDays: 3, costMultiplier: 1.4 },
  express: { speedDays: 2, costMultiplier: 1.5 },
  voyageur: { speedDays: 5, costMultiplier: 1.0 },
  routier: { speedDays: 7, costMultiplier: 0.85 },
  maritime: { speedDays: 21, costMultiplier: 0.55 },
  bagages_international: { speedDays: 5, costMultiplier: 1.0 },
};

function getProfile(type: string) {
  return transportProfile[type] || { speedDays: 7, costMultiplier: 1.0 };
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Optional partner key check
    const partnerKey = req.headers.get("X-Yobbante-Api-Key");
    const isPartner =
      !!partnerKey && partnerKey === Deno.env.get("YOBBANTE_API_KEY");

    // Parse + validate
    const rawBody = await req.json();
    const parsed = matchRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const data = parsed.data;
    const fromDate = data.from_date || new Date().toISOString();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch matching active offers
    let query = supabase
      .from("gp_offers")
      .select(
        `id, origin_city, origin_country, destination_city, destination_country,
         departure_date, arrival_date, available_capacity, total_capacity,
         price_per_kg, currency, transport_type, airline, flight_number,
         min_weight, max_weight`
      )
      .eq("status", "active")
      .gte("available_capacity", data.weight_kg)
      .gte("departure_date", fromDate)
      .ilike("origin_city", `%${data.origin_city}%`)
      .ilike("destination_city", `%${data.destination_city}%`)
      .order("departure_date", { ascending: true })
      .limit(50);

    if (data.origin_country) query = query.eq("origin_country", data.origin_country);
    if (data.destination_country)
      query = query.eq("destination_country", data.destination_country);

    const { data: offers, error } = await query;
    if (error) throw error;

    if (!offers || offers.length === 0) {
      return new Response(
        JSON.stringify({
          source: "konnekt",
          partner_authenticated: isPartner,
          generated_at: new Date().toISOString(),
          options: [],
          message: "No matching departures found for this corridor.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Score each offer for the 3 categories
    const scored = offers.map((o: any) => {
      const profile = getProfile(o.transport_type);
      const transitDays = profile.speedDays;
      const waitDays = daysUntil(o.departure_date);
      const totalEtaDays = waitDays + transitDays;

      const basePrice = Number(o.price_per_kg) * data.weight_kg;
      const adjustedPrice = Math.round(basePrice * profile.costMultiplier);

      return {
        konnekt_offer_id: o.id,
        transport_type: o.transport_type,
        origin: { city: o.origin_city, country: o.origin_country },
        destination: { city: o.destination_city, country: o.destination_country },
        departure_date: o.departure_date,
        arrival_date: o.arrival_date,
        eta_days: totalEtaDays,
        transit_days: transitDays,
        wait_days: waitDays,
        price_total: adjustedPrice,
        price_per_kg: Math.round(Number(o.price_per_kg) * profile.costMultiplier),
        currency: o.currency || "XOF",
        available_capacity_kg: Number(o.available_capacity),
        airline: o.airline,
        flight_reference: o.flight_number,
      };
    });

    // RAPIDE: lowest ETA
    const rapide = [...scored].sort((a, b) => a.eta_days - b.eta_days)[0];

    // ÉCONOMIQUE: lowest total price
    const economique = [...scored].sort((a, b) => a.price_total - b.price_total)[0];

    // VOLUME: best capacity AND price/kg ratio for heavy/bulky loads
    const volume = [...scored]
      .filter((o) => o.available_capacity_kg >= data.weight_kg * 1.5)
      .sort((a, b) => a.price_per_kg - b.price_per_kg)[0] ||
      [...scored].sort((a, b) => b.available_capacity_kg - a.available_capacity_kg)[0];

    // Apply urgency multiplier on rapide if requested
    if (data.urgency === "high" && rapide) {
      rapide.price_total = Math.round(rapide.price_total * 1.15);
      rapide.price_per_kg = Math.round(rapide.price_per_kg * 1.15);
    }

    const buildOption = (label: string, tagline: string, offer: any) =>
      offer
        ? {
            category: label,
            tagline,
            ...offer,
          }
        : null;

    const options = [
      buildOption("rapide", "Livraison la plus rapide", rapide),
      buildOption("economique", "Meilleur prix", economique),
      buildOption("volume", "Optimisé pour gros volumes", volume),
    ].filter(Boolean);

    // Deduplicate if same offer wins multiple categories (keep first occurrence)
    const seen = new Set<string>();
    const uniqueOptions = options.filter((opt: any) => {
      if (seen.has(opt.konnekt_offer_id)) return false;
      seen.add(opt.konnekt_offer_id);
      return true;
    });

    return new Response(
      JSON.stringify({
        source: "konnekt",
        partner_authenticated: isPartner,
        generated_at: new Date().toISOString(),
        request: {
          origin_city: data.origin_city,
          destination_city: data.destination_city,
          weight_kg: data.weight_kg,
          urgency: data.urgency || "normal",
        },
        options: uniqueOptions,
        total_matches: offers.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("[external-match-shipment] error", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
