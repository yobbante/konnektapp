import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Package, Search, Filter, Clock, 
  TrendingUp, RefreshCw 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminOrdersList } from "@/components/admin/AdminOrdersList";
import { AdminDropdownMenu } from "@/components/admin/AdminDropdownMenu";

export default function AdminOrders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "in_transit" | "delivered" | "cancelled">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          gp_profile:gp_profiles(business_name, phone)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter orders by search
  const filteredOrders = orders.filter(order => {
    const matchesSearch = search === "" || 
      order.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      order.origin_city?.toLowerCase().includes(search.toLowerCase()) ||
      order.destination_city?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    inProgress: orders.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length,
    delivered: orders.filter(o => o.status === "delivered").length,
    totalRevenue: orders.reduce((acc, o) => acc + (o.total_price || 0), 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-destructive text-destructive-foreground py-3 px-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/admin")}
              className="text-inherit hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Gestion des Commandes</h1>
              <p className="text-sm opacity-80">{orders.length} commandes au total</p>
            </div>
          </div>
          <AdminDropdownMenu />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-sm text-muted-foreground">En attente</span>
            </div>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">En cours</span>
            </div>
            <p className="text-2xl font-bold">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-sm text-muted-foreground">Livrées</span>
            </div>
            <p className="text-2xl font-bold">{stats.delivered}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-sm text-muted-foreground">Revenus</span>
            </div>
            <p className="text-lg font-bold">{stats.totalRevenue.toLocaleString()} FCFA</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="px-4 py-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher une commande..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={loadOrders}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger>
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les commandes</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="in_transit">En transit</SelectItem>
            <SelectItem value="delivered">Livrées</SelectItem>
            <SelectItem value="cancelled">Annulées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      <div className="px-4 pb-8">
        <AdminOrdersList orders={filteredOrders} filter={filter} />
      </div>
    </div>
  );
}
