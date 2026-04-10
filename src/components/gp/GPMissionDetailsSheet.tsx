import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, MapPin, Calendar, Clock, User, Phone, 
  MessageCircle, Weight, AlertTriangle, Zap, CheckCircle,
  XCircle, Truck, ArrowRight, FileText, Check, X, QrCode,
  Home, Navigation, Shield, Info, Copy, ExternalLink, Wallet, Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { 
  hasPickupLogistics, 
  notifyAdminPickupMission 
} from "@/hooks/useLogisticsSync";
import { sendAcceptanceNotification } from "@/lib/autoChat";

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
  has_insurance: boolean | null;
  declared_value: number | null;
  content_nature: string[] | null;
}

interface ClientProfile {
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

interface LogisticsOptions {
  pickup_enabled: boolean;
  pickup_address: string | null;
  pickup_contact_name: string | null;
  pickup_phone: string | null;
  delivery_enabled: boolean;
  delivery_address: string | null;
  delivery_contact_name: string | null;
  delivery_phone: string | null;
}

interface GPMissionDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  gpProfileId?: string;
  gpName?: string;
  onAccept?: () => void;
  onRefuse?: () => void;
  onContact?: (clientId: string) => void;
  showActions?: boolean;
}

/**
 * GPMissionDetailsSheet - Enhanced interactive mission details
 * 
 * Features:
 * - Full order details with visual hierarchy
 * - Logistics info (pickup/delivery addresses)
 * - Insurance status
 * - Quick accept/refuse actions
 * - Contact client
 * - QR code access
 */
