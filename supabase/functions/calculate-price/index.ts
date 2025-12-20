import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (per IP, resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 20; // 20 requests per hour per IP
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Input validation schema
const priceRequestSchema = z.object({
  weight: z.number().min(0.1).max(10000),
  length: z.number().min(1).max(500).optional(),
  width: z.number().min(1).max(500).optional(),
  height: z.number().min(1).max(500).optional(),
  originCountry: z.string().min(2).max(5),
  originCity: z.string().min(1).max(100),
  destinationCountry: z.string().min(2).max(5),
  destinationCity: z.string().min(1).max(100),
  transportType: z.enum(["express", "routier", "maritime", "aerien", "voyageur"]),
  isUrgent: z.boolean().optional(),
  declaredValue: z.number().min(0).max(1000000000).optional(),
});

// Base pricing data for Senegal/West Africa logistics
const basePricing = {
  express: { basePerKg: 3500, minWeight: 0.5, speedMultiplier: 1.5 },
  routier: { basePerKg: 2000, minWeight: 1, speedMultiplier: 1.0 },
  maritime: { basePerKg: 1200, minWeight: 5, speedMultiplier: 0.7 },
  aerien: { basePerKg: 5000, minWeight: 0.5, speedMultiplier: 1.8 },
  voyageur: { basePerKg: 2500, minWeight: 0.5, speedMultiplier: 1.2 },
};

// Distance factors (simplified for demo)
const distanceFactors: Record<string, Record<string, number>> = {
  "SN": { "SN": 1.0, "CI": 1.3, "ML": 1.2, "GN": 1.4, "FR": 2.5, "AE": 2.8 },
  "CI": { "SN": 1.3, "CI": 1.0, "ML": 1.1, "GN": 1.3, "FR": 2.4, "AE": 2.7 },
  "ML": { "SN": 1.2, "CI": 1.1, "ML": 1.0, "GN": 1.2, "FR": 2.6, "AE": 2.9 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting by IP
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Trop de requêtes. Veuillez réessayer dans une heure." 
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate input
    const rawData = await req.json();
    const parseResult = priceRequestSchema.safeParse(rawData);
    
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Données invalides",
          details: parseResult.error.issues.map(i => i.message).join(", ")
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = parseResult.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Calculate volumetric weight if dimensions provided
    let volumetricWeight = 0;
    if (data.length && data.width && data.height) {
      volumetricWeight = (data.length * data.width * data.height) / 5000;
    }
    const chargeableWeight = Math.max(data.weight, volumetricWeight);

    // Get base pricing
    const typeConfig = basePricing[data.transportType];
    
    // Get distance factor
    const originFactors = distanceFactors[data.originCountry] || distanceFactors["SN"];
    const distanceFactor = originFactors[data.destinationCountry] || 1.5;

    // Calculate base price
    const effectiveWeight = Math.max(chargeableWeight, typeConfig.minWeight);
    let basePrice = effectiveWeight * typeConfig.basePerKg * distanceFactor;
    
    // Apply urgency multiplier
    if (data.isUrgent) {
      basePrice *= 1.25;
    }

    // Calculate insurance (2% of declared value)
    const insuranceAmount = data.declaredValue ? data.declaredValue * 0.02 : 0;

    // Estimated delivery days
    const deliveryDays = {
      express: data.originCountry === data.destinationCountry ? 1 : 3,
      routier: data.originCountry === data.destinationCountry ? 3 : 7,
      maritime: 14,
      aerien: data.originCountry === data.destinationCountry ? 2 : 5,
      voyageur: data.originCountry === data.destinationCountry ? 2 : 5,
    };

    // Basic pricing result
    const basicResult = {
      chargeableWeight: effectiveWeight,
      pricePerKg: Math.round(typeConfig.basePerKg * distanceFactor),
      basePrice: Math.round(basePrice),
      insuranceAmount: Math.round(insuranceAmount),
      totalPrice: Math.round(basePrice + insuranceAmount),
      estimatedDays: deliveryDays[data.transportType],
      currency: "FCFA",
    };

    // If AI is available, get intelligent recommendations
    let aiRecommendations = null;
    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `Tu es un expert en logistique Afrique de l'Ouest. Tu dois analyser les données d'expédition et fournir des recommandations intelligentes. Réponds UNIQUEMENT en JSON valide avec cette structure:
{
  "recommendation": "texte court de recommandation",
  "alternativeTransport": "type alternatif si pertinent ou null",
  "savings": "économie potentielle en FCFA ou 0",
  "riskLevel": "low|medium|high",
  "tips": ["conseil 1", "conseil 2"]
}`
              },
              {
                role: "user",
                content: `Analyse cette expédition:
- Poids: ${effectiveWeight}kg
- De: ${data.originCity}, ${data.originCountry}
- Vers: ${data.destinationCity}, ${data.destinationCountry}
- Type: ${data.transportType}
- Prix calculé: ${basicResult.totalPrice} FCFA
- Urgent: ${data.isUrgent ? "oui" : "non"}

Donne des recommandations pour optimiser le coût et la livraison.`
              }
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            try {
              // Extract JSON from response
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                aiRecommendations = JSON.parse(jsonMatch[0]);
              }
            } catch (parseError) {
              console.log("Could not parse AI response as JSON");
            }
          }
        }
      } catch (aiError) {
        console.error("AI recommendation error:", aiError);
      }
    }

    // Generate alternative prices for comparison
    const alternatives = Object.entries(basePricing)
      .filter(([type]) => type !== data.transportType)
      .map(([type, config]) => {
        const altPrice = effectiveWeight * config.basePerKg * distanceFactor;
        return {
          type,
          pricePerKg: Math.round(config.basePerKg * distanceFactor),
          totalPrice: Math.round(altPrice + insuranceAmount),
          estimatedDays: deliveryDays[type as keyof typeof deliveryDays] || 5,
        };
      })
      .sort((a, b) => a.totalPrice - b.totalPrice);

    return new Response(
      JSON.stringify({
        success: true,
        pricing: basicResult,
        alternatives: alternatives.slice(0, 3),
        aiRecommendations,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Price calculator error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Erreur de calcul" 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
