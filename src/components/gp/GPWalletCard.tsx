import { motion } from "framer-motion";
import { Wallet, ArrowUpRight, ArrowDownRight, Clock, TrendingUp, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GPWalletCardProps {
  wallet: {
    balance: number;
    pending_balance: number;
    total_earned: number;
    total_withdrawn?: number;
    currency: string;
  } | null;
  compact?: boolean;
}

export function GPWalletCard({ wallet, compact }: GPWalletCardProps) {
  const balance = wallet?.balance || 0;
  const pending = wallet?.pending_balance || 0;
  const totalEarned = wallet?.total_earned || 0;
  const currency = wallet?.currency || "FCFA";

  if (compact) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-foreground">Wallet</h3>
          <Button variant="ghost" size="sm">
            Retirer
          </Button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">Solde disponible</p>
          <p className="text-3xl font-bold text-foreground">
            {balance.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">{currency}</span>
          </p>
        </div>

        {pending > 0 && (
          <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-secondary" />
              <span className="text-sm text-muted-foreground">En attente:</span>
              <span className="font-semibold text-foreground">{pending.toLocaleString()} {currency}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-hero-gradient rounded-2xl p-8 text-primary-foreground"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-primary-foreground/70 mb-1">Solde disponible</p>
            <p className="text-4xl font-bold text-secondary">
              {balance.toLocaleString()} <span className="text-xl font-normal">{currency}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-secondary" />
          </div>
        </div>

        <div className="flex gap-4">
          <Button variant="hero" className="flex-1">
            <ArrowUpRight className="w-4 h-4" />
            Retirer
          </Button>
          <Button variant="hero-outline" className="flex-1">
            <CreditCard className="w-4 h-4" />
            Historique
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{pending.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">En attente ({currency})</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalEarned.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total gagné ({currency})</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{(wallet?.total_withdrawn || 0).toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total retiré ({currency})</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
        <h3 className="font-semibold text-lg text-foreground mb-4">Dernières transactions</h3>
        <div className="text-center py-8 text-muted-foreground">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Aucune transaction pour le moment</p>
          <p className="text-sm mt-1">Les transactions apparaîtront ici</p>
        </div>
      </div>
    </div>
  );
}
