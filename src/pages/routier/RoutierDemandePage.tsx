import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Package, MapPin, Truck, Scale, Box, 
  Thermometer, AlertTriangle, Droplets, Shield, Clock, Check,
  Calculator, ChevronRight, Loader2, Calendar, Info
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/**
 * RoutierDemandePage - Parcours client transport routier V1.1
 * 
 * Améliorations V1.1 terrain-proof:
 * - Créneau flexible (+24/+48h) pour augmenter le matching
 * - Verrou anti-doublon (même client + même trajet + 10min)
 * - Labels "estimé" explicites
 * - Feedback client explicite
 */

type FreightType = 
  | "colis" 
  | "palettes" 
  | "alimentaire" 
  | "frigorifie" 
  | "liquides" 
  | "materiaux" 
  | "btp" 
  | "vehicules";

type VolumeSize = "petit" | "moyen" | "grand" | "hors_gabarit";

interface FormData {
  freightType: FreightType | null;
  weight: string;
  weightUnit: "kg" | "tonnes";
  volume: VolumeSize | null;
  constraints: string[];
  originAddress: string;
  originCity: string;
  destinationAddress: string;
  destinationCity: string;
  description: string;
  pickupDateStart: string;
  pickupDateEnd: string;
  flexibleDeparture: boolean;
  urgent: boolean;
}

const freightTypes: { id: FreightType; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: "colis", label: "Colis / Cartons", icon: Package, description: "Marchandises emballées" },
  { id: "palettes", label: "Palettes", icon: Box, description: "Marchandises palettisées" },
  { id: "alimentaire", label: "Alimentaire", icon: Package, description: "Produits alimentaires" },
  { id: "frigorifie", label: "Frigorifié", icon: Thermometer, description: "Température contrôlée" },
  { id: "liquides", label: "Liquides", icon: Droplets, description: "Citernes, cuves" },
  { id: "materiaux", label: "Matériaux / Vrac", icon: Truck, description: "Sable, ciment, latérite" },
  { id: "btp", label: "BTP / Machines", icon: Truck, description: "Équipement lourd" },
  { id: "vehicules", label: "Véhicules", icon: Truck, description: "Transport automobile" },
];

const volumeSizes: { id: VolumeSize; label: string; description: string }[] = [
  { id: "petit", label: "Petit", description: "< 1 m³" },
  { id: "moyen", label: "Moyen", description: "1-5 m³" },
  { id: "grand", label: "Grand", description: "5-20 m³" },
  { id: "hors_gabarit", label: "Hors gabarit", description: "> 20 m³" },
];

const constraintOptions = [
  { id: "fragile", label: "Fragile", icon: AlertTriangle },
  { id: "urgent", label: "Urgent (+30%)", icon: Clock },
  { id: "temperature", label: "Température contrôlée", icon: Thermometer },
  { id: "dangereux", label: "Marchandise dangereuse", icon: AlertTriangle },
  { id: "protection", label: "Protection pluie/vol", icon: Shield },
];

const senegalCities = [
  "Dakar", "Thiès", "Saint-Louis", "Kaolack", "Ziguinchor", "Touba", 
  "Mbour", "Rufisque", "Tambacounda", "Kolda", "Matam", "Louga",
  "Diourbel", "Fatick", "Sédhiou", "Kaffrine", "Kédougou", "Richard-Toll",
  "Tivaouane", "Saly", "Joal-Fadiouth"
];

// Vehicle matching rules (simplified for V1)
const getMatchedVehicle = (freightType: FreightType, weight: number, constraints: string[]): string => {
  if (freightType === "materiaux") return "Camion benne";
  if (freightType === "frigorifie" || constraints.includes("temperature")) return "Camion frigorifique";
  if (freightType === "liquides") return "Camion citerne";
  if (freightType === "btp") return "Plateau-grue";
  if (freightType === "vehicules") return "Porte-véhicules";
  if (weight > 3500) return "Camion moyen";
  if (weight > 1000) return "Fourgon";
  return "Fourgonnette";
};

// Price calculation (simplified for V1)
const calculatePrice = (freightType: FreightType, weight: number, distance: number, constraints: string[]): number => {
  let basePrice = 15000; // Minimum
  
  // Weight factor
  if (weight > 5000) basePrice += 50000;
  else if (weight > 1000) basePrice += 20000;
  else if (weight > 500) basePrice += 10000;
  
  // Distance factor (simulated, ~75 FCFA/km)
  const distancePrice = distance * 75;
  
  // Freight type surcharge
  const typeMultipliers: Record<FreightType, number> = {
    colis: 1,
    palettes: 1.1,
    alimentaire: 1.2,
    frigorifie: 1.5,
    liquides: 1.4,
    materiaux: 1.3,
    btp: 1.6,
    vehicules: 1.8,
  };
  
  let total = (basePrice + distancePrice) * (typeMultipliers[freightType] || 1);
  
  // Constraints surcharge
  if (constraints.includes("urgent")) total *= 1.3;
  if (constraints.includes("dangereux")) total *= 1.4;
  if (constraints.includes("fragile")) total *= 1.1;
  
  return Math.round(total);
};

