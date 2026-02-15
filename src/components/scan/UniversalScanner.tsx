/**
 * UniversalScanner - Role-based QR scanner component
 * 
 * NOW POWERED BY KonnektScanEngine — all decisions are backend-driven.
 * 
 * Handles ALL QR types:
 * - QR_COLIS: Order/parcel → role-specific result sheet
 * - QR_USER / QR_GP: Identity → profile/orders resolution
 * - QR_PAYMENT: Payment verification
 * - QR_ADJUSTMENT: Weight adjustment redirect
 * - QR_CONFIRMATION: Reception confirmation
 * - QR_EXTERNAL: External QR handling
 * 
 * Security: Rate limited, idempotent, signature-verified via backend.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  QrCode, Package, Truck, Scale, 
  Eye, ScanLine, ShieldCheck, Keyboard,
  Globe, CreditCard, AlertTriangle, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useScanRole } from "@/hooks/useScanRole";
import { useScanEngine } from "@/hooks/useScanEngine";
import { KonnektScanEngine, type ScanEngineResponse } from "@/lib/scanEngine";
import { QRCameraScanner } from "@/components/gp/QRCameraScanner";
import { ScanResultClient } from "./ScanResultClient";
import { ScanResultGP } from "./ScanResultGP";
import { ScanResultAgent } from "./ScanResultAgent";
import { UnifiedScanRouter } from "./UnifiedScanRouter";

interface UniversalScannerProps {
  onComplete?: () => void;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: typeof Eye; description: string }> = {
  client: { label: "Client", color: "bg-primary/10 text-primary border-primary/30", icon: Eye, description: "Voir le statut de votre colis" },
  gp: { label: "Transporteur", color: "bg-secondary/10 text-secondary border-secondary/30", icon: Truck, description: "Confirmer dépôt ou livraison" },
  agent_logistique: { label: "Agent Konnekt", color: "bg-warning/10 text-warning border-warning/30", icon: Package, description: "Enlèvement ou livraison" },
  admin: { label: "Admin", color: "bg-accent/10 text-accent border-accent/30", icon: ShieldCheck, description: "Gestion complète" },
};

const QR_TYPE_ICONS: Record<string, typeof Package> = {
  QR_COLIS: Package,
  QR_USER: Eye,
  QR_GP: Truck,
  QR_PAYMENT: CreditCard,
  QR_ADJUSTMENT: Scale,
  QR_CONFIRMATION: CheckCircle,
  QR_EXTERNAL: Globe,
  QR_ADMIN: ShieldCheck,
};

export function UniversalScanner({ onComplete }: UniversalScannerProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { scanRole, permissions, loading: roleLoading, userId, gpId, logScan } = useScanRole();
  const [manualCode, setManualCode] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [showResult, setShowResult] = useState(false);
  
  // Engine-resolved state
  const [engineResponse, setEngineResponse] = useState<ScanEngineResponse | null>(null);
  
  // Legacy state for backward compat with existing result components
  const [scannedUserId, setScannedUserId] = useState<string | null>(null);
  const [scannedOrder, setScannedOrder] = useState<any>(null);

  const { resolve, loading } = useScanEngine({
    autoNavigate: false, // We handle navigation manually here
    onResult: (response) => {
      setEngineResponse(response);
    },
  });

  const handleScanResult = async (code: string) => {
    const result = await resolve(code, scanRole || undefined);
    if (!result) return;

    const { response, action } = result;

    // Route based on engine response
    switch (action.type) {
      case "navigate":
        if (action.target) navigate(action.target);
        return;

      case "external":
        if (action.target) window.open(action.target, "_blank");
        return;

      case "toast":
        toast({
          title: action.data?.title,
          description: action.data?.description,
          variant: action.data?.variant,
        });
        return;

      case "sheet":
        // Map engine response to legacy component data
        if (response.data?.order) {
          setScannedOrder(response.data.order);
          setScannedUserId(null);
        } else if (response.data?.user) {
          setScannedUserId(response.data.user.user_id || response.data.gp?.user_id);
          setScannedOrder(null);
        } else if (response.data?.show_manual_options) {
          // External QR — show in result sheet
          setScannedOrder(null);
          setScannedUserId(null);
        }
        setShowResult(true);
        break;

      default:
        if (response.status !== "failed") {
          setShowResult(true);
        }
        break;
    }
  };

  const handleCameraScan = (code: string) => {
    setCameraOpen(false);
    handleScanResult(code);
  };

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) return;
    await handleScanResult(manualCode.trim());
  };

  const handleClose = () => {
    setShowResult(false);
    setScannedOrder(null);
    setScannedUserId(null);
    setEngineResponse(null);
    setManualCode("");
  };

  const handleActionComplete = () => {
    handleClose();
    onComplete?.();
  };

  const currentRole = ROLE_CONFIG[scanRole || "client"];
  const QRIcon = engineResponse ? (QR_TYPE_ICONS[engineResponse.qr_type] || QrCode) : QrCode;

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
        <Badge variant="outline" className={`gap-1.5 ${currentRole.color}`}>
          <currentRole.icon className="w-3 h-3" />
          {currentRole.label}
        </Badge>
        <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
          <QrCode className="w-3 h-3" />
          SCAN ENGINE
        </Badge>
      </div>

      {/* Scanner Card */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-primary" />
            Scanner un QR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {currentRole.description}
          </p>

          {/* Camera Button */}
          <Button
            variant="outline"
            className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all"
            onClick={() => setCameraOpen(true)}
          >
            <motion.div 
              className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ScanLine className="w-7 h-7 text-primary" />
            </motion.div>
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
            <Label className="flex items-center gap-1.5 text-xs">
              <Keyboard className="w-3 h-3" />
              Saisie manuelle
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="CMD-XXXXXXXX ou UUID"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
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

          {/* Engine Status Indicator */}
          {engineResponse && !showResult && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
              <QRIcon className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground">
                Dernier scan: {KonnektScanEngine.getQRTypeLabel(engineResponse.qr_type)} — {engineResponse.message}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Sheet */}
      <Sheet open={showResult} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              <QRIcon className="w-4 h-4 text-primary" />
              {engineResponse ? KonnektScanEngine.getQRTypeLabel(engineResponse.qr_type) : "Résultat du scan"}
              {engineResponse && (
                <Badge variant="outline" className={`text-[10px] ml-auto ${KonnektScanEngine.getQRTypeColor(engineResponse.qr_type)}`}>
                  {engineResponse.scenario}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {/* Engine message */}
          {engineResponse && (
            <div className="mb-3 p-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              {engineResponse.message}
              {engineResponse.financial_impact && (
                <div className="mt-1 flex items-center gap-1 text-xs font-medium">
                  <CreditCard className="w-3 h-3" />
                  Impact: {engineResponse.financial_impact.amount?.toLocaleString()} {engineResponse.financial_impact.currency}
                </div>
              )}
            </div>
          )}

          {/* User QR scan result — delegate to UnifiedScanRouter */}
          {scannedUserId && (
            <UnifiedScanRouter
              scannedUserId={scannedUserId}
              onComplete={handleActionComplete}
            />
          )}

          {/* Order QR scan result — delegate to role-specific components */}
          {scannedOrder && !scannedUserId && (
            <>
              {scanRole === "client" && (
                <ScanResultClient order={scannedOrder} />
              )}
              {scanRole === "gp" && gpId && (
                <ScanResultGP 
                  order={scannedOrder} 
                  gpId={gpId}
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

          {/* External QR — manual options */}
          {!scannedOrder && !scannedUserId && engineResponse?.data?.show_manual_options && (
            <div className="py-8 space-y-4 text-center">
              <Globe className="w-12 h-12 text-muted-foreground mx-auto" />
              <h3 className="font-bold">QR Externe détecté</h3>
              <p className="text-sm text-muted-foreground">
                Ce code n'est pas reconnu par Konnekt.
              </p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    handleClose();
                    // Could navigate to manual parcel creation
                    toast({ title: "Fonctionnalité à venir", description: "Création de colis manuel depuis QR externe" });
                  }}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Créer un colis manuel
                </Button>
                {engineResponse.data?.is_url && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      window.open(engineResponse.data?.raw, "_blank");
                      handleClose();
                    }}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Ouvrir dans le navigateur
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* No data state */}
          {!scannedOrder && !scannedUserId && !engineResponse?.data?.show_manual_options && engineResponse?.status === "failed" && (
            <div className="py-8 text-center space-y-3">
              <AlertTriangle className="w-12 h-12 text-warning mx-auto" />
              <h3 className="font-bold">{engineResponse.message}</h3>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
