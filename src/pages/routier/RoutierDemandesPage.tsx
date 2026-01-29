import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, MapPin, Scale, Clock, Check, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { useToast } from "@/hooks/use-toast";

interface FreightRequest {
  id: string;
  order_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  weight: number;
  description: string;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
}

export default function RoutierDemandesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [requests, setRequests] = useState<FreightRequest[]>([]);

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

      // Load GP profile
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

      // Load pending orders for this transporter
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("gp_id", gp.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!ordersError && orders) {
        setRequests(orders);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "accepted" as const })
        .eq("id", orderId);

      if (error) throw error;

      toast({ title: "Transport accepté ✓" });
      loadData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleRefuse = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;

      toast({ title: "Demande refusée" });
      loadData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (loading) {
    return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  }

  if (!gpProfile) {
    return null;
  }

  const pendingCount = requests.length;

  return (
    <RoutierDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={0}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Nouvelles demandes</h2>
          <Badge variant="secondary">{pendingCount} en attente</Badge>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Aucune demande en attente</p>
              <p className="text-xs text-muted-foreground">
                Les demandes de transport compatibles avec vos véhicules apparaîtront ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <Card key={request.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Route */}
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">{request.origin_city}</span>
                    <span className="text-muted-foreground">→</span>
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">{request.destination_city}</span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Scale className="w-3 h-3 text-muted-foreground" />
                      <span>{request.weight} kg</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span>{new Date(request.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <div className="font-semibold text-primary text-right">
                      {request.total_price.toLocaleString()} {request.currency}
                    </div>
                  </div>

                  {/* Description */}
                  {request.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {request.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive border-destructive/30"
                      onClick={() => handleRefuse(request.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Refuser
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAccept(request.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accepter
                    </Button>
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
