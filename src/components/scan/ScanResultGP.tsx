/**
 * ScanResultGP - GP scan result with deposit/delivery actions
 * 
 * Actions: confirm deposit, modify weight (triggers PRV), confirm delivery
 * Weight modification freezes order until client validates.
 * Includes ScanTrust™ duplicate scan prevention.
 * Uses ScanStatusBadge for consistent theming.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Package, Truck, Scale, CheckCircle, AlertTriangle,
  User, History, ArrowRight, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { useDuplicateScanCheck } from "@/hooks/useDuplicateScanCheck";
import { ScanStatusBadge } from "./ScanStatusBadge";
import { validateScanAction, isTerminalStatus, type ScanAction } from "@/lib/scanValidation";

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
  const { canPerformAction } = useDuplicateScanCheck();
  const [loading, setLoading] = useState(false);
  const [actualWeight, setActualWeight] = useState(order.weight.toString());
  const [weightDiff, setWeightDiff] = useState(0);
  const [priceDiff, setPriceDiff] = useState(0);

  const isDepositMode = ["accepted", "pending"].includes(order.status);
  const isDeliveryMode = order.status === "in_transit";
  const alreadyProcessed = ["collected", "delivered", "cancelled"].includes(order.status);

  useEffect(() => {
    const actual = parseFloat(actualWeight) || 0;
    const diff = actual - order.weight;
    setWeightDiff(diff);
    setPriceDiff(Math.round(diff * order.price_per_kg));
  }, [actualWeight, order.weight, order.price_per_kg]);

  const confirmDeposit = async () => {
    const actionType: ScanAction = Math.abs(weightDiff) > 0.01 ? "weight_modify" : "deposit_confirm";
    
    // ── VALIDATION LAYER ──
    const validation = validateScanAction("gp", actionType, order.status, {
      newStatus: Math.abs(weightDiff) > 0.01 ? undefined : "collected",
    });
    if (!validation.allowed) {
      toast({ title: "⚠️ Action non autorisée", description: validation.reason, variant: "destructive" });
      return;
    }

    const allowed = await canPerformAction(order.id, actionType, "gp");
    if (!allowed) return;

    setLoading(true);
    try {
      const actual = parseFloat(actualWeight) || order.weight;
      const hasWeightChange = Math.abs(weightDiff) > 0.01;
      const { data: { user } } = await supabase.auth.getUser();

      if (hasWeightChange) {
        await supabase.from("orders").update({
          weight_tier_applied: actual.toString(),
        }).eq("id", order.id);

        if (user) {
          await supabase.from("order_status_history").insert({
            order_id: order.id,
            status: order.status as any,
            changed_by: user.id,
            changed_by_type: "gp",
            notes: `⚠️ POIDS MODIFIÉ — VALIDATION REQUISE: ${order.weight} kg → ${actual} kg. Diff prix: ${priceDiff > 0 ? '+' : ''}${priceDiff} ${order.currency}`,
          });
        }

        await supabase.from("notifications").insert({
          user_id: order.client_id,
          type: "weight_validation_required",
          title: "⚠️ Validation requise — Poids modifié",
          message: `Poids modifié pour ${order.order_number}. Validez depuis votre espace.`,
          related_type: "order",
          related_id: order.id,
        });

        await logScan(order.id, "weight_modify", "qr", order.status, order.status, {
          declared_weight: order.weight,
          actual_weight: actual,
          price_diff: priceDiff,
        });

        toast({ title: "⚠️ Poids modifié", description: "En attente validation client." });
      } else {
        await supabase.from("orders").update({
          status: "collected",
          weight: actual,
        }).eq("id", order.id);

        if (user) {
          await supabase.from("order_status_history").insert({
            order_id: order.id,
            status: "collected",
            changed_by: user.id,
            changed_by_type: "gp",
            notes: "Dépôt confirmé par scan — poids conforme",
          });
        }

        await supabase.from("notifications").insert({
          user_id: order.client_id,
          type: "order_update",
          title: "📦 Colis reçu",
          message: `Votre colis ${order.order_number} a été reçu par le transporteur`,
          related_type: "order",
          related_id: order.id,
        });

        await logScan(order.id, "deposit_confirm", "qr", order.status, "collected");
        toast({ title: "✅ Dépôt confirmé" });
      }

      onComplete();
    } catch (err) {
      console.error("Deposit error:", err);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelivery = async () => {
    // ── VALIDATION LAYER ──
    const validation = validateScanAction("gp", "delivery_confirm", order.status, {
      newStatus: "delivered",
    });
    if (!validation.allowed) {
      toast({ title: "⚠️ Action non autorisée", description: validation.reason, variant: "destructive" });
      return;
    }

    const allowed = await canPerformAction(order.id, "delivery_confirm", "gp");
    if (!allowed) return;

    setLoading(true);
    try {
      await supabase.from("orders").update({
        status: "delivered",
        actual_delivery_date: new Date().toISOString(),
      }).eq("id", order.id);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          status: "delivered",
          changed_by: user.id,
          changed_by_type: "gp",
          notes: "Livraison confirmée par scan QR",
        });
      }

      await supabase.from("notifications").insert({
        user_id: order.client_id,
        type: "order_update",
        title: "🎉 Colis livré",
        message: `Votre colis ${order.order_number} a été livré !`,
        related_type: "order",
        related_id: order.id,
      });

      await logScan(order.id, "delivery_confirm", "qr", "in_transit", "delivered");
      toast({ title: "🎉 Livraison confirmée" });
      onComplete();
    } catch (err) {
      console.error("Delivery error:", err);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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

            <Button className="w-full h-12" onClick={confirmDeposit} disabled={loading}>
              {loading ? (
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

      {/* Delivery Mode */}
      {isDeliveryMode && (
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
              disabled={loading}
            >
              {loading ? (
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
