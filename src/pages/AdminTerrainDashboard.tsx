/**
 * Admin Terrain Dashboard — V1 Terrain (Konnekt)
 * 
 * Scan-centric, mobile-first, operational dashboard.
 * 5 tabs: Aperçu terrain, Scan & Actions, Colis actifs, GP & Logistique, Alertes & Litiges
 * 
 * Rules:
 * - Scan = moteur principal
 * - Grosses zones cliquables
 * - Codes couleur statuts
 * - Bottom safe-area respectée
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, RefreshCw, ScanLine, Package, Truck, AlertTriangle,
  Eye, MapPin, Users, BarChart3, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { PageLoader } from "@/components/ui/PageLoader";
import { TerrainOverviewTab } from "@/components/admin/terrain/TerrainOverviewTab";
import { TerrainScanTab } from "@/components/admin/terrain/TerrainScanTab";
import { TerrainColisTab } from "@/components/admin/terrain/TerrainColisTab";
import { TerrainLogistiqueTab } from "@/components/admin/terrain/TerrainLogistiqueTab";
import { TerrainAlertesTab } from "@/components/admin/terrain/TerrainAlertesTab";
import { motion } from "framer-motion";

export interface TerrainStats {
  colisACollecter: number;
  colisEnTransit: number;
  colisArrives: number;
  actionsBloques: number;
  agentsActifs: number;
  litiges: number;
}

export interface TerrainOrder {
  id: string;
  order_number: string;
  status: string;
  logistics_status?: string;
  origin_city: string;
  destination_city: string;
  weight: number;
  created_at: string;
  total_price: number;
  gp_name?: string;
  gp_id?: string;
  client_id?: string;
  recipient_name?: string;
  delivery_code?: string;
  description?: string;
}

const TERRAIN_TABS = [
  { id: "overview", label: "Aperçu", icon: Eye },
  { id: "scan", label: "Scan", icon: ScanLine },
  { id: "colis", label: "Colis", icon: Package },
  { id: "logistique", label: "GP & Log.", icon: Truck },
  { id: "alertes", label: "Alertes", icon: AlertTriangle },
] as const;

export default function AdminTerrainDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isModerator, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [orders, setOrders] = useState<TerrainOrder[]>([]);
  const [stats, setStats] = useState<TerrainStats>({
    colisACollecter: 0,
    colisEnTransit: 0,
    colisArrives: 0,
    actionsBloques: 0,
    agentsActifs: 0,
    litiges: 0,
  });

  useEffect(() => {
    if (!roleLoading) {
      if (!isAdmin && !isModerator) {
        toast({ title: "Accès refusé", variant: "destructive" });
        navigate("/");
        return;
      }
      refreshData();
    }
  }, [isAdmin, isModerator, roleLoading]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [ordersRes, logisticsRes, disputesRes, agentsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, status, logistics_status, origin_city, destination_city, weight, created_at, total_price, gp_id, client_id, recipient_name, delivery_code, description, gp_profile:gp_profiles(business_name)")
          .not("status", "eq", "cancelled")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("order_logistics_options")
          .select("id, order_id, pickup_status, delivery_status, logistics_status")
          .or("pickup_enabled.eq.true,delivery_enabled.eq.true"),
        supabase
          .from("disputes")
          .select("id, status")
          .in("status", ["open", "under_review", "awaiting_response"]),
        supabase
          .from("user_roles")
          .select("id")
          .eq("role", "agent_logistique"),
      ]);

      const rawOrders = (ordersRes.data || []).map((o: any) => ({
        ...o,
        gp_name: o.gp_profile?.business_name || null,
      }));
      setOrders(rawOrders);

      // Compute terrain stats
      const pending = rawOrders.filter((o: any) => o.status === "accepted" || o.status === "pending");
      const inTransit = rawOrders.filter((o: any) => o.status === "in_transit");
      const arrived = rawOrders.filter((o: any) => o.status === "arrived" || o.logistics_status === "arrived");
      const blocked = rawOrders.filter((o: any) => 
        o.logistics_status === "weight_disputed" || o.logistics_status === "awaiting_client_validation"
      );

      setStats({
        colisACollecter: pending.length,
        colisEnTransit: inTransit.length,
        colisArrives: arrived.length,
        actionsBloques: blocked.length,
        agentsActifs: agentsRes.data?.length || 0,
        litiges: disputesRes.data?.length || 0,
      });
    } catch (err) {
      console.error("Error refreshing terrain data:", err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  if (roleLoading || loading) {
    return <PageLoader message="Chargement terrain..." />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Compact Terrain Header */}
      <header
        className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg"
        style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}
      >
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Admin Terrain</h1>
              <p className="text-[10px] text-white/50">Dakar · Temps réel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats.actionsBloques > 0 && (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px]">
                {stats.actionsBloques} bloqué{stats.actionsBloques > 1 ? "s" : ""}
              </Badge>
            )}
            {stats.litiges > 0 && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                {stats.litiges} litige{stats.litiges > 1 ? "s" : ""}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/bureau")}
              className="bg-white/10 hover:bg-white/20 text-white w-8 h-8 rounded-xl"
              title="Dashboard Bureau"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshData}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 text-white w-8 h-8 rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <main className="px-4 py-4 max-w-3xl mx-auto">
        {activeTab === "overview" && (
          <TerrainOverviewTab stats={stats} orders={orders} onTabChange={setActiveTab} onRefresh={refreshData} />
        )}
        {activeTab === "scan" && (
          <TerrainScanTab orders={orders} onRefresh={refreshData} />
        )}
        {activeTab === "colis" && (
          <TerrainColisTab orders={orders} onRefresh={refreshData} />
        )}
        {activeTab === "logistique" && (
          <TerrainLogistiqueTab orders={orders} onRefresh={refreshData} />
        )}
        {activeTab === "alertes" && (
          <TerrainAlertesTab orders={orders} onRefresh={refreshData} />
        )}
      </main>

      {/* Terrain Mobile Nav — 5 tabs, scan dominant */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-white/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {TERRAIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const isScan = tab.id === "scan";
            
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors relative ${
                  isScan
                    ? ""
                    : isActive
                    ? "text-amber-400"
                    : "text-white/40"
                }`}
              >
                {isScan ? (
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center -mt-5 shadow-lg ${
                    isActive
                      ? "bg-amber-500 text-white"
                      : "bg-white/15 text-white/70 border border-white/20"
                  }`}>
                    <ScanLine className="w-6 h-6" />
                  </div>
                ) : (
                  <tab.icon className={`w-5 h-5 ${isActive ? "text-amber-400" : ""}`} />
                )}
                <span className={`text-[9px] font-medium ${isScan && isActive ? "text-amber-400" : ""}`}>
                  {tab.label}
                </span>
                {tab.id === "alertes" && (stats.actionsBloques + stats.litiges) > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
