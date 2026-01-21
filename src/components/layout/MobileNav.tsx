import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Send, MessageCircle, User, BarChart3, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useRef, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const lastHomeClickRef = useRef<number>(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  const navItems = [
    { href: "/", icon: Home, label: "Accueil", isHome: true, requiresAuth: false },
    { href: "/offres", icon: Search, label: "Offres", requiresAuth: false },
    { href: "/demande", icon: Send, label: "Envoyer", requiresAuth: true },
    { href: "/messages", icon: MessageCircle, label: "Messages", showBadge: true, requiresAuth: true },
    { href: "/client/dashboard", icon: User, label: "Profil", requiresAuth: true },
  ];

  // Filter items based on auth status
  const visibleItems = navItems.filter(item => !item.requiresAuth || isAuthenticated);

  const handleNavClick = useCallback((e: React.MouseEvent, href: string, isHome?: boolean, requiresAuth?: boolean) => {
    // If requires auth and not authenticated, redirect to auth
    if (requiresAuth && !isAuthenticated) {
      e.preventDefault();
      navigate("/auth");
      return;
    }

    if (isHome) {
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex items-center justify-around h-16" style={{ paddingLeft: 'var(--safe-left, 0px)', paddingRight: 'var(--safe-right, 0px)' }}>
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href === "/client/dashboard" && location.pathname === "/profil");
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={(e) => handleNavClick(e, item.href, item.isHome, item.requiresAuth)}
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
      
      {/* Indicateur d'inscription pour visiteurs non connectés - Design subtil en bas */}
      {!isAuthenticated && (
        <div 
          className="fixed left-0 right-0 z-40 md:hidden px-4 pointer-events-none"
          style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 8px)' }}
        >
          <Link to="/auth" className="pointer-events-auto">
            <div className="bg-primary/95 backdrop-blur-sm rounded-full py-2 px-4 shadow-md border border-primary/30 max-w-[280px] mx-auto">
              <div className="flex items-center justify-center gap-2 text-primary-foreground">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Rejoignez Yobbanté</span>
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">→</span>
              </div>
            </div>
          </Link>
        </div>
      )}
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
