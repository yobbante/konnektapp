import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { GPOverviewTab } from "@/components/gp/dashboard/GPOverviewTab";
import { PageLoader } from "@/components/ui/PageLoader";
import { supabase } from "@/integrations/supabase/client";

/**
 * GP Aperçu Page — Overview/dashboard summary tab
 * Positioned first in the navigation
 */
export default function GPAperçuPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { navigate("/gp/inscription"); return; }
      setGpProfile(profile);

      // Load counts
      const { data: orders } = await supabase
        .from("orders")
        .select("status")
        .eq("gp_id", profile.id);

      setPendingCount(orders?.filter(o => o.status === "pending").length || 0);
      setActiveCount(orders?.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length || 0);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeCount}
      activeTab="apercu"
    >
      <GPOverviewTab gpId={gpProfile.id} gpProfile={gpProfile} />
    </GPDashboardLayout>
  );
}
