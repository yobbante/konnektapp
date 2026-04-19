import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-source, x-yobbante-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const yobbanteApiKey = Deno.env.get("YOBBANTE_API_KEY");

    const partnerKey = req.headers.get("X-Yobbante-Api-Key") ?? req.headers.get("x-yobbante-api-key");
    const authHeader = req.headers.get("Authorization");

    let isPartnerCall = false;
    let callerId: string | null = null;

    if (partnerKey && yobbanteApiKey && partnerKey === yobbanteApiKey) {
      isPartnerCall = true;
    } else {
      // Fallback: JWT auth
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: missing Bearer token or partner API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
      callerId = userData.user.id;
    }

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

    if (!origin_city || !destination_city) {
      return new Response(
        JSON.stringify({
          error: "MISSING_FIELDS",
          required: ["origin_city", "destination_city"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve client_id
    let effectiveClientId: string | null = null;
    if (isPartnerCall) {
      // Partner call: use provided client_id or system user
      if (client_id) {
        effectiveClientId = client_id;
      } else {
        // Try to find/use a system user for Yobbanté external orders
        const systemEmail = "system+yobbante@konnekt.local";
        const { data: existing } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", systemEmail)
          .maybeSingle();

        if (existing?.user_id) {
          effectiveClientId = existing.user_id;
        } else {
          // Create system user via admin API
          const { data: created, error: createErr } = await supabase.auth.admin.createUser({
            email: systemEmail,
            email_confirm: true,
            user_metadata: { full_name: "Yobbanté System", system: true },
          });
          if (createErr || !created?.user) {
            console.error("[external-create-order] failed to create system user:", createErr);
            return new Response(
              JSON.stringify({ error: "SYSTEM_USER_CREATION_FAILED", details: createErr?.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          effectiveClientId = created.user.id;
        }
      }
    } else {
      // JWT call: default to caller, allow admin override
      effectiveClientId = client_id || callerId;
      if (client_id && client_id !== callerId) {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: callerId,
          _role: "admin",
        });
        if (!isAdmin) {
          effectiveClientId = callerId;
        }
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

    if (external_reference || metadata) {
      console.log("[external-create-order] external ref:", {
        order_id: order.id,
        app_source,
        external_reference,
        metadata,
        partner_call: isPartnerCall,
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
        external_reference: external_reference ?? null,
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
