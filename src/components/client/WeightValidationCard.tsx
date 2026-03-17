import { motion } from "framer-motion";
import { AlertTriangle, Check, X, Info, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DualCurrencyDisplay } from "@/components/booking/DualCurrencyDisplay";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { cn } from "@/lib/utils";

export interface WeightValidation {
  order_id: string;
  order_number: string;
  declared_weight: number;
  actual_weight: number;
  original_weight_price: number;
  new_weight_price: number;
  weight_price_difference: number;
  fixed_insurance: number;
  fixed_logistics: number; // FCFA (XOF)
  new_total: number;
  original_total: number;
  currency: string; // GP currency
  gp_name: string;
  gp_id: string;
}

interface WeightValidationCardProps {
  validation: WeightValidation;
  onAccept: () => void;
  onRefuse: () => void;
}

export function WeightValidationCard({
  validation,
  onAccept,
  onRefuse,
}: WeightValidationCardProps) {
  const { getFCFAEquivalent } = useCurrencyConversion({ gpCurrency: validation.currency });

  const isUpcharge = validation.weight_price_difference > 0;

  return (
    <>
      {/* CRITICAL BANNER - Non-dismissible */}
      <Alert variant="destructive" className="mb-2 border-destructive bg-destructive/10">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle className="font-bold">
          Validation requise — Modification de poids
        </AlertTitle>
        <AlertDescription className="text-xs">
          Le transporteur a mesuré un poids différent lors du dépôt. Votre réservation est bloquée.
        </AlertDescription>
      </Alert>

      <Card className="border-destructive/50 bg-destructive/5 shadow-lg mb-4">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            {/* Pulsing Warning Icon */}
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-destructive flex items-center justify-center flex-shrink-0"
            >
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive-foreground" />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                Commande{" "}
                <span className="font-mono font-bold text-foreground">
                  {validation.order_number}
                </span>
                <span className="hidden sm:inline"> • {validation.gp_name}</span>
              </p>

              {/* Weight Comparison */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-background rounded-lg mb-3 border border-destructive/20">
                <div className="text-center">
                  <p className="text-[11px] text-muted-foreground">Poids déclaré</p>
                  <p className="font-bold text-base sm:text-lg line-through text-destructive">
                    {validation.declared_weight} kg
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-[11px] text-muted-foreground">Poids réel mesuré</p>
                  <p className="font-bold text-base sm:text-lg text-foreground">
                    {validation.actual_weight} kg
                  </p>
                </div>
              </div>

              {/* Price Impact */}
              <div className="p-3 bg-background rounded-lg mb-3 border border-border space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Impact sur le prix transport
                  </span>
                  <span
                    className={cn(
                      "text-xs sm:text-sm font-bold text-right",
                      isUpcharge ? "text-destructive" : "text-success"
                    )}
                  >
                    {isUpcharge ? "+" : ""}
                    <DualCurrencyDisplay
                      inline
                      size="sm"
                      amount={validation.weight_price_difference}
                      currency={validation.currency}
                      fcfaEquivalent={getFCFAEquivalent(validation.weight_price_difference)}
                    />
                  </span>
                </div>

                {validation.fixed_insurance > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] sm:text-xs text-muted-foreground">
                      Assurance (inchangee)
                    </span>
                    <DualCurrencyDisplay
                      inline
                      size="sm"
                      amount={validation.fixed_insurance}
                      currency={validation.currency}
                      fcfaEquivalent={getFCFAEquivalent(validation.fixed_insurance)}
                      className="text-[11px] sm:text-xs text-muted-foreground text-right"
                    />
                  </div>
                )}

                {validation.fixed_logistics > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] sm:text-xs text-muted-foreground">
                      Logistique (inchangee)
                    </span>
                    <DualCurrencyDisplay
                      inline
                      size="sm"
                      amount={validation.fixed_logistics}
                      currency="XOF"
                      className="text-[11px] sm:text-xs text-muted-foreground text-right"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2 border-t">
                  <span className="text-xs sm:text-sm font-bold">Nouveau total</span>
                  <DualCurrencyDisplay
                    inline
                    size="md"
                    amount={validation.new_total}
                    currency={validation.currency}
                    fcfaEquivalent={getFCFAEquivalent(validation.new_total)}
                    className="text-primary text-right"
                  />
                </div>
              </div>

              {/* Info disclaimer */}
              <p className="text-[10px] text-muted-foreground mb-2 flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                L'assurance et la logistique restent inchangées. Seul le prix du transport est ajusté.
              </p>

              {/* Consequences info */}
              <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg mb-3 border border-amber-200 dark:border-amber-400/20">
                <div className="text-[10px] text-amber-800 dark:text-amber-300 space-y-1">
                  <span className="font-semibold block">En cas de refus ou d'inaction :</span>
                  <span className="block">• L'envoi sera annulé et vous serez <strong>intégralement remboursé</strong>.</span>
                  <span className="block">• <strong>Konnekt Logistique</strong> vous ramènera votre colis.</span>
                  <span className="block">• Si vous ne répondez pas avant le départ du transporteur, l'envoi sera automatiquement annulé.</span>
                </div>
              </div>

              {/* PRV: ONLY 2 ACTIONS */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="w-full sm:flex-1 gap-2 border-destructive text-destructive hover:bg-destructive/10"
                  onClick={onRefuse}
                >
                  <X className="w-4 h-4" />
                  Refuser et annuler l'envoi
                </Button>
                <Button className="w-full sm:flex-1 gap-2" onClick={onAccept}>
                  <Check className="w-4 h-4" />
                  Accepter et payer le supplément
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
