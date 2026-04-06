import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { CompareProvider } from "@/components/offers/OfferCompare";
import { ClientAppHome } from "@/components/home/ClientAppHome";

import { useUserRole } from "@/hooks/useUserRole";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";

import { AppEntryLoader } from "@/components/ui/AppEntryLoader";
import { CountrySelectionScreen } from "@/components/entry/CountrySelectionScreen";
import { PhoneVerificationScreen } from "@/components/entry/PhoneVerificationScreen";
import { EntryOnboardingSlides } from "@/components/entry/EntryOnboardingSlides";
import { RoleSelectionScreen } from "@/components/entry/RoleSelectionScreen";

const ENTRY_FLOW_KEY = "konnekt_entry_completed";

type EntryStep = "splash" | "country" | "phone" | "onboarding" | "role" | "done";

interface EntryData {
  country?: { code: string; name: string; flag: string; dialCode: string; currency: string; city?: string };
  phone?: string;
  role?: "client" | "transporteur";
}

function IndexContent() {
  const navigate = useNavigate();
  const { isGP, isAuthenticated, userId, loading: roleLoading } = useUserRole();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [movingRequests, setMovingRequests] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [userCity, setUserCity] = useState<string>("");

  // Entry flow state
  const isFirstVisit = !sessionStorage.getItem("app_loaded");
  const entryCompleted = !!localStorage.getItem(ENTRY_FLOW_KEY);
  
  const [entryStep, setEntryStep] = useState<EntryStep>(() => {
    // If already authenticated, skip entire entry flow
    if (isAuthenticated) return "done";
    if (!isFirstVisit) return "done";
    if (entryCompleted) return "splash"; // Just show splash then done
    return "splash";
  });
  const [entryData, setEntryData] = useState<EntryData>({});

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    if (isAuthenticated && userId) {
      await loadUserData();
    }
  }, [isAuthenticated, userId]);

  const { isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  // When auth state resolves, skip entry flow if already logged in
  useEffect(() => {
    if (!roleLoading && isAuthenticated && entryStep !== "done") {
      sessionStorage.setItem("app_loaded", "true");
      setEntryStep("done");
    }
  }, [roleLoading, isAuthenticated, entryStep]);

  useEffect(() => {
    if (entryStep !== "done") return;
    if (!roleLoading) {
      if (!isAuthenticated) {
        navigate("/auth");
      } else if (isGP) {
        navigate("/gp/apercu");
      } else if (userId) {
        loadUserData();
      } else {
        setDataLoading(false);
      }
    }
  }, [isAuthenticated, userId, roleLoading, entryStep, isGP]);

  const loadUserData = async () => {
    if (!userId) {
      setDataLoading(false);
      return;
    }
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, residence_city")
        .eq("user_id", userId)
        .single();
      
      if (profile?.full_name) setUserName(profile.full_name);
      if (profile?.residence_city) setUserCity(profile.residence_city);

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
        const ordersWithLogistics = orders.map(o => ({
          ...o,
          logistics_options: o.order_logistics_options || null,
          has_internal_logistics: !!(o.order_logistics_options?.pickup_enabled || o.order_logistics_options?.delivery_enabled)
        }));
        setRecentOrders(ordersWithLogistics);
        const active = ordersWithLogistics.filter(o => 
          ['pending', 'accepted', 'collected', 'in_transit'].includes(o.status)
        ).length;
        setActiveOrdersCount(active);
      }

      const { data: customReqs } = await supabase
        .from("custom_requests")
        .select("id, request_number, origin_city, destination_city, status, shipment_type, created_at, transport_type")
        .eq("client_id", userId)
        .neq("shipment_type", "demenagement")
        .in("status", ["open", "pending", "responded", "has_responses"])
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (customReqs) setCustomRequests(customReqs);

      const { data: movingReqs } = await supabase
        .from("custom_requests")
        .select("id, request_number, origin_city, destination_city, status, created_at, volume_estimate")
        .eq("client_id", userId)
        .eq("shipment_type", "demenagement")
        .in("status", ["open", "pending", "reviewing", "quoted", "negotiating", "accepted", "scheduled", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (movingReqs) setMovingRequests(movingReqs);

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

  // ─── Entry Flow Handlers ───
  const handleSplashComplete = () => {
    sessionStorage.setItem("app_loaded", "true");
    if (entryCompleted) {
      setEntryStep("done");
    } else {
      setEntryStep("country");
    }
  };

  const handleCountrySelect = (country: EntryData["country"]) => {
    setEntryData(prev => ({ ...prev, country: country! }));
    sessionStorage.setItem("entry_country", JSON.stringify(country));
    if (country?.city) {
      sessionStorage.setItem("entry_city", country.city);
    }
    setEntryStep("phone");
  };

  const handlePhoneVerified = (phone: string) => {
    setEntryData(prev => ({ ...prev, phone }));
    sessionStorage.setItem("entry_phone", phone);
    setEntryStep("onboarding");
  };

  const handleOnboardingComplete = () => {
    setEntryStep("role");
  };

  const handleRoleSelect = (role: "client" | "transporteur") => {
    setEntryData(prev => ({ ...prev, role }));
    // Mark entry flow as completed
    localStorage.setItem(ENTRY_FLOW_KEY, "true");
    
    // Store entry data for auth page
    sessionStorage.setItem("entry_role", role);
    if (entryData.country) {
      sessionStorage.setItem("entry_country", JSON.stringify(entryData.country));
    }
    if (entryData.phone) {
      sessionStorage.setItem("entry_phone", entryData.phone);
    }
    
    setEntryStep("done");
    
    // Navigate to auth with pre-filled data
    if (role === "transporteur") {
      navigate("/transporteur/inscription");
    } else {
      navigate("/auth?mode=signup");
    }
  };

  // ─── Entry Flow Screens ───
  if (entryStep === "splash" && isFirstVisit) {
    return <AppEntryLoader onComplete={handleSplashComplete} minDuration={1800} />;
  }

  if (entryStep === "country") {
    return (
      <AnimatePresence mode="wait">
        <CountrySelectionScreen onSelect={handleCountrySelect} />
      </AnimatePresence>
    );
  }

  if (entryStep === "phone" && entryData.country) {
    return (
      <AnimatePresence mode="wait">
        <PhoneVerificationScreen
          country={entryData.country}
          onVerified={handlePhoneVerified}
          onBack={() => setEntryStep("country")}
        />
      </AnimatePresence>
    );
  }

  if (entryStep === "onboarding" && entryData.country) {
    return (
      <AnimatePresence mode="wait">
        <EntryOnboardingSlides
          country={entryData.country}
          onComplete={handleOnboardingComplete}
        />
      </AnimatePresence>
    );
  }

  if (entryStep === "role" && entryData.country) {
    return (
      <AnimatePresence mode="wait">
        <RoleSelectionScreen
          country={entryData.country}
          onSelect={handleRoleSelect}
        />
      </AnimatePresence>
    );
  }

  // ─── Main App Content ───
  if (roleLoading || (isAuthenticated && dataLoading)) {
    return null;
  }

  if (!isAuthenticated || isGP) {
    return null;
  }

  return (
    <div className="h-screen bg-background overflow-hidden fixed inset-0 flex flex-col">
      <PullToRefreshIndicator isRefreshing={isRefreshing} progress={progress} pullDistance={pullDistance} />
      <AppHeader />
      
      <ClientAppHome
        userName={userName}
        recentOrders={recentOrders}
        customRequests={customRequests}
        movingRequests={movingRequests}
        unreadMessages={unreadMessages}
        activeOrdersCount={activeOrdersCount}
        userId={userId || undefined}
        userCity={userCity}
      />
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
