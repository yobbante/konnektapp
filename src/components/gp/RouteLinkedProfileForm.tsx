import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, MapPin, Phone, MessageCircle, Check, AlertCircle, 
  Plane, ArrowLeftRight, Sparkles, Info, Building
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
};

// Cities grouped by country
const CITIES = [
  { city: "Dakar", country: "SN" },
  { city: "Thiès", country: "SN" },
  { city: "Saint-Louis", country: "SN" },
  { city: "Paris", country: "FR" },
  { city: "Marseille", country: "FR" },
  { city: "Lyon", country: "FR" },
  { city: "Bordeaux", country: "FR" },
  { city: "New York", country: "US" },
  { city: "Washington", country: "US" },
  { city: "Los Angeles", country: "US" },
  { city: "Miami", country: "US" },
  { city: "Houston", country: "US" },
  { city: "Montréal", country: "CA" },
  { city: "Toronto", country: "CA" },
  { city: "Ottawa", country: "CA" },
  { city: "Abidjan", country: "CI" },
  { city: "Yamoussoukro", country: "CI" },
  { city: "Douala", country: "CM" },
  { city: "Yaoundé", country: "CM" },
  { city: "Bamako", country: "ML" },
  { city: "Dubaï", country: "AE" },
  { city: "Abu Dhabi", country: "AE" },
  { city: "Londres", country: "GB" },
  { city: "Manchester", country: "GB" },
  { city: "Bruxelles", country: "BE" },
  { city: "Casablanca", country: "MA" },
  { city: "Rabat", country: "MA" },
  { city: "Tunis", country: "TN" },
  { city: "Libreville", country: "GA" },
  { city: "Brazzaville", country: "CG" },
];

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
}

