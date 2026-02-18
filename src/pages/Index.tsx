import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { CompareProvider } from "@/components/offers/OfferCompare";
import { ClientAppHome } from "@/components/home/ClientAppHome";
import { ActiveReservationBanner } from "@/components/client/ActiveReservationBanner";
import { useUserRole } from "@/hooks/useUserRole";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";
import { AppLikeHome } from "@/components/home/AppLikeHome";
import { AppEntryLoader } from "@/components/ui/AppEntryLoader";

function IndexContent() {
  const { isGP, isAuthenticated, userId, loading: roleLoading } = useUserRole();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [movingRequests, setMovingRequests] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [showEntryLoader, setShowEntryLoader] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    if (isAuthenticated && userId) {
      await loadUserData();
    }
  }, [isAuthenticated, userId]);

  const { isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  useEffect(() => {
    if (!roleLoading) {
      if (isAuthenticated && userId) {
        loadUserData();
      } else {
        setDataLoading(false);
      }
    }
  }, [isAuthenticated, userId, roleLoading]);

  const loadUserData = async () => {
    if (!userId) {
      setDataLoading(false);
      return;
    }
    try {
      // Load user profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .single();
      
      if (profile?.full_name) {
        setUserName(profile.full_name);
      }

      // Load recent orders with logistics options
      const { data: orders } = await supabase
        .from("orders")
        .select(`
          id, origin_city, destination_city, weight, status, order_number, 
          total_price, currency, pickup_date, destination_country, origin_country,
          order_logistics_options (
            pickup_enabled, delivery_enabled, pickup_address, delivery_address,
            pickup_contact_name, delivery_contact_name
          )
        `)
        .eq("client_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (orders) {
        // Flatten logistics_options for easier access
        const ordersWithLogistics = orders.map(o => ({
          ...o,
          logistics_options: o.order_logistics_options || null,
          has_internal_logistics: !!(o.order_logistics_options?.pickup_enabled || o.order_logistics_options?.delivery_enabled)
        }));
        setRecentOrders(ordersWithLogistics);
        // Count active orders
        const active = ordersWithLogistics.filter(o => 
          ['pending', 'accepted', 'collected', 'in_transit'].includes(o.status)
        ).length;
        setActiveOrdersCount(active);
      }

      // Load custom requests (non-moving)
      // V1.3 FIX: Exclude demenagement shipment_type to avoid duplicates with movingRequests
      const { data: customReqs } = await supabase
        .from("custom_requests")
        .select("id, request_number, origin_city, destination_city, status, shipment_type, created_at, transport_type")
        .eq("client_id", userId)
        .neq("shipment_type", "demenagement")
        .in("status", ["open", "pending", "responded", "has_responses"])
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (customReqs) {
        setCustomRequests(customReqs);
      }

      // Load moving requests (internal)
      // V1.3 FIX: Use shipment_type = 'demenagement' instead of transport_type = 'interne'
      // because some moving requests may have different transport_type values
      const { data: movingReqs } = await supabase
        .from("custom_requests")
        .select("id, request_number, origin_city, destination_city, status, created_at, volume_estimate")
        .eq("client_id", userId)
        .eq("shipment_type", "demenagement")
        .in("status", ["open", "pending", "reviewing", "quoted", "negotiating", "accepted", "scheduled", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (movingReqs) {
        setMovingRequests(movingReqs);
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
    } finally {
      setDataLoading(false);
    }
  };

  // Check if this is first visit in session
  const isFirstVisit = !sessionStorage.getItem('app_loaded');
  
  // Show entry loader only on first visit
  if (showEntryLoader && isFirstVisit) {
    return (
      <AppEntryLoader 
        onComplete={() => {
          setShowEntryLoader(false);
          sessionStorage.setItem('app_loaded', 'true');
        }} 
        minDuration={1800} 
      />
    );
  }

  // Don't show intermediate loader - go straight to content after entry loader
  // The AppEntryLoader handles the initial loading, so we just skip any "flash" of loading state
  if (roleLoading || (isAuthenticated && dataLoading)) {
    // Return null to avoid showing a generic loader - AppEntryLoader handles this
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-safe overflow-hidden">
      <PullToRefreshIndicator isRefreshing={isRefreshing} progress={progress} pullDistance={pullDistance} />
      <AppHeader />
      
      {/* RÈGLE NOTIF-01: Bande persistante juste en dessous du header */}
      {isAuthenticated && !isGP && <ActiveReservationBanner />}

      {/* APP-LIKE HOME: 1 écran, pas de scroll, conversion first */}
      {/* Show for guests OR GPs - single screen app-like experience */}
      {(!isAuthenticated || isGP) && (
        <AppLikeHome />
      )}

      {/* Logged-in Client Home - NO SCROLL, app-like */}
      {isAuthenticated && !isGP && (
        <ClientAppHome
          userName={userName}
          recentOrders={recentOrders}
          customRequests={customRequests}
          movingRequests={movingRequests}
          unreadMessages={unreadMessages}
          activeOrdersCount={activeOrdersCount}
          userId={userId || undefined}
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
