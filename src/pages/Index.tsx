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

      // Load recent orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, origin_city, destination_city, weight, status, order_number, total_price, currency, pickup_date, destination_country, origin_country")
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
          userName={userName}
          recentOrders={recentOrders}
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
