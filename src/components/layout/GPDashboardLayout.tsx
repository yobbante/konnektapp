import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Package, Bell, Menu, ScanLine, Luggage,
  Lock, Home, ListChecks, LayoutGrid, ShieldX,
  Shield, DollarSign, History, Calendar, Wallet,
  Settings, LogOut, MapPin, User, Plus,
  MessageCircle, UserCircle, ChevronRight, Eye, EyeOff,
  BarChart3, Crown, Rocket,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { GPNotificationsDropdown } from "@/components/gp/dashboard/GPNotificationsDropdown";
import { GPKYCBadge, getGPDisplayStatus } from "@/components/gp/GPKYCBadge";
import { GPScanSheet } from "@/components/scan/GPScanSheet";
import { PremiumCTABanner } from "@/components/gp/PremiumCTABanner";
import { isGPPremium } from "@/lib/premiumGating";
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
    base_origin_city?: string | null;
    base_destination_city?: string | null;
    subscription?: string;
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
  const [showScanSheet, setShowScanSheet] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [walletData, setWalletData] = useState<{ balance: number; pending: number; currency: string } | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    if (showWallet && !walletData) {
      (async () => {
        try {
          const [walletRes, escrowRes] = await Promise.all([
            supabase.from("gp_wallets").select("balance, pending_balance, currency").eq("gp_id", gpProfile.id).maybeSingle(),
            supabase.from("escrow_transactions").select("net_to_gp").eq("gp_id", gpProfile.id).eq("status", "held"),
          ]);
          const pendingEscrow = escrowRes.data?.reduce((sum: number, e: any) => sum + (e.net_to_gp || 0), 0) || 0;
          setWalletData({
            balance: walletRes.data?.balance || 0,
            pending: pendingEscrow,
            currency: walletRes.data?.currency || "XOF",
          });
        } catch (e) {
          console.error("Wallet load error:", e);
        }
      })();
    }
  }, [showWallet, gpProfile.id]);

  const kycLevel = gpProfile.kyc_level ?? 0;
  const displayStatus = getGPDisplayStatus(gpProfile.status, kycLevel);
  const isVerified = gpProfile.status === "verified" || gpProfile.status === "premium" || gpProfile.status === "starter";
  useEnforceDashboardRole("gp");

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes("/gp/colis") || path.includes("/gp/demandes") || path.includes("/gp/en-cours")) return "colis";
    if (path.includes("/gp/wallet")) return "wallet";
    if (path.includes("/gp/messages")) return "messages";
    if (path.includes("/gp/scan")) return "scan";
    if (path.includes("/gp/profil-public") || path.includes("/gp/parametres") || path.includes("/gp/historique") || path.includes("/gp/calendrier") || path.includes("/gp/tarification") || path.includes("/gp/restrictions") || path.includes("/gp/ktp-geotrack") || path.includes("/gp/distribution") || path.includes("/gp/performances")) return "profil";
    if (path.includes("/gp/apercu")) return "apercu";
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
        className={cn(
          "sticky top-0 z-50 shadow-lg",
          (gpProfile as any).subscription === "pro"
            ? "bg-gradient-to-r from-violet-700 via-violet-600 to-purple-600"
            : (gpProfile as any).subscription === "premium"
              ? "bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500"
              : "bg-gradient-to-r from-primary to-primary/90"
        )}
        style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}
      >
        {/* Main header row */}
        <div className="px-3 py-2.5 flex items-center justify-between gap-2">
          {/* Logo + Name + Badge */}
          <div className="flex items-center gap-2.5 min-w-0 flex-shrink">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-sm">
              <Luggage className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-white font-bold text-sm leading-tight truncate max-w-[120px]">
                  {gpProfile.business_name}
                </p>
                {(gpProfile as any).subscription === "pro" ? (
                  <span className="inline-flex items-center gap-0.5 h-4 px-1.5 rounded text-[10px] font-bold bg-white text-violet-700 border border-white/80 shadow-sm">
                    <Rocket className="w-2.5 h-2.5" /> Pro
                  </span>
                ) : (gpProfile as any).subscription === "premium" ? (
                  <span className="inline-flex items-center gap-0.5 h-4 px-1.5 rounded text-[10px] font-bold bg-white text-amber-700 border border-white/80 shadow-sm">
                    <Crown className="w-2.5 h-2.5" /> Premium
                  </span>
                ) : (
                  <GPKYCBadge status={displayStatus} kycLevel={kycLevel} size="sm" />
                )}
              </div>
              {gpProfile.base_origin_city && gpProfile.base_destination_city && (
                <p className="text-white/70 text-[10px] leading-tight truncate">
                  {gpProfile.base_origin_city} → {gpProfile.base_destination_city}
                </p>
              )}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            {/* + Nouveau voyage */}
            {isVerified && (
              <Button
                onClick={() => onNewVoyage?.()}
                size="icon"
                className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 text-white border-none"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}

            {/* Wallet toggle */}
            {isVerified && (
              <Button
                onClick={() => setShowWallet(prev => !prev)}
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full border-none transition-all",
                  showWallet ? "bg-white/30 text-white" : "bg-white/15 hover:bg-white/25 text-white"
                )}
              >
                <Wallet className="w-4 h-4" />
              </Button>
            )}

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white hover:bg-white/10 w-8 h-8 flex-shrink-0"
              onClick={() => setShowNotifications(true)}
            >
              <Bell className="w-4.5 h-4.5" />
              {totalBadge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {totalBadge > 9 ? "9+" : totalBadge}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* WALLET DROPDOWN */}
      <AnimatePresence>
        {showWallet && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="sticky top-[calc(52px+var(--safe-top,0px))] z-40 overflow-hidden"
          >
            <div className={cn(
              "backdrop-blur-xl border-b border-white/10 px-4 py-4",
              (gpProfile as any).subscription === "pro"
                ? "bg-gradient-to-b from-violet-700/95 to-violet-600/85"
                : (gpProfile as any).subscription === "premium"
                  ? "bg-gradient-to-b from-amber-500/95 to-amber-600/85"
                  : "bg-gradient-to-b from-primary/95 to-primary/85"
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-white/70" />
                  <span className="text-xs text-white/70 font-medium">Mon portefeuille</span>
                </div>
                <button onClick={() => setShowBalance(b => !b)} className="text-white/50 hover:text-white/80 transition-colors">
                  {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {walletData ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-2xl font-bold text-white tracking-tight">
                      {showBalance ? `${walletData.balance.toLocaleString("fr-FR")} ${walletData.currency}` : "••••••"}
                    </p>
                    <p className="text-[11px] text-white/50 mt-0.5">Solde disponible</p>
                  </div>

                  {walletData.pending > 0 && (
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-xs text-white/80 flex-1">En attente (escrow)</span>
                      <span className="text-xs font-semibold text-white">
                        {showBalance ? `${walletData.pending.toLocaleString("fr-FR")} ${walletData.currency}` : "••••"}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => { setShowWallet(false); navigate("/gp/wallet"); }}
                    className="w-full flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold py-2.5 rounded-xl transition-all active:scale-[0.98]"
                  >
                    Voir le détail
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center py-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium/Pro upgrade is now handled by GPKYCProgressCard */}


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
          
          {/* Colis — includes demandes */}
          <NavItem 
            icon={Package} 
            label="Colis" 
            active={currentTab === "colis"}
            badge={pendingCount + activeOrdersCount}
            locked={!isVerified}
            onClick={() => isVerified && navigate("/gp/colis")}
          />
          
          {/* SCAN — Center, larger — opens GPScanSheet */}
          <button
            onClick={() => isVerified && setShowScanSheet(true)}
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

          {/* Messages */}
          <NavItem 
            icon={MessageCircle} 
            label="Messages" 
            active={currentTab === "messages"}
            onClick={() => navigate("/gp/messages")}
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
              <div className="grid grid-cols-3 gap-3 pb-3">
                <MenuButton icon={Home} label="Accueil site" onClick={() => { setShowMenu(false); navigate("/"); }} />
                <MenuButton icon={BarChart3} label="Performances" onClick={() => { setShowMenu(false); navigate("/gp/performances"); }} />
                <MenuButton icon={MapPin} label="Profil public" onClick={() => { setShowMenu(false); navigate("/gp/profil-public"); }} />
                <MenuButton icon={Package} label="Demandes" badge={pendingCount} locked={!isVerified} onClick={() => { if (isVerified) { setShowMenu(false); navigate("/gp/demandes"); }}} />
                <MenuButton icon={Calendar} label="Départs" locked={!isVerified} onClick={() => { if (isVerified) { setShowMenu(false); navigate("/gp/calendrier"); }}} />
                <MenuButton icon={Wallet} label="Wallet" locked={!isVerified} onClick={() => { if (isVerified) { setShowMenu(false); navigate("/gp/wallet"); }}} />
                <MenuButton icon={DollarSign} label="Tarifs" onClick={() => { setShowMenu(false); navigate("/gp/tarification"); }} />
                <MenuButton icon={ShieldX} label="Restrictions" onClick={() => { setShowMenu(false); navigate("/gp/restrictions"); }} />
                <MenuButton icon={ListChecks} label="Distribution" locked={!isVerified} onClick={() => { if (isVerified) { setShowMenu(false); navigate("/gp/distribution"); }}} />
                <MenuButton icon={History} label="Historique" onClick={() => { setShowMenu(false); navigate("/gp/historique"); }} />
                <MenuButton icon={Shield} label="KTP & Geo" onClick={() => { setShowMenu(false); navigate("/gp/ktp-geotrack"); }} />
                <MenuButton icon={Settings} label="Réglages" onClick={() => { setShowMenu(false); navigate("/gp/parametres"); }} />
                <MenuButton icon={LogOut} label="Déconnexion" variant="destructive" onClick={() => { setShowMenu(false); handleSignOut(); }} />
              </div>
              {/* Premium CTA — progressive */}
              <div className="pb-3">
                <PremiumCTABanner variant="compact" context="menu" subscription={(gpProfile as any).subscription} />
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

      {/* GP Scan Sheet */}
      <GPScanSheet
        open={showScanSheet}
        onOpenChange={setShowScanSheet}
        gpId={gpProfile.id}
        isVerified={isVerified}
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
