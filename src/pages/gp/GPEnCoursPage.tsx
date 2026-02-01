import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MessageCircle, Eye, RefreshCw, ChevronRight, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { MissionStatusUpdaterV2 } from "@/components/gp/MissionStatusUpdaterV2";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { getOrderStatusLabel, getOrderStatusColor } from "@/lib/transportTypes";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Order {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  weight: number;
  description: string | null;
  status: string;
  client_id: string;
  created_at: string;
  total_price: number;
  currency: string;
  pickup_date: string | null;
  has_delivery_logistics?: boolean;
}

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
}

/**
 * GPEnCoursPage - Transports en cours
 * 
 * Affiche les missions acceptées avec statuts à mettre à jour
 * Statuts: accepted, collected, in_transit
 */
export default function GPEnCoursPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [gpName, setGpName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        navigate("/gp/inscription");
        return;
      }

      setGpProfile(profile);
      setGpName(profile.business_name);

      // Load active orders (accepted, collected, in_transit)
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("gp_id", profile.id)
        .in("status", ["accepted", "collected", "in_transit"])
        .order("created_at", { ascending: false });

      // Check logistics options for each order
      const ordersWithLogistics = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: logistics } = await supabase
            .from("order_logistics_options")
            .select("delivery_enabled")
            .eq("order_id", order.id)
            .maybeSingle();
          
          return {
            ...order,
            has_delivery_logistics: logistics?.delivery_enabled || false,
          };
        })
      );

      setActiveOrders(ordersWithLogistics);

      // Get pending count for badge
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("gp_id", profile.id)
        .eq("status", "pending");

      setPendingCount(count || 0);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader message="Chargement des missions..." />;
  }

  if (!gpProfile) return null;

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeTab="en-cours"
    >
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Missions en cours
          </h2>
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
            {activeOrders.length} active{activeOrders.length > 1 ? "s" : ""}
          </Badge>
        </div>

        {activeOrders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Aucune mission en cours</p>
              <p className="text-sm mt-1">Acceptez des demandes pour voir les missions ici</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm">
                        {order.origin_city} → {order.destination_city}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #{order.order_number}
                      </p>
                    </div>
                    <Badge className={getOrderStatusColor(order.status as any)}>
                      {getOrderStatusLabel(order.status as any)}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">Poids:</span>
                      <span className="ml-1 font-medium">{order.weight} kg</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Prix:</span>
                      <span className="ml-1 font-medium">
                        {order.total_price.toLocaleString()} {getCurrencySymbol(order.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Status Updater V2 with logistics sync */}
                  <MissionStatusUpdaterV2
                    orderId={order.id}
                    currentStatus={order.status}
                    gpProfileId={gpProfile.id}
                    gpName={gpName}
                    orderNumber={order.order_number}
                    onStatusUpdated={loadData}
                  />

                  {/* Logistics indicator */}
                  {order.has_delivery_logistics && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Truck className="w-3 h-3" />
                      <span>Livraison dernier km par Yobbanté</span>
                    </div>
                  )}

                  {/* View Details */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-muted-foreground"
                    onClick={() => navigate(`/gp/order/${order.id}`)}
                  >
                    Voir les détails
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </GPDashboardLayout>
  );
}
