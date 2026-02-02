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

  // Show loading state to prevent flash of wrong content
  if (roleLoading || (isAuthenticated && dataLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
