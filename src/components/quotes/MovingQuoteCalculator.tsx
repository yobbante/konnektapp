import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Calculator, Package, MapPin, Truck, ArrowRight, 
  Plus, Minus, Info, CheckCircle, Home, Building, Loader2,
  Sofa, Bed, Tv, Refrigerator, WashingMachine, Armchair,
  Box, Archive, PackageOpen, Boxes
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
import { Textarea } from "@/components/ui/textarea";

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
  furniture?: FurnitureItem[];
  specialNotes?: string;
}

interface PriceBreakdown {
  basePrice: number;
  volumePrice: number;
  distancePrice: number;
  servicesPrice: number;
  furniturePrice: number;
  total: number;
}

interface FurnitureItem {
  id: string;
  name: string;
  icon: React.ElementType;
  volume: number;
  weight: number;
  quantity: number;
  category: string;
}

const FURNITURE_ITEMS: Omit<FurnitureItem, "quantity">[] = [
  // Salon
  { id: "sofa_2", name: "Canapé 2 places", icon: Sofa, volume: 1.5, weight: 60, category: "salon" },
  { id: "sofa_3", name: "Canapé 3 places", icon: Sofa, volume: 2.2, weight: 80, category: "salon" },
  { id: "armchair", name: "Fauteuil", icon: Armchair, volume: 0.8, weight: 30, category: "salon" },
  { id: "tv_stand", name: "Meuble TV", icon: Tv, volume: 0.5, weight: 40, category: "salon" },
  { id: "coffee_table", name: "Table basse", icon: Box, volume: 0.3, weight: 20, category: "salon" },
  // Chambre
  { id: "bed_single", name: "Lit 1 place", icon: Bed, volume: 1.2, weight: 50, category: "chambre" },
  { id: "bed_double", name: "Lit 2 places", icon: Bed, volume: 2.0, weight: 80, category: "chambre" },
  { id: "wardrobe", name: "Armoire", icon: Archive, volume: 2.5, weight: 100, category: "chambre" },
  { id: "dresser", name: "Commode", icon: Box, volume: 0.8, weight: 45, category: "chambre" },
  // Cuisine
  { id: "fridge", name: "Réfrigérateur", icon: Refrigerator, volume: 1.0, weight: 70, category: "cuisine" },
  { id: "washing", name: "Machine à laver", icon: WashingMachine, volume: 0.6, weight: 65, category: "cuisine" },
  { id: "dining_table", name: "Table à manger", icon: Box, volume: 0.8, weight: 40, category: "cuisine" },
  // Cartons
  { id: "box_small", name: "Carton petit", icon: Package, volume: 0.03, weight: 10, category: "cartons" },
  { id: "box_medium", name: "Carton moyen", icon: PackageOpen, volume: 0.06, weight: 20, category: "cartons" },
  { id: "box_large", name: "Carton grand", icon: Boxes, volume: 0.1, weight: 30, category: "cartons" },
];

const ADDITIONAL_SERVICES = [
  { id: "emballage", label: "Emballage professionnel", price: 25000, description: "Protection complète de vos biens" },
  { id: "manutention", label: "Manutention (2 personnes)", price: 15000, description: "Chargement et déchargement" },
  { id: "demontage", label: "Démontage/remontage meubles", price: 20000, description: "Meubles complexes" },
  { id: "monte_meuble", label: "Monte-meuble", price: 35000, description: "Pour étages élevés sans ascenseur" },
  { id: "acces_difficile", label: "Accès difficile", price: 10000, description: "Étages sans ascenseur, ruelle étroite" },
  { id: "stockage", label: "Stockage temporaire (1 jour)", price: 5000, description: "Entreposage sécurisé" },
  { id: "assurance", label: "Assurance complète", price: 15000, description: "Couverture tous risques" },
  { id: "nettoyage", label: "Nettoyage après déménagement", price: 20000, description: "Logement propre" },
];

const ROOM_VOLUMES = [
  { type: "studio", label: "Studio", volumeM3: 10, weight: 300 },
  { type: "f2", label: "F2 / T2", volumeM3: 20, weight: 600 },
  { type: "f3", label: "F3 / T3", volumeM3: 30, weight: 900 },
  { type: "f4", label: "F4 / T4", volumeM3: 40, weight: 1200 },
  { type: "f5", label: "F5+ / Maison", volumeM3: 60, weight: 1800 },
];

