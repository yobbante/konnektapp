import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Menu, Bell, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useUserRole } from "@/hooks/useUserRole";
import { usePageTheme } from "@/hooks/usePageTheme";
import { CentralMenuSheet } from "@/components/layout/CentralMenuSheet";
import { HeaderRoleSwitch } from "@/components/layout/HeaderRoleSwitch";
import { useState } from "react";

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
                <span className="font-bold text-foreground text-sm">Yobbanté</span>
                <span className="text-[10px] font-semibold text-primary">Connect</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-1.5">
          {/* Role Switch - Subtle in header */}
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
