import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Truck, Package, MapPin, Phone, Clock, CheckCircle, 
  XCircle, RefreshCw, Search, Filter, User, QrCode,
  ArrowRight, Calendar, Bell, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface LogisticsOrder {
  id: string;
  order_id: string;
  pickup_enabled: boolean;
  pickup_address: string | null;
  pickup_city: string | null;
  pickup_contact_name: string | null;
  pickup_phone: string | null;
  pickup_whatsapp: string | null;
  pickup_time_slot: string | null;
  pickup_status: string | null;
  pickup_collected_at: string | null;
  pickup_handed_at: string | null;
  pickup_price: number | null;
  delivery_enabled: boolean;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_contact_name: string | null;
  delivery_phone: string | null;
  delivery_whatsapp: string | null;
  delivery_instructions: string | null;
  delivery_status: string | null;
  delivery_completed_at: string | null;
  delivery_price: number | null;
  total_logistics_price: number;
  currency: string;
  logistics_status: string | null;
  gp_arrived_at: string | null;
  created_at: string;
  order?: {
    order_number: string;
    origin_city: string;
    destination_city: string;
    status: string;
    weight: number;
    gp_id: string;
    client_id: string;
    gp_profiles?: {
      business_name: string;
      phone: string;
      reception_address: string;
    } | null;
  };
}

