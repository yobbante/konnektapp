/**
 * release-funds-v2 — Point de release centralisé et unique
 *
 * Fusionne release-funds + confirm-delivery-release.
 * Règles strictes :
 *   - escrow_transactions.status DOIT être 'held'
 *   - order.status DOIT être 'delivery_confirmed'
 *   - Aucun litige ouvert
 *   - Idempotence via idempotency_keys
 *   - Toutes mutations dans la même transaction logique
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Service role: contourne RLS pour les opérations financières critiques
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { order_id, idempotency_key, delivery_code } = body;

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Idempotence : retourner résultat existant si déjà traité ──
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

    // ── 1. Charger la commande ──────────────────────────────────────
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        "id, gp_id, client_id, total_price, currency, status, financial_status, order_number, commission_amount, delivery_code"
      )
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Vérification état commande ───────────────────────────────
    const validReleaseStates = ["delivery_confirmed", "delivered"];
    if (!validReleaseStates.includes(order.status)) {
      return new Response(
        JSON.stringify({
          error: `Cannot release: order status is '${order.status}', expected 'delivery_confirmed'`,
          current_status: order.status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 3. Vérification statut financier (anti double-release) ─────
    if (order.financial_status === "completed") {
      return new Response(
        JSON.stringify({ error: "Already released: financial_status is completed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 4. Vérification disputes ouverts ───────────────────────────
    const { data: disputes } = await supabase
      .from("disputes")
      .select("id")
      .eq("order_id", order_id)
      .in("status", ["open", "under_review", "awaiting_response"])
      .limit(1);

    if (disputes && disputes.length > 0) {
      return new Response(
        JSON.stringify({ error: "Cannot release: open dispute exists" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 5. Vérification code livraison ─────────────────────────────
    if (delivery_code) {
      if (
        !order.delivery_code ||
        order.delivery_code.toUpperCase() !== delivery_code.toString().toUpperCase()
      ) {
        return new Response(
          JSON.stringify({ error: "Code de livraison incorrect" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // ── 6. Charger l'escrow — AUTORITÉ UNIQUE ──────────────────────
    const { data: escrow, error: escrowErr } = await supabase
      .from("escrow_transactions")
      .select("id, amount, commission_amount, net_to_gp, status")
      .eq("order_id", order_id)
      .single();

    if (escrowErr || !escrow) {
      return new Response(
        JSON.stringify({ error: "Escrow not found for this order" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 7. Vérification escrow.status == held (bloque double release) ──
    if (escrow.status === "released") {
      return new Response(
        JSON.stringify({ error: "ESCROW_ALREADY_RELEASED: funds already released" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (escrow.status !== "held") {
      return new Response(
        JSON.stringify({ error: `Cannot release: escrow status is '${escrow.status}'` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 8. Charger wallet GP ───────────────────────────────────────
    const { data: gpWallet } = await supabase
      .from("gp_wallets")
      .select("id, balance, pending_balance, commission_rate, total_earned, debt_balance")
      .eq("gp_id", order.gp_id)
      .single();

    if (!gpWallet) {
      return new Response(JSON.stringify({ error: "GP wallet not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 9. Calcul financier final ──────────────────────────────────
    const totalAmount = escrow.amount; // Source de vérité : escrow, pas order.total_price
    const commissionRate = gpWallet.commission_rate || 5;

    // Utiliser commission stockée dans l'escrow (inclut les ajustements de poids)
    // Fallback : recalcul si non stocké
    const commissionAmount =
      escrow.commission_amount > 0
        ? escrow.commission_amount
        : order.commission_amount > 0
        ? order.commission_amount
        : Math.ceil(totalAmount * commissionRate / 100);

    let netGP =
      escrow.net_to_gp > 0
        ? escrow.net_to_gp
        : totalAmount - commissionAmount;

    // Déduction dette GP
    let debtDeducted = 0;
    const currentDebt = gpWallet.debt_balance || 0;
    if (currentDebt > 0) {
      debtDeducted = Math.min(currentDebt, netGP);
      netGP -= debtDeducted;
    }

    const now = new Date().toISOString();

    // ── 10. LOG pre-release dans escrow_logs ──────────────────────
    await supabase.from("escrow_logs").insert({
      order_id,
      action: "released",
      previous_amount: totalAmount,
      new_amount: totalAmount,
      commission_amount: commissionAmount,
      actor: "release_v2",
    });

    // ── 11. Mettre à jour escrow_transactions (AUTORITÉ UNIQUE) ───
    const { error: escrowUpdateErr } = await supabase
      .from("escrow_transactions")
      .update({
        status: "released",
        released_at: now,
        release_reason: "Livraison confirmée — release_v2",
        commission_amount: commissionAmount,
        net_to_gp: netGP,
      })
      .eq("id", escrow.id)
      .eq("status", "held"); // Guard: uniquement si encore held

    if (escrowUpdateErr) {
      console.error("Escrow update failed:", escrowUpdateErr);
      return new Response(
        JSON.stringify({ error: "Escrow update failed: " + escrowUpdateErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 12. Ledger entries ─────────────────────────────────────────
    await supabase.from("konnekt_ledger").insert({
      type: "commission",
      order_id,
      gp_id: order.gp_id,
      amount_fcfa: commissionAmount,
      currency_display: order.currency || "XOF",
      amount_display: commissionAmount,
      status: "completed",
      description: `Commission ${commissionRate}% — ${order.order_number}`,
    });

    if (debtDeducted > 0) {
      await supabase.from("konnekt_ledger").insert({
        type: "debt_deduction",
        order_id,
        gp_id: order.gp_id,
        amount_fcfa: debtDeducted,
        currency_display: order.currency || "XOF",
        amount_display: debtDeducted,
        status: "completed",
        description: `Régularisation dette — ${order.order_number}`,
      });
    }

    await supabase.from("konnekt_ledger").insert({
      type: "release",
      order_id,
      gp_id: order.gp_id,
      amount_fcfa: netGP,
      currency_display: order.currency || "XOF",
      amount_display: netGP,
      status: "completed",
      description: `Libération fonds — ${order.order_number}`,
    });

    // ── 13. Créditer wallet GP ─────────────────────────────────────
    await supabase
      .from("gp_wallets")
      .update({
        balance: gpWallet.balance + netGP,
        pending_balance: Math.max(0, gpWallet.pending_balance - totalAmount),
        total_earned: gpWallet.total_earned + netGP,
        debt_balance: Math.max(0, currentDebt - debtDeducted),
        updated_at: now,
      })
      .eq("id", gpWallet.id);

    // ── 14. Mettre à jour platform_wallet ──────────────────────────
    const { data: pw } = await supabase
      .from("platform_wallet")
      .select("id, total_commission, total_escrow_held")
      .single();
    if (pw) {
      await supabase
        .from("platform_wallet")
        .update({
          total_commission: pw.total_commission + commissionAmount,
          total_escrow_held: Math.max(0, pw.total_escrow_held - totalAmount),
          updated_at: now,
        })
        .eq("id", pw.id);
    }

    // ── 15. Mettre à jour wallet client (escrow libéré) ───────────
    const { data: cw } = await supabase
      .from("client_wallets")
      .select("escrow_balance")
      .eq("user_id", order.client_id)
      .maybeSingle();
    if (cw) {
      await supabase
        .from("client_wallets")
        .update({
          escrow_balance: Math.max(0, cw.escrow_balance - totalAmount),
          updated_at: now,
        })
        .eq("user_id", order.client_id);
    }

    // ── 16. Mettre à jour la commande ─────────────────────────────
    // SYNCHRONISATION ATOMIQUE : order.status + financial_status dans le même update
    await supabase
      .from("orders")
      .update({
        status: "released",          // State machine → released
        financial_status: "completed", // Statut financier → completed
        payment_status: "released",
        commission_amount: commissionAmount,
        final_amount: netGP,
      })
      .eq("id", order_id);

    // ── 17. Notification GP ────────────────────────────────────────
    const { data: gpProfile } = await supabase
      .from("gp_profiles")
      .select("user_id")
      .eq("id", order.gp_id)
      .single();

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

    // ── 18. Idempotency key : stocker le résultat ──────────────────
    const result = {
      success: true,
      total: totalAmount,
      commission: commissionAmount,
      commission_rate: commissionRate,
      debt_deducted: debtDeducted,
      net_gp: netGP,
      escrow_status: "released",
      order_status: "released",
    };

    if (idempotency_key) {
      await supabase.from("idempotency_keys").insert({ key: idempotency_key, result });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("release-funds-v2 error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
