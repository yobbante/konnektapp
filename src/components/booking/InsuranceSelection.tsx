import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Info, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getCurrencySymbol, type CurrencyCode } from "@/components/ui/currency-selector";

interface InsuranceTier {
  id: string;
  category: string;
  label: string;
  max_declared_value: number;
  insurance_fee: number;
  is_active: boolean;
  sort_order: number;
}

interface InsuranceSelectionProps {
  selectedContentNatures: string[];
  currency?: CurrencyCode;
  onInsuranceChange: (hasInsurance: boolean, insuranceAmount: number, tierId: string | null) => void;
  disabled?: boolean;
}

// Map content natures to insurance categories
const NATURE_TO_CATEGORY: Record<string, string> = {
  alimentaire: "alimentaire",
  vetements: "alimentaire", // Same tier as alimentaire
  tissus: "vetements",
  documents: "documents",
  telephone: "telephone",
  ordinateur: "ordinateur",
  autres: "autres",
};

export function InsuranceSelection({
  selectedContentNatures,
  currency = "XOF",
  onInsuranceChange,
  disabled = false,
}: InsuranceSelectionProps) {
  const [tiers, setTiers] = useState<InsuranceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [selectedTier, setSelectedTier] = useState<InsuranceTier | null>(null);

  useEffect(() => {
    loadInsuranceTiers();
  }, []);

  useEffect(() => {
    // Auto-select appropriate tier based on content natures
    if (hasInsurance && selectedContentNatures.length > 0 && tiers.length > 0) {
      const applicableTier = findApplicableTier();
      setSelectedTier(applicableTier);
      onInsuranceChange(true, applicableTier?.insurance_fee || 0, applicableTier?.id || null);
    } else {
      onInsuranceChange(hasInsurance, 0, null);
    }
  }, [hasInsurance, selectedContentNatures, tiers]);

  const loadInsuranceTiers = async () => {
    try {
      const { data, error } = await supabase
        .from("insurance_tiers")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error("Error loading insurance tiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const findApplicableTier = (): InsuranceTier | null => {
    if (selectedContentNatures.length === 0 || tiers.length === 0) return null;

    // Map content natures to categories and find the highest value tier
    const categories = selectedContentNatures.map(n => NATURE_TO_CATEGORY[n] || "autres");
    
    // Find the tier with highest fee among applicable categories (covers highest risk)
    let highestTier: InsuranceTier | null = null;
    for (const category of categories) {
      const tier = tiers.find(t => t.category === category);
      if (tier && (!highestTier || tier.insurance_fee > highestTier.insurance_fee)) {
        highestTier = tier;
      }
    }

    return highestTier || tiers.find(t => t.category === "autres") || null;
  };

  const handleToggleInsurance = (checked: boolean) => {
    setHasInsurance(checked);
    if (!checked) {
      setSelectedTier(null);
      onInsuranceChange(false, 0, null);
    }
  };

  const currencySymbol = getCurrencySymbol(currency);

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="animate-pulse h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-300",
      hasInsurance ? "border-primary shadow-md" : "border-dashed"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={cn(
              "w-5 h-5 transition-colors",
              hasInsurance ? "text-primary" : "text-muted-foreground"
            )} />
            <CardTitle className="text-base">Assurance Konnekt</CardTitle>
          </div>
          <Badge variant={hasInsurance ? "default" : "secondary"}>
            Optionnelle
          </Badge>
        </div>
        <CardDescription className="text-sm">
          Protégez votre envoi contre les dommages et pertes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle insurance */}
        <div 
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
            hasInsurance ? "bg-primary/10" : "bg-muted/50 hover:bg-muted"
          )}
          onClick={() => !disabled && handleToggleInsurance(!hasInsurance)}
        >
          <Checkbox 
            id="insurance" 
            checked={hasInsurance}
            onCheckedChange={(checked) => handleToggleInsurance(checked as boolean)}
            disabled={disabled}
          />
          <Label 
            htmlFor="insurance" 
            className="flex-1 cursor-pointer text-sm font-medium"
          >
            Souscrire à l'assurance Konnekt
          </Label>
          {hasInsurance && selectedTier && (
            <Badge variant="outline" className="bg-background">
              +{selectedTier.insurance_fee.toLocaleString()} {currencySymbol}
            </Badge>
          )}
        </div>

        {/* Insurance details */}
        {hasInsurance && selectedTier && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Catégorie couverte: <strong>{selectedTier.label}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Valeur max. déclarée: <strong>{selectedTier.max_declared_value.toLocaleString()} {currencySymbol}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Frais d'assurance: <strong>{selectedTier.insurance_fee.toLocaleString()} {currencySymbol}</strong></span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                En cas de perte ou dommage, vous serez indemnisé jusqu'à la valeur déclarée, dans la limite de {selectedTier.max_declared_value.toLocaleString()} {currencySymbol}.
              </p>
            </div>
          </motion.div>
        )}

        {/* Info message when no insurance */}
        {!hasInsurance && (
          <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Sans assurance, Konnekt ne peut pas garantir le remboursement en cas de perte ou dommage.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Admin component to manage insurance tiers
 */
export function AdminInsuranceTiers() {
  const [tiers, setTiers] = useState<InsuranceTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    const { data } = await supabase
      .from("insurance_tiers")
      .select("*")
      .order("sort_order");
    setTiers(data || []);
    setLoading(false);
  };

  // Admin management UI would go here
  return (
    <Card>
      <CardHeader>
        <CardTitle>Paliers d'assurance</CardTitle>
        <CardDescription>Gérez les niveaux d'assurance disponibles</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {tiers.map(tier => (
              <div key={tier.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{tier.label}</p>
                  <p className="text-sm text-muted-foreground">
                    Max: {tier.max_declared_value.toLocaleString()} F • Frais: {tier.insurance_fee.toLocaleString()} F
                  </p>
                </div>
                <Badge variant={tier.is_active ? "default" : "secondary"}>
                  {tier.is_active ? "Actif" : "Inactif"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
