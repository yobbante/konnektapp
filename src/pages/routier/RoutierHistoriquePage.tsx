import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { History, MapPin, CheckCircle, XCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

export default function RoutierHistoriquePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

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

      const { data: gp, error: gpError } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("gp_type", "routier")
        .maybeSingle();

      if (gpError || !gp) {
        navigate("/routier/inscription");
        return;
      }

      setGpProfile(gp);

      // Load completed/cancelled orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("gp_id", gp.id)
        .in("status", ["delivered", "cancelled"])
        .order("updated_at", { ascending: false })
        .limit(50);

      if (!ordersError && orders) {
        setHistory(orders);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  }

  if (!gpProfile) {
    return null;
  }

  const deliveredCount = history.filter(o => o.status === "delivered").length;
  const cancelledCount = history.filter(o => o.status === "cancelled").length;

  return (
    <RoutierDashboardLayout
      gpProfile={gpProfile}
      pendingCount={0}
      activeOrdersCount={0}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Historique</h2>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {deliveredCount} livrés
            </Badge>
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              {cancelledCount} annulés
            </Badge>
          </div>
        </div>

        {history.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun historique</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {history.map((order) => (
              <Card key={order.id} className={order.status === "cancelled" ? "opacity-60" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {order.status === "delivered" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-1 text-sm">
                          <span>{order.origin_city}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{order.destination_city}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(order.updated_at).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {order.total_price.toLocaleString()} {order.currency}
                      </p>
                      <Badge 
                        variant={order.status === "delivered" ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {order.status === "delivered" ? "Livré" : "Annulé"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoutierDashboardLayout>
  );
}
