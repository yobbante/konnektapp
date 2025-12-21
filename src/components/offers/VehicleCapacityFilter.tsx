import { useState } from "react";
import { Truck, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { getAllVehicleTypes, getCategoryLabel } from "@/lib/vehicleTypes";

export interface VehicleCapacityFiltersState {
  vehicleCategories: string[];
  minCapacity: number;
  maxCapacity: number;
}

interface VehicleCapacityFilterProps {
  filters: VehicleCapacityFiltersState;
  onFiltersChange: (filters: VehicleCapacityFiltersState) => void;
}

export const DEFAULT_VEHICLE_FILTERS: VehicleCapacityFiltersState = {
  vehicleCategories: [],
  minCapacity: 0,
  maxCapacity: 50000,
};

// Get unique categories from vehicle types (sans agence et express pour v1)
const VEHICLE_CATEGORIES = [
  { id: "voyageur", label: "Voyageur (GP)", icon: "👤" },
  { id: "routier", label: "Routier", icon: "🚛" },
  { id: "maritime", label: "Maritime", icon: "🚢" },
  { id: "aerien", label: "Aérien", icon: "✈️" },
];

export function VehicleCapacityFilter({ 
  filters, 
  onFiltersChange 
}: VehicleCapacityFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const hasActiveFilters = 
    filters.vehicleCategories.length > 0 || 
    filters.minCapacity > 0 || 
    filters.maxCapacity < 50000;

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_VEHICLE_FILTERS);
    onFiltersChange(DEFAULT_VEHICLE_FILTERS);
  };

  const toggleCategory = (categoryId: string) => {
    const hasCategory = localFilters.vehicleCategories.includes(categoryId);
    
    if (hasCategory) {
      setLocalFilters({
        ...localFilters,
        vehicleCategories: localFilters.vehicleCategories.filter(c => c !== categoryId)
      });
    } else {
      setLocalFilters({
        ...localFilters,
        vehicleCategories: [...localFilters.vehicleCategories, categoryId]
      });
    }
  };

  const isCategorySelected = (categoryId: string) => {
    return localFilters.vehicleCategories.includes(categoryId);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant={hasActiveFilters ? "default" : "outline"} 
          size="sm" 
          className="gap-2"
        >
          <Truck className="w-4 h-4" />
          Véhicule
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 text-xs px-1.5">
              {filters.vehicleCategories.length || ""}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Filtrer par véhicule
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6 overflow-y-auto max-h-[calc(70vh-180px)]">
          {/* Vehicle Categories */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Truck className="w-4 h-4 text-primary" />
              Type de transport
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {VEHICLE_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    isCategorySelected(category.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <span className="text-xl">{category.icon}</span>
                  <span className="text-sm font-medium">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Capacity Range */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Scale className="w-4 h-4 text-primary" />
              Capacité disponible (kg)
            </Label>
            <div className="px-2">
              <Slider
                value={[localFilters.minCapacity, localFilters.maxCapacity]}
                onValueChange={([min, max]) => 
                  setLocalFilters({ ...localFilters, minCapacity: min, maxCapacity: max })
                }
                min={0}
                max={50000}
                step={100}
                className="mb-4"
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{localFilters.minCapacity.toLocaleString()} kg</span>
                <span>{localFilters.maxCapacity.toLocaleString()} kg</span>
              </div>
            </div>
          </div>

          {/* Quick capacity presets */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Capacité rapide</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Petit (<50kg)", min: 0, max: 50 },
                { label: "Moyen (50-500kg)", min: 50, max: 500 },
                { label: "Grand (500-2000kg)", min: 500, max: 2000 },
                { label: "Très grand (>2000kg)", min: 2000, max: 50000 },
              ].map((preset) => (
                <Badge
                  key={preset.label}
                  variant={localFilters.minCapacity === preset.min && localFilters.maxCapacity === preset.max ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setLocalFilters({
                    ...localFilters,
                    minCapacity: preset.min,
                    maxCapacity: preset.max
                  })}
                >
                  {preset.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 w-full">
            <Button 
              variant="ghost" 
              className="flex-1"
              onClick={handleReset}
            >
              Réinitialiser
            </Button>
            <Button 
              variant="default" 
              className="flex-1"
              onClick={handleApply}
            >
              Appliquer
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
