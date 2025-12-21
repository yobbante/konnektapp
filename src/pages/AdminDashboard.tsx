import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Search, Filter, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { AdminGPList } from "@/components/admin/AdminGPList";
import { AdminOrdersList } from "@/components/admin/AdminOrdersList";
import { AdminPendingGPs } from "@/components/admin/AdminPendingGPs";

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  city: string;
  phone: string;
  whatsapp?: string;
  status: string;
  created_at: string;
  verified_at?: string;
  total_deliveries: number;
  rating: number;
  total_reviews: number;
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
  total_price: number;
  commission_amount: number;
  weight: number;
  created_at: string;
  gp_profile?: {
    business_name: string;
  };
}

interface AdminStats {
  totalGps: number;
  pendingGps: number;
  verifiedGps: number;
  suspendedGps: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  commissions: number;
  avgRating: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gps, setGps] = useState<GPProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<AdminStats>({
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [gpFilter, setGpFilter] = useState<"all" | "pending" | "verified" | "suspended">("all");
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "in_transit" | "delivered" | "cancelled">("all");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Vérifier si l'utilisateur a accès admin (admin ou moderator)
      const { data: hasAccess, error } = await supabase.rpc("has_admin_access", {
        _user_id: user.id,
      });

      if (error || !hasAccess) {
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les permissions administrateur",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await refreshData();
    } catch (error) {
      console.error("Admin check error:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchGPs(), fetchOrders(), fetchStats()]);
    setRefreshing(false);
  };

  const fetchGPs = async () => {
    try {
      const { data, error } = await supabase
        .from("gp_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGps(data || []);
    } catch (error) {
      console.error("Error fetching GPs:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          gp_profile:gp_profiles(business_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const [gpsResult, ordersResult] = await Promise.all([
        supabase.from("gp_profiles").select("id, status, rating"),
        supabase.from("orders").select("id, total_price, commission_amount, status"),
      ]);

      const gpsData = gpsResult.data || [];
      const ordersData = ordersResult.data || [];

      const ratings = gpsData.filter(g => g.rating > 0).map(g => g.rating);
      const avgRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0;

      setStats({
        totalGps: gpsData.length,
        pendingGps: gpsData.filter(g => g.status === "pending").length,
        verifiedGps: gpsData.filter(g => g.status === "verified").length,
        suspendedGps: gpsData.filter(g => g.status === "suspended").length,
        totalOrders: ordersData.length,
        pendingOrders: ordersData.filter(o => !["delivered", "cancelled"].includes(o.status)).length,
        deliveredOrders: ordersData.filter(o => o.status === "delivered").length,
        totalRevenue: ordersData.reduce((acc, o) => acc + (o.total_price || 0), 0),
        commissions: ordersData.reduce((acc, o) => acc + (o.commission_amount || 0), 0),
        avgRating,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const updateGPStatus = async (gpId: string, status: "verified" | "suspended" | "rejected", reason?: string) => {
    try {
      const updateData: Record<string, any> = { 
        status, 
        verified_at: status === "verified" ? new Date().toISOString() : null 
      };

      const { error } = await supabase
        .from("gp_profiles")
        .update(updateData)
        .eq("id", gpId);

      if (error) throw error;

      const statusLabels = {
        verified: "validé",
        suspended: "suspendu",
        rejected: "rejeté"
      };

      toast({ 
        title: `Transporteur ${statusLabels[status]}`,
        description: reason ? `Raison: ${reason}` : undefined
      });

      await refreshData();
    } catch (error) {
      console.error("Error updating GP:", error);
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
    }
  };

  const handleViewDetails = (gpId: string) => {
    navigate(`/admin/gp/${gpId}`);
  };

  const filteredGPs = gps.filter(
    (gp) =>
      gp.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gp.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gp.phone.includes(searchQuery)
  );

  const filteredOrders = orders.filter(
    (order) =>
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.origin_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.destination_city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Gestion de la plateforme</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Stats */}
        <AdminStatsCards stats={stats} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="gps">
              GPs {stats.pendingGps > 0 && `(${stats.pendingGps})`}
            </TabsTrigger>
            <TabsTrigger value="orders">Commandes</TabsTrigger>
          </TabsList>

          {/* Search and Filters */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {activeTab === "gps" && (
              <Select value={gpFilter} onValueChange={(v: any) => setGpFilter(v)}>
                <SelectTrigger className="w-[130px]">
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
                <SelectTrigger className="w-[130px]">
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

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <AdminPendingGPs 
              gps={gps}
              onVerify={(id) => updateGPStatus(id, "verified")}
              onReject={(id) => updateGPStatus(id, "rejected")}
              onViewDetails={handleViewDetails}
            />
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
        </Tabs>
      </div>
    </div>
  );
}
