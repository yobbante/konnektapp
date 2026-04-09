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
    const walletType = url.searchParams.get("type") || "unified";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Legacy GP-only mode
    if (walletType === "gp") {
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
    }

    // ── Unified wallet view (client + GP if applicable) ──────────

    // 1. Client wallet
    const { data: clientWallet } = await supabase
      .from("client_wallets").select("*").eq("user_id", userId).maybeSingle();

    // 2. GP wallet (if user is also a GP)
    const { data: gp } = await supabase
      .from("gp_profiles").select("id, business_name, gp_type, default_currency").eq("user_id", userId).maybeSingle();

    let gpWallet: any = null;
    if (gp) {
      const { data: gw } = await supabase
        .from("gp_wallets").select("*").eq("gp_id", gp.id).maybeSingle();
      gpWallet = gw;
    }

    // 3. Compute unified balance — use gp_profiles.default_currency as source of truth
    const clientAvailable = clientWallet?.available_balance || 0;
    const clientEscrow = clientWallet?.escrow_balance || 0;
    const clientBonus = clientWallet?.credit_bonus || 0;
    const clientCurrency = clientWallet?.currency || "XOF";

    const gpBalance = gpWallet?.balance || 0;
    const gpPending = gpWallet?.pending_balance || 0;
    const gpCurrency = gp?.default_currency || gpWallet?.currency || "XOF";

    // 4. Collect all transactions
    const allTransactions: any[] = [];

    // Client orders → ledger entries
    const { data: orders } = await supabase
      .from("orders").select("id").eq("client_id", userId);
    const orderIds = (orders || []).map((o: any) => o.id);

    if (orderIds.length > 0) {
      const { data } = await supabase
        .from("konnekt_ledger")
        .select("*")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false })
        .limit(limit);

      (data || []).forEach((tx: any) => {
        allTransactions.push({ ...tx, source: "client" });
      });
    }

    // GP ledger entries
    if (gp) {
      const { data } = await supabase
        .from("konnekt_ledger")
        .select("*")
        .eq("gp_id", gp.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      (data || []).forEach((tx: any) => {
        // Avoid duplicates (same id already from client orders)
        if (!allTransactions.find((t: any) => t.id === tx.id)) {
          allTransactions.push({ ...tx, source: "gp" });
        }
      });
    }

    // Client withdrawal ledger entries (no order_id, no gp_id)
    const { data: clientLedger } = await supabase
      .from("konnekt_ledger")
      .select("*")
      .is("gp_id", null)
      .is("order_id", null)
      .order("created_at", { ascending: false })
      .limit(20);

    // Filter to entries that belong to this user (via description match or other heuristic)
    // Since konnekt_ledger doesn't have user_id, we rely on client-side withdrawal entries
    // already being captured above via order_ids. Skip duplicates.

    // Sort all by date
    allTransactions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Escrow transactions for context
    const { data: escrows } = await supabase
      .from("escrow_transactions")
      .select("*")
      .eq("client_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    return new Response(JSON.stringify({
      wallet: {
        available_balance: clientAvailable,
        escrow_balance: clientEscrow,
        credit_bonus: clientBonus,
        currency: clientCurrency,
      },
      gp_wallet: gpWallet ? {
        balance: gpBalance,
        pending_balance: gpPending,
        currency: gpCurrency,
        gp_type: gp?.gp_type,
        business_name: gp?.business_name,
      } : null,
      unified_balance: clientAvailable + gpBalance,
      transactions: allTransactions.slice(0, limit),
      escrows: escrows || [],
      total: allTransactions.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Wallet ledger error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
