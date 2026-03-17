import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  QrCode, Camera, X, CheckCircle, AlertTriangle,
  Package, Scale, Truck, ScanLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { QRCameraScanner } from "./QRCameraScanner";

interface ScannedOrder {
  id: string;
  order_number: string;
  status: string;
  weight: number;
  total_price: number;
  currency: string;
  origin_city: string;
  destination_city: string;
  client_name: string | null;
  description: string | null;
  client_id: string;
}

interface QRCodeScannerProps {
  gpId: string;
  scanType: "deposit" | "delivery";
  onComplete?: () => void;
}

/**
 * QR Code Scanner for GP Bagages
 * 
 * - Deposit scan: Confirms package received, allows weight adjustment
 * - Delivery scan: Confirms package delivered to recipient
 * 
 * Clause tiers: Any person with the QR code is considered mandated
 */
export function QRCodeScanner({ gpId, scanType, onComplete }: QRCodeScannerProps) {
  const { toast } = useToast();
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannedOrder, setScannedOrder] = useState<ScannedOrder | null>(null);
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  
  // Weight adjustment for deposit
  const [actualWeight, setActualWeight] = useState<string>("");
  const [weightDifference, setWeightDifference] = useState<number>(0);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);

  // Handle QR camera scan result
  const handleCameraScan = (code: string) => {
    setCameraOpen(false);
    lookupOrder(code.toUpperCase());
  };

  // Handle manual code entry
  const handleManualSubmit = async () => {
    if (!manualCode.trim()) {
      toast({ title: "Code requis", variant: "destructive" });
      return;
    }
    await lookupOrder(manualCode.trim().toUpperCase());
  };

  // Lookup order by code
  const lookupOrder = async (code: string) => {
    setLoading(true);
    try {
      // Try order_number or tracking_code
      const { data: order, error } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, weight, total_price, currency,
          origin_city, destination_city, description, price_per_kg,
          client_id
        `)
        .eq("gp_id", gpId)
        .or(`order_number.eq.${code},tracking_code.eq.${code}`)
        .single();

      if (error || !order) {
        toast({ 
          title: "Commande non trouvée", 
          description: "Vérifiez le code et réessayez",
          variant: "destructive" 
        });
        return;
      }

      // Validate status for scan type
      if (scanType === "deposit" && !["accepted", "pending"].includes(order.status)) {
        toast({ 
          title: "Statut invalide", 
          description: `Cette commande est déjà "${order.status}"`,
          variant: "destructive" 
        });
        return;
      }

      if (scanType === "delivery" && order.status !== "in_transit") {
        toast({ 
          title: "Statut invalide", 
          description: "Cette commande n'est pas en transit",
          variant: "destructive" 
        });
        return;
      }

      // Get client info
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", order.client_id)
        .single();

      setScannedOrder({
        ...order,
        client_name: profile?.full_name || null,
      });
      setActualWeight(order.weight.toString());
      setShowConfirmSheet(true);
    } catch (err) {
      console.error("Lookup error:", err);
      toast({ title: "Erreur de recherche", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Calculate weight adjustment
  useEffect(() => {
    if (!scannedOrder || !actualWeight) return;
    
    const actual = parseFloat(actualWeight) || 0;
    const declared = scannedOrder.weight;
    const diff = actual - declared;
    const pricePerKg = scannedOrder.total_price / declared;
    
    setWeightDifference(diff);
    setAdjustmentAmount(Math.round(diff * pricePerKg));
  }, [actualWeight, scannedOrder]);

  // Confirm deposit
  // PRV RULE: If weight is modified, freeze order until client validates
  const confirmDeposit = async () => {
    if (!scannedOrder) return;
    
    setLoading(true);
    try {
      const actual = parseFloat(actualWeight) || scannedOrder.weight;
      const hasWeightChange = Math.abs(weightDifference) > 0.01;
      const { data: { user } } = await supabase.auth.getUser();

      if (hasWeightChange) {
        // PRV: FREEZE ORDER - Don't change status to collected yet
        // Set weight_tier_applied as flag for pending validation (as string to match column type)
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            weight_tier_applied: actual.toString(), // Store actual weight for validation
            // Keep status as-is (accepted/pending) - DON'T set to collected
          })
          .eq("id", scannedOrder.id);

        if (updateError) throw updateError;

        // Log the weight modification requiring validation
        if (user) {
          await supabase.from("order_status_history").insert({
            order_id: scannedOrder.id,
            status: scannedOrder.status as any, // Keep current status
            changed_by: user.id,
            changed_by_type: "gp",
            notes: `⚠️ POIDS MODIFIÉ - EN ATTENTE VALIDATION CLIENT: ${scannedOrder.weight} kg → ${actual} kg. Différence prix poids: ${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount} ${scannedOrder.currency}`,
          });
        }

        // Create CRITICAL notification for client
        await supabase.from("notifications").insert({
          user_id: scannedOrder.client_id,
          type: "weight_validation_required",
          title: "Validation requise - Modification de poids",
          message: `Le transporteur a mesuré un poids différent pour ${scannedOrder.order_number}. Veuillez valider ou refuser depuis votre espace.`,
          related_type: "order",
          related_id: scannedOrder.id,
        });

        toast({
          title: "Poids modifie",
          description: "En attente de validation client. Le colis ne peut pas encore être pris en charge.",
          variant: "default",
        });
      } else {
        // No weight change - proceed normally to collected
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: "collected",
            weight: actual,
          })
          .eq("id", scannedOrder.id);

        if (updateError) throw updateError;

        // Add status history
        if (user) {
          await supabase.from("order_status_history").insert({
            order_id: scannedOrder.id,
            status: "collected",
            changed_by: user.id,
            changed_by_type: "gp",
            notes: "Colis reçu confirmé par scan QR - Poids vérifié conforme",
          });
        }

        // Create notification for client
        await supabase.from("notifications").insert({
          user_id: scannedOrder.client_id,
          type: "order_update",
          title: "Colis recu",
          message: `Votre colis ${scannedOrder.order_number} a été reçu par le transporteur`,
          related_type: "order",
          related_id: scannedOrder.id,
        });

        toast({
          title: "Colis confirme",
          description: "Statut mis à jour: Colis reçu",
        });
      }

      setShowConfirmSheet(false);
      setScannedOrder(null);
      setManualCode("");
      onComplete?.();
    } catch (err) {
      console.error("Confirm error:", err);
      toast({ title: "Erreur de confirmation", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Confirm delivery
  const confirmDelivery = async () => {
    if (!scannedOrder) return;
    
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "delivered",
          actual_delivery_date: new Date().toISOString(),
        })
        .eq("id", scannedOrder.id);

      if (updateError) throw updateError;

      // Add status history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("order_status_history").insert({
          order_id: scannedOrder.id,
          status: "delivered",
          changed_by: user.id,
          changed_by_type: "gp",
          notes: "Livraison confirmée par scan QR",
        });
      }

      // Create notification for client
      await supabase.from("notifications").insert({
        user_id: scannedOrder.client_id,
        type: "order_update",
        title: "🎉 Colis livré",
        message: `Votre colis ${scannedOrder.order_number} a été livré avec succès !`,
        related_type: "order",
        related_id: scannedOrder.id,
      });

      toast({
        title: "🎉 Livraison confirmée",
        description: "Mission terminée avec succès",
      });

      setShowConfirmSheet(false);
      setScannedOrder(null);
      setManualCode("");
      onComplete?.();
    } catch (err) {
      console.error("Delivery confirm error:", err);
      toast({ title: "Erreur de confirmation", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isDeposit = scanType === "deposit";

  return (
    <div className="space-y-4">
      {/* Manual Entry */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            {isDeposit ? "Scanner dépôt" : "Scanner livraison"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isDeposit 
              ? "Scannez le QR code du client ou entrez le numéro de commande"
              : "Scannez le QR pour confirmer la livraison au destinataire"
            }
          </p>

          {/* Camera scan button - Opens real QR scanner */}
          <Button
            variant="outline"
            className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10"
            onClick={() => setCameraOpen(true)}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <ScanLine className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary">
              Ouvrir la caméra QR
            </span>
          </Button>

          {/* QR Camera Scanner Modal */}
          <QRCameraScanner
            isOpen={cameraOpen}
            onScan={handleCameraScan}
            onClose={() => setCameraOpen(false)}
          />

          {/* Manual entry */}
          <div className="space-y-2">
            <Label>Numéro de commande</Label>
            <div className="flex gap-2">
              <Input
                placeholder="ORD-XXXXXX"
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

      {/* Confirmation Sheet */}
      <Sheet open={showConfirmSheet} onOpenChange={setShowConfirmSheet}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              {isDeposit ? (
                <>
                  <Package className="w-5 h-5 text-primary" />
                  Confirmer le dépôt
                </>
              ) : (
                <>
                  <Truck className="w-5 h-5 text-success" />
                  Confirmer la livraison
                </>
              )}
            </SheetTitle>
          </SheetHeader>

          {scannedOrder && (
            <div className="py-4 space-y-4 overflow-y-auto">
              {/* Order summary */}
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Commande</span>
                    <span className="font-mono font-bold">{scannedOrder.order_number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Trajet</span>
                    <span className="font-medium">
                      {scannedOrder.origin_city} → {scannedOrder.destination_city}
                    </span>
                  </div>
                  {scannedOrder.client_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Client</span>
                      <span className="font-medium">{scannedOrder.client_name}</span>
                    </div>
                  )}
                  {scannedOrder.description && (
                    <div>
                      <span className="text-sm text-muted-foreground">Contenu</span>
                      <p className="text-sm mt-1">{scannedOrder.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Weight adjustment for deposit */}
              {isDeposit && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Scale className="w-4 h-4" />
                      Vérification du poids
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Poids déclaré</Label>
                        <p className="text-lg font-bold">{scannedOrder.weight} kg</p>
                      </div>
                      <div>
                        <Label className="text-xs">Poids réel</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={actualWeight}
                          onChange={(e) => setActualWeight(e.target.value)}
                          className="font-bold"
                        />
                      </div>
                    </div>

                    {weightDifference !== 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className={`p-3 rounded-lg ${
                          weightDifference > 0 
                            ? "bg-amber-50 border border-amber-200" 
                            : "bg-green-50 border border-green-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className={`w-4 h-4 ${
                            weightDifference > 0 ? "text-amber-600" : "text-green-600"
                          }`} />
                          <span className="font-medium text-sm">
                            {weightDifference > 0 ? "Excédent de poids" : "Poids inférieur"}
                          </span>
                        </div>
                        <p className="text-sm">
                          Différence: <strong>{weightDifference > 0 ? "+" : ""}{weightDifference.toFixed(1)} kg</strong>
                        </p>
                        <p className="text-sm">
                          Ajustement: <strong className={weightDifference > 0 ? "text-amber-700" : "text-green-700"}>
                            {adjustmentAmount > 0 ? "+" : ""}{adjustmentAmount.toLocaleString()} {getCurrencySymbol(scannedOrder.currency)}
                          </strong>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {weightDifference > 0 
                            ? "Le client sera débité du montant supplémentaire"
                            : "Le client sera crédité du trop-perçu"
                          }
                        </p>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Financial summary */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-lg">
                    <span>Total</span>
                    <span className="font-bold text-primary">
                      {(scannedOrder.total_price + (isDeposit ? adjustmentAmount : 0)).toLocaleString()} {getCurrencySymbol(scannedOrder.currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Clause tiers info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>Clause tiers:</strong> Toute personne présentant ce QR code est réputée mandatée par le client.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirmSheet(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={isDeposit ? confirmDeposit : confirmDelivery}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {isDeposit ? "Confirmer réception" : "Confirmer livraison"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