export function GPMissionDetailsSheet({ 
  open, 
  onClose, 
  orderId,
  gpProfileId,
  gpName,
  onAccept,
  onRefuse,
  onContact,
  showActions = true
}: GPMissionDetailsSheetProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [logistics, setLogistics] = useState<LogisticsOptions | null>(null);
  const [actionLoading, setActionLoading] = useState<"accept" | "refuse" | null>(null);
  const [hasPickup, setHasPickup] = useState(false);

  useEffect(() => {
    if (open && orderId) {
      loadOrderDetails();
      checkPickupLogistics();
    }
  }, [open, orderId]);

  const checkPickupLogistics = async () => {
    const hasPickupOption = await hasPickupLogistics(orderId);
    setHasPickup(hasPickupOption);
  };

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      // Load order with all details
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Load client profile
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

      // Load logistics options (pickup/delivery addresses)
      const { data: logisticsData } = await supabase
        .from("order_logistics_options")
        .select("pickup_enabled, pickup_address, pickup_contact_name, pickup_phone, delivery_enabled, delivery_address, delivery_contact_name, delivery_phone")
        .eq("order_id", orderId)
        .single();

      if (logisticsData) {
        setLogistics(logisticsData);
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

      // Get GP profile for contact info
      const { data: { user } } = await supabase.auth.getUser();
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, deposit_address, reception_address, phone, whatsapp_phone")
        .eq("user_id", user?.id)
        .single();

      // Add status history
      if (user) {
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          status: "accepted",
          changed_by: user.id,
          changed_by_type: "gp",
          notes: "Commande acceptée par le transporteur",
        });

        // Send automated acceptance message with GP contact info
        if (gpProfile) {
          await sendAcceptanceNotification(
            order.client_id,
            gpProfile.id,
            order.id,
            {
              orderNumber: order.order_number,
              originCity: order.origin_city,
              destinationCity: order.destination_city,
              gpName: gpProfile.business_name,
              depositAddress: gpProfile.deposit_address,
              phone: gpProfile.phone,
              whatsapp: gpProfile.whatsapp_phone,
              receptionAddress: gpProfile.reception_address,
            }
          );
        }

        // V1.1: If pickup logistics is enabled, notify admin
        if (hasPickup && gpName) {
          await notifyAdminPickupMission(order.id, order.order_number, gpName);
          toast({
            title: "Commande acceptee",
            description: "Le client et l'équipe Konnekt ont été notifiés pour l'enlèvement",
          });
        } else {
          toast({
            title: "Commande acceptee",
            description: "Le client a été notifié",
          });
        }
      }

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
      const { data, error } = await supabase.functions.invoke("cancel-order", {
        body: {
          order_id: order.id,
          actor_type: "gp",
          reason: "Commande refusée par le transporteur",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Commande refusée",
        description: data?.refunded_amount > 0
          ? "Remboursement du client lancé."
          : "Le client a été notifié.",
      });

      onRefuse?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de refuser la commande",
        variant: "destructive",
      });
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
            <div className="flex items-center gap-2">
              {order && (
                <Badge 
                  variant={isPending ? "warning" : isActive ? "default" : "secondary"}
                  className={isActive ? "bg-green-500" : ""}
                >
                  {ORDER_STATUS_LABELS[validStatus as OrderStatus]}
                </Badge>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
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
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-bold text-lg">{order.order_number}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(order.order_number);
                          toast({ title: "Copié !" });
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
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
                <Tabs defaultValue="colis" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 h-8">
                    <TabsTrigger value="colis" className="text-xs gap-1">
                      <Package className="w-3 h-3" />
                      Colis
                    </TabsTrigger>
                    <TabsTrigger value="paiement" className="text-xs gap-1">
                      <Wallet className="w-3 h-3" />
                      Paiement
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="colis" className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <Scale className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Poids</p>
                        </div>
                        <p className="font-bold text-lg">{order.weight} kg</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <Wallet className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Montant</p>
                        </div>
                        <p className="font-bold text-lg text-primary">
                          {order.total_price.toLocaleString()} {getCurrencySymbol(order.currency)}
                        </p>
                      </div>
                    </div>
                
                    {/* Content nature */}
                    {order.content_nature && order.content_nature.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {order.content_nature.map((nature: string) => (
                          <Badge key={nature} variant="secondary" className="text-xs">
                            {nature}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {order.description && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Description</p>
                        <p className="text-sm">{order.description}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="paiement" className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Prix total</span>
                        <span className="font-bold text-primary">
                          {order.total_price.toLocaleString()} {getCurrencySymbol(order.currency)}
                        </span>
                      </div>
                      
                      {/* Insurance status */}
                      {order.has_insurance && (
                        <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" />
                            <span className="text-xs">Assurance incluse</span>
                          </div>
                          <span className="text-xs font-medium text-primary">
                            {order.declared_value?.toLocaleString()} {getCurrencySymbol(order.currency)}
                          </span>
                        </div>
                      )}

                      <div className="p-3 bg-success/10 rounded-lg border border-success/30">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span className="text-sm font-medium text-success">
                            Paiement confirmé
                          </span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Logistics Info (Pickup/Delivery) */}
            {logistics && (logistics.pickup_enabled || logistics.delivery_enabled) && (
              <Card className="border-amber-200 bg-amber-50/30">
                <CardContent className="p-4 space-y-3">
                   <h3 className="font-semibold text-sm flex items-center gap-2 text-amber-800">
                    <Truck className="w-4 h-4" />
                    Konnekt Logistique
                  </h3>
                  
                  {logistics.pickup_enabled && (
                    <div className="p-3 bg-white/80 rounded-lg space-y-1">
                      <div className="flex items-center gap-2">
                        <Home className="w-3 h-3 text-amber-600" />
                        <p className="text-xs font-medium text-amber-800">Enlèvement à domicile</p>
                      </div>
                      <p className="text-sm">{logistics.pickup_address}</p>
                      <p className="text-xs text-muted-foreground">
                        Contact: {logistics.pickup_contact_name} — {logistics.pickup_phone}
                      </p>
                    </div>
                  )}

                  {logistics.delivery_enabled && (
                    <div className="p-3 bg-white/80 rounded-lg space-y-1">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-3 h-3 text-blue-600" />
                        <p className="text-xs font-medium text-blue-800">Livraison dernier km</p>
                      </div>
                      <p className="text-sm">{logistics.delivery_address}</p>
                      <p className="text-xs text-muted-foreground">
                        Destinataire: {logistics.delivery_contact_name} — {logistics.delivery_phone}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="w-3 h-3" />
                    Konnekt gère l'enlèvement/livraison
                  </div>
                </CardContent>
              </Card>
            )}

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
