import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { History, Eye, Package, CheckCircle, XCircle } from "lucide-react";
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
  status: string;
  created_at: string;
  total_price: number;
  currency: string;
}

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
}

/**
 * GPHistoriquePage - Historique des livraisons
 * 
 * Affiche les livraisons terminées et annulées
 * Lecture seule - pas d'actions
 */
export default function GPHistoriquePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

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

      // Load completed and cancelled orders
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("gp_id", profile.id)
        .in("status", ["delivered", "cancelled"])
        .order("created_at", { ascending: false })
        .limit(50);

      setCompletedOrders(orders || []);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Livré
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Annulé
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-gray-500/10 text-gray-600 border-gray-200">
            Expiré
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <PageLoader message="Chargement de l'historique..." />;
  }

  if (!gpProfile) return null;

  const deliveredCount = completedOrders.filter(o => o.status === "delivered").length;
  const cancelledCount = completedOrders.filter(o => o.status === "cancelled").length;

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeTab="historique"
    >
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Historique
          </h2>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
              {deliveredCount} livrés
            </Badge>
            <Badge variant="secondary" className="bg-red-500/10 text-red-600">
              {cancelledCount} annulés
            </Badge>
          </div>
        </div>

        {completedOrders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Aucun historique</p>
              <p className="text-sm mt-1">Vos livraisons terminées apparaîtront ici</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {completedOrders.map((order) => (
              <Card 
                key={order.id} 
                className="overflow-hidden opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => navigate(`/gp/order/${order.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {order.origin_city} → {order.destination_city}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        #{order.order_number} • {format(new Date(order.created_at), "d MMM yyyy", { locale: fr })}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{order.weight} kg</span>
                        <span>•</span>
                        <span className="font-medium text-foreground">
                          {order.total_price.toLocaleString()} {getCurrencySymbol(order.currency)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status)}
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </div>
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
