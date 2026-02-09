import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plane, Package, AlertTriangle, Clock, CheckCircle,
  TrendingUp, Calendar, Shield, MapPin, ChevronRight,
  Sparkles, Scale, Bell, Route, Lock, DollarSign,
  MessageSquare, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { PricingTiersDisplay } from "@/components/gp/PricingTiersDisplay";
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
  basePricePerKg: number;
  forfaitValise: number;
  baseOriginCity: string;
  baseDestinationCity: string;
  upcomingDepartures: any[];
  customRequests: number;
  unreadMessages: number;
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
    basePricePerKg: 0,
    forfaitValise: 0,
    baseOriginCity: "",
    baseDestinationCity: "",
    upcomingDepartures: [],
    customRequests: 0,
    unreadMessages: 0,
    ktpLevel: "inactive",
    trustScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, [gpId]);

  const loadOverview = async () => {
    try {
      const [ordersRes, offersRes, ktpRes, customReqRes, gpRes, tiersRes] = await Promise.all([
        supabase.from("orders").select("status, total_price, currency").eq("gp_id", gpId),
        supabase.from("gp_offers").select("*").eq("gp_id", gpId).eq("status", "active").order("departure_date", { ascending: true }).limit(5),
        supabase.from("ktp_status").select("ktp_level, trust_score").eq("gp_id", gpId).maybeSingle(),
        supabase.from("custom_request_responses").select("id").eq("gp_id", gpId).eq("status", "pending"),
        supabase.from("gp_profiles").select("default_currency, base_price_per_kg, base_origin_city, base_origin_country, base_destination_city, base_destination_country").eq("id", gpId).single(),
        supabase.from("gp_weight_tiers").select("price_per_kg").eq("gp_id", gpId).eq("min_weight", 23).eq("max_weight", 23).maybeSingle(),
      ]);

      const orders = ordersRes.data || [];
      const pending = orders.filter(o => o.status === "pending").length;
      const active = orders.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length;
      const delivered = orders.filter(o => o.status === "delivered").length;
      const revenue = orders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + (o.total_price || 0), 0);

      const upcoming = (offersRes.data || []).filter(o => 
        isAfter(new Date(o.departure_date), startOfDay(new Date()))
      );

      setData({
        pendingOrders: pending,
        activeOrders: active,
        deliveredOrders: delivered,
        totalRevenue: revenue,
        currency: gpRes.data?.default_currency || "XOF",
        basePricePerKg: gpRes.data?.base_price_per_kg || 0,
        forfaitValise: tiersRes.data?.price_per_kg || 0,
        baseOriginCity: gpRes.data?.base_origin_city || "",
        baseDestinationCity: gpRes.data?.base_destination_city || "",
        upcomingDepartures: upcoming,
        customRequests: customReqRes.data?.length || 0,
        unreadMessages: 0,
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
  const isPending = gpProfile.status === "pending";

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Pending Account Alert */}
      {isPending && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Compte en attente de validation</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Votre compte est en cours de vérification par l'équipe Konnekt. 
                Vous ne pouvez pas encore créer de départs ni recevoir de réservations.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Alerts */}
      {(data.pendingOrders > 0 || data.customRequests > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {data.pendingOrders > 0 && (
            <div
              className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate("/gp/demandes")}
            >
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {data.pendingOrders} demande{data.pendingOrders > 1 ? "s" : ""} en attente
                </p>
                <p className="text-xs text-muted-foreground">Répondez rapidement pour maintenir votre score</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          {data.customRequests > 0 && (
            <div
              className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
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

      {/* Locked GP Info Card — Route + Pricing summary */}
      <Card className="border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Mon profil tarif
            </h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/gp/tarification")}>
              <Eye className="w-3 h-3 mr-1" /> Détails
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Route className="w-3 h-3" /> Navette
              </div>
              <p className="text-sm font-semibold truncate">
                {data.baseOriginCity || "—"} → {data.baseDestinationCity || "—"}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <DollarSign className="w-3 h-3" /> Prix/kg
              </div>
              <p className="text-sm font-semibold">
                {data.basePricePerKg > 0 ? `${data.basePricePerKg.toLocaleString()} ${currencySymbol}` : "—"}
              </p>
            </div>
          </div>

          {data.basePricePerKg > 0 && data.forfaitValise > 0 && (
            <PricingTiersDisplay
              config={{
                basePricePerKg: data.basePricePerKg,
                forfaitValise23kg: data.forfaitValise,
                currency: data.currency,
              }}
              locked
              compact
            />
          )}
        </CardContent>
      </Card>

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
              {!isPending && (
                <Button variant="link" size="sm" onClick={() => navigate("/gp/calendrier")}>
                  Ajouter un voyage
                </Button>
              )}
            </div>
          ) : (
            data.upcomingDepartures.slice(0, 3).map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => navigate("/gp/calendrier")}
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
                      {dep.flight_number && ` · ${dep.flight_number}`}
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
    amber: "text-amber-600 dark:text-amber-400",
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    primary: "text-primary",
  };

  return (
    <Card
      className={`bg-gradient-to-br ${colorMap[color]} ${onClick ? "cursor-pointer hover:shadow-md active:scale-[0.98] transition-all" : ""}`}
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
