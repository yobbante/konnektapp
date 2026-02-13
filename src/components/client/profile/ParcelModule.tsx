/**
 * ParcelModule — Active parcels & adjustment alerts
 */
import { Package, Clock, Truck, CheckCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface OrderStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
}

interface PendingAdjustment {
  orderId: string;
  orderNumber: string;
  amount: number;
  reason: string;
}

interface ParcelModuleProps {
  stats: OrderStats;
  pendingAdjustments?: PendingAdjustment[];
  onViewHistory?: () => void;
}

export function ParcelModule({ stats, pendingAdjustments = [], onViewHistory }: ParcelModuleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-3"
    >
      {/* Pending adjustment banner */}
      {pendingAdjustments.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Ajustement en attente
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Un ajustement de {pendingAdjustments[0].amount.toLocaleString("fr-FR")} FCFA est en attente pour continuer votre envoi.
              </p>
              <Button variant="outline" size="sm" className="mt-2 h-8 text-xs">
                Voir les détails
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Package, value: stats.total, label: "Total", color: "text-primary" },
          { icon: Clock, value: stats.pending, label: "Attente", color: "text-amber-500" },
          { icon: Truck, value: stats.inTransit, label: "Transit", color: "text-blue-500" },
          { icon: CheckCircle, value: stats.delivered, label: "Livrés", color: "text-emerald-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-3 text-center">
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick link */}
      <Link to="/historique" className="block">
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Historique des envois</p>
              <p className="text-xs text-muted-foreground">{stats.total} envois au total</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </Link>
    </motion.div>
  );
}