const CITY_DISTANCES: Record<string, Record<string, number>> = {
  "Dakar": { "Dakar": 10, "Thiès": 70, "Saint-Louis": 264, "Mbour": 83, "Kaolack": 192, "Ziguinchor": 460 },
  "Thiès": { "Dakar": 70, "Thiès": 10, "Saint-Louis": 194, "Mbour": 45, "Kaolack": 130, "Ziguinchor": 390 },
  "Saint-Louis": { "Dakar": 264, "Thiès": 194, "Saint-Louis": 10, "Mbour": 320, "Kaolack": 350, "Ziguinchor": 520 },
  "Mbour": { "Dakar": 83, "Thiès": 45, "Saint-Louis": 320, "Mbour": 10, "Kaolack": 110, "Ziguinchor": 380 },
  "Kaolack": { "Dakar": 192, "Thiès": 130, "Saint-Louis": 350, "Mbour": 110, "Kaolack": 10, "Ziguinchor": 270 },
  "Ziguinchor": { "Dakar": 460, "Thiès": 390, "Saint-Louis": 520, "Mbour": 380, "Kaolack": 270, "Ziguinchor": 10 },
};

const CITIES = ["Dakar", "Thiès", "Saint-Louis", "Mbour", "Kaolack", "Ziguinchor"];

