import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Package, Eye, MoreHorizontal, CheckCircle, Truck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ORDER_STATUS, 
  ORDER_STATUS_LABELS, 
  type OrderStatus,
  isValidOrderStatus,
  assertValidOrderStatus,
  isFrenchLabel
} from "@/lib/enumMappings";

interface Order {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  weight: number;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
  pickup_date: string | null;
  delivery_date: string | null;
}

interface GPOrdersTableProps {
  orders: Order[];
  compact?: boolean;
  onRefresh?: () => void;
}

const statusConfig: Record<OrderStatus, { label: string; variant: "success" | "pending" | "secondary" | "destructive" | "available"; icon: any }> = {
  pending: { label: ORDER_STATUS_LABELS.pending, variant: "pending", icon: Package },
  accepted: { label: ORDER_STATUS_LABELS.accepted, variant: "available", icon: CheckCircle },
  collected: { label: ORDER_STATUS_LABELS.collected, variant: "secondary", icon: Package },
  in_transit: { label: ORDER_STATUS_LABELS.in_transit, variant: "secondary", icon: Truck },
  delivered: { label: ORDER_STATUS_LABELS.delivered, variant: "success", icon: CheckCircle },
  cancelled: { label: ORDER_STATUS_LABELS.cancelled, variant: "destructive", icon: XCircle },
  disputed: { label: ORDER_STATUS_LABELS.disputed, variant: "destructive", icon: XCircle },
};

export function GPOrdersTable({ orders, compact, onRefresh }: GPOrdersTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    // CRITICAL: Validate enum before sending to database
    try {
      assertValidOrderStatus(newStatus);
    } catch (error: any) {
      console.error("ENUM VALIDATION ERROR:", error.message);
      toast({
        title: "Erreur de validation",
        description: `Statut invalide: ${newStatus}. Valeurs autorisées: ${Object.keys(ORDER_STATUS).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(orderId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          ...(newStatus === "delivered" ? { actual_delivery_date: new Date().toISOString() } : {}),
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      const { error: historyError } = await supabase.from("order_status_history").insert({
        order_id: orderId,
        status: newStatus,
        changed_by: user.id,
        changed_by_type: "gp",
      });

      if (historyError) {
        console.error("History insert error:", historyError);
      }

      toast({
        title: "Statut mis à jour",
        description: `Commande marquée comme "${ORDER_STATUS_LABELS[newStatus]}"`,
      });

      onRefresh?.();
    } catch (error: any) {
      const raw = error?.message || "Erreur inconnue";
      const lower = String(raw).toLowerCase();
      const friendly = (lower.includes("row level security") || lower.includes("permission denied"))
        ? "Accès refusé : cette commande n’est pas assignée à votre compte transporteur."
        : raw;

      toast({
        title: "Erreur",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Aucune commande trouvée</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Commande</TableHead>
            <TableHead>Trajet</TableHead>
            {!compact && <TableHead>Poids</TableHead>}
            <TableHead>Montant</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
        {orders.map((order) => {
            const validStatus = isValidOrderStatus(order.status) ? order.status : "pending";
            const status = statusConfig[validStatus];
            const StatusIcon = status.icon;

            return (
              <TableRow key={order.id}>
                <TableCell>
                  <span className="font-mono font-medium">{order.order_number}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-success flex-shrink-0" />
                    <span className="font-medium">{order.origin_city}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{order.destination_city}</span>
                  </div>
                </TableCell>
                {!compact && (
                  <TableCell>
                    <span className="font-medium">{order.weight} kg</span>
                  </TableCell>
                )}
                <TableCell>
                  <span className="font-semibold">{order.total_price.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground ml-1">{order.currency}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant} className="gap-1">
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" disabled={loading === order.id}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/gp/order/${order.id}`)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Voir détails
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {order.status === "pending" && (
                        <>
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, "accepted")}>
                            <CheckCircle className="w-4 h-4 mr-2 text-success" />
                            Accepter
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(order.id, "cancelled")}
                            className="text-destructive"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Refuser
                          </DropdownMenuItem>
                        </>
                      )}
                      {order.status === "accepted" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, "collected")}>
                          <Package className="w-4 h-4 mr-2" />
                          Marquer collecté
                        </DropdownMenuItem>
                      )}
                      {order.status === "collected" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, "in_transit")}>
                          <Truck className="w-4 h-4 mr-2" />
                          Marquer en transit
                        </DropdownMenuItem>
                      )}
                      {order.status === "in_transit" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, "delivered")}>
                          <CheckCircle className="w-4 h-4 mr-2 text-success" />
                          Marquer comme livré
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
