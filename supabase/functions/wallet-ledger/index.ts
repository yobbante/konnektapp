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
    const url = new URL(req.url);
    const walletType = url.searchParams.get("type") || "client";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (walletType === "gp") {
      // Get GP profile
      const { data: gp } = await supabase
        .from("gp_profiles").select("id").eq("user_id", userId).single();

      if (!gp) {
        return new Response(JSON.stringify({ error: "GP not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: transactions, count } = await supabase
        .from("konnekt_ledger")
        .select("*", { count: "exact" })
        .eq("gp_id", gp.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: wallet } = await supabase
        .from("gp_wallets").select("*").eq("gp_id", gp.id).single();

      return new Response(JSON.stringify({
        wallet,
        transactions: transactions || [],
        total: count || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // Client ledger — get orders for this client, then ledger entries
      const { data: clientWallet } = await supabase
        .from("client_wallets").select("*").eq("user_id", userId).maybeSingle();

      // Get client orders
      const { data: orders } = await supabase
        .from("orders").select("id").eq("client_id", userId);

      const orderIds = (orders || []).map((o: any) => o.id);

      let transactions: any[] = [];
      let total = 0;

      if (orderIds.length > 0) {
        const { data, count } = await supabase
          .from("konnekt_ledger")
          .select("*", { count: "exact" })
          .in("order_id", orderIds)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        transactions = data || [];
        total = count || 0;
      }

      // Also get escrow transactions
      const { data: escrows } = await supabase
        .from("escrow_transactions")
        .select("*")
        .eq("client_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({
        wallet: clientWallet,
        transactions,
        escrows: escrows || [],
        total,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    console.error("Wallet ledger error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
