import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, MapPin, Calendar, User, Eye, Clock, Truck, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  ORDER_STATUS_LABELS, 
  ORDER_STATUS_COLORS,
  isValidOrderStatus,
  type OrderStatus 
} from "@/lib/enumMappings";

interface Order {
  id: string;
  order_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  status: string;
  logistics_status?: string;
  total_price: number;
  commission_amount: number;
  weight: number;
  created_at: string;
  pickup_date?: string;
  delivery_date?: string;
  tracking_code?: string;
  description?: string;
  gp_profile?: {
    business_name: string;
    phone?: string;
  };
}

interface AdminOrdersListProps {
  orders: Order[];
  filter: "all" | "pending" | "in_progress" | "delivered" | "cancelled";
}

export function AdminOrdersList({ orders, filter }: AdminOrdersListProps) {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = filter === "all"
    ? orders
    : filter === "in_progress"
      ? orders.filter(order => ["accepted", "collected", "in_transit"].includes(order.status))
      : orders.filter(order => order.status === filter);

  const getStatusBadge = (status: string) => {
    const validStatus = isValidOrderStatus(status) ? status : "pending";
    const label = ORDER_STATUS_LABELS[validStatus];
    const color = ORDER_STATUS_COLORS[validStatus];
    
    const variantMap: Record<string, "success" | "destructive" | "default" | "secondary"> = {
      success: "success",
      destructive: "destructive",
      warning: "secondary",
      default: "default",
      secondary: "secondary",
    };
    
    return (
      <Badge variant={variantMap[color] || "secondary"}>
        {label}
      </Badge>
    );
  };

  // Stats for in-progress orders
  const inProgressOrders = orders.filter(o => ["pending", "accepted", "collected", "in_transit"].includes(o.status));
  const totalInProgress = inProgressOrders.length;
  const totalValueInProgress = inProgressOrders.reduce((acc, o) => acc + o.total_price, 0);

  return (
    <div className="space-y-4">
      {/* In Progress Summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Commandes en cours</p>
                <p className="text-sm text-muted-foreground">{totalInProgress} commande{totalInProgress > 1 ? 's' : ''} actives</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary">{totalValueInProgress.toLocaleString()} FCFA</p>
              <p className="text-xs text-muted-foreground">Valeur totale</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
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
              <div className="flex items-center gap-2">
                {getStatusBadge(order.status)}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate(`/admin/order/${order.id}`)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
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

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Commande {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Statut</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Route */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{selectedOrder.origin_city}, {selectedOrder.origin_country}</p>
                    <p className="text-xs text-muted-foreground">Départ</p>
                  </div>
                </div>
                <div className="my-2 ml-2 border-l-2 border-dashed border-border h-4" />
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-success" />
                  <div>
                    <p className="font-medium">{selectedOrder.destination_city}, {selectedOrder.destination_country}</p>
                    <p className="text-xs text-muted-foreground">Destination</p>
                  </div>
                </div>
              </div>

              {/* Transporter Info */}
              {selectedOrder.gp_profile && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-secondary" />
                    <div className="flex-1">
                      <p className="font-medium">{selectedOrder.gp_profile.business_name}</p>
                      <p className="text-xs text-muted-foreground">Transporteur</p>
                    </div>
                    {selectedOrder.gp_profile.phone && (
                      <a href={`tel:${selectedOrder.gp_profile.phone}`}>
                        <Button variant="outline" size="sm">
                          <Phone className="w-3 h-3 mr-1" />
                          Appeler
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-lg font-bold text-primary">{selectedOrder.total_price.toLocaleString()} FCFA</p>
                  <p className="text-xs text-muted-foreground">Prix total</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-lg font-bold text-success">{selectedOrder.commission_amount.toLocaleString()} FCFA</p>
                  <p className="text-xs text-muted-foreground">Commission plateforme</p>
                </div>
              </div>

              {/* Tracking */}
              {selectedOrder.tracking_code && (
                <div className="p-3 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Code de suivi</p>
                  <p className="font-mono font-bold">{selectedOrder.tracking_code}</p>
                </div>
              )}

              {/* Description */}
              {selectedOrder.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedOrder.description}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Créée le</p>
                  <p className="font-medium">{format(new Date(selectedOrder.created_at), "d MMMM yyyy", { locale: fr })}</p>
                </div>
                {selectedOrder.pickup_date && (
                  <div>
                    <p className="text-muted-foreground">Enlèvement</p>
                    <p className="font-medium">{format(new Date(selectedOrder.pickup_date), "d MMMM yyyy", { locale: fr })}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
