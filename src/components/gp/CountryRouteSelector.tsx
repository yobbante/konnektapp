import { useState } from "react";
import { MapPin, ArrowRight, ArrowLeftRight, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Popular countries for GP Bagages
const COUNTRIES = [
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "GN", name: "Guinée", flag: "🇬🇳" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "BJ", name: "Bénin", flag: "🇧🇯" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
  { code: "DZ", name: "Algérie", flag: "🇩🇿" },
  { code: "TN", name: "Tunisie", flag: "🇹🇳" },
  { code: "AE", name: "Émirats", flag: "🇦🇪" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "US", name: "États-Unis", flag: "🇺🇸" },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧" },
  { code: "BE", name: "Belgique", flag: "🇧🇪" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪" },
  { code: "ES", name: "Espagne", flag: "🇪🇸" },
  { code: "IT", name: "Italie", flag: "🇮🇹" },
  { code: "CH", name: "Suisse", flag: "🇨🇭" },
];

// Popular city presets by country
const POPULAR_CITIES: Record<string, string[]> = {
  FR: ["Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux", "Lille", "Nice"],
  SN: ["Dakar", "Thiès", "Saint-Louis", "Kaolack", "Ziguinchor"],
  CI: ["Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro"],
  CM: ["Douala", "Yaoundé", "Bafoussam", "Garoua"],
  MA: ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger"],
  CA: ["Montréal", "Toronto", "Vancouver", "Ottawa"],
  US: ["New York", "Los Angeles", "Chicago", "Houston", "Miami"],
  AE: ["Dubaï", "Abu Dhabi", "Sharjah"],
};

interface CountryRouteSelectorProps {
  originCountry: string;
  originCity: string;
  destinationCountry: string;
  destinationCity: string;
  onOriginCountryChange: (code: string) => void;
  onOriginCityChange: (city: string) => void;
  onDestinationCountryChange: (code: string) => void;
  onDestinationCityChange: (city: string) => void;
  showSwapButton?: boolean;
  compact?: boolean;
}

export function CountryRouteSelector({
  originCountry,
  originCity,
  destinationCountry,
  destinationCity,
  onOriginCountryChange,
  onOriginCityChange,
  onDestinationCountryChange,
  onDestinationCityChange,
  showSwapButton = true,
  compact = false,
}: CountryRouteSelectorProps) {
  const handleSwap = () => {
    const tempCountry = originCountry;
    const tempCity = originCity;
    onOriginCountryChange(destinationCountry);
    onOriginCityChange(destinationCity);
    onDestinationCountryChange(tempCountry);
    onDestinationCityChange(tempCity);
  };

  const originCities = POPULAR_CITIES[originCountry] || [];
  const destinationCities = POPULAR_CITIES[destinationCountry] || [];

  const getCountryDisplay = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country ? `${country.flag} ${country.name}` : code;
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {/* Origin */}
          <div className="flex-1">
            <Select value={originCountry} onValueChange={onOriginCountryChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Pays départ" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showSwapButton && (
            <Button 
              type="button"
              variant="ghost" 
              size="icon" 
              onClick={handleSwap}
              className="h-9 w-9 flex-shrink-0"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
          )}

          {/* Destination */}
          <div className="flex-1">
            <Select value={destinationCountry} onValueChange={onDestinationCountryChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Pays arrivée" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cities row */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ville départ"
            value={originCity}
            onChange={(e) => onOriginCityChange(e.target.value)}
            className="flex-1 h-9 text-sm"
            list="origin-cities"
          />
          <datalist id="origin-cities">
            {originCities.map(city => (
              <option key={city} value={city} />
            ))}
          </datalist>

          <Plane className="w-4 h-4 text-muted-foreground flex-shrink-0" />

          <Input
            placeholder="Ville arrivée"
            value={destinationCity}
            onChange={(e) => onDestinationCityChange(e.target.value)}
            className="flex-1 h-9 text-sm"
            list="dest-cities"
          />
          <datalist id="dest-cities">
            {destinationCities.map(city => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Origin Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="w-4 h-4 text-primary" />
          Départ
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Select value={originCountry} onValueChange={onOriginCountryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Pays" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.flag} {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Input
              placeholder="Ville"
              value={originCity}
              onChange={(e) => onOriginCityChange(e.target.value)}
              list="origin-cities-full"
            />
            <datalist id="origin-cities-full">
              {originCities.map(city => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Quick city selection */}
        {originCities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {originCities.slice(0, 4).map(city => (
              <Badge
                key={city}
                variant={originCity === city ? "default" : "outline"}
                className="cursor-pointer text-xs py-0.5"
                onClick={() => onOriginCityChange(city)}
              >
                {city}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Swap Button */}
      {showSwapButton && (
        <div className="flex justify-center">
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={handleSwap}
            className="gap-2"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Inverser
          </Button>
        </div>
      )}

      {/* Destination Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="w-4 h-4 text-secondary" />
          Arrivée
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Select value={destinationCountry} onValueChange={onDestinationCountryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Pays" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.flag} {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Input
              placeholder="Ville"
              value={destinationCity}
              onChange={(e) => onDestinationCityChange(e.target.value)}
              list="dest-cities-full"
            />
            <datalist id="dest-cities-full">
              {destinationCities.map(city => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Quick city selection */}
        {destinationCities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {destinationCities.slice(0, 4).map(city => (
              <Badge
                key={city}
                variant={destinationCity === city ? "default" : "outline"}
                className="cursor-pointer text-xs py-0.5"
                onClick={() => onDestinationCityChange(city)}
              >
                {city}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { COUNTRIES, POPULAR_CITIES };
