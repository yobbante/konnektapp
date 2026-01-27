import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, Truck, ArrowRight, Zap, Ship, Plane, 
  MapPin, Star, Shield, Clock, Briefcase, Building2, Scale, Weight, Download
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { CompareProvider, useCompare, CompareOffer } from "@/components/offers/OfferCompare";
import { HomeAdvancedFilters, HomeFiltersState, DEFAULT_HOME_FILTERS } from "@/components/home/HomeAdvancedFilters";
import { LoggedInHomeDashboard } from "@/components/home/LoggedInHomeDashboard";
import { ActiveReservationBanner } from "@/components/client/ActiveReservationBanner";
import { useUserRole } from "@/hooks/useUserRole";
import { formatPricePerKg } from "@/components/ui/currency-selector";
import { ShipmentOfferCard } from "@/components/ShipmentOfferCard";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";
import { AppLikeHome } from "@/components/home/AppLikeHome";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur" | "agence";

const transportTypes = [
  { type: "voyageur" as TransportType, icon: Briefcase, label: "GP", color: "bg-transport-voyageur/10 text-transport-voyageur border-transport-voyageur/20" },
  { type: "agence" as TransportType, icon: Building2, label: "Agence", color: "bg-transport-agence/10 text-transport-agence border-transport-agence/20" },
  { type: "express" as TransportType, icon: Zap, label: "Express", color: "bg-transport-express/10 text-transport-express border-transport-express/20" },
  { type: "routier" as TransportType, icon: Truck, label: "Routier", color: "bg-transport-routier/10 text-transport-routier border-transport-routier/20" },
  { type: "maritime" as TransportType, icon: Ship, label: "Maritime", color: "bg-transport-maritime/10 text-transport-maritime border-transport-maritime/20" },
  { type: "aerien" as TransportType, icon: Plane, label: "Aérien", color: "bg-transport-aerien/10 text-transport-aerien border-transport-aerien/20" },
];