// Anti-duplicate key generator
const getDuplicateKey = (formData: FormData): string => {
  return `${formData.originCity}-${formData.destinationCity}-${formData.freightType}-${formData.weight}`;
};

export default function RoutierDemandePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submittedKeys, setSubmittedKeys] = useState<Map<string, number>>(new Map());
  const [calculatedResult, setCalculatedResult] = useState<{
    vehicle: string;
    price: number;
    estimatedDelivery: string;
    estimatedDistance: number;
  } | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<FormData>({
    freightType: null,
    weight: "",
    weightUnit: "kg",
    volume: null,
    constraints: [],
    originAddress: "",
    originCity: "",
    destinationAddress: "",
    destinationCity: "",
    description: "",
    pickupDateStart: today,
    pickupDateEnd: "",
    flexibleDeparture: false,
    urgent: false,
  });

  const totalSteps = 4;

  const toggleConstraint = (id: string) => {
    setFormData(prev => ({
      ...prev,
      constraints: prev.constraints.includes(id)
        ? prev.constraints.filter(c => c !== id)
        : [...prev.constraints, id],
    }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !!formData.freightType && !!formData.weight && parseFloat(formData.weight) > 0;
      case 2:
        return !!formData.originCity && !!formData.destinationCity && !!formData.pickupDateStart;
      case 3:
        return true; // Review step
      case 4:
        return !!calculatedResult;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 2) {
      // Calculate vehicle and price after itinerary
      const weight = formData.weightUnit === "tonnes" 
        ? parseFloat(formData.weight) * 1000 
        : parseFloat(formData.weight);
      
      // Simulate distance (in real app, use geocoding API)
      const simulatedDistance = 150; // km
      
      const vehicle = getMatchedVehicle(formData.freightType!, weight, formData.constraints);
      const price = calculatePrice(formData.freightType!, weight, simulatedDistance, formData.constraints);
      
      setCalculatedResult({
        vehicle,
        price,
        estimatedDelivery: formData.constraints.includes("urgent") ? "24-48h" : "3-5 jours",
        estimatedDistance: simulatedDistance,
      });
    }
    setStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    if (step === 1) {
      navigate("/envoyer");
    } else {
      setStep(prev => prev - 1);
    }
  };

  // Check for duplicate submission
  const isDuplicate = (): boolean => {
    const key = getDuplicateKey(formData);
    const lastSubmission = submittedKeys.get(key);
    if (lastSubmission) {
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      return lastSubmission > tenMinutesAgo;
    }
    return false;
  };

  const handleSubmit = async () => {
    // V1.1: Anti-duplicate lock
    if (isDuplicate()) {
      toast({
        title: "Demande déjà envoyée",
        description: "Une demande similaire a été soumise il y a moins de 10 minutes.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
        navigate("/auth");
        return;
      }

      // Calculate end date with flexible option
      let endDate = formData.pickupDateEnd || formData.pickupDateStart;
      if (formData.flexibleDeparture && !formData.pickupDateEnd) {
        const startDate = new Date(formData.pickupDateStart);
        startDate.setDate(startDate.getDate() + 2); // +48h flexibility
        endDate = startDate.toISOString().split('T')[0];
      }

      // In V1, we create a custom_request that will be sent to compatible transporters
      const { error } = await supabase.from("custom_requests").insert({
        client_id: session.user.id,
        request_number: `RTR-${Date.now().toString(36).toUpperCase()}`,
        origin_city: formData.originCity,
        origin_country: "SN",
        destination_city: formData.destinationCity,
        destination_country: "SN",
        shipment_type: formData.freightType || "colis",
        transport_type: "routier",
        weight_estimate: formData.weightUnit === "tonnes" 
          ? parseFloat(formData.weight) * 1000 
          : parseFloat(formData.weight),
        volume_estimate: formData.volume || "moyen",
        description: formData.description || `Transport routier: ${formData.freightType}`,
        is_fragile: formData.constraints.includes("fragile"),
        is_urgent: formData.constraints.includes("urgent"),
        budget_min: Math.round(calculatedResult!.price * 0.8),
        budget_max: Math.round(calculatedResult!.price * 1.2),
        pickup_date_from: formData.pickupDateStart,
        pickup_date_to: endDate,
        status: "open",
      });

      if (error) throw error;

      // Record submission to prevent duplicates
      const key = getDuplicateKey(formData);
      setSubmittedKeys(prev => new Map(prev).set(key, Date.now()));

      toast({
        title: "Demande envoyée !",
        description: "Les transporteurs compatibles seront notifiés.",
      });

      navigate("/client/dashboard");
    } catch (error) {
      console.error("Error creating request:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la demande",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Progress Bar */}
      <div className="px-4 pt-2 pb-4 bg-background border-b">
        <div className="flex items-center justify-between mb-2">
          <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium">Étape {step}/{totalSteps}</span>
          <div className="w-9" />
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Freight Description */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <Package className="w-10 h-10 text-primary mx-auto mb-2" />
                <h2 className="text-xl font-bold">Décrivez votre fret</h2>
                <p className="text-sm text-muted-foreground">Type, poids et contraintes</p>
              </div>

              {/* Freight Type */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Type de fret *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {freightTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.freightType === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setFormData(prev => ({ ...prev, freightType: type.id }))}
                        className={`
                          p-3 rounded-xl border-2 text-left transition-all
                          ${isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                          }
                        `}
                      >
                        <Icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="font-medium text-sm">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weight */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Poids total *</Label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Ex: 500"
                      value={formData.weight}
                      onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex rounded-lg border overflow-hidden">
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, weightUnit: "kg" }))}
                      className={`px-4 py-2 text-sm font-medium ${formData.weightUnit === "kg" ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                    >
                      kg
                    </button>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, weightUnit: "tonnes" }))}
                      className={`px-4 py-2 text-sm font-medium ${formData.weightUnit === "tonnes" ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                    >
                      T
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ {formData.weight ? Math.round(parseFloat(formData.weight) / 50) : 0} sacs de ciment
                </p>
              </div>

              {/* Volume */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Volume estimé</Label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {volumeSizes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setFormData(prev => ({ ...prev, volume: size.id }))}
                      className={`
                        flex-shrink-0 px-4 py-2 rounded-full border text-sm font-medium transition-all
                        ${formData.volume === size.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Constraints */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Contraintes particulières</Label>
                <div className="flex flex-wrap gap-2">
                  {constraintOptions.map((constraint) => {
                    const Icon = constraint.icon;
                    const isSelected = formData.constraints.includes(constraint.id);
                    return (
                      <button
                        key={constraint.id}
                        onClick={() => toggleConstraint(constraint.id)}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all
                          ${isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                          }
                        `}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {constraint.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Itinerary + Schedule (V1.1) */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <MapPin className="w-10 h-10 text-primary mx-auto mb-2" />
                <h2 className="text-xl font-bold">Itinéraire & Créneau</h2>
                <p className="text-sm text-muted-foreground">Trajet et dates souhaitées</p>
              </div>

              {/* Origin */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Point de départ *</Label>
                <div className="relative">
                  <div className="absolute left-3 top-3 w-3 h-3 rounded-full bg-green-500 z-10" />
                  <Input
                    placeholder="Rechercher une ville..."
                    value={formData.originCity}
                    onChange={(e) => setFormData(prev => ({ ...prev, originCity: e.target.value }))}
                    className="pl-8"
                    list="origin-cities"
                  />
                  <datalist id="origin-cities">
                    {senegalCities.filter(c => c.toLowerCase().includes(formData.originCity.toLowerCase())).map(city => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </div>
                <Input
                  placeholder="Adresse exacte de collecte (optionnel)"
                  value={formData.originAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, originAddress: e.target.value }))}
                />
              </div>

              {/* Route visualization */}
              <div className="flex justify-center">
                <div className="w-px h-8 bg-border relative">
                  <ChevronRight className="w-4 h-4 text-muted-foreground absolute -left-1.5 top-1/2 -translate-y-1/2 rotate-90" />
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Destination *</Label>
                <div className="relative">
                  <div className="absolute left-3 top-3 w-3 h-3 rounded-full bg-red-500 z-10" />
                  <Input
                    placeholder="Rechercher une ville..."
                    value={formData.destinationCity}
                    onChange={(e) => setFormData(prev => ({ ...prev, destinationCity: e.target.value }))}
                    className="pl-8"
                    list="dest-cities"
                  />
                  <datalist id="dest-cities">
                    {senegalCities.filter(c => c.toLowerCase().includes(formData.destinationCity.toLowerCase()) && c !== formData.originCity).map(city => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </div>
                <Input
                  placeholder="Adresse de livraison (optionnel)"
                  value={formData.destinationAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, destinationAddress: e.target.value }))}
                />
              </div>

              {/* Distance estimate (V1.1: explicit "estimée") */}
              {formData.originCity && formData.destinationCity && (
                <div className="p-3 bg-muted/50 rounded-xl text-center">
                  <p className="text-sm text-muted-foreground">Distance estimée</p>
                  <p className="font-bold text-lg">~150 km</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Basée sur une estimation terrain
                  </p>
                </div>
              )}

              {/* V1.1: Schedule with flexible option */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Créneau d'enlèvement *
                </Label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Date prise en charge</Label>
                    <Input
                      type="date"
                      value={formData.pickupDateStart}
                      onChange={(e) => setFormData(prev => ({ ...prev, pickupDateStart: e.target.value }))}
                      min={today}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Date fin (optionnel)</Label>
                    <Input
                      type="date"
                      value={formData.pickupDateEnd}
                      onChange={(e) => setFormData(prev => ({ ...prev, pickupDateEnd: e.target.value }))}
                      min={formData.pickupDateStart || today}
                    />
                  </div>
                </div>

                {/* V1.1: Flexible departure toggle */}
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Départ flexible (+48h)</p>
                      <p className="text-xs text-muted-foreground">
                        Augmente vos chances de trouver un transporteur
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.flexibleDeparture}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, flexibleDeparture: checked }))}
                  />
                </div>

                {/* V1.1: Pedagogical hint */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Plus le créneau est large, plus vous avez de chances de trouver un transporteur disponible.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: System Calculation Result */}
          {step === 3 && calculatedResult && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-8 h-8 text-success" />
                </div>
                <h2 className="text-xl font-bold">Solution trouvée</h2>
                <p className="text-sm text-muted-foreground">Transport adapté à votre fret</p>
              </div>

              {/* Vehicle Match */}
              <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Truck className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Véhicule recommandé</p>
                    <p className="font-bold text-lg">{calculatedResult.vehicle}</p>
                  </div>
                </div>
              </div>

              {/* V1.1: Price with "estimé" label */}
              <div className="p-4 rounded-2xl bg-muted/50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">Prix estimé</span>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {calculatedResult.price.toLocaleString()} FCFA
                    </p>
                    <p className="text-xs text-muted-foreground">Commission incluse</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-muted-foreground">Délai estimé</span>
                  <Badge variant="secondary">{calculatedResult.estimatedDelivery}</Badge>
                </div>
              </div>

              {/* V1.1: Legal disclaimer */}
              <div className="p-3 bg-blue-500/10 rounded-xl text-sm border border-blue-500/20">
                <p className="text-blue-700 dark:text-blue-300">
                  ⚖️ Prix indicatif basé sur une estimation terrain. Le montant final peut varier selon les conditions réelles.
                </p>
              </div>

              {/* Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type de fret</span>
                  <span className="font-medium">{freightTypes.find(f => f.id === formData.freightType)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Poids</span>
                  <span className="font-medium">{formData.weight} {formData.weightUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trajet</span>
                  <span className="font-medium">{formData.originCity} → {formData.destinationCity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance estimée</span>
                  <span className="font-medium">~{calculatedResult.estimatedDistance} km</span>
                </div>
                {formData.flexibleDeparture && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Flexibilité</span>
                    <Badge variant="outline" className="text-xs">+48h</Badge>
                  </div>
                )}
                {formData.constraints.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contraintes</span>
                    <span className="font-medium">{formData.constraints.length} spécifiée(s)</span>
                  </div>
                )}
              </div>

              {/* What's NOT included */}
              <div className="p-3 bg-warning/10 rounded-xl text-sm">
                <p className="font-medium text-warning-foreground mb-1">Non inclus</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Manutention spéciale (grue, chariot)</li>
                  <li>• Assurance marchandise optionnelle</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <Calculator className="w-10 h-10 text-primary mx-auto mb-2" />
                <h2 className="text-xl font-bold">Finaliser la demande</h2>
                <p className="text-sm text-muted-foreground">Détails supplémentaires</p>
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Description du fret</Label>
                <Textarea
                  placeholder="Décrivez le contenu, les précautions particulières..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Final price reminder */}
              {calculatedResult && (
                <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Prix total estimé</p>
                      <p className="text-2xl font-bold text-primary">
                        {calculatedResult.price.toLocaleString()} FCFA
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-success text-success-foreground">
                        {calculatedResult.vehicle}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="p-3 bg-muted/50 rounded-xl text-sm text-muted-foreground">
                <p>
                  ℹ️ Votre demande sera envoyée aux transporteurs routiers compatibles. 
                  Le premier à accepter sera assigné à votre mission.
                </p>
              </div>

              {/* V1.1: Flexibility reminder */}
              {formData.flexibleDeparture && (
                <div className="p-3 bg-green-500/10 rounded-xl text-sm border border-green-500/20">
                  <p className="text-green-700 dark:text-green-300">
                    ✓ Départ flexible activé — Votre demande sera visible pendant 48h supplémentaires.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="p-4 border-t bg-background">
        {step < 4 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="w-full h-12 text-base font-semibold"
          >
            Continuer
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 text-base font-semibold bg-success hover:bg-success/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Lancer la recherche
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
