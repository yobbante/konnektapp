import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Package, Bell, Menu, ScanLine, Truck,
  Lock, Home, ListChecks, LayoutGrid,
  Shield, DollarSign, History, Calendar, Wallet,
  Settings, LogOut, MapPin, User, Plus,
  MessageCircle, UserCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { GPNotificationsDropdown } from "@/components/gp/dashboard/GPNotificationsDropdown";
import { GPKYCBadge, getGPDisplayStatus } from "@/components/gp/GPKYCBadge";
import { cn } from "@/lib/utils";
import { useEnforceDashboardRole } from "@/hooks/useSmartRedirect";
import { supabase } from "@/integrations/supabase/client";

interface GPDashboardLayoutProps {
  children: ReactNode;
  gpProfile: {
    id: string;
    business_name: string;
    gp_type: string;
    status: string;
    kyc_level?: number;
  };
  pendingCount?: number;
  activeOrdersCount?: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNewVoyage?: () => void;
}

/**
 * GP Dashboard Layout V1 TERRAIN
 * 
 * Header: Logo + [+] Nouveau voyage + SCAN central + Notifications
 * Bottom Nav: Aujourd'hui | Colis | [SCAN] | Distribution | Menu
 */
export function GPDashboardLayout({
  children,
  gpProfile,
  pendingCount = 0,
  activeOrdersCount = 0,
  activeTab = "aujourdhui",
  onNewVoyage,
}: GPDashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const kycLevel = gpProfile.kyc_level ?? 0;
  const displayStatus = getGPDisplayStatus(gpProfile.status, kycLevel);
  const isVerified = gpProfile.status === "verified" || gpProfile.status === "premium" || gpProfile.status === "starter";
  useEnforceDashboardRole("gp");

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes("/gp/colis")) return "colis";
    if (path.includes("/gp/wallet")) return "wallet";
    if (path.includes("/gp/scan")) return "scan";
    if (path.includes("/gp/profil-public") || path.includes("/gp/parametres")) return "profil";
    if (path.includes("/gp/distribution")) return "distribution";
    if (path.includes("/gp/messages")) return "messages";
    if (path.includes("/gp/apercu") || path.includes("/gp/demandes") || path.includes("/gp/en-cours")) return "apercu";
    return "apercu";
  };

  const currentTab = getActiveTab();
  const totalBadge = pendingCount + activeOrdersCount;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ══════════════════════════════════════
          HEADER — Fixed, scan-centric + bouton +
      ══════════════════════════════════════ */}
      <header 
        className="sticky top-0 z-50 bg-primary shadow-lg"
        style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}
      >
        <div className="px-3 py-3 flex items-center justify-between gap-2">
          {/* Logo + Name */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-xs leading-tight truncate max-w-[100px]">
                {gpProfile.business_name}
              </p>
              <GPKYCBadge status={displayStatus} kycLevel={kycLevel} size="sm" />
            </div>
          </div>

          {/* Center actions: + and SCAN */}
          <div className="flex items-center gap-2">
            {/* + Nouveau voyage */}
            {isVerified && (
              <Button
                onClick={() => onNewVoyage?.()}
                size="icon"
                className="h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                <Plus className="w-5 h-5" />
              </Button>
            )}

            {/* SCAN BUTTON */}
            <Button
              onClick={() => {
                if (!isVerified) return;
                navigate("/gp/scan");
              }}
              disabled={!isVerified}
              className={cn(
                "h-10 px-4 rounded-full font-bold text-sm gap-1.5 shadow-lg",
                isVerified 
                  ? "bg-white text-primary hover:bg-white/90 active:scale-95 transition-all" 
                  : "bg-white/20 text-white/50 cursor-not-allowed"
              )}
            >
              <ScanLine className="w-5 h-5" />
              SCAN
            </Button>
          </div>

          {/* Right: Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-white hover:bg-white/10 w-9 h-9 flex-shrink-0"
            onClick={() => setShowNotifications(true)}
          >
            <Bell className="w-5 h-5" />
            {totalBadge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalBadge > 9 ? "9+" : totalBadge}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* ══════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════ */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* ══════════════════════════════════════
          BOTTOM NAV — 5 tabs, SCAN central
      ══════════════════════════════════════ */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {/* Accueil */}
          <NavItem 
            icon={Home} 
            label="Accueil" 
            active={currentTab === "apercu"}
            onClick={() => navigate("/gp/apercu")}
          />
          
          {/* Colis */}
          <NavItem 
            icon={Package} 
            label="Colis" 
            active={currentTab === "colis"}
            badge={activeOrdersCount}
            locked={!isVerified}
            onClick={() => isVerified && navigate("/gp/colis")}
          />
          
          {/* SCAN — Center, larger */}
          <button
            onClick={() => isVerified && navigate("/gp/scan")}
            disabled={!isVerified}
            className="flex flex-col items-center justify-center flex-1 h-full relative"
          >
            <motion.div
              className={cn(
                "w-14 h-14 -mt-6 rounded-full flex items-center justify-center shadow-xl",
                isVerified ? "bg-primary" : "bg-muted"
              )}
              whileTap={isVerified ? { scale: 0.9 } : undefined}
            >
              {isVerified ? (
                <ScanLine className="w-6 h-6 text-primary-foreground" />
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
            </motion.div>
            {isVerified && (
              <motion.div className="absolute inset-0 flex items-start justify-center" style={{ top: '-6px' }}>
                <motion.div
                  className="w-14 h-14 rounded-full border-2 border-primary/30"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            )}
            <span className={cn("text-[10px] font-bold mt-0.5", currentTab === "scan" ? "text-primary" : "text-muted-foreground")}>
              Scan
            </span>
          </button>

          {/* Wallet */}
          <NavItem 
            icon={Wallet} 
            label="Wallet" 
            active={currentTab === "wallet"}
            locked={!isVerified}
            onClick={() => isVerified && navigate("/gp/wallet")}
          />

          {/* Profil — opens menu sheet */}
          <Sheet open={showMenu} onOpenChange={setShowMenu}>
            <SheetTrigger asChild>
              <button className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5",
                currentTab === "profil" ? "text-primary" : "text-muted-foreground"
              )}>
                <UserCircle className="w-5 h-5" />
                <span className="text-[10px] font-medium">Profil</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
              <SheetHeader className="pb-4">
                <SheetTitle className="text-left">Menu GP</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-3 pb-4">
                <MenuButton icon={MapPin} label="Profil public" onClick={() => { setShowMenu(false); navigate("/gp/profil-public"); }} />
                <MenuButton icon={Package} label="Demandes" badge={pendingCount} locked={!isVerified} onClick={() => { if (isVerified) { setShowMenu(false); navigate("/gp/demandes"); }}} />
                <MenuButton icon={Calendar} label="Départs" locked={!isVerified} onClick={() => { if (isVerified) { setShowMenu(false); navigate("/gp/calendrier"); }}} />
                <MenuButton icon={MessageCircle} label="Messages" onClick={() => { setShowMenu(false); navigate("/gp/messages"); }} />
                <MenuButton icon={DollarSign} label="Tarifs" onClick={() => { setShowMenu(false); navigate("/gp/tarification"); }} />
                <MenuButton icon={ListChecks} label="Distribution" locked={!isVerified} onClick={() => { if (isVerified) { setShowMenu(false); navigate("/gp/distribution"); }}} />
                <MenuButton icon={History} label="Historique" onClick={() => { setShowMenu(false); navigate("/gp/historique"); }} />
                <MenuButton icon={Shield} label="KTP & Geo" onClick={() => { setShowMenu(false); navigate("/gp/ktp-geotrack"); }} />
                <MenuButton icon={Settings} label="Réglages" onClick={() => { setShowMenu(false); navigate("/gp/parametres"); }} />
                <MenuButton icon={LogOut} label="Déconnexion" variant="destructive" onClick={() => { setShowMenu(false); handleSignOut(); }} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Notifications */}
      <GPNotificationsDropdown
        gpProfileId={gpProfile.id}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onViewOrderDetail={(orderId) => navigate(`/gp/order/${orderId}`)}
      />
    </div>
  );
}

