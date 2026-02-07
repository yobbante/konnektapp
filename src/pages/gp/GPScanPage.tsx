import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { UniversalScanner } from "@/components/scan/UniversalScanner";

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
}

/**
 * GPScanPage - KONNEKT SCAN CORE integration for GP
 * 
 * Uses UniversalScanner which auto-detects GP role and provides:
 * - Deposit confirmation with weight verification (PRV)
 * - Delivery confirmation
 * - Duplicate scan prevention
 * - Full audit trail via scan_logs
 */
export default function GPScanPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
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
        .select("id, business_name, gp_type, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { navigate("/gp/inscription"); return; }

      setGpProfile(profile);

      const [{ count: pending }, { count: active }] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("gp_id", profile.id).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("gp_id", profile.id).in("status", ["accepted", "collected", "in_transit"]),
      ]);

      setPendingCount(pending || 0);
      setActiveOrdersCount(active || 0);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  if (gpProfile.gp_type !== "bagages_international") {
    return (
      <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeOrdersCount} activeTab="scan">
        <div className="px-4 py-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Le scan QR est réservé aux transporteurs GP Bagages</p>
        </div>
      </GPDashboardLayout>
    );
  }

  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeOrdersCount} activeTab="scan">
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">KONNEKT SCAN</h2>
          <Badge variant="secondary" className="gap-1">
            <QrCode className="w-3 h-3" />
            ScanFlow™
          </Badge>
        </div>
        <UniversalScanner onComplete={loadData} />
      </div>
    </GPDashboardLayout>
  );
}
