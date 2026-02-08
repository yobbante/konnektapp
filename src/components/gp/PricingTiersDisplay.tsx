/**
 * PricingTiersDisplay — Shared component for displaying calculated pricing tiers
 * Used in: Registration Step 4, GPTarificationPage, Booking flow
 */
import { useState } from "react";
import { Info, Lock, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  calculateTiers, 
  WEIGHT_TIER_COEFFICIENTS,
  type GPPricingConfig, 
  type CalculatedTier 
} from "@/lib/gpPricingEngine";
import { getCurrencySymbol } from "@/components/ui/currency-selector";

interface PricingTiersDisplayProps {
  config: GPPricingConfig;
  locked?: boolean;
  compact?: boolean;
}

export function PricingTiersDisplay({ config, locked = false, compact = false }: PricingTiersDisplayProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const tiers = calculateTiers(config);
  const currencySymbol = getCurrencySymbol(config.currency as any);

  return (
    <div className="space-y-3">
      {/* Header with info button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Paliers tarifaires</span>
          {locked && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Lock className="w-3 h-3" /> Verrouillé
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1 h-7"
          onClick={() => setShowExplanation(true)}
        >
          <Info className="w-3.5 h-3.5" />
          Comment ça marche ?
        </Button>
      </div>

      {/* Tiers list */}
      <div className={`space-y-1.5 ${compact ? '' : 'space-y-2'}`}>
        {tiers.map((tier, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all
              ${tier.isForfait 
                ? 'bg-primary/5 border-primary/20' 
                : 'bg-muted/30 border-border'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Badge 
                variant={tier.isForfait ? "default" : "outline"} 
                className="font-mono text-xs min-w-[90px] justify-center"
              >
                {tier.label}
              </Badge>
              {!compact && !tier.isForfait && (
                <span className="text-[10px] text-muted-foreground">
                  ×{tier.coefficient}
                </span>
              )}
            </div>
            <span className={`font-semibold text-sm ${tier.isForfait ? 'text-primary' : ''}`}>
              {tier.isForfait 
                ? `${tier.price_per_kg.toLocaleString()} ${currencySymbol}`
                : `${tier.price_per_kg.toLocaleString()} ${currencySymbol}/kg`
              }
            </span>
          </div>
        ))}
      </div>

      {/* Explanation Dialog */}
      <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Comment sont calculés mes tarifs ?
            </DialogTitle>
            <DialogDescription>
              Konnekt applique automatiquement une réduction progressive du prix au kilo selon le poids du colis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Plus le colis est lourd, plus le coût au kilo diminue. Cela vous rend 
              plus compétitif sans modifier votre prix de base.
            </p>

            {/* Coefficient table */}
            <div className="rounded-lg border overflow-hidden">
              <div className="grid grid-cols-3 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Palier</span>
                <span className="text-center">Coefficient</span>
                <span className="text-right">Logique</span>
              </div>
              {WEIGHT_TIER_COEFFICIENTS.map((tier, i) => (
                <div key={i} className="grid grid-cols-3 px-3 py-2 text-xs border-t items-center">
                  <span className="font-medium">{tier.label}</span>
                  <span className="text-center font-mono">×{tier.coefficient}</span>
                  <span className="text-right text-muted-foreground">{tier.description}</span>
                </div>
              ))}
              <div className="grid grid-cols-3 px-3 py-2 text-xs border-t bg-primary/5 items-center">
                <span className="font-medium text-primary">Valise 23 kg</span>
                <span className="text-center font-mono">—</span>
                <span className="text-right text-muted-foreground">Prix fixe</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">
              Les coefficients sont fixés par le système Konnekt et ne peuvent pas être modifiés.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
