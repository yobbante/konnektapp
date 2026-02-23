import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, MapPin, Calendar, User, Truck, Phone, Mail, 
  ArrowLeft, Clock, Weight, CreditCard, Shield, MessageSquare,
  FileText, AlertTriangle, CheckCircle, XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { orderStatusConfig, OrderStatus } from "@/lib/transportTypes";

interface OrderDetail {
  id: string;
  order_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  status: string;
  logistics_status?: string;
  total_price: number;
  price_per_kg: number;
  commission_amount: number;
  weight: number;
  dimensions?: string;
  currency: string;
  created_at: string;
  pickup_date?: string;
  delivery_date?: string;
  actual_delivery_date?: string;
  tracking_code?: string;
  description?: string;
  declared_value?: number;
  has_insurance?: boolean;
  insurance_amount?: number;
  client_id: string;
  gp_id: string;
  offer_id?: string;
}

interface ClientProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country_code: string | null;
}

interface GPProfile {
  id: string;
  user_id: string;
  business_name: string;
  phone: string;
  whatsapp?: string;
  city: string;
  country_code: string;
  gp_type: string;
  status: string;
  rating?: number;
  total_deliveries?: number;
}

interface OrderLogistics {
  pickup_address: string;
  delivery_address: string;
  merchandise_type: string;
  merchandise_description?: string;
  is_fragile: boolean;
  is_urgent: boolean;
  special_conditions?: string;
  pickup_time_slot?: string;
}

