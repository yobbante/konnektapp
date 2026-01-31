import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Package, ArrowRight, Star, Loader2, Heart, Calendar,
  Zap, Truck, Ship, Plane, Briefcase, Luggage, Building2
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SmartRouteSearch } from "@/components/offers/SmartRouteSearch";
import { useFavorites } from "@/hooks/useFavorites";
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
  { type: "bagages_international", label: "GP", icon: Luggage },
  { type: "routier", label: "Routier", icon: Truck },
  { type: "maritime", label: "Maritime", icon: Ship },
  { type: "aerien", label: "Aérien", icon: Plane },
];

const getTransportLabel = (type: TransportType) => {
  return transportConfig[type]?.label || type;
};

const getTransportConfig = (type: TransportType) => {
  return transportConfig[type] || transportConfig.routier;
};

export default function Offres() {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOrigin, setSearchOrigin] = useState<string | undefined>();
  const [searchDestination, setSearchDestination] = useState<string | undefined>();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 20;
  const { isAuthenticated, isFavorite, toggleFavorite } = useFavorites();

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await fetchOffers(true);
  }, []);

  const { isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  useEffect(() => {
    fetchOffers(true);

    // Subscribe to realtime updates
    const channel = supabase
      .channel('offers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gp_offers'
        },
        () => fetchOffers(true)
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

  // Handle smart search
  const handleSearch = (query: string, origin?: string, destination?: string) => {
    setSearchQuery(query);
    setSearchOrigin(origin);
    setSearchDestination(destination);
  };

  // Apply all filters
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      // Transport type filter
      if (activeFilter !== "all" && offer.transport_type !== activeFilter) {
        // Also include voyageur for bagages_international filter
        if (!(activeFilter === "bagages_international" && offer.transport_type === "voyageur")) {
          return false;
        }
      }

      // Route-based search (origin)
      if (searchOrigin) {
        const originMatch = offer.origin_city.toLowerCase().includes(searchOrigin.toLowerCase());
        if (!originMatch) return false;
      }

      // Route-based search (destination)
      if (searchDestination) {
        const destMatch = offer.destination_city.toLowerCase().includes(searchDestination.toLowerCase());
        if (!destMatch) return false;
      }

      // General text search
      if (searchQuery && !searchOrigin && !searchDestination) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          offer.origin_city.toLowerCase().includes(query) ||
          offer.destination_city.toLowerCase().includes(query) ||
          (offer.gp_profile?.business_name || "").toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [offers, activeFilter, searchQuery, searchOrigin, searchDestination]);

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
      <AppHeader title="Offres" />

      {/* Smart Search */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border">
        <SmartRouteSearch onSearch={handleSearch} />
        
        {/* Transport Type Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 mt-3 -mx-4 px-4 scrollbar-hide">
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

                        {/* Route */}
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
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{offer.destination_city}</span>
                            <div className="w-3 h-3 rounded-full bg-destructive shadow-lg shadow-destructive/30" />
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* GP Name & Rating */}
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-xs font-bold">
                                  {(offer.gp_profile?.business_name || "GP").charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium line-clamp-1">
                                  {offer.gp_profile?.business_name || "Transporteur"}
                                </p>
                                {offer.gp_profile?.rating && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    <span className="text-xs text-muted-foreground">
                                      {offer.gp_profile.rating.toFixed(1)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Price & CTA */}
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">
                              {offer.price_per_kg.toLocaleString()} F
                              <span className="text-xs font-normal text-muted-foreground">/kg</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {offer.available_capacity} kg dispo
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            
            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune offre trouvée</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Essayez de modifier vos critères de recherche
            </p>
            <Button variant="outline" onClick={() => handleSearch("", undefined, undefined)}>
              Réinitialiser la recherche
            </Button>
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
