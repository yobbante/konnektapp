import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Scale, Check, X, Info, ShieldAlert, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
interface WeightValidation {
  order_id: string;
  order_number: string;
  declared_weight: number;
  actual_weight: number;
  original_weight_price: number;
  new_weight_price: number;
  weight_price_difference: number;
  fixed_insurance: number;
  fixed_logistics: number;
  new_total: number;
  original_total: number;
  currency: string;
  gp_name: string;
  gp_id: string;
}
interface WeightValidationAlertProps {
  userId: string;
  onAction?: () => void;
}

/**
 * WeightValidationAlert - PRV Compliant Component
 * 
 * Rules:
 * - Non-dismissible until client takes action
 * - Two actions only: Accept or Refuse
 * - Refuse = Order cancelled + GP notified
 * - Accept = Order proceeds to collected
 */
export function WeightValidationAlert({
  userId,
  onAction
}: WeightValidationAlertProps) {
  const {
    toast
  } = useToast();
  const [validations, setValidations] = useState<WeightValidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedValidation, setSelectedValidation] = useState<WeightValidation | null>(null);
  const [dialogType, setDialogType] = useState<"accept" | "refuse" | null>(null);
  const [processing, setProcessing] = useState(false);
  useEffect(() => {
    loadPendingValidations();

    // Subscribe to realtime updates
    const channel = supabase.channel("weight-validations").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "orders",
      filter: `client_id=eq.${userId}`
    }, () => loadPendingValidations()).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
  const loadPendingValidations = async () => {
    try {
      // Get orders with weight modifications pending validation
      // weight_tier_applied is set when GP modifies weight (stored as string number)
      // We check for any status that is NOT collected/delivered yet AND has weight_tier_applied set
      const {
        data: orders,
        error
      } = await supabase.from("orders").select(`
          id,
          order_number,
          weight,
          total_price,
          currency,
          gp_id,
          weight_tier_applied,
          insurance_amount,
          status,
          gp_profiles:gp_id(id, business_name)
        `).eq("client_id", userId).not("weight_tier_applied", "is", null);
      if (error) throw error;

      // Filter to only pending/accepted orders with numeric weight_tier_applied
      const pendingOrders = (orders || []).filter(order => {
        // Must be in a status that can receive weight validation
        if (!["pending", "accepted"].includes(order.status)) return false;
        // weight_tier_applied must be a valid number string (not just any value)
        const tierValue = parseFloat(order.weight_tier_applied);
        return !isNaN(tierValue) && tierValue > 0;
      });

      // Get order IDs to check for already-confirmed validations
      const orderIds = pendingOrders.map(o => o.id);
      if (orderIds.length === 0) {
        setValidations([]);
        setLoading(false);
        return;
      }

      // Check for confirmations in history
      const {
        data: history
      } = await supabase.from("order_status_history").select("order_id").in("order_id", orderIds).or("notes.ilike.%CLIENT CONFIRME%,notes.ilike.%CLIENT REFUSE%");
      const confirmedOrderIds = new Set((history || []).map(h => h.order_id));

      // Get logistics options for fixed prices
      const {
        data: logistics
      } = await supabase.from("order_logistics_options").select("order_id, total_logistics_price").in("order_id", orderIds);
      const logisticsMap = new Map((logistics || []).map(l => [l.order_id, l.total_logistics_price]));

      // Build pending validations
      const pendingValidations: WeightValidation[] = [];
      for (const order of pendingOrders) {
        if (confirmedOrderIds.has(order.id)) continue;
        const declaredWeight = order.weight;
        const actualWeight = Number(order.weight_tier_applied) || 0;
        const originalTotal = order.total_price;
        const fixedInsurance = order.insurance_amount || 0;
        const fixedLogistics = logisticsMap.get(order.id) || 0;

        // Calculate weight price difference only
        const pricePerKg = (originalTotal - fixedInsurance - fixedLogistics) / declaredWeight;
        const originalWeightPrice = Math.round(declaredWeight * pricePerKg);
        const newWeightPrice = Math.round(actualWeight * pricePerKg);
        const weightPriceDiff = newWeightPrice - originalWeightPrice;
        const newTotal = originalTotal + weightPriceDiff;
        pendingValidations.push({
          order_id: order.id,
          order_number: order.order_number,
          declared_weight: declaredWeight,
          actual_weight: actualWeight,
          original_weight_price: originalWeightPrice,
          new_weight_price: newWeightPrice,
          weight_price_difference: weightPriceDiff,
          fixed_insurance: fixedInsurance,
          fixed_logistics: fixedLogistics,
          new_total: Math.round(newTotal),
          original_total: originalTotal,
          currency: order.currency,
          gp_name: (order.gp_profiles as any)?.business_name || "Transporteur",
          gp_id: order.gp_id
        });
      }
      setValidations(pendingValidations);
    } catch (error) {
      console.error("Error loading weight validations:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleAccept = async () => {
    if (!selectedValidation) return;
    setProcessing(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();

      // Update order with new weight and total, set status to collected
      const {
        error: orderError
      } = await supabase.from("orders").update({
        status: "collected",
        weight: selectedValidation.actual_weight,
        total_price: selectedValidation.new_total,
        weight_tier_applied: null // Clear the pending flag
      }).eq("id", selectedValidation.order_id);
      if (orderError) throw orderError;

      // Log confirmation
      await supabase.from("order_status_history").insert({
        order_id: selectedValidation.order_id,
        status: "collected",
        changed_by: user?.id || "",
        changed_by_type: "client",
        notes: `✅ CLIENT CONFIRME le nouveau poids: ${selectedValidation.actual_weight} kg. Différence: ${selectedValidation.weight_price_difference > 0 ? "+" : ""}${selectedValidation.weight_price_difference} ${selectedValidation.currency}. Nouveau total: ${selectedValidation.new_total} ${selectedValidation.currency}. Assurance/logistique inchangés.`
      });

      // Notify GP
      const {
        data: gpProfile
      } = await supabase.from("gp_profiles").select("user_id").eq("id", selectedValidation.gp_id).single();
      if (gpProfile?.user_id) {
        await supabase.from("notifications").insert({
          user_id: gpProfile.user_id,
          type: "weight_validation_accepted",
          title: "✅ Poids validé par le client",
          message: `Le client a accepté le nouveau poids pour ${selectedValidation.order_number}. Le colis peut maintenant être pris en charge.`,
          related_type: "order",
          related_id: selectedValidation.order_id
        });
      }
      toast({
        title: "✅ Modification validée",
        description: `Votre colis est désormais pris en charge. Nouveau total: ${selectedValidation.new_total.toLocaleString()} ${selectedValidation.currency}`
      });
      setSelectedValidation(null);
      setDialogType(null);
      loadPendingValidations();
      onAction?.();
    } catch (error: any) {
      console.error("Error accepting weight:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };
  const handleRefuse = async () => {
    if (!selectedValidation) return;
    setProcessing(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();

      // PRV: Cancel order immediately
      const {
        error: orderError
      } = await supabase.from("orders").update({
        status: "cancelled",
        weight_tier_applied: null
      }).eq("id", selectedValidation.order_id);
      if (orderError) throw orderError;

      // Log refusal
      await supabase.from("order_status_history").insert({
        order_id: selectedValidation.order_id,
        status: "cancelled",
        changed_by: user?.id || "",
        changed_by_type: "client",
        notes: `❌ CLIENT REFUSE la modification de poids. Commande annulée. Poids déclaré: ${selectedValidation.declared_weight} kg, Poids mesuré: ${selectedValidation.actual_weight} kg. Le colis ne doit PAS être pris en charge.`
      });

      // CRITICAL: Notify GP with blocking message
      const {
        data: gpProfile
      } = await supabase.from("gp_profiles").select("user_id").eq("id", selectedValidation.gp_id).single();
      if (gpProfile?.user_id) {
        await supabase.from("notifications").insert({
          user_id: gpProfile.user_id,
          type: "weight_validation_refused",
          title: "❌ ENVOI ANNULÉ - Client a refusé",
          message: `Le client a refusé la modification de poids pour ${selectedValidation.order_number}. ⛔ NE PAS PRENDRE EN CHARGE CE COLIS. Restituez-le immédiatement.`,
          related_type: "order",
          related_id: selectedValidation.order_id
        });
      }

      // TODO: Handle refund if payment was made
      // This would trigger escrow refund logic

      toast({
        title: "❌ Envoi annulé",
        description: "Vous avez refusé la modification de poids. Le colis n'a pas été pris en charge.",
        variant: "destructive"
      });
      setSelectedValidation(null);
      setDialogType(null);
      loadPendingValidations();
      onAction?.();
    } catch (error: any) {
      console.error("Error refusing weight:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };
  if (loading || validations.length === 0) {
    return null;
  }
  return <>
      <AnimatePresence>
        {validations.map(validation => <motion.div key={validation.order_id} initial={{
        opacity: 0,
        y: -20,
        scale: 0.95
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: -20,
        scale: 0.95
      }}>
            {/* CRITICAL BANNER - Non-dismissible */}
            <Alert variant="destructive" className="mb-2 border-destructive bg-destructive/10">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle className="font-bold">⚠️ Validation requise — Modification de poids</AlertTitle>
              <AlertDescription className="text-xs">
                Le transporteur a mesuré un poids différent lors du dépôt. Votre réservation est bloquée.
              </AlertDescription>
            </Alert>

            <Card className="border-destructive/50 bg-destructive/5 shadow-lg mb-4">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Pulsing Warning Icon */}
                  <motion.div animate={{
                scale: [1, 1.1, 1]
              }} transition={{
                duration: 1,
                repeat: Infinity
              }} className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground mb-2">
                      Commande <span className="font-mono font-bold text-foreground">{validation.order_number}</span> • {validation.gp_name}
                    </p>

                    {/* Weight Comparison - Visual */}
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg mb-3 border border-destructive/20">
                      <div className="text-center flex-1">
                        <p className="text-xs text-muted-foreground">Poids déclaré</p>
                        <p className="font-bold text-lg line-through text-red-500">
                          {validation.declared_weight} kg
                        </p>
                      </div>
                      <Scale className="w-6 h-6 text-destructive" />
                      <div className="text-center flex-1">
                        <p className="text-xs text-muted-foreground">Poids réel mesuré</p>
                        <p className="font-bold text-lg text-foreground">
                          {validation.actual_weight} kg
                        </p>
                      </div>
                    </div>

                    {/* Price Impact */}
                    <div className="p-3 bg-background rounded-lg mb-3 border border-border space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Impact sur le prix transport:</span>
                        <span className={`font-bold ${validation.weight_price_difference > 0 ? "text-red-600" : "text-green-600"}`}>
                          {validation.weight_price_difference > 0 ? "+" : ""}
                          {validation.weight_price_difference.toLocaleString()} {validation.currency}
                        </span>
                      </div>
                      {validation.fixed_insurance > 0 && <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>🛡️ Assurance (inchangée):</span>
                          <span>{validation.fixed_insurance.toLocaleString()} {validation.currency}</span>
                        </div>}
                      {validation.fixed_logistics > 0 && <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>🚚 Logistique (inchangée):</span>
                          <span>{validation.fixed_logistics.toLocaleString()} {validation.currency}</span>
                        </div>}
                      <div className="flex items-center justify-between text-sm font-bold pt-2 border-t">
                        <span>Nouveau total:</span>
                        <span className="text-primary text-base">
                          {validation.new_total.toLocaleString()} {validation.currency}
                        </span>
                      </div>
                    </div>

                    {/* Info disclaimer */}
                    <p className="text-[10px] text-muted-foreground mb-4 flex items-start gap-1">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      L'assurance et la livraison restent inchangées. Seul le prix du transport est ajusté.
                    </p>

                    {/* PRV: ONLY 2 ACTIONS - Accept or Refuse */}
                    <div className="gap-[4px] flex items-start justify-center">
                      <Button variant="outline" className="flex-1 gap-2 border-destructive text-destructive hover:bg-destructive/10" onClick={() => {
                    setSelectedValidation(validation);
                    setDialogType("refuse");
                  }}>
                        <X className="w-4 h-4" />
                        Refuser et annuler
                      </Button>
                      <Button className="flex-1 gap-2" onClick={() => {
                    setSelectedValidation(validation);
                    setDialogType("accept");
                  }}>
                        <Check className="w-4 h-4" />
                        Accepter et continuer
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>)}
      </AnimatePresence>

      {/* Accept Confirmation Dialog */}
      <AlertDialog open={dialogType === "accept"} onOpenChange={open => !open && setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Confirmer le nouveau poids
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Vous acceptez le poids mesuré par le transporteur et le nouveau tarif associé.
                </p>
                
                {selectedValidation && <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Poids déclaré:</span>
                      <span className="font-bold line-through text-muted-foreground">{selectedValidation.declared_weight} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Poids réel:</span>
                      <span className="font-bold text-primary">{selectedValidation.actual_weight} kg</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span>Nouveau total:</span>
                      <span className="font-bold text-lg">
                        {selectedValidation.new_total.toLocaleString()} {selectedValidation.currency}
                      </span>
                    </div>
                  </div>}

                <p className="text-sm text-muted-foreground">
                  Votre colis sera pris en charge par le transporteur.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept} disabled={processing}>
              {processing ? "Validation..." : "✅ Accepter et continuer l'envoi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refuse Confirmation Dialog - CRITICAL */}
      <AlertDialog open={dialogType === "refuse"} onOpenChange={open => !open && setDialogType(null)}>
        <AlertDialogContent className="border-destructive">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="w-5 h-5" />
              Annuler l'envoi ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="font-medium text-destructive">
                  ⚠️ Cette action est irréversible.
                </p>
                <p>
                  En refusant la modification de poids, votre envoi sera <strong>immédiatement annulé</strong>.
                </p>
                <p>
                  Le transporteur sera notifié que le colis ne doit <strong>pas être pris en charge</strong> et devra vous le restituer.
                </p>
                {selectedValidation && <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                    <p className="text-sm">
                      <strong>Commande:</strong> {selectedValidation.order_number}
                    </p>
                    <p className="text-sm">
                      <strong>Poids refusé:</strong> {selectedValidation.actual_weight} kg (déclaré: {selectedValidation.declared_weight} kg)
                    </p>
                  </div>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Revenir</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefuse} disabled={processing} className="bg-destructive hover:bg-destructive/90">
              {processing ? "Annulation..." : "❌ Refuser et annuler l'envoi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}