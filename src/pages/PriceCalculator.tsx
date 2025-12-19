import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Calculator, Package, MapPin, Scale, Ruler, ArrowRight, 
  Zap, Truck, Ship, Plane, Briefcase, Sparkles, Clock,
  TrendingDown, AlertTriangle, CheckCircle, Lightbulb
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur";

const transportTypes = [
  { type: "express" as TransportType, icon: Zap, label: "Express" },
  { type: "routier" as TransportType, icon: Truck, label: "Routier" },
  { type: "maritime" as TransportType, icon: Ship, label: "Maritime" },
  { type: "aerien" as TransportType, icon: Plane, label: "Aérien" },
  { type: "voyageur" as TransportType, icon: Briefcase, label: "Voyageur" },
];

const countries = [
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "GN", name: "Guinée", flag: "🇬🇳" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "AE", name: "Dubai", flag: "🇦🇪" },
];

interface PricingResult {
  chargeableWeight: number;
  pricePerKg: number;
  basePrice: number;
  insuranceAmount: number;
  totalPrice: number;
  estimatedDays: number;
  currency: string;
}

interface Alternative {
  type: string;
  pricePerKg: number;
  totalPrice: number;
  estimatedDays: number;
}

interface AIRecommendation {
  recommendation: string;
  alternativeTransport: string | null;
  savings: number;
  riskLevel: "low" | "medium" | "high";
  tips: string[];
}

export default function PriceCalculator() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    pricing: PricingResult;
    alternatives: Alternative[];
    aiRecommendations: AIRecommendation | null;
  } | null>(null);

  const [formData, setFormData] = useState({
    weight: "",
    length: "",
    width: "",
    height: "",
    originCountry: "SN",
    originCity: "Dakar",
    destinationCountry: "CI",
    destinationCity: "Abidjan",
    transportType: "routier" as TransportType,
    isUrgent: false,
    declaredValue: "",
  });

  const calculatePrice = async () => {
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un poids valide",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-price", {
        body: {
          weight: parseFloat(formData.weight),
          length: formData.length ? parseFloat(formData.length) : undefined,
          width: formData.width ? parseFloat(formData.width) : undefined,
          height: formData.height ? parseFloat(formData.height) : undefined,
          originCountry: formData.originCountry,
          originCity: formData.originCity,
          destinationCountry: formData.destinationCountry,
          destinationCity: formData.destinationCity,
          transportType: formData.transportType,
          isUrgent: formData.isUrgent,
          declaredValue: formData.declaredValue ? parseFloat(formData.declaredValue) : undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setResult(data);
    } catch (error) {
      console.error("Calculation error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de calculer le prix",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const riskColors = {
    low: "text-success",
    medium: "text-warning",
    high: "text-destructive",
  };

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      <div className="px-4 py-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Calculateur IA</h1>
          <p className="text-sm text-muted-foreground">
            Estimez le prix de votre envoi intelligemment
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Transport Type */}
          <div className="mobile-card">
            <Label className="text-sm font-medium mb-3 block">Type de transport</Label>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {transportTypes.map((t) => (
                <button
                  key={t.type}
                  onClick={() => setFormData({ ...formData, transportType: t.type })}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    formData.transportType === t.type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border"
                  }`}
                >
                  <t.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Origin & Destination */}
          <div className="mobile-card">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Pays départ</Label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  value={formData.originCountry}
                  onChange={(e) => setFormData({ ...formData, originCountry: e.target.value })}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Ville départ</Label>
                <Input
                  placeholder="Dakar"
                  value={formData.originCity}
                  onChange={(e) => setFormData({ ...formData, originCity: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs">Pays arrivée</Label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  value={formData.destinationCountry}
                  onChange={(e) => setFormData({ ...formData, destinationCountry: e.target.value })}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Ville arrivée</Label>
                <Input
                  placeholder="Abidjan"
                  value={formData.destinationCity}
                  onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Weight & Dimensions */}
          <div className="mobile-card">
            <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
              <Scale className="w-4 h-4" /> Poids et dimensions
            </Label>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Poids (kg) *</Label>
                <Input
                  type="number"
                  placeholder="5"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs">L (cm)</Label>
                <Input
                  type="number"
                  placeholder="30"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs">l (cm)</Label>
                <Input
                  type="number"
                  placeholder="20"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Valeur déclarée (FCFA)</Label>
                <Input
                  type="number"
                  placeholder="50000"
                  value={formData.declaredValue}
                  onChange={(e) => setFormData({ ...formData, declaredValue: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs">H (cm)</Label>
                <Input
                  type="number"
                  placeholder="15"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isUrgent}
                    onCheckedChange={(checked) => setFormData({ ...formData, isUrgent: checked })}
                  />
                  <Label className="text-xs">Urgent</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Calculate Button */}
          <Button
            onClick={calculatePrice}
            disabled={loading}
            className="w-full h-12"
            variant="default"
          >
            {loading ? (
              <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Calculer avec l'IA
              </>
            )}
          </Button>
        </motion.div>

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4"
          >
            {/* Main Price */}
            <div className="mobile-card bg-primary/5 border-primary/20">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground mb-1">Prix total estimé</p>
                <p className="text-3xl font-bold text-primary">
                  {result.pricing.totalPrice.toLocaleString()} <span className="text-lg">FCFA</span>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Poids facturé</p>
                  <p className="font-semibold">{result.pricing.chargeableWeight} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Prix/kg</p>
                  <p className="font-semibold">{result.pricing.pricePerKg} FCFA</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Délai estimé</p>
                  <p className="font-semibold flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    {result.pricing.estimatedDays}j
                  </p>
                </div>
              </div>
              {result.pricing.insuranceAmount > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Assurance incluse: {result.pricing.insuranceAmount.toLocaleString()} FCFA
                </p>
              )}
            </div>

            {/* AI Recommendations */}
            {result.aiRecommendations && (
              <div className="mobile-card border-secondary/30">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-secondary" />
                  <span className="font-semibold text-sm">Recommandation IA</span>
                  <Badge variant="default" className="text-xs">
                    Risque {result.aiRecommendations.riskLevel === "low" ? "faible" : 
                           result.aiRecommendations.riskLevel === "medium" ? "moyen" : "élevé"}
                  </Badge>
                </div>
                <p className="text-sm text-foreground mb-3">
                  {result.aiRecommendations.recommendation}
                </p>
                {result.aiRecommendations.savings > 0 && (
                  <div className="flex items-center gap-2 text-success text-sm mb-2">
                    <TrendingDown className="w-4 h-4" />
                    Économie potentielle: {result.aiRecommendations.savings.toLocaleString()} FCFA
                  </div>
                )}
                {result.aiRecommendations.tips.length > 0 && (
                  <div className="space-y-1 mt-3">
                    {result.aiRecommendations.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Lightbulb className="w-3 h-3 mt-0.5 text-warning" />
                        {tip}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Alternatives */}
            {result.alternatives.length > 0 && (
              <div className="mobile-card">
                <h3 className="font-semibold text-sm mb-3">Alternatives</h3>
                <div className="space-y-2">
                  {result.alternatives.map((alt) => {
                    const TypeIcon = transportTypes.find(t => t.type === alt.type)?.icon || Package;
                    return (
                      <div key={alt.type} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm capitalize">{alt.type}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{alt.totalPrice.toLocaleString()} FCFA</p>
                          <p className="text-xs text-muted-foreground">{alt.estimatedDays}j</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CTA */}
            <Link to="/demande">
              <Button variant="default" className="w-full h-12">
                Créer ma demande d'envoi
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
