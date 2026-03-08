/**
 * RoutierPerformancesPage — Performances dashboard for Routier transporters
 * Premium: basic KPIs | Pro: advanced KPIs
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, TrendingUp, Star, Truck, Lock, Crown, Rocket,
  DollarSign, Percent, Package, CalendarDays, Clock, Weight,
  ArrowUpRight, ArrowDownRight, Zap, Target, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { isGPPremium } from "@/lib/premiumGating";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function RoutierPerformancesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: gp } = await supabase.from("gp_profiles")
        .select("*").eq("user_id", user.id).eq("gp_type", "routier").maybeSingle();
      if (!gp) { navigate("/routier/inscription"); return; }
      setGpProfile(gp);

      if (!isGPPremium(gp.subscription)) { setLoading(false); return; }

      const [ordersRes, reviewsRes] = await Promise.all([
        supabase.from("orders").select("id, status, total_price, weight, currency, created_at, delivered_at")
          .eq("gp_id", gp.id).order("created_at", { ascending: false }).limit(200),
        supabase.from("reviews").select("id, rating, created_at").eq("gp_id", gp.id),
      ]);
      setOrders(ordersRes.data || []);
      setReviews(reviewsRes.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const stats = useMemo(() => {
    const delivered = orders.filter(o => o.status === "delivered" || o.status === "released");
    const totalRevenue = delivered.reduce((s, o) => s + (o.total_price || 0), 0);
    const totalWeight = delivered.reduce((s, o) => s + (o.weight || 0), 0);
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const successRate = orders.length > 0 ? Math.round((delivered.length / orders.length) * 100) : 0;

    // This month
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const thisMonth = delivered.filter(o => {
      const d = new Date(o.created_at);
      return d >= monthStart && d <= monthEnd;
    });
    const monthRevenue = thisMonth.reduce((s, o) => s + (o.total_price || 0), 0);

    // Last month
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const lastMonth = delivered.filter(o => {
      const d = new Date(o.created_at);
      return d >= lastMonthStart && d <= lastMonthEnd;
    });
    const lastMonthRevenue = lastMonth.reduce((s, o) => s + (o.total_price || 0), 0);
    const revenueTrend = lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

    return { delivered: delivered.length, totalRevenue, totalWeight, avgRating, successRate, monthRevenue, revenueTrend, thisMonthCount: thisMonth.length };
  }, [orders, reviews]);

  const isPremium = isGPPremium(gpProfile?.subscription);
  const isPro = gpProfile?.subscription === "pro";
  const currency = gpProfile?.default_currency || "XOF";

  if (loading) return <PageLoader message="Chargement..." />;

  // Not premium → locked view
  if (!isPremium) {
    return (
      <RoutierDashboardLayout gpProfile={gpProfile || { id: "", business_name: "", gp_type: "routier", status: "" }}>
        <div className="px-4 py-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold">Performances Premium</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Accédez à vos statistiques détaillées : revenus, taux de succès, satisfaction client et plus.
          </p>
          <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate("/routier/premium")}>
            <Crown className="w-4 h-4" /> Débloquer les stats
          </Button>
        </div>
      </RoutierDashboardLayout>
    );
  }

  return (
    <RoutierDashboardLayout gpProfile={gpProfile}>
      <div className="px-3 py-3 space-y-3 pb-20">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/routier/parametres")} className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold">Performances</h1>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", isPro ? "border-violet-500/30 text-violet-600 bg-violet-500/10" : "border-amber-500/30 text-amber-600 bg-amber-500/10")}>
            {isPro ? "Pro" : "Premium"}
          </Badge>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-2">
          <KPICard icon={DollarSign} label="Revenus total" value={`${stats.totalRevenue.toLocaleString()}`} unit={currency} color="emerald" />
          <KPICard icon={Package} label="Livraisons" value={`${stats.delivered}`} color="blue" />
          <KPICard icon={Star} label="Note moyenne" value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"} unit="/5" color="amber" />
          <KPICard icon={Target} label="Taux succès" value={`${stats.successRate}%`} color="violet" />
        </div>

        {/* This month */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Ce mois</p>
              <div className={cn("flex items-center gap-0.5 text-[10px] font-bold", stats.revenueTrend >= 0 ? "text-emerald-600" : "text-destructive")}>
                {stats.revenueTrend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(stats.revenueTrend)}%
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{stats.monthRevenue.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">{currency}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{stats.thisMonthCount} livraisons en {format(new Date(), "MMMM", { locale: fr })}</p>
          </CardContent>
        </Card>

        {/* Pro extras */}
        {isPro && (
          <Card className="border-violet-500/20">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-violet-500" />
                <p className="text-xs font-semibold">Stats Pro</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="text-[10px] text-muted-foreground">Poids total</p>
                  <p className="text-sm font-bold">{stats.totalWeight.toLocaleString()} kg</p>
                </div>
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="text-[10px] text-muted-foreground">Avis clients</p>
                  <p className="text-sm font-bold">{reviews.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isPro && (
          <Card className="border-dashed border-violet-500/30">
            <CardContent className="p-4 text-center space-y-2">
              <Rocket className="w-6 h-6 text-violet-500 mx-auto" />
              <p className="text-xs font-semibold">Passez Pro pour des stats avancées</p>
              <Button size="sm" variant="outline" className="text-xs h-7 border-violet-500/30 text-violet-600" onClick={() => navigate("/routier/premium")}>
                Découvrir Pro
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </RoutierDashboardLayout>
  );
}

function KPICard({ icon: Icon, label, value, unit, color }: { icon: any; label: string; value: string; unit?: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600",
    blue: "bg-blue-500/10 text-blue-600",
    amber: "bg-amber-500/10 text-amber-600",
    violet: "bg-violet-500/10 text-violet-600",
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <Card>
      <CardContent className="p-3">
        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center mb-1.5", c.split(" ")[0])}>
          <Icon className={cn("w-3.5 h-3.5", c.split(" ")[1])} />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold">{value}</span>
          {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
        </div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
