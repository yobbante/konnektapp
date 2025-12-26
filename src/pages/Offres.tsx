import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { 
  Search, Package, ArrowRight, MapPin, Star,
  Zap, Truck, Ship, Plane, Briefcase, Loader2, Heart, Scale, Filter, Building2, Calculator
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AdvancedFilters, DEFAULT_FILTERS, type AdvancedFiltersState } from "@/components/offers/AdvancedFilters";
import { VehicleCapacityFilter, DEFAULT_VEHICLE_FILTERS, type VehicleCapacityFiltersState } from "@/components/offers/VehicleCapacityFilter";
import { useFavorites } from "@/hooks/useFavorites";
import { useOfferNotifications } from "@/hooks/useOfferNotifications";
import { CompareProvider, useCompare, CompareOffer } from "@/components/offers/OfferCompare";
import { MovingQuoteCalculator } from "@/components/quotes/MovingQuoteCalculator";
import { useToast } from "@/hooks/use-toast";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur" | "agence";

interface Offer {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  price_per_kg: number;
  transport_type: TransportType;
  available_capacity: number;
  status: string;
  gp_profile: {
    business_name: string;
    rating: number | null;
  } | null;
}

// Filtres de transport sans agence et express pour v1
const transportFilters = [
  { type: "all", label: "Tous", icon: Package },
  { type: "voyageur", label: "GP", icon: Briefcase },
  { type: "routier", label: "Routier", icon: Truck },
  { type: "maritime", label: "Maritime", icon: Ship },
  { type: "aerien", label: "Aérien", icon: Plane },
];

const getTransportIcon = (type: TransportType) => {
  const icons: Record<TransportType, typeof Package> = {
    express: Zap,
    routier: Truck,
    maritime: Ship,
    aerien: Plane,
    voyageur: Briefcase,
    agence: Package,
  };
  return icons[type] || Package;
};

const getTransportLabel = (type: TransportType) => {
  const labels: Record<TransportType, string> = {
    express: "Express",
    routier: "Routier",
    maritime: "Maritime",
    aerien: "Aérien",
    voyageur: "GP",
    agence: "Agence",
  };
  return labels[type] || type;
};

