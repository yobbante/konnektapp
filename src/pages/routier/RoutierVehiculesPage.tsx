import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VehicleManagement } from "@/components/gp/VehicleManagement";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

export default function RoutierVehiculesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);

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
          <h2 className="text-lg font-bold">Mes véhicules</h2>
        </div>

        <Card>
          <CardContent className="p-4">
            <VehicleManagement 
              gpId={gpProfile.id} 
              gpType="routier"
            />
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Car className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                  Gérez votre flotte
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Sans véhicule actif, vous ne recevrez pas de demandes. 
                  Ajoutez ou activez au moins un véhicule pour être visible.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoutierDashboardLayout>
  );
}
