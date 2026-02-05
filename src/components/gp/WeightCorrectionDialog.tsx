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
  // V2: Seul le prix poids change, assurance et logistique restent FIXES
  const currentWeightPrice = Math.round(currentWeight * pricePerKg);
  const newWeightPrice = Math.round(parseFloat(newWeight) * pricePerKg);
  const priceDiff = newWeightPrice - currentWeightPrice;
  // Total = nouveau prix poids + assurance fixe + logistique fixe
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
          weight_tier_applied: `pending:${actualWeight}`,
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Log the correction in history
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        status: "collected",
        changed_by: user.id,
        changed_by_type: "gp",
        notes: `POIDS MODIFIÉ: ${currentWeight} kg → ${actualWeight} kg. Prix poids: ${currentWeightPrice} → ${newWeightPrice} ${currency}. Assurance et logistique inchangés.`,
      });

      // Notify client
      await supabase.from("notifications").insert({
        user_id: clientId,
        type: "weight_correction",
        title: "⚠️ Correction de poids requise",
        message: `Le poids de votre colis ${orderNumber} a été vérifié: ${actualWeight} kg (déclaré: ${currentWeight} kg). Veuillez confirmer.`,
        related_type: "order",
        related_id: orderId,
      });

      toast({
        title: "✅ Poids modifié",
        description: "Le client doit confirmer le nouveau poids",
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
            Commande {orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Weight */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Poids déclaré</p>
            <p className="text-xl font-bold">{currentWeight} kg</p>
          </div>

          {/* New Weight Input */}
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

          {/* Difference Preview */}
          {weightDiff !== 0 && !isNaN(weightDiff) && (
            <Alert className={weightDiff > 0 ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50"}>
              <AlertTriangle className={`w-4 h-4 ${weightDiff > 0 ? "text-amber-600" : "text-green-600"}`} />
              <AlertDescription>
                <div className="space-y-1">
                  <p className={`font-medium ${weightDiff > 0 ? "text-amber-800" : "text-green-800"}`}>
                    Différence: {weightDiff > 0 ? "+" : ""}{weightDiff.toFixed(1)} kg
                  </p>
                  <p className="text-sm">
                    Nouveau prix poids: <span className="font-bold">{newWeightPrice.toLocaleString()} {currency}</span>
                  </p>
                  <p className="text-sm">
                    Différence: ({priceDiff > 0 ? "+" : ""}{priceDiff.toLocaleString()} {currency})
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
            Le client devra confirmer le nouveau poids avant que la commande puisse continuer.
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
