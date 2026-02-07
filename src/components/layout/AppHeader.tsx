import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Menu, ChevronLeft, LogIn, ScanLine } from "lucide-react";
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

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (profile?.full_name) setUserName(profile.full_name);
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
        paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
        paddingBottom: '8px',
        paddingLeft: 'calc(12px + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(12px + env(safe-area-inset-right, 0px))'
      }}
    >
      <div className="flex items-center justify-between h-12">
        {/* Left Side */}
        <div className="flex items-center gap-2">
          {showBack ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="rounded-full w-9 h-9"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Link to="/" className="flex items-center gap-2">
              <motion.div 
                whileTap={{ scale: 0.95 }}
                className={`w-9 h-9 rounded-xl ${logoBackground} flex items-center justify-center shadow-sm`}
              >
                <Package className={`w-5 h-5 ${logoColor}`} />
              </motion.div>
            </Link>
          )}
          
          {/* Title or Logo Text */}
          <AnimatePresence mode="wait">
            {title ? (
              <motion.h1
                key="title"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="font-semibold text-foreground text-base truncate max-w-[180px]"
              >
                {title}
              </motion.h1>
            ) : !showBack && (
              <motion.div
                key="logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col leading-none"
              >
                <span className="font-bold text-foreground text-sm tracking-tight">Konnekt</span>
                <span className="text-[10px] font-semibold text-primary">Transport</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-1.5">
          {/* Interactive QR Badge — Client identity */}
          {isAuthenticated && userId && (
            <HeaderQRBadge
              qrValue={`${window.location.origin}/track/user/${userId}`}
              label={userName}
              subLabel="Client Konnekt"
              variant="client"
            />
          )}

          {/* Desktop Scan Button — Sticky top-right CTA */}
          {isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hidden md:block"
            >
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(location.pathname.startsWith("/gp") ? "/gp/scan" : "/tracking")}
                className="rounded-full h-8 px-3 gap-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Scan</span>
              </Button>
            </motion.div>
          )}
          
          {/* Login Button for non-authenticated users */}
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/auth")}
                className="rounded-full h-8 px-3 gap-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Connexion</span>
              </Button>
            </motion.div>
          )}
          
          {/* Role Switch */}
          <HeaderRoleSwitch />
          
          {rightAction}
          
          {showNotifications && isAuthenticated && (
            <NotificationBell />
          )}
          
          <CentralMenuSheet open={menuOpen} onOpenChange={setMenuOpen}>
            <Button variant="ghost" size="icon" className="rounded-full w-9 h-9">
              <Menu className="w-5 h-5" />
            </Button>
          </CentralMenuSheet>
        </div>
      </div>
    </motion.header>
  );
}
