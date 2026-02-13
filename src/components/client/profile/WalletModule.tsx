/**
 * WalletModule — Client financial overview (escrow, credits, adjustments)
 */
import { Wallet, ChevronRight, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface WalletModuleProps {
  availableBalance: number;
  pendingEscrow: number;
  creditBonus: number;
  currency?: string;
  recentTransactions?: { description: string; amount: number; type: "credit" | "debit" }[];
  onViewTransactions?: () => void;
}

function formatAmount(amount: number, currency = "FCFA") {
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}

export function WalletModule({
  availableBalance, pendingEscrow, creditBonus, currency = "FCFA",
  recentTransactions = [], onViewTransactions
}: WalletModuleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card rounded-2xl border border-border p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-sm">Mon Portefeuille</h3>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Disponible</p>
          <p className="text-sm font-bold text-foreground">{formatAmount(availableBalance, currency)}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">En escrow</p>
          <p className="text-sm font-bold text-foreground">{formatAmount(pendingEscrow, currency)}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Crédit bonus</p>
          <p className="text-sm font-bold text-emerald-500">{formatAmount(creditBonus, currency)}</p>
        </div>
      </div>

      {/* Recent transactions */}
      {recentTransactions.length > 0 && (
        <div className="space-y-2 mb-3">
          {recentTransactions.slice(0, 3).map((tx, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                {tx.type === "credit" ? (
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
                )}
                <span className="text-xs text-foreground">{tx.description}</span>
              </div>
              <span className={`text-xs font-medium ${tx.type === "credit" ? "text-emerald-500" : "text-destructive"}`}>
                {tx.type === "credit" ? "+" : "-"}{formatAmount(Math.abs(tx.amount), currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={onViewTransactions}
      >
        Voir les transactions
        <ChevronRight className="w-4 h-4 ml-auto" />
      </Button>
    </motion.div>
  );
}
