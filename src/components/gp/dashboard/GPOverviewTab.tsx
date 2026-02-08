import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plane, Package, AlertTriangle, Clock, CheckCircle,
  TrendingUp, Calendar, Shield, MapPin, ChevronRight,
  Sparkles, Scale, Bell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { format, isAfter, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface GPOverviewTabProps {
  gpId: string;
  gpProfile: {
    id: string;
    business_name: string;
    gp_type: string;
    status: string;
  };
}

interface OverviewData {
  pendingOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  currency: string;
  upcomingDepartures: any[];
  recentAlerts: any[];
  customRequests: number;
  ktpLevel: string;
  trustScore: number;
}

export function GPOverviewTab({ gpId, gpProfile }: GPOverviewTabProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<OverviewData>({
    pendingOrders: 0,
    activeOrders: 0,
    deliveredOrders: 0,
    totalRevenue: 0,
    currency: "XOF",
    upcomingDepartures: [],
    recentAlerts: [],
    customRequests: 0,
    ktpLevel: "inactive",
    trustScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, [gpId]);

  const loadOverview = async () => {
    try {
      // Load all data in parallel
      const [ordersRes, offersRes, ktpRes, customReqRes, gpRes] = await Promise.all([
        supabase.from("orders").select("status, total_price, currency").eq("gp_id", gpId),
        supabase.from("gp_offers").select("*").eq("gp_id", gpId).eq("status", "active").order("departure_date", { ascending: true }).limit(5),
        supabase.from("ktp_status").select("ktp_level, trust_score").eq("gp_id", gpId).maybeSingle(),
        supabase.from("custom_request_responses").select("id").eq("gp_id", gpId).eq("status", "pending"),
        supabase.from("gp_profiles").select("default_currency").eq("id", gpId).single(),
      ]);

      const orders = ordersRes.data || [];
      const pending = orders.filter(o => o.status === "pending").length;
      const active = orders.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length;
      const delivered = orders.filter(o => o.status === "delivered").length;
      const revenue = orders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + (o.total_price || 0), 0);

      // Filter future departures
      const upcoming = (offersRes.data || []).filter(o => 
        isAfter(new Date(o.departure_date), startOfDay(new Date()))
      );

      setData({
        pendingOrders: pending,
        activeOrders: active,
        deliveredOrders: delivered,
        totalRevenue: revenue,
        currency: gpRes.data?.default_currency || "XOF",
        upcomingDepartures: upcoming,
        recentAlerts: [],
        customRequests: customReqRes.data?.length || 0,
        ktpLevel: ktpRes.data?.ktp_level || "inactive",
        trustScore: ktpRes.data?.trust_score || 0,
      });
    } catch (error) {
      console.error("Error loading overview:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 px-4 py-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const currencySymbol = getCurrencySymbol(data.currency as any);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Alerts Section */}
      {(data.pendingOrders > 0 || data.customRequests > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {data.pendingOrders > 0 && (
            <div
              className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/gp/demandes")}
            >
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {data.pendingOrders} demande{data.pendingOrders > 1 ? "s" : ""} en attente
                </p>
                <p className="text-xs text-muted-foreground">Répondez vite pour votre score</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          {data.customRequests > 0 && (
            <div
              className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/gp/demandes-personnalisees")}
            >
              <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {data.customRequests} demande{data.customRequests > 1 ? "s" : ""} personnalisée{data.customRequests > 1 ? "s" : ""}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <QuickStat
          icon={Package}
          label="En attente"
          value={data.pendingOrders}
          color="amber"
          onClick={() => navigate("/gp/demandes")}
        />
        <QuickStat
          icon={Clock}
          label="En cours"
          value={data.activeOrders}
          color="blue"
          onClick={() => navigate("/gp/en-cours")}
        />
        <QuickStat
          icon={CheckCircle}
          label="Livrés"
          value={data.deliveredOrders}
          color="green"
          onClick={() => navigate("/gp/historique")}
        />
        <QuickStat
          icon={TrendingUp}
          label="Revenus"
          value={`${data.totalRevenue.toLocaleString()} ${currencySymbol}`}
          color="primary"
          isText
        />
      </div>

      {/* KTP & GeoTrack Summary */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate("/gp/ktp-geotrack")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Konnekt Travel Pass</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {data.ktpLevel}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Score: {data.trustScore}/100
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Departures */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Plane className="w-4 h-4" />
              Prochains départs
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/gp/calendrier")}>
              Voir tout
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.upcomingDepartures.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Plane className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun départ planifié</p>
              <Button variant="link" size="sm" onClick={() => navigate("/gp/calendrier")}>
                Ajouter un voyage
              </Button>
            </div>
          ) : (
            data.upcomingDepartures.slice(0, 3).map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {dep.origin_city} → {dep.destination_city}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(dep.departure_date), "EEE d MMM", { locale: fr })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {dep.available_capacity} kg
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Quick stat card component
function QuickStat({
  icon: Icon,
  label,
  value,
  color,
  onClick,
  isText = false,
}: {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  onClick?: () => void;
  isText?: boolean;
}) {
  const colorMap: Record<string, string> = {
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    green: "from-green-500/10 to-green-500/5 border-green-500/20",
    primary: "from-primary/10 to-primary/5 border-primary/20",
  };

  const iconColorMap: Record<string, string> = {
    amber: "text-amber-600",
    blue: "text-blue-600",
    green: "text-green-600",
    primary: "text-primary",
  };

  return (
    <Card
      className={`bg-gradient-to-br ${colorMap[color]} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${iconColorMap[color]}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`${isText ? "text-base" : "text-2xl"} font-bold ${iconColorMap[color]}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
