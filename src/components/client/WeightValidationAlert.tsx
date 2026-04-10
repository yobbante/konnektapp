import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Ban } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WeightValidationCard, type WeightValidation } from "@/components/client/WeightValidationCard";
import { DualCurrencyDisplay } from "@/components/booking/DualCurrencyDisplay";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
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
  const selectedCurrency = selectedValidation?.currency || "XOF";
  const { getFCFAEquivalent } = useCurrencyConversion({ gpCurrency: selectedCurrency });

  const loadPendingValidations = async () => {
    try {
      // Get orders with weight modifications pending validation
      // weight_tier_applied is set when GP modifies weight (stored as string number)
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          weight,
          price_per_kg,
          total_price,
          currency,
          gp_id,
          weight_tier_applied,
          insurance_amount,
          status,
          gp_profiles:gp_id(id, business_name)
        `
        )
        .eq("client_id", userId)
        .not("weight_tier_applied", "is", null);

      if (error) throw error;

      // Filter to only pending/accepted orders with numeric weight_tier_applied
      const pendingOrders = (orders || []).filter((order: any) => {
        if (!order?.status || !["pending", "accepted"].includes(order.status)) return false;
        const tierValue = parseFloat(order.weight_tier_applied);
        return !isNaN(tierValue) && tierValue > 0;
      });

      const orderIds = pendingOrders.map((o: any) => o.id);
      if (orderIds.length === 0) {
        setValidations([]);
        setLoading(false);
        return;
      }

      // Check for confirmations in history
      const { data: history } = await supabase
        .from("order_status_history")
        .select("order_id")
        .in("order_id", orderIds)
        .or("notes.ilike.%CLIENT CONFIRME%,notes.ilike.%CLIENT REFUSE%");

      const confirmedOrderIds = new Set((history || []).map((h: any) => h.order_id));

      // Get logistics options for fixed prices (FCFA)
      const { data: logistics } = await supabase
        .from("order_logistics_options")
        .select("order_id, total_logistics_price")
        .in("order_id", orderIds);

      const logisticsMap = new Map((logistics || []).map((l: any) => [l.order_id, l.total_logistics_price]));

      const pendingValidations: WeightValidation[] = [];

      for (const order of pendingOrders) {
        if (confirmedOrderIds.has(order.id)) continue;

        const declaredWeight = Number(order.weight) || 0;
        const actualWeight = parseFloat(order.weight_tier_applied) || 0;

        if (!declaredWeight || !actualWeight) continue;

        const originalTotal = Number(order.total_price) || 0;
        const fixedInsurance = Number(order.insurance_amount) || 0; // In GP currency
        const fixedLogistics = Number(logisticsMap.get(order.id)) || 0; // FCFA

        // Definitive fix: compute impact ONLY from stored price_per_kg (same currency as order.total_price)
        // This prevents mixing FCFA logistics (2000) with USD totals (156).
        const pricePerKg = Number(order.price_per_kg) || 0;
        if (!pricePerKg) continue;

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
          gp_id: order.gp_id,
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
        notes: `CLIENT CONFIRME le nouveau poids: ${selectedValidation.actual_weight} kg. Difference: ${selectedValidation.weight_price_difference > 0 ? "+" : ""}${selectedValidation.weight_price_difference} ${selectedValidation.currency}. Nouveau total: ${selectedValidation.new_total} ${selectedValidation.currency}. Assurance/logistique inchanges.`
      });

      // Notify GP
      const {
        data: gpProfile
      } = await supabase.from("gp_profiles").select("user_id").eq("id", selectedValidation.gp_id).single();
      if (gpProfile?.user_id) {
        await supabase.from("notifications").insert({
          user_id: gpProfile.user_id,
          type: "weight_validation_accepted",
           title: "Poids valide par le client",
           message: `Le client a accepte le nouveau poids pour ${selectedValidation.order_number}. Le colis peut maintenant etre pris en charge.`,
          related_type: "order",
          related_id: selectedValidation.order_id
        });
      }
      toast({
        title: "Modification validee",
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
      const { data, error } = await supabase.functions.invoke("cancel-order", {
        body: {
          order_id: selectedValidation.order_id,
          actor_type: "client",
          clear_weight_tier: true,
          reason: `Client refuse la modification de poids (${selectedValidation.declared_weight}kg → ${selectedValidation.actual_weight}kg). Commande annulée.`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Envoi annulé",
        description: data?.refunded_amount > 0
          ? "Remboursement intégral lancé sur votre wallet."
          : "Commande annulée avec succès.",
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

  return (
    <>
      <AnimatePresence>
        {validations.map((validation) => (
          <motion.div
            key={validation.order_id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
          >
            <WeightValidationCard
              validation={validation}
              onRefuse={() => {
                setSelectedValidation(validation);
                setDialogType("refuse");
              }}
              onAccept={() => {
                setSelectedValidation(validation);
                setDialogType("accept");
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Accept Confirmation Dialog */}
      <AlertDialog
        open={dialogType === "accept"}
        onOpenChange={(open) => !open && setDialogType(null)}
      >
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

                {selectedValidation && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between gap-3">
                      <span>Poids déclaré:</span>
                      <span className="font-bold line-through text-muted-foreground">
                        {selectedValidation.declared_weight} kg
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Poids réel:</span>
                      <span className="font-bold text-primary">
                        {selectedValidation.actual_weight} kg
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between gap-3">
                      <span>Nouveau total:</span>
                      <DualCurrencyDisplay
                        inline
                        size="lg"
                        amount={selectedValidation.new_total}
                        currency={selectedValidation.currency}
                        fcfaEquivalent={getFCFAEquivalent(selectedValidation.new_total)}
                        className="font-bold"
                      />
                    </div>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  Votre colis sera pris en charge par le transporteur.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept} disabled={processing}>
              {processing ? "Validation..." : "Accepter et continuer l'envoi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refuse Confirmation Dialog - CRITICAL */}
      <AlertDialog
        open={dialogType === "refuse"}
        onOpenChange={(open) => !open && setDialogType(null)}
      >
        <AlertDialogContent className="border-destructive">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="w-5 h-5" />
              Annuler l'envoi ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="font-medium text-destructive">
                  Cette action est irréversible.
                </p>
                <p>
                  En refusant la modification de poids, votre envoi sera{" "}
                  <strong>immédiatement annulé</strong>.
                </p>
                <p>
                  Le transporteur sera notifié que le colis ne doit{" "}
                  <strong>pas être pris en charge</strong> et devra vous le restituer.
                </p>
                {selectedValidation && (
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                    <p className="text-sm">
                      <strong>Commande:</strong> {selectedValidation.order_number}
                    </p>
                    <p className="text-sm">
                      <strong>Poids refusé:</strong> {selectedValidation.actual_weight} kg
                      (déclaré: {selectedValidation.declared_weight} kg)
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Revenir</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefuse}
              disabled={processing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing ? "Annulation..." : "❌ Refuser et annuler l'envoi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}