import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, RefreshCw, Search, Filter, Truck, Package, Settings, UserCheck, ScanLine } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useDashboardTheme } from "@/hooks/useDashboardTheme";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { AdminStatsCharts } from "@/components/admin/AdminStatsCharts";
import { AdminGPList } from "@/components/admin/AdminGPList";
import { AdminPendingGPs } from "@/components/admin/AdminPendingGPs";
import { AdminOrdersList } from "@/components/admin/AdminOrdersList";
import { AdminSupportAndDisputes } from "@/components/admin/AdminSupportAndDisputes";
import { AdminTransporterReputation } from "@/components/admin/AdminTransporterReputation";
import { AdminPermissionsManager } from "@/components/admin/AdminPermissionsManager";
import { AdminDropdownMenu } from "@/components/admin/AdminDropdownMenu";
import { ExchangeRatesManager } from "@/components/admin/ExchangeRatesManager";
import { GPPriceHistoryChart } from "@/components/admin/GPPriceHistoryChart";
import { AdminInsuranceTiers } from "@/components/admin/AdminInsuranceTiers";
import { AdminMessageTemplates } from "@/components/admin/AdminMessageTemplates";
import { AdminAutoMessageTemplates } from "@/components/admin/AdminAutoMessageTemplates";
import { AdminLogisticsOrdersV2 } from "@/components/admin/AdminLogisticsOrdersV2";
import { AdminConfigPanel } from "@/components/admin/AdminConfigPanel";
import { AdminMovingRequestsTab } from "@/components/admin/AdminMovingRequestsTab";
import { AdminWalletPanel } from "@/components/admin/AdminWalletPanel";
import { AdminNavetteApprovals } from "@/components/admin/AdminNavetteApprovals";
import { AdminGPApprovalPanel } from "@/components/admin/AdminGPApprovalPanel";
import { PageLoader } from "@/components/ui/PageLoader";
import { assertValidGpStatus, type GpStatus } from "@/lib/enumMappings";

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
  city: string;
  phone: string;
  whatsapp?: string;
  rating: number;
  total_deliveries: number;
  total_reviews: number;
  created_at: string;
  verified_at?: string;
  zones_covered?: string[];
  international_destinations?: string[];
  description?: string;
  user_email?: string;
}

