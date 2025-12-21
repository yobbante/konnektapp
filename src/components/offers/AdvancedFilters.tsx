import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, Calendar, Weight, Coins, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";

export interface AdvancedFiltersState {
  minPrice: number;
  maxPrice: number;
  minWeight: number;
  dateFrom: string;
  dateTo: string;
  notifyEnabled: boolean;
}

interface AdvancedFiltersProps {
  filters: AdvancedFiltersState;
  onFiltersChange: (filters: AdvancedFiltersState) => void;
  onSaveSearch: () => void;
  isAuthenticated: boolean;
}

const DEFAULT_FILTERS: AdvancedFiltersState = {
  minPrice: 0,
  maxPrice: 50000,
  minWeight: 0,
  dateFrom: "",
  dateTo: "",
  notifyEnabled: false,
};

export function AdvancedFilters({ 
  filters, 
  onFiltersChange, 
  onSaveSearch,
  isAuthenticated 
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const hasActiveFilters = 
    filters.minPrice > 0 || 
    filters.maxPrice < 50000 || 
    filters.minWeight > 0 ||
    filters.dateFrom || 
    filters.dateTo;

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_FILTERS);
    onFiltersChange(DEFAULT_FILTERS);
  };

  const handleSaveAndNotify = () => {
    onFiltersChange({ ...localFilters, notifyEnabled: true });
    onSaveSearch();
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant={hasActiveFilters ? "default" : "outline"} 
          size="sm" 
          className="gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtres
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />
            Filtres avancés
          </SheetTitle>
          <SheetDescription>
            Affinez votre recherche pour trouver l'offre parfaite
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6 overflow-y-auto max-h-[calc(85vh-200px)]">
          {/* Price Range */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Coins className="w-4 h-4 text-primary" />
              Plage de prix (FCFA/kg)
            </Label>
            <div className="px-2">
              <Slider
                value={[localFilters.minPrice, localFilters.maxPrice]}
                onValueChange={([min, max]) => 
                  setLocalFilters({ ...localFilters, minPrice: min, maxPrice: max })
                }
                min={0}
                max={50000}
                step={500}
                className="mb-4"
              />
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    type="number"
                    value={localFilters.minPrice}
                    onChange={(e) => 
                      setLocalFilters({ ...localFilters, minPrice: Number(e.target.value) })
                    }
                    className="h-9"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    type="number"
                    value={localFilters.maxPrice}
                    onChange={(e) => 
                      setLocalFilters({ ...localFilters, maxPrice: Number(e.target.value) })
                    }
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Weight */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Weight className="w-4 h-4 text-primary" />
              Poids minimum disponible (kg)
            </Label>
            <div className="px-2">
              <Slider
                value={[localFilters.minWeight]}
                onValueChange={([weight]) => 
                  setLocalFilters({ ...localFilters, minWeight: weight })
                }
                min={0}
                max={500}
                step={5}
                className="mb-2"
              />
              <p className="text-sm text-muted-foreground text-center">
                {localFilters.minWeight} kg minimum
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Calendar className="w-4 h-4 text-primary" />
              Période de départ
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">À partir du</Label>
                <Input
                  type="date"
                  value={localFilters.dateFrom}
                  onChange={(e) => 
                    setLocalFilters({ ...localFilters, dateFrom: e.target.value })
                  }
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Jusqu'au</Label>
                <Input
                  type="date"
                  value={localFilters.dateTo}
                  onChange={(e) => 
                    setLocalFilters({ ...localFilters, dateTo: e.target.value })
                  }
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Notification Toggle */}
          {isAuthenticated && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {localFilters.notifyEnabled ? (
                    <Bell className="w-5 h-5 text-primary" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">Alertes nouvelles offres</p>
                    <p className="text-xs text-muted-foreground">
                      Recevoir une notification pour les offres correspondantes
                    </p>
                  </div>
                </div>
                <Switch
                  checked={localFilters.notifyEnabled}
                  onCheckedChange={(checked) => 
                    setLocalFilters({ ...localFilters, notifyEnabled: checked })
                  }
                />
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          {isAuthenticated && localFilters.notifyEnabled && (
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={handleSaveAndNotify}
            >
              <Bell className="w-4 h-4" />
              Sauvegarder et activer les alertes
            </Button>
          )}
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

export { DEFAULT_FILTERS };
