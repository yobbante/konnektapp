import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { 
  Package, ArrowRight, Star, Loader2, Heart, Calendar, MapPin, Search,
  Zap, Truck, Ship, Plane, Briefcase, Luggage, Building2, ChevronRight, Shield
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { useFavorites } from "@/hooks/useFavorites";
import { useToast } from "@/hooks/use-toast";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { KTPBadge } from "@/components/ktp/KTPBadge";
import { useKTPPublic, type KTPLevel } from "@/hooks/useKTPStatus";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur" | "agence" | "bagages_international" | "occasionnel";

interface Offer {
  id: string;
  gp_id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  expires_at?: string | null;
  price_per_kg: number;
  currency: string;
  transport_type: TransportType;
  available_capacity: number;
  total_capacity: number;
  status: string;
  gp_profile: {
    business_name: string;
    rating: number | null;
    default_currency: string | null;
  } | null;
  ktp: {
    ktp_level: string;
    trust_score: number;
  } | null;
}

// Transport configurations with gradients and colors
const transportConfig: Record<TransportType, { icon: typeof Package; label: string; color: string; gradient: string }> = {
  bagages_international: { icon: Luggage, label: "GP via Bagages", color: "text-primary", gradient: "from-primary/20 to-primary/5" },
  occasionnel: { icon: Plane, label: "GP Occasionnel", color: "text-amber-500", gradient: "from-amber-500/20 to-orange-500/5" },
  voyageur: { icon: Briefcase, label: "GP", color: "text-green-500", gradient: "from-green-500/20 to-emerald-500/5" },
  express: { icon: Zap, label: "Express", color: "text-orange-500", gradient: "from-orange-500/20 to-amber-500/5" },
  routier: { icon: Truck, label: "Routier", color: "text-blue-500", gradient: "from-blue-500/20 to-cyan-500/5" },
  maritime: { icon: Ship, label: "Maritime", color: "text-cyan-500", gradient: "from-cyan-500/20 to-teal-500/5" },
  aerien: { icon: Plane, label: "Aérien", color: "text-purple-500", gradient: "from-purple-500/20 to-pink-500/5" },
  agence: { icon: Building2, label: "Agence", color: "text-gray-500", gradient: "from-gray-500/20 to-slate-500/5" },
};

// Filters removed - only GP offers displayed for now

const getTransportLabel = (type: TransportType) => {
  return transportConfig[type]?.label || type;
};

const getTransportConfig = (type: TransportType) => {
  return transportConfig[type] || transportConfig.routier;
};

export default function Offres() {
  const { toast } = useToast();
  const navigate = useNavigate();
  // activeFilter removed - only GP offers for now
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOrigin, setSearchOrigin] = useState<string | undefined>(searchParams.get("origin") || undefined);
  const [searchDestination, setSearchDestination] = useState<string | undefined>(searchParams.get("destination") || undefined);
  const [activeType, setActiveType] = useState<string>(searchParams.get("type") || "all");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 20;
  const { isAuthenticated, isFavorite, toggleFavorite } = useFavorites();
  const { rates, toFCFA } = useCurrencyConversion({ gpCurrency: "XOF" });

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
          currency,
          transport_type,
          available_capacity,
          total_capacity,
          status,
          gp_id,
          gp_profiles!gp_offers_gp_id_fkey(subscription)
        `)
        .eq("status", "active")
        .gte("departure_date", new Date().toISOString())
        .gt("available_capacity", 0)
        .order("departure_date", { ascending: true })
        .range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      const visibleOffers = (data || []).filter((offer: any) => {
        const subscription = offer.gp_profiles?.subscription;
        return offer.status === "active" && offer.available_capacity > 0 && new Date(offer.departure_date) > new Date() && (!subscription || true);
      });

      if (visibleOffers.length > 0) {
        const gpIds = [...new Set(visibleOffers.map(o => o.gp_id))];
        
        // Fetch GP profiles and KTP data in parallel
        const [profilesResult, ktpResult, bookingRules] = await Promise.all([
          supabase
            .from("public_gp_profiles")
            .select("id, business_name, rating, default_currency")
            .in("id", gpIds),
          supabase
            .from("ktp_status")
            .select("gp_id, ktp_level, trust_score")
            .in("gp_id", gpIds),
          import("@/lib/bookingRules"),
        ]);

        const profilesMap = new Map(profilesResult.data?.map(p => [p.id, p]) || []);
        const ktpMap = new Map(ktpResult.data?.map(k => [k.gp_id, k]) || []);
        
        const offersWithProfiles = visibleOffers
          .filter((offer: any) => bookingRules.isOfferVisibleForBooking(offer))
          .map(offer => ({
            ...offer,
            gp_profile: profilesMap.get(offer.gp_id) || null,
            ktp: ktpMap.get(offer.gp_id) || null,
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

  const TYPE_MAP: Record<string, string[]> = {
    aerien: ["aerien"],
    maritime: ["maritime"],
    routier: ["routier"],
    bagages: ["bagages_international", "voyageur", "occasionnel"],
  };

  const FILTER_TABS = [
    { id: "all", label: "Tout", icon: Package },
    { id: "bagages", label: "GP", icon: Luggage },
    { id: "aerien", label: "Aérien", icon: Plane },
    { id: "maritime", label: "Maritime", icon: Ship },
    { id: "routier", label: "Routier", icon: Truck },
  ];

  // Apply search filters + type filter + KTP-based sorting
  const filteredOffers = useMemo(() => {
    const filtered = offers.filter((offer) => {
      // Type filter
      if (activeType !== "all") {
        const allowed = TYPE_MAP[activeType] || [];
        if (!allowed.includes(offer.transport_type)) return false;
      }

      // Route-based search (origin)
      if (searchOrigin) {
        if (!offer.origin_city.toLowerCase().includes(searchOrigin.toLowerCase())) return false;
      }

      // Route-based search (destination)
      if (searchDestination) {
        if (!offer.destination_city.toLowerCase().includes(searchDestination.toLowerCase())) return false;
      }

      // General text search
      if (searchQuery && !searchOrigin && !searchDestination) {
        const query = searchQuery.toLowerCase();
        if (
          !offer.origin_city.toLowerCase().includes(query) &&
          !offer.destination_city.toLowerCase().includes(query) &&
          !(offer.gp_profile?.business_name || "").toLowerCase().includes(query)
        ) return false;
      }

      return true;
    });

    // Sort by KTP level priority: pro > verified > basic > inactive/null
    const ktpPriority: Record<string, number> = { pro: 3, verified: 2, basic: 1, inactive: 0 };
    return filtered.sort((a, b) => {
      const aScore = ktpPriority[a.ktp?.ktp_level || "inactive"] || 0;
      const bScore = ktpPriority[b.ktp?.ktp_level || "inactive"] || 0;
      if (bScore !== aScore) return bScore - aScore;
      // Secondary sort by trust score
      return (b.ktp?.trust_score || 0) - (a.ktp?.trust_score || 0);
    });
  }, [offers, searchQuery, searchOrigin, searchDestination, activeType]);

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

  // Handle book now button → go to offer detail page
  const handleBookNow = (e: React.MouseEvent, offer: Offer) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/offres/${offer.id}`);
  };

  // Helper to format price with GP currency
  const formatPriceWithCurrency = (price: number, currency: string) => {
    const symbol = getCurrencySymbol(currency);
    const isFCFA = currency === "XOF" || currency === "FCFA";
    
    if (isFCFA) {
      return {
        main: `${price.toLocaleString()} F`,
        equivalent: null,
      };
    }
    
    // Convert to FCFA for display
    const fcfaAmount = Math.round(price * (currency === "EUR" ? 655.957 : currency === "USD" ? 600 : 1));
    return {
      main: `${price.toLocaleString()} ${symbol}`,
      equivalent: `≈ ${fcfaAmount.toLocaleString()} F`,
    };
  };

  return (
    <div className="min-h-screen bg-background pb-safe">
      <PullToRefreshIndicator isRefreshing={isRefreshing} progress={progress} pullDistance={pullDistance} />
      <AppHeader title="Offres" />

      {/* Search - card style matching home */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-sm px-4 pt-3 pb-2 border-b border-border space-y-2">
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/40">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <input
              type="text"
              placeholder="Ville de départ"
              value={searchOrigin || ""}
              onChange={(e) => { setSearchOrigin(e.target.value || undefined); handleSearch(searchQuery, e.target.value || undefined, searchDestination); }}
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Ville de destination"
              value={searchDestination || ""}
              onChange={(e) => { setSearchDestination(e.target.value || undefined); handleSearch(searchQuery, searchOrigin, e.target.value || undefined); }}
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        {/* Type filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTER_TABS.map((tab) => {
            const isActive = activeType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveType(tab.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all border ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border"
                }`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-2">
        <p className="text-xs text-muted-foreground">
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

                        {/* Route with transport icon */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/30" />
                            <span className="font-semibold">{offer.origin_city}</span>
                          </div>
                          
                          <div className="flex-1 relative h-0.5 bg-border/50 mx-2 flex items-center justify-center">
                            <motion.div 
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/50"
                              initial={{ width: "0%" }}
                              whileInView={{ width: "100%" }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                            />
                            {/* Transport Icon in center */}
                            <div className="absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background border-2 border-primary/50 flex items-center justify-center z-10">
                              <TransportIcon className="w-3 h-3 text-primary" />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{offer.destination_city}</span>
                            <div className="w-3 h-3 rounded-full bg-destructive shadow-lg shadow-destructive/30" />
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* GP Name & Rating + KTP Badge */}
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-xs font-bold">
                                  {(offer.gp_profile?.business_name || "GP").charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium line-clamp-1">
                                    {offer.gp_profile?.business_name || "Transporteur"}
                                  </p>
                                  {offer.ktp && offer.ktp.ktp_level !== "inactive" && offer.ktp.ktp_level !== "basic" && (
                                    <KTPBadge
                                      level={offer.ktp.ktp_level as KTPLevel}
                                      trustScore={offer.ktp.trust_score}
                                      size="sm"
                                      showScore={false}
                                    />
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {offer.gp_profile?.rating && (
                                    <div className="flex items-center gap-0.5">
                                      <Star className="w-3 h-3 fill-warning text-warning" />
                                      <span className="text-xs text-muted-foreground">
                                        {offer.gp_profile.rating.toFixed(1)}
                                      </span>
                                    </div>
                                  )}
                                  {offer.ktp && offer.ktp.trust_score > 0 && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                      <Shield className="w-2.5 h-2.5" />
                                      {offer.ktp.trust_score}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Price with GP currency + FCFA equivalent */}
                          <div className="text-right">
                            {(() => {
                              const priceInfo = formatPriceWithCurrency(offer.price_per_kg, offer.currency || "XOF");
                              return (
                                <>
                                  <p className="text-lg font-bold text-primary">
                                    {priceInfo.main}
                                    <span className="text-xs font-normal text-muted-foreground">/kg</span>
                                  </p>
                                  {priceInfo.equivalent && (
                                    <p className="text-[10px] text-muted-foreground">
                                      {priceInfo.equivalent}/kg
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                            <div className="space-y-1 mt-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground">{offer.available_capacity} kg dispo</span>
                              </div>
                              <div className="h-1 bg-muted rounded-full overflow-hidden w-16">
                                <div
                                  className={`h-full rounded-full ${
                                    offer.available_capacity <= 0 ? "bg-destructive" : 
                                    offer.available_capacity / offer.total_capacity < 0.2 ? "bg-amber-500" : "bg-primary"
                                  }`}
                                  style={{ width: `${Math.max(5, (offer.available_capacity / offer.total_capacity) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Book Now Button - Subtle */}
                        <motion.div 
                          className="mt-3 pt-3 border-t border-border/30"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary group/btn"
                            onClick={(e) => handleBookNow(e, offer)}
                          >
                             Voir l'offre
                             <ChevronRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                          </Button>
                        </motion.div>
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
