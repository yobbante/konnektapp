/**
 * ClientWallet — Client financial hub with virtual card, balance, withdrawal & transactions
 * Now powered by wallet-ledger and wallet-withdraw edge functions
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Wallet, CreditCard, ArrowDownRight, ArrowUpRight,
  Send, Download, Eye, EyeOff, Copy, CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { Badge } from "@/components/ui/badge";
import { getKonnektId } from "@/lib/konnektId";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInputWithCode } from "@/components/ui/PhoneInputWithCode";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

interface LedgerEntry {
  id: string;
  type: string;
  amount_fcfa: number;
  description: string | null;
  status: string;
  created_at: string;
}

function formatAmount(amount: number, currency = "FCFA") {
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}

function ledgerTypeToDisplay(type: string): { label: string; isCredit: boolean } {
  switch (type) {
    case "escrow_lock": return { label: "Escrow verrouillé", isCredit: false };
    case "adjustment_minus": return { label: "Crédit ajustement", isCredit: true };
    case "adjustment_plus": return { label: "Supplément poids", isCredit: false };
    case "refund": return { label: "Remboursement", isCredit: true };
    case "withdrawal": return { label: "Retrait", isCredit: false };
    case "commission": return { label: "Commission", isCredit: false };
    case "release": return { label: "Paiement libéré", isCredit: false };
    default: return { label: type, isCredit: false };
  }
}

export default function ClientWallet() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("wave");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const [availableBalance, setAvailableBalance] = useState(0);
  const [escrowBalance, setEscrowBalance] = useState(0);
  const [creditBonus, setCreditBonus] = useState(0);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [shortId, setShortId] = useState("");

  const loadWalletData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      setShortId(getKonnektId(session.user.id));

      const { data, error } = await supabase.functions.invoke("wallet-ledger", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: null,
      });

      // Fallback: use query params via POST workaround
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-ledger?type=client&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (res.ok) {
        const result = await res.json();
        if (result.wallet) {
          setAvailableBalance(result.wallet.available_balance || 0);
          setEscrowBalance(result.wallet.escrow_balance || 0);
          setCreditBonus(result.wallet.credit_bonus || 0);
        }
        setTransactions(result.transactions || []);
      }
    } catch (error) {
      console.error("Error loading wallet:", error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadWalletData(); }, [loadWalletData]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(shortId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) return;

    setWithdrawing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-withdraw`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            method: withdrawMethod,
            wallet_type: "client",
            phone_number: withdrawPhone,
          }),
        }
      );

      const result = await res.json();

      if (res.ok && result.success) {
        toast({ title: "Retrait effectué", description: `${formatAmount(amount)} retirés avec succès.` });
        setShowWithdrawDialog(false);
        setWithdrawAmount("");
        loadWalletData();
      } else {
        toast({ title: "Erreur", description: result.error || "Retrait impossible", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erreur", description: "Erreur réseau", variant: "destructive" });
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MiniLoader size="lg" />
      </div>
    );
  }

  const totalBalance = availableBalance + creditBonus;

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader />

      <main className="px-4 pb-24" style={{ paddingTop: "calc(70px + env(safe-area-inset-top, 0px))" }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto space-y-4"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Mon Portefeuille</h1>
          </div>

          {/* Virtual Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-accent to-primary p-6 text-primary-foreground shadow-xl"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-6 h-6" />
                  <span className="text-sm font-medium opacity-90">Konnekt Pay</span>
                </div>
                <button onClick={() => setBalanceVisible(!balanceVisible)} className="opacity-70 hover:opacity-100 transition-opacity">
                  {balanceVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>

              <div className="mb-6">
                <p className="text-xs opacity-70 mb-1">Solde total</p>
                <p className="text-3xl font-bold tracking-tight">
                  {balanceVisible ? formatAmount(totalBalance) : "••••••"}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] opacity-60 uppercase tracking-wider">ID Compte</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono">{shortId}</p>
                    <button onClick={handleCopyId} className="opacity-70 hover:opacity-100">
                      {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] opacity-60 uppercase tracking-wider">Statut</p>
                  <p className="text-sm font-medium">Actif</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Balance breakdown */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card rounded-xl border border-border p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Disponible</p>
              <p className="text-sm font-bold text-foreground">{formatAmount(availableBalance)}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">En escrow</p>
              <p className="text-sm font-bold text-foreground">{formatAmount(escrowBalance)}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Bonus</p>
              <p className="text-sm font-bold text-emerald-500">{formatAmount(creditBonus)}</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-14 flex flex-col items-center gap-1 rounded-xl"
              onClick={() => setShowWithdrawDialog(true)}
              disabled={availableBalance <= 0}
            >
              <Send className="w-5 h-5 text-primary" />
              <span className="text-xs">Retirer</span>
            </Button>
            <Button
              variant="outline"
              className="h-14 flex flex-col items-center gap-1 rounded-xl"
              onClick={() => navigate("/historique")}
            >
              <Download className="w-5 h-5 text-primary" />
              <span className="text-xs">Historique</span>
            </Button>
          </div>

          {/* Info banner */}
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Vos fonds sont protégés</p>
                <p className="text-xs text-muted-foreground mt-1">
                  L'escrow sécurise vos paiements. Les fonds ne sont libérés au transporteur qu'après livraison confirmée.
                </p>
              </div>
            </div>
          </div>

          {/* Transactions from ledger */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm">Transactions récentes</h3>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center">
                <Wallet className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucune transaction</p>
                <p className="text-xs text-muted-foreground mt-1">Vos transactions apparaîtront ici</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((tx) => {
                  const display = ledgerTypeToDisplay(tx.type);
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          display.isCredit ? "bg-emerald-500/10" : "bg-destructive/10"
                        }`}>
                          {display.isCredit ? (
                            <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.description || display.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${display.isCredit ? "text-emerald-500" : "text-destructive"}`}>
                          {display.isCredit ? "+" : "-"}{formatAmount(tx.amount_fcfa)}
                        </p>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          {tx.status === "completed" ? "Terminé" : "En attente"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Retirer des fonds</DialogTitle>
            <DialogDescription>
              Choisissez le mode de retrait et le montant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Méthode</Label>
              <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wave">Wave</SelectItem>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="virement">Virement bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Numéro de téléphone</Label>
              <PhoneInputWithCode
                value={withdrawPhone}
                onChange={setWithdrawPhone}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Montant (FCFA)</Label>
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Ex: 5000"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Solde disponible : {formatAmount(availableBalance)}
              </p>
            </div>
            <Button
              className="w-full"
              onClick={handleWithdraw}
              disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || withdrawing}
            >
              {withdrawing ? <MiniLoader size="sm" /> : <Send className="w-4 h-4 mr-2" />}
              Confirmer le retrait
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  );
}
