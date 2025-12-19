import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Users, Package, Truck, TrendingUp, CheckCircle, XCircle, 
  Eye, MoreHorizontal, Search, Filter, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  city: string;
  phone: string;
  status: string;
  created_at: string;
  total_deliveries: number;
  rating: number;
}

interface Order {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  status: string;
  total_price: number;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gps, setGps] = useState<GPProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalGps: 0,
    pendingGps: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

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

      // Check if user has admin role using the has_role function
      const { data: hasRole, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (error || !hasRole) {
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les permissions administrateur",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await Promise.all([fetchGPs(), fetchOrders(), fetchStats()]);
    } catch (error) {
      console.error("Admin check error:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
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
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const [gpsResult, ordersResult] = await Promise.all([
        supabase.from("gp_profiles").select("id, status"),
        supabase.from("orders").select("id, total_price"),
      ]);

      const totalGps = gpsResult.data?.length || 0;
      const pendingGps = gpsResult.data?.filter(g => g.status === "pending").length || 0;
      const totalOrders = ordersResult.data?.length || 0;
      const totalRevenue = ordersResult.data?.reduce((acc, o) => acc + (o.total_price || 0), 0) || 0;

      setStats({ totalGps, pendingGps, totalOrders, totalRevenue });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const updateGPStatus = async (gpId: string, status: "verified" | "suspended" | "rejected") => {
    try {
      const { error } = await supabase
        .from("gp_profiles")
        .update({ status, verified_at: status === "verified" ? new Date().toISOString() : null })
        .eq("id", gpId);

      if (error) throw error;

      toast({ title: "Statut mis à jour" });
      fetchGPs();
      fetchStats();
    } catch (error) {
      console.error("Error updating GP:", error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const filteredGPs = gps.filter(
    (gp) =>
      gp.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gp.city.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Gestion de la plateforme</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="mobile-card">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">GPs Total</span>
            </div>
            <p className="text-xl font-bold">{stats.totalGps}</p>
            {stats.pendingGps > 0 && (
              <Badge variant="default" className="mt-1 text-xs">
                {stats.pendingGps} en attente
              </Badge>
            )}
          </div>
          <div className="mobile-card">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Commandes</span>
            </div>
            <p className="text-xl font-bold">{stats.totalOrders}</p>
          </div>
          <div className="mobile-card col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Revenus totaux</span>
            </div>
            <p className="text-xl font-bold">{stats.totalRevenue.toLocaleString()} FCFA</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="gps">GPs</TabsTrigger>
            <TabsTrigger value="orders">Commandes</TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="mobile-card">
              <h3 className="font-semibold mb-3">GPs en attente de validation</h3>
              {gps.filter(g => g.status === "pending").slice(0, 5).map((gp) => (
                <div key={gp.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-sm">{gp.business_name}</p>
                    <p className="text-xs text-muted-foreground">{gp.city}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => updateGPStatus(gp.id, "verified")}
                    >
                      <CheckCircle className="w-4 h-4 text-success" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => updateGPStatus(gp.id, "rejected")}
                    >
                      <XCircle className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {gps.filter(g => g.status === "pending").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun GP en attente
                </p>
              )}
            </div>
          </TabsContent>

          {/* GPs */}
          <TabsContent value="gps" className="space-y-3">
            {filteredGPs.map((gp) => (
              <motion.div
                key={gp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mobile-card"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{gp.business_name}</p>
                    <p className="text-xs text-muted-foreground">{gp.city} • {gp.gp_type}</p>
                  </div>
                  <Badge variant={
                    gp.status === "verified" ? "success" :
                    gp.status === "pending" ? "default" :
                    "destructive"
                  }>
                    {gp.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {format(new Date(gp.created_at), "d MMM yyyy", { locale: fr })}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => updateGPStatus(gp.id, "verified")}>
                        <CheckCircle className="w-4 h-4 mr-2" /> Valider
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateGPStatus(gp.id, "suspended")}>
                        <XCircle className="w-4 h-4 mr-2" /> Suspendre
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders" className="space-y-3">
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mobile-card"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.origin_city} → {order.destination_city}
                    </p>
                  </div>
                  <Badge variant={
                    order.status === "delivered" ? "success" :
                    order.status === "in_transit" ? "default" :
                    order.status === "cancelled" ? "destructive" :
                    "secondary"
                  }>
                    {order.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-primary">
                    {order.total_price.toLocaleString()} FCFA
                  </span>
                  <span className="text-muted-foreground">
                    {format(new Date(order.created_at), "d MMM", { locale: fr })}
                  </span>
                </div>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
