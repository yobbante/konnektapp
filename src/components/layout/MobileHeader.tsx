import { Link } from "react-router-dom";
import { Package, Menu } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useUserRole } from "@/hooks/useUserRole";
import { usePageTheme } from "@/hooks/usePageTheme";
import { Button } from "@/components/ui/button";
import { CentralMenuSheet } from "@/components/layout/CentralMenuSheet";
import { HeaderRoleSwitch } from "@/components/layout/HeaderRoleSwitch";
import { TrustLevelBadge, calculateTrustLevel } from "@/components/ui/trust-level-badge";
import { useState } from "react";

interface MobileHeaderProps {
  title?: string;
  showNotifications?: boolean;
}

/**
 * MobileHeader - Unifié avec CentralMenuSheet
 * Plus de menu local dupliqué, utilise le hub central
 */
export function MobileHeader({ title, showNotifications = true }: MobileHeaderProps) {
  const { isAuthenticated, isProfileComplete } = useUserRole();
  const { logoBackground, logoColor } = usePageTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header 
      className="sticky top-0 z-40 bg-card border-b border-border" 
      style={{ 
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        paddingBottom: '12px',
        paddingLeft: 'calc(16px + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(16px + env(safe-area-inset-right, 0px))'
      }}
    >
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl ${logoBackground} flex items-center justify-center transition-colors`}>
            <Package className={`w-5 h-5 ${logoColor}`} />
          </div>
          {title ? (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{title}</span>
              {isAuthenticated && (
                <TrustLevelBadge 
                  level={calculateTrustLevel({ profileCompletion: isProfileComplete ? 100 : 50 })} 
                  size="sm" 
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="font-bold text-foreground leading-tight tracking-tight">Konnekt</span>
              <span className="text-xs font-semibold text-primary -mt-0.5">Transport</span>
            </div>
          )}
        </Link>

        <div className="flex items-center gap-2">
          {/* Role Switch - Subtle in header */}
          <HeaderRoleSwitch />
          
          {showNotifications && <NotificationBell />}

          {/* Central Menu - Unified */}
          <CentralMenuSheet open={menuOpen} onOpenChange={setMenuOpen}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Menu className="w-5 h-5" />
            </Button>
          </CentralMenuSheet>
        </div>
      </div>
    </header>
  );
}
