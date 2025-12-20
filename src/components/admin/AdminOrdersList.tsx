import { motion } from "framer-motion";
import { Package, MapPin, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { orderStatusConfig, OrderStatus } from "@/lib/transportTypes";

interface Order {
  id: string;
  order_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  status: string;
  total_price: number;
  commission_amount: number;
  weight: number;
  created_at: string;
  gp_profile?: {
    business_name: string;
  };
}

interface AdminOrdersListProps {
  orders: Order[];
  filter: "all" | "pending" | "in_transit" | "delivered" | "cancelled";
}

export function AdminOrdersList({ orders, filter }: AdminOrdersListProps) {
  const filteredOrders = filter === "all" 
    ? orders 
    : orders.filter(order => order.status === filter);

  const getStatusBadge = (status: string) => {
    const config = orderStatusConfig[status as OrderStatus];
    const variant = 
      status === "delivered" ? "success" :
      status === "cancelled" || status === "disputed" ? "destructive" :
      status === "in_transit" ? "default" :
      "secondary";
    
    return (
      <Badge variant={variant}>
        {config?.labelFr || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-3">
      {filteredOrders.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Aucune commande trouvée
        </p>
      )}

      {filteredOrders.map((order, index) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="mobile-card"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-primary" />
                <p className="font-semibold">{order.order_number}</p>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{order.origin_city}</span>
                <span>→</span>
                <span>{order.destination_city}</span>
              </div>
            </div>
            {getStatusBadge(order.status)}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-sm font-bold text-primary">
                {order.total_price.toLocaleString()} FCFA
              </p>
              <p className="text-xs text-muted-foreground">Prix total</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-sm font-bold text-success">
                {order.commission_amount.toLocaleString()} FCFA
              </p>
              <p className="text-xs text-muted-foreground">Commission</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-sm font-bold">{order.weight} kg</p>
              <p className="text-xs text-muted-foreground">Poids</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border">
            {order.gp_profile?.business_name && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{order.gp_profile.business_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(order.created_at), "d MMM yyyy", { locale: fr })}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