export default function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [gp, setGP] = useState<GPProfile | null>(null);
  const [logistics, setLogistics] = useState<OrderLogistics | null>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch client profile
      const { data: clientData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", orderData.client_id)
        .maybeSingle();
      setClient(clientData);

      // Fetch GP profile
      const { data: gpData } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("id", orderData.gp_id)
        .maybeSingle();
      setGP(gpData);

      // Fetch logistics details
      const { data: logisticsData } = await supabase
        .from("order_logistics")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
      setLogistics(logisticsData);

      // Fetch status history
      const { data: historyData } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      setStatusHistory(historyData || []);

    } catch (error) {
      console.error("Error loading order:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = orderStatusConfig[status as OrderStatus];
    const variant = 
      status === "delivered" ? "success" :
      status === "cancelled" || status === "disputed" ? "destructive" :
      status === "in_transit" ? "default" :
      "secondary";
    
    return (
      <Badge variant={variant} className="text-sm">
        {config?.labelFr || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-safe">
        <MobileHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
        <MobileNav />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background pb-safe">
        <MobileHeader />
        <div className="p-4 text-center">
          <p className="text-muted-foreground">Commande non trouvée</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader />

      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Commande {order.order_number}</h1>
            <p className="text-sm text-muted-foreground">
              Créée le {format(new Date(order.created_at), "d MMMM yyyy", { locale: fr })}
            </p>
          </div>
          {getStatusBadge(order.status)}
        </div>

        {/* Route Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Trajet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{order.origin_city}</p>
                  <p className="text-xs text-muted-foreground">{order.origin_country}</p>
                </div>
                <div className="w-8 h-0.5 bg-primary/30 relative">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-semibold">{order.destination_city}</p>
                  <p className="text-xs text-muted-foreground">{order.destination_country}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Financial Details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Détails financiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-primary/5 rounded-lg text-center">
                  <p className="text-lg font-bold text-primary">{order.total_price.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{order.currency} - Total</p>
                </div>
                <div className="p-3 bg-success/5 rounded-lg text-center">
                  <p className="text-lg font-bold text-success">{order.commission_amount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{order.currency} - Commission</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    dont TVA 18%: {Math.round(order.commission_amount * 18 / 118).toLocaleString()} {order.currency}
                  </p>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <p className="font-medium">{order.price_per_kg.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">FCFA/kg</p>
                </div>
                <div>
                  <p className="font-medium">{order.weight} kg</p>
                  <p className="text-xs text-muted-foreground">Poids</p>
                </div>
                {order.dimensions && (
                  <div>
                    <p className="font-medium">{order.dimensions}</p>
                    <p className="text-xs text-muted-foreground">Dimensions</p>
                  </div>
                )}
              </div>
              {order.has_insurance && (
                <div className="mt-3 p-2 bg-muted rounded-lg flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm">Assuré: {order.insurance_amount?.toLocaleString()} FCFA</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Client Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-semibold">{client?.full_name || "Non renseigné"}</p>
                {client?.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client?.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client?.city && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{client.city}, {client.country_code}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                {client?.phone && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`tel:${client.phone}`}>
                      <Phone className="w-3 h-3 mr-1" />
                      Appeler
                    </a>
                  </Button>
                )}
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={async () => {
                    // Create or get conversation with client
                    if (gp && client) {
                      const { data: existing } = await supabase
                        .from("conversations")
                        .select("id")
                        .eq("client_id", order.client_id)
                        .eq("gp_id", order.gp_id)
                        .eq("order_id", order.id)
                        .maybeSingle();
                      
                      if (existing) {
                        navigate(`/admin/messages?conversation=${existing.id}`);
                      } else {
                        const { data: newConv } = await supabase
                          .from("conversations")
                          .insert({
                            client_id: order.client_id,
                            gp_id: order.gp_id,
                            order_id: order.id,
                          })
                          .select()
                          .single();
                        
                        if (newConv) {
                          navigate(`/admin/messages?conversation=${newConv.id}`);
                        }
                      }
                    }
                  }}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Contacter
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transporter Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-4 h-4 text-secondary" />
                Transporteur
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gp ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{gp.business_name}</p>
                    <Badge variant={gp.status === "verified" ? "success" : "secondary"}>
                      {gp.status === "verified" ? "Vérifié" : gp.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{gp.phone}</span>
                  </div>
                  {gp.whatsapp && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp: {gp.whatsapp}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{gp.city}, {gp.country_code}</span>
                  </div>
                  {gp.rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-warning">★</span>
                      <span className="font-medium">{gp.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({gp.total_deliveries} livraisons)</span>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`tel:${gp.phone}`}>
                        <Phone className="w-3 h-3 mr-1" />
                        Appeler
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/gp/${gp.id}`)}>
                      Voir profil
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={async () => {
                        // Create or get conversation with GP
                        const { data: existing } = await supabase
                          .from("conversations")
                          .select("id")
                          .eq("client_id", order.client_id)
                          .eq("gp_id", order.gp_id)
                          .eq("order_id", order.id)
                          .maybeSingle();
                        
                        if (existing) {
                          navigate(`/admin/messages?conversation=${existing.id}`);
                        } else {
                          const { data: newConv } = await supabase
                            .from("conversations")
                            .insert({
                              client_id: order.client_id,
                              gp_id: order.gp_id,
                              order_id: order.id,
                            })
                            .select()
                            .single();
                          
                          if (newConv) {
                            navigate(`/admin/messages?conversation=${newConv.id}`);
                          }
                        }
                      }}
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Contacter
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Non assigné</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Logistics Details */}
        {logistics && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Détails logistiques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Adresse d'enlèvement</p>
                  <p className="text-sm font-medium">{logistics.pickup_address}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Adresse de livraison</p>
                  <p className="text-sm font-medium">{logistics.delivery_address}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type de marchandise</p>
                  <p className="text-sm font-medium">{logistics.merchandise_type}</p>
                </div>
                {logistics.merchandise_description && (
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm">{logistics.merchandise_description}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {logistics.is_urgent && (
                    <Badge className="bg-red-100 text-red-700">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Urgent
                    </Badge>
                  )}
                  {logistics.is_fragile && (
                    <Badge className="bg-yellow-100 text-yellow-700">Fragile</Badge>
                  )}
                </div>
                {logistics.special_conditions && (
                  <div>
                    <p className="text-xs text-muted-foreground">Conditions spéciales</p>
                    <p className="text-sm">{logistics.special_conditions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tracking Code */}
        {order.tracking_code && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Code de suivi</p>
                    <p className="text-lg font-mono font-bold">{order.tracking_code}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/tracking?code=${order.tracking_code}`)}>
                    Suivre
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Status History */}
        {statusHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Historique des statuts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statusHistory.map((history, index) => (
                    <div key={history.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${index === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                        {index < statusHistory.length - 1 && <div className="w-0.5 h-full bg-border flex-1 mt-1" />}
                      </div>
                      <div className="flex-1 pb-3">
                        <p className="font-medium text-sm">
                          {orderStatusConfig[history.status as OrderStatus]?.labelFr || history.status}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(history.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                        </p>
                        {history.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{history.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Description */}
        {order.description && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
