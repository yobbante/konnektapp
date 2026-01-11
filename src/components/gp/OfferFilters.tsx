import { useState } from "react";
import { Search, Filter, X, Calendar, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface OfferFiltersProps {
  onFilterChange: (filters: OfferFilterState) => void;
  activeFilters: OfferFilterState;
}

export interface OfferFilterState {
  search: string;
  status: "all" | "active" | "paused" | "expired";
  city: string;
  dateRange: "all" | "today" | "week" | "month";
}

export const defaultFilters: OfferFilterState = {
  search: "",
  status: "all",
  city: "",
  dateRange: "all",
};

export function OfferFilters({ onFilterChange, activeFilters }: OfferFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = <K extends keyof OfferFilterState>(
    key: K,
    value: OfferFilterState[K]
  ) => {
    onFilterChange({ ...activeFilters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange(defaultFilters);
  };

  const activeFilterCount = [
    activeFilters.status !== "all",
    activeFilters.city !== "",
    activeFilters.dateRange !== "all",
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par ville..."
            value={activeFilters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative h-10 w-10">
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Filtres</h4>
                {activeFilterCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="h-7 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Effacer
                  </Button>
                )}
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Statut</label>
                <Select
                  value={activeFilters.status}
                  onValueChange={(value) => updateFilter("status", value as OfferFilterState["status"])}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Actives</SelectItem>
                    <SelectItem value="paused">En pause</SelectItem>
                    <SelectItem value="expired">Expirées</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* City Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Ville
                </label>
                <Input
                  placeholder="Filtrer par ville..."
                  value={activeFilters.city}
                  onChange={(e) => updateFilter("city", e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Période de départ
                </label>
                <Select
                  value={activeFilters.dateRange}
                  onValueChange={(value) => updateFilter("dateRange", value as OfferFilterState["dateRange"])}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Toutes les dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les dates</SelectItem>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.status !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Statut: {activeFilters.status === "active" ? "Actives" : activeFilters.status === "paused" ? "Pause" : "Expirées"}
              <button onClick={() => updateFilter("status", "all")}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {activeFilters.city && (
            <Badge variant="secondary" className="gap-1">
              Ville: {activeFilters.city}
              <button onClick={() => updateFilter("city", "")}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {activeFilters.dateRange !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {activeFilters.dateRange === "today" ? "Aujourd'hui" : 
               activeFilters.dateRange === "week" ? "Cette semaine" : "Ce mois"}
              <button onClick={() => updateFilter("dateRange", "all")}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
