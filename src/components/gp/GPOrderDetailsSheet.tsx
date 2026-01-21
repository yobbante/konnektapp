import { useState, useEffect } from "react";
import { 
  Package, MapPin, Calendar, Clock, User, Phone, 
  MessageCircle, Weight, AlertTriangle, Zap, CheckCircle,
  XCircle, Truck, ArrowRight, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
}

interface OrderLogistics {
  merchandise_type: string | null;
  merchandise_description: string | null;
  estimated_weight: number;
  estimated_volume: string | null;
  declared_value: number | null;
  is_fragile: boolean;
  is_urgent: boolean;
  special_conditions: string | null;
  pickup_address: string;
  delivery_address: string;
  pickup_time_slot: string | null;
  pickup_date: string;
}

interface ClientProfile {
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

interface GPOrderDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  onContact?: (clientId: string) => void;
}

const merchandiseLabels: Record<string, string> = {
  electronics: "Électronique",
  clothing: "Vêtements & Textiles",
  food: "Produits alimentaires",
  documents: "Documents",
  cosmetics: "Cosmétiques",
  household: "Articles ménagers",
  auto_parts: "Pièces auto",
  other: "Autre",
};

const timeSlotLabels: Record<string, string> = {
  morning: "Matin (8h - 12h)",
  afternoon: "Après-midi (12h - 17h)",
  evening: "Soir (17h - 20h)",
  flexible: "Flexible",
};

export function GPOrderDetailsSheet({ 
  open, 
  onClose, 
  orderId,
  onContact 
}: GPOrderDetailsSheetProps) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [logistics, setLogistics] = useState<OrderLogistics | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);

  useEffect(() => {
    if (open && orderId) {
      loadOrderDetails();
    }
  }, [open, orderId]);

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch logistics
      const { data: logisticsData } = await supabase
        .from("order_logistics")
        .select("*")
        .eq("order_id", orderId)
        .single();

      if (logisticsData) {
        setLogistics(logisticsData);
      }

      // Fetch client profile
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

  const validStatus = order && isValidOrderStatus(order.status) ? order.status : "pending";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span>Détails de la commande</span>
            {order && (
              <Badge variant={validStatus === "pending" ? "warning" : "secondary"}>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">N° Commande</p>
                <p className="font-mono font-semibold">{order.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm">
                  {format(new Date(order.created_at), "d MMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>

            {/* Route */}
            <div className="p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">{order.origin_city}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">{order.origin_country}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-medium">{order.destination_city}</span>
                    <MapPin className="w-4 h-4 text-accent" />
                  </div>
                  <p className="text-xs text-muted-foreground mr-6">{order.destination_country}</p>
                </div>
              </div>
            </div>

            {/* Client Info */}
            {client && (
              <div className="p-4 bg-card border rounded-xl space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Client
                </h3>
                <div className="space-y-2">
                  <p className="font-medium">{client.full_name || "Client"}</p>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>
                {onContact && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full gap-2"
                    onClick={() => onContact(order.client_id)}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contacter le client
                  </Button>
                )}
              </div>
            )}

            {/* Logistics Details */}
            {logistics && (
              <>
                {/* Merchandise */}
                <div className="p-4 bg-card border rounded-xl space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Marchandise
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium">
                        {merchandiseLabels[logistics.merchandise_type || ""] || logistics.merchandise_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Poids estimé</p>
                      <p className="font-medium">{logistics.estimated_weight} kg</p>
                    </div>
                    {logistics.estimated_volume && (
                      <div>
                        <p className="text-muted-foreground">Volume</p>
                        <p className="font-medium">{logistics.estimated_volume}</p>
                      </div>
                    )}
                    {logistics.declared_value && (
                      <div>
                        <p className="text-muted-foreground">Valeur déclarée</p>
                        <p className="font-medium">{logistics.declared_value.toLocaleString()} FCFA</p>
                      </div>
                    )}
                  </div>
                  {logistics.merchandise_description && (
                    <div>
                      <p className="text-muted-foreground text-xs">Description</p>
                      <p className="text-sm">{logistics.merchandise_description}</p>
                    </div>
                  )}
                </div>

                {/* Conditions */}
                <div className="p-4 bg-card border rounded-xl space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Conditions
                  </h3>
                  <div className="flex gap-2">
                    {logistics.is_fragile && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Fragile
                      </Badge>
                    )}
                    {logistics.is_urgent && (
                      <Badge variant="warning" className="gap-1">
                        <Zap className="w-3 h-3" />
                        Urgent
                      </Badge>
                    )}
                    {!logistics.is_fragile && !logistics.is_urgent && (
                      <Badge variant="secondary">Standard</Badge>
                    )}
                  </div>
                  {logistics.special_conditions && (
                    <div className="p-2 bg-muted rounded text-sm">
                      {logistics.special_conditions}
                    </div>
                  )}
                </div>

                {/* Addresses */}
                <div className="p-4 bg-card border rounded-xl space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Adresses
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-primary font-medium">📍 Chargement</p>
                      <p className="text-sm">{logistics.pickup_address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-accent font-medium">🎯 Livraison</p>
                      <p className="text-sm">{logistics.delivery_address}</p>
                    </div>
                  </div>
                </div>

                {/* Pickup Schedule */}
                <div className="p-4 bg-card border rounded-xl space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Collecte prévue
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {format(new Date(logistics.pickup_date), "d MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    {logistics.pickup_time_slot && (
                      <div>
                        <p className="text-muted-foreground">Créneau</p>
                        <p className="font-medium">
                          {timeSlotLabels[logistics.pickup_time_slot] || logistics.pickup_time_slot}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Financial */}
            <div className="p-4 bg-primary/10 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Poids total</p>
                  <p className="font-semibold">{order.weight} kg</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Montant total</p>
                  <p className="text-xl font-bold text-primary">
                    {order.total_price.toLocaleString()} {order.currency}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Commande non trouvée
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
