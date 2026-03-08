import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, MapPin, Phone, MessageCircle, Check, AlertCircle, 
  Plane, ArrowLeftRight, Building
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SearchableCitySelect, WORLD_CITIES } from "./SearchableCitySelect";
import { getCountryPhoneCode, getPhonePlaceholder } from "@/lib/phoneCountryCodes";

// Countries with flags
const COUNTRIES: Record<string, { name: string; flag: string }> = {
  FR: { name: "France", flag: "🇫🇷" },
  SN: { name: "Sénégal", flag: "🇸🇳" },
  CI: { name: "Côte d'Ivoire", flag: "🇨🇮" },
  CM: { name: "Cameroun", flag: "🇨🇲" },
  ML: { name: "Mali", flag: "🇲🇱" },
  US: { name: "États-Unis", flag: "🇺🇸" },
  CA: { name: "Canada", flag: "🇨🇦" },
  AE: { name: "Émirats Arabes Unis", flag: "🇦🇪" },
  GB: { name: "Royaume-Uni", flag: "🇬🇧" },
  BE: { name: "Belgique", flag: "🇧🇪" },
  MA: { name: "Maroc", flag: "🇲🇦" },
  TN: { name: "Tunisie", flag: "🇹🇳" },
  GA: { name: "Gabon", flag: "🇬🇦" },
  CG: { name: "Congo", flag: "🇨🇬" },
  DE: { name: "Allemagne", flag: "🇩🇪" },
  ES: { name: "Espagne", flag: "🇪🇸" },
  IT: { name: "Italie", flag: "🇮🇹" },
  CH: { name: "Suisse", flag: "🇨🇭" },
  NL: { name: "Pays-Bas", flag: "🇳🇱" },
  GN: { name: "Guinée", flag: "🇬🇳" },
  BF: { name: "Burkina Faso", flag: "🇧🇫" },
  TG: { name: "Togo", flag: "🇹🇬" },
  BJ: { name: "Bénin", flag: "🇧🇯" },
  GH: { name: "Ghana", flag: "🇬🇭" },
  NG: { name: "Nigeria", flag: "🇳🇬" },
};

// Cities grouped by country (legacy export)
const CITIES = WORLD_CITIES.map(c => ({ city: c.city, country: c.country }));

// Popular routes
const POPULAR_ROUTES = [
  { originCity: "Dakar", originCountry: "SN", destCity: "Paris", destCountry: "FR" },
  { originCity: "Paris", originCountry: "FR", destCity: "Dakar", destCountry: "SN" },
  { originCity: "Dakar", originCountry: "SN", destCity: "New York", destCountry: "US" },
  { originCity: "Paris", originCountry: "FR", destCity: "Abidjan", destCountry: "CI" },
];

export interface RouteLinkedProfileData {
  fullName: string;
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
  originAddress: string;
  originPhone: string;
  destinationAddress: string;
  destinationPhone: string;
  whatsappPhone: "origin" | "destination";
}

interface RouteLinkedProfileFormProps {
  initialData?: Partial<RouteLinkedProfileData>;
  onChange: (data: RouteLinkedProfileData, isValid: boolean) => void;
  showValidation?: boolean;
  /** Phone from entry flow — shown read-only if present */
  entryPhone?: string;
  /** City from entry flow — pre-filled */
  entryCity?: string;
}

