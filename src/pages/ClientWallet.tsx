/**
 * ClientWallet — Client financial hub with virtual card, balance, withdrawal & transactions
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  date: string;
  status: string;
}

function formatAmount(amount: number, currency = "FCFA") {
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}

export default function ClientWallet() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Financial data
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingEscrow, setPendingEscrow] = useState(0);
  const [creditBonus, setCreditBonus] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userId, setUserId] = useState("");
  const [shortId, setShortId] = useState("");

  const loadWalletData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      
      setUserId(user.id);
      setShortId(`KN-${user.id.slice(0, 6).toUpperCase()}`);

      // Load escrow data
      const { data: escrowData } = await supabase
        .from("escrow_transactions")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (escrowData) {
        const held = escrowData.filter(e => e.status === "held").reduce((s, e) => s + (e.amount || 0), 0);
        const released = escrowData.filter(e => e.status === "released").reduce((s, e) => s + (e.amount || 0), 0);
        const refunded = escrowData.filter(e => e.status === "refunded").reduce((s, e) => s + (e.amount || 0), 0);
        
        setPendingEscrow(held);
        setAvailableBalance(refunded); // Refunded amounts are available
        
        // Map to transactions
        const txs: Transaction[] = escrowData.slice(0, 20).map(e => ({
          id: e.id,
          description: e.status === "held" ? "Fonds en escrow" :
            e.status === "released" ? "Paiement libéré" : "Remboursement",
          amount: e.amount,
          type: e.status === "refunded" ? "credit" as const : "debit" as const,
          date: new Date(e.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
          status: e.status,
        }));
        setTransactions(txs);
      }

      // Load loyalty points as credit bonus
      const { data: loyaltyData } = await supabase
        .from("client_loyalty")
        .select("available_points")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (loyaltyData) {
        setCreditBonus(loyaltyData.available_points * 10); // 1 point = 10 FCFA
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

  const handleWithdraw = () => {
    toast({ title: "Bientôt disponible", description: "Le retrait sera disponible dans une prochaine mise à jour." });
    setShowWithdrawDialog(false);
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
            {/* Decorative circles */}
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
              <p className="text-sm font-bold text-foreground">{formatAmount(pendingEscrow)}</p>
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

          {/* Transactions */}
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
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        tx.type === "credit" ? "bg-emerald-500/10" : "bg-destructive/10"
                      }`}>
                        {tx.type === "credit" ? (
                          <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-[11px] text-muted-foreground">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        tx.type === "credit" ? "text-emerald-500" : "text-destructive"
                      }`}>
                        {tx.type === "credit" ? "+" : "-"}{formatAmount(tx.amount)}
                      </p>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        {tx.status === "held" ? "En attente" : tx.status === "released" ? "Libéré" : "Remboursé"}
                      </Badge>
                    </div>
                  </div>
                ))}
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
              Entrez le montant à retirer vers votre compte mobile money.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
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
            <Button className="w-full" onClick={handleWithdraw} disabled={!withdrawAmount || Number(withdrawAmount) <= 0}>
              <Send className="w-4 h-4 mr-2" />
              Confirmer le retrait
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  );
}
