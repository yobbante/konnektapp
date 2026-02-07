import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, AlertTriangle, ListChecks, ScanLine, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { UniversalScanner } from "@/components/scan/UniversalScanner";
import { BulkScanner } from "@/components/scan/BulkScanner";
import { GeolocationConsentCard } from "@/components/scan/GeolocationConsentCard";
import { useGPGeolocation } from "@/hooks/useGPGeolocation";

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
}

/**
 * GPScanPage - KONNEKT SCAN CORE + GeoTrack™ integration for GP
 * 
 * Features:
 * - ScanFlow™: Unitary and batch scanning
 * - GeoTrack™: Passive geolocation for auto-status updates
 * - ScanTrust™: Duplicate scan prevention
 */
export default function GPScanPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const geo = useGPGeolocation(gpProfile?.id || null, userId);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">KONNEKT SCAN</h2>
          <div className="flex items-center gap-1.5">
            {geo.trackingActive && (
              <Badge variant="outline" className="gap-1 text-[10px] border-green-300 text-green-700">
                <Globe className="w-2.5 h-2.5" />
                GeoTrack
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1 text-xs">
              <QrCode className="w-3 h-3" />
              ScanFlow™
            </Badge>
          </div>
        </div>

        {/* GeoTrack™ Card */}
        <GeolocationConsentCard
          consentGiven={geo.consentGiven}
          trackingActive={geo.trackingActive}
          lastCountry={geo.lastCountry}
          lastCity={geo.lastCity}
          lastCheckAt={geo.lastCheckAt}
          loading={geo.loading}
          onGiveConsent={geo.giveConsent}
          onToggleTracking={geo.toggleTracking}
          onRevokeConsent={geo.revokeConsent}
        />
        
        {/* Scan Tabs */}
        <Tabs defaultValue="single">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="single" className="gap-1.5">
              <ScanLine className="w-3 h-3" />
              Scan unitaire
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-1.5">
              <ListChecks className="w-3 h-3" />
              Scan en lot
            </TabsTrigger>
          </TabsList>
          <TabsContent value="single" className="mt-4">
            <UniversalScanner onComplete={loadData} />
          </TabsContent>
          <TabsContent value="batch" className="mt-4">
            <BulkScanner gpId={gpProfile.id} onComplete={loadData} />
          </TabsContent>
        </Tabs>
      </div>
    </GPDashboardLayout>
  );
}
