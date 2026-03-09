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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // AuthN: require a valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsErr || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client used ONLY after explicit authorization checks (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceKey);

    const { order_id, idempotency_key, delivery_code } = await req.json();

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
      .select("id, gp_id, client_id, total_price, weight, price_per_kg, insurance_amount, has_insurance, currency, status, financial_status, order_number, commission_amount, delivery_code")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AuthZ: only the order client or an admin/moderator can release funds
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "moderator"])
      .limit(1);
    const isAdmin = !!roles && roles.length > 0;

    if (order.client_id !== userId && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Safety: only allow release once delivery is confirmed
    if (!["delivery_confirmed", "delivered"].includes(String(order.status))) {
      return new Response(JSON.stringify({ error: "Order not eligible for release" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Verify delivery code if provided (alternative to client scan)
    if (delivery_code) {
      if (!order.delivery_code || order.delivery_code.toUpperCase() !== delivery_code.toUpperCase()) {
        return new Response(JSON.stringify({ error: "Code de livraison incorrect" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const totalAmount = order.total_price || 0;
    const transportPrice = (order.weight || 0) * (order.price_per_kg || 0);
    const insuranceAmount = order.has_insurance ? (order.insurance_amount || 0) : 0;

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

    // Load logistics price
    const { data: logOpts } = await supabase
      .from("order_logistics_options")
      .select("pickup_price, delivery_price, pickup_enabled, delivery_enabled")
      .eq("order_id", order_id)
      .maybeSingle();
    const logisticsRevenue = logOpts
      ? ((logOpts.pickup_enabled ? (logOpts.pickup_price || 0) : 0) + (logOpts.delivery_enabled ? (logOpts.delivery_price || 0) : 0))
      : 0;

    // ── Commission on TRANSPORT only (not insurance/logistics) ──
    // Percentage-based commission. Manual parcels already have commission_amount=1000 set at creation.
    const commissionRate = gpWallet.commission_rate || 5;
    const commissionAmount = order.commission_amount != null && order.commission_amount > 0
      ? order.commission_amount
      : Math.ceil(transportPrice * commissionRate / 100);
    
    // GP net = transport - commission (NOT total_price - commission)
    let netGP = transportPrice - commissionAmount;

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

    // ── 5. Update platform wallet (commission + insurance + logistics → Konnekt) ──
    const { data: pw } = await supabase.from("platform_wallet").select("id, total_commission, total_escrow_held").single();
    if (pw) {
      await supabase.from("platform_wallet").update({
        total_commission: pw.total_commission + commissionAmount + insuranceAmount + logisticsRevenue,
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
