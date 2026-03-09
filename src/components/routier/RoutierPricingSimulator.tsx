import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calculator, TrendingUp } from "lucide-react";
import type { CurrencyCode } from "@/components/ui/currency-selector";

interface Props {
  minPrice: number;
  pricePerKm: number;
  pricePerKg: number;
  pricePerM3: number;
  currency: CurrencyCode;
  simDistance: number;
  simWeight: number;
  simVolume: number;
  onSimDistanceChange: (v: number) => void;
  onSimWeightChange: (v: number) => void;
  onSimVolumeChange: (v: number) => void;
}

export function RoutierPricingSimulator({
  minPrice, pricePerKm, pricePerKg, pricePerM3, currency,
  simDistance, simWeight, simVolume,
  onSimDistanceChange, onSimWeightChange, onSimVolumeChange,
}: Props) {
  const result = useMemo(() => {
    const distCost = simDistance * pricePerKm;
    const weightCost = simWeight * pricePerKg;
    const volCost = simVolume * pricePerM3;
    const computed = distCost + weightCost + volCost;
    const total = Math.max(minPrice, computed);
    return { distCost, weightCost, volCost, computed, total };
  }, [minPrice, pricePerKm, pricePerKg, pricePerM3, simDistance, simWeight, simVolume]);

  const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Simulateur de prix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Distance (km)</Label>
            <Input type="number" value={simDistance || ""} onChange={e => onSimDistanceChange(+e.target.value)} placeholder="150" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Poids (kg)</Label>
            <Input type="number" value={simWeight || ""} onChange={e => onSimWeightChange(+e.target.value)} placeholder="500" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Volume (m3)</Label>
            <Input type="number" value={simVolume || ""} onChange={e => onSimVolumeChange(+e.target.value)} placeholder="2" className="h-8 text-sm" />
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Distance: {simDistance} km x {fmt(pricePerKm)}</span>
            <span>{fmt(result.distCost)} {currency}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Poids: {simWeight} kg x {fmt(pricePerKg)}</span>
            <span>{fmt(result.weightCost)} {currency}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Volume: {simVolume} m3 x {fmt(pricePerM3)}</span>
            <span>{fmt(result.volCost)} {currency}</span>
          </div>
          {result.computed < minPrice && (
            <div className="flex justify-between text-muted-foreground">
              <span>Minimum applique</span>
              <span>{fmt(minPrice)} {currency}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold text-sm pt-1">
            <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Prix final</span>
            <span className="text-primary">{fmt(result.total)} {currency}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
