import { ReactNode } from "react";
import { Shield, RefreshCw, Search, Truck, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminDropdownMenu } from "@/components/admin/AdminDropdownMenu";
import { useDashboardTheme } from "@/hooks/useDashboardTheme";

interface AdminDashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  refreshing?: boolean;
  globalSearchResults?: {
    gps: Array<{ id: string; business_name: string; city: string }>;
    orders: Array<{ id: string; order_number: string; origin_city: string; destination_city: string }>;
  } | null;
}

/**
 * Layout dédié au dashboard Admin
 * - Header bleu foncé spécifique aux admins
 * - Barre de recherche globale
 * - Navigation dropdown admin
 * - Aucun composant client ou transporteur
 */
export function AdminDashboardLayout({
  children,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onRefresh,
  refreshing = false,
  globalSearchResults,
}: AdminDashboardLayoutProps) {
  const navigate = useNavigate();
  const theme = useDashboardTheme("admin");

  const handleViewGPDetails = (gpId: string) => {
    navigate(`/admin/gp/${gpId}`);
    onSearchChange("");
  };

  return (
    <div className="min-h-screen pb-safe bg-background">
      {/* Fixed Admin Header */}
      <div className={`sticky top-0 z-50 ${theme.headerBgClass} ${theme.headerTextClass} shadow-md`}>
        <div className="py-3 px-4" style={{ paddingTop: 'calc(12px + var(--safe-top, 0px))' }}>
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <p className="text-sm opacity-80">Gestion de la plateforme</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onRefresh}
                disabled={refreshing}
                className="bg-white/10 border-white/20 hover:bg-white/20"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
              <AdminDropdownMenu 
                activeTab={activeTab}
                onTabChange={onTabChange}
              />
            </div>
          </div>
        </div>
        
        {/* Global Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative max-w-7xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <Input
              placeholder="Recherche globale (transporteurs, commandes, tickets...)"
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          
          {/* Global Search Results Dropdown */}
          {globalSearchResults && (globalSearchResults.gps.length > 0 || globalSearchResults.orders.length > 0) && (
            <div className="absolute left-4 right-4 mt-1 max-w-7xl mx-auto bg-card border border-border rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
              {globalSearchResults.gps.length > 0 && (
                <div className="p-2">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">Transporteurs</p>
                  {globalSearchResults.gps.slice(0, 5).map(gp => (
                    <button
                      key={gp.id}
                      onClick={() => handleViewGPDetails(gp.id)}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded-md flex items-center gap-2"
                    >
                      <Truck className="w-4 h-4 text-primary" />
                      <span className="font-medium">{gp.business_name}</span>
                      <span className="text-xs text-muted-foreground">• {gp.city}</span>
                    </button>
                  ))}
                </div>
              )}
              {globalSearchResults.orders.length > 0 && (
                <div className="p-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">Commandes</p>
                  {globalSearchResults.orders.slice(0, 5).map(order => (
                    <button
                      key={order.id}
                      onClick={() => {
                        onTabChange("orders");
                        onSearchChange(order.order_number);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded-md flex items-center gap-2"
                    >
                      <Package className="w-4 h-4 text-primary" />
                      <span className="font-mono text-sm">{order.order_number}</span>
                      <span className="text-xs text-muted-foreground">• {order.origin_city} → {order.destination_city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <main className="px-4 py-4 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
