/**
 * GPScanPage V2 — Uses UnifiedScanInterface inside GPDashboardLayout
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { UnifiedScanInterface } from "@/components/scan/UnifiedScanInterface";

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
  rating: number | null;
  total_deliveries: number | null;
  verified_at: string | null;
  base_origin_city: string | null;
  base_destination_city: string | null;
}

export default function GPScanPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status, rating, total_deliveries, verified_at, base_origin_city, base_destination_city")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { navigate("/gp/inscription"); return; }
      setGpProfile(profile);

      const [{ count: pending }, { count: active }] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("gp_id", profile.id).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("gp_id", profile.id).in("status", ["accepted", "collected", "in_transit", "checked_in"]),
      ]);

      setPendingCount(pending || 0);
      setActiveOrdersCount(active || 0);
    } catch (error) {
      console.error("GPScanPage error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader message="Chargement scanner..." />;
  if (!gpProfile) return null;

  // ── Restriction bagages_international ──
  if (gpProfile.gp_type !== "bagages_international") {
    return (
      <GPDashboardLayout
        gpProfile={gpProfile}
        pendingCount={pendingCount}
        activeOrdersCount={activeOrdersCount}
        activeTab="scan"
      >
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-400/60" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Scan réservé aux GP Bagages</p>
            <p className="text-sm text-muted-foreground mt-1">
              Le scanner QR est disponible uniquement pour les transporteurs GP Bagages Internationaux.
            </p>
          </div>
        </div>
      </GPDashboardLayout>
    );
  }

  const gpContext = {
    gpId: gpProfile.id,
    businessName: gpProfile.business_name,
    gpType: gpProfile.gp_type,
    verified: !!gpProfile.verified_at,
    rating: gpProfile.rating,
    totalDeliveries: gpProfile.total_deliveries,
    baseOriginCity: gpProfile.base_origin_city,
    baseDestinationCity: gpProfile.base_destination_city,
  };

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeOrdersCount}
      activeTab="scan"
    >
      <UnifiedScanInterface
        role="gp"
        gpContext={gpContext}
        onRefresh={loadData}
      />
    </GPDashboardLayout>
  );
}