export function RouteLinkedProfileForm({
  initialData = {},
  onChange,
  showValidation = false,
}: RouteLinkedProfileFormProps) {
  const isMobile = useIsMobile();
  const [cityDrawerOpen, setCityDrawerOpen] = useState<"origin" | "destination" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleChange = <K extends keyof RouteLinkedProfileData>(field: K, value: RouteLinkedProfileData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleCitySelect = (type: "origin" | "destination", cityName: string) => {
    const cityInfo = CITIES.find(c => c.city === cityName);
    if (cityInfo) {
      if (type === "origin") {
        handleChange("originCity", cityInfo.city);
        handleChange("originCountry", cityInfo.country);
      } else {
        handleChange("destinationCity", cityInfo.city);
        handleChange("destinationCountry", cityInfo.country);
      }
    }
    setCityDrawerOpen(null);
    setSearchQuery("");
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
    setData(prev => ({
      ...prev,
      originCity: route.originCity,
      originCountry: route.originCountry,
      destinationCity: route.destCity,
      destinationCountry: route.destCountry,
    }));
  };

  const getCountryInfo = (code: string) => COUNTRIES[code] || { name: code, flag: "🌍" };
  const originFlag = getCountryInfo(data.originCountry).flag;
  const destFlag = getCountryInfo(data.destinationCountry).flag;

  const filteredCities = CITIES.filter(c => 
    c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getCountryInfo(c.country).name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ValidationIcon = ({ isValid }: { isValid: boolean }) => {
    if (!showValidation) return null;
    return isValid ? (
      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
    ) : (
      <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
    );
  };

  const CitySelector = ({ type }: { type: "origin" | "destination" }) => {
    const cityValue = type === "origin" ? data.originCity : data.destinationCity;
    const countryCode = type === "origin" ? data.originCountry : data.destinationCountry;
    const flag = getCountryInfo(countryCode).flag;
    const label = type === "origin" ? "Ville de départ" : "Ville d'arrivée";

    const TriggerButton = (
      <Button
        variant="outline"
        className="w-full justify-start text-left h-12 px-3"
        onClick={() => isMobile && setCityDrawerOpen(type)}
      >
        <span className="text-xl mr-2">{flag}</span>
        <span className="font-medium">{cityValue}</span>
      </Button>
    );

    if (isMobile) {
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <Drawer open={cityDrawerOpen === type} onOpenChange={(open) => setCityDrawerOpen(open ? type : null)}>
            <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader className="pb-2">
                <DrawerTitle>{label}</DrawerTitle>
              </DrawerHeader>
              <Command className="px-2 pb-4">
                <CommandInput 
                  placeholder="Rechercher une ville..." 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList className="max-h-[50vh]">
                  <CommandEmpty>Aucune ville trouvée</CommandEmpty>
                  <CommandGroup>
                    {filteredCities.map((item) => (
                      <CommandItem
                        key={`${item.city}-${item.country}`}
                        value={item.city}
                        onSelect={() => handleCitySelect(type, item.city)}
                        className="flex items-center gap-3 py-3"
                      >
                        <span className="text-xl">{getCountryInfo(item.country).flag}</span>
                        <div>
                          <p className="font-medium">{item.city}</p>
                          <p className="text-xs text-muted-foreground">{getCountryInfo(item.country).name}</p>
                        </div>
                        {cityValue === item.city && <Check className="w-4 h-4 ml-auto text-primary" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </DrawerContent>
          </Drawer>
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Select value={cityValue} onValueChange={(v) => handleCitySelect(type, v)}>
          <SelectTrigger className="h-12">
            <SelectValue>
              <span className="flex items-center gap-2">
                <span className="text-lg">{flag}</span>
                <span>{cityValue}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px] bg-popover z-50">
            {CITIES.map((item) => (
              <SelectItem key={`${item.city}-${item.country}`} value={item.city}>
                <span className="flex items-center gap-2">
                  <span>{getCountryInfo(item.country).flag}</span>
                  <span>{item.city}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Name Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Votre identité</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fullName">Nom & Prénom *</Label>
              <ValidationIcon isValid={isNameValid} />
            </div>
            <Input
              id="fullName"
              placeholder="Ex: Mamadou Diallo"
              value={data.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              className={cn(
                "h-12 text-base",
                showValidation && !isNameValid && "border-destructive"
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Route Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Votre trajet de base</CardTitle>
            <Badge variant="secondary" className="text-[10px]">Navette fixe</Badge>
          </div>
          <CardDescription className="flex items-center gap-1 text-xs">
            <Info className="w-3 h-3" />
            Ce trajet définit vos points de dépôt et réception
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Visual route display */}
          <motion.div 
            className="flex items-center justify-center gap-3 py-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-center">
              <span className="text-4xl">{originFlag}</span>
              <p className="text-sm font-semibold mt-1">{data.originCity}</p>
            </div>
            
            <Button 
              type="button"
              variant="ghost" 
              size="icon"
              onClick={handleSwapRoute}
              className="h-12 w-12 rounded-full bg-background border-2 hover:bg-accent shadow-sm"
            >
              <ArrowLeftRight className="w-5 h-5" />
            </Button>
            
            <div className="text-center">
              <span className="text-4xl">{destFlag}</span>
              <p className="text-sm font-semibold mt-1">{data.destinationCity}</p>
            </div>
          </motion.div>

          {/* Route badge */}
          <div className="flex justify-center">
            <Badge className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20">
              <Plane className="w-4 h-4 mr-2" />
              {data.originCity} → {data.destinationCity}
            </Badge>
          </div>

          {/* City selectors */}
          <div className="grid grid-cols-2 gap-3">
            <CitySelector type="origin" />
            <CitySelector type="destination" />
          </div>

          {/* Quick routes */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Trajets populaires
            </Label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_ROUTES.map((route, i) => {
                const isSelected = data.originCity === route.originCity && data.destinationCity === route.destCity;
                return (
                  <Badge
                    key={i}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer py-1.5 px-3 hover:bg-accent transition-all text-xs active:scale-95"
                    onClick={() => handleQuickRoute(route)}
                  >
                    {route.originCity} → {route.destCity}
                  </Badge>
                );
              })}
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
            <Input
              type="tel"
              placeholder={data.originCountry === "SN" ? "+221 77 123 45 67" : "+33 6 12 34 56 78"}
              value={data.originPhone}
              onChange={(e) => handleChange("originPhone", e.target.value)}
              className={cn(
                "h-12",
                showValidation && !isOriginPhoneValid && "border-destructive"
              )}
            />
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
            <Input
              type="tel"
              placeholder={data.destinationCountry === "FR" ? "+33 6 12 34 56 78" : "+221 77 123 45 67"}
              value={data.destinationPhone}
              onChange={(e) => handleChange("destinationPhone", e.target.value)}
              className={cn(
                "h-12",
                showValidation && !isDestPhoneValid && "border-destructive"
              )}
            />
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
