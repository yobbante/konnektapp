import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GPMobileNav } from "@/components/layout/MobileNav";
import { GPDropdownMenu } from "@/components/gp/GPDropdownMenu";
import { useDashboardTheme } from "@/hooks/useDashboardTheme";

interface TransporteurDashboardLayoutProps {
  children: ReactNode;
  businessName: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCreateOffer?: () => void;
}

/**
 * Layout dédié au dashboard Transporteur
 * - Header bleu spécifique aux partenaires
 * - Navigation mobile transporteur
 * - Aucun composant client ou admin
 */
export function TransporteurDashboardLayout({
  children,
  businessName,
  activeTab,
  onTabChange,
  onCreateOffer,
}: TransporteurDashboardLayoutProps) {
  const navigate = useNavigate();
  const theme = useDashboardTheme("partner");

  return (
    <div className="min-h-screen pb-safe bg-background">
      {/* Fixed Transporteur Header */}
      <div 
        className={`sticky top-0 z-50 ${theme.headerBgClass} ${theme.headerTextClass} py-3 px-4 shadow-md`} 
        style={{ paddingTop: 'calc(12px + var(--safe-top, 0px))' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{businessName}</h1>
              <p className="text-sm opacity-80">Tableau de bord partenaire</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative bg-white/10 hover:bg-white/20 text-inherit"
              onClick={() => navigate("/alerts")}
            >
              <Bell className="w-5 h-5" />
            </Button>
            <GPDropdownMenu 
              activeTab={activeTab}
              onTabChange={onTabChange}
              onCreateOffer={onCreateOffer}
            />
          </div>
        </div>
      </div>

      <main className="flex-1">
        {children}
      </main>

      <GPMobileNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
