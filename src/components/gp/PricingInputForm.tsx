/**
 * PricingInputForm — Shared pricing input (2 values only)
 * Used in: Registration Step 4
 * 
 * The GP only enters:
 * 1. Prix au kilo de référence (P₁kg)
 * 2. Prix forfait valise 23 kg
 * 
 * Everything else is auto-calculated.
 */
import { useState, useEffect } from "react";
import { Euro, Coins, Lock, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencySelector, getCurrencySymbol, type CurrencyCode } from "@/components/ui/currency-selector";
import { PricingTiersDisplay } from "./PricingTiersDisplay";
import { validatePricingInputs, type GPPricingConfig } from "@/lib/gpPricingEngine";

interface PricingInputFormProps {
  pricePerKg: string;
  forfaitValise: string;
  currency: CurrencyCode;
  onPriceChange: (value: string) => void;
  onForfaitChange: (value: string) => void;
  onCurrencyChange: (value: CurrencyCode) => void;
  locked?: boolean;
  showCurrencySelector?: boolean;
}

export function PricingInputForm({
  pricePerKg,
  forfaitValise,
  currency,
  onPriceChange,
  onForfaitChange,
  onCurrencyChange,
  locked = false,
  showCurrencySelector = true,
}: PricingInputFormProps) {
  const currencySymbol = getCurrencySymbol(currency);
  const basePriceNum = parseFloat(pricePerKg) || 0;
  const forfaitNum = parseFloat(forfaitValise) || 0;

  const config: GPPricingConfig = {
    basePricePerKg: basePriceNum,
    forfaitValise23kg: forfaitNum,
    currency,
  };

  const validation = validatePricingInputs(basePriceNum, forfaitNum);

  return (
    <div className="space-y-4">
      {/* Currency selector */}
      {showCurrencySelector && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-sm flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Devise de facturation
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {locked ? "Verrouillée définitivement" : "Non modifiable après inscription"}
                </p>
              </div>
              {locked && <Lock className="w-4 h-4 text-muted-foreground" />}
            </div>
            <CurrencySelector
              value={currency}
              onValueChange={(v) => onCurrencyChange(v as CurrencyCode)}
              className="w-full"
              disabled={locked}
            />
          </CardContent>
        </Card>
      )}

      {/* Two input fields */}
      <div className="grid grid-cols-1 gap-4">
        {/* Price per kg */}
        <Card className={`border-2 ${locked ? 'border-muted' : 'border-primary/30'}`}>
          <CardContent className="p-4">
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Euro className="w-4 h-4 text-primary" />
              Prix au kilo de référence
              {locked && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Lock className="w-3 h-3" /> Verrouillé
                </Badge>
              )}
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Ce prix sert de base. Le système calcule automatiquement des tarifs dégressifs.
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                step="100"
                placeholder="Ex: 8000"
                value={pricePerKg}
                onChange={(e) => onPriceChange(e.target.value)}
                className="text-xl font-bold h-12 text-center flex-1"
                disabled={locked}
              />
              <span className="text-lg font-medium text-muted-foreground whitespace-nowrap">
                {currencySymbol}/kg
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Forfait valise 23kg */}
        <Card className={`border-2 ${locked ? 'border-muted' : 'border-accent/30'}`}>
          <CardContent className="p-4">
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              🧳 Forfait valise 23 kg
              {locked && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Lock className="w-3 h-3" /> Verrouillé
                </Badge>
              )}
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Prix fixe tout compris pour une valise standard de 23 kg.
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                step="500"
                placeholder="Ex: 150000"
                value={forfaitValise}
                onChange={(e) => onForfaitChange(e.target.value)}
                className="text-xl font-bold h-12 text-center flex-1"
                disabled={locked}
              />
              <span className="text-lg font-medium text-muted-foreground whitespace-nowrap">
                {currencySymbol}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live preview of calculated tiers */}
      {basePriceNum > 0 && forfaitNum > 0 && (
        <PricingTiersDisplay config={config} locked={locked} />
      )}

      {/* Validation message */}
      {!validation.valid && basePriceNum > 0 && forfaitNum > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            {validation.error}
          </p>
        </div>
      )}
    </div>
  );
}
