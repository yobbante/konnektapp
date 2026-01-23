import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { 
  Search, Package, ArrowRight, MapPin, Star,
  Zap, Truck, Ship, Plane, Briefcase, Loader2, Heart, Scale, Filter, Building2, Calculator, Luggage, CheckCircle, Calendar
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur" | "agence" | "bagages_international";

interface Offer {
  id: string;
  gp_id: string;
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

// Transport configurations with gradients and colors
const transportConfig: Record<TransportType, { icon: typeof Package; label: string; color: string; gradient: string }> = {
  bagages_international: { icon: Luggage, label: "GP Bagages", color: "text-primary", gradient: "from-primary/20 to-primary/5" },
  voyageur: { icon: Briefcase, label: "GP", color: "text-green-500", gradient: "from-green-500/20 to-emerald-500/5" },
  express: { icon: Zap, label: "Express", color: "text-orange-500", gradient: "from-orange-500/20 to-amber-500/5" },
  routier: { icon: Truck, label: "Routier", color: "text-blue-500", gradient: "from-blue-500/20 to-cyan-500/5" },
  maritime: { icon: Ship, label: "Maritime", color: "text-cyan-500", gradient: "from-cyan-500/20 to-teal-500/5" },
  aerien: { icon: Plane, label: "Aérien", color: "text-purple-500", gradient: "from-purple-500/20 to-pink-500/5" },
  agence: { icon: Building2, label: "Agence", color: "text-gray-500", gradient: "from-gray-500/20 to-slate-500/5" },
};

const transportFilters = [
  { type: "all", label: "Tous", icon: Package },
  { type: "bagages_international", label: "GP Bagages", icon: Luggage },
  { type: "voyageur", label: "GP", icon: Briefcase },
  { type: "routier", label: "Routier", icon: Truck },
  { type: "maritime", label: "Maritime", icon: Ship },
  { type: "aerien", label: "Aérien", icon: Plane },
];

const getTransportIcon = (type: TransportType) => {
  return transportConfig[type]?.icon || Package;
};

const getTransportLabel = (type: TransportType) => {
  return transportConfig[type]?.label || type;
};

const getTransportConfig = (type: TransportType) => {
  return transportConfig[type] || transportConfig.routier;
};

function OffresContent() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const typeFromUrl = searchParams.get("type") || "all";
  const [activeFilter, setActiveFilter] = useState(typeFromUrl);
  const [searchQuery, setSearchQuery] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 20;
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

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await fetchOffers(true);
  }, []);

  const { isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  useEffect(() => {
    fetchOffers(true);

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
          fetchOffers(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;
      
      const scrollPosition = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.scrollHeight - 500;
      
      if (scrollPosition >= threshold) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore]);

  const fetchOffers = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(0);
      } else {
        setLoadingMore(true);
      }
      
      const currentPage = reset ? 0 : page;
      
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
        .order("departure_date", { ascending: true })
        .range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1);

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

        if (reset) {
          setOffers(offersWithProfiles);
        } else {
          setOffers(prev => [...prev, ...offersWithProfiles]);
        }
        
        setHasMore(data.length === ITEMS_PER_PAGE);
      } else {
        if (reset) setOffers([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      if (reset) setOffers([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1);
      fetchOffers(false);
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
      <PullToRefreshIndicator isRefreshing={isRefreshing} progress={progress} pullDistance={pullDistance} />
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
          <div className="space-y-4">
            {filteredOffers.map((offer, index) => {
              const config = getTransportConfig(offer.transport_type);
              const TransportIcon = config.icon;
              const favorite = isFavorite(offer.id);
              
              return (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  whileHover={{ scale: 1.01 }}
                  className="group"
                >
                  <Link to={`/offres/${offer.id}`}>
                    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} border border-border/50 p-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10`}>
                      {/* Animated background */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/10 blur-2xl" />
                      </div>

                      {/* Favorite Button */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => handleFavoriteClick(e, offer.id)}
                        className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all z-10 shadow-sm"
                      >
                        <Heart 
                          className={`w-4 h-4 transition-all ${
                            favorite 
                              ? "fill-destructive text-destructive scale-110" 
                              : "text-muted-foreground group-hover:text-destructive"
                          }`} 
                        />
                      </motion.button>

                      <div className="relative z-10">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 pr-10">
                          <Badge className={`gap-1.5 px-3 py-1 ${config.color} bg-background/80 backdrop-blur-sm`}>
                            <TransportIcon className="w-3.5 h-3.5" />
                            {getTransportLabel(offer.transport_type)}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/60 px-2 py-1 rounded-full">
                            <Calendar className="w-3 h-3" />
                            {formatDate(offer.departure_date)}
                          </div>
                        </div>

                        {/* Animated Route */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/30" />
                            <span className="font-semibold">{offer.origin_city}</span>
                          </div>
                          
                          <div className="flex-1 relative h-0.5 bg-border/50 mx-2">
                            <motion.div 
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/50"
                              initial={{ width: "0%" }}
                              whileInView={{ width: "100%" }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                            />
                            <motion.div
                              className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center shadow-md"
                              initial={{ left: "0%", opacity: 0 }}
                              whileInView={{ left: "calc(50% - 12px)", opacity: 1 }}
                              transition={{ duration: 0.6, delay: 0.3 }}
                            >
                              <TransportIcon className={`w-3 h-3 ${config.color}`} />
                            </motion.div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{offer.destination_city}</span>
                            <div className="w-3 h-3 rounded-full bg-accent shadow-lg shadow-accent/30" />
                          </div>
                        </div>

                        {/* Capacity & Price Row */}
                        <div className="flex items-center justify-between p-3 bg-background/60 backdrop-blur-sm rounded-xl">
                          <div className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{offer.available_capacity} kg dispo</span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-primary">{offer.price_per_kg.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground ml-1">FCFA/kg</span>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                          <Link 
                            to={`/gp/${offer.gp_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
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
                          </Link>
                          
                          <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-1 text-primary text-sm font-medium"
                          >
                            Voir détails
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            
            {/* Infinite scroll loader */}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            
            {!hasMore && offers.length > ITEMS_PER_PAGE && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Toutes les offres ont été chargées
              </p>
            )}
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
