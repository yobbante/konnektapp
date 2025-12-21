import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Calculator, Package, MapPin, Truck, ArrowRight, 
  Plus, Minus, Info, CheckCircle, Home, Building, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getAllVehicleTypes } from "@/lib/vehicleTypes";

interface MovingQuoteCalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitQuote?: (quote: QuoteData) => void;
}

export interface QuoteData {
  originCity: string;
  destinationCity: string;
  estimatedVolume: number;
  estimatedWeight: number;
  distance: number;
  vehicleType: string;
  additionalServices: string[];
  totalPrice: number;
  breakdown: PriceBreakdown;
}

interface PriceBreakdown {
  basePrice: number;
  volumePrice: number;
  distancePrice: number;
  servicesPrice: number;
  total: number;
}

const ADDITIONAL_SERVICES = [
  { id: "emballage", label: "Emballage professionnel", price: 25000, description: "Protection de vos biens" },
  { id: "manutention", label: "Manutention (2 personnes)", price: 15000, description: "Chargement et déchargement" },
  { id: "demontage", label: "Démontage/remontage meubles", price: 20000, description: "Meubles complexes" },
  { id: "acces_difficile", label: "Accès difficile", price: 10000, description: "Étages sans ascenseur, ruelle étroite" },
  { id: "stockage", label: "Stockage temporaire (1 jour)", price: 5000, description: "Entreposage sécurisé" },
  { id: "assurance", label: "Assurance complète", price: 15000, description: "Couverture tous risques" },
];

const ROOM_VOLUMES = [
  { type: "studio", label: "Studio", volumeM3: 10, weight: 300 },
  { type: "f2", label: "F2 / T2", volumeM3: 20, weight: 600 },
  { type: "f3", label: "F3 / T3", volumeM3: 30, weight: 900 },
  { type: "f4", label: "F4 / T4", volumeM3: 40, weight: 1200 },
  { type: "f5", label: "F5+ / Maison", volumeM3: 60, weight: 1800 },
];

// Simulated distance calculation (in km)
const CITY_DISTANCES: Record<string, Record<string, number>> = {
  "Dakar": { "Dakar": 10, "Thiès": 70, "Saint-Louis": 264, "Mbour": 83, "Kaolack": 192 },
  "Thiès": { "Dakar": 70, "Thiès": 10, "Saint-Louis": 194, "Mbour": 45, "Kaolack": 130 },
  "Saint-Louis": { "Dakar": 264, "Thiès": 194, "Saint-Louis": 10, "Mbour": 320, "Kaolack": 350 },
  "Mbour": { "Dakar": 83, "Thiès": 45, "Saint-Louis": 320, "Mbour": 10, "Kaolack": 110 },
  "Kaolack": { "Dakar": 192, "Thiès": 130, "Saint-Louis": 350, "Mbour": 110, "Kaolack": 10 },
};

const CITIES = ["Dakar", "Thiès", "Saint-Louis", "Mbour", "Kaolack"];

