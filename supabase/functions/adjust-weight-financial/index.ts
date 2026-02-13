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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const supabase = createClient(supabaseUrl, serviceKey);
    const { order_id, new_weight, price_per_kg } = await req.json();

    if (!order_id || new_weight === undefined) {
      return new Response(JSON.stringify({ error: "order_id and new_weight required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, client_id, gp_id, weight, total_price, price_per_kg, currency, order_number, financial_status")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectivePricePerKg = price_per_kg || order.price_per_kg || 0;
    const oldAmount = order.total_price || 0;
    const newAmount = Math.ceil(new_weight * effectivePricePerKg);
    const delta = newAmount - oldAmount;

    if (delta === 0) {
      return new Response(JSON.stringify({ success: true, delta: 0, message: "No adjustment needed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (delta > 0) {
      // Weight increased — client owes more
      // Set financial_status to adjustment_required
      await supabase
        .from("orders")
        .update({
          weight: new_weight,
          total_price: newAmount,
          adjustment_amount: delta,
          financial_status: "adjustment_required",
        })
        .eq("id", order_id);

      // Ledger: adjustment_plus (pending)
      await supabase.from("konnekt_ledger").insert({
        type: "adjustment_plus",
        order_id,
        gp_id: order.gp_id,
        amount_fcfa: delta,
        currency_display: order.currency || "XOF",
        amount_display: delta,
        status: "pending",
        description: `Supplément poids ${order.order_number}: ${order.weight}kg → ${new_weight}kg (+${delta} FCFA)`,
      });

      // Notify client
      await supabase.from("notifications").insert({
        user_id: order.client_id,
        title: "⚖️ Ajustement poids requis",
        message: `Le poids de votre colis ${order.order_number} a été ajusté. Supplément de ${delta.toLocaleString()} FCFA requis.`,
        type: "weight_adjustment",
        related_id: order_id,
        related_type: "order",
      });

      return new Response(JSON.stringify({
        success: true,
        delta,
        direction: "increase",
        new_total: newAmount,
        financial_status: "adjustment_required",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // Weight decreased — credit client
      const credit = Math.abs(delta);

      await supabase
        .from("orders")
        .update({
          weight: new_weight,
          total_price: newAmount,
          adjustment_amount: delta,
          financial_status: order.financial_status, // keep current
        })
        .eq("id", order_id);

      // Update escrow if exists
      await supabase
        .from("escrow_transactions")
        .update({ amount: newAmount, updated_at: new Date().toISOString() })
        .eq("order_id", order_id)
        .eq("status", "held");

      // Credit client wallet
      const { data: cw } = await supabase
        .from("client_wallets")
        .select("available_balance, escrow_balance")
        .eq("user_id", order.client_id)
        .maybeSingle();

      if (cw) {
        await supabase
          .from("client_wallets")
          .update({
            available_balance: cw.available_balance + credit,
            escrow_balance: Math.max(0, cw.escrow_balance - credit),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", order.client_id);
      }

      // Ledger: adjustment_minus
      await supabase.from("konnekt_ledger").insert({
        type: "adjustment_minus",
        order_id,
        gp_id: order.gp_id,
        amount_fcfa: credit,
        currency_display: order.currency || "XOF",
        amount_display: credit,
        status: "completed",
        description: `Crédit ajustement ${order.order_number}: ${order.weight}kg → ${new_weight}kg (-${credit} FCFA)`,
      });

      // Notify client
      await supabase.from("notifications").insert({
        user_id: order.client_id,
        title: "💰 Crédit ajustement poids",
        message: `${credit.toLocaleString()} FCFA crédités suite à l'ajustement poids de ${order.order_number}.`,
        type: "weight_adjustment",
        related_id: order_id,
        related_type: "order",
      });

      return new Response(JSON.stringify({
        success: true,
        delta,
        direction: "decrease",
        credit,
        new_total: newAmount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    console.error("Adjust weight financial error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
