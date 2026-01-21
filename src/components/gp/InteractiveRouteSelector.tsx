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

// Extended country list with flags
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
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "CD", name: "RD Congo", flag: "🇨🇩" },
  { code: "MR", name: "Mauritanie", flag: "🇲🇷" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
  { code: "DZ", name: "Algérie", flag: "🇩🇿" },
  { code: "TN", name: "Tunisie", flag: "🇹🇳" },
  { code: "AE", name: "Émirats Arabes Unis", flag: "🇦🇪" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "US", name: "États-Unis", flag: "🇺🇸" },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧" },
  { code: "BE", name: "Belgique", flag: "🇧🇪" },
  { code: "CH", name: "Suisse", flag: "🇨🇭" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪" },
  { code: "ES", name: "Espagne", flag: "🇪🇸" },
  { code: "IT", name: "Italie", flag: "🇮🇹" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
];

// Popular routes for quick selection
const POPULAR_ROUTES = [
  { origin: "FR", destination: "SN", label: "Paris → Dakar" },
  { origin: "FR", destination: "CI", label: "Paris → Abidjan" },
  { origin: "SN", destination: "FR", label: "Dakar → Paris" },
  { origin: "FR", destination: "CM", label: "Paris → Douala" },
  { origin: "AE", destination: "SN", label: "Dubaï → Dakar" },
  { origin: "CA", destination: "SN", label: "Montréal → Dakar" },
];

interface InteractiveRouteSelectorProps {
  originCountry: string;
  destinationCountry: string;
  onOriginChange: (code: string) => void;
  onDestinationChange: (code: string) => void;
}

export function InteractiveRouteSelector({
  originCountry,
  destinationCountry,
  onOriginChange,
  onDestinationChange,
}: InteractiveRouteSelectorProps) {
  const getCountryInfo = (code: string) => 
    COUNTRIES.find(c => c.code === code) || { code, name: code, flag: "🌍" };

  const handleSwap = () => {
    const temp = originCountry;
    onOriginChange(destinationCountry);
    onDestinationChange(temp);
  };

  const handleQuickRoute = (origin: string, destination: string) => {
    onOriginChange(origin);
    onDestinationChange(destination);
  };

  const originInfo = getCountryInfo(originCountry);
  const destInfo = getCountryInfo(destinationCountry);

  return (
    <div className="space-y-4">
      <Label>Trajets fréquents</Label>
      
      {/* Current selection with flags */}
      <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="text-center">
            <span className="text-3xl">{originInfo.flag}</span>
            <p className="text-xs text-muted-foreground mt-1">{originInfo.name}</p>
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
            <span className="text-3xl">{destInfo.flag}</span>
            <p className="text-xs text-muted-foreground mt-1">{destInfo.name}</p>
          </div>
        </div>

        {/* Route badge */}
        <div className="flex justify-center">
          <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium">
            <Plane className="w-3.5 h-3.5 mr-2" />
            {originInfo.name} → {destInfo.name}
          </Badge>
        </div>
      </div>

      {/* Dropdowns for selection */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Départ</Label>
          <Select value={originCountry} onValueChange={onOriginChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span>{originInfo.flag}</span>
                  <span>{originInfo.name}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px] bg-popover z-50">
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <span className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{country.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Arrivée</Label>
          <Select value={destinationCountry} onValueChange={onDestinationChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span>{destInfo.flag}</span>
                  <span>{destInfo.name}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px] bg-popover z-50">
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <span className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{country.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick routes */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Trajets populaires</Label>
        <div className="flex flex-wrap gap-2">
          {POPULAR_ROUTES.map((route, i) => {
            const isSelected = originCountry === route.origin && destinationCountry === route.destination;
            const originFlag = getCountryInfo(route.origin).flag;
            const destFlag = getCountryInfo(route.destination).flag;
            
            return (
              <Badge
                key={i}
                variant={isSelected ? "default" : "outline"}
                className="cursor-pointer py-1.5 px-3 hover:bg-accent transition-colors"
                onClick={() => handleQuickRoute(route.origin, route.destination)}
              >
                <span className="mr-1">{originFlag}</span>
                →
                <span className="ml-1">{destFlag}</span>
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { COUNTRIES };
