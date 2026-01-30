import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Send, MessageCircle, Menu, BarChart3, Package, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useRef, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CentralMenuSheet } from "./CentralMenuSheet";

/**
 * MobileNav V1 - Navigation bottom bar simplifiée
 * 5 items max: Accueil, Offres, Envoyer (CTA), Messages, Menu
 * Conforme aux principes UX V1
 */
export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const lastHomeClickRef = useRef<number>(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Nav items - V1 Simplifié: 5 items max
  // "Envoyer" CTA now goes to universal type selector
  const navItems = [
    { href: "/", icon: Home, label: "Accueil", isHome: true },
    { href: "/offres", icon: Search, label: "Offres" },
    { href: "/envoyer", icon: Send, label: "Envoyer", isCTA: true, requiresAuth: true },
    { href: "/messages", icon: MessageCircle, label: "Messages", showBadge: true, requiresAuth: true },
    { href: "#menu", icon: Menu, label: "Menu", isMenu: true },
  ];

  const handleNavClick = useCallback((e: React.MouseEvent, item: typeof navItems[0]) => {
    // Handle Menu item - opens sheet
    if (item.isMenu) {
      e.preventDefault();
      setMenuOpen(true);
      return;
    }

    // If requires auth and not authenticated, redirect to auth with return path
    if (item.requiresAuth && !isAuthenticated) {
      e.preventDefault();
      // Save return path for post-auth redirect
      sessionStorage.setItem("pending_booking_state", JSON.stringify({
        returnPath: item.href,
        timestamp: Date.now(),
      }));
      navigate("/auth");
      return;
    }

    // Handle Home double-tap refresh
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

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden" 
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}
      >
        <div 
          className="flex items-center justify-around h-16" 
          style={{ paddingLeft: 'var(--safe-left, 0px)', paddingRight: 'var(--safe-right, 0px)' }}
        >
          {navItems.map((item) => {
            const isActive = item.href !== "#menu" && (
              location.pathname === item.href || 
              (item.href === "/" && location.pathname === "/")
            );
            
            // Menu button is wrapped in CentralMenuSheet
            if (item.isMenu) {
              return (
                <CentralMenuSheet 
                  key="menu" 
                  open={menuOpen} 
                  onOpenChange={setMenuOpen}
                >
                  <button
                    className={cn(
                      "flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors relative"
                    )}
                  >
                    <div className="relative">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                </CentralMenuSheet>
              );
            }

            // CTA button (Envoyer) - special styling
            if (item.isCTA) {
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={(e) => handleNavClick(e, item)}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative"
                >
                  <div className="w-12 h-12 -mt-4 rounded-full bg-primary shadow-lg flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className="text-[10px] font-medium text-primary">{item.label}</span>
                </Link>
              );
            }

            // Standard nav items
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors relative",
                  isActive && "text-primary"
                )}
              >
                <div className="relative">
                  <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                  {item.showBadge && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* Indicateur d'inscription - masqué en mode app-like (les CTAs sont dans AppLikeHome) */}
    </>
  );
}

// Transporteur specific bottom nav - Profile opens TransporterProfile page directly
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
            <button
              key={item.tab}
              onClick={() => handleTabClick(item)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground transition-colors",
                isActive && "text-primary"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
