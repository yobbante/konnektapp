import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Scale, Save, RefreshCw, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol, type CurrencyCode } from "@/components/ui/currency-selector";

interface WeightTier {
  id?: string;
  min_weight: number;
  max_weight: number;
  price_per_kg: number;
  currency: string;
  is_active: boolean;
}

interface WeightTiersPricingProps {
  gpId: string;
  currency: CurrencyCode;
  onUpdate?: () => void;
  isRegistration?: boolean;
  initialTiers?: WeightTier[];
  onTiersChange?: (tiers: WeightTier[]) => void;
}

// Default weight tiers from PRD V1 - <1kg at top
const DEFAULT_TIERS: Omit<WeightTier, "id" | "currency">[] = [
  { min_weight: 0, max_weight: 1, price_per_kg: 0, is_active: true },    // <1kg tier at top
  { min_weight: 1, max_weight: 5, price_per_kg: 0, is_active: true },
  { min_weight: 5, max_weight: 10, price_per_kg: 0, is_active: true },
  { min_weight: 10, max_weight: 15, price_per_kg: 0, is_active: true },
  { min_weight: 15, max_weight: 20, price_per_kg: 0, is_active: true },
];

// Format tier label for display
const formatTierLabel = (tier: WeightTier): string => {
  if (tier.min_weight === 0) {
    return `< ${tier.max_weight} kg`;
  }
  return `${tier.min_weight}-${tier.max_weight} kg`;
};

export function WeightTiersPricing({
  gpId,
  currency,
  onUpdate,
  isRegistration = false,
  initialTiers,
  onTiersChange,
}: WeightTiersPricingProps) {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<WeightTier[]>(
    initialTiers || DEFAULT_TIERS.map(t => ({ ...t, currency }))
  );
  const [loading, setLoading] = useState(!isRegistration);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isRegistration && gpId) {
      loadTiers();
    }
  }, [gpId, isRegistration]);

  useEffect(() => {
    // Update currency for all tiers when it changes
    setTiers(prev => prev.map(t => ({ ...t, currency })));
  }, [currency]);

  useEffect(() => {
    // Notify parent of tier changes (for registration flow)
    if (onTiersChange) {
      onTiersChange(tiers);
    }
  }, [tiers, onTiersChange]);

  const loadTiers = async () => {
    try {
      const { data, error } = await supabase
        .from("gp_weight_tiers")
        .select("*")
        .eq("gp_id", gpId)
        .order("min_weight", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setTiers(data);
      } else {
        // Create default tiers if none exist
        await createDefaultTiers();
      }
    } catch (error) {
      console.error("Error loading weight tiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultTiers = async () => {
    const tiersToInsert = DEFAULT_TIERS.map(t => ({
      ...t,
      gp_id: gpId,
      currency,
    }));

    const { data, error } = await supabase
      .from("gp_weight_tiers")
      .insert(tiersToInsert)
      .select();

    if (!error && data) {
      setTiers(data);
    }
  };

  const handlePriceChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setTiers(prev => prev.map((t, i) => 
      i === index ? { ...t, price_per_kg: numValue } : t
    ));
  };

  const handleSave = async () => {
    if (isRegistration) return; // Parent handles saving during registration

    setSaving(true);
    try {
      // Validate that all tiers have prices
      const hasEmptyPrices = tiers.some(t => t.price_per_kg <= 0);
      if (hasEmptyPrices) {
        toast({
          title: "Tarifs incomplets",
          description: "Veuillez définir un prix pour chaque palier",
          variant: "destructive",
        });
        return;
      }

      // Upsert all tiers
      for (const tier of tiers) {
        if (tier.id) {
          await supabase
            .from("gp_weight_tiers")
            .update({
              price_per_kg: tier.price_per_kg,
              currency: tier.currency,
              is_active: tier.is_active,
            })
            .eq("id", tier.id);
        } else {
          await supabase
            .from("gp_weight_tiers")
            .insert({
              gp_id: gpId,
              min_weight: tier.min_weight,
              max_weight: tier.max_weight,
              price_per_kg: tier.price_per_kg,
              currency: tier.currency,
              is_active: tier.is_active,
            });
        }
      }

      toast({
        title: "Tarifs enregistrés",
        description: "Vos paliers de poids ont été mis à jour",
      });
      onUpdate?.();
    } catch (error: any) {
      console.error("Error saving weight tiers:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les tarifs",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const currencySymbol = getCurrencySymbol(currency);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Tarification au kilo</CardTitle>
          </div>
          <Badge variant="secondary">{currency}</Badge>
        </div>
        <CardDescription className="flex items-start gap-2 mt-2">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <span>
            Définissez un prix par kilo pour chaque palier de poids. 
            Les clients verront automatiquement le tarif correspondant à leur envoi.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tiers.map((tier, index) => (
          <motion.div
            key={tier.id || index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
          >
            <div className="flex items-center gap-2 min-w-[100px]">
              <Badge variant={tier.min_weight === 0 ? "default" : "outline"} className="font-mono whitespace-nowrap">
                {formatTierLabel(tier)}
              </Badge>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="1"
                value={tier.price_per_kg || ""}
                onChange={(e) => handlePriceChange(index, e.target.value)}
                placeholder="0"
                className="w-24 text-right font-mono"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {currencySymbol}/kg
              </span>
            </div>
          </motion.div>
        ))}

        {!isRegistration && (
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full mt-4"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer les tarifs
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
