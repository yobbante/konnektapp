/**
 * GPPerformancesPage — Dashboard performances (Premium only)
 * KPIs: Revenus, Taux de remplissage, Satisfaction, Activité
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, TrendingUp, Star, Plane, Lock, Crown,
  DollarSign, Percent, Package, CalendarDays,
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
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status, subscription, kyc_level, default_currency, base_price_per_kg, total_deliveries, rating, total_reviews")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { navigate("/gp/inscription"); return; }
      setGpProfile(profile);

      // Fetch all data in parallel
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
      const [ordersRes, offersRes, reviewsRes] = await Promise.all([
        supabase.from("orders").select("id, status, total_price, weight, commission_amount, created_at, currency").eq("gp_id", profile.id),
        supabase.from("gp_offers").select("id, total_capacity, available_capacity, departure_date, status, created_at").eq("gp_id", profile.id).gte("created_at", sixMonthsAgo),
        supabase.from("reviews").select("id, rating, created_at").eq("gp_id", profile.id),
      ]);

      setOrders(ordersRes.data || []);
      setOffers(offersRes.data || []);
      setReviews(reviewsRes.data || []);
      setPendingCount((ordersRes.data || []).filter(o => o.status === "pending").length);
      setActiveCount((ordersRes.data || []).filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isPremium = isGPPremium(gpProfile?.subscription);

  // ═══ KPI calculations ═══
  const stats = useMemo(() => {
    const delivered = orders.filter(o => ["delivered", "released", "delivery_confirmed"].includes(o.status));
    const cancelled = orders.filter(o => o.status === "cancelled");
    const totalRevenue = delivered.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const totalCommission = delivered.reduce((sum, o) => sum + (o.commission_amount || 0), 0);
    const netRevenue = totalRevenue - totalCommission;

    // Fill rate: used capacity / total capacity
    const completedOffers = offers.filter(o => ["expired", "completed"].includes(o.status) || new Date(o.departure_date) < new Date());
    const totalCap = completedOffers.reduce((sum, o) => sum + (o.total_capacity || 0), 0);
    const usedCap = completedOffers.reduce((sum, o) => sum + ((o.total_capacity || 0) - (o.available_capacity || 0)), 0);
    const fillRate = totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0;

    // Monthly breakdown (last 6 months)
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

    // Average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

    return {
      totalRevenue,
      totalCommission,
      netRevenue,
      totalOrders: orders.length,
      deliveredCount: delivered.length,
      cancelledCount: cancelled.length,
      cancelRate: orders.length > 0 ? Math.round((cancelled.length / orders.length) * 100) : 0,
      fillRate,
      avgRating,
      totalReviews: reviews.length,
      totalVoyages: offers.length,
      monthly,
    };
  }, [orders, offers, reviews]);

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
          <Button className="gap-2" onClick={() => navigate("/gp/parametres?section=premium")}>
            <Crown className="w-4 h-4" /> Passer Premium
          </Button>
        </div>
      </GPDashboardLayout>
    );
  }

  // ═══ Premium content ═══
  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeCount} activeTab="profil">
      <div className="px-4 py-3 space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Performances</h1>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-500/30">
            <Crown className="w-3 h-3" /> Premium
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
              Capacité utilisée vs. capacité totale proposée
            </p>
          </CardContent>
        </Card>

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
            {/* Mini bar chart */}
            <div className="flex items-end gap-1.5 h-24">
              {stats.monthly.map((m, i) => {
                const maxRev = Math.max(...stats.monthly.map(x => x.revenue), 1);
                const h = Math.max(8, (m.revenue / maxRev) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-primary/80 transition-all"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{m.month}</span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
              <MiniStat label="Commandes" value={stats.deliveredCount.toString()} />
              <MiniStat label="Annulations" value={`${stats.cancelRate}%`} negative={stats.cancelRate > 10} />
              <MiniStat label="Voyages" value={stats.totalVoyages.toString()} />
            </div>
          </CardContent>
        </Card>
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
