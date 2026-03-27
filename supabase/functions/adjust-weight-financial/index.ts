/**
 * adjust-weight-financial — Version sécurisée
 *
 * Règles anti-abus (Section IX) :
 *   - Blocage après scheduled_departure / in_transit / released
 *   - Max 1 modification en MVP
 *   - Justification obligatoire si delta significatif
 *   - Log dans weight_adjustment_log
 *   - Log dans security_audit_log si abus détecté
 *   - Mise à jour escrow_logs si escrow ajusté
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { calculatePrice } from "../../../src/lib/gpPricingEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// États où la modification de poids est INTERDITE
const BLOCKED_STATUSES = new Set([
  "scheduled_departure",
  "in_transit",
  "arrived_destination",
  "delivery_pending",
  "delivery_confirmed",
  "delivered",
  "released",
  "cancelled",
  "disputed",
  "weight_pending_payment",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Auth JWT obligatoire ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const supabase = createClient(supabaseUrl, serviceKey);
    const { order_id, new_weight, price_per_kg, justification } = await req.json();

    if (!order_id || new_weight === undefined) {
      return new Response(JSON.stringify({ error: "order_id and new_weight required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof new_weight !== "number" || new_weight <= 0 || new_weight > 10000) {
      return new Response(JSON.stringify({ error: "Invalid weight value" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Charger la commande ──
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        "id, client_id, gp_id, weight, declared_weight, total_price, price_per_kg, currency, order_number, financial_status, status, weight_adjustment_count"
      )
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Vérification ownership : seul le GP de la commande peut modifier ──
    const { data: gpProfile } = await supabase
      .from("gp_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const isGP = gpProfile && gpProfile.id === order.gp_id;
    const isAdmin = !isGP; // Simplification MVP : si pas GP propriétaire → vérifier admin

    if (!isGP) {
      // Vérifier si admin
      const { data: roleCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "moderator"])
        .maybeSingle();

      if (!roleCheck) {
        await supabase.from("security_audit_log").insert({
          event_type: "weight_abuse",
          order_id,
          actor_id: userId,
          details: { reason: "unauthorized_actor", order_status: order.status },
          severity: "critical",
        });
        return new Response(JSON.stringify({ error: "Not authorized to modify this order's weight" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Anti-abus : vérifier état de la commande ──
    if (BLOCKED_STATUSES.has(order.status)) {
      await supabase.from("security_audit_log").insert({
        event_type: "weight_abuse",
        order_id,
        actor_id: userId,
        details: {
          reason: "modification_blocked_by_status",
          current_status: order.status,
          attempted_weight: new_weight,
        },
        severity: "critical",
      });

      await supabase.from("weight_adjustment_log").insert({
        order_id,
        actor_id: userId,
        actor_role: isGP ? "gp" : "admin",
        original_weight: order.weight,
        declared_weight: new_weight,
        delta_amount: 0,
        justification: justification || null,
        blocked: true,
        block_reason: `Status '${order.status}' blocks weight modification`,
      });

      return new Response(
        JSON.stringify({
          error: `Weight modification blocked: order is in '${order.status}' state`,
          blocked_reason: "state_machine",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Anti-abus MVP : max 1 modification ──
    const adjustmentCount = order.weight_adjustment_count || 0;
    if (adjustmentCount >= 1 && !isAdmin) {
      await supabase.from("security_audit_log").insert({
        event_type: "weight_abuse",
        order_id,
        actor_id: userId,
        details: {
          reason: "max_adjustments_reached",
          current_count: adjustmentCount,
          attempted_weight: new_weight,
        },
        severity: "warn",
      });

      return new Response(
        JSON.stringify({
          error: "Maximum weight adjustments reached for this order (MVP: max 1)",
          adjustment_count: adjustmentCount,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const effectivePricePerKg = price_per_kg || order.price_per_kg || 0;
    const previousWeight = Number(order.declared_weight ?? order.weight ?? 0);
    const forfaitValise23kg = Math.round(effectivePricePerKg * 23 * 0.85);
    const previousTransportAmount = calculatePrice(previousWeight, {
      basePricePerKg: effectivePricePerKg,
      forfaitValise23kg,
      currency: order.currency || "",
    });
    const newTransportAmount = calculatePrice(new_weight, {
      basePricePerKg: effectivePricePerKg,
      forfaitValise23kg,
      currency: order.currency || "",
    });
    const delta = newTransportAmount - previousTransportAmount;
    const oldAmount = order.total_price || 0;
    const newAmount = oldAmount + delta;
    const now = new Date().toISOString();

    // ── Log dans weight_adjustment_log (audit immuable) ──
    await supabase.from("weight_adjustment_log").insert({
      order_id,
      actor_id: userId,
      actor_role: isGP ? "gp" : "admin",
      original_weight: order.weight,
      declared_weight: new_weight,
      delta_amount: delta,
      justification: justification || null,
      blocked: false,
    });

    if (delta === 0) {
      // Weight changed but no financial impact — update weight, reset adjustment_amount, notify client, don't block
      await supabase
        .from("orders")
        .update({
          declared_weight: new_weight,
          weight_adjustment_count: adjustmentCount + 1,
          adjustment_amount: 0,
        })
        .eq("id", order_id);

      // Notify client of weight change (no payment needed)
      await supabase.from("notifications").insert({
        user_id: order.client_id,
        title: "⚖️ Poids mis à jour",
        message: `Le poids de ${order.order_number} a été ajusté à ${new_weight}kg. Aucun supplément requis.`,
        type: "weight_adjustment",
        related_id: order_id,
        related_type: "order",
      });

      return new Response(
        JSON.stringify({ success: true, delta: 0, message: "Weight updated, no payment needed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (delta > 0) {
      // ── Supplément : bloquer transport → weight_pending_payment ──
      await supabase
        .from("orders")
        .update({
          declared_weight: new_weight,
          status: "weight_pending_payment",
          total_price: newAmount,
          adjustment_amount: delta,
          financial_status: "adjustment_required",
          weight_adjustment_count: adjustmentCount + 1,
        })
        .eq("id", order_id);

      // Mettre à jour escrow si existant
      const { data: escrow } = await supabase
        .from("escrow_transactions")
        .select("id, amount, commission_amount")
        .eq("order_id", order_id)
        .eq("status", "held")
        .maybeSingle();

      if (escrow) {
        const newEscrowAmount = escrow.amount + delta;
        const newCommission = Math.max(Math.ceil(newEscrowAmount * 0.05), 1000); // min 1000 FCFA
        const newNetGP = newEscrowAmount - newCommission;

        await supabase
          .from("escrow_transactions")
          .update({
            amount: newEscrowAmount,
            commission_amount: newCommission,
            net_to_gp: newNetGP,
            updated_at: now,
          })
          .eq("id", escrow.id);

        // Log escrow_logs
        await supabase.from("escrow_logs").insert({
          order_id,
          action: "adjusted",
          previous_amount: escrow.amount,
          new_amount: newEscrowAmount,
          commission_amount: newCommission,
          actor: `gp:${userId}`,
        });
      }

      // Ledger
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

      // Notifier client
      await supabase.from("notifications").insert({
        user_id: order.client_id,
        title: "⚖️ Supplément poids requis",
        message: `Supplément de ${delta.toLocaleString()} FCFA requis pour ${order.order_number}. Payez pour débloquer le transport.`,
        type: "weight_adjustment",
        related_id: order_id,
        related_type: "order",
      });

      return new Response(
        JSON.stringify({
          success: true,
          delta,
          direction: "increase",
          new_total: newAmount,
          new_status: "weight_pending_payment",
          financial_status: "adjustment_required",
          message: "Supplément requis — transport bloqué jusqu'au paiement",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // ── Remboursement : ajuster escrow ──
      const credit = Math.abs(delta);

      await supabase
        .from("orders")
        .update({
          declared_weight: new_weight,
          total_price: newAmount,
          adjustment_amount: delta,
          weight_adjustment_count: adjustmentCount + 1,
        })
        .eq("id", order_id);

      // Mettre à jour escrow
      const { data: escrow } = await supabase
        .from("escrow_transactions")
        .select("id, amount, commission_amount")
        .eq("order_id", order_id)
        .eq("status", "held")
        .maybeSingle();

      if (escrow) {
        const newEscrowAmount = Math.max(0, escrow.amount - credit);
        const newCommission = Math.max(Math.ceil(newEscrowAmount * 0.05), 1000); // min 1000 FCFA
        const newNetGP = newEscrowAmount - newCommission;

        await supabase
          .from("escrow_transactions")
          .update({
            amount: newEscrowAmount,
            commission_amount: newCommission,
            net_to_gp: newNetGP,
            updated_at: now,
          })
          .eq("id", escrow.id);

        await supabase.from("escrow_logs").insert({
          order_id,
          action: "adjusted",
          previous_amount: escrow.amount,
          new_amount: newEscrowAmount,
          commission_amount: newCommission,
          actor: `gp:${userId}`,
        });
      }

      // Créditer wallet client
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
            updated_at: now,
          })
          .eq("user_id", order.client_id);
      }

      await supabase.from("konnekt_ledger").insert({
        type: "adjustment_minus",
        order_id,
        gp_id: order.gp_id,
        amount_fcfa: credit,
        currency_display: order.currency || "XOF",
        amount_display: credit,
        status: "completed",
        description: `Remboursement ajustement ${order.order_number}: ${order.weight}kg → ${new_weight}kg (-${credit} FCFA)`,
      });

      await supabase.from("notifications").insert({
        user_id: order.client_id,
        title: "💰 Remboursement ajustement poids",
        message: `${credit.toLocaleString()} FCFA remboursés suite à la correction du poids de ${order.order_number}.`,
        type: "weight_adjustment",
        related_id: order_id,
        related_type: "order",
      });

      return new Response(
        JSON.stringify({
          success: true,
          delta,
          direction: "decrease",
          credit,
          new_total: newAmount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Adjust weight financial error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