export function MovingQuoteCalculator({ open, onOpenChange, onSubmitQuote }: MovingQuoteCalculatorProps) {
  const [step, setStep] = useState(1);
  const [originCity, setOriginCity] = useState("Dakar");
  const [destinationCity, setDestinationCity] = useState("Thiès");
  const [roomType, setRoomType] = useState("f2");
  const [customVolume, setCustomVolume] = useState(20);
  const [customWeight, setCustomWeight] = useState(600);
  const [calculationMode, setCalculationMode] = useState<"room" | "furniture" | "custom">("room");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [furniture, setFurniture] = useState<FurnitureItem[]>(
    FURNITURE_ITEMS.map(item => ({ ...item, quantity: 0 }))
  );
  const [specialNotes, setSpecialNotes] = useState("");
  const [originFloor, setOriginFloor] = useState(0);
  const [destinationFloor, setDestinationFloor] = useState(0);
  const [hasElevatorOrigin, setHasElevatorOrigin] = useState(false);
  const [hasElevatorDestination, setHasElevatorDestination] = useState(false);

  // Calculate distance
  const distance = useMemo(() => {
    return CITY_DISTANCES[originCity]?.[destinationCity] || 50;
  }, [originCity, destinationCity]);

  // Get room values or calculate from furniture
  const roomData = ROOM_VOLUMES.find(r => r.type === roomType);
  
  const { volume, weight } = useMemo(() => {
    if (calculationMode === "furniture") {
      const totalVolume = furniture.reduce((acc, item) => acc + (item.volume * item.quantity), 0);
      const totalWeight = furniture.reduce((acc, item) => acc + (item.weight * item.quantity), 0);
      return { volume: Math.max(totalVolume, 1), weight: Math.max(totalWeight, 50) };
    } else if (calculationMode === "custom") {
      return { volume: customVolume, weight: customWeight };
    } else {
      return { volume: roomData?.volumeM3 || 20, weight: roomData?.weight || 600 };
    }
  }, [calculationMode, furniture, customVolume, customWeight, roomData]);

  // Calculate price
  const priceBreakdown = useMemo((): PriceBreakdown => {
    const pricePerKm = 150;
    const pricePerM3 = 2500;
    const basePrice = 15000;
    
    const distancePrice = distance * pricePerKm;
    const volumePrice = volume * pricePerM3;
    
    // Floor surcharge (if no elevator and floor > 0)
    let floorSurcharge = 0;
    if (!hasElevatorOrigin && originFloor > 0) {
      floorSurcharge += originFloor * 2000;
    }
    if (!hasElevatorDestination && destinationFloor > 0) {
      floorSurcharge += destinationFloor * 2000;
    }
    
    const servicesPrice = selectedServices.reduce((acc, serviceId) => {
      const service = ADDITIONAL_SERVICES.find(s => s.id === serviceId);
      return acc + (service?.price || 0);
    }, 0) + floorSurcharge;

    // Furniture handling price
    const furniturePrice = calculationMode === "furniture" 
      ? furniture.filter(f => f.quantity > 0).length * 1000
      : 0;

    const total = basePrice + distancePrice + volumePrice + servicesPrice + furniturePrice;

    return {
      basePrice,
      volumePrice,
      distancePrice,
      servicesPrice,
      furniturePrice,
      total,
    };
  }, [distance, volume, selectedServices, furniture, calculationMode, originFloor, destinationFloor, hasElevatorOrigin, hasElevatorDestination]);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const updateFurnitureQuantity = (itemId: string, delta: number) => {
    setFurniture(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
        : item
    ));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    const quoteData: QuoteData = {
      originCity,
      destinationCity,
      estimatedVolume: volume,
      estimatedWeight: weight,
      distance,
      vehicleType: volume > 30 ? "camion_large" : volume > 15 ? "camion_medium" : "fourgon",
      additionalServices: selectedServices,
      totalPrice: priceBreakdown.total,
      breakdown: priceBreakdown,
      furniture: calculationMode === "furniture" ? furniture.filter(f => f.quantity > 0) : undefined,
      specialNotes: specialNotes || undefined,
    };

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
    setCalculationMode("room");
    setSelectedServices([]);
    setFurniture(FURNITURE_ITEMS.map(item => ({ ...item, quantity: 0 })));
    setSpecialNotes("");
    setOriginFloor(0);
    setDestinationFloor(0);
    setHasElevatorOrigin(false);
    setHasElevatorDestination(false);
  };

  const totalFurnitureItems = furniture.reduce((acc, item) => acc + item.quantity, 0);

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
          {[1, 2, 3, 4].map((s) => (
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
              {s < 4 && (
                <div className={`w-6 h-1 mx-1 rounded ${step > s ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4 py-4">
          {/* Step 1: Location */}
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
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={originFloor}
                      onChange={(e) => setOriginFloor(parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-center"
                    />
                    <span className="text-xs text-muted-foreground">étage</span>
                    <div className="flex items-center gap-1 ml-auto">
                      <Checkbox 
                        checked={hasElevatorOrigin} 
                        onCheckedChange={(c) => setHasElevatorOrigin(c as boolean)} 
                      />
                      <span className="text-xs">Ascenseur</span>
                    </div>
                  </div>
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
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={destinationFloor}
                      onChange={(e) => setDestinationFloor(parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-center"
                    />
                    <span className="text-xs text-muted-foreground">étage</span>
                    <div className="flex items-center gap-1 ml-auto">
                      <Checkbox 
                        checked={hasElevatorDestination} 
                        onCheckedChange={(c) => setHasElevatorDestination(c as boolean)} 
                      />
                      <span className="text-xs">Ascenseur</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <span className="text-sm text-muted-foreground">Distance estimée: </span>
                <span className="font-semibold">{distance} km</span>
              </div>
            </motion.div>
          )}

          {/* Step 2: Volume Calculation */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <Label className="text-base font-semibold">Comment estimer le volume ?</Label>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setCalculationMode("room")}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    calculationMode === "room"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <Home className={`w-5 h-5 mx-auto mb-1 ${calculationMode === "room" ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-xs font-medium">Par logement</p>
                </button>
                <button
                  onClick={() => setCalculationMode("furniture")}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    calculationMode === "furniture"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <Sofa className={`w-5 h-5 mx-auto mb-1 ${calculationMode === "furniture" ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-xs font-medium">Par meubles</p>
                </button>
                <button
                  onClick={() => setCalculationMode("custom")}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    calculationMode === "custom"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <Calculator className={`w-5 h-5 mx-auto mb-1 ${calculationMode === "custom" ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-xs font-medium">Personnalisé</p>
                </button>
              </div>

              {calculationMode === "room" && (
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
              )}

              {calculationMode === "furniture" && (
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {["salon", "chambre", "cuisine", "cartons"].map(category => (
                    <div key={category}>
                      <Label className="text-sm capitalize mb-2 block">{category}</Label>
                      <div className="space-y-2">
                        {furniture.filter(f => f.category === category).map(item => (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <item.icon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateFurnitureQuantity(item.id, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateFurnitureQuantity(item.id, 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Total: {totalFurnitureItems} articles</span>
                      <span className="font-semibold">{volume.toFixed(1)} m³ / {weight} kg</span>
                    </div>
                  </div>
                </div>
              )}

              {calculationMode === "custom" && (
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
            </motion.div>
          )}

          {/* Step 3: Services */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <Label className="text-base font-semibold">Services additionnels</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
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

              <div className="space-y-2">
                <Label className="text-sm">Notes spéciales (optionnel)</Label>
                <Textarea
                  placeholder="Objets fragiles, accès particulier, horaires préférés..."
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </motion.div>
          )}

          {/* Step 4: Summary */}
          {step === 4 && (
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
                    <span className="font-medium">{volume.toFixed(1)} m³</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Poids estimé</span>
                    <span className="font-medium">{weight} kg</span>
                  </div>
                  {(originFloor > 0 || destinationFloor > 0) && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Étages</span>
                      <span className="font-medium">
                        {originFloor > 0 ? `Départ: ${originFloor}e` : ""} 
                        {originFloor > 0 && destinationFloor > 0 ? " / " : ""} 
                        {destinationFloor > 0 ? `Arrivée: ${destinationFloor}e` : ""}
                      </span>
                    </div>
                  )}
                  {calculationMode === "furniture" && totalFurnitureItems > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Articles</span>
                      <span className="font-medium">{totalFurnitureItems} meubles/cartons</span>
                    </div>
                  )}
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
                    <span className="text-muted-foreground">Volume ({volume.toFixed(1)} m³)</span>
                    <span>{priceBreakdown.volumePrice.toLocaleString()} FCFA</span>
                  </div>
                  {priceBreakdown.furniturePrice > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Manutention meubles</span>
                      <span>{priceBreakdown.furniturePrice.toLocaleString()} FCFA</span>
                    </div>
                  )}
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
          {step < 4 ? (
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
