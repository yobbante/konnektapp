import { motion } from "framer-motion";
import { MapPin, ArrowRight, Clock, CheckCircle, Truck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Order {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  status: string;
  total_price: number;
  created_at: string;
}

interface RecentHistoryProps {
  orders: Order[];
  onViewAll: () => void;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; variant: string }> = {
  pending: { label: "En attente", icon: Clock, variant: "warning" },
  accepted: { label: "Acceptée", icon: CheckCircle, variant: "info" },
  collected: { label: "Collectée", icon: Truck, variant: "secondary" },
  in_transit: { label: "En transit", icon: Truck, variant: "secondary" },
  delivered: { label: "Livrée", icon: CheckCircle, variant: "success" },
  cancelled: { label: "Annulée", icon: XCircle, variant: "destructive" },
};

export function RecentHistory({ orders, onViewAll }: RecentHistoryProps) {
  const recentOrders = orders.slice(0, 5);

  if (recentOrders.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-2xl p-4 border border-border/50 text-center"
      >
        <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Aucune course récente</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card rounded-2xl border border-border/50 overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="font-semibold text-foreground text-sm">Historique récent</h3>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onViewAll}>
          Voir tout
        </Button>
      </div>

      <div className="divide-y divide-border/50">
        {recentOrders.map((order, index) => {
          const config = statusConfig[order.status] || statusConfig.pending;
          const StatusIcon = config.icon;

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              className="p-3 flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                order.status === 'delivered' ? 'bg-success/10' : 
                order.status === 'pending' ? 'bg-warning/10' : 'bg-primary/10'
              }`}>
                <StatusIcon className={`w-4 h-4 ${
                  order.status === 'delivered' ? 'text-success' : 
                  order.status === 'pending' ? 'text-warning' : 'text-primary'
                }`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-xs">
                  <span className="font-medium truncate">{order.origin_city}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate">{order.destination_city}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{order.order_number}</p>
              </div>

              <div className="text-right">
                <p className="font-bold text-sm text-foreground">
                  {order.total_price.toLocaleString()} <span className="text-xs text-muted-foreground">F</span>
                </p>
                <Badge variant={config.variant as any} className="text-[9px] px-1.5 py-0">
                  {config.label}
                </Badge>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