export function MovingQuoteCalculator({ open, onOpenChange, onSubmitQuote }: MovingQuoteCalculatorProps) {
  const [step, setStep] = useState(1);
  const [originCity, setOriginCity] = useState("Dakar");
  const [destinationCity, setDestinationCity] = useState("Thiès");
  const [roomType, setRoomType] = useState("f2");
  const [customVolume, setCustomVolume] = useState(20);
  const [customWeight, setCustomWeight] = useState(600);
  const [useCustom, setUseCustom] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Calculate distance
  const distance = useMemo(() => {
    return CITY_DISTANCES[originCity]?.[destinationCity] || 50;
  }, [originCity, destinationCity]);

  // Get room values
  const roomData = ROOM_VOLUMES.find(r => r.type === roomType);
  const volume = useCustom ? customVolume : (roomData?.volumeM3 || 20);
  const weight = useCustom ? customWeight : (roomData?.weight || 600);

  // Find suitable vehicles
  const suitableVehicles = useMemo(() => {
    const allVehicles = getAllVehicleTypes();
    return allVehicles.filter(v => v.category === "routier").slice(0, 5);
  }, []);

  const [selectedVehicle, setSelectedVehicle] = useState<string>("");

  // Calculate price
  const priceBreakdown = useMemo((): PriceBreakdown => {
    // Base price per km (FCFA)
    const pricePerKm = 150;
    // Price per m3
    const pricePerM3 = 2500;
    // Base price
    const basePrice = 15000;
    
    const distancePrice = distance * pricePerKm;
    const volumePrice = volume * pricePerM3;
    const servicesPrice = selectedServices.reduce((acc, serviceId) => {
      const service = ADDITIONAL_SERVICES.find(s => s.id === serviceId);
      return acc + (service?.price || 0);
    }, 0);

    const total = basePrice + distancePrice + volumePrice + servicesPrice;

    return {
      basePrice,
      volumePrice,
      distancePrice,
      servicesPrice,
      total,
    };
  }, [distance, volume, selectedServices]);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    const quoteData: QuoteData = {
      originCity,
      destinationCity,
      estimatedVolume: volume,
      estimatedWeight: weight,
      distance,
      vehicleType: selectedVehicle,
      additionalServices: selectedServices,
      totalPrice: priceBreakdown.total,
      breakdown: priceBreakdown,
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onSubmitQuote?.(quoteData);
    setSubmitting(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    setStep(1);
    setOriginCity("Dakar");
    setDestinationCity("Thiès");
    setRoomType("f2");
    setUseCustom(false);
    setSelectedServices([]);
    setSelectedVehicle("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Devis déménagement
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-8 h-1 mx-1 rounded ${step > s ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4 py-4">
          {/* Step 1: Location & Volume */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" />
                    Départ
                  </Label>
                  <Select value={originCity} onValueChange={setOriginCity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-destructive" />
                    Arrivée
                  </Label>
                  <Select value={destinationCity} onValueChange={setDestinationCity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <span className="text-sm text-muted-foreground">Distance estimée: </span>
                <span className="font-semibold">{distance} km</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Type de logement</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Personnaliser</span>
                    <Switch checked={useCustom} onCheckedChange={setUseCustom} />
                  </div>
                </div>

                {!useCustom ? (
                  <div className="grid grid-cols-3 gap-2">
                    {ROOM_VOLUMES.map((room) => (
                      <button
                        key={room.type}
                        onClick={() => setRoomType(room.type)}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          roomType === room.type
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <Home className={`w-5 h-5 mx-auto mb-1 ${roomType === room.type ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="text-xs font-medium">{room.label}</p>
                        <p className="text-xs text-muted-foreground">{room.volumeM3}m³</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Volume (m³): {customVolume}</Label>
                      <Slider
                        value={[customVolume]}
                        onValueChange={([v]) => setCustomVolume(v)}
                        min={5}
                        max={100}
                        step={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Poids estimé (kg): {customWeight}</Label>
                      <Slider
                        value={[customWeight]}
                        onValueChange={([v]) => setCustomWeight(v)}
                        min={100}
                        max={5000}
                        step={100}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2: Services */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <Label className="text-base font-semibold">Services additionnels</Label>
              <div className="space-y-2">
                {ADDITIONAL_SERVICES.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedServices.includes(service.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                        />
                        <div>
                          <p className="font-medium text-sm">{service.label}</p>
                          <p className="text-xs text-muted-foreground">{service.description}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        +{service.price.toLocaleString()} FCFA
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Summary */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Résumé du devis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Trajet</span>
                    <span className="font-medium">{originCity} → {destinationCity} ({distance} km)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Volume estimé</span>
                    <span className="font-medium">{volume} m³</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Poids estimé</span>
                    <span className="font-medium">{weight} kg</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Détail du prix</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Prix de base</span>
                    <span>{priceBreakdown.basePrice.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Distance ({distance} km)</span>
                    <span>{priceBreakdown.distancePrice.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Volume ({volume} m³)</span>
                    <span>{priceBreakdown.volumePrice.toLocaleString()} FCFA</span>
                  </div>
                  {priceBreakdown.servicesPrice > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Services ({selectedServices.length})</span>
                      <span>{priceBreakdown.servicesPrice.toLocaleString()} FCFA</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex items-center justify-between font-bold">
                      <span>Total estimé</span>
                      <span className="text-primary text-lg">{priceBreakdown.total.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground text-center">
                Ce devis est une estimation. Le prix final peut varier selon les conditions réelles.
              </p>
            </motion.div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={submitting}>
              Précédent
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} className="flex-1">
              Suivant
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Demander ce devis
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
