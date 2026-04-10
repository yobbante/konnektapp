import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );

    if (claimsErr || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = claimsData.claims.sub as string;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      order_id,
      reason,
      actor_type,
      clear_weight_tier = false,
      refund_only = false,
    } = body ?? {};

    if (!order_id) {
      return json({ error: "order_id required" }, 400);
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, order_number, status, financial_status, payment_status, total_price, currency, client_id, gp_id")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return json({ error: "Order not found" }, 404);
    }

    const [{ data: gpProfile }, { data: roles }] = await Promise.all([
      supabase
        .from("gp_profiles")
        .select("user_id")
        .eq("id", order.gp_id)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "moderator"]),
    ]);

    const isAdmin = !!roles?.length;
    const isClient = userId === order.client_id;
    const isGp = gpProfile?.user_id === userId;

    if (!isAdmin && !isClient && !isGp) {
      return json({ error: "Forbidden" }, 403);
    }

    const resolvedActorType = actor_type || (isAdmin ? "admin" : isGp ? "gp" : "client");

    if (!refund_only && ["released", "delivery_confirmed", "delivered"].includes(order.status)) {
      return json({ error: "Order can no longer be cancelled" }, 400);
    }

    const now = new Date().toISOString();

    const [{ data: escrow }, { data: clientWallet }, { data: gpWallet }, { data: platformWallet }] = await Promise.all([
      supabase
        .from("escrow_transactions")
        .select("id, amount, status, currency")
        .eq("order_id", order_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("client_wallets")
        .select("id, available_balance, escrow_balance")
        .eq("user_id", order.client_id)
        .maybeSingle(),
      supabase
        .from("gp_wallets")
        .select("id, pending_balance")
        .eq("gp_id", order.gp_id)
        .maybeSingle(),
      supabase
        .from("platform_wallet")
        .select("id, total_escrow_held")
        .maybeSingle(),
    ]);

    const heldEscrow = escrow?.status === "held" ? escrow : null;
    const pendingReversalAmount = heldEscrow?.amount || ((order.payment_status === "paid" || order.payment_status === "escrow") ? (order.total_price || 0) : 0);

    let refundedAmount = 0;
    let refunded = false;

    if (heldEscrow) {
      if (!clientWallet) {
        return json({ error: "Client wallet not found for refund" }, 500);
      }

      refundedAmount = heldEscrow.amount || 0;
      refunded = refundedAmount > 0;

      await supabase
        .from("client_wallets")
        .update({
          available_balance: (clientWallet.available_balance || 0) + refundedAmount,
          escrow_balance: Math.max(0, (clientWallet.escrow_balance || 0) - refundedAmount),
          updated_at: now,
        })
        .eq("id", clientWallet.id);

      await supabase
        .from("escrow_transactions")
        .update({
          status: "refunded",
          refunded_at: now,
          refund_reason: reason || "Annulation de commande — remboursement automatique",
        })
        .eq("id", heldEscrow.id);

      if (platformWallet) {
        await supabase
          .from("platform_wallet")
          .update({
            total_escrow_held: Math.max(0, (platformWallet.total_escrow_held || 0) - refundedAmount),
            updated_at: now,
          })
          .eq("id", platformWallet.id);
      }

      await supabase.from("konnekt_ledger").insert({
        type: "refund",
        order_id,
        gp_id: order.gp_id,
        amount_fcfa: refundedAmount,
        currency_display: heldEscrow.currency || order.currency || "XOF",
        amount_display: refundedAmount,
        status: "completed",
        description: `Remboursement annulation — ${order.order_number}`,
      }).catch(() => {});
    }

    if (gpWallet && pendingReversalAmount > 0) {
      await supabase
        .from("gp_wallets")
        .update({
          pending_balance: Math.max(0, (gpWallet.pending_balance || 0) - pendingReversalAmount),
          updated_at: now,
        })
        .eq("id", gpWallet.id);
    }

    if (!refund_only && order.status !== "cancelled") {
      const orderUpdate: Record<string, unknown> = {
        status: "cancelled",
        financial_status: refunded ? "refunded" : (order.financial_status === "escrow_locked" ? "cancelled" : (order.financial_status || "cancelled")),
        payment_status: refunded ? "refunded" : ((order.payment_status === "paid" || order.payment_status === "escrow") ? "cancelled" : order.payment_status),
        updated_at: now,
      };

      if (clear_weight_tier) {
        orderUpdate.weight_tier_applied = null;
        orderUpdate.adjustment_amount = 0;
      }

      await supabase.from("orders").update(orderUpdate).eq("id", order_id);

      await supabase.from("order_status_history").insert({
        order_id,
        status: "cancelled",
        changed_by: userId,
        changed_by_type: resolvedActorType,
        notes: reason || (resolvedActorType === "client" ? "Commande annulée par le client" : "Commande refusée par le transporteur"),
      }).catch(() => {});
    } else if (refund_only && refunded) {
      await supabase
        .from("orders")
        .update({
          financial_status: "refunded",
          payment_status: "refunded",
          updated_at: now,
        })
        .eq("id", order_id)
        .catch(() => {});
    }

    const notifications = [];

    if (!isClient) {
      notifications.push({
        user_id: order.client_id,
        type: "order_update",
        title: refunded ? "Commande annulée et remboursée" : "Commande annulée",
        message: refunded
          ? `Votre commande ${order.order_number} a été annulée. ${refundedAmount.toLocaleString("fr-FR")} ${order.currency || "XOF"} ont été recrédités sur votre wallet.`
          : `Votre commande ${order.order_number} a été annulée.`,
        related_type: "order",
        related_id: order_id,
      });
    }

    if (gpProfile?.user_id && !isGp) {
      notifications.push({
        user_id: gpProfile.user_id,
        type: "order_update",
        title: isClient ? "Commande annulée par le client" : "Commande annulée",
        message: isClient
          ? `La commande ${order.order_number} a été annulée par le client.`
          : `La commande ${order.order_number} a été annulée.`,
        related_type: "order",
        related_id: order_id,
      });
    }

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications).catch(() => {});
    }

    return json({
      success: true,
      refunded,
      refunded_amount: refundedAmount,
      order_status: "cancelled",
      escrow_status: refunded ? "refunded" : (escrow?.status || null),
    });
  } catch (error: any) {
    console.error("cancel-order error:", error);
    return json({ error: error.message || "Unknown error" }, 500);
  }
});
