import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Scale, Check, X, Info, DollarSign, ShieldAlert, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { recalculateWeightPrice } from "@/lib/currencyUtils";

interface WeightCorrection {
  order_id: string;
  order_number: string;
  declared_weight: number;
  actual_weight: number;
  original_weight_price: number;
  new_weight_price: number;
  weight_price_difference: number;
  fixed_insurance: number;
  fixed_logistics: number;
  fixed_flat_rate: number;
  new_total: number;
  price_per_kg: number;
  currency: string;
  gp_name: string;
}

interface WeightCorrectionAlertProps {
  userId: string;
  onConfirm?: () => void;
}

export function WeightCorrectionAlert({ userId, onConfirm }: WeightCorrectionAlertProps) {
  const { toast } = useToast();
  const [corrections, setCorrections] = useState<WeightCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCorrection, setSelectedCorrection] = useState<WeightCorrection | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadPendingCorrections();
  }, [userId]);

  const loadPendingCorrections = async () => {
    try {
      // Get orders with weight corrections that need client confirmation
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          weight,
          total_price,
          currency,
          gp_profiles:gp_id(business_name)
        `)
        .eq("client_id", userId)
        .eq("status", "collected")
        .not("weight_tier_applied", "is", null);

      if (error) throw error;

      // Get pending corrections from order_status_history
      const orderIds = (orders || []).map(o => o.id);
      if (orderIds.length === 0) {
        setCorrections([]);
        return;
      }

      const { data: history } = await supabase
        .from("order_status_history")
        .select("*")
        .in("order_id", orderIds)
        .like("notes", "%POIDS MODIFIÉ%")
        .order("created_at", { ascending: false });

      // Parse corrections from history
      const pendingCorrections: WeightCorrection[] = [];
      for (const entry of history || []) {
        const order = orders?.find(o => o.id === entry.order_id);
        if (!order) continue;

        // Check if already confirmed
        const { data: confirmed } = await supabase
          .from("order_status_history")
          .select("id")
          .eq("order_id", entry.order_id)
          .like("notes", "%CLIENT CONFIRME%")
          .maybeSingle();

        if (confirmed) continue;

        // Parse the weight change from notes
        const match = entry.notes?.match(/(\d+\.?\d*)\s*kg\s*→\s*(\d+\.?\d*)\s*kg/);
        if (!match) continue;

        const declaredWeight = parseFloat(match[1]);
        const actualWeight = parseFloat(match[2]);
        
        // Get order pricing details
        const pricePerKg = order.total_price / order.weight;
        
        // V1.3: Fetch fixed prices (insurance + logistics) that don't change
        const { data: logistics } = await supabase
          .from("order_logistics_options")
          .select("total_logistics_price")
          .eq("order_id", order.id)
          .maybeSingle();
        
        const fixedInsurance = (order as any).insurance_amount || 0;
        const fixedLogistics = logistics?.total_logistics_price || 0;
        const fixedFlatRate = 0; // Already included in total
        
        // V1.3 RULE: Only weight price changes, insurance/logistics stay FIXED
        const originalWeightPrice = Math.round(declaredWeight * pricePerKg);
        const newWeightPrice = Math.round(actualWeight * pricePerKg);
        const basePrice = order.total_price - originalWeightPrice - fixedInsurance - fixedLogistics;
        const newTotal = newWeightPrice + fixedInsurance + fixedLogistics + Math.max(0, basePrice);

        pendingCorrections.push({
          order_id: order.id,
          order_number: order.order_number,
          declared_weight: declaredWeight,
          actual_weight: actualWeight,
          original_weight_price: originalWeightPrice,
          new_weight_price: newWeightPrice,
          weight_price_difference: newWeightPrice - originalWeightPrice,
          fixed_insurance: fixedInsurance,
          fixed_logistics: fixedLogistics,
          fixed_flat_rate: Math.max(0, basePrice),
          new_total: Math.round(newTotal),
          price_per_kg: pricePerKg,
          currency: order.currency,
          gp_name: (order.gp_profiles as any)?.business_name || "Transporteur",
        });
      }

      setCorrections(pendingCorrections);
    } catch (error) {
      console.error("Error loading weight corrections:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmCorrection = async () => {
    if (!selectedCorrection) return;

    setConfirming(true);
    try {
      // V1.3: Update order with new weight and recalculated total
      // Only weight price changes, insurance/logistics stay fixed
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          weight: selectedCorrection.actual_weight,
          total_price: selectedCorrection.new_total,
          weight_tier_applied: null, // Clear pending flag
        })
        .eq("id", selectedCorrection.order_id);

      if (orderError) throw orderError;

      // Log confirmation
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("order_status_history").insert({
        order_id: selectedCorrection.order_id,
        status: "collected",
        changed_by: user?.id || "",
        changed_by_type: "client",
        notes: `CLIENT CONFIRME le nouveau poids: ${selectedCorrection.actual_weight} kg. Prix poids: ${selectedCorrection.weight_price_difference > 0 ? "+" : ""}${selectedCorrection.weight_price_difference} ${selectedCorrection.currency}. Nouveau total: ${selectedCorrection.new_total} ${selectedCorrection.currency}. (Assurance/logistique inchangés)`,
      });

      toast({
        title: "✅ Poids confirmé",
        description: `Nouveau total: ${selectedCorrection.new_total.toLocaleString()} ${selectedCorrection.currency}`,
      });

      setSelectedCorrection(null);
      loadPendingCorrections();
      onConfirm?.();
    } catch (error: any) {
      console.error("Error confirming correction:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  if (loading || corrections.length === 0) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {corrections.map((correction) => (
          <motion.div
            key={correction.order_id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
          >
            {/* DANGER BANNER - Full-width alert strip */}
            <Alert variant="destructive" className="mb-2 border-destructive bg-destructive/10">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle className="font-bold">⚠️ Action requise</AlertTitle>
              <AlertDescription className="text-xs">
                Le poids de votre colis a été modifié par le transporteur. Votre réservation est bloquée jusqu'à confirmation.
              </AlertDescription>
            </Alert>

            <Card className="border-destructive/50 bg-destructive/5 shadow-lg mb-4">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Warning Icon */}
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center flex-shrink-0"
                  >
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-destructive mb-1">
                      🚨 Modification de poids détectée
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Commande <span className="font-mono font-bold text-foreground">{correction.order_number}</span> par <span className="font-medium">{correction.gp_name}</span>
                    </p>

                    {/* Weight Comparison */}
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg mb-3 border border-destructive/20">
                      <div className="text-center flex-1">
                        <p className="text-xs text-muted-foreground">Déclaré</p>
                        <p className="font-bold text-lg line-through text-red-500">
                          {correction.declared_weight} kg
                        </p>
                      </div>
                      <Scale className="w-5 h-5 text-destructive" />
                      <div className="text-center flex-1">
                        <p className="text-xs text-muted-foreground">Réel</p>
                        <p className="font-bold text-lg text-green-600">
                          {correction.actual_weight} kg
                        </p>
                      </div>
                    </div>

                    {/* Price Difference */}
                    <div className="p-2 bg-background rounded-lg mb-3 border border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Impact prix poids:</span>
                        <span className={`font-bold ${correction.weight_price_difference > 0 ? "text-red-600" : "text-green-600"}`}>
                          {correction.weight_price_difference > 0 ? "+" : ""}
                          {correction.weight_price_difference.toLocaleString()} {correction.currency}
                        </span>
                      </div>
                      {correction.fixed_insurance > 0 && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <span>🛡️ Assurance (inchangée):</span>
                          <span>{correction.fixed_insurance.toLocaleString()} {correction.currency}</span>
                        </div>
                      )}
                      {correction.fixed_logistics > 0 && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <span>🚚 Logistique (inchangée):</span>
                          <span>{correction.fixed_logistics.toLocaleString()} {correction.currency}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm font-bold mt-2 pt-2 border-t">
                        <span>Nouveau total:</span>
                        <span className="text-primary">
                          {correction.new_total.toLocaleString()} {correction.currency}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <p className="text-[10px] text-muted-foreground mb-3 flex items-start gap-1">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      Seul le prix du poids est ajusté. L'assurance et la logistique restent inchangées.
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2 border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          // Could open a dispute or contact support
                          toast({
                            title: "Contestation",
                            description: "Contactez le support pour contester cette modification.",
                          });
                        }}
                      >
                        <Ban className="w-4 h-4" />
                        Contester
                      </Button>
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => setSelectedCorrection(correction)}
                      >
                        <Check className="w-4 h-4" />
                        Accepter
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedCorrection} onOpenChange={(open) => !open && setSelectedCorrection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Confirmer le poids réel
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Le transporteur a vérifié votre colis et constaté un poids différent de celui déclaré.
                </p>
                
                {selectedCorrection && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Poids déclaré:</span>
                      <span className="font-bold">{selectedCorrection.declared_weight} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Poids réel:</span>
                      <span className="font-bold text-primary">{selectedCorrection.actual_weight} kg</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Diff. prix poids:</span>
                      <span className={selectedCorrection.weight_price_difference > 0 ? "text-red-600" : "text-green-600"}>
                        {selectedCorrection.weight_price_difference > 0 ? "+" : ""}
                        {selectedCorrection.weight_price_difference.toLocaleString()} {selectedCorrection.currency}
                      </span>
                    </div>
                    {selectedCorrection.fixed_insurance > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Assurance (inchangée):</span>
                        <span>{selectedCorrection.fixed_insurance.toLocaleString()} {selectedCorrection.currency}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between">
                      <span>Nouveau prix:</span>
                      <span className="font-bold text-lg">
                        {selectedCorrection.new_total.toLocaleString()} {selectedCorrection.currency}
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  En confirmant, vous acceptez le poids vérifié. L'assurance et la logistique restent inchangées. Seul le prix du poids est recalculé.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCorrection} disabled={confirming}>
              {confirming ? "Confirmation..." : "Je confirme"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
