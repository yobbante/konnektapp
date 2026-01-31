import { useState, useMemo } from "react";
import { Search, MapPin, ArrowRight, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SmartRouteSearchProps {
  onSearch: (query: string, origin?: string, destination?: string) => void;
  suggestions?: { origin: string; destination: string; count: number }[];
}

/**
 * SmartRouteSearch - Recherche intelligente par route
 * 
 * Features:
 * - Recherche libre texte
 * - Sélection interactive origine → destination
 * - Suggestions de routes populaires
 * - Mode route directe (ex: "Dakar → Abidjan")
 */
export function SmartRouteSearch({ onSearch, suggestions = [] }: SmartRouteSearchProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"text" | "route">("text");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Popular cities for quick selection
  const popularCities = [
    "Dakar", "Abidjan", "Paris", "Bamako", "Conakry", 
    "Casablanca", "Bruxelles", "Douala", "Cotonou", "Lomé"
  ];

  // Default route suggestions if none provided
  const defaultSuggestions = [
    { origin: "Dakar", destination: "Abidjan", count: 45 },
    { origin: "Paris", destination: "Dakar", count: 32 },
    { origin: "Dakar", destination: "Bamako", count: 28 },
    { origin: "Abidjan", destination: "Paris", count: 24 },
    { origin: "Casablanca", destination: "Dakar", count: 18 },
  ];

  const routeSuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;

  // Parse route from query (e.g., "Dakar → Abidjan" or "Dakar Abidjan")
  const parseRouteFromQuery = (q: string) => {
    // Check for arrow format
    if (q.includes("→") || q.includes("->")) {
      const parts = q.split(/→|->/).map(p => p.trim());
      if (parts.length === 2) {
        return { origin: parts[0], destination: parts[1] };
      }
    }
    return null;
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    
    // Try to parse route
    const route = parseRouteFromQuery(value);
    if (route) {
      setOrigin(route.origin);
      setDestination(route.destination);
    }
    
    // Trigger search
    onSearch(value, route?.origin, route?.destination);
  };

  const handleRouteSelect = (o: string, d: string) => {
    setOrigin(o);
    setDestination(d);
    setQuery(`${o} → ${d}`);
    onSearch(`${o} → ${d}`, o, d);
    setShowSuggestions(false);
  };

  const handleCityClick = (city: string) => {
    if (!origin) {
      setOrigin(city);
    } else if (!destination) {
      setDestination(city);
      setQuery(`${origin} → ${city}`);
      onSearch(`${origin} → ${city}`, origin, city);
    } else {
      // Reset and start new
      setOrigin(city);
      setDestination("");
      setQuery(city);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setOrigin("");
    setDestination("");
    onSearch("", undefined, undefined);
  };

  const hasActiveSearch = query || origin || destination;

  return (
    <div className="space-y-3">
      {/* Main Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
          placeholder="Rechercher une route... ex: Dakar → Abidjan"
          className="pl-10 pr-10 h-12 text-base bg-muted/50 border-0 focus-visible:ring-primary"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
        />
        {hasActiveSearch && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={clearSearch}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Active Route Display */}
      <AnimatePresence>
        {(origin || destination) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            {origin && (
              <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700 border-green-200">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                {origin}
                <button onClick={() => { setOrigin(""); setQuery(destination || ""); }}>
                  <X className="w-3 h-3 ml-1" />
                </button>
              </Badge>
            )}
            {origin && destination && (
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            )}
            {destination && (
              <Badge variant="secondary" className="gap-1 bg-red-500/10 text-red-700 border-red-200">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                {destination}
                <button onClick={() => { setDestination(""); setQuery(origin || ""); }}>
                  <X className="w-3 h-3 ml-1" />
                </button>
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick City Selection */}
      {showSuggestions && !hasActiveSearch && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Route Suggestions */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Routes populaires</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {routeSuggestions.slice(0, 4).map((route, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRouteSelect(route.origin, route.destination)}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="font-medium">{route.origin}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="font-medium">{route.destination}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {route.count} offres
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Popular Cities */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                {!origin ? "Choisir l'origine" : "Choisir la destination"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCityClick(city)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    city === origin
                      ? "bg-green-500 text-white"
                      : city === destination
                      ? "bg-red-500 text-white"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
