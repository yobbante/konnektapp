import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Clock, MapPin, ArrowRight, Truck, User, CheckCircle, AlertTriangle, X, Calendar, Scale, Phone, MessageCircle, ChevronDown, ExternalLink, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoader } from "@/components/ui/PageLoader";
import { ORDER_STATUS_LABELS, isValidOrderStatus } from "@/lib/enumMappings";
import { RateOrderDialog } from "@/components/RateOrderDialog";
interface Order {
  id: string;
  order_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  weight: number;
  total_price: number;
  currency: string;
  status: string;
  tracking_code: string | null;
  created_at: string;
  pickup_date: string | null;
  delivery_date: string | null;
  actual_delivery_date: string | null;
  description: string | null;
  gp_id: string;
  has_review?: boolean;
  gp_name?: string;
  gp_phone?: string;
}
export default function OrderHistory() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  useEffect(() => {
    loadOrders();
  }, []);
  const loadOrders = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      const {
        data: ordersData,
        error
      } = await supabase.from("orders").select("*").eq("client_id", user.id).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      if (ordersData && ordersData.length > 0) {
        // Get GP info from gp_profiles (not public view)
        const gpIds = [...new Set(ordersData.map(o => o.gp_id))];
        const {
          data: gpProfiles
        } = await supabase.from("gp_profiles").select("id, business_name, phone").in("id", gpIds);

        // Get reviews
        const {
          data: reviews
        } = await supabase.from("reviews").select("order_id").in("order_id", ordersData.map(o => o.id));
        const reviewedOrderIds = new Set(reviews?.map(r => r.order_id) || []);
        const ordersWithDetails = ordersData.map(order => ({
          ...order,
          gp_name: gpProfiles?.find(gp => gp.id === order.gp_id)?.business_name || "Transporteur",
          gp_phone: gpProfiles?.find(gp => gp.id === order.gp_id)?.phone || undefined,
          has_review: reviewedOrderIds.has(order.id)
        }));
        setOrders(ordersWithDetails);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const getStatusInfo = (status: string) => {
    const validStatus = isValidOrderStatus(status) ? status : "pending";
    const label = ORDER_STATUS_LABELS[validStatus];
    const configs: Record<string, {
      color: string;
      icon: any;
      bgColor: string;
    }> = {
      pending: {
        color: "text-amber-600",
        icon: Clock,
        bgColor: "bg-amber-500/10"
      },
      accepted: {
        color: "text-blue-600",
        icon: User,
        bgColor: "bg-blue-500/10"
      },
      collected: {
        color: "text-purple-600",
        icon: Package,
        bgColor: "bg-purple-500/10"
      },
      in_transit: {
        color: "text-secondary",
        icon: Truck,
        bgColor: "bg-secondary/10"
      },
      delivered: {
        color: "text-success",
        icon: CheckCircle,
        bgColor: "bg-success/10"
      },
      cancelled: {
        color: "text-destructive",
        icon: X,
        bgColor: "bg-destructive/10"
      },
      disputed: {
        color: "text-destructive",
        icon: AlertTriangle,
        bgColor: "bg-destructive/10"
      }
    };
    return {
      label,
      ...configs[validStatus]
    };
  };
  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };
  if (loading) {
    return <PageLoader message="Chargement de l'historique..." />;
  }
  const activeOrders = orders.filter(o => ["pending", "accepted", "collected", "in_transit"].includes(o.status));
  const completedOrders = orders.filter(o => ["delivered", "cancelled", "disputed"].includes(o.status));
  return <div className="min-h-screen bg-muted/30" style={{
    paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))'
  }}>
      <AppHeader title="Mes envois" showBack />

      <div className="px-4 py-4">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="active" className="gap-2">
              <Truck className="w-4 h-4" />
              En cours ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Terminés ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 mt-0">
            {activeOrders.length === 0 ? <Card className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Aucun envoi en cours</p>
                <Button onClick={() => navigate("/envoyer")}>
                  Envoyer un colis
                </Button>
              </Card> : activeOrders.map(order => <OrderCard key={order.id} order={order} expanded={expandedOrderId === order.id} onToggle={() => toggleExpand(order.id)} onRate={() => setRatingOrder(order)} navigate={navigate} />)}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-0">
            {completedOrders.length === 0 ? <Card className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">Aucun envoi terminé</p>
              </Card> : completedOrders.map(order => <OrderCard key={order.id} order={order} expanded={expandedOrderId === order.id} onToggle={() => toggleExpand(order.id)} onRate={() => setRatingOrder(order)} navigate={navigate} />)}
          </TabsContent>
        </Tabs>
      </div>

      {ratingOrder && <RateOrderDialog open={!!ratingOrder} onOpenChange={() => setRatingOrder(null)} orderId={ratingOrder.id} gpId={ratingOrder.gp_id} gpName={ratingOrder.gp_name || "Transporteur"} onSuccess={() => {
      setRatingOrder(null);
      loadOrders();
    }} />}

      <MobileNav />
    </div>;
}
interface OrderCardProps {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onRate: () => void;
  navigate: (path: string) => void;
}
function OrderCard({
  order,
  expanded,
  onToggle,
  onRate,
  navigate
}: OrderCardProps) {
  const statusInfo = getStatusInfoFromOrder(order.status);
  const StatusIcon = statusInfo.icon;
  const isDelivered = order.status === "delivered";
  const canRate = isDelivered && !order.has_review;
  return <motion.div layout className="overflow-hidden">
      <Card className={`overflow-hidden transition-all ${expanded ? 'ring-2 ring-primary/20' : ''}`}>
        {/* Main clickable area */}
        <motion.div whileTap={{
        scale: 0.99
      }} onClick={onToggle} className="p-4 cursor-pointer">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusInfo.bgColor}`}>
              <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm truncate">
                  {order.origin_city}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-sm truncate">
                  {order.destination_city}
                </span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${statusInfo.color} border-current`}>
                  {statusInfo.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {order.weight} kg • {order.total_price?.toLocaleString()} {order.currency}
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(order.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
              </p>
            </div>

            <motion.div animate={{
            rotate: expanded ? 180 : 0
          }} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </div>
        </motion.div>

        {/* Expanded Details */}
        <AnimatePresence>
          {expanded && <motion.div initial={{
          height: 0,
          opacity: 0
        }} animate={{
          height: "auto",
          opacity: 1
        }} exit={{
          height: 0,
          opacity: 0
        }} transition={{
          duration: 0.2
        }}>
              <CardContent className="pt-0 pb-4 space-y-4 border-t border-border">
                {/* Order details grid */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Scale className="w-3.5 h-3.5" />
                      <span className="text-xs">Poids</span>
                    </div>
                    <p className="font-semibold">{order.weight} kg</p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Package className="w-3.5 h-3.5" />
                      <span className="text-xs">Prix total</span>
                    </div>
                    <p className="font-semibold text-primary">
                      {order.total_price?.toLocaleString()} {order.currency}
                    </p>
                  </div>

                  {order.pickup_date && <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-xs">Collecte prévue</span>
                      </div>
                      <p className="font-medium text-sm">
                        {new Date(order.pickup_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>}

                  {order.tracking_code && <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-xs">Code suivi</span>
                      </div>
                      <p className="font-mono text-sm">{order.tracking_code}</p>
                    </div>}
                </div>

                {/* Transporter info */}
                <div className="p-3 bg-primary/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{order.gp_name}</p>
                      <p className="text-xs text-muted-foreground">Transporteur</p>
                    </div>
                    {order.gp_phone && <Button variant="ghost" size="icon" onClick={e => {
                  e.stopPropagation();
                  window.open(`tel:${order.gp_phone}`, '_blank');
                }}>
                        <Phone className="w-4 h-4" />
                      </Button>}
                  </div>
                </div>

                {/* Description if exists */}
                {order.description && <div className="p-3 bg-muted/30 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{order.description}</p>
                  </div>}

                {/* Actions */}
                <div className="pt-2 items-center justify-center flex flex-row gap-0">
                  <Button variant="outline" size="sm" className="flex-1" onClick={e => {
                e.stopPropagation();
                navigate(`/messages?order=${order.id}`);
              }}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Messages
                  </Button>
                  
                  <Button variant="outline" size="sm" className="flex-1" onClick={e => {
                e.stopPropagation();
                navigate(`/tracking?code=${order.tracking_code || order.order_number}`);
              }}>
                    <MapPin className="w-4 h-4 mr-2" />
                    Suivi
                  </Button>

                  {canRate && <Button size="sm" onClick={e => {
                e.stopPropagation();
                onRate();
              }}>
                      <Star className="w-4 h-4 mr-2" />
                      Noter
                    </Button>}
                </div>
              </CardContent>
            </motion.div>}
        </AnimatePresence>
      </Card>
    </motion.div>;
}
function getStatusInfoFromOrder(status: string) {
  const validStatus = isValidOrderStatus(status) ? status : "pending";
  const label = ORDER_STATUS_LABELS[validStatus];
  const configs: Record<string, {
    color: string;
    icon: any;
    bgColor: string;
  }> = {
    pending: {
      color: "text-amber-600",
      icon: Clock,
      bgColor: "bg-amber-500/10"
    },
    accepted: {
      color: "text-blue-600",
      icon: User,
      bgColor: "bg-blue-500/10"
    },
    collected: {
      color: "text-purple-600",
      icon: Package,
      bgColor: "bg-purple-500/10"
    },
    in_transit: {
      color: "text-secondary",
      icon: Truck,
      bgColor: "bg-secondary/10"
    },
    delivered: {
      color: "text-success",
      icon: CheckCircle,
      bgColor: "bg-success/10"
    },
    cancelled: {
      color: "text-destructive",
      icon: X,
      bgColor: "bg-destructive/10"
    },
    disputed: {
      color: "text-destructive",
      icon: AlertTriangle,
      bgColor: "bg-destructive/10"
    }
  };
  return {
    label,
    ...configs[validStatus]
  };
}