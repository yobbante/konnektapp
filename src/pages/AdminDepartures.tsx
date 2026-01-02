import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Calendar, MapPin, Truck, Filter, Search, 
  ChevronRight, Clock, Package, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Departure {
  id: string;
  departure_date: string;
  arrival_date: string | null;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  available_capacity: number;
  total_capacity: number;
  price_per_kg: number;
  currency: string;
  status: string;
  transport_type: string;
  bookings_count: number | null;
  gp_profile: {
    business_name: string;
    phone: string;
    city: string;
    rating: number;
  } | null;
}

export default function AdminDepartures() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isModerator, loading: roleLoading } = useUserRole();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "expired">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");

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
      fetchDepartures();
    }
  }, [isAdmin, isModerator, roleLoading]);

  const fetchDepartures = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("gp_offers")
        .select(`
          *,
          gp_profile:gp_profiles(business_name, phone, city, rating)
        `)
        .order("departure_date", { ascending: true });

      if (error) throw error;
      setDepartures(data || []);
    } catch (error: any) {
      console.error("Error fetching departures:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les départs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return { start: now, end: new Date(now.getTime() + 24 * 60 * 60 * 1000) };
      case "week":
        return { start: now, end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) };
      case "month":
        return { start: now, end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) };
      default:
        return null;
    }
  };

  const filteredDepartures = departures.filter(dep => {
    const matchesSearch = 
      dep.origin_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dep.destination_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dep.gp_profile?.business_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || dep.status === statusFilter;
    
    const dateRange = getDateRange();
    let matchesDate = true;
    if (dateRange) {
      const depDate = new Date(dep.departure_date);
      matchesDate = depDate >= dateRange.start && depDate <= dateRange.end;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge variant="success">Actif</Badge>;
      case "paused": return <Badge variant="warning">Pausé</Badge>;
      case "expired": return <Badge variant="secondary">Expiré</Badge>;
      case "completed": return <Badge variant="default">Terminé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTransportIcon = (type: string) => {
    return <Truck className="w-4 h-4" />;
  };

  const stats = {
    total: departures.length,
    active: departures.filter(d => d.status === "active").length,
    today: departures.filter(d => {
      const depDate = new Date(d.departure_date);
      const now = new Date();
      return depDate.toDateString() === now.toDateString();
    }).length,
    thisWeek: departures.filter(d => {
      const depDate = new Date(d.departure_date);
      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return depDate >= now && depDate <= weekEnd;
    }).length,
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md">
        <div className="py-3 px-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
                className="bg-white/10 hover:bg-white/20"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Départs</h1>
                <p className="text-sm opacity-80">Gestion des trajets</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={fetchDepartures}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mobile-card text-center"
          >
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mobile-card text-center"
          >
            <p className="text-2xl font-bold text-success">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Actifs</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mobile-card text-center"
          >
            <p className="text-2xl font-bold text-warning">{stats.today}</p>
            <p className="text-xs text-muted-foreground">Aujourd'hui</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mobile-card text-center"
          >
            <p className="text-2xl font-bold text-secondary">{stats.thisWeek}</p>
            <p className="text-xs text-muted-foreground">Cette semaine</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher ville, transporteur..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="paused">Pausés</SelectItem>
              <SelectItem value="expired">Expirés</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes dates</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Departures List */}
        <div className="space-y-3">
          {filteredDepartures.length === 0 ? (
            <Card className="p-8 text-center">
              <Truck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun départ trouvé</p>
            </Card>
          ) : (
            filteredDepartures.map((dep, index) => (
              <motion.div
                key={dep.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card 
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/admin/gp/${dep.gp_profile?.business_name ? dep.id : ""}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {getTransportIcon(dep.transport_type)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{dep.gp_profile?.business_name || "Transporteur"}</p>
                        <p className="text-xs text-muted-foreground">{dep.gp_profile?.city}</p>
                      </div>
                    </div>
                    {getStatusBadge(dep.status)}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">{dep.origin_city}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{dep.destination_city}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Calendar className="w-3 h-3" />
                        <span className="text-xs">Départ</span>
                      </div>
                      <p className="text-sm font-medium">
                        {format(new Date(dep.departure_date), "dd MMM", { locale: fr })}
                      </p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Package className="w-3 h-3" />
                        <span className="text-xs">Capacité</span>
                      </div>
                      <p className="text-sm font-medium">
                        {dep.available_capacity}/{dep.total_capacity} kg
                      </p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">Prix/kg</span>
                      </div>
                      <p className="text-sm font-medium text-primary">
                        {dep.price_per_kg.toLocaleString()} {dep.currency}
                      </p>
                    </div>
                  </div>

                  {(dep.bookings_count ?? 0) > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Badge variant="secondary" className="text-xs">
                        {dep.bookings_count} réservation{(dep.bookings_count ?? 0) > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
