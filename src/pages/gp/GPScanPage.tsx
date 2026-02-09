/**
 * GPScanPage — V1 TERRAIN
 * 
 * Default: opens camera immediately for scan
 * Bottom tabs: Scanner | Mon QR | Lot
 * Camera ready in < 0.5s
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, AlertTriangle, ListChecks, ScanLine, Camera, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { UniversalScanner } from "@/components/scan/UniversalScanner";
import { BulkScanner } from "@/components/scan/BulkScanner";
import { OrderQRCode } from "@/components/client/OrderQRCode";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
}

export default function GPScanPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [activeTab, setActiveTab] = useState("scanner");

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

  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeOrdersCount} activeTab="scan">
      <div className="px-4 py-4 space-y-4">
        {/* Scan Tabs — Scanner first (default), Mon QR, Lot */}
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

          {/* Scanner Tab — Auto-opens camera */}
          <TabsContent value="scanner" className="mt-3">
            <UniversalScanner onComplete={loadData} />
          </TabsContent>

          {/* Mon QR — GP's own QR code for identification */}
          <TabsContent value="myqr" className="mt-3">
            <Card className="border-primary/20">
              <CardContent className="p-5 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{gpProfile.business_name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Présentez ce QR aux clients ou agents
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl inline-block mx-auto">
                  <OrderQRCode 
                    orderId={gpProfile.id} 
                    orderNumber={`GP-${gpProfile.id.slice(0, 8).toUpperCase()}`}
                    status="active"
                  />
                </div>
                <Badge variant="secondary" className="text-xs">
                  ID: GP-{gpProfile.id.slice(0, 8).toUpperCase()}
                </Badge>
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
