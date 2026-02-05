import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Send, MessageCircle, User, BarChart3, Package, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useRef, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * MobileNav V2 - Navigation bottom bar simplifiée
 * 5 items max: Accueil, Offres, Envoyer (CTA), Messages, Profil
 * Profil remplace Menu pour un accès direct au compte
 */
export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const lastHomeClickRef = useRef<number>(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'client' | 'transporter' | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session?.user?.id) {
        // Check if user is a transporter (has gp_profile)
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
        // Re-check role on auth change
        supabase
          .from("gp_profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            setUserRole(data ? 'transporter' : 'client');
          });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Determine "Espace" destination based on user role
  const getEspaceHref = () => {
    if (!isAuthenticated) return "/auth";
    if (userRole === 'transporter') return "/gp/demandes"; // Dashboard transporteur
    return "/profil"; // Dashboard client (profil)
  };

  // Nav items - V3: "Espace" intelligent remplace Compte/Profil
  const navItems = [
    { href: "/", icon: Home, label: "Accueil", isHome: true },
    { href: "/offres", icon: Search, label: "Offres" },
    { href: "/envoyer", icon: Send, label: "Envoyer", isCTA: true, requiresAuth: true },
    { href: "/messages", icon: MessageCircle, label: "Messages", showBadge: true, requiresAuth: true },
    { href: getEspaceHref(), icon: LayoutGrid, label: "Espace", isEspace: true },
  ];

  const handleNavClick = useCallback((e: React.MouseEvent, item: typeof navItems[0] & { isEspace?: boolean }) => {
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
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden" 
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}
    >
      <div 
        className="flex items-center justify-around h-16" 
        style={{ paddingLeft: 'var(--safe-left, 0px)', paddingRight: 'var(--safe-right, 0px)' }}
      >
        {navItems.map((item) => {
          const isEspaceActive = 'isEspace' in item && item.isEspace && 
            ["/profil", "/settings", "/client/dashboard", "/gp/demandes", "/gp/tarification", "/gp/historique"].includes(location.pathname);
          const isActive = location.pathname === item.href || 
            (item.href === "/" && location.pathname === "/") ||
            isEspaceActive;

          // CTA button (Envoyer) - special styling
          if ('isCTA' in item && item.isCTA) {
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={(e) => handleNavClick(e, item as any)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative"
              >
                <motion.div 
                  className="w-12 h-12 -mt-4 rounded-full bg-primary shadow-lg flex items-center justify-center"
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <item.icon className="w-6 h-6 text-primary-foreground" />
                </motion.div>
                <span className="text-[10px] font-medium text-primary">{item.label}</span>
              </Link>
            );
          }

          // "Espace" button - special colored styling
          if ('isEspace' in item && item.isEspace) {
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={(e) => handleNavClick(e, item as any)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <motion.div 
                  className="relative"
                  whileTap={{ scale: 0.85 }}
                  animate={isActive ? { y: -2 } : { y: 0 }}
                >
                  <motion.div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "bg-gradient-to-br from-primary/20 to-accent/20 text-primary"
                    )}
                    animate={isActive ? { scale: 1.05 } : { scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <item.icon className="w-5 h-5" />
                  </motion.div>
                </motion.div>
                <motion.span 
                  className={cn(
                    "text-[10px] font-semibold",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  animate={isActive ? { fontWeight: 700 } : { fontWeight: 600 }}
                >
                  {item.label}
                </motion.span>
              </Link>
            );
          }

          // Standard nav items
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
              <motion.div 
                className="relative"
                whileTap={{ scale: 0.85 }}
                animate={isActive ? { y: -2 } : { y: 0 }}
              >
                <motion.div
                  animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                </motion.div>
                {'showBadge' in item && item.showBadge && unreadCount > 0 && (
                  <motion.span 
                    className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </motion.div>
              <motion.span 
                className={cn("text-[10px] font-medium", isActive && "text-primary")}
                animate={isActive ? { fontWeight: 600 } : { fontWeight: 500 }}
              >
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
