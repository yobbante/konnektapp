import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Star, Truck, MapPin, Shield, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { TrustLevelBadge, type TrustLevel } from "@/components/ui/trust-level-badge";

export default function RoutierProfilPublicPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    rating: 0,
    responseRate: 0,
  });

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
      setStats({
        totalDeliveries: gp.total_deliveries || 0,
        rating: gp.rating || 0,
        responseRate: 95,
      });

      // Load vehicles
      const { data: vehicleData } = await supabase
        .from("vehicles")
        .select("*")
        .eq("gp_id", gp.id)
        .eq("is_active", true);

      if (vehicleData) {
        setVehicles(vehicleData);
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

  return (
    <RoutierDashboardLayout
      gpProfile={gpProfile}
      pendingCount={0}
      activeOrdersCount={0}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Profil public</h2>
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-1" />
            Voir comme client
          </Button>
        </div>

        {/* Profile Preview */}
        <Card>
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-2xl font-bold">
                {gpProfile.business_name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold">{gpProfile.business_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">Transport Routier</Badge>
                  <TrustLevelBadge level={(gpProfile.status === "verified" ? "verified" : "basic") as TrustLevel} />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center gap-1 text-lg font-bold">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  {stats.rating.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">Note</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-lg font-bold">{stats.totalDeliveries}</p>
                <p className="text-xs text-muted-foreground">Livraisons</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-lg font-bold">{stats.responseRate}%</p>
                <p className="text-xs text-muted-foreground">Réponse</p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <MapPin className="w-4 h-4" />
              <span>{gpProfile.city}, {gpProfile.country_code}</span>
            </div>

            {/* Verification */}
            {gpProfile.status === "verified" && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800 dark:text-green-200">
                  Profil vérifié par Yobbanté
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicles */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Flotte ({vehicles.length} véhicule{vehicles.length > 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun véhicule actif
              </p>
            ) : (
              <div className="space-y-2">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{vehicle.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {vehicle.vehicle_type.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    {vehicle.max_weight_kg && (
                      <Badge variant="outline">
                        {(vehicle.max_weight_kg / 1000).toFixed(1)}t
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zones */}
        {gpProfile.zones_covered && gpProfile.zones_covered.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Zones couvertes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {gpProfile.zones_covered.map((zone: string) => (
                  <Badge key={zone} variant="secondary">
                    {zone}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RoutierDashboardLayout>
  );
}
