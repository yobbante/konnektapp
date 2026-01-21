import { useState } from "react";
import { MapPin, ArrowRight, ArrowLeftRight, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SearchableCountrySelect, SearchableCityInput, ALL_COUNTRIES, CITIES_BY_COUNTRY } from "./SearchableCountrySelect";

// Re-export for backwards compatibility
export const COUNTRIES = ALL_COUNTRIES;
export const POPULAR_CITIES = CITIES_BY_COUNTRY;

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

  const originCities = CITIES_BY_COUNTRY[originCountry] || [];
  const destinationCities = CITIES_BY_COUNTRY[destinationCountry] || [];

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {/* Origin */}
          <div className="flex-1">
            <SearchableCountrySelect
              value={originCountry}
              onValueChange={onOriginCountryChange}
              placeholder="Pays départ"
              className="w-full h-9 text-sm"
            />
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
            <SearchableCountrySelect
              value={destinationCountry}
              onValueChange={onDestinationCountryChange}
              placeholder="Pays arrivée"
              className="w-full h-9 text-sm"
            />
          </div>
        </div>

        {/* Cities row */}
        <div className="flex items-center gap-2">
          <SearchableCityInput
            value={originCity}
            onValueChange={onOriginCityChange}
            countryCode={originCountry}
            placeholder="Ville départ"
            className="flex-1 h-9 text-sm"
          />

          <Plane className="w-4 h-4 text-muted-foreground flex-shrink-0" />

          <SearchableCityInput
            value={destinationCity}
            onValueChange={onDestinationCityChange}
            countryCode={destinationCountry}
            placeholder="Ville arrivée"
            className="flex-1 h-9 text-sm"
          />
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
          <SearchableCountrySelect
            value={originCountry}
            onValueChange={onOriginCountryChange}
            placeholder="Pays"
          />
          <SearchableCityInput
            value={originCity}
            onValueChange={onOriginCityChange}
            countryCode={originCountry}
            placeholder="Ville"
          />
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
          <SearchableCountrySelect
            value={destinationCountry}
            onValueChange={onDestinationCountryChange}
            placeholder="Pays"
          />
          <SearchableCityInput
            value={destinationCity}
            onValueChange={onDestinationCityChange}
            countryCode={destinationCountry}
            placeholder="Ville"
          />
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