function OffresContent() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const typeFromUrl = searchParams.get("type") || "all";
  const [activeFilter, setActiveFilter] = useState(typeFromUrl);
  const [searchQuery, setSearchQuery] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersState>(DEFAULT_FILTERS);
  const [vehicleFilters, setVehicleFilters] = useState<VehicleCapacityFiltersState>(DEFAULT_VEHICLE_FILTERS);
  const [showQuoteCalculator, setShowQuoteCalculator] = useState(false);
  const { isAuthenticated, isFavorite, toggleFavorite } = useFavorites();
  const { saveSearch } = useOfferNotifications({
    filters: advancedFilters,
    activeTransportType: activeFilter,
    searchQuery,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    fetchOffers();

    // Subscribe to realtime updates for gp_offers
    const channel = supabase
      .channel('offers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gp_offers'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchOffers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("gp_offers")
        .select(`
          id,
          origin_city,
          origin_country,
          destination_city,
          destination_country,
          departure_date,
          price_per_kg,
          transport_type,
          available_capacity,
          status,
          gp_id
        `)
        .eq("status", "active")
        .gte("departure_date", new Date().toISOString())
        .order("departure_date", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const gpIds = [...new Set(data.map(o => o.gp_id))];
        const { data: profiles } = await supabase
          .from("public_gp_profiles")
          .select("id, business_name, rating")
          .in("id", gpIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const offersWithProfiles = data.map(offer => ({
          ...offer,
          gp_profile: profilesMap.get(offer.gp_id) || null
        }));

        setOffers(offersWithProfiles);
      } else {
        setOffers([]);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      // Transport type filter
      if (activeFilter !== "all" && offer.transport_type !== activeFilter) {
        return false;
      }

      // Vehicle category filter
      if (vehicleFilters.vehicleCategories.length > 0) {
        if (!vehicleFilters.vehicleCategories.includes(offer.transport_type)) {
          return false;
        }
      }

      // Capacity filter
      if (vehicleFilters.minCapacity > 0 && offer.available_capacity < vehicleFilters.minCapacity) {
        return false;
      }
      if (vehicleFilters.maxCapacity < 50000 && offer.available_capacity > vehicleFilters.maxCapacity) {
        return false;
      }

      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          offer.origin_city.toLowerCase().includes(query) ||
          offer.destination_city.toLowerCase().includes(query) ||
          (offer.gp_profile?.business_name || "").toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Price range filter
      if (advancedFilters.minPrice > 0 && offer.price_per_kg < advancedFilters.minPrice) {
        return false;
      }
      if (advancedFilters.maxPrice < 50000 && offer.price_per_kg > advancedFilters.maxPrice) {
        return false;
      }

      // Weight filter
      if (advancedFilters.minWeight > 0 && offer.available_capacity < advancedFilters.minWeight) {
        return false;
      }

      // Date filters
      if (advancedFilters.dateFrom) {
        const departureDate = new Date(offer.departure_date);
        const fromDate = new Date(advancedFilters.dateFrom);
        if (departureDate < fromDate) return false;
      }
      if (advancedFilters.dateTo) {
        const departureDate = new Date(offer.departure_date);
        const toDate = new Date(advancedFilters.dateTo);
        if (departureDate > toDate) return false;
      }

      return true;
    });
  }, [offers, activeFilter, searchQuery, advancedFilters, vehicleFilters]);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent, offerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour ajouter aux favoris",
      });
      return;
    }
    
    await toggleFavorite(offerId);
  };

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      {/* Sticky Search & Filters */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border">
        {/* Search Row */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Ville, destination, transporteur..."
              className="pl-10 h-10 bg-muted/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <VehicleCapacityFilter
            filters={vehicleFilters}
            onFiltersChange={setVehicleFilters}
          />
          <AdvancedFilters
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
            onSaveSearch={saveSearch}
            isAuthenticated={isAuthenticated}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuoteCalculator(true)}
            className="gap-2"
          >
            <Calculator className="w-4 h-4" />
            Devis
          </Button>
        </div>

        {/* Transport Filters - Scrollable */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {transportFilters.map((filter) => (
            <button
              key={filter.type}
              onClick={() => setActiveFilter(filter.type)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeFilter === filter.type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <filter.icon className="w-3.5 h-3.5" />
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {loading ? "Chargement..." : `${filteredOffers.length} offre${filteredOffers.length > 1 ? "s" : ""} trouvée${filteredOffers.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Offers List */}
      <div className="px-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredOffers.length > 0 ? (
          <div className="space-y-3">
            {filteredOffers.map((offer, index) => {
              const TransportIcon = getTransportIcon(offer.transport_type);
              const favorite = isFavorite(offer.id);
              return (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/offres/${offer.id}`}>
                    <div className="mobile-card active:scale-[0.98] transition-transform relative">
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => handleFavoriteClick(e, offer.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors z-10"
                      >
                        <Heart 
                          className={`w-4 h-4 transition-colors ${
                            favorite 
                              ? "fill-destructive text-destructive" 
                              : "text-muted-foreground hover:text-destructive"
                          }`} 
                        />
                      </button>

                      {/* Header */}
                      <div className="flex items-center justify-between mb-3 pr-8">
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <TransportIcon className="w-3 h-3" />
                          {getTransportLabel(offer.transport_type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(offer.departure_date)}</span>
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="font-medium">{offer.origin_city}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{offer.destination_city}</span>
                      </div>

                      {/* Capacity info */}
                      <div className="text-xs text-muted-foreground mb-3">
                        Capacité disponible: {offer.available_capacity} kg
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {(offer.gp_profile?.business_name || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{offer.gp_profile?.business_name || "Transporteur"}</p>
                            {offer.gp_profile?.rating && offer.gp_profile.rating > 0 ? (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-warning fill-warning" />
                                <span className="text-xs text-muted-foreground">{offer.gp_profile.rating.toFixed(1)}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Nouveau</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{offer.price_per_kg.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">FCFA/kg</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Aucune offre disponible</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {activeFilter !== "all" 
                ? "Aucune offre pour ce type de transport. Essayez un autre filtre."
                : "Les transporteurs n'ont pas encore publié d'offres."}
            </p>
            <Link to="/demande">
              <Button variant="default" size="sm">
                Créer une demande
              </Button>
            </Link>
          </div>
        )}

        {/* CTA */}
        {filteredOffers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 p-4 rounded-xl bg-muted/50 border border-border text-center"
          >
            <p className="text-sm text-muted-foreground mb-3">
              Vous ne trouvez pas votre trajet ?
            </p>
            <Link to="/demande">
              <Button variant="default" size="sm" className="w-full">
                Créer une demande personnalisée
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>

      {/* Moving Quote Calculator */}
      <MovingQuoteCalculator
        open={showQuoteCalculator}
        onOpenChange={setShowQuoteCalculator}
        onSubmitQuote={(quote) => {
          console.log("Quote submitted:", quote);
        }}
      />

      <MobileNav />
    </div>
  );
}

export default function OffresPage() {
  return (
    <CompareProvider>
      <OffresContent />
    </CompareProvider>
  );
}
