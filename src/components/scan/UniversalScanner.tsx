/**
 * UniversalScanner - Role-based QR scanner component
 * 
 * Adapts behavior based on user role:
 * - Client: View order status + scan history (read-only)
 * - GP: Deposit confirm + weight modify + delivery confirm
 * - Agent Logistique: Pickup + delivery + stock confirm
 * - Admin: Full access to all actions
 * 
 * Security: Each scan is logged to scan_logs. Same action can't trigger twice.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  QrCode, Package, Truck, CheckCircle, Scale, 
  Eye, MapPin, Clock, AlertTriangle, ScanLine,
  ShieldCheck, User, Phone, History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { useScanRole, ScanRole } from "@/hooks/useScanRole";
import { QRCameraScanner } from "@/components/gp/QRCameraScanner";
import { ScanResultClient } from "./ScanResultClient";
import { ScanResultGP } from "./ScanResultGP";
import { ScanResultAgent } from "./ScanResultAgent";

interface ScannedOrderData {
  id: string;
  order_number: string;
  status: string;
  weight: number;
  total_price: number;
  currency: string;
  origin_city: string;
  destination_city: string;
  origin_country: string;
  destination_country: string;
  description: string | null;
  client_id: string;
  gp_id: string;
  price_per_kg: number;
  delivery_date: string | null;
  client_name?: string | null;
  gp_name?: string | null;
  client_phone?: string | null;
  delivery_address?: string | null;
  scan_history?: Array<{
    action: string;
    user_role: string;
    created_at: string;
  }>;
}

interface UniversalScannerProps {
  onComplete?: () => void;
}

export function UniversalScanner({ onComplete }: UniversalScannerProps) {
  const { toast } = useToast();
  const { scanRole, permissions, loading: roleLoading, userId, gpId, logScan } = useScanRole();
  const [manualCode, setManualCode] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannedOrder, setScannedOrder] = useState<ScannedOrderData | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleCameraScan = (code: string) => {
    setCameraOpen(false);
    lookupOrder(code.toUpperCase());
  };

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) return;
    await lookupOrder(manualCode.trim().toUpperCase());
  };

  const lookupOrder = async (code: string) => {
    setLoading(true);
    try {
      // Build query based on role
      let query = supabase
        .from("orders")
        .select(`
          id, order_number, status, weight, total_price, currency,
          origin_city, destination_city, origin_country, destination_country,
          description, client_id, gp_id, price_per_kg, delivery_date
        `)
        .or(`order_number.eq.${code},tracking_code.eq.${code}`);

      // GP can only scan their own orders
      if (scanRole === "gp" && gpId) {
        query = query.eq("gp_id", gpId);
      }

      const { data: order, error } = await query.single();

      if (error || !order) {
        toast({
          title: scanRole === "gp" 
            ? "Commande non trouvée pour votre profil" 
            : "Commande non trouvée",
          description: "Vérifiez le code et réessayez",
          variant: "destructive",
        });
        return;
      }

      // Fetch additional data based on permissions
      let clientName: string | null = null;
      let gpName: string | null = null;
      let clientPhone: string | null = null;
      let deliveryAddress: string | null = null;

      if (permissions.canViewContact || scanRole === "admin") {
        const [clientResult, gpResult] = await Promise.all([
          supabase.from("profiles").select("full_name, phone").eq("user_id", order.client_id).single(),
          supabase.from("gp_profiles").select("business_name").eq("id", order.gp_id).single(),
        ]);
        clientName = clientResult.data?.full_name || null;
        clientPhone = clientResult.data?.phone || null;
        gpName = gpResult.data?.business_name || null;
      } else if (scanRole === "client") {
        // Client can see GP name
        const { data: gpData } = await supabase
          .from("public_gp_profiles")
          .select("business_name")
          .eq("id", order.gp_id)
          .single();
        gpName = gpData?.business_name || null;
      }

      // Get delivery address for agents
      if (permissions.canDeliver) {
        const { data: logistics } = await supabase
          .from("order_logistics_options")
          .select("delivery_address")
          .eq("order_id", order.id)
          .single();
        deliveryAddress = logistics?.delivery_address || null;
      }

      // Get scan history
      const { data: history } = await supabase
        .from("scan_logs")
        .select("action, user_role, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // Log this scan
      await logScan(order.id, "view", "qr");

      setScannedOrder({
        ...order,
        client_name: clientName,
        gp_name: gpName,
        client_phone: clientPhone,
        delivery_address: deliveryAddress,
        scan_history: history || [],
      });
      setShowResult(true);
    } catch (err) {
      console.error("Lookup error:", err);
      toast({ title: "Erreur de recherche", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowResult(false);
    setScannedOrder(null);
    setManualCode("");
  };

  const handleActionComplete = () => {
    handleClose();
    onComplete?.();
  };

  const roleLabels: Record<string, { label: string; color: string; icon: any }> = {
    client: { label: "Mode Client", color: "bg-blue-100 text-blue-800", icon: Eye },
    gp: { label: "Mode Transporteur", color: "bg-primary/10 text-primary", icon: Truck },
    agent_logistique: { label: "Mode Livreur", color: "bg-amber-100 text-amber-800", icon: Package },
    admin: { label: "Mode Admin", color: "bg-purple-100 text-purple-800", icon: ShieldCheck },
  };

  const currentRole = roleLabels[scanRole || "client"];

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Role Badge */}
      <div className="flex items-center justify-between">
        <Badge className={`gap-1.5 ${currentRole.color}`}>
          <currentRole.icon className="w-3 h-3" />
          {currentRole.label}
        </Badge>
        <Badge variant="outline" className="gap-1 text-xs">
          <QrCode className="w-3 h-3" />
          KONNEKT SCAN
        </Badge>
      </div>

      {/* Scanner Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine className="w-4 h-4" />
            Scanner un colis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {scanRole === "client" 
              ? "Scannez le QR code pour voir le statut de votre colis"
              : scanRole === "gp"
              ? "Scannez pour confirmer dépôt ou livraison"
              : scanRole === "agent_logistique"
              ? "Scannez pour enlèvement ou livraison"
              : "Scannez pour gérer le colis"
            }
          </p>

          {/* Camera Button */}
          <Button
            variant="outline"
            className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10"
            onClick={() => setCameraOpen(true)}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <ScanLine className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary">
              Ouvrir la caméra
            </span>
          </Button>

          <QRCameraScanner
            isOpen={cameraOpen}
            onScan={handleCameraScan}
            onClose={() => setCameraOpen(false)}
          />

          {/* Manual Entry */}
          <div className="space-y-2">
            <Label>Numéro de commande</Label>
            <div className="flex gap-2">
              <Input
                placeholder="CMD-XXXXXXXX"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <Button
                onClick={handleManualSubmit}
                disabled={loading || !manualCode.trim()}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Valider"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result Sheet */}
      <Sheet open={showResult} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              <QrCode className="w-4 h-4" />
              Résultat du scan
            </SheetTitle>
          </SheetHeader>

          {scannedOrder && (
            <>
              {scanRole === "client" && (
                <ScanResultClient order={scannedOrder} />
              )}
              {scanRole === "gp" && (
                <ScanResultGP 
                  order={scannedOrder} 
                  gpId={gpId!}
                  logScan={logScan}
                  onComplete={handleActionComplete} 
                />
              )}
              {scanRole === "agent_logistique" && (
                <ScanResultAgent 
                  order={scannedOrder}
                  logScan={logScan}
                  onComplete={handleActionComplete}
                />
              )}
              {scanRole === "admin" && (
                <ScanResultAgent 
                  order={scannedOrder}
                  logScan={logScan}
                  onComplete={handleActionComplete}
                  isAdmin
                />
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
