/**
 * GPScanPage — V1 TERRAIN
 * 
 * Refactored:
 * - "Mon QR" tab shows UNIQUE GP QR with role-based scan info
 * - Scanner tab opens camera immediately
 * - Lot tab for batch scanning
 * 
 * GP QR is:
 * - Unique, dynamic, linked to GP identity
 * - Role of scanner determines what info is shown
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, AlertTriangle, ListChecks, Camera, User, Shield, Truck, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { UniversalScanner } from "@/components/scan/UniversalScanner";
import { BulkScanner } from "@/components/scan/BulkScanner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import QRCode from "react-qr-code";

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [activeTab, setActiveTab] = useState("scanner");
  const [activeOffersCount, setActiveOffersCount] = useState(0);

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

      const [{ count: pending }, { count: active }, { count: offers }] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("gp_id", profile.id).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("gp_id", profile.id).in("status", ["accepted", "collected", "in_transit"]),
        supabase.from("gp_offers").select("*", { count: "exact", head: true }).eq("gp_id", profile.id).eq("status", "active"),
      ]);

      setPendingCount(pending || 0);
      setActiveOrdersCount(active || 0);
      setActiveOffersCount(offers || 0);
    } catch (error) {
      console.error("Error:", error);
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

  // Build GP QR data — encoded JSON with GP identity
  const gpQRData = JSON.stringify({
    type: "gp_profile",
    gp_id: gpProfile.id,
    name: gpProfile.business_name,
    v: 1, // version
  });

  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeOrdersCount} activeTab="scan">
      <div className="px-4 py-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full h-11">
            <TabsTrigger value="scanner" className="gap-1.5 text-xs">
              <Camera className="w-3.5 h-3.5" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="myqr" className="gap-1.5 text-xs">
              <QrCode className="w-3.5 h-3.5" />
              Mon QR
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-1.5 text-xs">
              <ListChecks className="w-3.5 h-3.5" />
              Lot
            </TabsTrigger>
          </TabsList>

          {/* Scanner Tab */}
          <TabsContent value="scanner" className="mt-3">
            <UniversalScanner onComplete={loadData} />
          </TabsContent>

          {/* Mon QR — GP's unique QR with role-based info */}
          <TabsContent value="myqr" className="mt-3">
            <Card className="border-primary/20 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
              <CardContent className="p-5 text-center space-y-4">
                {/* GP Identity */}
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{gpProfile.business_name}</h3>
                  {gpProfile.base_origin_city && gpProfile.base_destination_city && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {gpProfile.base_origin_city} → {gpProfile.base_destination_city}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {gpProfile.verified_at && (
                      <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 gap-1">
                        <Shield className="w-3 h-3" />
                        Vérifié
                      </Badge>
                    )}
                    {gpProfile.rating && (
                      <Badge variant="outline" className="text-[10px]">
                        ⭐ {gpProfile.rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* QR Code */}
                <div className="bg-white p-4 rounded-xl inline-block mx-auto shadow-sm">
                  <QRCode
                    value={gpQRData}
                    size={180}
                    level="H"
                  />
                </div>

                <Badge variant="secondary" className="text-xs">
                  ID: GP-{gpProfile.id.slice(0, 8).toUpperCase()}
                </Badge>

                {/* Role-based scan info */}
                <div className="space-y-2 text-left">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Informations visibles par le scanneur
                  </p>
                  <div className="space-y-1.5">
                    <RoleScanInfo 
                      icon={User} 
                      role="Client" 
                      info="Profil public + départs disponibles" 
                      color="text-blue-600"
                    />
                    <RoleScanInfo 
                      icon={Truck} 
                      role="Autre GP" 
                      info="Informations limitées" 
                      color="text-purple-600"
                    />
                    <RoleScanInfo 
                      icon={Shield} 
                      role="Admin / Agent" 
                      info="Accès étendu (commandes, statuts)" 
                      color="text-amber-600"
                    />
                    <RoleScanInfo 
                      icon={Package} 
                      role="Livreur" 
                      info="Commandes liées enlèvement/livraison" 
                      color="text-green-600"
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold">{activeOrdersCount}</p>
                    <p className="text-[10px] text-muted-foreground">En cours</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold">{gpProfile.total_deliveries || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Livrés</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold">{activeOffersCount}</p>
                    <p className="text-[10px] text-muted-foreground">Offres</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Batch Tab */}
          <TabsContent value="batch" className="mt-3">
            <BulkScanner gpId={gpProfile.id} onComplete={loadData} />
          </TabsContent>
        </Tabs>
      </div>
    </GPDashboardLayout>
  );
}

/* ─── Role Scan Info Row ─── */
function RoleScanInfo({ icon: Icon, role, info, color }: { icon: any; role: string; info: string; color: string }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
      <Icon className={`w-3.5 h-3.5 ${color} flex-shrink-0`} />
      <div className="min-w-0">
        <span className="text-xs font-medium">{role}</span>
        <span className="text-[10px] text-muted-foreground ml-1.5">→ {info}</span>
      </div>
    </div>
  );
}
