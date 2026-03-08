import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plane, Package, AlertTriangle, Clock, CheckCircle,
  TrendingUp, Calendar, Shield, MapPin, ChevronRight,
  Sparkles, Bell, Route, Lock, DollarSign, Eye,
  Luggage, ArrowRightLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { PricingTiersDisplay } from "@/components/gp/PricingTiersDisplay";
import { format, isAfter, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

const FLAGS: Record<string, string> = {
  FR: "🇫🇷", SN: "🇸🇳", CI: "🇨🇮", CM: "🇨🇲", ML: "🇲🇱", US: "🇺🇸", CA: "🇨🇦",
  AE: "🇦🇪", GB: "🇬🇧", BE: "🇧🇪", MA: "🇲🇦", TN: "🇹🇳", GA: "🇬🇦", CG: "🇨🇬",
  DE: "🇩🇪", ES: "🇪🇸", IT: "🇮🇹", CH: "🇨🇭", NL: "🇳🇱", GN: "🇬🇳",
};

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
  baseOriginCountry: string;
  baseDestinationCity: string;
  baseDestinationCountry: string;
  upcomingDepartures: any[];
  customRequests: number;
  ktpLevel: string;
  trustScore: number;
}

export function GPOverviewTab({ gpId, gpProfile }: GPOverviewTabProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<OverviewData>({
    pendingOrders: 0, activeOrders: 0, deliveredOrders: 0, totalRevenue: 0,
    currency: "XOF", basePricePerKg: 0, forfaitValise: 0,
    baseOriginCity: "", baseOriginCountry: "", baseDestinationCity: "", baseDestinationCountry: "",
    upcomingDepartures: [], customRequests: 0, ktpLevel: "inactive", trustScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOverview(); }, [gpId]);

  // Realtime auto-refresh
  useEffect(() => {
    const channel = supabase
      .channel("gp-overview-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOverview())
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_request_responses" }, () => loadOverview())
      .on("postgres_changes", { event: "*", schema: "public", table: "gp_offers" }, () => loadOverview())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gpId]);

  const loadOverview = async () => {
    try {
      const [ordersRes, offersRes, ktpRes, customReqRes, gpRes, tiersRes] = await Promise.all([
        supabase.from("orders").select("status, total_price, currency").eq("gp_id", gpId),
        supabase.from("gp_offers").select("*").eq("gp_id", gpId).eq("status", "active").order("departure_date", { ascending: true }).limit(5),
        supabase.from("ktp_status").select("ktp_level, trust_score").eq("gp_id", gpId).maybeSingle(),
        supabase.from("custom_requests").select("id").in("status", ["open", "has_responses"]),
        supabase.from("gp_profiles").select("default_currency, base_price_per_kg, base_origin_city, base_origin_country, base_destination_city, base_destination_country").eq("id", gpId).single(),
        supabase.from("gp_weight_tiers").select("price_per_kg").eq("gp_id", gpId).eq("min_weight", 23).eq("max_weight", 23).maybeSingle(),
      ]);

      const orders = ordersRes.data || [];
      const pending = orders.filter(o => o.status === "pending").length;
      const active = orders.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length;
      const delivered = orders.filter(o => o.status === "delivered").length;
      const revenue = orders.filter(o => o.status === "delivered").reduce((sum, o) => sum + (o.total_price || 0), 0);
      const upcoming = (offersRes.data || []).filter(o => isAfter(new Date(o.departure_date), startOfDay(new Date())));

      setData({
        pendingOrders: pending, activeOrders: active, deliveredOrders: delivered, totalRevenue: revenue,
        currency: gpRes.data?.default_currency || "XOF",
        basePricePerKg: gpRes.data?.base_price_per_kg || 0,
        forfaitValise: tiersRes.data?.price_per_kg || 0,
        baseOriginCity: gpRes.data?.base_origin_city || "",
        baseOriginCountry: gpRes.data?.base_origin_country || "",
        baseDestinationCity: gpRes.data?.base_destination_city || "",
        baseDestinationCountry: gpRes.data?.base_destination_country || "",
        upcomingDepartures: upcoming,
        customRequests: customReqRes.data?.length || 0,
        ktpLevel: ktpRes.data?.ktp_level || "inactive",
        trustScore: ktpRes.data?.trust_score || 0,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 px-4 py-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  const currencySymbol = getCurrencySymbol(data.currency as any);
  const isPending = gpProfile.status === "pending";
  const getFlag = (code: string) => FLAGS[code] || "🌍";

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Pending Alert */}
      {isPending && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="font-bold text-sm">Compte en attente de validation</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                L'équipe Konnekt vérifie votre profil. Les onglets opérationnels seront débloqués après approbation.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Alerts */}
      {!isPending && (data.pendingOrders > 0 || data.customRequests > 0) && (
        <div className="space-y-2">
          {data.pendingOrders > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate("/gp/demandes")}
            >
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold">{data.pendingOrders} demande{data.pendingOrders > 1 ? "s" : ""} en attente</p>
                <p className="text-xs text-muted-foreground">Répondez rapidement</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          )}
          {data.customRequests > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate("/gp/demandes-personnalisees")}
            >
              <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold">{data.customRequests} demande{data.customRequests > 1 ? "s" : ""} personnalisée{data.customRequests > 1 ? "s" : ""}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Package} label="En attente" value={data.pendingOrders} variant="amber" onClick={() => navigate("/gp/demandes")} />
        <StatCard icon={Clock} label="En cours" value={data.activeOrders} variant="blue" onClick={() => navigate("/gp/en-cours")} />
        <StatCard icon={CheckCircle} label="Livrés" value={data.deliveredOrders} variant="green" onClick={() => navigate("/gp/historique")} />
        <StatCard icon={TrendingUp} label="Revenus" value={`${data.totalRevenue.toLocaleString()} ${currencySymbol}`} variant="primary" />
      </div>

      {/* Navette & Pricing Card */}
      <Card className="border-primary/20 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Profil verrouillé
            </h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/gp/tarification")}>
              <Eye className="w-3 h-3 mr-1" /> Détails
            </Button>
          </div>

          {/* Route visual */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="text-center">
              <span className="text-2xl">{getFlag(data.baseOriginCountry)}</span>
              <p className="text-xs font-semibold mt-0.5">{data.baseOriginCity || "—"}</p>
            </div>
            <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
            <div className="text-center">
              <span className="text-2xl">{getFlag(data.baseDestinationCountry)}</span>
              <p className="text-xs font-semibold mt-0.5">{data.baseDestinationCity || "—"}</p>
            </div>
          </div>

          {/* Pricing summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-background/80">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Prix/kg</p>
              <p className="text-sm font-bold">{data.basePricePerKg > 0 ? `${data.basePricePerKg.toLocaleString()} ${currencySymbol}` : "—"}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-background/80">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Forfait 23kg</p>
              <p className="text-sm font-bold">{data.forfaitValise > 0 ? `${data.forfaitValise.toLocaleString()} ${currencySymbol}` : "—"}</p>
            </div>
          </div>
        </div>

        {data.basePricePerKg > 0 && data.forfaitValise > 0 && (
          <CardContent className="p-4 pt-3">
            <PricingTiersDisplay
              config={{ basePricePerKg: data.basePricePerKg, forfaitValise23kg: data.forfaitValise, currency: data.currency }}
              locked
              compact
            />
          </CardContent>
        )}
      </Card>

      {/* KTP Card */}
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
                <p className="text-sm font-bold">Konnekt Travel Pass</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-xs capitalize">{data.ktpLevel}</Badge>
                  <span className="text-xs text-muted-foreground">Score: {data.trustScore}/100</span>
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
              <Plane className="w-4 h-4" /> Prochains départs
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/gp/calendrier")}>Voir tout</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.upcomingDepartures.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Plane className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun départ planifié</p>
              {!isPending && (
                <Button variant="link" size="sm" onClick={() => navigate("/gp/calendrier")}>Ajouter un voyage</Button>
              )}
            </div>
          ) : (
            data.upcomingDepartures.slice(0, 3).map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => navigate(`/gp/depart/${dep.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{dep.origin_city} → {dep.destination_city}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(dep.departure_date), "EEE d MMM", { locale: fr })}
                      {dep.flight_number && ` · ${dep.flight_number}`}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">{dep.available_capacity} kg</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Stat card subcomponent
function StatCard({ icon: Icon, label, value, variant, onClick }: {
  icon: any; label: string; value: number | string; variant: string; onClick?: () => void;
}) {
  const styles: Record<string, { bg: string; icon: string }> = {
    amber: { bg: "from-amber-500/10 to-amber-500/5 border-amber-500/20", icon: "text-amber-600 dark:text-amber-400" },
    blue: { bg: "from-blue-500/10 to-blue-500/5 border-blue-500/20", icon: "text-blue-600 dark:text-blue-400" },
    green: { bg: "from-green-500/10 to-green-500/5 border-green-500/20", icon: "text-green-600 dark:text-green-400" },
    primary: { bg: "from-primary/10 to-primary/5 border-primary/20", icon: "text-primary" },
  };
  const s = styles[variant] || styles.primary;
  const isText = typeof value === "string";

  return (
    <Card
      className={`bg-gradient-to-br ${s.bg} ${onClick ? "cursor-pointer hover:shadow-md active:scale-[0.98] transition-all" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${s.icon}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`${isText ? "text-sm" : "text-2xl"} font-bold ${s.icon}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
