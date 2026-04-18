import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-source",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing Bearer token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller identity (must be a valid Konnekt user)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const {
      client_id,
      gp_id,
      offer_id,
      origin_city,
      origin_country = "SN",
      destination_city,
      destination_country = "SN",
      weight = 0,
      price_per_kg = 0,
      total_price = 0,
      currency = "XOF",
      description,
      recipient_name,
      recipient_phone,
      app_source = "yobbante",
      external_reference,
      metadata,
    } = body || {};

    // Required fields
    if (!origin_city || !destination_city || !total_price) {
      return new Response(
        JSON.stringify({
          error: "MISSING_FIELDS",
          required: ["origin_city", "destination_city", "total_price"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The order's client_id defaults to the caller (for trust); admins can override
    const supabase = createClient(supabaseUrl, serviceKey);
    let effectiveClientId = client_id || callerId;

    if (client_id && client_id !== callerId) {
      // Only admins can impersonate another client_id
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: callerId,
        _role: "admin",
      });
      if (!isAdmin) {
        effectiveClientId = callerId;
      }
    }

    const insertPayload: Record<string, unknown> = {
      client_id: effectiveClientId,
      gp_id: gp_id || null,
      offer_id: offer_id || null,
      origin_city,
      origin_country,
      destination_city,
      destination_country,
      weight,
      price_per_kg,
      total_price,
      currency,
      description: description || null,
      recipient_name: recipient_name || null,
      recipient_phone: recipient_phone || null,
      status: "pending",
      app_source,
    };

    const { data: order, error: insertErr } = await supabase
      .from("orders")
      .insert(insertPayload)
      .select("id, order_number, status, total_price, currency, app_source, created_at")
      .single();

    if (insertErr) {
      console.error("[external-create-order] insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "INSERT_FAILED", details: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optional: log external reference for traceability
    if (external_reference || metadata) {
      console.log("[external-create-order] external ref:", {
        order_id: order.id,
        app_source,
        external_reference,
        metadata,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_price: order.total_price,
        currency: order.currency,
        app_source: order.app_source,
        created_at: order.created_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[external-create-order] error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