interface Order {
  id: string;
  order_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  status: string;
  logistics_status?: string;
  total_price: number;
  commission_amount: number;
  weight: number;
  created_at: string;
  pickup_date?: string;
  delivery_date?: string;
  tracking_code?: string;
  description?: string;
  gp_profile?: { business_name: string; phone?: string };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const theme = useDashboardTheme("admin");
  const { isAdmin, isModerator, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  const [gps, setGps] = useState<GPProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [gpFilter, setGpFilter] = useState<"all" | "pending" | "verified" | "suspended">("all");
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "in_progress" | "delivered" | "cancelled">("all");

  const [stats, setStats] = useState({
    totalGps: 0,
    pendingGps: 0,
    verifiedGps: 0,
    suspendedGps: 0,
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    totalRevenue: 0,
    commissions: 0,
    avgRating: 0,
  });

  useEffect(() => {
    if (!roleLoading) {
      if (!isAdmin && !isModerator) {
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les permissions nécessaires",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      refreshData();
    }
  }, [isAdmin, isModerator, roleLoading]);

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchGPs(), fetchOrders(), fetchStats()]);
    setRefreshing(false);
    setLoading(false);
  };

  const fetchGPs = async () => {
    // Use a subquery to get email from profiles where profiles.user_id = gp_profiles.user_id
    const { data, error } = await supabase
      .from("gp_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching GPs:", error);
      setGps([]);
      return;
    }

    // Fetch profiles separately to get emails
    const userIds = (data || []).map((gp: any) => gp.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.email]));
    
    // Map profiles email to user_email for easy access
    const gpsWithEmail = (data || []).map((gp: any) => ({
      ...gp,
      user_email: profileMap.get(gp.user_id) || null,
    }));
    setGps(gpsWithEmail);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(`*, gp_profile:gp_profiles(business_name, phone)`)
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders(data || []);
  };

  const fetchStats = async () => {
    const [gpsResult, ordersResult, ticketsResult, disputesResult] = await Promise.all([
      supabase.from("gp_profiles").select("id, status, rating"),
      supabase.from("orders").select("id, total_price, commission_amount, status"),
      supabase.from("support_tickets").select("status"),
      supabase.from("disputes").select("status"),
    ]);

    const gpsData = gpsResult.data || [];
    const ordersData = ordersResult.data || [];
    const tickets = ticketsResult.data || [];
    const disputes = disputesResult.data || [];

    const ratings = gpsData.filter(g => g.rating > 0).map(g => g.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    setStats({
      totalGps: gpsData.length,
      pendingGps: gpsData.filter(g => g.status === "pending").length,
      verifiedGps: gpsData.filter(g => g.status === "verified").length,
      suspendedGps: gpsData.filter(g => g.status === "suspended").length,
      totalOrders: ordersData.length,
      pendingOrders: ordersData.filter(o => !["delivered", "cancelled"].includes(o.status)).length,
      deliveredOrders: ordersData.filter(o => o.status === "delivered").length,
      totalRevenue: ordersData.filter(o => o.status === "delivered").reduce((sum, o) => sum + (o.total_price || 0), 0),
      commissions: ordersData.filter(o => o.status === "delivered").reduce((sum, o) => sum + (o.commission_amount || 0), 0),
      avgRating,
    });
  };

  const updateGPStatus = async (gpId: string, newStatus: GpStatus) => {
    try {
      // CRITICAL: Validate enum before DB operation
      const validStatus = assertValidGpStatus(newStatus);
      
      const { error } = await supabase
        .from("gp_profiles")
        .update({ status: validStatus })
        .eq("id", gpId);

      if (error) throw error;
      
      toast({ title: "Statut mis à jour" });
      refreshData();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleViewDetails = (gpId: string) => {
    navigate(`/admin/gp/${gpId}`);
  };

  const filteredGPs = gps.filter(gp => {
    const matchesSearch = gp.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gp.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = gpFilter === "all" || gp.status === gpFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.origin_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.destination_city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = orderFilter === "all" || order.status === orderFilter;
    return matchesSearch && matchesFilter;
  });

  if (roleLoading || loading) {
    return <PageLoader message="Chargement du tableau de bord admin..." />;
  }

  // Global search across all data
  const globalSearchResults = searchQuery.length >= 2 ? {
    gps: gps.filter(gp => 
      gp.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gp.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gp.phone?.includes(searchQuery)
    ),
    orders: orders.filter(order =>
      order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.origin_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.destination_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.tracking_code?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  } : null;

  return (
    <div className="min-h-screen pb-safe bg-background">
      {/* Fixed Admin Header — Konnekt Admin */}
      <div className={`sticky top-0 z-50 ${theme.headerBgClass} ${theme.headerTextClass} shadow-md`}>
        <div className="py-3 px-4" style={{ paddingTop: 'calc(12px + var(--safe-top, 0px))' }}>
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Konnekt Admin</h1>
                <p className="text-[11px] opacity-70 font-medium">
                  {stats.pendingOrders > 0 
                    ? `${stats.pendingOrders} commande${stats.pendingOrders > 1 ? 's' : ''} en cours · ${stats.pendingGps} GP en attente`
                    : "Gestion de la plateforme"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/admin")}
                className="bg-white/10 border-white/20 hover:bg-white/20 rounded-xl"
                title="Vue Terrain"
              >
                <ScanLine className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={refreshData}
                disabled={refreshing}
                className="bg-white/10 border-white/20 hover:bg-white/20 rounded-xl"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
              <AdminDropdownMenu 
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
          </div>
        </div>
        
        {/* Global Search Bar */}
        <form 
          className="px-4 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.length >= 2) {
              navigate(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
            }
          }}
        >
          <div className="relative max-w-7xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <Input
              placeholder="Rechercher transporteurs, commandes, tickets..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 rounded-xl h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Quick Preview Dropdown */}
          {globalSearchResults && (globalSearchResults.gps.length > 0 || globalSearchResults.orders.length > 0) && (
            <div className="absolute left-4 right-4 mt-1 max-w-7xl mx-auto bg-card border border-border rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
              {globalSearchResults.gps.length > 0 && (
                <div className="p-2">
                  <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">Transporteurs</p>
                  {globalSearchResults.gps.slice(0, 3).map(gp => (
                    <button
                      key={gp.id}
                      type="button"
                      onClick={() => {
                        handleViewDetails(gp.id);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Truck className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{gp.business_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{gp.city}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {globalSearchResults.orders.length > 0 && (
                <div className="p-2 border-t border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">Commandes</p>
                  {globalSearchResults.orders.slice(0, 3).map(order => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => navigate(`/admin/order/${order.id}`)}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <Package className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-sm font-medium">{order.order_number}</span>
                        <span className="text-xs text-muted-foreground ml-2">{order.origin_city} → {order.destination_city}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {/* "See all results" link */}
              <div className="p-2 border-t border-border">
                <button
                  type="submit"
                  className="w-full text-center px-3 py-2 hover:bg-muted rounded-lg text-sm text-primary font-medium transition-colors"
                >
                  Voir tous les résultats →
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="px-4 py-4 max-w-7xl mx-auto">
        {/* Stats - Only show on overview tab */}
        {activeTab === "overview" && <AdminStatsCards stats={stats} />}

        {/* Content based on active tab - NO visible TabsList */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          {/* Contextual Filters - Only show for specific tabs */}
          {(activeTab === "gps" || activeTab === "orders") && (
            <div className="flex gap-2 mb-4">
              {activeTab === "gps" && (
                <Select value={gpFilter} onValueChange={(v: any) => setGpFilter(v)}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="verified">Vérifiés</SelectItem>
                    <SelectItem value="suspended">Suspendus</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {activeTab === "orders" && (
                <Select value={orderFilter} onValueChange={(v: any) => setOrderFilter(v)}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="delivered">Livrées</SelectItem>
                    <SelectItem value="cancelled">Annulées</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Overview - Now includes logistics preview + GP approvals + stats */}
          <TabsContent value="overview" className="space-y-4">
            {/* Logistics Alert Preview */}
            <AdminLogisticsOrdersV2 compact />
            
            {/* Quick stat summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickStatCard label="GP en attente" value={stats.pendingGps} accent={stats.pendingGps > 0} />
              <QuickStatCard label="Commandes actives" value={stats.pendingOrders} />
              <QuickStatCard label="Livrées" value={stats.deliveredOrders} />
              <QuickStatCard label="Revenus" value={`${(stats.totalRevenue / 1000).toFixed(0)}k`} suffix="FCFA" />
            </div>

            {/* Enhanced GP Approval Panel — with pricing/route/currency verification */}
            <AdminGPApprovalPanel />
            
            {/* Navette Change Requests */}
            <AdminNavetteApprovals />
          </TabsContent>

          {/* Stats Charts */}
          <TabsContent value="stats" className="space-y-4">
            <AdminStatsCharts gps={gps} orders={orders} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ExchangeRatesManager />
              <GPPriceHistoryChart />
            </div>
          </TabsContent>

          {/* GPs */}
          <TabsContent value="gps">
            <AdminGPList 
              gps={filteredGPs}
              onUpdateStatus={updateGPStatus}
              onViewDetails={handleViewDetails}
              filter={gpFilter}
            />
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders">
            <AdminOrdersList 
              orders={filteredOrders}
              filter={orderFilter}
            />
          </TabsContent>

          {/* Support & Litiges combinés */}
          <TabsContent value="support">
            <AdminSupportAndDisputes />
          </TabsContent>

          {/* Reputation */}
          <TabsContent value="reputation">
            <AdminTransporterReputation />
          </TabsContent>

          {/* Permissions & Roles */}
          <TabsContent value="permissions">
            <AdminPermissionsManager />
          </TabsContent>

          {/* Configuration - Full Panel with organized sections */}
          <TabsContent value="config" className="space-y-4">
            <AdminConfigPanel />
            
            {/* Legacy components below for backward compatibility */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              <AdminInsuranceTiers />
              <AdminMessageTemplates />
            </div>
          </TabsContent>

          {/* Logistics - Konnekt Logistique V1.1 */}
          <TabsContent value="logistics">
            <AdminLogisticsOrdersV2 />
          </TabsContent>

          {/* Agent Konnekt — Livreur missions tab */}
          <TabsContent value="agents">
            <AgentMissionsTab />
          </TabsContent>

          {/* Moving Requests - Konnekt Internal Service */}
          <TabsContent value="moving">
            <AdminMovingRequestsTab />
          </TabsContent>

          {/* Finance & Wallets */}
          <TabsContent value="finance">
            <AdminWalletPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/** Quick stat card for overview */
function QuickStatCard({ label, value, suffix, accent }: { label: string; value: string | number; suffix?: string; accent?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border ${accent ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : 'border-border bg-card'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${accent ? 'text-amber-600' : ''}`}>
        {value} {suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}

/** Agent Konnekt missions tab — shows logistics agent missions */
function AgentMissionsTab() {
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAgentMissions();
  }, []);

  const loadAgentMissions = async () => {
    try {
      const { data } = await supabase
        .from("order_logistics_options")
        .select(`
          *,
          order:orders(order_number, origin_city, destination_city, status, weight)
        `)
        .or("pickup_enabled.eq.true,delivery_enabled.eq.true")
        .order("created_at", { ascending: false });
      setMissions(data || []);
    } catch (err) {
      console.error("Error loading agent missions:", err);
    } finally {
      setLoading(false);
    }
  };

  const pendingPickups = missions.filter(m => m.pickup_enabled && m.pickup_status === "pending");
  const activePickups = missions.filter(m => m.pickup_enabled && ["scheduled", "collected"].includes(m.pickup_status));
  const pendingDeliveries = missions.filter(m => m.delivery_enabled && (m.logistics_status === "awaiting_admin_delivery" || m.delivery_status === "pending"));
  const activeDeliveries = missions.filter(m => m.delivery_enabled && ["picked_from_gp", "in_transit"].includes(m.delivery_status));
  const completed = missions.filter(m => m.delivery_status === "delivered" || m.pickup_status === "handed_to_gp");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Missions Livreurs Konnekt
          </h2>
          <p className="text-sm text-muted-foreground">Suivi des agents logistiques terrain</p>
        </div>
      </div>

      {/* Mission Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
          <p className="text-xs text-muted-foreground">Enlèvements en attente</p>
          <p className="text-2xl font-bold text-amber-600">{pendingPickups.length}</p>
        </div>
        <div className="p-3 rounded-xl border border-blue-300 bg-blue-50/50 dark:bg-blue-950/20">
          <p className="text-xs text-muted-foreground">Enlèvements actifs</p>
          <p className="text-2xl font-bold text-blue-600">{activePickups.length}</p>
        </div>
        <div className="p-3 rounded-xl border border-purple-300 bg-purple-50/50 dark:bg-purple-950/20">
          <p className="text-xs text-muted-foreground">Livraisons en attente</p>
          <p className="text-2xl font-bold text-purple-600">{pendingDeliveries.length}</p>
        </div>
        <div className="p-3 rounded-xl border border-green-300 bg-green-50/50 dark:bg-green-950/20">
          <p className="text-xs text-muted-foreground">Terminées</p>
          <p className="text-2xl font-bold text-green-600">{completed.length}</p>
        </div>
      </div>

      {/* Active Missions List */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground">Missions actives</h3>
        {[...pendingPickups, ...activePickups, ...pendingDeliveries, ...activeDeliveries].length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune mission active</p>
          </div>
        ) : (
          [...pendingPickups, ...activePickups, ...pendingDeliveries, ...activeDeliveries].map(mission => (
            <div
              key={mission.id}
              className="p-3 rounded-xl border bg-card hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => navigate(`/admin/order/${mission.order_id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold">{mission.order?.order_number || "—"}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      mission.pickup_enabled && mission.pickup_status === "pending" ? "bg-amber-100 text-amber-800" :
                      mission.delivery_enabled && mission.delivery_status === "pending" ? "bg-purple-100 text-purple-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {mission.pickup_enabled && ["pending", "scheduled", "collected"].includes(mission.pickup_status) 
                        ? `Enlèvement: ${mission.pickup_status}` 
                        : `Livraison: ${mission.delivery_status || "en attente"}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {mission.order?.origin_city} → {mission.order?.destination_city}
                    {mission.pickup_contact_name && ` • ${mission.pickup_contact_name}`}
                    {mission.delivery_contact_name && ` • ${mission.delivery_contact_name}`}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
