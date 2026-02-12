import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, ArrowUpRight, ArrowDownRight, Clock, TrendingUp,
  CreditCard, Percent, AlertTriangle, Filter, ChevronDown,
  Smartphone, Building, Loader2, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { cn } from "@/lib/utils";

interface GPWalletCardProps {
  wallet: {
    balance: number;
    pending_balance: number;
    total_earned: number;
    total_withdrawn?: number;
    currency: string;
    locked_balance?: number;
    commission_rate?: number;
    commission_due?: number;
  } | null;
  gpId?: string;
  compact?: boolean;
}

interface LedgerEntry {
  id: string;
  type: string;
  amount_fcfa: number;
  currency_display: string;
  amount_display: number;
  status: string;
  description: string | null;
  created_at: string;
}

interface WithdrawalRequest {
  id: string;
  amount_fcfa: number;
  amount_display: number;
  currency_display: string;
  method: string;
  status: string;
  created_at: string;
}

export function GPWalletCard({ wallet, gpId, compact }: GPWalletCardProps) {
  const { toast } = useToast();
  const balance = wallet?.balance || 0;
  const pending = wallet?.pending_balance || 0;
  const totalEarned = wallet?.total_earned || 0;
  const locked = wallet?.locked_balance || 0;
  const commissionRate = wallet?.commission_rate || 5;
  const commissionDue = wallet?.commission_due || 0;
  const currency = wallet?.currency || "FCFA";
  const { formatDual, isFCFA } = useCurrencyConversion({ gpCurrency: currency });

  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [txFilter, setTxFilter] = useState("all");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("wave");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (gpId && activeTab === "history") loadTransactions();
    if (gpId && activeTab === "withdrawals") loadWithdrawals();
  }, [gpId, activeTab]);

  const loadTransactions = async () => {
    if (!gpId) return;
    setLoadingTx(true);
    try {
      let query = supabase
        .from("konnekt_ledger")
        .select("*")
        .eq("gp_id", gpId)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (txFilter !== "all") {
        query = query.eq("type", txFilter);
      }

      const { data } = await query;
      setTransactions((data as LedgerEntry[]) || []);
    } catch (e) {
      console.error("Error loading transactions:", e);
    } finally {
      setLoadingTx(false);
    }
  };

  const loadWithdrawals = async () => {
    if (!gpId) return;
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("gp_id", gpId)
      .order("created_at", { ascending: false })
      .limit(20);
    setWithdrawals((data as WithdrawalRequest[]) || []);
  };

  const handleWithdraw = async () => {
    if (!gpId || !withdrawAmount || !withdrawPhone) return;
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }
    setWithdrawing(true);
    try {
      const { error } = await supabase.from("withdrawal_requests").insert({
        gp_id: gpId,
        amount_fcfa: amount,
        amount_display: amount,
        currency_display: currency,
        method: withdrawMethod,
        phone_or_account: withdrawPhone,
      });
      if (error) throw error;
      toast({ title: "Demande envoyée", description: "Votre retrait sera traité sous 24-48h." });
      setWithdrawOpen(false);
      setWithdrawAmount("");
      setWithdrawPhone("");
      loadWithdrawals();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setWithdrawing(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") loadTransactions();
  }, [txFilter]);

  // ─── Compact mode ───
  if (compact) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-foreground">Wallet</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              <Percent className="w-3 h-3 mr-0.5" />
              {commissionRate}%
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setWithdrawOpen(true)}>
              Retirer
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">Solde disponible</p>
          <p className="text-3xl font-bold text-foreground">
            {balance.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">{getCurrencySymbol(currency)}</span>
          </p>
          {!isFCFA && (
            <p className="text-xs text-muted-foreground mt-0.5">≈ {formatDual(balance)}</p>
          )}
        </div>

        <div className="flex gap-2">
          {pending > 0 && (
            <div className="flex-1 p-2.5 rounded-xl bg-secondary/10 border border-secondary/20">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-secondary" />
                <span className="text-xs text-muted-foreground">En attente</span>
              </div>
              <p className="font-semibold text-sm text-foreground mt-1">{pending.toLocaleString()} {getCurrencySymbol(currency)}</p>
            </div>
          )}
          {commissionDue > 0 && (
            <div className="flex-1 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs text-muted-foreground">Dette comm.</span>
              </div>
              <p className="font-semibold text-sm text-destructive mt-1">{commissionDue.toLocaleString()} FCFA</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Full mode ───
  return (
    <div className="space-y-4">
      {/* Main Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-hero-gradient rounded-2xl p-6 text-primary-foreground"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-primary-foreground/70 text-sm mb-1">Solde disponible</p>
            <p className="text-3xl font-bold text-secondary">
              {balance.toLocaleString()} <span className="text-lg font-normal">{getCurrencySymbol(currency)}</span>
            </p>
            {!isFCFA && (
              <p className="text-xs text-primary-foreground/50 mt-1">{formatDual(balance)}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-secondary" />
            </div>
            <Badge className="bg-secondary/20 text-secondary text-[10px] border-none">
              <Percent className="w-3 h-3 mr-0.5" />
              Commission {commissionRate}%
            </Badge>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="hero" className="flex-1 h-10 text-sm" onClick={() => setWithdrawOpen(true)}>
            <ArrowUpRight className="w-4 h-4" />
            Retirer
          </Button>
          <Button variant="hero-outline" className="flex-1 h-10 text-sm" onClick={() => setActiveTab("history")}>
            <CreditCard className="w-4 h-4" />
            Historique
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatMini icon={Clock} color="text-secondary" bgColor="bg-secondary/10" label="En attente" value={pending} currency={currency} />
        <StatMini icon={TrendingUp} color="text-success" bgColor="bg-success/10" label="Total gagné" value={totalEarned} currency={currency} />
        <StatMini icon={ArrowDownRight} color="text-accent" bgColor="bg-accent/10" label="Total retiré" value={wallet?.total_withdrawn || 0} currency={currency} />
        {locked > 0 ? (
          <StatMini icon={AlertTriangle} color="text-destructive" bgColor="bg-destructive/10" label="Verrouillé" value={locked} currency={currency} />
        ) : (
          <StatMini icon={Percent} color="text-primary" bgColor="bg-primary/10" label="Commission" value={commissionRate} currency="%" isPercent />
        )}
      </div>

      {/* Commission debt warning */}
      {commissionDue > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
        >
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Dette commission colis manuel</p>
            <p className="text-xs text-muted-foreground">{commissionDue.toLocaleString()} FCFA · Sera déduite du prochain paiement</p>
          </div>
        </motion.div>
      )}

      {/* Tabs: History & Withdrawals */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="overview" className="text-xs">Aperçu</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">Transactions</TabsTrigger>
          <TabsTrigger value="withdrawals" className="text-xs">Retraits</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3 space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Barème de commission</h4>
              <div className="space-y-1.5">
                {[
                  { range: "0 — 49", rate: "5%" },
                  { range: "50 — 149", rate: "6%" },
                  { range: "150 — 299", rate: "7%" },
                  { range: "300 — 599", rate: "8%" },
                  { range: "600 — 999", rate: "9%" },
                  { range: "1000+", rate: "10%" },
                ].map((tier) => (
                  <div key={tier.range} className={cn(
                    "flex items-center justify-between py-1.5 px-3 rounded-lg text-xs",
                    `${commissionRate}%` === tier.rate ? "bg-primary/10 font-bold text-primary" : "text-muted-foreground"
                  )}>
                    <span>{tier.range} livraisons</span>
                    <span>{tier.rate}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Colis manuel: commission fixe 3%</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-3 space-y-3">
          {/* Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { val: "all", label: "Tout" },
              { val: "release", label: "Konnekt" },
              { val: "manual_commission", label: "Manuel" },
              { val: "commission", label: "Commissions" },
            ].map((f) => (
              <Button
                key={f.val}
                variant={txFilter === f.val ? "default" : "outline"}
                size="sm"
                className="text-xs h-7 whitespace-nowrap"
                onClick={() => setTxFilter(f.val)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {loadingTx ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune transaction</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} gpCurrency={currency} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-3 space-y-3">
          {withdrawals.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <ArrowUpRight className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune demande de retrait</p>
            </div>
          ) : (
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <Card key={w.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      w.status === "completed" ? "bg-success/10" : w.status === "rejected" ? "bg-destructive/10" : "bg-secondary/10"
                    )}>
                      {w.status === "completed" ? <CheckCircle className="w-4 h-4 text-success" /> :
                       w.status === "rejected" ? <XCircle className="w-4 h-4 text-destructive" /> :
                       <Clock className="w-4 h-4 text-secondary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{w.amount_display.toLocaleString()} {getCurrencySymbol(w.currency_display)}</p>
                      <p className="text-xs text-muted-foreground">{methodLabel(w.method)} · {new Date(w.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <WithdrawalStatusBadge status={w.status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Demande de retrait</DialogTitle>
            <DialogDescription>
              Solde disponible: {balance.toLocaleString()} {getCurrencySymbol(currency)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Montant ({getCurrencySymbol(currency)})</Label>
              <Input
                type="number"
                placeholder="Ex: 50000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="mt-1"
              />
              {balance > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs mt-1 h-6 text-primary"
                  onClick={() => setWithdrawAmount(String(balance))}
                >
                  Retirer tout ({balance.toLocaleString()})
                </Button>
              )}
            </div>
            <div>
              <Label className="text-xs">Méthode</Label>
              <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wave">
                    <span className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" /> Wave
                    </span>
                  </SelectItem>
                  <SelectItem value="orange_money">
                    <span className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" /> Orange Money
                    </span>
                  </SelectItem>
                  <SelectItem value="bank_transfer">
                    <span className="flex items-center gap-2">
                      <Building className="w-4 h-4" /> Virement bancaire
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">
                {withdrawMethod === "bank_transfer" ? "IBAN / RIB" : "Numéro de téléphone"}
              </Label>
              <Input
                placeholder={withdrawMethod === "bank_transfer" ? "SNXXXXXXXX..." : "+221 7X XXX XX XX"}
                value={withdrawPhone}
                onChange={(e) => setWithdrawPhone(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Annuler</Button>
            <Button onClick={handleWithdraw} disabled={withdrawing || !withdrawAmount || !withdrawPhone}>
              {withdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ArrowUpRight className="w-4 h-4 mr-1" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatMini({ icon: Icon, color, bgColor, label, value, currency, isPercent }: {
  icon: any; color: string; bgColor: string; label: string; value: number; currency: string; isPercent?: boolean;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 shadow-card">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-1.5", bgColor)}>
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <p className="text-lg font-bold text-foreground">
        {isPercent ? `${value}%` : value.toLocaleString()}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}{!isPercent && ` (${getCurrencySymbol(currency)})`}</p>
    </div>
  );
}

function TransactionRow({ tx, gpCurrency }: { tx: LedgerEntry; gpCurrency: string }) {
  const isCredit = ["release", "order_payment", "bonus"].includes(tx.type);
  const typeLabels: Record<string, string> = {
    payment: "Paiement client",
    commission: "Commission Konnekt",
    release: "Fonds libérés",
    manual_commission: "Comm. colis manuel",
    refund: "Remboursement",
    insurance_hold: "Assurance retenue",
    earning: "Gain",
    bonus: "Bonus",
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isCredit ? "bg-success/10" : "bg-destructive/10"
      )}>
        {isCredit ?
          <ArrowDownRight className="w-4 h-4 text-success rotate-180" /> :
          <ArrowUpRight className="w-4 h-4 text-destructive rotate-180" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{typeLabels[tx.type] || tx.type}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {tx.description || new Date(tx.created_at).toLocaleDateString('fr-FR')}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn("text-sm font-bold", isCredit ? "text-success" : "text-destructive")}>
          {isCredit ? "+" : "-"}{tx.amount_display.toLocaleString()} {getCurrencySymbol(tx.currency_display)}
        </p>
        {tx.currency_display !== "XOF" && tx.currency_display !== "FCFA" && (
          <p className="text-[9px] text-muted-foreground">{tx.amount_fcfa.toLocaleString()} FCFA</p>
        )}
      </div>
    </div>
  );
}

function WithdrawalStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "border-secondary text-secondary" },
    processing: { label: "En cours", cls: "border-blue-400 text-blue-600" },
    completed: { label: "Effectué", cls: "border-success text-success" },
    rejected: { label: "Refusé", cls: "border-destructive text-destructive" },
  };
  const c = config[status] || config.pending;
  return <Badge variant="outline" className={cn("text-[10px]", c.cls)}>{c.label}</Badge>;
}

function methodLabel(method: string): string {
  return { wave: "Wave", orange_money: "Orange Money", bank_transfer: "Virement" }[method] || method;
}
