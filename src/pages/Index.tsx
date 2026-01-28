import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, Truck, ArrowRight, Zap, Ship, Plane, 
  MapPin, Star, Shield, Clock, Briefcase, Building2, Scale, Weight, Download
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { CompareProvider, useCompare, CompareOffer } from "@/components/offers/OfferCompare";
import { HomeAdvancedFilters, HomeFiltersState, DEFAULT_HOME_FILTERS } from "@/components/home/HomeAdvancedFilters";
import { ClientAppHome } from "@/components/home/ClientAppHome";
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
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

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
        .limit(5);
      if (orders) {
        setRecentOrders(orders);
        // Count active orders
        const active = orders.filter(o => 
          ['pending', 'accepted', 'collected', 'in_transit'].includes(o.status)
        ).length;
        setActiveOrdersCount(active);
      }

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
    <div className="min-h-screen bg-background pb-safe overflow-hidden">
      {/* RÈGLE NOTIF-01: Bande persistante pour réservations acceptées */}
      {isAuthenticated && !isGP && <ActiveReservationBanner />}
      
      <PullToRefreshIndicator isRefreshing={isRefreshing} progress={progress} pullDistance={pullDistance} />
      <AppHeader />

      {/* APP-LIKE HOME: 1 écran, pas de scroll, conversion first */}
      {/* Show for guests OR GPs - single screen app-like experience */}
      {(!isAuthenticated || isGP) && (
        <AppLikeHome />
      )}

      {/* Logged-in Client Home - NO SCROLL, app-like */}
      {isAuthenticated && !isGP && (
        <ClientAppHome
          recentOrders={recentOrders}
          unreadMessages={unreadMessages}
          activeOrdersCount={activeOrdersCount}
        />
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
