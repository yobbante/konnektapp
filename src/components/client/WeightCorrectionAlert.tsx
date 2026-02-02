import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Scale, Check, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface WeightCorrection {
  order_id: string;
  order_number: string;
  declared_weight: number;
  actual_weight: number;
  original_price: number;
  new_price: number;
  price_difference: number;
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
        
        // Calculate price difference (assuming price per kg consistency)
        const pricePerKg = order.total_price / order.weight;
        const originalPrice = declaredWeight * pricePerKg;
        const newPrice = actualWeight * pricePerKg;

        pendingCorrections.push({
          order_id: order.id,
          order_number: order.order_number,
          declared_weight: declaredWeight,
          actual_weight: actualWeight,
          original_price: Math.round(originalPrice),
          new_price: Math.round(newPrice),
          price_difference: Math.round(newPrice - originalPrice),
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
      // Update order with new weight/price
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          weight: selectedCorrection.actual_weight,
          total_price: selectedCorrection.new_price,
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
        notes: `CLIENT CONFIRME le nouveau poids: ${selectedCorrection.actual_weight} kg. Différence: ${selectedCorrection.price_difference > 0 ? "+" : ""}${selectedCorrection.price_difference} ${selectedCorrection.currency}`,
      });

      toast({
        title: "✅ Poids confirmé",
        description: `La commande a été mise à jour avec le nouveau poids`,
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
            <Card className="border-amber-400 bg-amber-50 shadow-lg mb-4">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Warning Icon */}
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0"
                  >
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-amber-800 mb-1">
                      ⚠️ Correction de poids requise
                    </h3>
                    <p className="text-sm text-amber-700 mb-2">
                      Commande <span className="font-mono font-bold">{correction.order_number}</span>
                    </p>

                    {/* Weight Comparison */}
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg mb-3">
                      <div className="text-center flex-1">
                        <p className="text-xs text-muted-foreground">Déclaré</p>
                        <p className="font-bold text-lg line-through text-red-500">
                          {correction.declared_weight} kg
                        </p>
                      </div>
                      <Scale className="w-5 h-5 text-amber-600" />
                      <div className="text-center flex-1">
                        <p className="text-xs text-muted-foreground">Réel</p>
                        <p className="font-bold text-lg text-green-600">
                          {correction.actual_weight} kg
                        </p>
                      </div>
                    </div>

                    {/* Price Difference */}
                    <div className="p-2 bg-white rounded-lg mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Différence:</span>
                        <span className={`font-bold ${correction.price_difference > 0 ? "text-red-600" : "text-green-600"}`}>
                          {correction.price_difference > 0 ? "+" : ""}
                          {correction.price_difference.toLocaleString()} {correction.currency}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <p className="text-xs text-amber-600 mb-3 flex items-start gap-1">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      Vérifié par {correction.gp_name} lors du dépôt. Veuillez confirmer pour débloquer votre commande.
                    </p>

                    {/* Actions */}
                    <Button
                      className="w-full gap-2"
                      onClick={() => setSelectedCorrection(correction)}
                    >
                      <Check className="w-4 h-4" />
                      Confirmer le nouveau poids
                    </Button>
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
                    <div className="border-t pt-2 flex justify-between">
                      <span>Nouveau prix:</span>
                      <span className="font-bold text-lg">
                        {selectedCorrection.new_price.toLocaleString()} {selectedCorrection.currency}
                      </span>
                    </div>
                    {selectedCorrection.price_difference !== 0 && (
                      <p className={`text-sm ${selectedCorrection.price_difference > 0 ? "text-red-600" : "text-green-600"}`}>
                        {selectedCorrection.price_difference > 0 
                          ? `Supplément de ${selectedCorrection.price_difference.toLocaleString()} ${selectedCorrection.currency}`
                          : `Remboursement de ${Math.abs(selectedCorrection.price_difference).toLocaleString()} ${selectedCorrection.currency}`
                        }
                      </p>
                    )}
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  En confirmant, vous acceptez le poids vérifié et le prix ajusté. Votre commande sera débloquée.
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
