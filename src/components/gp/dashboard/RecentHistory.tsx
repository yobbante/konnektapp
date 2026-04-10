import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowRight, Clock, CheckCircle, Truck, XCircle, Eye, Check, X, ChevronRight, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ORDER_STATUS, assertValidOrderStatus } from "@/lib/enumMappings";

interface Order {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  status: string;
  total_price: number;
  created_at: string;
  weight?: number;
  client_id?: string;
}

interface RecentHistoryProps {
  orders: Order[];
  onViewAll: () => void;
  onRefresh?: () => void;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; variant: string }> = {
  pending: { label: "En attente", icon: Clock, variant: "warning" },
  accepted: { label: "Acceptée", icon: CheckCircle, variant: "info" },
  collected: { label: "Collectée", icon: Truck, variant: "secondary" },
  in_transit: { label: "En transit", icon: Truck, variant: "secondary" },
  delivered: { label: "Livrée", icon: CheckCircle, variant: "success" },
  cancelled: { label: "Annulée", icon: XCircle, variant: "destructive" },
};

export function RecentHistory({ orders, onViewAll, onRefresh }: RecentHistoryProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionType, setActionType] = useState<"accept" | "refuse" | null>(null);
  const [loading, setLoading] = useState(false);

  const recentOrders = orders.slice(0, 5);

  const handleAccept = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    
    console.log("=== RecentHistory handleAccept ===");
    console.log("Order:", selectedOrder.order_number);
    console.log("Current status:", selectedOrder.status);
    console.log("Target status constant:", ORDER_STATUS.accepted);
    
    try {
      // CRITICAL: Validate enum value before DB operation
      const validStatus = assertValidOrderStatus(ORDER_STATUS.accepted);
      console.log("Validated status:", validStatus);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("orders")
        .update({ status: validStatus })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      // Add history
      await supabase.from("order_status_history").insert({
        order_id: selectedOrder.id,
        status: validStatus,
        changed_by: user.id,
        changed_by_type: "gp",
      });

      toast({ title: "Mission acceptée", description: `Commande ${selectedOrder.order_number} acceptée` });
      onRefresh?.();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setSelectedOrder(null);
      setActionType(null);
    }
  };

  const handleRefuse = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("cancel-order", {
        body: {
          order_id: selectedOrder.id,
          actor_type: "gp",
          reason: "Refusée par le GP",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
 
      toast({
        title: "Mission refusée",
        description: data?.refunded_amount > 0
          ? `Commande ${selectedOrder.order_number} annulée et remboursée`
          : `Commande ${selectedOrder.order_number} refusée`,
      });
      onRefresh?.();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setSelectedOrder(null);
      setActionType(null);
    }
  };

  const handleViewDetails = (order: Order) => {
    navigate(`/gp/order/${order.id}`);
  };

  const openContactClient = async (order: Order) => {
    navigate(`/gp/messages?client=${order.client_id}`);
  };

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
    <>
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
            const isPending = order.status === "pending";

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className="p-3"
              >
                <div className="flex items-center gap-3 mb-2">
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
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground">{order.order_number}</p>
                      {order.weight && (
                        <p className="text-[10px] text-muted-foreground">• {order.weight} kg</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-sm text-foreground">
                      {order.total_price.toLocaleString()} <span className="text-xs text-muted-foreground">F</span>
                    </p>
                    <Badge variant={config.variant as any} className="text-[9px] px-1.5 py-0">
                      {config.label}
                    </Badge>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                  {isPending ? (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={() => { setSelectedOrder(order); setActionType("accept"); }}
                      >
                        <Check className="w-3 h-3" />
                        Accepter
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={() => { setSelectedOrder(order); setActionType("refuse"); }}
                      >
                        <X className="w-3 h-3" />
                        Refuser
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={() => handleViewDetails(order)}
                      >
                        <Eye className="w-3 h-3" />
                        Détails
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openContactClient(order)}
                      >
                        <MessageSquare className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleViewDetails(order)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Confirmation dialogs */}
      <AlertDialog open={actionType === "accept"} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accepter cette mission ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez accepter la commande {selectedOrder?.order_number} de {selectedOrder?.origin_city} à {selectedOrder?.destination_city}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept} disabled={loading}>
              {loading ? "Chargement..." : "Accepter"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={actionType === "refuse"} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refuser cette mission ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez refuser la commande {selectedOrder?.order_number}. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefuse} disabled={loading} className="bg-destructive hover:bg-destructive/90">
              {loading ? "Chargement..." : "Refuser"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
