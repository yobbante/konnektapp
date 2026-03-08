/**
 * GPPerformancesPage — Dashboard performances
 * Premium: basic KPIs (revenue, fill rate, satisfaction, activity)
 * Pro: all Premium + advanced KPIs (avg order value, response time, weight stats, trends)
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, TrendingUp, Star, Plane, Lock, Crown, Rocket,
  DollarSign, Percent, Package, CalendarDays, Clock, Weight,
  ArrowUpRight, ArrowDownRight, Zap, Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { isGPPremium } from "@/lib/premiumGating";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { format, subMonths, startOfMonth, endOfMonth, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";

export default function GPPerformancesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [responseTracking, setResponseTracking] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status, subscription, kyc_level, default_currency, base_price_per_kg, total_deliveries, rating, total_reviews, base_origin_city, base_destination_city")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { navigate("/gp/inscription"); return; }
      setGpProfile(profile);

      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
      const [ordersRes, offersRes, reviewsRes, trackingRes] = await Promise.all([
        supabase.from("orders").select("id, status, total_price, weight, commission_amount, created_at, currency").eq("gp_id", profile.id),
        supabase.from("gp_offers").select("id, total_capacity, available_capacity, departure_date, status, created_at").eq("gp_id", profile.id).gte("created_at", sixMonthsAgo),
        supabase.from("reviews").select("id, rating, created_at").eq("gp_id", profile.id),
        supabase.from("gp_response_tracking").select("created_at, responded_at, deadline_at").eq("gp_id", profile.id),
      ]);

      setOrders(ordersRes.data || []);
      setOffers(offersRes.data || []);
      setReviews(reviewsRes.data || []);
      setResponseTracking(trackingRes.data || []);
      setPendingCount((ordersRes.data || []).filter(o => o.status === "pending").length);
      setActiveCount((ordersRes.data || []).filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isPremium = isGPPremium(gpProfile?.subscription);
  const isPro = gpProfile?.subscription === "pro";

  const stats = useMemo(() => {
    const delivered = orders.filter(o => ["delivered", "released", "delivery_confirmed"].includes(o.status));
    const cancelled = orders.filter(o => o.status === "cancelled");
    const totalRevenue = delivered.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const totalCommission = delivered.reduce((sum, o) => sum + (o.commission_amount || 0), 0);
    const netRevenue = totalRevenue - totalCommission;

    const completedOffers = offers.filter(o => ["expired", "completed"].includes(o.status) || new Date(o.departure_date) < new Date());
    const totalCap = completedOffers.reduce((sum, o) => sum + (o.total_capacity || 0), 0);
    const usedCap = completedOffers.reduce((sum, o) => sum + ((o.total_capacity || 0) - (o.available_capacity || 0)), 0);
    const fillRate = totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0;

    const monthly: { month: string; revenue: number; orders: number; voyages: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthOrders = delivered.filter(o => {
        const d = new Date(o.created_at);
        return d >= start && d <= end;
      });
      const monthOffers = offers.filter(o => {
        const d = new Date(o.departure_date || o.created_at);
        return d >= start && d <= end;
      });
      monthly.push({
        month: format(date, "MMM", { locale: fr }),
        revenue: monthOrders.reduce((s, o) => s + (o.total_price || 0) - (o.commission_amount || 0), 0),
        orders: monthOrders.length,
        voyages: monthOffers.length,
      });
    }

    const avgRating = reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

    // Pro-only stats
    const avgOrderValue = delivered.length > 0 ? Math.round(totalRevenue / delivered.length) : 0;
    const totalWeight = delivered.reduce((sum, o) => sum + (o.weight || 0), 0);
    const avgWeight = delivered.length > 0 ? Math.round((totalWeight / delivered.length) * 10) / 10 : 0;

    // Response time
    const respondedTracking = responseTracking.filter(t => t.responded_at);
    const avgResponseHours = respondedTracking.length > 0
      ? Math.round(respondedTracking.reduce((sum, t) => sum + differenceInHours(new Date(t.responded_at), new Date(t.created_at)), 0) / respondedTracking.length)
      : 0;
    const responseRate = responseTracking.length > 0
      ? Math.round((respondedTracking.length / responseTracking.length) * 100)
      : 100;

    // Trend: compare last 2 months revenue
    const lastMonthRev = monthly[monthly.length - 1]?.revenue || 0;
    const prevMonthRev = monthly.length >= 2 ? (monthly[monthly.length - 2]?.revenue || 0) : null;
    const revenueTrend = prevMonthRev !== null && prevMonthRev > 0 ? Math.round(((lastMonthRev - prevMonthRev) / prevMonthRev) * 100) : null;

    return {
      totalRevenue, totalCommission, netRevenue,
      totalOrders: orders.length,
      deliveredCount: delivered.length,
      cancelledCount: cancelled.length,
      cancelRate: orders.length > 0 ? Math.round((cancelled.length / orders.length) * 100) : 0,
      fillRate, avgRating, totalReviews: reviews.length, totalVoyages: offers.length,
      monthly,
      // Pro extras
      avgOrderValue, totalWeight, avgWeight,
      avgResponseHours, responseRate, revenueTrend,
      usedCap, totalCap,
    };
  }, [orders, offers, reviews, responseTracking]);

  if (loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  const currency = gpProfile.default_currency || "XOF";
  const sym = getCurrencySymbol(currency as any);

  // ═══ Premium wall ═══
  if (!isPremium) {
    return (
      <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeCount} activeTab="profil">
        <div className="px-4 py-8 flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Performances</h1>
            <p className="text-sm text-muted-foreground max-w-xs">
              Accédez à vos statistiques détaillées : revenus, taux de remplissage, satisfaction et activité.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            <LockedCard icon={DollarSign} label="Revenus & Net" />
            <LockedCard icon={Percent} label="Taux remplissage" />
            <LockedCard icon={Star} label="Satisfaction" />
            <LockedCard icon={Plane} label="Activité voyages" />
          </div>
          <Button className="gap-2" onClick={() => navigate("/gp/premium")}>
            <Crown className="w-4 h-4" /> Passer Premium
          </Button>
        </div>
      </GPDashboardLayout>
    );
  }

  // ═══ Premium + Pro content ═══
  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeCount} activeTab="profil">
      <div className="px-4 py-3 space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Performances</h1>
          </div>
          <Badge variant="outline" className={`text-[10px] gap-1 ${isPro ? "text-violet-600 border-violet-500/30" : "text-amber-600 border-amber-500/30"}`}>
            {isPro ? <Rocket className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
            {isPro ? "Pro" : "Premium"}
          </Badge>
        </div>

        {/* ═══ Revenue KPIs ═══ */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={DollarSign}
            label="Revenu net"
            value={`${stats.netRevenue.toLocaleString()} ${sym}`}
            sub={`Commission: ${stats.totalCommission.toLocaleString()} ${sym}`}
            color="text-emerald-500"
            bg="bg-emerald-500/10"
          />
          <StatCard
            icon={TrendingUp}
            label="Revenu brut"
            value={`${stats.totalRevenue.toLocaleString()} ${sym}`}
            sub={`${stats.deliveredCount} livraisons`}
            color="text-blue-500"
            bg="bg-blue-500/10"
          />
        </div>

        {/* ═══ PRO: Advanced KPIs row ═══ */}
        {isPro && (
          <div className="grid grid-cols-3 gap-2">
            <MiniKPI
              icon={Target}
              label="Panier moyen"
              value={`${stats.avgOrderValue.toLocaleString()} ${sym}`}
              color="text-violet-500"
            />
            <MiniKPI
              icon={Weight}
              label="Poids moyen"
              value={`${stats.avgWeight} kg`}
              color="text-violet-500"
            />
            <MiniKPI
              icon={Package}
              label="Poids total"
              value={`${stats.totalWeight.toLocaleString()} kg`}
              color="text-violet-500"
            />
          </div>
        )}

        {/* ═══ PRO: Revenue trend ═══ */}
        {isPro && stats.revenueTrend !== null && (
          <Card className="border-violet-500/20 bg-violet-500/5">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stats.revenueTrend >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-destructive" />
                )}
                <span className="text-xs font-medium">Tendance revenus</span>
              </div>
              <span className={`text-sm font-bold ${stats.revenueTrend >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                {stats.revenueTrend >= 0 ? "+" : ""}{stats.revenueTrend}%
              </span>
              <span className="text-[10px] text-muted-foreground">vs mois précédent</span>
            </CardContent>
          </Card>
        )}

        {/* ═══ Fill rate ═══ */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              Taux de remplissage
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.fillRate}%</span>
              <span className="text-xs text-muted-foreground">{stats.totalVoyages} voyages</span>
            </div>
            <Progress value={stats.fillRate} className="h-2" />
            <p className="text-[10px] text-muted-foreground">
              {isPro
                ? `${stats.usedCap} kg utilisés sur ${stats.totalCap} kg proposés`
                : "Capacité utilisée vs. capacité totale proposée"}
            </p>
          </CardContent>
        </Card>

        {/* ═══ PRO: Response time ═══ */}
        {isPro && (
          <Card className="border-violet-500/20">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-500" />
                Réactivité
                <Badge className="ml-auto bg-violet-500/15 text-violet-600 border-violet-500/30 text-[8px] h-4 px-1.5">Pro</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.avgResponseHours}h</p>
                  <p className="text-[10px] text-muted-foreground">Temps de réponse moyen</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.responseRate}%</p>
                  <p className="text-[10px] text-muted-foreground">Taux de réponse</p>
                </div>
              </div>
              <Progress value={stats.responseRate} className="h-1.5 mt-3" />
            </CardContent>
          </Card>
        )}

        {/* ═══ Satisfaction ═══ */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Satisfaction clients
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <span className="text-3xl font-bold">{stats.avgRating.toFixed(1)}</span>
                <span className="text-lg text-amber-500">/5</span>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = reviews.filter(r => Math.round(r.rating) === star).length;
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[10px] w-3 text-right text-muted-foreground">{star}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] w-5 text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">{stats.totalReviews} avis au total</p>
          </CardContent>
        </Card>

        {/* ═══ Activity ═══ */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Activité (6 mois)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="flex items-end gap-1.5 h-24">
              {stats.monthly.map((m, i) => {
                const maxRev = Math.max(...stats.monthly.map(x => x.revenue), 1);
                const h = Math.max(8, (m.revenue / maxRev) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t transition-all ${isPro ? "bg-violet-500/80" : "bg-primary/80"}`}
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{m.month}</span>
                  </div>
                );
              })}
            </div>

            <div className={`grid gap-2 pt-2 border-t ${isPro ? "grid-cols-4" : "grid-cols-3"}`}>
              <MiniStat label="Commandes" value={stats.deliveredCount.toString()} />
              <MiniStat label="Annulations" value={`${stats.cancelRate}%`} negative={stats.cancelRate > 10} />
              <MiniStat label="Voyages" value={stats.totalVoyages.toString()} />
              {isPro && (
                <MiniStat label="Réponse" value={`${stats.avgResponseHours}h`} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* ═══ PRO: Commission savings ═══ */}
        {isPro && (
          <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-violet-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold">Économies Pro</p>
                <p className="text-[10px] text-muted-foreground">
                  Commission réduite de 40% — vous économisez{" "}
                  <span className="font-bold text-violet-600">
                    {Math.round(stats.totalCommission * 0.4).toLocaleString()} {sym}
                  </span>
                  {" "}sur vos livraisons
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </GPDashboardLayout>
  );
}

/* ─── Helpers ─── */
function StatCard({ icon: Icon, label, value, sub, color, bg }: {
  icon: any; label: string; value: string; sub: string; color: string; bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 space-y-1.5">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
        <p className="text-[9px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function MiniKPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card className="border-violet-500/15">
      <CardContent className="p-2.5 text-center space-y-1">
        <Icon className={`w-3.5 h-3.5 mx-auto ${color}`} />
        <p className="text-xs font-bold">{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-bold ${negative ? "text-destructive" : ""}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

function LockedCard({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <Card className="opacity-50">
      <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
        <Lock className="w-3 h-3 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
