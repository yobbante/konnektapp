import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const supabase = createClient(supabaseUrl, serviceKey);
    const { order_id, idempotency_key } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency check
    if (idempotency_key) {
      const { data: existing } = await supabase
        .from("idempotency_keys")
        .select("result")
        .eq("key", idempotency_key)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify(existing.result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, client_id, gp_id, total_price, currency, status, financial_status, order_number")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (order.client_id !== userId) {
      return new Response(JSON.stringify({ error: "Not your order" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify not already locked
    if (order.financial_status && order.financial_status !== "pending_payment") {
      return new Response(JSON.stringify({ error: "Already processed", financial_status: order.financial_status }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = order.total_price || 0;

    // 1. Ensure client wallet exists
    const { data: clientWallet } = await supabase
      .from("client_wallets")
      .select("id, available_balance, escrow_balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (!clientWallet) {
      await supabase.from("client_wallets").insert({ user_id: userId });
    }

    // 2. Update client wallet: move to escrow
    await supabase
      .from("client_wallets")
      .update({
        escrow_balance: (clientWallet?.escrow_balance || 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // 3. Create escrow transaction
    await supabase.from("escrow_transactions").insert({
      order_id,
      client_id: userId,
      gp_id: order.gp_id,
      amount,
      currency: order.currency || "XOF",
      status: "held",
      held_at: new Date().toISOString(),
    });

    // 4. Ledger entry: escrow_lock
    await supabase.from("konnekt_ledger").insert({
      type: "escrow_lock",
      order_id,
      gp_id: order.gp_id,
      amount_fcfa: amount,
      currency_display: order.currency || "XOF",
      amount_display: amount,
      status: "completed",
      description: `Escrow verrouillé pour ${order.order_number}`,
    });

    // 5. Update order financial_status
    await supabase
      .from("orders")
      .update({ financial_status: "escrow_locked", payment_status: "escrow" })
      .eq("id", order_id);

    // 6. Update platform wallet
    await supabase
      .from("platform_wallet")
      .update({
        total_escrow_held: (await supabase.from("platform_wallet").select("total_escrow_held").single()).data?.total_escrow_held + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (await supabase.from("platform_wallet").select("id").single()).data?.id);

    const result = { success: true, amount, order_id, financial_status: "escrow_locked" };

    // Store idempotency
    if (idempotency_key) {
      await supabase.from("idempotency_keys").insert({ key: idempotency_key, result });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Lock escrow error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
