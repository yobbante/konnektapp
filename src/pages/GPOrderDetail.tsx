import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Package, MapPin, Calendar, Clock, User, 
  Phone, MessageCircle, CheckCircle, Truck, AlertTriangle,
  FileText, Scale, Box, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  orderStatusConfig, 
  OrderStatus, 
  getOrderStatusLabel, 
  getNextOrderStatus 
} from "@/lib/transportTypes";

interface OrderDetail {
  id: string;
  order_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  weight: number;
  total_price: number;
  price_per_kg: number;
  currency: string;
  status: OrderStatus;
  logistics_status: string;
  description: string | null;
  dimensions: string | null;
  tracking_code: string | null;
  created_at: string;
  pickup_date: string | null;
  delivery_date: string | null;
  actual_delivery_date: string | null;
  declared_value: number | null;
  has_insurance: boolean | null;
  client_id: string;
}

interface OrderLogistics {
  merchandise_type: string;
  merchandise_description: string | null;
  estimated_weight: number;
  estimated_volume: string | null;
  declared_value: number | null;
  is_fragile: boolean;
  is_urgent: boolean;
  special_conditions: string | null;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  pickup_time_slot: string | null;
}

interface ClientProfile {
  full_name: string | null;
  phone: string | null;
  email: string | null;
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

export default function GPOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [logistics, setLogistics] = useState<OrderLogistics | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    if (!orderId) {
      navigate("/gp/dashboard");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get GP profile
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!gpProfile) {
        navigate("/gp/dashboard");
        return;
      }

      // Get order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("gp_id", gpProfile.id)
        .single();

      if (orderError || !orderData) {
        toast({ title: "Commande non trouvée", variant: "destructive" });
        navigate("/gp/dashboard");
        return;
      }

      setOrder(orderData as OrderDetail);

      // Get logistics info
      const { data: logisticsData } = await supabase
        .from("order_logistics")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      setLogistics(logisticsData);

      // Get client profile
      const { data: clientData } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("user_id", orderData.client_id)
        .maybeSingle();

      setClient(clientData);

    } catch (error) {
      console.error("Error loading order:", error);
      toast({ title: "Erreur de chargement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("orders")
        .update({ 
          status: newStatus,
          ...(newStatus === "delivered" ? { actual_delivery_date: new Date().toISOString() } : {})
        })
        .eq("id", order.id);

      if (error) throw error;

      // Add to history
      await supabase
        .from("order_status_history")
        .insert({
          order_id: order.id,
          status: newStatus,
          changed_by: user.id,
          changed_by_type: "gp",
        });

      toast({ 
        title: "Statut mis à jour",
        description: `Commande marquée comme "${getOrderStatusLabel(newStatus)}"`,
      });
      
      loadOrderDetails();
    } catch (error: any) {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const { nextStatus, label: nextLabel } = getNextOrderStatus(order.status);
  const statusConfig = orderStatusConfig[order.status];

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-primary text-primary-foreground py-3 px-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="text-inherit hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{order.order_number}</h1>
            <p className="text-sm opacity-80">Détails de la mission</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Status Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Badge variant={statusConfig?.color as any || "secondary"}>
                {getOrderStatusLabel(order.status)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {format(new Date(order.created_at), "d MMM yyyy", { locale: fr })}
              </span>
            </div>

            {/* Action Button */}
            {nextStatus && nextLabel && (
              <Button 
                variant="default" 
                size="lg" 
                className="w-full"
                disabled={updating}
                onClick={() => updateOrderStatus(nextStatus)}
              >
                {updating ? (
                  <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <>
                    {nextStatus === "accepted" && <CheckCircle className="w-5 h-5 mr-2" />}
                    {nextStatus === "collected" && <Package className="w-5 h-5 mr-2" />}
                    {nextStatus === "in_transit" && <Truck className="w-5 h-5 mr-2" />}
                    {nextStatus === "delivered" && <CheckCircle className="w-5 h-5 mr-2" />}
                    {nextLabel}
                  </>
                )}
              </Button>
            )}

            {order.status === "delivered" && (
              <div className="flex items-center justify-center gap-2 py-3 text-success">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Mission terminée avec succès</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Route */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Trajet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <div>
                <p className="font-medium">{order.origin_city}</p>
                <p className="text-xs text-muted-foreground">{order.origin_country}</p>
              </div>
            </div>
            <div className="ml-1.5 border-l-2 border-dashed border-muted h-4" />
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-success" />
              <div>
                <p className="font-medium">{order.destination_city}</p>
                <p className="text-xs text-muted-foreground">{order.destination_country}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{client?.full_name || "Client"}</p>
                {client?.email && (
                  <p className="text-sm text-muted-foreground">{client.email}</p>
                )}
              </div>
              <div className="flex gap-2">
                {client?.phone && (
                  <a href={`tel:${client.phone}`}>
                    <Button variant="outline" size="icon">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                )}
                <Button variant="outline" size="icon" onClick={() => navigate("/messages")}>
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logistics Details */}
        {logistics ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Détails de la marchandise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Alerts */}
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
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{merchandiseLabels[logistics.merchandise_type] || logistics.merchandise_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Poids</p>
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
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{logistics.merchandise_description}</p>
                </div>
              )}

              {logistics.special_conditions && (
                <div className="p-3 bg-warning/10 rounded-lg border border-warning/30">
                  <p className="text-sm font-medium text-warning">Conditions spéciales</p>
                  <p className="text-sm mt-1">{logistics.special_conditions}</p>
                </div>
              )}

              <Separator />

              {/* Addresses */}
              <div>
                <p className="text-sm font-medium mb-2">Adresses</p>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">📍 Enlèvement</p>
                    <p className="text-sm">{logistics.pickup_address}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(logistics.pickup_date), "d MMMM yyyy", { locale: fr })}
                      {logistics.pickup_time_slot && ` • ${timeSlotLabels[logistics.pickup_time_slot]}`}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">🎯 Livraison</p>
                    <p className="text-sm">{logistics.delivery_address}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <div>
                  <p className="font-medium">Informations en attente</p>
                  <p className="text-sm">Le client n'a pas encore complété les détails logistiques</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Détails financiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Poids</span>
                <span className="font-medium">{order.weight} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix/kg</span>
                <span className="font-medium">{order.price_per_kg.toLocaleString()} {order.currency}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-medium">Total</span>
                <span className="font-bold text-primary">{order.total_price.toLocaleString()} {order.currency}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tracking */}
        {order.tracking_code && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Code de suivi</p>
              <p className="font-mono font-bold text-lg">{order.tracking_code}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