type MissionTab = "all" | "pickups" | "deliveries" | "awaiting_gp";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-800", icon: Clock },
  scheduled: { label: "Programmé", color: "bg-blue-100 text-blue-800", icon: Calendar },
  collected: { label: "Collecté par admin", color: "bg-primary/10 text-primary", icon: Package },
  handed_to_gp: { label: "Remis au GP", color: "bg-green-100 text-green-800", icon: CheckCircle },
  picked_from_gp: { label: "Récupéré chez GP", color: "bg-purple-100 text-purple-800", icon: Package },
  in_transit: { label: "En route livraison", color: "bg-purple-100 text-purple-800", icon: Truck },
  delivered: { label: "Livré", color: "bg-success/10 text-success", icon: CheckCircle },
  failed: { label: "Échec", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

/**
 * AdminLogisticsOrdersV2 - V1.1 Enhanced Admin Logistics Management
 * 
 * Features:
 * - Separate tabs for Pickups (origin Dakar) and Deliveries (destination Dakar)
 * - "Awaiting GP" section for orders where GP hasn't arrived yet
 * - Full workflow: Admin pickup → Hand to GP → GP transit → GP arrived → Admin delivery
 * - Real-time notifications and status updates
 */
interface AdminLogisticsOrdersV2Props {
  compact?: boolean;
}

export function AdminLogisticsOrdersV2({ compact = false }: AdminLogisticsOrdersV2Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<LogisticsOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<MissionTab>("all");
  const [selectedOrder, setSelectedOrder] = useState<LogisticsOrder | null>(null);

  useEffect(() => {
    fetchOrders();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel("logistics-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_logistics_options" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("order_logistics_options")
        .select(`
          *,
          order:orders(
            order_number,
            origin_city,
            destination_city,
            status,
            weight,
            gp_id,
            client_id,
            gp_profiles:gp_id(business_name, phone, reception_address)
          )
        `)
        .or("pickup_enabled.eq.true,delivery_enabled.eq.true")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching logistics orders:", err);
      toast({ title: "Erreur de chargement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (
    orderId: string, 
    type: "pickup" | "delivery", 
    newStatus: string
  ) => {
    try {
      const updates: Record<string, any> = {};
      
      if (type === "pickup") {
        updates.pickup_status = newStatus;
        if (newStatus === "collected") {
          updates.pickup_collected_at = new Date().toISOString();
        } else if (newStatus === "handed_to_gp") {
          updates.pickup_handed_at = new Date().toISOString();
        }
      } else {
        updates.delivery_status = newStatus;
        if (newStatus === "picked_from_gp") {
          updates.logistics_status = "admin_delivering";
        } else if (newStatus === "delivered") {
          updates.delivery_completed_at = new Date().toISOString();
          updates.logistics_status = "completed";
          
          // Also update main order status to delivered
          const order = orders.find(o => o.id === orderId);
          if (order) {
            await supabase
              .from("orders")
              .update({ status: "delivered", actual_delivery_date: new Date().toISOString() })
              .eq("id", order.order_id);
          }
        }
      }

      const { error } = await supabase
        .from("order_logistics_options")
        .update(updates)
        .eq("id", orderId);

      if (error) throw error;

      // Add to logistics history
      const logisticsOrder = orders.find(o => o.id === orderId);
      if (logisticsOrder) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("logistics_status_history").insert({
            order_id: logisticsOrder.order_id,
            logistics_option_id: orderId,
            action: `${type}_${newStatus}`,
            old_status: type === "pickup" ? logisticsOrder.pickup_status : logisticsOrder.delivery_status,
            new_status: newStatus,
            actor_id: user.id,
            actor_type: "admin",
            scan_type: type,
          });

          // Notify client and GP
          await notifyStatusChange(logisticsOrder, type, newStatus);
        }
      }

      toast({ title: "✅ Statut mis à jour" });
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      console.error("Error updating status:", err);
      toast({ title: "Erreur de mise à jour", variant: "destructive" });
    }
  };

  const notifyStatusChange = async (
    order: LogisticsOrder,
    type: "pickup" | "delivery",
    status: string
  ) => {
    const statusMessages: Record<string, { title: string; message: string }> = {
      collected: {
        title: "📦 Colis collecté",
        message: `Votre colis ${order.order?.order_number} a été récupéré par notre agent`,
      },
      handed_to_gp: {
        title: "✅ Colis remis au transporteur",
        message: `Votre colis ${order.order?.order_number} a été remis au GP pour transport`,
      },
      picked_from_gp: {
        title: "🚚 Colis en route",
        message: `Votre colis ${order.order?.order_number} est en route pour livraison`,
      },
      delivered: {
        title: "🎉 Colis livré !",
        message: `Votre colis ${order.order?.order_number} a été livré avec succès`,
      },
    };

    const notification = statusMessages[status];
    if (!notification) return;

    // Get client ID from order
    const { data: orderData } = await supabase
      .from("orders")
      .select("client_id")
      .eq("id", order.order_id)
      .single();

    if (orderData?.client_id) {
      await supabase.from("notifications").insert({
        user_id: orderData.client_id,
        type: "logistics_update",
        title: notification.title,
        message: notification.message,
        related_type: "order",
        related_id: order.order_id,
      });
    }
  };

  // Filter orders by tab
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.pickup_contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.delivery_contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.order?.gp_profiles?.business_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeTab) {
      case "pickups":
        // Origin Dakar - Pickup missions
        return order.pickup_enabled && order.pickup_status !== "handed_to_gp";
      case "deliveries":
        // Destination Dakar - Delivery missions (awaiting or in progress)
        return order.delivery_enabled && 
          (order.logistics_status === "awaiting_admin_delivery" || 
           order.delivery_status === "in_transit" ||
           order.delivery_status === "picked_from_gp");
      case "awaiting_gp":
        // Orders where pickup is done but GP hasn't arrived yet
        return order.pickup_enabled && 
          order.pickup_status === "handed_to_gp" && 
          order.logistics_status !== "awaiting_admin_delivery";
      default:
        return true;
    }
  });

  // Stats
  const stats = {
    pendingPickups: orders.filter(o => o.pickup_enabled && o.pickup_status === "pending").length,
    pendingDeliveries: orders.filter(o => 
      o.delivery_enabled && 
      (o.logistics_status === "awaiting_admin_delivery" || o.delivery_status === "pending")
    ).length,
    awaitingGP: orders.filter(o => 
      o.pickup_enabled && 
      o.pickup_status === "handed_to_gp" && 
      o.logistics_status !== "awaiting_admin_delivery" &&
      !o.delivery_enabled
    ).length + orders.filter(o => 
      o.delivery_enabled && 
      o.logistics_status !== "awaiting_admin_delivery" &&
      o.delivery_status === null
    ).length,
    completedToday: orders.filter(o => {
      const today = new Date().toDateString();
      return (o.delivery_completed_at && new Date(o.delivery_completed_at).toDateString() === today) ||
             (o.pickup_handed_at && new Date(o.pickup_handed_at).toDateString() === today);
    }).length,
  };

  // Compact mode - just show alert and stats
  if (compact) {
    if (stats.pendingPickups === 0 && stats.pendingDeliveries === 0) {
      return null;
    }
    
    return (
      <Alert className="bg-amber-50 border-amber-300">
        <Bell className="w-4 h-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Logistique Interne</AlertTitle>
        <AlertDescription className="text-amber-700">
          {stats.pendingPickups > 0 && `${stats.pendingPickups} enlèvement(s) à effectuer. `}
          {stats.pendingDeliveries > 0 && `${stats.pendingDeliveries} livraison(s) dernier km à effectuer.`}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert Banner for Pending Missions */}
      {(stats.pendingPickups > 0 || stats.pendingDeliveries > 0) && (
        <Alert className="bg-amber-50 border-amber-300">
          <Bell className="w-4 h-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Missions en attente</AlertTitle>
          <AlertDescription className="text-amber-700">
            {stats.pendingPickups > 0 && `${stats.pendingPickups} enlèvement(s) à effectuer. `}
            {stats.pendingDeliveries > 0 && `${stats.pendingDeliveries} livraison(s) dernier km à effectuer.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-amber-50 border-amber-200 cursor-pointer hover:shadow-md" onClick={() => setActiveTab("pickups")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-700">{stats.pendingPickups}</p>
                <p className="text-xs text-amber-600">Enlèvements</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200 cursor-pointer hover:shadow-md" onClick={() => setActiveTab("deliveries")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.pendingDeliveries}</p>
                <p className="text-xs text-blue-600">Livraisons dernier km</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200 cursor-pointer hover:shadow-md" onClick={() => setActiveTab("awaiting_gp")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-700">{stats.awaitingGP}</p>
                <p className="text-xs text-purple-600">En transit GP</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700">{stats.completedToday}</p>
                <p className="text-xs text-green-600">Terminés aujourd'hui</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col gap-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MissionTab)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all">Tout</TabsTrigger>
            <TabsTrigger value="pickups" className="relative">
              Enlèvements
              {stats.pendingPickups > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] bg-amber-500">
                  {stats.pendingPickups}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="relative">
              Livraisons
              {stats.pendingDeliveries > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] bg-blue-500">
                  {stats.pendingDeliveries}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="awaiting_gp">En transit</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par commande, contact ou GP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchOrders}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {activeTab === "pickups" && "Aucun enlèvement en attente"}
                {activeTab === "deliveries" && "Aucune livraison dernier km en attente"}
                {activeTab === "awaiting_gp" && "Aucun colis en transit GP"}
                {activeTab === "all" && "Aucune mission logistique"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const pickupStatus = STATUS_LABELS[order.pickup_status || "pending"];
            const deliveryStatus = STATUS_LABELS[order.delivery_status || "pending"];
            const isAwaitingAdminDelivery = order.logistics_status === "awaiting_admin_delivery";

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`hover:shadow-md transition-shadow ${isAwaitingAdminDelivery ? "border-blue-300 bg-blue-50/30" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono font-bold text-sm">
                          {order.order?.order_number || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.order?.origin_city} → {order.order?.destination_city}
                        </p>
                        {order.order?.gp_profiles && (
                          <p className="text-xs text-primary">
                            GP: {order.order.gp_profiles.business_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">
                          {order.total_logistics_price.toLocaleString()} {getCurrencySymbol(order.currency)}
                        </Badge>
                        {isAwaitingAdminDelivery && (
                          <Badge className="bg-blue-500 mt-1 block">
                            GP Arrivé
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Pickup Status */}
                      {order.pickup_enabled && (
                        <div className="p-2 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-3 h-3 text-primary" />
                            <span className="text-xs font-medium">Enlèvement</span>
                          </div>
                          <Badge className={`text-xs ${pickupStatus?.color}`}>
                            {pickupStatus?.label}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {order.pickup_contact_name} - {order.pickup_phone}
                          </p>
                        </div>
                      )}

                      {/* Delivery Status */}
                      {order.delivery_enabled && (
                        <div className="p-2 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Truck className="w-3 h-3 text-success" />
                            <span className="text-xs font-medium">Livraison</span>
                          </div>
                          <Badge className={`text-xs ${deliveryStatus?.color}`}>
                            {isAwaitingAdminDelivery ? "À récupérer chez GP" : deliveryStatus?.label}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {order.delivery_contact_name} - {order.delivery_phone}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-3 pt-3 border-t flex justify-end">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button 
                            size="sm" 
                            variant={isAwaitingAdminDelivery ? "default" : "outline"}
                            onClick={() => setSelectedOrder(order)}
                          >
                            {isAwaitingAdminDelivery ? "Récupérer & Livrer" : "Gérer"}
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>Gestion Mission Logistique</SheetTitle>
                          </SheetHeader>
                          
                          {selectedOrder && selectedOrder.id === order.id && (
                            <div className="py-4 space-y-4">
                              {/* Order Info */}
                              <Card className="bg-muted/50">
                                <CardContent className="p-4 space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Commande</span>
                                    <span className="font-mono font-bold">{order.order?.order_number}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Trajet</span>
                                    <span>{order.order?.origin_city} → {order.order?.destination_city}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Poids</span>
                                    <span>{order.order?.weight} kg</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">GP</span>
                                    <span>{order.order?.gp_profiles?.business_name}</span>
                                  </div>
                                  {order.order?.gp_profiles?.phone && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Tél GP</span>
                                      <a href={`tel:${order.order.gp_profiles.phone}`} className="text-primary underline">
                                        {order.order.gp_profiles.phone}
                                      </a>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* GP Arrived Alert */}
                              {isAwaitingAdminDelivery && (
                                <Alert className="bg-blue-50 border-blue-300">
                                  <MapPin className="w-4 h-4 text-blue-600" />
                                  <AlertTitle className="text-blue-800">GP Arrivé à destination</AlertTitle>
                                  <AlertDescription className="text-blue-700">
                                    Le colis est disponible chez le GP. Récupérez-le pour effectuer la livraison dernier km.
                                    {order.gp_arrived_at && (
                                      <span className="block text-xs mt-1">
                                        Arrivé le {format(new Date(order.gp_arrived_at), "d MMM à HH:mm", { locale: fr })}
                                      </span>
                                    )}
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Pickup Management */}
                              {order.pickup_enabled && order.pickup_status !== "handed_to_gp" && (
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Package className="w-4 h-4 text-primary" />
                                      Enlèvement (Origine)
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Contact</p>
                                        <p className="font-medium">{order.pickup_contact_name}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Téléphone</p>
                                        <a href={`tel:${order.pickup_phone}`} className="font-medium text-primary">
                                          {order.pickup_phone}
                                        </a>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Adresse</p>
                                      <p className="text-sm">{order.pickup_address}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Créneau</p>
                                      <p className="text-sm">{order.pickup_time_slot}</p>
                                    </div>
                                    
                                    {/* Status Actions */}
                                    <div className="flex gap-2 pt-2">
                                      {order.pickup_status === "pending" && (
                                        <Button 
                                          size="sm" 
                                          onClick={() => updateStatus(order.id, "pickup", "scheduled")}
                                        >
                                          Programmer
                                        </Button>
                                      )}
                                      {order.pickup_status === "scheduled" && (
                                        <Button 
                                          size="sm" 
                                          onClick={() => updateStatus(order.id, "pickup", "collected")}
                                        >
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Colis collecté
                                        </Button>
                                      )}
                                      {order.pickup_status === "collected" && (
                                        <Button 
                                          size="sm"
                                          className="bg-success hover:bg-success/90"
                                          onClick={() => updateStatus(order.id, "pickup", "handed_to_gp")}
                                        >
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Remis au GP
                                        </Button>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {/* Delivery Management */}
                              {order.delivery_enabled && (
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Truck className="w-4 h-4 text-success" />
                                      Livraison Dernier Km
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Destinataire</p>
                                        <p className="font-medium">{order.delivery_contact_name}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Téléphone</p>
                                        <a href={`tel:${order.delivery_phone}`} className="font-medium text-primary">
                                          {order.delivery_phone}
                                        </a>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Adresse de livraison</p>
                                      <p className="text-sm">{order.delivery_address}</p>
                                    </div>
                                    {order.delivery_instructions && (
                                      <div>
                                        <p className="text-xs text-muted-foreground">Instructions</p>
                                        <p className="text-sm">{order.delivery_instructions}</p>
                                      </div>
                                    )}

                                    {/* GP Location for pickup */}
                                    {isAwaitingAdminDelivery && order.order?.gp_profiles && (
                                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-xs font-medium text-blue-800 mb-1">📍 Récupérer chez GP</p>
                                        <p className="text-sm text-blue-700">{order.order.gp_profiles.business_name}</p>
                                        {order.order.gp_profiles.reception_address && (
                                          <p className="text-xs text-blue-600">{order.order.gp_profiles.reception_address}</p>
                                        )}
                                        {order.order.gp_profiles.phone && (
                                          <a href={`tel:${order.order.gp_profiles.phone}`} className="text-xs text-blue-600 underline">
                                            {order.order.gp_profiles.phone}
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Status Actions */}
                                    <div className="flex flex-col gap-2 pt-2">
                                      {(isAwaitingAdminDelivery || order.delivery_status === "pending") && (
                                        <Button 
                                          size="sm" 
                                          className="w-full"
                                          onClick={() => updateStatus(order.id, "delivery", "picked_from_gp")}
                                        >
                                          <Package className="w-3 h-3 mr-1" />
                                          Récupéré chez GP
                                        </Button>
                                      )}
                                      {order.delivery_status === "picked_from_gp" && (
                                        <Button 
                                          size="sm" 
                                          className="w-full"
                                          onClick={() => updateStatus(order.id, "delivery", "in_transit")}
                                        >
                                          <Truck className="w-3 h-3 mr-1" />
                                          En route livraison
                                        </Button>
                                      )}
                                      {order.delivery_status === "in_transit" && (
                                        <Button 
                                          size="sm"
                                          className="w-full bg-success hover:bg-success/90"
                                          onClick={() => updateStatus(order.id, "delivery", "delivered")}
                                        >
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Livré au destinataire
                                        </Button>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          )}
                        </SheetContent>
                      </Sheet>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
