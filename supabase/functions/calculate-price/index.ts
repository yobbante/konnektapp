import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

interface PriceRequest {
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  originCountry: string;
  originCity: string;
  destinationCountry: string;
  destinationCity: string;
  transportType: string;
  isUrgent?: boolean;
  declaredValue?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: PriceRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Calculate volumetric weight if dimensions provided
    let volumetricWeight = 0;
    if (data.length && data.width && data.height) {
      volumetricWeight = (data.length * data.width * data.height) / 5000;
    }
    const chargeableWeight = Math.max(data.weight, volumetricWeight);

    // Get base pricing
    const typeConfig = basePricing[data.transportType as keyof typeof basePricing] || basePricing.routier;
    
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
      estimatedDays: deliveryDays[data.transportType as keyof typeof deliveryDays] || 5,
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
        error: error instanceof Error ? error.message : "Erreur de calcul" 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
