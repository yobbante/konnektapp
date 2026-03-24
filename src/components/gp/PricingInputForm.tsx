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
import { useState } from "react";
import { Euro, Coins, Lock, Info, Package, Edit, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CurrencySelector, getCurrencySymbol, type CurrencyCode } from "@/components/ui/currency-selector";
import { PricingTiersDisplay } from "./PricingTiersDisplay";
import { validatePricingInputs, type GPPricingConfig } from "@/lib/gpPricingEngine";

interface FlatRateItem {
  id: string;
  label: string;
  isActive: boolean;
  price?: number;
}

interface PricingInputFormProps {
  pricePerKg: string;
  forfaitValise: string;
  currency: CurrencyCode;
  onPriceChange: (value: string) => void;
  onForfaitChange: (value: string) => void;
  onCurrencyChange: (value: CurrencyCode) => void;
  locked?: boolean;
  showCurrencySelector?: boolean;
  flatRateItems?: FlatRateItem[];
  onFlatRateToggle?: (id: string, active: boolean) => void;
  onFlatRatePriceChange?: (id: string, price: number) => void;
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
  flatRateItems,
  onFlatRateToggle,
  onFlatRatePriceChange,
}: PricingInputFormProps) {
  const [editingFlatRate, setEditingFlatRate] = useState<string | null>(null);
  const [editingFlatRatePrice, setEditingFlatRatePrice] = useState("");
  const currencySymbol = getCurrencySymbol(currency);
  const basePriceNum = parseFloat(pricePerKg) || 0;
  const forfaitNum = parseFloat(forfaitValise) || 0;

  // Smart placeholders based on currency
  const isCFA = currency === "XOF";
  const placeholderPriceKg = isCFA ? "Ex: 8000" : "Ex: 10";
  const placeholderForfait = isCFA ? "Ex: 150000" : "Ex: 220";
  const stepPriceKg = isCFA ? "100" : "1";
  const stepForfait = isCFA ? "500" : "5";

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
                step={stepPriceKg}
                placeholder={placeholderPriceKg}
                value={pricePerKg}
                onChange={(e) => onPriceChange(e.target.value)}
                onFocus={(e) => { if (e.target.value === "0") onPriceChange(""); }}
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
              Forfait valise 23 kg
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
                step={stepForfait}
                placeholder={placeholderForfait}
                value={forfaitValise}
                onChange={(e) => onForfaitChange(e.target.value)}
                onFocus={(e) => { if (e.target.value === "0") onForfaitChange(""); }}
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

      {/* Flat rate items with switches */}
      {flatRateItems && flatRateItems.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Forfaits par objet
              <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Activez au moins 1 objet à tarif fixe (prix pré-remplis, modifiables)
            </p>
            {flatRateItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  item.isActive ? 'border-primary/40 bg-primary/5' : 'border-border opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Switch
                    checked={item.isActive}
                    onCheckedChange={(checked) => onFlatRateToggle?.(item.id, checked)}
                    disabled={locked}
                  />
                  <span className={`text-sm font-medium ${!item.isActive ? 'text-muted-foreground' : ''}`}>{item.label}</span>
                </div>
                {item.isActive && (
                  <div className="flex items-center gap-2">
                    {onFlatRatePriceChange && editingFlatRate === item.id ? (
                      <>
                        <Input
                          type="number"
                          value={editingFlatRatePrice}
                          onChange={(e) => setEditingFlatRatePrice(e.target.value)}
                          className="w-24 h-8 text-right text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onFlatRatePriceChange(item.id, Number(editingFlatRatePrice));
                              setEditingFlatRate(null);
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            onFlatRatePriceChange?.(item.id, Number(editingFlatRatePrice));
                            setEditingFlatRate(null);
                          }}
                          className="text-primary"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingFlatRate(item.id);
                          setEditingFlatRatePrice(String(item.price || 0));
                        }}
                        className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                        disabled={locked}
                      >
                        {(item.price || 0).toLocaleString()} {currencySymbol}
                        <Edit className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {/* Min 1 active validation hint */}
            {flatRateItems.filter(i => i.isActive).length === 0 && (
              <p className="text-xs text-destructive flex items-center gap-1.5 pt-1">
                <Info className="w-3.5 h-3.5" />
                Activez au moins 1 article forfaitaire pour continuer
              </p>
            )}
          </CardContent>
        </Card>
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
