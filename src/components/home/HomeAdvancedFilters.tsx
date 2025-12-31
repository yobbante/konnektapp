import { useState } from "react";
import { Filter, MapPin, DollarSign, Weight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

export interface HomeFiltersState {
  originCity: string;
  destinationCity: string;
  minPrice: number;
  maxPrice: number;
  minCapacity: number;
}

interface HomeAdvancedFiltersProps {
  filters: HomeFiltersState;
  onFiltersChange: (filters: HomeFiltersState) => void;
}

export const DEFAULT_HOME_FILTERS: HomeFiltersState = {
  originCity: "",
  destinationCity: "",
  minPrice: 0,
  maxPrice: 10000,
  minCapacity: 0,
};

export function HomeAdvancedFilters({ filters, onFiltersChange }: HomeAdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<HomeFiltersState>(filters);

  const hasActiveFilters = 
    filters.originCity !== "" ||
    filters.destinationCity !== "" ||
    filters.minPrice > 0 ||
    filters.maxPrice < 10000 ||
    filters.minCapacity > 0;

  const activeFiltersCount = [
    filters.originCity !== "",
    filters.destinationCity !== "",
    filters.minPrice > 0 || filters.maxPrice < 10000,
    filters.minCapacity > 0,
  ].filter(Boolean).length;

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_HOME_FILTERS);
    onFiltersChange(DEFAULT_HOME_FILTERS);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 relative">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filtres</span>
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres avancés
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 mt-4 overflow-y-auto max-h-[calc(80vh-180px)]">
          {/* Villes */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <MapPin className="w-4 h-4 text-primary" />
              Villes
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Origine</Label>
                <Input
                  placeholder="Ex: Dakar"
                  value={localFilters.originCity}
                  onChange={(e) => setLocalFilters({ ...localFilters, originCity: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Destination</Label>
                <Input
                  placeholder="Ex: Abidjan"
                  value={localFilters.destinationCity}
                  onChange={(e) => setLocalFilters({ ...localFilters, destinationCity: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Prix */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <DollarSign className="w-4 h-4 text-primary" />
              Prix (FCFA/kg)
            </Label>
            <div className="px-2">
              <Slider
                value={[localFilters.minPrice, localFilters.maxPrice]}
                onValueChange={([min, max]) => setLocalFilters({ ...localFilters, minPrice: min, maxPrice: max })}
                min={0}
                max={10000}
                step={100}
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{localFilters.minPrice} FCFA</span>
                <span>{localFilters.maxPrice} FCFA</span>
              </div>
            </div>
          </div>

          {/* Capacité */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Weight className="w-4 h-4 text-primary" />
              Capacité minimum (kg)
            </Label>
            <div className="px-2">
              <Slider
                value={[localFilters.minCapacity]}
                onValueChange={([value]) => setLocalFilters({ ...localFilters, minCapacity: value })}
                min={0}
                max={1000}
                step={10}
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{localFilters.minCapacity} kg minimum</span>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex gap-2 mt-4">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <X className="w-4 h-4 mr-1" />
            Réinitialiser
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Appliquer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
