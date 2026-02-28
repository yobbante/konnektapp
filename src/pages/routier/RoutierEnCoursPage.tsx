import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { RoutierActiveOrders } from "@/components/routier/RoutierActiveOrders";

export default function RoutierEnCoursPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: gp } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("gp_type", "routier")
        .maybeSingle();

      if (!gp) { navigate("/routier/inscription"); return; }
      setGpProfile(gp);

      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("gp_id", gp.id)
        .in("status", ["accepted", "collected", "in_transit", "arrived_destination", "delivery_pending"]);

      setActiveCount(count || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  if (!gpProfile) return null;

  return (
    <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={0} activeOrdersCount={activeCount}>
      <div className="p-4">
        <RoutierActiveOrders gpId={gpProfile.id} />
      </div>
    </RoutierDashboardLayout>
  );
}
