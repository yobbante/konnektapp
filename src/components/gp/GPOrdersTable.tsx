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

const statusConfig: Record<string, { label: string; variant: "success" | "pending" | "secondary" | "destructive" | "available"; icon: any }> = {
  pending: { label: "En attente", variant: "pending", icon: Package },
  accepted: { label: "Acceptée", variant: "available", icon: CheckCircle },
  in_transit: { label: "En transit", variant: "secondary", icon: Truck },
  delivered: { label: "Livrée", variant: "success", icon: CheckCircle },
  cancelled: { label: "Annulée", variant: "destructive", icon: XCircle },
  disputed: { label: "Litige", variant: "destructive", icon: XCircle },
};

export function GPOrdersTable({ orders, compact, onRefresh }: GPOrdersTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleStatusChange = async (orderId: string, newStatus: "pending" | "accepted" | "in_transit" | "delivered" | "cancelled" | "disputed") => {
    setLoading(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Statut mis à jour",
      } as const);

      onRefresh?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
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
            const status = statusConfig[order.status] || statusConfig.pending;
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
