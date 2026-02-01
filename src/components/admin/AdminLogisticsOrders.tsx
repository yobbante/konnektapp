import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Truck, Package, MapPin, Phone, Clock, CheckCircle, 
  XCircle, RefreshCw, Search, Filter, User, QrCode,
  ArrowRight, Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  delivery_instructions: string | null;
  delivery_status: string | null;
  delivery_completed_at: string | null;
  delivery_price: number | null;
  total_logistics_price: number;
  currency: string;
  created_at: string;
  order?: {
    order_number: string;
    origin_city: string;
    destination_city: string;
    status: string;
    gp_profiles?: {
      business_name: string;
    };
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-800", icon: Clock },
  scheduled: { label: "Programmé", color: "bg-blue-100 text-blue-800", icon: Calendar },
  collected: { label: "Collecté", color: "bg-primary/10 text-primary", icon: Package },
  handed_to_gp: { label: "Remis au GP", color: "bg-green-100 text-green-800", icon: CheckCircle },
  in_transit: { label: "En transit", color: "bg-purple-100 text-purple-800", icon: Truck },
  delivered: { label: "Livré", color: "bg-success/10 text-success", icon: CheckCircle },
  failed: { label: "Échec", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

/**
 * Admin Logistics Orders Management
 * Manages internal Yobbanté pickup/delivery for GP via bagages
 */
export function AdminLogisticsOrders() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<LogisticsOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [selectedOrder, setSelectedOrder] = useState<LogisticsOrder | null>(null);

  useEffect(() => {
    fetchOrders();
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
            gp_profiles:gp_id(business_name)
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
        if (newStatus === "delivered") {
          updates.delivery_completed_at = new Date().toISOString();
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
        }
      }

      toast({ title: "Statut mis à jour" });
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      console.error("Error updating status:", err);
      toast({ title: "Erreur de mise à jour", variant: "destructive" });
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.pickup_contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.delivery_contact_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === "pending") {
      return matchesSearch && (
        (order.pickup_enabled && order.pickup_status === "pending") ||
        (order.delivery_enabled && order.delivery_status === "pending")
      );
    }
    if (statusFilter === "in_progress") {
      return matchesSearch && (
        (order.pickup_enabled && ["scheduled", "collected"].includes(order.pickup_status || "")) ||
        (order.delivery_enabled && ["scheduled", "in_transit"].includes(order.delivery_status || ""))
      );
    }
    if (statusFilter === "completed") {
      const pickupDone = !order.pickup_enabled || order.pickup_status === "handed_to_gp";
      const deliveryDone = !order.delivery_enabled || order.delivery_status === "delivered";
      return matchesSearch && pickupDone && deliveryDone;
    }
    return matchesSearch;
  });

  // Stats
  const stats = {
    pendingPickups: orders.filter(o => o.pickup_enabled && o.pickup_status === "pending").length,
    pendingDeliveries: orders.filter(o => o.delivery_enabled && o.delivery_status === "pending").length,
    inProgress: orders.filter(o => 
      (o.pickup_enabled && ["scheduled", "collected"].includes(o.pickup_status || "")) ||
      (o.delivery_enabled && ["scheduled", "in_transit"].includes(o.delivery_status || ""))
    ).length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.total_logistics_price || 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-700">{stats.pendingPickups}</p>
                <p className="text-xs text-amber-600">Enlèvements en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.pendingDeliveries}</p>
                <p className="text-xs text-blue-600">Livraisons en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-700">{stats.inProgress}</p>
                <p className="text-xs text-purple-600">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700">
                  {stats.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-green-600">Revenus XOF</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par commande ou contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[150px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="completed">Terminés</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchOrders}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucune commande logistique trouvée</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const pickupStatus = STATUS_LABELS[order.pickup_status || "pending"];
            const deliveryStatus = STATUS_LABELS[order.delivery_status || "pending"];

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="hover:shadow-md transition-shadow">
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
                      <Badge variant="outline">
                        {order.total_logistics_price.toLocaleString()} {getCurrencySymbol(order.currency)}
                      </Badge>
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
                            {order.pickup_address}
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
                            {deliveryStatus?.label}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {order.delivery_address}
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
                            variant="outline"
                            onClick={() => setSelectedOrder(order)}
                          >
                            Gérer
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-full sm:max-w-lg">
                          <SheetHeader>
                            <SheetTitle>Gestion Logistique</SheetTitle>
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
                                    <span className="text-muted-foreground">GP</span>
                                    <span>{order.order?.gp_profiles?.business_name}</span>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Pickup Management */}
                              {order.pickup_enabled && (
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Package className="w-4 h-4 text-primary" />
                                      Enlèvement
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
                                        <p className="font-medium">{order.pickup_phone}</p>
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
                                      Livraison
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
                                        <p className="font-medium">{order.delivery_phone}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Adresse</p>
                                      <p className="text-sm">{order.delivery_address}</p>
                                    </div>
                                    {order.delivery_instructions && (
                                      <div>
                                        <p className="text-xs text-muted-foreground">Instructions</p>
                                        <p className="text-sm">{order.delivery_instructions}</p>
                                      </div>
                                    )}
                                    
                                    {/* Status Actions */}
                                    <div className="flex gap-2 pt-2">
                                      {order.delivery_status === "pending" && (
                                        <Button 
                                          size="sm" 
                                          onClick={() => updateStatus(order.id, "delivery", "scheduled")}
                                        >
                                          Programmer
                                        </Button>
                                      )}
                                      {order.delivery_status === "scheduled" && (
                                        <Button 
                                          size="sm" 
                                          onClick={() => updateStatus(order.id, "delivery", "in_transit")}
                                        >
                                          <Truck className="w-3 h-3 mr-1" />
                                          En route
                                        </Button>
                                      )}
                                      {order.delivery_status === "in_transit" && (
                                        <Button 
                                          size="sm"
                                          className="bg-success hover:bg-success/90"
                                          onClick={() => updateStatus(order.id, "delivery", "delivered")}
                                        >
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Livré
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
