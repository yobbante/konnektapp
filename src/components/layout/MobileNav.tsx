import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, MessageCircle, CalendarCheck, Menu, Send } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { useRef, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClientScanSheet } from "@/components/scan/ClientScanSheet";
import { CentralMenuSheet } from "@/components/layout/CentralMenuSheet";
import { MissionRequestSheet } from "@/components/missions/MissionRequestSheet";

/**
 * MobileNav V6 — Konnekt
 * 5 items: Accueil, Offres, MISSION (center, circle), Réservations, Menu
 */
export function MobileNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const lastHomeClickRef = useRef<number>(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'client' | 'transporter' | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session?.user?.id) {
        const { data: gpProfile } = await supabase
          .from("gp_profiles")
          .select("id, gp_type")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        setUserRole(gpProfile ? 'transporter' : 'client');
      } else {
        setUserRole(null);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        setUserRole(null);
      } else if (session?.user?.id) {
        supabase
          .from("gp_profiles")
          .select("id, gp_type")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data }) => setUserRole(data ? 'transporter' : 'client'));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Import GP_ONLY_MODE
  const gpOnlyMode = true; // Matches src/config/featureFlags.ts GP_ONLY_MODE

  const navItems = [
    { href: "/", icon: Home, label: "Accueil", isHome: true },
    { href: "/reservations", icon: CalendarCheck, label: "Réservations", requiresAuth: true },
    // Hide Mission button in GP_ONLY_MODE (it's for routier/maritime/aerien)
    ...(!gpOnlyMode ? [{ href: "#mission", icon: Send, label: "Mission", isMission: true }] : []),
    { href: "/messages", icon: MessageCircle, label: "Messages", isMessages: true },
    { href: "#menu", icon: Menu, label: "Menu", isMenu: true },
  ];

  const handleNavClick = useCallback((e: React.MouseEvent, item: typeof navItems[0]) => {
    // Menu button - open central menu sheet
    if ('isMenu' in item && item.isMenu) {
      e.preventDefault();
      setMenuOpen(true);
      return;
    }

    // Mission button - open mission request sheet
    if ('isMission' in item && item.isMission) {
      e.preventDefault();
      setMissionOpen(true);
      return;
    }

    // Messages button - navigate to messaging
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
  }, [location.pathname, isAuthenticated, navigate]);

  // Hide footer nav until user is authenticated
  if (!isAuthenticated) return null;

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 md:hidden" 
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}
      >
        <div 
          className="flex items-center justify-around h-16" 
          style={{ paddingLeft: 'var(--safe-left, 0px)', paddingRight: 'var(--safe-right, 0px)' }}
        >
          {navItems.map((item) => {
            const isMenuActive = 'isMenu' in item && item.isMenu && menuOpen;
            const isMissionActive = 'isMission' in item && item.isMission && missionOpen;
            const isActive = location.pathname === item.href || 
              (item.href === "/" && location.pathname === "/") ||
              isMenuActive || isMissionActive;

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

      {/* Client Scan Sheet - instant camera */}
      <ClientScanSheet open={scanOpen} onOpenChange={setScanOpen} />

      {/* Mission Request Sheet */}
      <MissionRequestSheet open={missionOpen} onOpenChange={setMissionOpen} />
      
      {/* Central Menu Sheet */}
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
