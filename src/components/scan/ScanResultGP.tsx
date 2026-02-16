/**
 * ScanResultGP - GP scan result with deposit/delivery actions
 * 
 * ALL actions go through KonnektScanEngine.executeAction().
 * No direct DB calls. The backend handles:
 * - Status transitions
 * - Notifications
 * - Escrow/commission triggers
 * - Scan logging
 * - Duplicate prevention
 * 
 * Uses ScanStatusBadge for consistent theming.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Package, Truck, Scale, CheckCircle, AlertTriangle,
  User, History, ArrowRight, ShieldAlert, Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { ScanStatusBadge } from "./ScanStatusBadge";
import { ExternalHandoverCard } from "@/components/gp/ExternalHandoverCard";
import { useScanEngine } from "@/hooks/useScanEngine";

interface ScanResultGPProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    weight: number;
    total_price: number;
    currency: string;
    price_per_kg: number;
    origin_city: string;
    destination_city: string;
    client_name?: string | null;
    client_id: string;
    description: string | null;
    scan_history?: Array<{ action: string; user_role: string; created_at: string }>;
    delivery_code?: string | null;
    recipient_name?: string | null;
    recipient_phone?: string | null;
    recipient_user_id?: string | null;
  };
  gpId: string;
  logScan: (orderId: string, action: string, scanType?: string, prevStatus?: string, newStatus?: string, meta?: Record<string, any>) => Promise<void>;
  onComplete: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  view: "Consulté",
  deposit_confirm: "Dépôt confirmé",
  delivery_confirm: "Livraison confirmée",
  weight_modify: "Poids modifié",
};

export function ScanResultGP({ order, gpId, logScan, onComplete }: ScanResultGPProps) {
  const { toast } = useToast();
  const { executeAction, executing } = useScanEngine();
  const [actualWeight, setActualWeight] = useState(order.weight.toString());
  const [weightDiff, setWeightDiff] = useState(0);
  const [priceDiff, setPriceDiff] = useState(0);

  const isDepositMode = ["accepted", "pending"].includes(order.status);
  const isTransitMode = order.status === "collected";
  const isDeliveryMode = order.status === "in_transit";
  const alreadyProcessed = ["delivered", "cancelled"].includes(order.status);

  useEffect(() => {
    const actual = parseFloat(actualWeight) || 0;
    const diff = actual - order.weight;
    setWeightDiff(diff);
    setPriceDiff(Math.round(diff * order.price_per_kg));
  }, [actualWeight, order.weight, order.price_per_kg]);

  const confirmDeposit = async () => {
    const actual = parseFloat(actualWeight) || order.weight;
    const hasWeightChange = Math.abs(weightDiff) > 0.01;

    if (hasWeightChange) {
      // Weight modification → engine handles PRV freeze + notifications
      const result = await executeAction("weight_modify", order.id, {
        declared_weight: order.weight,
        actual_weight: actual,
        price_diff: priceDiff,
      });
      if (result?.status === "executed") onComplete();
    } else {
      // Standard deposit → engine updates status + notifications
      const result = await executeAction("deposit_confirm", order.id, {
        weight: actual,
      });
      if (result?.status === "executed") onComplete();
    }
  };

  const confirmTransit = async () => {
    const result = await executeAction("mark_transit", order.id);
    if (result?.status === "executed") onComplete();
  };

  const confirmDelivery = async () => {
    const result = await executeAction("confirm_delivery", order.id);
    if (result?.status === "executed") onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-4 space-y-4"
    >
      {/* Order Summary */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-sm">{order.order_number}</span>
            <ScanStatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{order.origin_city}</span>
            <ArrowRight className="w-3 h-3" />
            <span>{order.destination_city}</span>
          </div>
          {order.client_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{order.client_name}</span>
            </div>
          )}
          {order.description && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
              📦 {order.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Already processed warning */}
      {alreadyProcessed && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <div>
              <p className="font-medium text-sm">Scan non autorisé</p>
              <p className="text-xs text-muted-foreground">
                Commande déjà « {order.status} ». Aucune action disponible.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deposit Mode */}
      {isDepositMode && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Vérification du poids — Dépôt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Déclaré</Label>
                <p className="text-xl font-bold mt-1">{order.weight} <span className="text-sm font-normal">kg</span></p>
              </div>
              <div className="p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
                <Label className="text-[10px] text-primary uppercase tracking-wider">Réel</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={actualWeight}
                  onChange={(e) => setActualWeight(e.target.value)}
                  className="font-bold text-lg h-8 mt-1 border-0 bg-transparent p-0 focus-visible:ring-0"
                />
              </div>
            </div>

            {weightDiff !== 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={`p-3 rounded-lg border ${
                  weightDiff > 0 
                    ? "bg-warning/5 border-warning/30" 
                    : "bg-success/5 border-success/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-4 h-4 ${weightDiff > 0 ? "text-warning" : "text-success"}`} />
                  <span className="font-medium text-sm">
                    {weightDiff > 0 ? "Excédent détecté" : "Poids inférieur"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div>
                    <span className="text-muted-foreground text-xs">Différence</span>
                    <p className="font-bold">{weightDiff > 0 ? "+" : ""}{weightDiff.toFixed(1)} kg</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Impact prix</span>
                    <p className="font-bold">{priceDiff > 0 ? "+" : ""}{priceDiff.toLocaleString()} {getCurrencySymbol(order.currency)}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  ⚠️ Le client devra valider cette modification avant traitement
                </p>
              </motion.div>
            )}

            <Button className="w-full h-12" onClick={confirmDeposit} disabled={executing}>
              {executing ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  {weightDiff !== 0 ? "Soumettre modification" : "Confirmer le dépôt"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Transit Mode — Colis reçu, marquer en transit */}
      {isTransitMode && (
        <Card className="border-secondary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-secondary" />
              Colis reçu — Marquer en transit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ce colis a été collecté. Confirmez le départ en transit vers la destination.
            </p>
            <Button 
              className="w-full h-12" 
              variant="secondary"
              onClick={confirmTransit}
              disabled={executing}
            >
              {executing ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Truck className="w-4 h-4 mr-2" />
                  Confirmer départ en transit
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delivery Mode */}
      {isDeliveryMode && (
        <>
          {/* External handover — recipient has no app */}
          {!order.recipient_user_id && order.delivery_code && (
            <ExternalHandoverCard
              orderId={order.id}
              orderNumber={order.order_number}
              deliveryCode={order.delivery_code}
              recipientName={order.recipient_name}
              recipientPhone={order.recipient_phone}
              onConfirmManual={confirmDelivery}
              loading={executing}
            />
          )}

          {/* Standard delivery confirmation — recipient has app or no external flow */}
          {(order.recipient_user_id || !order.delivery_code) && (
            <Card className="border-success/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4 text-success" />
                  Confirmer la livraison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Scannez le QR à la remise au destinataire pour confirmer la livraison.
                </p>
                <Button 
                  className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground" 
                  onClick={confirmDelivery} 
                  disabled={executing}
                >
                  {executing ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmer livraison
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Scan History */}
      {order.scan_history && order.scan_history.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Historique scans</h4>
              <Badge variant="outline" className="text-[10px] ml-auto">{order.scan_history.length}</Badge>
            </div>
            <div className="space-y-1.5">
              {order.scan_history.slice(0, 5).map((scan, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    <span className="font-medium">{ACTION_LABELS[scan.action] || scan.action}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(scan.created_at).toLocaleString("fr-FR", { 
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" 
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
