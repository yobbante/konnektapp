import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, MapPin, Calendar, Clock, User, Phone, 
  MessageCircle, Weight, AlertTriangle, Zap, CheckCircle,
  XCircle, Truck, ArrowRight, FileText, Check, X, QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { 
  ORDER_STATUS_LABELS, 
  type OrderStatus,
  isValidOrderStatus 
} from "@/lib/enumMappings";

interface OrderDetails {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  origin_country: string;
  destination_country: string;
  weight: number;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
  pickup_date: string | null;
  client_id: string;
  description: string | null;
}

interface ClientProfile {
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

interface GPMissionDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  onAccept?: () => void;
  onRefuse?: () => void;
  onContact?: (clientId: string) => void;
  showActions?: boolean;
}

/**
 * GPMissionDetailsSheet - Interactive mission details with quick actions
 * 
 * Features:
 * - Full order details
 * - Quick accept/refuse actions
 * - Contact client
 * - QR code access
 */
export function GPMissionDetailsSheet({ 
  open, 
  onClose, 
  orderId,
  onAccept,
  onRefuse,
  onContact,
  showActions = true
}: GPMissionDetailsSheetProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [actionLoading, setActionLoading] = useState<"accept" | "refuse" | null>(null);

  useEffect(() => {
    if (open && orderId) {
      loadOrderDetails();
    }
  }, [open, orderId]);

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      if (orderData?.client_id) {
        const { data: clientData } = await supabase
          .from("profiles")
          .select("full_name, phone, email")
          .eq("user_id", orderData.client_id)
          .single();

        if (clientData) {
          setClient(clientData);
        }
      }
    } catch (error) {
      console.error("Error loading order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!order) return;
    setActionLoading("accept");
    
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "accepted" })
        .eq("id", order.id);

      if (error) throw error;

      // Add status history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          status: "accepted",
          changed_by: user.id,
          changed_by_type: "gp",
          notes: "Commande acceptée par le transporteur",
        });

        // Notify client
        await supabase.from("notifications").insert({
          user_id: order.client_id,
          type: "order_update",
          title: "✅ Commande acceptée",
          message: `Votre commande ${order.order_number} a été acceptée !`,
          related_type: "order",
          related_id: order.id,
        });
      }

      toast({
        title: "✅ Commande acceptée",
        description: "Le client a été notifié",
      });

      onAccept?.();
      onClose();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefuse = async () => {
    if (!order) return;
    setActionLoading("refuse");
    
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          status: "cancelled",
          changed_by: user.id,
          changed_by_type: "gp",
          notes: "Commande refusée par le transporteur",
        });

        await supabase.from("notifications").insert({
          user_id: order.client_id,
          type: "order_update",
          title: "❌ Commande refusée",
          message: `Votre commande ${order.order_number} a été refusée`,
          related_type: "order",
          related_id: order.id,
        });
      }

      toast({
        title: "Commande refusée",
      });

      onRefuse?.();
      onClose();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const validStatus = order && isValidOrderStatus(order.status) ? order.status : "pending";
  const isPending = validStatus === "pending";
  const isActive = ["accepted", "collected", "in_transit"].includes(validStatus);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Détails de la mission
            </span>
            {order && (
              <Badge 
                variant={isPending ? "warning" : isActive ? "default" : "secondary"}
                className={isActive ? "bg-green-500" : ""}
              >
                {ORDER_STATUS_LABELS[validStatus as OrderStatus]}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : order ? (
          <div className="space-y-4 py-4">
            {/* Order Number & Date */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Commande</p>
                    <p className="font-mono font-bold text-lg">{order.order_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Reçue le</p>
                    <p className="text-sm font-medium">
                      {format(new Date(order.created_at), "d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Route */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="font-medium">{order.origin_city}</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-5">{order.origin_country}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="font-medium">{order.destination_city}</span>
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mr-5">{order.destination_country}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            {client && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Client
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{client.full_name || "Client"}</p>
                      {client.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </p>
                      )}
                    </div>
                    {onContact && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onContact(order.client_id)}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shipment Details */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Colis
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Poids</p>
                    <p className="font-bold text-lg">{order.weight} kg</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Montant</p>
                    <p className="font-bold text-lg text-primary">
                      {order.total_price.toLocaleString()} {getCurrencySymbol(order.currency)}
                    </p>
                  </div>
                </div>
                {order.description && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{order.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* QR Code Access for Active Orders */}
            {isActive && (
              <Card className="bg-accent/5 border-accent/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <QrCode className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Scanner QR</p>
                        <p className="text-xs text-muted-foreground">
                          Confirmez dépôt ou livraison
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Scanner
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons for Pending */}
            {showActions && isPending && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 pt-4 border-t"
              >
                <Button
                  variant="outline"
                  className="flex-1 h-12 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={handleRefuse}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "refuse" ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <X className="w-5 h-5 mr-2" />
                      Refuser
                    </>
                  )}
                </Button>
                <Button
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                  onClick={handleAccept}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "accept" ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Accepter
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Mission non trouvée
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
