import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";
import { 
  TrendingUp, TrendingDown, Package, Wallet, Users, Eye, 
  MousePointer, Target, Calendar, ArrowUp, ArrowDown, Minus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface AdvancedAnalyticsDashboardProps {
  gpId: string;
  orders: any[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))'];

export function AdvancedAnalyticsDashboard({ gpId, orders }: AdvancedAnalyticsDashboardProps) {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    loadOffers();
  }, [gpId]);

  const loadOffers = async () => {
    try {
      const { data } = await supabase
        .from("gp_offers")
        .select("*")
        .eq("gp_id", gpId);
      setOffers(data || []);
    } catch (error) {
      console.error("Error loading offers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate period dates
  const getPeriodDays = () => {
    switch (selectedPeriod) {
      case "7d": return 7;
      case "30d": return 30;
      case "90d": return 90;
    }
  };

  const periodDays = getPeriodDays();
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Filter data for selected period
  const periodOrders = orders.filter(o => new Date(o.created_at) >= periodStart);
  const periodOffers = offers.filter(o => new Date(o.created_at) >= periodStart);

  // Previous period for comparison
  const prevPeriodStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const prevPeriodOrders = orders.filter(o => {
    const date = new Date(o.created_at);
    return date >= prevPeriodStart && date < periodStart;
  });

  // Calculate KPIs
  const totalRevenue = periodOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total_price || 0), 0);
  
  const prevRevenue = prevPeriodOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total_price || 0), 0);
  
  const revenueChange = prevRevenue > 0 
    ? ((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
    : 0;

  const totalOrders = periodOrders.length;
  const prevTotalOrders = prevPeriodOrders.length;
  const ordersChange = prevTotalOrders > 0 
    ? ((totalOrders - prevTotalOrders) / prevTotalOrders * 100).toFixed(1)
    : 0;

  const totalViews = offers.reduce((sum, o) => sum + (o.views_count || 0), 0);
  const totalBookings = offers.reduce((sum, o) => sum + (o.bookings_count || 0), 0);
  const conversionRate = totalViews > 0 ? ((totalBookings / totalViews) * 100).toFixed(1) : 0;

  const uniqueClients = [...new Set(periodOrders.map(o => o.client_id))].length;
  const prevUniqueClients = [...new Set(prevPeriodOrders.map(o => o.client_id))].length;
  const clientsChange = prevUniqueClients > 0 
    ? ((uniqueClients - prevUniqueClients) / prevUniqueClients * 100).toFixed(1)
    : 0;

  // Daily data for charts
  const dailyData = Array.from({ length: Math.min(periodDays, 30) }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (Math.min(periodDays, 30) - 1 - i));
    const dateStr = date.toISOString().split('T')[0];
    const dayOrders = periodOrders.filter(o => o.created_at?.split('T')[0] === dateStr);
    
    return {
      date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      commandes: dayOrders.length,
      revenue: dayOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total_price || 0), 0) / 1000,
      volume: dayOrders.reduce((sum, o) => sum + (o.weight || 0), 0),
    };
  });

  // Route performance
  const routePerformance = offers.reduce((acc: any[], offer) => {
    const route = `${offer.origin_city} → ${offer.destination_city}`;
    const existing = acc.find(r => r.route === route);
    if (existing) {
      existing.views += offer.views_count || 0;
      existing.bookings += offer.bookings_count || 0;
      existing.offers += 1;
    } else {
      acc.push({
        route,
        views: offer.views_count || 0,
        bookings: offer.bookings_count || 0,
        offers: 1,
      });
    }
    return acc;
  }, []).sort((a, b) => b.bookings - a.bookings).slice(0, 5);

  // Status distribution
  const statusDistribution = [
    { name: 'En attente', value: periodOrders.filter(o => o.status === 'pending').length, color: COLORS[2] },
    { name: 'Acceptées', value: periodOrders.filter(o => o.status === 'accepted').length, color: COLORS[0] },
    { name: 'En transit', value: periodOrders.filter(o => ['collected', 'in_transit'].includes(o.status)).length, color: COLORS[4] },
    { name: 'Livrées', value: periodOrders.filter(o => o.status === 'delivered').length, color: COLORS[1] },
    { name: 'Annulées', value: periodOrders.filter(o => o.status === 'cancelled').length, color: COLORS[3] },
  ].filter(s => s.value > 0);

  // Render change indicator
  const ChangeIndicator = ({ value }: { value: string | number }) => {
    const numValue = parseFloat(String(value));
    if (numValue > 0) {
      return (
        <span className="flex items-center gap-1 text-success text-xs">
          <ArrowUp className="w-3 h-3" />
          +{value}%
        </span>
      );
    } else if (numValue < 0) {
      return (
        <span className="flex items-center gap-1 text-destructive text-xs">
          <ArrowDown className="w-3 h-3" />
          {value}%
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-muted-foreground text-xs">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Analytiques avancées</h3>
        <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="7d" className="text-xs px-2 h-6">7 jours</TabsTrigger>
            <TabsTrigger value="30d" className="text-xs px-2 h-6">30 jours</TabsTrigger>
            <TabsTrigger value="90d" className="text-xs px-2 h-6">90 jours</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-success" />
            </div>
            <ChangeIndicator value={revenueChange} />
          </div>
          <p className="text-xs text-muted-foreground">Revenus</p>
          <p className="text-lg font-bold text-foreground">
            {totalRevenue.toLocaleString()} <span className="text-xs font-normal">FCFA</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <ChangeIndicator value={ordersChange} />
          </div>
          <p className="text-xs text-muted-foreground">Commandes</p>
          <p className="text-lg font-bold text-foreground">{totalOrders}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-secondary" />
            </div>
            <Badge variant="outline" className="text-[10px]">{totalViews} vues</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Taux conversion</p>
          <p className="text-lg font-bold text-foreground">{conversionRate}%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-accent" />
            </div>
            <ChangeIndicator value={clientsChange} />
          </div>
          <p className="text-xs text-muted-foreground">Clients uniques</p>
          <p className="text-lg font-bold text-foreground">{uniqueClients}</p>
        </motion.div>
      </div>

      {/* Revenue & Orders Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl border border-border p-4"
      >
        <h4 className="font-semibold text-foreground text-sm mb-4">Évolution des revenus</h4>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value}K FCFA`, 'Revenus']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Orders Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-card rounded-xl border border-border p-4"
      >
        <h4 className="font-semibold text-foreground text-sm mb-4">Volume quotidien</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="commandes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Commandes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Distribution */}
        {statusDistribution.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <h4 className="font-semibold text-foreground text-sm mb-4">Statuts commandes</h4>
            <div className="flex items-center gap-4">
              <div className="w-28 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {statusDistribution.map((status) => (
                  <div key={status.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-xs text-muted-foreground">{status.name}</span>
                    </div>
                    <span className="text-xs font-medium">{status.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Top Routes */}
        {routePerformance.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <h4 className="font-semibold text-foreground text-sm mb-4">Meilleures routes</h4>
            <div className="space-y-3">
              {routePerformance.map((route, index) => (
                <div key={route.route} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{route.route}</p>
                    <p className="text-xs text-muted-foreground">
                      {route.bookings} réservations · {route.views} vues
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {route.offers} offres
                  </Badge>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
