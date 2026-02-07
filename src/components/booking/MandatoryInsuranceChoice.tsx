import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, Check, Info, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getCurrencySymbol, type CurrencyCode } from "@/components/ui/currency-selector";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { cn } from "@/lib/utils";

interface InsuranceTier {
  id: string;
  category: string;
  label: string;
  max_declared_value: number; // Stored in FCFA
  insurance_fee: number; // Stored in FCFA
}

interface MandatoryInsuranceChoiceProps {
  selectedContentTypes: string[]; // alimentaire, vetements, telephone, etc.
  currency?: CurrencyCode; // V1.2: Imposed by GP - client cannot change
  onChoiceChange: (choice: InsuranceChoice) => void;
  disabled?: boolean;
}

export interface InsuranceChoice {
  hasInsurance: boolean;
  insuranceAmount: number; // In FCFA
  tierId: string | null;
  declaredValue: number; // In GP currency (for display) - converted to FCFA internally
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
 * V1.2: Calcul assurance en FCFA, affichage double devise
 * 
 * Formule:
 * valeur_colis_fcfa = valeur_colis_devise_gp × taux_conversion_majoré
 * assurance_fcfa = fee from insurance_tier (based on category)
 * assurance_affichée_devise_gp = assurance_fcfa ÷ taux_conversion
 */
export function MandatoryInsuranceChoice({
  selectedContentTypes,
  currency = "XOF", // V1.2: Default to XOF (FCFA)
  onChoiceChange,
  disabled = false,
}: MandatoryInsuranceChoiceProps) {
  const [tiers, setTiers] = useState<InsuranceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<"with" | "without" | null>(null);
  const [declaredValue, setDeclaredValue] = useState<string>("");
  
  // V1.2: Currency conversion hook for dual display
  const { fromFCFA, toFCFA, isFCFA, rates } = useCurrencyConversion({ gpCurrency: currency });
  const gpSymbol = getCurrencySymbol(currency);

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
      // V1.2: Insurance fee is stored in FCFA
      const insuranceFCFA = tier?.insurance_fee || 0;
      onChoiceChange({
        hasInsurance: true,
        insuranceAmount: insuranceFCFA, // Store in FCFA
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

  // V2: Check if declared value exceeds maximum coverage
  const declaredValueNum = parseFloat(declaredValue) || 0;
  const declaredValueFCFA = toFCFA(declaredValueNum);
  const maxCoverage = applicableTier?.max_declared_value || 0;
  const exceedsMaxCoverage = selectedOption === "with" && applicableTier && declaredValueNum > 0 && declaredValueFCFA > maxCoverage;
  
  // V1.2: Helper to format dual currency (FCFA primary, GP secondary)
  const formatDualFCFA = (amountFCFA: number) => {
    if (isFCFA) {
      return {
        main: `${amountFCFA.toLocaleString()} FCFA`,
        equivalent: null,
      };
    }
    const gpAmount = Math.round(fromFCFA(amountFCFA));
    return {
      main: `${amountFCFA.toLocaleString()} FCFA`,
      equivalent: `≈ ${gpAmount.toLocaleString()} ${gpSymbol}`,
    };
  };

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
            <CardTitle className="text-base">Assurance Konnekt</CardTitle>
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
                <span className="font-semibold">Ajouter l'assurance Konnekt</span>
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                  Recommandée
                </Badge>
              </Label>
              <p className="text-sm text-muted-foreground">
                L'assurance couvre les pertes ou dommages selon les conditions Konnekt.
              </p>
              
              {selectedOption === "with" && applicableTier && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 space-y-3"
                >
                  {/* Declared value input - V1.2: Input in GP currency */}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Valeur déclarée en {gpSymbol} (optionnel)
                    </Label>
                    <Input
                      type="number"
                      placeholder="Ex: 50000"
                      value={declaredValue}
                      onChange={(e) => setDeclaredValue(e.target.value)}
                     className={cn(
                       "mt-1",
                       exceedsMaxCoverage && "border-destructive focus-visible:ring-destructive"
                     )}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum couvert:{" "}
                      <span className="font-medium">
                        {formatDualFCFA(applicableTier.max_declared_value).main}
                      </span>
                      {formatDualFCFA(applicableTier.max_declared_value).equivalent && (
                        <span className="ml-1">
                          ({formatDualFCFA(applicableTier.max_declared_value).equivalent})
                        </span>
                      )}
                    </p>
                  </div>

                 {/* V2: Warning when declared value exceeds max coverage */}
                 {exceedsMaxCoverage && (
                   <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                     <div className="flex items-start gap-2">
                       <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                       <div>
                         <p className="text-sm font-medium text-destructive">
                           Valeur non couverte
                         </p>
                         <p className="text-xs text-destructive/80 mt-1">
                           La valeur déclarée ({declaredValueNum.toLocaleString()} {gpSymbol} ≈ {Math.round(declaredValueFCFA).toLocaleString()} FCFA) 
                           dépasse le maximum couvert ({maxCoverage.toLocaleString()} FCFA). 
                           En cas de sinistre, l'indemnisation sera plafonnée au maximum couvert.
                         </p>
                       </div>
                     </div>
                   </div>
                 )}

                  {/* Insurance details with dual currency - V1.2: FCFA primary */}
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Catégorie: <strong>{applicableTier.label}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>Frais d'assurance:</span>
                      <strong className="text-primary">
                        {formatDualFCFA(applicableTier.insurance_fee).main}
                      </strong>
                      {formatDualFCFA(applicableTier.insurance_fee).equivalent && (
                        <span className="text-muted-foreground text-xs">
                          ({formatDualFCFA(applicableTier.insurance_fee).equivalent})
                        </span>
                      )}
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
                    Vous assumez l'entière responsabilité de votre envoi
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

        {/* Info footer - V1.2: Currency conversion info */}
        <div className="flex items-start gap-2 pt-2 border-t">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Prix d'assurance calculé en FCFA puis converti selon la devise du transporteur ({gpSymbol}).
          </p>
        </div>
        
        {/* Currency info banner */}
        {!isFCFA && (
          <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg mt-2">
            Tous les montants sont calculés en FCFA (XOF) puis convertis automatiquement.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
