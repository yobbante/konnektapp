import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Truck, Bell, Package, Clock, Calendar, 
  DollarSign, User, History, Menu, QrCode, Plus, Plane
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardTheme } from "@/hooks/useDashboardTheme";
import { GPNotificationsDropdown } from "@/components/gp/dashboard/GPNotificationsDropdown";
import { GPDashboardHubSheet } from "@/components/layout/GPDashboardHubSheet";
import { GPCreateOfferDialog } from "@/components/gp/GPCreateOfferDialog";
import { cn } from "@/lib/utils";
import { useEnforceDashboardRole } from "@/hooks/useSmartRedirect";

interface GPDashboardLayoutProps {
  children: ReactNode;
  gpProfile: {
    id: string;
    business_name: string;
    gp_type: string;
    status: string;
  };
  pendingCount?: number;
  activeOrdersCount?: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

interface NavTab {
  id: string;
  label: string;
  icon: typeof Package;
  path: string;
  badge?: number;
}

/**
 * GPDashboardLayout V2 - Layout avec menu hub central
 * 
 * Structure:
 * - Header avec statut, notifications et menu hub
 * - Navigation interne par onglets (tabs horizontaux)
 * - Contenu principal
 * 
 * Principe: Dashboard = outil de travail
 */
export function GPDashboardLayout({
  children,
  gpProfile,
  pendingCount = 0,
  activeOrdersCount = 0,
  activeTab = "demandes",
  onTabChange,
}: GPDashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useDashboardTheme("partner");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHubMenu, setShowHubMenu] = useState(false);
  const [showAddDeparture, setShowAddDeparture] = useState(false);

  // Navigation tabs for GP Dashboard
  const navTabs: NavTab[] = [
    { id: "demandes", label: "Demandes", icon: Package, path: "/gp/demandes", badge: pendingCount },
    { id: "en-cours", label: "En cours", icon: Clock, path: "/gp/en-cours", badge: activeOrdersCount },
    { id: "scan", label: "Scan", icon: QrCode, path: "/gp/scan" },
    { id: "calendrier", label: "Départs", icon: Calendar, path: "/gp/calendrier" },
    { id: "tarifs", label: "Tarifs", icon: DollarSign, path: "/gp/tarification" },
    { id: "historique", label: "Historique", icon: History, path: "/gp/historique" },
  ];

  // Detect active tab from path
  const currentPath = location.pathname;
  const getActiveFromPath = () => {
    if (currentPath === "/gp/dashboard" || currentPath === "/gp/demandes") return "demandes";
    if (currentPath.includes("en-cours")) return "en-cours";
    if (currentPath.includes("scan")) return "scan";
    if (currentPath.includes("historique")) return "historique";
    if (currentPath.includes("calendrier")) return "calendrier";
    if (currentPath.includes("tarification")) return "tarifs";
    return activeTab;
  };

  const currentActiveTab = getActiveFromPath();

  // Enforce role: Routier should never see GP dashboard
  useEnforceDashboardRole("gp");

  const handleTabClick = (tab: NavTab) => {
    if (onTabChange) {
      onTabChange(tab.id);
    } else {
      navigate(tab.path);
    }
  };

  const isAvailable = gpProfile.status === "verified";
  const isPending = gpProfile.status === "pending";

  return (
    <div className="min-h-screen pb-safe bg-background">
      {/* Fixed Header */}
      <header 
        className={cn(
          "sticky top-0 z-50 shadow-md",
          theme.headerBgClass,
          theme.headerTextClass
        )}
        style={{ paddingTop: 'calc(12px + var(--safe-top, 0px))' }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo & Business Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">{gpProfile.business_name}</h1>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={isAvailable ? "secondary" : "outline"}
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      isAvailable ? "bg-green-500/20 text-green-100 border-green-400" : 
                      isPending ? "bg-yellow-500/20 text-yellow-100 border-yellow-400" :
                      "bg-red-500/20 text-red-100 border-red-400"
                    )}
                  >
                    {isAvailable ? "Disponible" : isPending ? "En attente" : "Indisponible"}
                  </Badge>
                  <span className="text-xs opacity-70 capitalize">
                    {gpProfile.gp_type === "bagages_international" ? "GP Bagages" : gpProfile.gp_type}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Quick Add Departure Button */}
              <Button
                variant="ghost"
                size="icon"
                className="relative bg-white/10 hover:bg-white/20 text-inherit"
                onClick={() => setShowAddDeparture(true)}
                title="Ajouter un départ"
              >
                <Plus className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="relative bg-white/10 hover:bg-white/20 text-inherit"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="w-5 h-5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Button>
              
              {/* Hub Menu Button */}
              <GPDashboardHubSheet
                open={showHubMenu}
                onOpenChange={setShowHubMenu}
                pendingCount={pendingCount}
                activeOrdersCount={activeOrdersCount}
                gpProfile={gpProfile}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/10 hover:bg-white/20 text-inherit"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </GPDashboardHubSheet>
            </div>
          </div>
        </div>

        {/* Internal Navigation Tabs */}
        <div className="overflow-x-auto scrollbar-hide">
          <nav className="flex px-2 pb-2 gap-1 min-w-max">
            {navTabs.map((tab) => {
              const isActive = currentActiveTab === tab.id;
              const Icon = tab.icon;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                    isActive 
                      ? "bg-white/90 text-primary shadow-sm" 
                      : "bg-white/10 text-white/80 hover:bg-white/20"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-1 h-4 min-w-4 px-1 text-[10px]"
                    >
                      {tab.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Notifications Dropdown */}
      <GPNotificationsDropdown
        gpProfileId={gpProfile.id}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onViewOrderDetail={(orderId) => navigate(`/gp/order/${orderId}`)}
      />

      {/* Quick Add Departure Dialog */}
      <GPCreateOfferDialog
        open={showAddDeparture}
        onClose={() => setShowAddDeparture(false)}
        gpProfile={gpProfile}
        onSuccess={() => {
          setShowAddDeparture(false);
          navigate("/gp/calendrier");
        }}
      />
    </div>
  );
}
