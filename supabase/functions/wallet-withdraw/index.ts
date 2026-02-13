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
    const userId = claimsData.claims.sub;

    const supabase = createClient(supabaseUrl, serviceKey);
    const { amount, method, wallet_type, phone_number } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (wallet_type === "gp") {
      // GP withdrawal
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id, withdrawal_limit, kyc_level")
        .eq("user_id", userId)
        .single();

      if (!gpProfile) {
        return new Response(JSON.stringify({ error: "GP profile not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: wallet } = await supabase
        .from("gp_wallets")
        .select("id, balance, debt_balance, total_withdrawn")
        .eq("gp_id", gpProfile.id)
        .single();

      if (!wallet) {
        return new Response(JSON.stringify({ error: "Wallet not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Block withdrawal if critical debt
      if (wallet.debt_balance > 0 && wallet.debt_balance >= wallet.balance) {
        return new Response(JSON.stringify({
          error: "Retrait bloqué : dette critique. Complétez vos livraisons pour régulariser.",
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check withdrawal limit
      const limit = gpProfile.withdrawal_limit || 300000;
      if (amount > limit) {
        return new Response(JSON.stringify({ error: `Limite de retrait : ${limit.toLocaleString()} FCFA` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (amount > wallet.balance) {
        return new Response(JSON.stringify({ error: "Solde insuffisant" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Debit wallet
      await supabase.from("gp_wallets").update({
        balance: wallet.balance - amount,
        total_withdrawn: wallet.total_withdrawn + amount,
        updated_at: new Date().toISOString(),
      }).eq("id", wallet.id);

      // Ledger
      await supabase.from("konnekt_ledger").insert({
        type: "withdrawal",
        gp_id: gpProfile.id,
        amount_fcfa: amount,
        currency_display: "XOF",
        amount_display: amount,
        status: "completed",
        description: `Retrait ${method || "mobile_money"} — ${amount.toLocaleString()} FCFA`,
        reference: phone_number || null,
      });

      // Notify
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "💸 Retrait effectué",
        message: `${amount.toLocaleString()} FCFA retirés via ${method || "mobile_money"}`,
        type: "wallet",
      });

      return new Response(JSON.stringify({
        success: true,
        amount,
        new_balance: wallet.balance - amount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // Client withdrawal
      const { data: cw } = await supabase
        .from("client_wallets")
        .select("id, available_balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (!cw || cw.available_balance < amount) {
        return new Response(JSON.stringify({ error: "Solde insuffisant" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("client_wallets").update({
        available_balance: cw.available_balance - amount,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);

      await supabase.from("konnekt_ledger").insert({
        type: "withdrawal",
        amount_fcfa: amount,
        currency_display: "XOF",
        amount_display: amount,
        status: "completed",
        description: `Retrait client ${method || "mobile_money"} — ${amount.toLocaleString()} FCFA`,
        reference: phone_number || null,
      });

      return new Response(JSON.stringify({
        success: true,
        amount,
        new_balance: cw.available_balance - amount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    console.error("Wallet withdraw error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
