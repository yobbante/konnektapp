import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, MessageCircle, Eye, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
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
}

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
}

/**
 * GPDemandesPage - Page des nouvelles demandes
 * 
 * Affiche les demandes en attente (status = 'pending')
 * Actions: Accepter / Refuser / Voir détails / Contacter
 */
export default function GPDemandesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);

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

      // Load pending orders only
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("gp_id", profile.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      setPendingOrders(orders || []);
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

  const handleAccept = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "accepted" })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "✅ Demande acceptée",
        description: "Le client sera notifié",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'accepter la demande",
        variant: "destructive",
      });
    }
  };

  const handleRefuse = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Demande refusée",
        description: "Le client sera notifié",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de refuser la demande",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <PageLoader message="Chargement des demandes..." />;
  }

  if (!gpProfile) return null;

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingOrders.length}
      activeTab="demandes"
    >
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Nouvelles demandes
          </h2>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {pendingOrders.length} en attente
          </Badge>
        </div>

        {pendingOrders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Aucune demande en attente</p>
              <p className="text-sm mt-1">Les nouvelles réservations apparaîtront ici</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map((order) => (
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
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
                      En attente
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
                    {order.pickup_date && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Dépôt prévu:</span>
                        <span className="ml-1 font-medium">
                          {format(new Date(order.pickup_date), "d MMMM yyyy", { locale: fr })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleAccept(order.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Accepter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleRefuse(order.id)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Refuser
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => navigate(`/gp/order/${order.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </GPDashboardLayout>
  );
}
