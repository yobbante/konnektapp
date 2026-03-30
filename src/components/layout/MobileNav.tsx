import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, MessageCircle, CalendarCheck, Menu, Send, Luggage } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { useRef, useCallback, useEffect, useState } from "react";
import { useKeyboardViewport } from "@/hooks/useKeyboardViewport";
import { supabase } from "@/integrations/supabase/client";
import { ClientScanSheet } from "@/components/scan/ClientScanSheet";
import { CentralMenuSheet } from "@/components/layout/CentralMenuSheet";
import { MissionRequestSheet } from "@/components/missions/MissionRequestSheet";
import { VoyageGagneSheet } from "@/components/voyage/VoyageGagneSheet";
import { VoyageDashboard } from "@/components/voyage/VoyageDashboard";
import { GP_ONLY_MODE } from "@/config/featureFlags";

let mobileNavAuthCache: {
  initialized: boolean;
  isAuthenticated: boolean;
  userRole: 'client' | 'transporter' | null;
} = {
  initialized: false,
  isAuthenticated: false,
  userRole: null,
};

/**
 * MobileNav V7 — Konnekt
 * 5 items: Accueil, Réservations, VOYAGE & GAGNE (center), Messages, Menu
 */
export function MobileNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isKeyboardOpen } = useKeyboardViewport();
  
  const lastHomeClickRef = useRef<number>(0);
  const [isAuthenticated, setIsAuthenticated] = useState(mobileNavAuthCache.isAuthenticated);
  const [authLoading, setAuthLoading] = useState(!mobileNavAuthCache.initialized);
  const [userRole, setUserRole] = useState<'client' | 'transporter' | null>(mobileNavAuthCache.userRole);
  const [scanOpen, setScanOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const [voyageOpen, setVoyageOpen] = useState(false);
  const [voyageDashOpen, setVoyageDashOpen] = useState(false);
  const [hasPublishedTrips, setHasPublishedTrips] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingActions, setPendingActions] = useState(0);

  // Check if user has published trips (occasional GP)
  useEffect(() => {
    const checkTrips = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: gp } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("gp_type", "occasionnel" as any)
        .maybeSingle();
      if (gp) {
        const { count } = await supabase
          .from("gp_offers")
          .select("id", { count: "exact", head: true })
          .eq("gp_id", gp.id);
        setHasPublishedTrips((count || 0) > 0);
      }
    };
    checkTrips();
  }, [voyageOpen]);

  // Fetch notification counts
  useEffect(() => {
    const fetchCounts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      const [{ count: unread }, { count: pendingOrd }] = await Promise.all([
        supabase.from("messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", userId)
          .is("read_at", null),
        supabase.from("orders")
          .select("*", { count: "exact", head: true })
          .eq("client_id", userId)
          .in("status", ["pending", "accepted", "weight_pending_payment"] as any),
      ]);
      setUnreadMessages(unread || 0);
      setPendingActions(pendingOrd || 0);
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    const checkAuth = async () => {
      // Only show loading if cache hasn't been initialized yet
      if (!mobileNavAuthCache.initialized) {
        setAuthLoading(true);
      }
      const { data: { session } } = await supabase.auth.getSession();
      const authenticated = !!session;
      setIsAuthenticated(authenticated);
      mobileNavAuthCache = {
        ...mobileNavAuthCache,
        initialized: true,
        isAuthenticated: authenticated,
      };
      setAuthLoading(false);
      
      if (session?.user?.id) {
        const { data: gpProfile } = await supabase
          .from("gp_profiles")
          .select("id, gp_type")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        // Occasional GPs are treated as clients in nav
        const nextRole = gpProfile && gpProfile.gp_type !== 'occasionnel' ? 'transporter' : 'client';
        setUserRole(nextRole);
        mobileNavAuthCache = {
          ...mobileNavAuthCache,
          userRole: nextRole,
        };
      } else {
        setUserRole(null);
        mobileNavAuthCache = {
          initialized: true,
          isAuthenticated: false,
          userRole: null,
        };
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const authenticated = !!session;
      setIsAuthenticated(authenticated);
      setAuthLoading(false);
      mobileNavAuthCache = {
        ...mobileNavAuthCache,
        initialized: true,
        isAuthenticated: authenticated,
      };

      if (event === 'SIGNED_IN') {
        if (session?.user?.id) {
          const { data } = await supabase
            .from("gp_profiles")
            .select("id, gp_type")
            .eq("user_id", session.user.id)
            .maybeSingle();
          const nextRole = data && data.gp_type !== 'occasionnel' ? 'transporter' : 'client';
          setUserRole(nextRole);
          mobileNavAuthCache = {
            ...mobileNavAuthCache,
            userRole: nextRole,
          };
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUserRole(null);
        mobileNavAuthCache = {
          initialized: true,
          isAuthenticated: false,
          userRole: null,
        };
      } else {
        if (!session) {
          setUserRole(null);
          mobileNavAuthCache = {
            initialized: true,
            isAuthenticated: false,
            userRole: null,
          };
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const navItems = [
    { href: "/", icon: Home, label: "Accueil", isHome: true },
    { href: "/reservations", icon: CalendarCheck, label: "Réservations", requiresAuth: true },
    // Central CTA: "Voyage & Gagne" in GP_ONLY_MODE, else Mission
    ...(GP_ONLY_MODE 
      ? [{ href: "#voyage", icon: Luggage, label: "Voyage", isVoyage: true }]
      : [{ href: "#mission", icon: Send, label: "Mission", isMission: true }]
    ),
    { href: "/messages", icon: MessageCircle, label: "Messages", isMessages: true },
    { href: "#menu", icon: Menu, label: "Menu", isMenu: true },
  ];

  const handleNavClick = useCallback((e: React.MouseEvent, item: typeof navItems[0]) => {
    if ('isMenu' in item && item.isMenu) {
      e.preventDefault();
      setMenuOpen(true);
      return;
    }

    if ('isMission' in item && item.isMission) {
      e.preventDefault();
      setMissionOpen(true);
      return;
    }

    if ('isVoyage' in item && item.isVoyage) {
      e.preventDefault();
      if (!isAuthenticated) {
        sessionStorage.setItem("pending_booking_state", JSON.stringify({
          returnPath: "/",
          timestamp: Date.now(),
          openVoyage: true,
        }));
        navigate("/auth");
        return;
      }
      // If user has published trips, show dashboard; otherwise show creation flow
      if (hasPublishedTrips) {
        setVoyageDashOpen(true);
      } else {
        setVoyageOpen(true);
      }
      return;
    }

    if ('isMessages' in item && item.isMessages) {
      e.preventDefault();
      navigate("/messages");
      return;
    }

    if ('requiresAuth' in item && item.requiresAuth && !isAuthenticated) {
      e.preventDefault();
      sessionStorage.setItem("pending_booking_state", JSON.stringify({
        returnPath: item.href,
        timestamp: Date.now(),
      }));
      navigate("/auth");
      return;
    }

    if (item.isHome) {
      const now = Date.now();
      const isDoubleTap = now - lastHomeClickRef.current < 500;
      
      if (location.pathname === "/" && isDoubleTap) {
        e.preventDefault();
        window.location.reload();
      } else if (location.pathname === "/") {
        e.preventDefault();
        lastHomeClickRef.current = now;
      } else {
        lastHomeClickRef.current = now;
      }
    }
  }, [location.pathname, isAuthenticated, navigate, hasPublishedTrips]);

  // Prevent rendering if auth state is unstable
  if (!isAuthenticated || isKeyboardOpen || authLoading) return null;
  
  // Safety: hide on auth page
  if (location.pathname === "/auth") return null;

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 md:hidden" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div 
          className="flex items-center justify-around h-16" 
          style={{ paddingLeft: 'var(--safe-left, 0px)', paddingRight: 'var(--safe-right, 0px)' }}
        >
          {navItems.map((item) => {
            const isMenuActive = 'isMenu' in item && item.isMenu && menuOpen;
            const isMissionActive = 'isMission' in item && item.isMission && missionOpen;
            const isVoyageActive = 'isVoyage' in item && item.isVoyage && voyageOpen;
            const isActive = location.pathname === item.href || 
              (item.href === "/" && location.pathname === "/") ||
              isMenuActive || isMissionActive || isVoyageActive;

            // ─── VOYAGE & GAGNE BUTTON (center, circle) ───
            if ('isVoyage' in item && item.isVoyage) {
              return (
                <button
                  key="voyage"
                  onClick={(e) => handleNavClick(e as any, item as any)}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors relative"
                >
                  <motion.div 
                    className={cn(
                      "w-12 h-12 -mt-5 rounded-full flex items-center justify-center shadow-lg relative",
                      voyageOpen
                        ? "bg-amber-500"
                        : "bg-gradient-to-br from-amber-400 to-orange-500"
                    )}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Luggage className="w-5 h-5 text-white" />
                    {!voyageOpen && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-amber-400/30"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </motion.div>
                  <span className={cn(
                    "text-[10px] font-semibold",
                    voyageOpen ? "text-amber-500" : "text-muted-foreground"
                  )}>
                    Voyage
                  </span>
                </button>
              );
            }

            // ─── MISSION BUTTON (center, circle) ───
            if ('isMission' in item && item.isMission) {
              return (
                <button
                  key="mission"
                  onClick={(e) => handleNavClick(e as any, item as any)}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors relative"
                >
                  <motion.div 
                    className={cn(
                      "w-12 h-12 -mt-5 rounded-full flex items-center justify-center shadow-lg relative",
                      missionOpen
                        ? "bg-primary"
                        : "bg-gradient-to-br from-primary to-accent"
                    )}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Send className="w-5 h-5 text-primary-foreground" />
                    {!missionOpen && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-primary/30"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </motion.div>
                  <span className={cn(
                    "text-[10px] font-semibold",
                    missionOpen ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            }

            // ─── MENU BUTTON ───
            if ('isMenu' in item && item.isMenu) {
              return (
                <button
                  key="menu"
                  onClick={(e) => handleNavClick(e as any, item as any)}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <motion.div className="relative" whileTap={{ scale: 0.85 }}>
                    <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                  </motion.div>
                  <span className={cn("text-[10px] font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
                    {item.label}
                  </span>
                </button>
              );
            }

            // ─── STANDARD NAV ITEMS ───
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={(e) => handleNavClick(e, item as any)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors relative",
                  isActive && "text-primary"
                )}
              >
                <motion.div className="relative" whileTap={{ scale: 0.85 }} animate={isActive ? { y: -2 } : { y: 0 }}>
                  <motion.div animate={isActive ? { scale: 1.1 } : { scale: 1 }} transition={{ type: "spring", stiffness: 500 }}>
                    <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                  </motion.div>
                  {/* Red notification dot */}
                  {(('isMessages' in item && item.isMessages && unreadMessages > 0) ||
                    (item.href === "/reservations" && pendingActions > 0)) && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </motion.div>
                <motion.span className={cn("text-[10px] font-medium", isActive && "text-primary")} animate={isActive ? { fontWeight: 600 } : { fontWeight: 500 }}>
                  {item.label}
                </motion.span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <ClientScanSheet open={scanOpen} onOpenChange={setScanOpen} />
      <MissionRequestSheet open={missionOpen} onOpenChange={setMissionOpen} />
      <VoyageGagneSheet open={voyageOpen} onOpenChange={(v) => { setVoyageOpen(v); if (!v) setHasPublishedTrips(true); }} skipIntro={hasPublishedTrips} />
      <VoyageDashboard 
        open={voyageDashOpen} 
        onOpenChange={setVoyageDashOpen} 
        onNewTrip={() => { setVoyageDashOpen(false); setTimeout(() => setVoyageOpen(true), 300); }}
      />
      <CentralMenuSheet open={menuOpen} onOpenChange={setMenuOpen}>
        <span />
      </CentralMenuSheet>
    </>
  );
}

// ─── GP Mobile Nav (unchanged) ───
import { BarChart3, Package, User, Search } from "lucide-react";

const gpNavItems = [
  { icon: Home, label: "Accueil", tab: "overview" },
  { icon: Package, label: "Offres", tab: "offers" },
  { icon: Search, label: "Missions", tab: "orders" },
  { icon: BarChart3, label: "Stats", tab: "stats" },
  { icon: User, label: "Profil", tab: "profile", navigateTo: "/transporter/profile" },
];

interface GPMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function GPMobileNav({ activeTab, onTabChange }: GPMobileNavProps) {
  const navigate = useNavigate();
  
  const handleTabClick = (item: typeof gpNavItems[0]) => {
    if (item.navigateTo) {
      navigate(item.navigateTo);
    } else {
      onTabChange(item.tab);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}>
      <div className="flex items-center justify-around h-16" style={{ paddingLeft: 'var(--safe-left, 0px)', paddingRight: 'var(--safe-right, 0px)' }}>
        {gpNavItems.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <motion.button
              key={item.tab}
              onClick={() => handleTabClick(item)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors",
                isActive && "text-primary"
              )}
            >
              <motion.div
                animate={isActive ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              </motion.div>
              <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="gp-nav-indicator"
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