function IndexContent() {
  const { isGP, isAuthenticated, userId } = useUserRole();
  const [selectedType, setSelectedType] = useState<TransportType | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<HomeFiltersState>(DEFAULT_HOME_FILTERS);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await loadOffers();
  }, []);

  const { isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  useEffect(() => {
    loadOffers();
    if (isAuthenticated && userId) {
      loadUserData();
    }
  }, [isAuthenticated, userId]);

  const loadUserData = async () => {
    if (!userId) return;
    try {
      // Load recent orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, origin_city, destination_city, weight, status")
        .eq("client_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);
      if (orders) setRecentOrders(orders);

      // Load unread messages count
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .is("read_at", null)
        .neq("sender_id", userId);
      if (count) setUnreadMessages(count);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadOffers = async () => {
    try {
      // First fetch offers
      const { data: offersData, error: offersError } = await supabase
        .from("gp_offers")
        .select(`
          *,
          vehicles(id, name, vehicle_type, max_weight_kg)
        `)
        .eq("status", "active")
        .gte("departure_date", new Date().toISOString())
        .order("departure_date", { ascending: true })
        .limit(6);

      if (offersError) throw offersError;

      if (offersData && offersData.length > 0) {
        // Fetch GP profiles separately
        const gpIds = [...new Set(offersData.map(o => o.gp_id))];
        const { data: profiles } = await supabase
          .from("public_gp_profiles")
          .select("id, business_name, rating")
          .in("id", gpIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const mappedData = offersData.map(offer => ({
          ...offer,
          gp_profiles: profilesMap.get(offer.gp_id) || { business_name: "Transporteur", rating: 0 }
        }));
        setOffers(mappedData);
      } else {
        setOffers([]);
      }
    } catch (error) {
      console.error("Error loading offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOffers = offers.filter((offer) => {
    // Transport type filter
    if (selectedType && offer.transport_type !== selectedType) return false;
    
    // City filters
    if (advancedFilters.originCity && !offer.origin_city.toLowerCase().includes(advancedFilters.originCity.toLowerCase())) return false;
    if (advancedFilters.destinationCity && !offer.destination_city.toLowerCase().includes(advancedFilters.destinationCity.toLowerCase())) return false;
    
    // Price filter
    if (offer.price_per_kg < advancedFilters.minPrice || offer.price_per_kg > advancedFilters.maxPrice) return false;
    
    // Capacity filter
    if (advancedFilters.minCapacity > 0 && offer.available_capacity < advancedFilters.minCapacity) return false;
    
    return true;
  });

  const displayedOffers = selectedType ? filteredOffers : filteredOffers.slice(0, 4);

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* RÈGLE NOTIF-01: Bande persistante pour réservations acceptées */}
      {isAuthenticated && !isGP && <ActiveReservationBanner />}
      
      <PullToRefreshIndicator isRefreshing={isRefreshing} progress={progress} pullDistance={pullDistance} />
      <MobileHeader />

      {/* APP-LIKE HOME: 1 écran, pas de scroll, conversion first */}
      {/* Show for guests OR GPs - single screen app-like experience */}
      {(!isAuthenticated || isGP) && (
        <AppLikeHome />
      )}

      {/* Logged-in Client Dashboard - with scroll allowed */}
      {isAuthenticated && !isGP && (
        <section className="px-4 py-6">
          <LoggedInHomeDashboard
            userName={undefined}
            recentOrders={recentOrders}
            unreadMessages={unreadMessages}
          />
        </section>
      )}

      {/* Main Content - Only shown for authenticated clients (scroll allowed for them) */}
      {isAuthenticated && !isGP && (
      <section className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground text-lg">Offres disponibles</h2>
          <div className="flex items-center gap-2">
            {selectedType && (
              <button
                onClick={() => setSelectedType(null)}
                className="text-xs text-primary font-medium hover:underline"
              >
                Tout voir
              </button>
            )}
            {/* Advanced Filters */}
            <HomeAdvancedFilters 
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
            />
            {/* Mobile: Sheet for transport type */}
            <Sheet open={showFilterSheet} onOpenChange={setShowFilterSheet}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="outline" size="sm" className="gap-1">
                  <Truck className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[50vh] rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Type de transport</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {transportTypes.map((type) => (
                    <button
                      key={type.label}
                      onClick={() => {
                        setSelectedType(selectedType === type.type ? null : type.type);
                        setShowFilterSheet(false);
                      }}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        selectedType === type.type 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : `${type.color} hover:shadow-md bg-card`
                      }`}
                    >
                      <type.icon className={`w-5 h-5 ${selectedType === type.type ? 'text-primary-foreground' : ''}`} />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Responsive Grid */}
        <div className="flex flex-col lg:flex-row lg:gap-6">
          
          {/* Transport Type Selector */}
          <div className="lg:w-48 lg:flex-shrink-0 mb-4 lg:mb-0">
            {/* Mobile: Horizontal scroll with icons only */}
            <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {transportTypes.map((type, index) => (
                <motion.button 
                  key={type.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedType(selectedType === type.type ? null : type.type)}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all flex-shrink-0 ${
                    selectedType === type.type 
                      ? "bg-primary text-primary-foreground border-primary shadow-lg" 
                      : `${type.color} hover:shadow-md bg-card`
                  }`}
                  title={type.label}
                >
                  <type.icon className={`w-5 h-5 ${selectedType === type.type ? 'text-primary-foreground' : ''}`} />
                </motion.button>
              ))}
            </div>
            
            {/* Desktop: Full buttons */}
            <div className="hidden lg:flex lg:flex-col gap-2">
              {transportTypes.map((type, index) => (
                <motion.button 
                  key={type.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedType(selectedType === type.type ? null : type.type)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all w-full ${
                    selectedType === type.type 
                      ? "bg-primary text-primary-foreground border-primary shadow-lg" 
                      : `${type.color} hover:shadow-md bg-card`
                  }`}
                >
                  <type.icon className={`w-5 h-5 flex-shrink-0 ${selectedType === type.type ? 'text-primary-foreground' : ''}`} />
                  <span className="text-sm font-medium">{type.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
          
          {/* Offers List */}
          <div className="flex-1">
            {selectedType && (
              <p className="text-sm text-muted-foreground mb-3">
                {filteredOffers.length} offre{filteredOffers.length > 1 ? "s" : ""} {transportTypes.find(t => t.type === selectedType)?.label}
              </p>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedOffers.map((offer, index) => (
                  <ShipmentOfferCard
                    key={offer.id}
                    id={offer.id}
                    gpId={offer.gp_id}
                    origin={offer.origin_city}
                    destination={offer.destination_city}
                    originCountry={offer.origin_country}
                    destinationCountry={offer.destination_country}
                    date={offer.departure_date}
                    arrivalDate={offer.arrival_date}
                    price={offer.price_per_kg}
                    currency={offer.currency}
                    transportType={offer.transport_type}
                    gpName={offer.gp_profiles?.business_name || "Transporteur"}
                    gpRating={offer.gp_profiles?.rating || 0}
                    status="available"
                    delay={index * 0.08}
                    availableCapacity={offer.available_capacity}
                    vehicle={offer.vehicles}
                    isVerified={true}
                  />
                ))}
              </div>
            )}

            {!loading && filteredOffers.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucune offre disponible</p>
              </div>
            )}

            {!loading && !selectedType && offers.length > 0 && (
              <Link to="/offres" className="block mt-4">
                <Button variant="outline" className="w-full">
                  Voir toutes les offres
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}

            {!loading && selectedType && filteredOffers.length > 0 && (
              <Link to={`/offres?type=${selectedType}`} className="block mt-4">
                <Button variant="outline" className="w-full">
                  Voir sur la page offres
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Quick Stats - Only for authenticated clients */}
      {isAuthenticated && !isGP && (
      <section className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="mobile-card text-center">
            <p className="text-xl font-bold text-primary">5000+</p>
            <p className="text-xs text-muted-foreground">Transporteurs</p>
          </div>
          <div className="mobile-card text-center">
            <p className="text-xl font-bold text-primary">50K+</p>
            <p className="text-xs text-muted-foreground">Colis livrés</p>
          </div>
          <div className="mobile-card text-center">
            <p className="text-xl font-bold text-primary">4.8</p>
            <p className="text-xs text-muted-foreground">Note moyenne</p>
          </div>
        </div>
      </section>
      )}

      {/* Why Us - Only for authenticated clients */}
      {isAuthenticated && !isGP && (
      <section className="px-4 py-4">
        <h2 className="font-semibold text-foreground mb-4">Pourquoi nous choisir</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="mobile-card flex flex-col items-center text-center p-4">
            <Shield className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm font-medium">Transporteurs vérifiés</span>
          </div>
          <div className="mobile-card flex flex-col items-center text-center p-4">
            <Clock className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm font-medium">Suivi temps réel</span>
          </div>
        </div>
      </section>
      )}

      {/* Install PWA CTA - Only for authenticated clients */}
      {isAuthenticated && !isGP && (
      <section className="px-4 pb-20 mb-4">
        <Link to="/install">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl p-4 flex items-center gap-4 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-white text-sm">Installer l'app</h3>
              <p className="text-white/80 text-xs">Accès rapide depuis l'écran d'accueil</p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/80" />
          </div>
        </Link>
      </section>
      )}

      <MobileNav />
    </div>
  );
}
export default function Index() {
  return (
    <CompareProvider>
      <IndexContent />
    </CompareProvider>
  );
}
