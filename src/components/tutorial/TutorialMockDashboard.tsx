import { motion } from "framer-motion";
import { Wallet, ArrowUpRight, ArrowDownLeft, Lock, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TutorialMockState } from "@/lib/tutorial/types";

interface Props {
  mockState: TutorialMockState;
  role: "client" | "gp";
}

export function TutorialMockDashboard({ mockState, role }: Props) {
  const wallet = role === "client" ? mockState.clientWallet : mockState.gpWallet;

  return (
    <div className="space-y-3">
      {/* Wallet Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              Wallet {role === "client" ? "Client" : "GP"} (Sandbox)
            </span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-auto border-amber-500/30 text-amber-600">
              MOCK
            </Badge>
          </div>
          <p className="text-xl font-bold text-foreground">
            {wallet.balance.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{wallet.currency}</span>
          </p>
          {wallet.escrow_balance > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <Lock className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600">
                Escrow : {wallet.escrow_balance.toLocaleString()} FCFA
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Escrow Status */}
      {mockState.escrow.amount > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Escrow</span>
              <Badge variant={
                mockState.escrow.status === "locked" ? "default" :
                mockState.escrow.status === "released" ? "secondary" : "outline"
              } className="text-[10px]">
                {mockState.escrow.status === "locked" ? "Verrouille" :
                 mockState.escrow.status === "released" ? "Libere" :
                 mockState.escrow.status === "refunded" ? "Rembourse" : "En attente"}
              </Badge>
            </div>
            <p className="text-lg font-bold mt-1">{mockState.escrow.amount.toLocaleString()} FCFA</p>
          </CardContent>
        </Card>
      )}

      {/* Commission & Debt (GP only) */}
      {role === "gp" && (mockState.commission.amount > 0 || mockState.debt.balance > 0) && (
        <div className="grid grid-cols-2 gap-2">
          {mockState.commission.amount > 0 && (
            <Card>
              <CardContent className="p-2.5">
                <p className="text-[10px] text-muted-foreground">Commission</p>
                <p className="text-sm font-bold text-amber-600">
                  {mockState.commission.amount.toLocaleString()} FCFA
                </p>
                <p className="text-[10px] text-muted-foreground">{mockState.commission.rate}%</p>
              </CardContent>
            </Card>
          )}
          {mockState.debt.balance > 0 && (
            <Card className="border-red-500/20">
              <CardContent className="p-2.5">
                <p className="text-[10px] text-muted-foreground">Dette</p>
                <p className="text-sm font-bold text-red-500">
                  {mockState.debt.balance.toLocaleString()} FCFA
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Ledger */}
      {mockState.ledger.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Ledger (Sandbox)</span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {mockState.ledger.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  {entry.type === "payout" || entry.type === "refund" ? (
                    <ArrowUpRight className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <ArrowDownLeft className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  )}
                  <span className="text-[11px] text-muted-foreground truncate flex-1">
                    {entry.description}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Status */}
      {mockState.orderStatus !== "pending" && (
        <div className="flex items-center justify-center">
          <Badge variant="outline" className="text-xs">
            Statut commande : {mockState.orderStatus}
          </Badge>
        </div>
      )}
    </div>
  );
}
