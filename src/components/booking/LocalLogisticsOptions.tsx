import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Package, MapPin, Clock, Phone, User, Info, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";

export interface LogisticsOptions {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pickupAddress: string;
  pickupCity: string;
  pickupContactName: string;
  pickupPhone: string;
  pickupWhatsapp: string;
  pickupTimeSlot: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryContactName: string;
  deliveryPhone: string;
  deliveryWhatsapp: string;
  deliveryInstructions: string;
  pickupPrice: number;
  deliveryPrice: number;
  totalLogisticsPrice: number;
  termsAccepted: boolean;
}

interface PricingConfig {
  basePrice: number;
  weightThreshold: number;
  weightSurcharge: number;
  fragileSurcharge: number;
  currency: string;
}

interface LocalLogisticsOptionsProps {
  weight: number;
  isFragile?: boolean;
  originCity: string;
  destinationCity: string;
  currency: string; // GP currency - for conversion display only
  onChange: (options: LogisticsOptions) => void;
}

// V1.2: Prices are stored/calculated in FCFA (XOF), converted for display

const TIME_SLOTS = [
  { value: "9h-12h", label: "Matin (9h - 12h)" },
  { value: "12h-15h", label: "Midi (12h - 15h)" },
  { value: "15h-18h", label: "Après-midi (15h - 18h)" },
  { value: "18h-21h", label: "Soir (18h - 21h)" },
];

// V1: Only Dakar supported
const SUPPORTED_CITIES = ["Dakar"];

/**
 * Konnekt Logistique — Local pickup/delivery options
 * V1.2: Prices always in FCFA, converted to GP currency for display
 */
