import { useState, useEffect } from "react";
import { 
  Wallet, ArrowUpRight, CheckCircle, XCircle, Clock, 
  TrendingUp, AlertTriangle, Loader2, Search, RefreshCw 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WalletSummary {
  gp_id: string;
  balance: number;
  pending_balance: number;
  locked_balance: number;
  commission_rate: number;
  commission_due: number;
  total_earned: number;
  gp_name?: string;
}

interface WithdrawalReq {
  id: string;
  gp_id: string;
  amount_fcfa: number;
  method: string;
  phone_or_account: string | null;
  status: string;
  created_at: string;
  gp_name?: string;
}

export function AdminWalletPanel() {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<WalletSummary[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load wallets
      const { data: walletsData } = await supabase
        .from("gp_wallets")
        .select("gp_id, balance, pending_balance, locked_balance, commission_rate, commission_due, total_earned")
        .order("balance", { ascending: false });

      // Load GP names
      const gpIds = (walletsData || []).map(w => w.gp_id);
      const { data: profiles } = await supabase
        .from("gp_profiles")
        .select("id, business_name")
        .in("id", gpIds);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach(p => { nameMap[p.id] = p.business_name; });

      setWallets((walletsData || []).map(w => ({
        ...w,
        gp_name: nameMap[w.gp_id] || "GP inconnu",
      })));

      // Load pending withdrawals
      const { data: wData } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: true });

      const wGpIds = [...new Set((wData || []).map(w => w.gp_id))];
      const { data: wProfiles } = await supabase
        .from("gp_profiles")
        .select("id, business_name")
        .in("id", wGpIds);

      const wNameMap: Record<string, string> = {};
      (wProfiles || []).forEach(p => { wNameMap[p.id] = p.business_name; });

      setWithdrawals((wData || []).map(w => ({
        ...w,
        gp_name: wNameMap[w.gp_id] || "GP",
      })));
    } catch (e) {
      console.error("Error loading wallet data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async (id: string, action: "completed" | "rejected") => {
    setProcessing(id);
    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: action,
          processed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      if (action === "completed") {
        const req = withdrawals.find(w => w.id === id);
        if (req) {
          // Debit GP wallet
          const { data: wallet } = await supabase
            .from("gp_wallets")
            .select("id, balance, total_withdrawn")
            .eq("gp_id", req.gp_id)
            .single();

          if (wallet) {
            await supabase.from("gp_wallets").update({
              balance: wallet.balance - req.amount_fcfa,
              total_withdrawn: wallet.total_withdrawn + req.amount_fcfa,
              updated_at: new Date().toISOString(),
            }).eq("id", wallet.id);
          }
        }
      }

      toast({ title: action === "completed" ? "Retrait validé" : "Retrait refusé" });
      loadData();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const totalEscrow = wallets.reduce((s, w) => s + w.pending_balance + w.locked_balance, 0);
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const totalDebt = wallets.reduce((s, w) => s + w.commission_due, 0);
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending").length;

  const filteredWallets = wallets.filter(w =>
    !search || w.gp_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Wallet} label="Escrow total" value={totalEscrow} color="text-secondary" />
        <KpiCard icon={TrendingUp} label="Soldes GP" value={totalBalance} color="text-success" />
        <KpiCard icon={AlertTriangle} label="Dettes comm." value={totalDebt} color="text-destructive" />
        <KpiCard icon={ArrowUpRight} label="Retraits en attente" value={pendingWithdrawals} color="text-primary" isCount />
      </div>

      <Tabs defaultValue="withdrawals">
        <TabsList>
          <TabsTrigger value="withdrawals" className="text-xs">
            Retraits {pendingWithdrawals > 0 && <Badge className="ml-1 text-[9px] h-4">{pendingWithdrawals}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="wallets" className="text-xs">Wallets GP</TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals" className="mt-4 space-y-3">
          {withdrawals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun retrait en attente</p>
              </CardContent>
            </Card>
          ) : (
            withdrawals.map((w) => (
              <Card key={w.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{w.gp_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.amount_fcfa.toLocaleString()} FCFA · {methodLabel(w.method)}
                      {w.phone_or_account && ` · ${w.phone_or_account}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(w.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-destructive border-destructive/30"
                      disabled={processing === w.id}
                      onClick={() => handleWithdrawal(w.id, "rejected")}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Refuser
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-success hover:bg-success/90"
                      disabled={processing === w.id}
                      onClick={() => handleWithdrawal(w.id, "completed")}
                    >
                      {processing === w.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                      Valider
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="wallets" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un GP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {filteredWallets.map((w) => (
            <Card key={w.gp_id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{w.gp_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Comm: {w.commission_rate}% · Gagné: {w.total_earned.toLocaleString()}
                    {w.commission_due > 0 && <span className="text-destructive ml-1">· Dette: {w.commission_due.toLocaleString()}</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-foreground">{w.balance.toLocaleString()} FCFA</p>
                  {w.pending_balance > 0 && (
                    <p className="text-[10px] text-secondary">+{w.pending_balance.toLocaleString()} en attente</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, isCount }: {
  icon: any; label: string; value: number; color: string; isCount?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className={cn("w-5 h-5 mb-2", color)} />
        <p className="text-xl font-bold text-foreground">
          {isCount ? value : `${value.toLocaleString()} FCFA`}
        </p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function methodLabel(m: string) {
  return { wave: "Wave", orange_money: "Orange Money", bank_transfer: "Virement" }[m] || m;
}
