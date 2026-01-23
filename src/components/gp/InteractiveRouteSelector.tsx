import { useState } from "react";
import { ArrowLeftRight, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  // Sénégal
  { city: "Dakar", country: "SN" },
  { city: "Thiès", country: "SN" },
  { city: "Saint-Louis", country: "SN" },
  // France
  { city: "Paris", country: "FR" },
  { city: "Marseille", country: "FR" },
  { city: "Lyon", country: "FR" },
  { city: "Bordeaux", country: "FR" },
  // USA
  { city: "New York", country: "US" },
  { city: "Washington", country: "US" },
  { city: "Los Angeles", country: "US" },
  { city: "Miami", country: "US" },
  { city: "Houston", country: "US" },
  // Canada
  { city: "Montréal", country: "CA" },
  { city: "Toronto", country: "CA" },
  { city: "Ottawa", country: "CA" },
  // Côte d'Ivoire
  { city: "Abidjan", country: "CI" },
  { city: "Yamoussoukro", country: "CI" },
  // Cameroun
  { city: "Douala", country: "CM" },
  { city: "Yaoundé", country: "CM" },
  // Mali
  { city: "Bamako", country: "ML" },
  // Émirats
  { city: "Dubaï", country: "AE" },
  { city: "Abu Dhabi", country: "AE" },
  // Royaume-Uni
  { city: "Londres", country: "GB" },
  { city: "Manchester", country: "GB" },
  // Belgique
  { city: "Bruxelles", country: "BE" },
  // Maroc
  { city: "Casablanca", country: "MA" },
  { city: "Rabat", country: "MA" },
  // Tunisie
  { city: "Tunis", country: "TN" },
  // Gabon
  { city: "Libreville", country: "GA" },
  // Congo
  { city: "Brazzaville", country: "CG" },
];

// Popular routes with city names
const POPULAR_ROUTES = [
  { originCity: "Dakar", originCountry: "SN", destCity: "Paris", destCountry: "FR" },
  { originCity: "Paris", originCountry: "FR", destCity: "Dakar", destCountry: "SN" },
  { originCity: "Dakar", originCountry: "SN", destCity: "New York", destCountry: "US" },
  { originCity: "Dakar", originCountry: "SN", destCity: "Montréal", destCountry: "CA" },
  { originCity: "Paris", originCountry: "FR", destCity: "Washington", destCountry: "US" },
  { originCity: "Paris", originCountry: "FR", destCity: "Abidjan", destCountry: "CI" },
  { originCity: "Paris", originCountry: "FR", destCity: "Douala", destCountry: "CM" },
  { originCity: "Dubaï", originCountry: "AE", destCity: "Dakar", destCountry: "SN" },
];

interface InteractiveRouteSelectorProps {
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
  onOriginChange: (city: string, country: string) => void;
  onDestinationChange: (city: string, country: string) => void;
}

export function InteractiveRouteSelector({
  originCity,
  originCountry,
  destinationCity,
  destinationCountry,
  onOriginChange,
  onDestinationChange,
}: InteractiveRouteSelectorProps) {
  const getCountryInfo = (code: string) => 
    COUNTRIES[code] || { name: code, flag: "🌍" };

  const handleSwap = () => {
    const tempCity = originCity;
    const tempCountry = originCountry;
    onOriginChange(destinationCity, destinationCountry);
    onDestinationChange(tempCity, tempCountry);
  };

  const handleCityChange = (type: "origin" | "destination", cityName: string) => {
    const cityInfo = CITIES.find(c => c.city === cityName);
    if (cityInfo) {
      if (type === "origin") {
        onOriginChange(cityInfo.city, cityInfo.country);
      } else {
        onDestinationChange(cityInfo.city, cityInfo.country);
      }
    }
  };

  const handleQuickRoute = (route: typeof POPULAR_ROUTES[0]) => {
    onOriginChange(route.originCity, route.originCountry);
    onDestinationChange(route.destCity, route.destCountry);
  };

  const originFlag = getCountryInfo(originCountry).flag;
  const destFlag = getCountryInfo(destinationCountry).flag;

  return (
    <div className="space-y-4">
      <Label>Trajet de base</Label>
      
      {/* Current selection with flags and cities */}
      <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="text-center">
            <span className="text-3xl">{originFlag}</span>
            <p className="text-sm font-medium mt-1">{originCity || "Ville"}</p>
          </div>
          
          <Button 
            type="button"
            variant="ghost" 
            size="icon"
            onClick={handleSwap}
            className="h-10 w-10 rounded-full bg-background border hover:bg-accent"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </Button>
          
          <div className="text-center">
            <span className="text-3xl">{destFlag}</span>
            <p className="text-sm font-medium mt-1">{destinationCity || "Ville"}</p>
          </div>
        </div>

        {/* Route badge */}
        <div className="flex justify-center">
          <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium">
            <Plane className="w-3.5 h-3.5 mr-2" />
            {originCity || "?"} → {destinationCity || "?"}
          </Badge>
        </div>
      </div>

      {/* Dropdowns for city selection */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <span>{originFlag}</span> Ville de départ
          </Label>
          <Select value={originCity} onValueChange={(v) => handleCityChange("origin", v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir une ville">
                {originCity && (
                  <span className="flex items-center gap-2">
                    <span>{originFlag}</span>
                    <span>{originCity}</span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px] bg-popover z-50">
              {CITIES.map((item) => {
                const flag = getCountryInfo(item.country).flag;
                return (
                  <SelectItem key={`${item.city}-${item.country}`} value={item.city}>
                    <span className="flex items-center gap-2">
                      <span>{flag}</span>
                      <span>{item.city}</span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <span>{destFlag}</span> Ville d'arrivée
          </Label>
          <Select value={destinationCity} onValueChange={(v) => handleCityChange("destination", v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir une ville">
                {destinationCity && (
                  <span className="flex items-center gap-2">
                    <span>{destFlag}</span>
                    <span>{destinationCity}</span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px] bg-popover z-50">
              {CITIES.map((item) => {
                const flag = getCountryInfo(item.country).flag;
                return (
                  <SelectItem key={`${item.city}-${item.country}`} value={item.city}>
                    <span className="flex items-center gap-2">
                      <span>{flag}</span>
                      <span>{item.city}</span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick routes with city names */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Trajets de base suggérés</Label>
        <div className="flex flex-wrap gap-2">
          {POPULAR_ROUTES.map((route, i) => {
            const isSelected = originCity === route.originCity && destinationCity === route.destCity;
            
            return (
              <Badge
                key={i}
                variant={isSelected ? "default" : "outline"}
                className="cursor-pointer py-1.5 px-3 hover:bg-accent transition-colors text-xs"
                onClick={() => handleQuickRoute(route)}
              >
                {route.originCity} - {route.destCity}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { COUNTRIES, CITIES };
