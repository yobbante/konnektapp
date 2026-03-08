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
    const supabase = createClient(supabaseUrl, serviceKey);

    const { order_id, action } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get order details
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, gp_id, total_price, weight, price_per_kg, insurance_amount, has_insurance, currency, status, client_id, order_number, commission_amount")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for open disputes
    const { data: disputes } = await supabase
      .from("disputes")
      .select("id")
      .eq("order_id", order_id)
      .in("status", ["open", "under_review", "awaiting_response"])
      .limit(1);

    if (disputes && disputes.length > 0) {
      return new Response(JSON.stringify({ error: "Cannot release: open dispute exists" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get GP wallet
    const { data: wallet, error: walletErr } = await supabase
      .from("gp_wallets")
      .select("id, balance, pending_balance, commission_rate, total_earned")
      .eq("gp_id", order.gp_id)
      .single();

    if (walletErr || !wallet) {
      return new Response(JSON.stringify({ error: "GP wallet not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalFcfa = order.total_price || 0;
    const transportPrice = (order.weight || 0) * (order.price_per_kg || 0);
    const insuranceAmount = order.has_insurance ? (order.insurance_amount || 0) : 0;

    // Commission on TRANSPORT only — percentage-based (manual parcels have fixed 1000 FCFA set at creation)
    const commissionRate = wallet.commission_rate || 5;
    const commissionAmount = order.commission_amount != null && order.commission_amount > 0
      ? order.commission_amount
      : Math.ceil(transportPrice * commissionRate / 100);
    const netGP = transportPrice - commissionAmount;

    // Get insurance amount from escrow if any
    const { data: escrow } = await supabase
      .from("escrow_transactions")
      .select("id, amount, status")
      .eq("order_id", order_id)
      .eq("status", "held")
      .single();

    // ─── Execute release in sequence ───

    // 1. Ledger: payment entry (full amount)
    await supabase.from("konnekt_ledger").insert({
      type: "payment",
      order_id,
      gp_id: order.gp_id,
      amount_fcfa: totalFcfa,
      currency_display: order.currency || "XOF",
      amount_display: totalFcfa,
      status: "completed",
      description: `Paiement commande ${order.order_number}`,
    });

    // 2. Ledger: commission deducted
    await supabase.from("konnekt_ledger").insert({
      type: "commission",
      order_id,
      gp_id: order.gp_id,
      amount_fcfa: commissionAmount,
      currency_display: order.currency || "XOF",
      amount_display: commissionAmount,
      status: "completed",
      description: `Commission ${commissionRate}% sur ${order.order_number}`,
    });

    // 3. Ledger: net release to GP
    await supabase.from("konnekt_ledger").insert({
      type: "release",
      order_id,
      gp_id: order.gp_id,
      amount_fcfa: netGP,
      currency_display: order.currency || "XOF",
      amount_display: netGP,
      status: "completed",
      description: `Libération fonds ${order.order_number}`,
    });

    // 4. Credit GP wallet
    await supabase
      .from("gp_wallets")
      .update({
        balance: wallet.balance + netGP,
        pending_balance: Math.max(0, wallet.pending_balance - totalFcfa),
        total_earned: wallet.total_earned + netGP,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);

    // 5. Update escrow if exists
    if (escrow) {
      await supabase
        .from("escrow_transactions")
        .update({
          status: "released",
          released_at: new Date().toISOString(),
          release_reason: "Livraison confirmée — fonds libérés",
        })
        .eq("id", escrow.id);
    }

    // 6. Update order payment status
    await supabase
      .from("orders")
      .update({ payment_status: "released" })
      .eq("id", order_id);

    // 7. Notify GP
    const { data: gpProfile } = await supabase
      .from("gp_profiles")
      .select("user_id")
      .eq("id", order.gp_id)
      .single();

    if (gpProfile) {
      await supabase.from("notifications").insert({
        user_id: gpProfile.user_id,
        title: "💰 Paiement reçu",
        message: `${netGP.toLocaleString()} FCFA crédités (comm. ${commissionRate}%)`,
        type: "wallet",
        related_id: order_id,
        related_type: "order",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: totalFcfa,
        commission: commissionAmount,
        commission_rate: commissionRate,
        net_gp: netGP,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Release funds error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
