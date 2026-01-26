import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, Check, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getCurrencySymbol, type CurrencyCode } from "@/components/ui/currency-selector";
import { cn } from "@/lib/utils";

interface InsuranceTier {
  id: string;
  category: string;
  label: string;
  max_declared_value: number;
  insurance_fee: number;
}

interface MandatoryInsuranceChoiceProps {
  selectedContentTypes: string[]; // alimentaire, vetements, telephone, etc.
  currency?: CurrencyCode;
  onChoiceChange: (choice: InsuranceChoice) => void;
  disabled?: boolean;
}

export interface InsuranceChoice {
  hasInsurance: boolean;
  insuranceAmount: number;
  tierId: string | null;
  declaredValue: number;
  choiceMade: boolean; // Must be true to proceed
}

// Map content types to insurance categories
const CONTENT_TO_CATEGORY: Record<string, string> = {
  alimentaire: "alimentaire",
  vetements: "vetements",
  tissus: "tissus",
  colis_standard: "colis_standard",
  telephone: "telephone",
  ordinateur: "ordinateur",
  document: "document",
  bijoux: "bijoux",
  piece_auto: "piece_auto",
  autres: "autres",
};

/**
 * RÈGLE INS-01 — Choix explicite obligatoire
 * 
 * Avant le paiement, le client doit obligatoirement cocher:
 * ☐ Ajouter l'assurance Yobbanté (recommandée)
 * ☐ Continuer sans assurance
 * 
 * Aucun choix par défaut.
 */
export function MandatoryInsuranceChoice({
  selectedContentTypes,
  currency = "XOF",
  onChoiceChange,
  disabled = false,
}: MandatoryInsuranceChoiceProps) {
  const [tiers, setTiers] = useState<InsuranceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<"with" | "without" | null>(null);
  const [declaredValue, setDeclaredValue] = useState<string>("");

  useEffect(() => {
    loadInsuranceTiers();
  }, []);

  useEffect(() => {
    // Emit choice change
    if (selectedOption === null) {
      onChoiceChange({
        hasInsurance: false,
        insuranceAmount: 0,
        tierId: null,
        declaredValue: 0,
        choiceMade: false,
      });
    } else if (selectedOption === "without") {
      onChoiceChange({
        hasInsurance: false,
        insuranceAmount: 0,
        tierId: null,
        declaredValue: 0,
        choiceMade: true,
      });
    } else if (selectedOption === "with") {
      const tier = findApplicableTier();
      onChoiceChange({
        hasInsurance: true,
        insuranceAmount: tier?.insurance_fee || 0,
        tierId: tier?.id || null,
        declaredValue: parseFloat(declaredValue) || 0,
        choiceMade: true,
      });
    }
  }, [selectedOption, declaredValue, tiers]);

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
    if (selectedContentTypes.length === 0 || tiers.length === 0) return null;

    // Map content types to categories and find the highest value tier
    const categories = selectedContentTypes.map(t => CONTENT_TO_CATEGORY[t] || "autres");
    
    // Find the tier with highest fee among applicable categories (covers highest risk)
    let highestTier: InsuranceTier | null = null;
    for (const category of categories) {
      const tier = tiers.find(t => t.category === category);
      if (tier && (!highestTier || tier.insurance_fee > highestTier.insurance_fee)) {
        highestTier = tier;
      }
    }

    return highestTier || tiers.find(t => t.category === "autres") || tiers[0] || null;
  };

  const applicableTier = findApplicableTier();
  const currencySymbol = getCurrencySymbol(currency);

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="animate-pulse h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-300 border-2",
      selectedOption === null ? "border-destructive/50" : "border-primary/30"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Assurance Yobbanté</CardTitle>
          </div>
          <Badge variant="destructive" className="text-xs">
            Obligatoire
          </Badge>
        </div>
        <CardDescription className="text-sm">
          Vous devez faire un choix avant de continuer
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedOption || ""}
          onValueChange={(v) => setSelectedOption(v as "with" | "without")}
          disabled={disabled}
        >
          {/* Option 1: With insurance */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
              selectedOption === "with" 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
            onClick={() => !disabled && setSelectedOption("with")}
          >
            <RadioGroupItem value="with" id="insurance-with" className="mt-1" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="insurance-with" className="flex items-center gap-2 cursor-pointer">
                <Shield className="w-4 h-4 text-primary" />
                <span className="font-semibold">Ajouter l'assurance Yobbanté</span>
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                  Recommandée
                </Badge>
              </Label>
              <p className="text-sm text-muted-foreground">
                L'assurance couvre les pertes ou dommages selon les conditions Yobbanté.
              </p>
              
              {selectedOption === "with" && applicableTier && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 space-y-3"
                >
                  {/* Declared value input */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Valeur déclarée (optionnel)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 50000"
                      value={declaredValue}
                      onChange={(e) => setDeclaredValue(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum couvert: {applicableTier.max_declared_value.toLocaleString()} {currencySymbol}
                    </p>
                  </div>

                  {/* Insurance details */}
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Catégorie: <strong>{applicableTier.label}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Frais d'assurance: <strong className="text-primary">{applicableTier.insurance_fee.toLocaleString()} {currencySymbol}</strong></span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Option 2: Without insurance */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
              selectedOption === "without" 
                ? "border-orange-500 bg-orange-500/5" 
                : "border-border hover:border-orange-500/50"
            )}
            onClick={() => !disabled && setSelectedOption("without")}
          >
            <RadioGroupItem value="without" id="insurance-without" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="insurance-without" className="flex items-center gap-2 cursor-pointer">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="font-semibold">Continuer sans assurance</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                En cas de perte ou dommage, Yobbanté ne pourra pas vous indemniser.
              </p>
              
              {selectedOption === "without" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                >
                  <p className="text-xs text-orange-700 dark:text-orange-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Vous assumez tous les risques liés à votre envoi
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </RadioGroup>

        {/* Warning if no choice made */}
        {selectedOption === null && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">
              Vous devez faire un choix pour continuer
            </p>
          </div>
        )}

        {/* Info footer */}
        <div className="flex items-start gap-2 pt-2 border-t">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Prix d'assurance défini par l'administration Yobbanté et basé sur le type et la valeur des articles.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
