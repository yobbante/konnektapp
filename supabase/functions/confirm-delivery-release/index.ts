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

    const { order_id, idempotency_key } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency
    if (idempotency_key) {
      const { data: existing } = await supabase
        .from("idempotency_keys").select("result").eq("key", idempotency_key).maybeSingle();
      if (existing) {
        return new Response(JSON.stringify(existing.result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, gp_id, client_id, total_price, currency, status, financial_status, order_number, commission_amount")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for open disputes
    const { data: disputes } = await supabase
      .from("disputes").select("id").eq("order_id", order_id)
      .in("status", ["open", "under_review", "awaiting_response"]).limit(1);

    if (disputes && disputes.length > 0) {
      return new Response(JSON.stringify({ error: "Cannot release: open dispute exists" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent double release
    if (order.financial_status === "completed") {
      return new Response(JSON.stringify({ error: "Already completed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalAmount = order.total_price || 0;

    // Get GP wallet
    const { data: gpWallet } = await supabase
      .from("gp_wallets")
      .select("id, balance, pending_balance, commission_rate, total_earned, debt_balance")
      .eq("gp_id", order.gp_id)
      .single();

    if (!gpWallet) {
      return new Response(JSON.stringify({ error: "GP wallet not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Commission calculation ──
    const commissionRate = gpWallet.commission_rate || 5;
    const commissionAmount = Math.ceil(totalAmount * commissionRate / 100);
    let netGP = totalAmount - commissionAmount;

    // ── Debt deduction ──
    let debtDeducted = 0;
    const currentDebt = gpWallet.debt_balance || 0;
    if (currentDebt > 0) {
      debtDeducted = Math.min(currentDebt, netGP);
      netGP -= debtDeducted;
    }

    // ── 1. Ledger: commission ──
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

    // ── 2. Ledger: debt deduction (if any) ──
    if (debtDeducted > 0) {
      await supabase.from("konnekt_ledger").insert({
        type: "debt_deduction",
        order_id,
        gp_id: order.gp_id,
        amount_fcfa: debtDeducted,
        currency_display: order.currency || "XOF",
        amount_display: debtDeducted,
        status: "completed",
        description: `Régularisation dette sur ${order.order_number}`,
      });
    }

    // ── 3. Ledger: payout to GP ──
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

    // ── 4. Credit GP wallet ──
    await supabase
      .from("gp_wallets")
      .update({
        balance: gpWallet.balance + netGP,
        pending_balance: Math.max(0, gpWallet.pending_balance - totalAmount),
        total_earned: gpWallet.total_earned + netGP,
        debt_balance: currentDebt - debtDeducted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gpWallet.id);

    // ── 5. Update platform wallet ──
    const { data: pw } = await supabase.from("platform_wallet").select("id, total_commission, total_escrow_held").single();
    if (pw) {
      await supabase.from("platform_wallet").update({
        total_commission: pw.total_commission + commissionAmount,
        total_escrow_held: Math.max(0, pw.total_escrow_held - totalAmount),
        updated_at: new Date().toISOString(),
      }).eq("id", pw.id);
    }

    // ── 6. Release escrow transaction ──
    await supabase
      .from("escrow_transactions")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        release_reason: "Livraison confirmée — fonds libérés",
      })
      .eq("order_id", order_id)
      .eq("status", "held");

    // ── 7. Update client wallet ──
    const { data: cw } = await supabase
      .from("client_wallets")
      .select("escrow_balance")
      .eq("user_id", order.client_id)
      .maybeSingle();
    if (cw) {
      await supabase.from("client_wallets").update({
        escrow_balance: Math.max(0, cw.escrow_balance - totalAmount),
        updated_at: new Date().toISOString(),
      }).eq("user_id", order.client_id);
    }

    // ── 8. Update order ──
    await supabase.from("orders").update({
      financial_status: "completed",
      payment_status: "released",
      commission_amount: commissionAmount,
      final_amount: netGP,
    }).eq("id", order_id);

    // ── 9. Notify GP ──
    const { data: gpProfile } = await supabase
      .from("gp_profiles").select("user_id").eq("id", order.gp_id).single();

    if (gpProfile) {
      let msg = `${netGP.toLocaleString()} FCFA crédités (comm. ${commissionRate}%)`;
      if (debtDeducted > 0) {
        msg += ` | Régularisation: ${debtDeducted.toLocaleString()} FCFA déduits`;
      }
      await supabase.from("notifications").insert({
        user_id: gpProfile.user_id,
        title: "💰 Paiement reçu",
        message: msg,
        type: "wallet",
        related_id: order_id,
        related_type: "order",
      });
    }

    const result = {
      success: true,
      total: totalAmount,
      commission: commissionAmount,
      commission_rate: commissionRate,
      debt_deducted: debtDeducted,
      net_gp: netGP,
    };

    if (idempotency_key) {
      await supabase.from("idempotency_keys").insert({ key: idempotency_key, result });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Confirm delivery release error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