export function LocalLogisticsOptions({
  weight,
  isFragile = false,
  originCity,
  destinationCity,
  currency,
  onChange,
}: LocalLogisticsOptionsProps) {
  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<{
    pickup: PricingConfig | null;
    delivery: PricingConfig | null;
  }>({ pickup: null, delivery: null });

  // V1.2: Currency conversion hook for dual display
  const { fromFCFA, isFCFA } = useCurrencyConversion({ gpCurrency: currency });

  // Form state
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [pickupWhatsapp, setPickupWhatsapp] = useState("");
  const [pickupTimeSlot, setPickupTimeSlot] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryContactName, setDeliveryContactName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryWhatsapp, setDeliveryWhatsapp] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Check if cities are supported
  const originSupported = SUPPORTED_CITIES.includes(originCity);
  const destinationSupported = SUPPORTED_CITIES.includes(destinationCity);
  
  // Load pricing config
  useEffect(() => {
    loadPricingConfig();
  }, []);

  const loadPricingConfig = async () => {
    const { data } = await supabase
      .from("logistics_pricing_config")
      .select("*")
      .eq("zone", "dakar")
      .eq("is_active", true);

    if (data) {
      const pickup = data.find(c => c.service_type === "pickup");
      const delivery = data.find(c => c.service_type === "delivery");
      setPricingConfig({
        pickup: pickup ? {
          basePrice: pickup.base_price,
          weightThreshold: pickup.weight_threshold_kg,
          weightSurcharge: pickup.weight_surcharge_per_kg,
          fragileSurcharge: pickup.fragile_surcharge,
          currency: pickup.currency,
        } : null,
        delivery: delivery ? {
          basePrice: delivery.base_price,
          weightThreshold: delivery.weight_threshold_kg,
          weightSurcharge: delivery.weight_surcharge_per_kg,
          fragileSurcharge: delivery.fragile_surcharge,
          currency: delivery.currency,
        } : null,
      });
    }
  };

  // Calculate dynamic pricing - V1.2: Always in FCFA
  const calculatePrice = (config: PricingConfig | null): number => {
    if (!config) return 0;
    
    let price = config.basePrice;
    
    // Add weight surcharge if above threshold
    if (weight > config.weightThreshold) {
      price += (weight - config.weightThreshold) * config.weightSurcharge;
    }
    
    // Add fragile surcharge
    if (isFragile) {
      price += config.fragileSurcharge;
    }
    
    return Math.round(price);
  };

  // V1.2: Prices in FCFA
  const pickupPrice = useMemo(() => 
    pickupEnabled ? calculatePrice(pricingConfig.pickup) : 0, 
    [pickupEnabled, weight, isFragile, pricingConfig.pickup]
  );

  const deliveryPrice = useMemo(() => 
    deliveryEnabled ? calculatePrice(pricingConfig.delivery) : 0, 
    [deliveryEnabled, weight, isFragile, pricingConfig.delivery]
  );

  const totalLogisticsPrice = pickupPrice + deliveryPrice;

  // Helper: Format price with dual currency (FCFA primary, GP currency secondary)
  const formatDualPrice = (priceInFCFA: number) => {
    if (isFCFA) {
      return {
        main: `${priceInFCFA.toLocaleString()} FCFA`,
        equivalent: null,
      };
    }
    
    const gpAmount = Math.round(fromFCFA(priceInFCFA));
    const gpSymbol = getCurrencySymbol(currency);
    return {
      main: `${priceInFCFA.toLocaleString()} FCFA`,
      equivalent: `≈ ${gpAmount.toLocaleString()} ${gpSymbol}`,
    };
  };

  // Sync changes to parent
  useEffect(() => {
    onChange({
      pickupEnabled,
      deliveryEnabled,
      pickupAddress,
      pickupCity: "Dakar",
      pickupContactName,
      pickupPhone,
      pickupWhatsapp,
      pickupTimeSlot,
      deliveryAddress,
      deliveryCity: "Dakar",
      deliveryContactName,
      deliveryPhone,
      deliveryWhatsapp,
      deliveryInstructions,
      pickupPrice,
      deliveryPrice,
      totalLogisticsPrice,
      termsAccepted: termsAccepted || (!pickupEnabled && !deliveryEnabled),
    });
  }, [
    pickupEnabled, deliveryEnabled, pickupAddress, pickupContactName,
    pickupPhone, pickupWhatsapp, pickupTimeSlot, deliveryAddress,
    deliveryContactName, deliveryPhone, deliveryWhatsapp, deliveryInstructions,
    pickupPrice, deliveryPrice, totalLogisticsPrice, termsAccepted
  ]);

  const currencySymbol = getCurrencySymbol(currency);
  const gpSymbol = getCurrencySymbol(currency);

  // If neither city is supported, don't show the option
  if (!originSupported && !destinationSupported) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Truck className="w-4 h-4 text-primary" />
            </div>
            Konnekt Logistique
            <Badge variant="outline" className="ml-auto text-xs">Optionnel</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Souhaitez-vous que Konnekt s'occupe de la logistique locale ?
          </p>

          {/* Pickup Option */}
          {originSupported && (
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                <Checkbox
                  checked={pickupEnabled}
                  onCheckedChange={(checked) => setPickupEnabled(checked === true)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Enlèvement à domicile</span>
                    {pricingConfig.pickup && (
                      <div className="ml-auto flex flex-col items-end">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                          {pickupPrice.toLocaleString()} FCFA
                        </Badge>
                        {!isFCFA && (
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            ≈ {Math.round(fromFCFA(pickupPrice)).toLocaleString()} {gpSymbol}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Un agent Konnekt récupère votre colis à Dakar
                  </p>
                </div>
              </label>

              {/* Pickup Fields */}
              <AnimatePresence>
                {pickupEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-10 space-y-3"
                  >
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Adresse complète <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder="Rue, quartier, point de repère..."
                          value={pickupAddress}
                          onChange={(e) => setPickupAddress(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Nom du contact <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            placeholder="Nom complet"
                            value={pickupContactName}
                            onChange={(e) => setPickupContactName(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            Téléphone <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            placeholder="77 XXX XX XX"
                            value={pickupPhone}
                            onChange={(e) => setPickupPhone(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">WhatsApp (optionnel)</Label>
                          <Input
                            placeholder="77 XXX XX XX"
                            value={pickupWhatsapp}
                            onChange={(e) => setPickupWhatsapp(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Créneau <span className="text-destructive">*</span>
                          </Label>
                          <Select value={pickupTimeSlot} onValueChange={setPickupTimeSlot}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Choisir..." />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map(slot => (
                                <SelectItem key={slot.value} value={slot.value}>
                                  {slot.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Non-Dakar origin warning */}
          {!originSupported && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                L'enlèvement à domicile est disponible uniquement à Dakar.
              </p>
            </div>
          )}

          {/* Delivery Option */}
          {destinationSupported && (
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                <Checkbox
                  checked={deliveryEnabled}
                  onCheckedChange={(checked) => setDeliveryEnabled(checked === true)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Truck className="w-4 h-4 text-success" />
                    <span className="font-medium text-sm">Livraison à domicile</span>
                    {pricingConfig.delivery && (
                      <div className="ml-auto flex flex-col items-end">
                        <Badge className="bg-success/10 text-success hover:bg-success/20">
                          {deliveryPrice.toLocaleString()} FCFA
                        </Badge>
                        {!isFCFA && (
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            ≈ {Math.round(fromFCFA(deliveryPrice)).toLocaleString()} {gpSymbol}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Un agent Konnekt livre le colis au destinataire à Dakar
                  </p>
                </div>
              </label>

              {/* Delivery Fields */}
              <AnimatePresence>
                {deliveryEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-10 space-y-3"
                  >
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Adresse de livraison <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder="Rue, quartier, point de repère..."
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Nom du destinataire <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            placeholder="Nom complet"
                            value={deliveryContactName}
                            onChange={(e) => setDeliveryContactName(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            Téléphone <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            placeholder="77 XXX XX XX"
                            value={deliveryPhone}
                            onChange={(e) => setDeliveryPhone(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">WhatsApp (optionnel)</Label>
                          <Input
                            placeholder="77 XXX XX XX"
                            value={deliveryWhatsapp}
                            onChange={(e) => setDeliveryWhatsapp(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Instructions (optionnel)</Label>
                          <Input
                            placeholder="Code porte, étage..."
                            value={deliveryInstructions}
                            onChange={(e) => setDeliveryInstructions(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Non-Dakar destination warning */}
          {!destinationSupported && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                La livraison à domicile est disponible uniquement à Dakar.
              </p>
            </div>
          )}

          {/* Price Summary */}
          {(pickupEnabled || deliveryEnabled) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-3 border-t"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Konnekt Logistique</span>
                <div className="text-right">
                  <span className="font-bold text-primary block">
                    {totalLogisticsPrice.toLocaleString()} FCFA
                  </span>
                  {!isFCFA && (
                    <span className="text-xs text-muted-foreground">
                      ≈ {Math.round(fromFCFA(totalLogisticsPrice)).toLocaleString()} {gpSymbol}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Terms Link */}
              <label className="flex items-start gap-2 mt-3 cursor-pointer">
                <Checkbox
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-foreground">
                  J'accepte les{" "}
                  <a 
                    href="#" 
                    className="text-primary underline hover:no-underline inline-flex items-center gap-1"
                    onClick={(e) => {
                      e.preventDefault();
                      // Would open modal with terms - for V1, just a link
                      window.open("/cgu#logistique-interne", "_blank");
                    }}
                  >
                    conditions de la logistique interne
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </label>
            </motion.div>
          )}

          {/* Info note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Cette option facilite la remise et la réception du colis. Service disponible uniquement à Dakar (V1).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