export function RouteLinkedProfileForm({
  initialData = {},
  onChange,
  showValidation = false,
  entryPhone = "",
  entryCity = "",
}: RouteLinkedProfileFormProps) {
  const isMobile = useIsMobile();

  const [data, setData] = useState<RouteLinkedProfileData>({
    fullName: initialData.fullName || "",
    originCity: initialData.originCity || "Dakar",
    originCountry: initialData.originCountry || "SN",
    destinationCity: initialData.destinationCity || "Paris",
    destinationCountry: initialData.destinationCountry || "FR",
    originAddress: initialData.originAddress || "",
    originPhone: initialData.originPhone || "",
    destinationAddress: initialData.destinationAddress || "",
    destinationPhone: initialData.destinationPhone || "",
    whatsappPhone: initialData.whatsappPhone || "origin",
  });

  // Validation
  const isNameValid = data.fullName.trim().length >= 3;
  const isOriginAddressValid = data.originAddress.trim().length >= 10;
  const isOriginPhoneValid = /^[+]?[\d\s-]{8,}$/.test(data.originPhone);
  const isDestAddressValid = data.destinationAddress.trim().length >= 10;
  const isDestPhoneValid = /^[+]?[\d\s-]{8,}$/.test(data.destinationPhone);
  
  const isValid = isNameValid && isOriginAddressValid && isOriginPhoneValid && isDestAddressValid && isDestPhoneValid;

  useEffect(() => {
    onChange(data, isValid);
  }, [data, isValid]);

  // Auto-prefix phone with country code when country changes
  useEffect(() => {
    const code = getCountryPhoneCode(data.originCountry);
    if (!data.originPhone || data.originPhone === "") {
      setData(prev => ({ ...prev, originPhone: code + " " }));
    } else if (!data.originPhone.startsWith("+")) {
      setData(prev => ({ ...prev, originPhone: code + " " + prev.originPhone }));
    }
  }, [data.originCountry]);

  useEffect(() => {
    const code = getCountryPhoneCode(data.destinationCountry);
    if (!data.destinationPhone || data.destinationPhone === "") {
      setData(prev => ({ ...prev, destinationPhone: code + " " }));
    } else if (!data.destinationPhone.startsWith("+")) {
      setData(prev => ({ ...prev, destinationPhone: code + " " + prev.destinationPhone }));
    }
  }, [data.destinationCountry]);

  const handleChange = <K extends keyof RouteLinkedProfileData>(field: K, value: RouteLinkedProfileData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleCitySelect = (type: "origin" | "destination", cityName: string, countryCode: string) => {
    if (type === "origin") {
      const newCode = getCountryPhoneCode(countryCode);
      setData(prev => ({
        ...prev,
        originCity: cityName,
        originCountry: countryCode,
        originPhone: prev.originPhone.startsWith("+") ? newCode + " " + prev.originPhone.replace(/^\+[\d\s]+/, "").trim() : newCode + " ",
      }));
    } else {
      const newCode = getCountryPhoneCode(countryCode);
      setData(prev => ({
        ...prev,
        destinationCity: cityName,
        destinationCountry: countryCode,
        destinationPhone: prev.destinationPhone.startsWith("+") ? newCode + " " + prev.destinationPhone.replace(/^\+[\d\s]+/, "").trim() : newCode + " ",
      }));
    }
  };

  const handleSwapRoute = () => {
    setData(prev => ({
      ...prev,
      originCity: prev.destinationCity,
      originCountry: prev.destinationCountry,
      destinationCity: prev.originCity,
      destinationCountry: prev.originCountry,
      originAddress: prev.destinationAddress,
      originPhone: prev.destinationPhone,
      destinationAddress: prev.originAddress,
      destinationPhone: prev.originPhone,
    }));
  };

  const handleQuickRoute = (route: typeof POPULAR_ROUTES[0]) => {
    const originCode = getCountryPhoneCode(route.originCountry);
    const destCode = getCountryPhoneCode(route.destCountry);
    setData(prev => ({
      ...prev,
      originCity: route.originCity,
      originCountry: route.originCountry,
      destinationCity: route.destCity,
      destinationCountry: route.destCountry,
      originPhone: originCode + " ",
      destinationPhone: destCode + " ",
    }));
  };

  const getCountryInfo = (code: string) => COUNTRIES[code] || { name: code, flag: "🌍" };
  const originFlag = getCountryInfo(data.originCountry).flag;
  const destFlag = getCountryInfo(data.destinationCountry).flag;

  const ValidationIcon = ({ isValid }: { isValid: boolean }) => {
    if (!showValidation) return null;
    return isValid ? (
      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
    ) : (
      <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Route Card - Simplified */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Trajet navette</CardTitle>
            </div>
            <Button 
              type="button"
              variant="outline" 
              size="sm"
              onClick={handleSwapRoute}
              className="gap-1.5 h-8 text-xs"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Inverser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Route summary */}
          <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-lg bg-muted/50">
            <span className="text-2xl">{originFlag}</span>
            <span className="font-semibold text-sm">{data.originCity}</span>
            <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">{data.destinationCity}</span>
            <span className="text-2xl">{destFlag}</span>
          </div>

          {/* City selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Départ</Label>
              <SearchableCitySelect
                value={data.originCity}
                countryCode={data.originCountry}
                onSelect={(city, country) => handleCitySelect("origin", city, country)}
                label="Ville de départ"
                placeholder="Rechercher..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Arrivée</Label>
              <SearchableCitySelect
                value={data.destinationCity}
                countryCode={data.destinationCountry}
                onSelect={(city, country) => handleCitySelect("destination", city, country)}
                label="Ville d'arrivée"
                placeholder="Rechercher..."
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Origin Location Card */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{originFlag}</span>
            <div>
              <CardTitle className="text-base">Point de départ : {data.originCity}</CardTitle>
              <CardDescription className="text-xs">Adresse de dépôt pour vos clients</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                Adresse {data.originCity} *
              </Label>
              <ValidationIcon isValid={isOriginAddressValid} />
            </div>
            <Input
              placeholder={`Ex: 123 Avenue Bourguiba, ${data.originCity}`}
              value={data.originAddress}
              onChange={(e) => handleChange("originAddress", e.target.value)}
              className={cn(
                "h-12",
                showValidation && !isOriginAddressValid && "border-destructive"
              )}
            />
            <p className="text-[11px] text-muted-foreground">
              Les clients déposeront leurs colis à cette adresse avant votre départ
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-600" />
                Téléphone {data.originCity} *
              </Label>
              <ValidationIcon isValid={isOriginPhoneValid} />
            </div>
            <div className="relative">
              <Badge 
                variant="secondary" 
                className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono z-10"
              >
                {getCountryPhoneCode(data.originCountry)}
              </Badge>
              <Input
                type="tel"
                placeholder={getPhonePlaceholder(data.originCountry).replace(/^\+[\d\s]+/, "").trim()}
                value={data.originPhone.replace(getCountryPhoneCode(data.originCountry), "").trim()}
                onChange={(e) => handleChange("originPhone", getCountryPhoneCode(data.originCountry) + " " + e.target.value)}
                className={cn(
                  "h-12 pl-16",
                  showValidation && !isOriginPhoneValid && "border-destructive"
                )}
              />
            </div>
          </motion.div>
        </CardContent>
      </Card>

      {/* Destination Location Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{destFlag}</span>
            <div>
              <CardTitle className="text-base">Point d'arrivée : {data.destinationCity}</CardTitle>
              <CardDescription className="text-xs">Adresse de réception pour les destinataires</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                Adresse {data.destinationCity} *
              </Label>
              <ValidationIcon isValid={isDestAddressValid} />
            </div>
            <Input
              placeholder={`Ex: 45 Rue de la Liberté, ${data.destinationCity}`}
              value={data.destinationAddress}
              onChange={(e) => handleChange("destinationAddress", e.target.value)}
              className={cn(
                "h-12",
                showValidation && !isDestAddressValid && "border-destructive"
              )}
            />
            <p className="text-[11px] text-muted-foreground">
              Les destinataires récupèreront leurs colis à cette adresse
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                Téléphone {data.destinationCity} *
              </Label>
              <ValidationIcon isValid={isDestPhoneValid} />
            </div>
            <div className="relative">
              <Badge 
                variant="secondary" 
                className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono z-10"
              >
                {getCountryPhoneCode(data.destinationCountry)}
              </Badge>
              <Input
                type="tel"
                placeholder={getPhonePlaceholder(data.destinationCountry).replace(/^\+[\d\s]+/, "").trim()}
                value={data.destinationPhone.replace(getCountryPhoneCode(data.destinationCountry), "").trim()}
                onChange={(e) => handleChange("destinationPhone", getCountryPhoneCode(data.destinationCountry) + " " + e.target.value)}
                className={cn(
                  "h-12 pl-16",
                  showValidation && !isDestPhoneValid && "border-destructive"
                )}
              />
            </div>
          </motion.div>
        </CardContent>
      </Card>

      {/* WhatsApp Selection Card */}
      <Card className="border-2 border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            <CardTitle className="text-base text-green-700 dark:text-green-400">Numéro WhatsApp</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Choisissez le numéro que les clients utiliseront pour vous contacter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleChange("whatsappPhone", "origin")}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left",
                data.whatsappPhone === "origin"
                  ? "border-green-500 bg-green-500/10 shadow-md"
                  : "border-border hover:border-green-500/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{originFlag}</span>
                {data.whatsappPhone === "origin" && (
                  <Check className="w-5 h-5 text-green-600" />
                )}
              </div>
              <p className="font-medium text-sm">{data.originCity}</p>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {data.originPhone || "Non renseigné"}
              </p>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleChange("whatsappPhone", "destination")}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left",
                data.whatsappPhone === "destination"
                  ? "border-green-500 bg-green-500/10 shadow-md"
                  : "border-border hover:border-green-500/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{destFlag}</span>
                {data.whatsappPhone === "destination" && (
                  <Check className="w-5 h-5 text-green-600" />
                )}
              </div>
              <p className="font-medium text-sm">{data.destinationCity}</p>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {data.destinationPhone || "Non renseigné"}
              </p>
            </motion.button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Summary */}
      <AnimatePresence>
        {showValidation && !isValid && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl"
          >
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Veuillez compléter tous les champs obligatoires
            </p>
            <ul className="text-xs text-destructive/80 mt-2 space-y-1 ml-6">
              {!isNameValid && <li>• Nom complet requis (min. 3 caractères)</li>}
              {!isOriginAddressValid && <li>• Adresse {data.originCity} requise</li>}
              {!isOriginPhoneValid && <li>• Téléphone {data.originCity} valide requis</li>}
              {!isDestAddressValid && <li>• Adresse {data.destinationCity} requise</li>}
              {!isDestPhoneValid && <li>• Téléphone {data.destinationCity} valide requis</li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { COUNTRIES, CITIES };
