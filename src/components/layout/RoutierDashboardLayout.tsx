import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Truck, Bell, Package, Clock, 
  History, Menu, Car, Wallet 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GPNotificationsDropdown } from "@/components/gp/dashboard/GPNotificationsDropdown";
import { RoutierDashboardHubSheet } from "@/components/layout/RoutierDashboardHubSheet";
import { cn } from "@/lib/utils";

interface RoutierDashboardLayoutProps {
  children: ReactNode;
  gpProfile: {
    id: string;
    business_name: string;
    gp_type: string;
    status: string;
  };
  pendingCount?: number;
  activeOrdersCount?: number;
}

interface NavTab {
  id: string;
  label: string;
  icon: typeof Package;
  path: string;
  badge?: number;
}

export function RoutierDashboardLayout({
  children,
  gpProfile,
  pendingCount = 0,
  activeOrdersCount = 0,
}: RoutierDashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHubMenu, setShowHubMenu] = useState(false);

  const navTabs: NavTab[] = [
    { id: "apercu", label: "Accueil", icon: Truck, path: "/routier/apercu" },
    { id: "demandes", label: "Missions", icon: Package, path: "/routier/demandes", badge: pendingCount },
    { id: "en-cours", label: "En cours", icon: Clock, path: "/routier/en-cours", badge: activeOrdersCount },
    { id: "historique", label: "Historique", icon: History, path: "/routier/historique" },
    { id: "vehicules", label: "Flotte", icon: Car, path: "/routier/vehicules" },
    { id: "wallet", label: "Wallet", icon: Wallet, path: "/routier/wallet" },
  ];

  const currentPath = location.pathname;
  const getActiveTab = () => {
    if (currentPath.includes("demandes")) return "demandes";
    if (currentPath.includes("en-cours")) return "en-cours";
    if (currentPath.includes("historique")) return "historique";
    if (currentPath.includes("vehicules")) return "vehicules";
    if (currentPath.includes("wallet")) return "wallet";
    return "apercu";
  };
  const activeTab = getActiveTab();
  const isAvailable = gpProfile.status === "verified";

  return (
    <div className="min-h-screen pb-safe bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-50 shadow-md bg-gradient-to-r from-blue-700 to-blue-900 text-white"
        style={{ paddingTop: 'calc(12px + var(--safe-top, 0px))' }}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">{gpProfile.business_name}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", isAvailable ? "bg-green-500/20 text-green-100 border-green-400" : "bg-yellow-500/20 text-yellow-100 border-yellow-400")}>
                  {isAvailable ? "Actif" : "En attente"}
                </Badge>
                <span className="text-[10px] opacity-70">Routier</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="relative bg-white/10 hover:bg-white/20 text-inherit" onClick={() => setShowNotifications(true)}>
              <Bell className="w-5 h-5" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">{pendingCount}</span>
              )}
            </Button>
            <RoutierDashboardHubSheet open={showHubMenu} onOpenChange={setShowHubMenu} pendingCount={pendingCount} activeOrdersCount={activeOrdersCount} gpProfile={gpProfile}>
              <Button variant="ghost" size="icon" className="bg-white/10 hover:bg-white/20 text-inherit"><Menu className="w-5 h-5" /></Button>
            </RoutierDashboardHubSheet>
          </div>
        </div>

        {/* Nav Tabs */}
        <div className="overflow-x-auto scrollbar-hide">
          <nav className="flex px-2 pb-2 gap-1 min-w-max">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => navigate(tab.path)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                    isActive ? "bg-white/90 text-blue-700 shadow-sm" : "bg-white/10 text-white/80 hover:bg-white/20"
                  )}>
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px]">{tab.badge}</Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <GPNotificationsDropdown
        gpProfileId={gpProfile.id}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onViewOrderDetail={(orderId) => navigate(`/routier/order/${orderId}`)}
      />
    </div>
  );
}
