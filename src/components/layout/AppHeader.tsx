import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, ChevronLeft, LogIn, ScanLine, Wallet, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useUserRole } from "@/hooks/useUserRole";
import { usePageTheme } from "@/hooks/usePageTheme";
import { CentralMenuSheet } from "@/components/layout/CentralMenuSheet";
import { HeaderRoleSwitch } from "@/components/layout/HeaderRoleSwitch";
import { HeaderQRBadge } from "@/components/ui/HeaderQRBadge";
import { ClientScanSheet } from "@/components/scan/ClientScanSheet";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
  const [scanOpen, setScanOpen] = useState(false);

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
    <>
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
                  <Package className={`w-5 h-5 ${logoColor}`} />
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

            {/* Combined Scan + QR button */}
            {isAuthenticated && (
              <div className="relative flex items-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setScanOpen(true)}
                  className={cn(
                    "flex items-center gap-1.5 h-8 pl-2.5 pr-1 rounded-l-full transition-all",
                    "bg-primary/10 hover:bg-primary/20 border border-r-0 border-primary/20"
                  )}
                  title="Scanner"
                >
                  <ScanLine className="w-4 h-4 text-primary" />
                </motion.button>
                <div className="relative">
                  <HeaderQRBadge
                    userId={userId || undefined}
                    label={userName}
                    subLabel="Client Konnekt"
                    variant="client"
                    className="!rounded-l-none !rounded-r-full border border-primary/20 bg-primary/10 hover:bg-primary/20 !w-auto h-8 px-2"
                  />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
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

      {/* Scan Sheet */}
      <ClientScanSheet open={scanOpen} onOpenChange={setScanOpen} />
    </>
  );
}
