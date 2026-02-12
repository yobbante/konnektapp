/**
 * AdminDashboard — Unified Konnekt Admin V2
 * 
 * Single dashboard with 11 modules:
 * Overview, Colis, GP, Finance, Scan, Litiges, Assurance, Manuel, Taux, Paramètres, KYC
 * 
 * Sidebar (desktop) + Bottom nav (mobile)
 * Super Admin only for V1
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { PageLoader } from "@/components/ui/PageLoader";
import { UnifiedAdminLayout, type AdminModule } from "@/components/layout/UnifiedAdminLayout";
import { AdminOverviewModule, type AdminGlobalStats } from "@/components/admin/modules/AdminOverviewModule";
import { AdminColisModule } from "@/components/admin/modules/AdminColisModule";
import { AdminGPModule } from "@/components/admin/modules/AdminGPModule";
import { AdminFinanceModule } from "@/components/admin/modules/AdminFinanceModule";
import { AdminScanModule } from "@/components/admin/modules/AdminScanModule";
import { AdminLitigesModule } from "@/components/admin/modules/AdminLitigesModule";
import { AdminAssuranceModule } from "@/components/admin/modules/AdminAssuranceModule";
import { AdminManuelModule } from "@/components/admin/modules/AdminManuelModule";
import { AdminTauxModule } from "@/components/admin/modules/AdminTauxModule";
import { AdminParametresModule } from "@/components/admin/modules/AdminParametresModule";
import { AdminKYCModule } from "@/components/admin/modules/AdminKYCModule";
import { assertValidGpStatus, type GpStatus } from "@/lib/enumMappings";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isModerator, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeModule, setActiveModule] = useState<AdminModule>("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // Data
  const [gps, setGps] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [manualParcels, setManualParcels] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<AdminGlobalStats>({
    volumeToday: 0, volumeMonth: 0, totalEscrow: 0, totalCommissions: 0,
    totalInsurance: 0, colisInTransit: 0, colisLitiges: 0, colisManuel: 0,
    colisManuelPercent: 0, gpActifs: 0, gpPending: 0, gpVerified: 0,
    gpSuspended: 0, totalOrders: 0, deliveredOrders: 0, avgRating: 0, anomalies: 0,
  });

  useEffect(() => {
    if (!roleLoading) {
      if (!isAdmin && !isModerator) {
        toast({ title: "Accès refusé", description: "Permissions insuffisantes", variant: "destructive" });
        navigate("/");
        return;
      }
      refreshData();
    }
  }, [isAdmin, isModerator, roleLoading]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [gpsRes, ordersRes, manualRes, escrowRes, disputesRes] = await Promise.all([
        supabase.from("gp_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("*, gp_profile:gp_profiles(business_name, phone)").order("created_at", { ascending: false }).limit(500),
        supabase.from("manual_parcels").select("*, gp:gp_profiles(business_name)").order("created_at", { ascending: false }).limit(200),
        supabase.from("escrow_transactions").select("amount, status").eq("status", "held"),
        supabase.from("disputes").select("id, status").in("status", ["open", "under_review", "awaiting_response"]),
      ]);

      const allGps = gpsRes.data || [];
      const allOrders = ordersRes.data || [];
      const allManual = manualRes.data || [];
      const escrowHeld = escrowRes.data || [];
      const disputes = disputesRes.data || [];

      setGps(allGps);
      setOrders(allOrders);
      setManualParcels(allManual);

      // Compute global stats
      const todayOrders = allOrders.filter(o => new Date(o.created_at) >= today);
      const monthOrders = allOrders.filter(o => new Date(o.created_at) >= monthStart);
      const delivered = allOrders.filter(o => o.status === "delivered");
      const totalEscrow = escrowHeld.reduce((s, e) => s + (e.amount || 0), 0);
      const totalCommissions = delivered.reduce((s, o) => s + (o.commission_amount || 0), 0);
      const totalInsurance = allOrders.reduce((s, o) => s + (o.insurance_amount || 0), 0);
      const inTransit = allOrders.filter(o => o.status === "in_transit");
      const ratings = allGps.filter(g => g.rating > 0).map(g => g.rating);
      const totalColis = allOrders.length + allManual.length;

      setGlobalStats({
        volumeToday: todayOrders.length,
        volumeMonth: monthOrders.length,
        totalEscrow,
        totalCommissions,
        totalInsurance,
        colisInTransit: inTransit.length,
        colisLitiges: disputes.length,
        colisManuel: allManual.length,
        colisManuelPercent: totalColis > 0 ? Math.round((allManual.length / totalColis) * 100) : 0,
        gpActifs: allGps.filter(g => ["verified", "starter", "premium"].includes(g.status)).length,
        gpPending: allGps.filter(g => g.status === "pending").length,
        gpVerified: allGps.filter(g => g.status === "verified").length,
        gpSuspended: allGps.filter(g => g.status === "suspended").length,
        totalOrders: allOrders.length,
        deliveredOrders: delivered.length,
        avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
        anomalies: 0,
      });
    } catch (err) {
      console.error("Error refreshing admin data:", err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  const updateGPStatus = async (gpId: string, newStatus: string) => {
    try {
      const validStatus = assertValidGpStatus(newStatus as GpStatus);
      const { error } = await supabase.from("gp_profiles").update({ status: validStatus }).eq("id", gpId);
      if (error) throw error;
      toast({ title: "Statut GP mis à jour" });
      refreshData();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  if (roleLoading || loading) {
    return <PageLoader message="Chargement Admin..." />;
  }

  const subtitle = `${globalStats.colisInTransit} en transit · ${globalStats.gpPending} GP en attente`;

  return (
    <UnifiedAdminLayout
      activeModule={activeModule}
      onModuleChange={setActiveModule}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onRefresh={refreshData}
      refreshing={refreshing}
      subtitle={subtitle}
    >
      {activeModule === "overview" && (
        <AdminOverviewModule stats={globalStats} onNavigate={(m) => setActiveModule(m as AdminModule)} />
      )}
      {activeModule === "colis" && (
        <AdminColisModule
          orders={orders.map(o => ({
            ...o,
            gp_name: o.gp_profile?.business_name,
          }))}
          manualParcels={manualParcels.map(m => ({
            ...m,
            client_name: m.client_name,
          }))}
          searchQuery={searchQuery}
        />
      )}
      {activeModule === "gp" && (
        <AdminGPModule
          gps={gps}
          searchQuery={searchQuery}
          onUpdateStatus={updateGPStatus}
        />
      )}
      {activeModule === "finance" && (
        <AdminFinanceModule
          totalEscrow={globalStats.totalEscrow}
          totalCommissions={globalStats.totalCommissions}
          totalInsurance={globalStats.totalInsurance}
        />
      )}
      {activeModule === "scan" && <AdminScanModule />}
      {activeModule === "litiges" && <AdminLitigesModule />}
      {activeModule === "assurance" && <AdminAssuranceModule />}
      {activeModule === "manuel" && <AdminManuelModule />}
      {activeModule === "taux" && <AdminTauxModule />}
      {activeModule === "parametres" && <AdminParametresModule />}
      {activeModule === "kyc" && <AdminKYCModule />}
    </UnifiedAdminLayout>
  );
}