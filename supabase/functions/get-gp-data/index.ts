import { createClient } from "npm:@supabase/supabase-js@2";

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

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { ref_gp } = await req.json().catch(() => ({ ref_gp: null }));

    if (!ref_gp || typeof ref_gp !== "string") {
      return json({ error: "ref_gp requis" }, 400);
    }

    const normalizedRef = ref_gp.trim().toUpperCase();

    // Yobbanté project (tlvuextleczdsqxoguyq, Frankfurt). URL is not secret; key comes from secrets.
    const url =
      Deno.env.get("YOBBANTE_SUPABASE_URL") || "https://tlvuextleczdsqxoguyq.supabase.co";
    const key =
      Deno.env.get("YOBBANTE_SUPABASE_SERVICE_KEY") ||
      Deno.env.get("YOBBANTE_SUPABASE_ANON_KEY") ||
      Deno.env.get("YOBBANTE_API_KEY");

    if (!url || !key) {
      console.error("[get-gp-data] Missing Yobbanté credentials");
      return json({ error: "Configuration manquante", data: null }, 500);
    }

    const yobbante = createClient(url, key, {
      auth: { persistSession: false },
    });

    // Accept "GP4346", "4346" or "gp4346" — try the ref and a GP-prefixed variant.
    const refVariants = [normalizedRef];
    if (!normalizedRef.startsWith("GP")) refVariants.push(`GP${normalizedRef}`);

    const { data, error } = await yobbante
      .from("gp_transporteurs")
      .select("*")
      .in("ref_gp", refVariants)
      .maybeSingle();


    if (error) {
      console.error("[get-gp-data] SELECT error:", error.message);
      return json({ error: error.message, data: null }, 200);
    }

    console.log("[get-gp-data]", normalizedRef, data ? "found" : "not found");

    return json({ data: data ?? null }, 200);
  } catch (e) {
    console.error("[get-gp-data] Unexpected error:", e);
    return json({ error: "Erreur inattendue", data: null }, 500);
  }
});