/* ─── Bottom Nav Item ─── */
function NavItem({ icon: Icon, label, active, badge, locked, onClick }: {
  icon: any; label: string; active: boolean; badge?: number; locked?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={cn(
        "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors relative",
        locked ? "opacity-40 cursor-not-allowed" : "",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <motion.div
        className="relative"
        whileTap={!locked ? { scale: 0.85 } : undefined}
        animate={active ? { y: -2 } : { y: 0 }}
      >
        {locked ? <Lock className="w-5 h-5" /> : <Icon className={cn("w-5 h-5", active && "text-primary")} />}
        {!!badge && badge > 0 && !locked && (
          <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </motion.div>
      <span className={cn("text-[10px] font-medium", active && "text-primary font-semibold")}>{label}</span>
      {active && (
        <motion.div
          layoutId="gp-v1-nav"
          className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
}

/* ─── Menu Button ─── */
function MenuButton({ icon: Icon, label, badge, locked, variant, onClick }: {
  icon: any; label: string; badge?: number; locked?: boolean; variant?: "destructive"; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={cn(
        "flex flex-col items-center gap-2 p-3 rounded-xl transition-all active:scale-95",
        locked 
          ? "bg-muted/30 opacity-40 cursor-not-allowed" 
          : variant === "destructive" 
            ? "bg-destructive/10 hover:bg-destructive/15"
            : "bg-muted/50 hover:bg-muted"
      )}
    >
      <div className="relative">
        {locked ? <Lock className="w-5 h-5 text-muted-foreground" /> : <Icon className={cn("w-5 h-5", variant === "destructive" ? "text-destructive" : "text-foreground")} />}
        {!!badge && badge > 0 && !locked && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className={cn("text-[11px] font-medium", variant === "destructive" ? "text-destructive" : "text-foreground")}>
        {label}
      </span>
    </button>
  );
}
