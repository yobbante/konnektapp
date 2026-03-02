import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, ChevronLeft, LogIn, ScanLine, Wallet, Package } from "lucide-react";
import { KonnektLogo } from "@/components/ui/KonnektLogo";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useUserRole } from "@/hooks/useUserRole";
import { usePageTheme } from "@/hooks/usePageTheme";
import { CentralMenuSheet } from "@/components/layout/CentralMenuSheet";
import { HeaderRoleSwitch } from "@/components/layout/HeaderRoleSwitch";
import { HeaderQRBadge } from "@/components/ui/HeaderQRBadge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showNotifications?: boolean;
  variant?: "default" | "transparent" | "solid";
  rightAction?: React.ReactNode;
}

export function AppHeader({ 
  title, 
  showBack = false,
  showNotifications = true,
  variant = "default",
  rightAction
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useUserRole();
  const { logoBackground, logoColor } = usePageTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Mon profil");
  const [countryFlag, setCountryFlag] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, country_code")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (profile?.full_name) setUserName(profile.full_name);
        // Try to get flag from session storage or profile
        const entryCountry = sessionStorage.getItem("entry_country");
        if (entryCountry) {
          try { setCountryFlag(JSON.parse(entryCountry).flag || ""); } catch {}
        }
      }
    };
    fetchUser();
  }, []);

  const isHome = location.pathname === "/";

  const headerStyles = {
    default: "bg-card/95 backdrop-blur-md border-b border-border/50",
    transparent: "bg-transparent",
    solid: "bg-card border-b border-border",
  };

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`sticky top-0 z-40 ${headerStyles[variant]}`}
      style={{ 
        paddingTop: 'calc(6px + env(safe-area-inset-top, 0px))',
        paddingBottom: '6px',
        paddingLeft: 'calc(12px + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(12px + env(safe-area-inset-right, 0px))'
      }}
    >
      <div className="flex items-center justify-between h-10">
        {/* Left Side — Logo or Back */}
        <div className="flex items-center gap-2">
          {showBack ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="rounded-full w-8 h-8"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Link to="/" className="flex items-center gap-1.5">
              <motion.div 
                whileTap={{ scale: 0.95 }}
                className={`w-8 h-8 rounded-lg ${logoBackground} flex items-center justify-center shadow-sm`}
              >
                <KonnektLogo size={20} color={logoColor === "text-white" ? "white" : "hsl(168, 60%, 42%)"} />
              </motion.div>
              {!title && (
                <div className="flex items-center gap-1">
                  <span className="font-bold text-foreground text-sm tracking-tight">Konnekt</span>
                  {countryFlag && <span className="text-xs">{countryFlag}</span>}
                </div>
              )}
            </Link>
          )}
          
          {title && (
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-semibold text-foreground text-sm truncate max-w-[160px]"
            >
              {title}
            </motion.h1>
          )}
        </div>

        {/* Right Side — Compact action cluster */}
        <div className="flex items-center gap-1">
          {/* Wallet shortcut */}
          {isAuthenticated && isHome && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/wallet")}
              className="rounded-full w-8 h-8"
            >
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}

          {/* Colis shortcut */}
          {isAuthenticated && isHome && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/mes-colis")}
              className="rounded-full w-8 h-8"
            >
              <Package className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}

          {/* QR Badge */}
          {isAuthenticated && userId && (
            <HeaderQRBadge
              userId={userId}
              label={userName}
              subLabel="Client Konnekt"
              variant="client"
            />
          )}

          {/* Scan — desktop */}
          {isAuthenticated && (
            <div className="hidden md:block">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(location.pathname.startsWith("/gp") ? "/gp/scan" : "/tracking")}
                className="rounded-full w-8 h-8"
              >
                <ScanLine className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          )}
          
          {/* Login */}
          {!isAuthenticated && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/auth")}
              className="rounded-full h-8 px-3 gap-1.5 text-xs font-medium bg-primary/10 text-primary"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Connexion</span>
            </Button>
          )}
          
          <HeaderRoleSwitch />
          {rightAction}
          
          {showNotifications && isAuthenticated && <NotificationBell />}
          
          <CentralMenuSheet open={menuOpen} onOpenChange={setMenuOpen}>
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8">
              <Menu className="w-4 h-4" />
            </Button>
          </CentralMenuSheet>
        </div>
      </div>
    </motion.header>
  );
}
