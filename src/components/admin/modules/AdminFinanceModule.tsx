/**
 * Admin Finance Module — Konnekt Pay
 * Escrow, Ledger, Wallet GP, Retraits
 */
import { useState, useEffect } from "react";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Clock, Shield, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  totalEscrow: number;
  totalCommissions: number;
  totalInsurance: number;
}

export function AdminFinanceModule({ totalEscrow, totalCommissions, totalInsurance }: Props) {
  const [activeTab, setActiveTab] = useState("escrow");
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    const [ledgerRes, walletsRes, withdrawalsRes] = await Promise.all([
      supabase.from("konnekt_ledger").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("gp_wallets").select("*, gp:gp_profiles(business_name, city)").order("balance", { ascending: false }),
      supabase.from("withdrawal_requests").select("*, gp:gp_profiles(business_name)").order("created_at", { ascending: false }).limit(30),
    ]);
    setLedgerEntries(ledgerRes.data || []);
    setWallets(walletsRes.data || []);
    setWithdrawals(withdrawalsRes.data || []);
    setLoading(false);
  };

  const typeLabels: Record<string, string> = {
    payment: "Paiement",
    commission: "Commission",
    commission_manual: "Com. Manuel",
    release: "Libération",
    refund: "Remboursement",
    adjustment: "Ajustement",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Wallet className="w-5 h-5 text-amber-500" />
        Konnekt Pay
      </h2>

      {/* Finance KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] text-muted-foreground">Escrow bloqué</span>
          </div>
          <p className="text-lg font-bold">{(totalEscrow / 1000).toFixed(0)}k <span className="text-xs font-normal text-muted-foreground">FCFA</span></p>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] text-muted-foreground">Commissions</span>
          </div>
          <p className="text-lg font-bold">{(totalCommissions / 1000).toFixed(0)}k <span className="text-xs font-normal text-muted-foreground">FCFA</span></p>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-[10px] text-muted-foreground">Assurance</span>
          </div>
          <p className="text-lg font-bold">{(totalInsurance / 1000).toFixed(0)}k <span className="text-xs font-normal text-muted-foreground">FCFA</span></p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="escrow">Escrow</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="wallets">Wallets GP</TabsTrigger>
        </TabsList>

        <TabsContent value="escrow" className="space-y-2 mt-3">
          {/* Escrow transactions from escrow_transactions table */}
          <EscrowSection />
        </TabsContent>

        <TabsContent value="ledger" className="space-y-2 mt-3">
          {loading ? (
            <div className="text-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : ledgerEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune entrée</p>
          ) : (
            ledgerEntries.map(entry => (
              <div key={entry.id} className="p-3 rounded-xl border bg-card flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{typeLabels[entry.type] || entry.type}</span>
                    <Badge variant="outline" className="text-[10px]">{entry.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.description || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(entry.created_at).toLocaleDateString("fr")}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${entry.type === "commission" || entry.type === "payment" ? "text-green-600" : ""}`}>
                    {entry.amount_fcfa?.toLocaleString()} FCFA
                  </p>
                  {entry.currency_display !== "XOF" && (
                    <p className="text-[10px] text-muted-foreground">{entry.amount_display} {entry.currency_display}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="wallets" className="space-y-2 mt-3">
          {wallets.map(w => (
            <div key={w.id} className="p-3 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm">{w.gp?.business_name || "—"}</span>
                <span className="font-bold">{w.balance?.toLocaleString()} <span className="text-xs text-muted-foreground">{w.currency}</span></span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>En attente: {w.pending_balance?.toLocaleString()}</span>
                <span>Gagné: {w.total_earned?.toLocaleString()}</span>
                <span>Retiré: {w.total_withdrawn?.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Withdrawals */}
      {withdrawals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ArrowUpFromLine className="w-4 h-4 text-violet-500" />
            Retraits récents
          </h3>
          {withdrawals.slice(0, 10).map(w => (
            <div key={w.id} className="p-3 rounded-xl border bg-card flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{w.gp?.business_name || "—"}</span>
                <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString("fr")} · {w.payment_method || "—"}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">{w.amount_fcfa?.toLocaleString()} FCFA</p>
                <Badge variant={w.status === "approved" ? "default" : w.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                  {w.status === "approved" ? "Validé" : w.status === "rejected" ? "Refusé" : "En attente"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EscrowSection() {
  const [escrows, setEscrows] = useState<any[]>([]);
  
  useEffect(() => {
    supabase.from("escrow_transactions").select("*, gp:gp_profiles(business_name)")
      .order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => setEscrows(data || []));
  }, []);

  const held = escrows.filter(e => e.status === "held");
  const totalHeld = held.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
        <p className="text-xs text-amber-700 dark:text-amber-400">Total bloqué en escrow</p>
        <p className="text-xl font-bold text-amber-800 dark:text-amber-300">{totalHeld.toLocaleString()} FCFA</p>
        <p className="text-[10px] text-amber-600">{held.length} transaction{held.length > 1 ? "s" : ""} en attente</p>
      </div>
      {escrows.slice(0, 15).map(e => (
        <div key={e.id} className="p-3 rounded-xl border bg-card flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{e.gp?.business_name || "—"}</span>
            <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString("fr")} · {e.status}</p>
          </div>
          <p className="font-bold text-sm">{e.amount?.toLocaleString()} {e.currency}</p>
        </div>
      ))}
    </div>
  );
}