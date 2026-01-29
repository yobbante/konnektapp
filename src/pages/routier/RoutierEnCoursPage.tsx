import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, MapPin, Clock, Truck, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { useToast } from "@/hooks/use-toast";

const STATUS_STEPS = [
  { key: "accepted", label: "Accepté", icon: CheckCircle },
  { key: "collected", label: "Pris en charge", icon: Package },
  { key: "in_transit", label: "En route", icon: Truck },
  { key: "delivered", label: "Livré", icon: CheckCircle },
];

export default function RoutierEnCoursPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

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

      // Load active orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("gp_id", gp.id)
        .in("status", ["accepted", "collected", "in_transit"])
        .order("created_at", { ascending: false });

      if (!ordersError && orders) {
        setActiveOrders(orders);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: "accepted" | "collected" | "in_transit" | "delivered") => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      toast({ title: "Statut mis à jour ✓" });
      loadData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const getNextStatus = (currentStatus: string): "accepted" | "collected" | "in_transit" | "delivered" | null => {
    const statusFlow: ("accepted" | "collected" | "in_transit" | "delivered")[] = ["accepted", "collected", "in_transit", "delivered"];
    const currentIndex = statusFlow.indexOf(currentStatus as any);
    if (currentIndex >= 0 && currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1];
    }
    return null;
  };

  const getStatusLabel = (status: string) => {
    const step = STATUS_STEPS.find(s => s.key === status);
    return step?.label || status;
  };

  if (loading) {
    return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  }

  if (!gpProfile) {
    return null;
  }

  return (
    <RoutierDashboardLayout
      gpProfile={gpProfile}
      pendingCount={0}
      activeOrdersCount={activeOrders.length}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Transports en cours</h2>
          <Badge variant="secondary">{activeOrders.length} actifs</Badge>
        </div>

        {activeOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Aucun transport en cours</p>
              <p className="text-xs text-muted-foreground">
                Acceptez des demandes pour les voir apparaître ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => {
              const nextStatus = getNextStatus(order.status);
              
              return (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    {/* Order number & Status */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-muted-foreground">
                        #{order.order_number}
                      </span>
                      <Badge variant="secondary">
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">{order.origin_city}</span>
                      <span className="text-muted-foreground">→</span>
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium">{order.destination_city}</span>
                    </div>

                    {/* Progress steps */}
                    <div className="flex items-center justify-between mb-4">
                      {STATUS_STEPS.map((step, index) => {
                        const isCompleted = STATUS_STEPS.findIndex(s => s.key === order.status) >= index;
                        const Icon = step.icon;
                        
                        return (
                          <div key={step.key} className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isCompleted ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className={`text-[9px] mt-1 ${
                              isCompleted ? "text-primary" : "text-muted-foreground"
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action */}
                    {nextStatus && (
                      <Button
                        className="w-full"
                        onClick={() => updateStatus(order.id, nextStatus)}
                      >
                        Passer à : {getStatusLabel(nextStatus)}
                      </Button>
                    )}

                    {order.status === "delivered" && (
                      <div className="text-center text-green-600 font-medium">
                        ✓ Transport terminé
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RoutierDashboardLayout>
  );
}
