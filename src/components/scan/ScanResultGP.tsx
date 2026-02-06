/**
 * ScanResultGP - GP scan result with deposit/delivery actions
 * 
 * Actions: confirm deposit, modify weight (triggers PRV), confirm delivery
 * Weight modification freezes order until client validates.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Package, Truck, Scale, CheckCircle, AlertTriangle,
  User, History
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

export function ScanResultGP({ order, gpId, logScan, onComplete }: ScanResultGPProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [actualWeight, setActualWeight] = useState(order.weight.toString());
  const [weightDiff, setWeightDiff] = useState(0);
  const [priceDiff, setPriceDiff] = useState(0);

  // Determine scan mode based on order status
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
    setLoading(true);
    try {
      const actual = parseFloat(actualWeight) || order.weight;
      const hasWeightChange = Math.abs(weightDiff) > 0.01;
      const { data: { user } } = await supabase.auth.getUser();

      if (hasWeightChange) {
        // PRV: FREEZE ORDER
        await supabase.from("orders").update({
          weight_tier_applied: actual.toString(),
        }).eq("id", order.id);

        if (user) {
          await supabase.from("order_status_history").insert({
            order_id: order.id,
            status: order.status as any,
            changed_by: user.id,
            changed_by_type: "gp",
            notes: `⚠️ POIDS MODIFIÉ - EN ATTENTE VALIDATION: ${order.weight} kg → ${actual} kg. Diff prix: ${priceDiff > 0 ? '+' : ''}${priceDiff} ${order.currency}`,
          });
        }

        await supabase.from("notifications").insert({
          user_id: order.client_id,
          type: "weight_validation_required",
          title: "⚠️ Validation requise - Modification de poids",
          message: `Poids modifié pour ${order.order_number}. Validez depuis votre espace.`,
          related_type: "order",
          related_id: order.id,
        });

        await logScan(order.id, "weight_modify", "qr", order.status, order.status, {
          declared_weight: order.weight,
          actual_weight: actual,
          price_diff: priceDiff,
        });

        toast({
          title: "⚠️ Poids modifié",
          description: "En attente validation client.",
        });
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
      <Card className="bg-muted/50">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Commande</span>
            <span className="font-mono font-bold">{order.order_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Trajet</span>
            <span>{order.origin_city} → {order.destination_city}</span>
          </div>
          {order.client_name && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Client</span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {order.client_name}
              </span>
            </div>
          )}
          {order.description && (
            <div className="text-sm">
              <span className="text-muted-foreground">Contenu: </span>
              {order.description}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status */}
      {alreadyProcessed && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 text-sm">Scan non autorisé</p>
              <p className="text-xs text-amber-600">
                Cette commande est déjà "{order.status}". Aucune action possible.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deposit Mode */}
      {isDepositMode && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Vérification du poids — Dépôt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Poids déclaré</Label>
                <p className="text-lg font-bold">{order.weight} kg</p>
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

            {weightDiff !== 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={`p-3 rounded-lg ${
                  weightDiff > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-4 h-4 ${weightDiff > 0 ? "text-amber-600" : "text-green-600"}`} />
                  <span className="font-medium text-sm">
                    {weightDiff > 0 ? "Excédent" : "Poids inférieur"}
                  </span>
                </div>
                <p className="text-sm">
                  Différence: <strong>{weightDiff > 0 ? "+" : ""}{weightDiff.toFixed(1)} kg</strong>
                </p>
                <p className="text-sm">
                  Impact prix: <strong>{priceDiff > 0 ? "+" : ""}{priceDiff.toLocaleString()} {getCurrencySymbol(order.currency)}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ⚠️ Le client devra valider cette modification
                </p>
              </motion.div>
            )}

            <Button
              className="w-full"
              onClick={confirmDeposit}
              disabled={loading}
            >
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-green-600" />
              Confirmer la livraison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Scannez le QR à la remise au destinataire pour confirmer la livraison.
            </p>
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
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
            </div>
            <div className="space-y-1.5">
              {order.scan_history.slice(0, 5).map((scan, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span>{scan.action} ({scan.user_role})</span>
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
