import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ExchangeRate = {
  from_currency: string;
  to_currency: string;
  rate: number;
};

function getRate(rates: ExchangeRate[], from: string, to: string): number | null {
  if (from === to) return 1;

  const direct = rates.find((rate) => rate.from_currency === from && rate.to_currency === to);
  if (direct) return direct.rate;

  const inverse = rates.find((rate) => rate.from_currency === to && rate.to_currency === from);
  if (inverse) return 1 / inverse.rate;

  const toEur = rates.find((rate) => rate.from_currency === from && rate.to_currency === "EUR");
  const fromEur = rates.find((rate) => rate.from_currency === "EUR" && rate.to_currency === to);
  if (toEur && fromEur) return toEur.rate * fromEur.rate;

  const toXof = rates.find((rate) => rate.from_currency === from && rate.to_currency === "XOF");
  const fromXof = rates.find((rate) => rate.from_currency === "XOF" && rate.to_currency === to);
  if (toXof && fromXof) return toXof.rate * fromXof.rate;

  return null;
}

function convertAmount(amount: number, fromCurrency: string, toCurrency: string, rates: ExchangeRate[]) {
  if (fromCurrency === toCurrency) return amount;
  const rate = getRate(rates, fromCurrency, toCurrency);
  return rate === null ? amount : amount * rate;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );

    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const orderId = body?.order_id;
    const paymentMethod = body?.payment_method || "wallet";

    if (!orderId) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["wallet", "wave", "orange"].includes(paymentMethod)) {
      return new Response(JSON.stringify({ error: "Invalid payment method" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, client_id, gp_id, status, financial_status, payment_status, total_price, adjustment_amount, currency, weight, declared_weight, weight_tier_applied")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Commande introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.client_id !== userId) {
      return new Response(JSON.stringify({ error: "Commande non autorisée" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supplementAmount = Number(order.adjustment_amount || 0);
    if (order.status !== "weight_pending_payment" || supplementAmount <= 0) {
      return new Response(JSON.stringify({
        success: true,
        already_paid: true,
        order,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const orderCurrency = order.currency || "XOF";

    const { data: rates } = await supabase
      .from("exchange_rates")
      .select("from_currency, to_currency, rate");

    const exchangeRates = (rates || []) as ExchangeRate[];
    const amountInXof = Math.ceil(convertAmount(supplementAmount, orderCurrency, "XOF", exchangeRates));

    let walletPayload: Record<string, unknown> | null = null;
    let deductionAmount = supplementAmount;

    if (paymentMethod === "wallet") {
      const { data: wallet, error: walletError } = await supabase
        .from("client_wallets")
        .select("id, available_balance, escrow_balance, currency")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletError || !wallet) {
        return new Response(JSON.stringify({ error: "Portefeuille client introuvable" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const walletCurrency = wallet.currency || "USD";
      deductionAmount = Math.ceil(convertAmount(supplementAmount, orderCurrency, walletCurrency, exchangeRates));

      if ((wallet.available_balance || 0) < deductionAmount) {
        return new Response(JSON.stringify({ error: "Solde insuffisant" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updatedWallet = {
        available_balance: (wallet.available_balance || 0) - deductionAmount,
        escrow_balance: (wallet.escrow_balance || 0) + deductionAmount,
        updated_at: now,
      };

      const { error: updateWalletError } = await supabase
        .from("client_wallets")
        .update(updatedWallet)
        .eq("id", wallet.id);

      if (updateWalletError) {
        return new Response(JSON.stringify({ error: updateWalletError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      walletPayload = {
        id: wallet.id,
        currency: walletCurrency,
        ...updatedWallet,
      };
    }

    const resolvedWeight = Number(order.weight_tier_applied ?? order.declared_weight ?? order.weight ?? 0) || order.weight;

    const nextOrder = {
      status: "checked_in",
      financial_status: "adjustment_paid",
      payment_status: "paid",
      adjustment_amount: 0,
      weight: resolvedWeight,
      updated_at: now,
    };

    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from("orders")
      .update(nextOrder)
      .eq("id", orderId)
      .select("id, order_number, status, financial_status, payment_status, total_price, adjustment_amount, currency, weight, declared_weight, weight_tier_applied")
      .single();

    if (updateOrderError) {
      return new Response(JSON.stringify({ error: updateOrderError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingEscrow } = await supabase
      .from("escrow_transactions")
      .select("id, amount")
      .eq("order_id", orderId)
      .eq("status", "held")
      .maybeSingle();

    if (existingEscrow) {
      await supabase
        .from("escrow_transactions")
        .update({
          amount: Math.max(existingEscrow.amount || 0, order.total_price || 0),
          updated_at: now,
        })
        .eq("id", existingEscrow.id);
    }

    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status: "checked_in",
      changed_by: userId,
      changed_by_type: "client",
      notes: `Supplément de ${supplementAmount.toLocaleString("fr-FR")} ${orderCurrency} payé via ${paymentMethod}. Transit débloqué.`,
    });

    await supabase.from("escrow_logs").insert({
      order_id: orderId,
      action: "supplement_paid",
      previous_amount: Math.max((order.total_price || 0) - supplementAmount, 0),
      new_amount: order.total_price || supplementAmount,
      commission_amount: 0,
      actor: `client_${paymentMethod}`,
    });

    await supabase.from("konnekt_ledger").insert({
      type: "adjustment_payment",
      order_id: orderId,
      gp_id: order.gp_id,
      amount_fcfa: amountInXof,
      currency_display: orderCurrency,
      amount_display: supplementAmount,
      status: "completed",
      description: `Supplément payé via ${paymentMethod} — ${order.order_number}`,
    });

    return new Response(JSON.stringify({
      success: true,
      order: updatedOrder,
      wallet: walletPayload,
      supplement_amount: supplementAmount,
      wallet_deduction: paymentMethod === "wallet" ? deductionAmount : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});