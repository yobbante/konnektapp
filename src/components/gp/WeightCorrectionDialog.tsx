import { useState } from "react";
import { Scale, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WeightCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  currentWeight: number;
  pricePerKg: number;
  currency: string;
  clientId: string;
  onCorrected: () => void;
  currentInsurance?: number;
  currentLogistics?: number;
}

/**
 * WeightCorrectionDialog V3
 * 
 * RÈGLES:
 * - Le colis est DÉJÀ collecté (status = collected)
 * - Seul le prix poids change, assurance et logistique restent FIXES
 * - Met à jour: orders.weight, orders.total_price, orders.weight_tier_applied
 * - Met à jour escrow si existant
 * - Notifie le client avec le nouveau montant
 * - Log dans order_status_history
 */
export function WeightCorrectionDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  currentWeight,
  pricePerKg,
  currency,
  clientId,
  onCorrected,
  currentInsurance = 0,
  currentLogistics = 0,
}: WeightCorrectionDialogProps) {
  const { toast } = useToast();
  const [newWeight, setNewWeight] = useState(currentWeight.toString());
  const [submitting, setSubmitting] = useState(false);

  const weightDiff = parseFloat(newWeight) - currentWeight;
  const currentWeightPrice = Math.round(currentWeight * pricePerKg);
  const newWeightPrice = Math.round(parseFloat(newWeight) * pricePerKg);
  const priceDiff = newWeightPrice - currentWeightPrice;
  const newTotalPrice = newWeightPrice + currentInsurance + currentLogistics;

  const handleSubmit = async () => {
    const actualWeight = parseFloat(newWeight);
    if (isNaN(actualWeight) || actualWeight <= 0) {
      toast({ title: "Poids invalide", variant: "destructive" });
      return;
    }

    if (actualWeight === currentWeight) {
      onOpenChange(false);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Update order with pending weight correction flag
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          weight: actualWeight,
          total_price: newTotalPrice,
          weight_tier_applied: actualWeight.toString(),
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // 2. Update escrow transaction if exists
      const { data: escrow } = await supabase
        .from("escrow_transactions")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (escrow) {
        await supabase
          .from("escrow_transactions")
          .update({ amount: newTotalPrice })
          .eq("id", escrow.id);
      }

      // 3. Log in order_status_history
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        status: "collected",
        changed_by: user.id,
        changed_by_type: "gp",
        notes: `POIDS MODIFIÉ (colis déjà collecté): ${currentWeight} kg → ${actualWeight} kg. Prix poids: ${currentWeightPrice} → ${newWeightPrice} ${currency}. Nouveau total: ${newTotalPrice} ${currency}. Assurance (${currentInsurance}) et logistique (${currentLogistics}) inchangés.`,
      });

      // 4. Notify client
      await supabase.from("notifications").insert({
        user_id: clientId,
        type: "weight_correction",
        title: "Poids ajuste par le transporteur",
        message: `Le poids de votre colis ${orderNumber} a été vérifié: ${actualWeight} kg (déclaré: ${currentWeight} kg). Nouveau total: ${newTotalPrice.toLocaleString()} ${currency}.`,
        related_type: "order",
        related_id: orderId,
      });

      // 5. Auto-message in conversation if exists
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (gpProfile) {
        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("order_id", orderId)
          .eq("gp_id", gpProfile.id)
          .maybeSingle();

        if (conv) {
          await supabase.from("messages").insert({
            conversation_id: conv.id,
            sender_id: user.id,
            sender_type: "gp",
            content: `Poids ajuste\n\nLe poids de votre colis a ete verifie lors du depot.\n\nPoids declare: ${currentWeight} kg\nPoids reel: ${actualWeight} kg\nNouveau total: ${newTotalPrice.toLocaleString()} ${currency}\n\nSeul le prix du poids a ete recalcule. Assurance et logistique inchanges.`,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", conv.id);
        }
      }

      toast({
        title: "Poids ajuste",
        description: `Nouveau total: ${newTotalPrice.toLocaleString()} ${currency}`,
      });

      onCorrected();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error correcting weight:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Modifier le poids
          </DialogTitle>
          <DialogDescription>
            Commande {orderNumber} — Colis déjà collecté
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Poids déclaré</p>
            <p className="text-xl font-bold">{currentWeight} kg</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newWeight">Poids réel vérifié (kg)</Label>
            <Input
              id="newWeight"
              type="number"
              step="0.1"
              min="0.1"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="text-lg font-bold"
            />
          </div>

          {weightDiff !== 0 && !isNaN(weightDiff) && (
            <Alert className={weightDiff > 0 ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50"}>
              <AlertTriangle className={`w-4 h-4 ${weightDiff > 0 ? "text-amber-600" : "text-green-600"}`} />
              <AlertDescription>
                <div className="space-y-1">
                  <p className={`font-medium ${weightDiff > 0 ? "text-amber-800" : "text-green-800"}`}>
                    Différence: {weightDiff > 0 ? "+" : ""}{weightDiff.toFixed(1)} kg
                  </p>
                  <p className="text-sm">
                    Nouveau total: <span className="font-bold">{newTotalPrice.toLocaleString()} {currency}</span>
                  </p>
                  <p className="text-sm">
                    Différence prix: ({priceDiff > 0 ? "+" : ""}{priceDiff.toLocaleString()} {currency})
                  </p>
                  {(currentInsurance > 0 || currentLogistics > 0) && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      Assurance ({currentInsurance.toLocaleString()}) et logistique ({currentLogistics.toLocaleString()}) inchangés
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground">
            Le nouveau montant sera appliqué immédiatement. Le client sera notifié du changement.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            <Check className="w-4 h-4" />
            {submitting ? "Enregistrement..." : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
