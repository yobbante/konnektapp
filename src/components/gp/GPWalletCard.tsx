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
  withdrawalLimit?: number;
  kycLevel?: number;
  onActivateKYC?: () => void;
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

export function GPWalletCard({ wallet, gpId, compact, withdrawalLimit = 0, kycLevel = 0, onActivateKYC }: GPWalletCardProps) {
  const { toast } = useToast();
  const balance = wallet?.balance || 0;
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
  const [escrowPending, setEscrowPending] = useState(0);
  const [escrowDetails, setEscrowDetails] = useState<Array<{
    id: string; order_id: string; net_to_gp: number; amount: number;
    commission_amount: number; created_at: string; order_number?: string;
  }>>([]);

  // Load real pending from escrow_transactions with order details
  useEffect(() => {
    if (!gpId) return;
    const loadEscrowPending = async () => {
      const { data } = await supabase
        .from("escrow_transactions")
        .select("id, order_id, net_to_gp, amount, commission_amount, created_at")
        .eq("gp_id", gpId)
        .eq("status", "held")
        .order("created_at", { ascending: false });
      
      const entries = data || [];
      const total = entries.reduce((sum, e) => sum + (e.net_to_gp || 0), 0);
      setEscrowPending(total);

      // Load order numbers
      if (entries.length > 0) {
        const orderIds = entries.map(e => e.order_id);
        const { data: orders } = await supabase
          .from("orders")
          .select("id, order_number")
          .in("id", orderIds);
        
        const orderMap = new Map((orders || []).map(o => [o.id, o.order_number]));
        setEscrowDetails(entries.map(e => ({
          ...e,
          order_number: orderMap.get(e.order_id) || e.order_id.slice(0, 8),
        })));
      } else {
        setEscrowDetails([]);
      }
    };
    loadEscrowPending();
  }, [gpId]);

  const pending = escrowPending || wallet?.pending_balance || 0;

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
    // KYC withdrawal limit check
    if (withdrawalLimit > 0 && amount > withdrawalLimit && kycLevel < 1) {
      toast({
        title: "Limite de retrait",
        description: `Activez votre badge professionnel pour retirer au-delà de ${withdrawalLimit.toLocaleString()} FCFA.`,
        variant: "destructive",
      });
      if (onActivateKYC) onActivateKYC();
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
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary)/0.85)] to-[hsl(220,60%,15%)] p-6 text-white shadow-xl"
      >
        {/* Card chip & logo */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-300 to-amber-500 shadow-inner" />
            <div className="w-6 h-7 rounded-sm bg-white/10 backdrop-blur-sm" />
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/50">Konnekt Pay</p>
            <p className="text-xs font-semibold text-white/70">Carte GP</p>
          </div>
        </div>

        {/* Balance */}
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-wider text-white/50 mb-1">Solde disponible</p>
          <p className="text-3xl font-bold tracking-tight">
            {balance.toLocaleString()} <span className="text-lg font-normal text-white/60">{getCurrencySymbol(currency)}</span>
          </p>
          {!isFCFA && (
            <p className="text-xs text-white/40 mt-0.5">{formatDual(balance)}</p>
          )}
        </div>

        {/* Card footer */}
        <div className="flex items-end justify-between">
          <div>
            <Badge className="bg-white/10 text-white/80 border-white/10 text-[10px] backdrop-blur-sm">
              <Percent className="w-3 h-3 mr-0.5" />
              Commission {commissionRate}%
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 text-xs bg-white/15 hover:bg-white/25 text-white border-none backdrop-blur-sm"
              onClick={() => setWithdrawOpen(true)}
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              Retirer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setActiveTab("history")}
            >
              <CreditCard className="w-3.5 h-3.5 mr-1" />
              Historique
            </Button>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-14 -left-14 w-48 h-48 rounded-full bg-white/[0.03] pointer-events-none" />
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
              <h4 className="text-sm font-semibold text-foreground">Résumé financier</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Solde disponible</span>
                  <span className="font-semibold text-foreground">{balance.toLocaleString()} {getCurrencySymbol(currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">En attente (escrow)</span>
                  <span className="font-semibold text-secondary">{pending.toLocaleString()} {getCurrencySymbol(currency)}</span>
                </div>

                {/* Détail des colis en escrow */}
                {escrowDetails.length > 0 && (
                  <div className="ml-2 pl-3 border-l-2 border-secondary/20 space-y-1.5">
                    {escrowDetails.map((esc) => (
                      <div key={esc.id} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Clock className="w-3 h-3 text-secondary flex-shrink-0" />
                          <span className="text-muted-foreground truncate">#{esc.order_number}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-medium text-foreground">{esc.net_to_gp.toLocaleString()} {getCurrencySymbol(currency)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total gagné</span>
                  <span className="font-semibold text-success">{totalEarned.toLocaleString()} {getCurrencySymbol(currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Commission actuelle</span>
                  <span className="font-semibold text-primary">{commissionRate}%</span>
                </div>
              </div>
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

function StatMini({ icon: Icon, color, bgColor, label, value, currency, isPercent, isFCFA: isFcfa, formatDual }: {
  icon: any; color: string; bgColor: string; label: string; value: number; currency: string; isPercent?: boolean;
  isFCFA?: boolean; formatDual?: (v: number) => string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 shadow-card">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-1.5", bgColor)}>
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <p className="text-lg font-bold text-foreground">
        {isPercent ? `${value}%` : value.toLocaleString()}
      </p>
      <p className="text-[10px] text-muted-foreground">
        {label}{!isPercent && ` (${getCurrencySymbol(currency)})`}
      </p>
      {!isPercent && !isFcfa && formatDual && value > 0 && (
        <p className="text-[9px] text-muted-foreground mt-0.5">{formatDual(value)}</p>
      )}
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
