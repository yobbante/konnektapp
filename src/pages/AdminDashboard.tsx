import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, RefreshCw, Search, Filter, Truck, Package } from "lucide-react";
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
import { AdminSupportTickets } from "@/components/admin/AdminSupportTickets";
import { AdminDisputeArbitration } from "@/components/admin/AdminDisputeArbitration";
import { AdminTransporterReputation } from "@/components/admin/AdminTransporterReputation";
import { AdminPermissionsManager } from "@/components/admin/AdminPermissionsManager";
import { AdminDropdownMenu } from "@/components/admin/AdminDropdownMenu";

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
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "in_transit" | "delivered" | "cancelled">("all");

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
    const { data } = await supabase
      .from("gp_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setGps(data || []);
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

  const updateGPStatus = async (gpId: string, newStatus: "verified" | "suspended" | "rejected") => {
    const { error } = await supabase
      .from("gp_profiles")
      .update({ status: newStatus })
      .eq("id", gpId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Statut mis à jour" });
      refreshData();
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
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
      {/* Fixed Admin Header with Dropdown Menu */}
      <div className={`sticky top-0 z-50 ${theme.headerBgClass} ${theme.headerTextClass} shadow-md`}>
        <div className="py-3 px-4">
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
                onClick={refreshData}
                disabled={refreshing}
                className="bg-white/10 border-white/20 hover:bg-white/20"
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
        <div className="px-4 pb-3">
          <div className="relative max-w-7xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <Input
              placeholder="Recherche globale (transporteurs, commandes, tickets...)"
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                      onClick={() => {
                        handleViewDetails(gp.id);
                        setSearchQuery("");
                      }}
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
                        setActiveTab("orders");
                        setSearchQuery(order.order_number);
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
                    <SelectItem value="in_transit">En transit</SelectItem>
                    <SelectItem value="delivered">Livrées</SelectItem>
                    <SelectItem value="cancelled">Annulées</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <AdminPendingGPs 
              gps={gps}
              onVerify={(id) => updateGPStatus(id, "verified")}
              onReject={(id) => updateGPStatus(id, "rejected")}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>

          {/* Stats Charts */}
          <TabsContent value="stats">
            <AdminStatsCharts gps={gps} orders={orders} />
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

          {/* Support Tickets */}
          <TabsContent value="support">
            <AdminSupportTickets />
          </TabsContent>

          {/* Disputes */}
          <TabsContent value="disputes">
            <AdminDisputeArbitration />
          </TabsContent>

          {/* Reputation */}
          <TabsContent value="reputation">
            <AdminTransporterReputation />
          </TabsContent>

          {/* Permissions & Roles */}
          <TabsContent value="permissions">
            <AdminPermissionsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
