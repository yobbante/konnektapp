import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Truck, Package, TrendingUp, Users } from "lucide-react";

interface AdminStatsChartsProps {
  gps: Array<{
    id: string;
    gp_type: string;
    status: string;
    rating: number;
    total_deliveries: number;
    created_at: string;
  }>;
  orders: Array<{
    id: string;
    status: string;
    total_price: number;
    commission_amount: number;
    created_at: string;
  }>;
}

const COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted-foreground))',
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];

export function AdminStatsCharts({ gps, orders }: AdminStatsChartsProps) {
  // Transporters by type
  const gpByType = gps.reduce((acc, gp) => {
    const type = gp.gp_type || 'autre';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const gpTypeData = Object.entries(gpByType).map(([name, value]) => ({
    name: name === 'voyageur' ? 'GP' : name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Transporters by status
  const gpByStatus = gps.reduce((acc, gp) => {
    acc[gp.status] = (acc[gp.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const gpStatusData = [
    { name: 'Vérifiés', value: gpByStatus['verified'] || 0, fill: COLORS.success },
    { name: 'En attente', value: gpByStatus['pending'] || 0, fill: COLORS.warning },
    { name: 'Suspendus', value: gpByStatus['suspended'] || 0, fill: COLORS.destructive },
    { name: 'Rejetés', value: gpByStatus['rejected'] || 0, fill: COLORS.muted },
  ].filter(item => item.value > 0);

  // Orders by status
  const ordersByStatus = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const orderStatusLabels: Record<string, string> = {
    pending: 'En attente',
    accepted: 'Acceptées',
    collected: 'Collectées',
    in_transit: 'En transit',
    delivered: 'Livrées',
    cancelled: 'Annulées',
    disputed: 'Litiges',
  };

  const orderStatusData = Object.entries(ordersByStatus).map(([status, count]) => ({
    name: orderStatusLabels[status] || status,
    value: count,
  }));

  // Monthly revenue
  const monthlyData = orders.reduce((acc, order) => {
    const date = new Date(order.created_at);
    const month = date.toLocaleDateString('fr-FR', { month: 'short' });
    if (!acc[month]) {
      acc[month] = { revenue: 0, commissions: 0, orders: 0 };
    }
    acc[month].revenue += order.total_price || 0;
    acc[month].commissions += order.commission_amount || 0;
    acc[month].orders += 1;
    return acc;
  }, {} as Record<string, { revenue: number; commissions: number; orders: number }>);

  const revenueData = Object.entries(monthlyData).slice(-6).map(([month, data]) => ({
    month,
    revenue: Math.round(data.revenue / 1000),
    commissions: Math.round(data.commissions / 1000),
    orders: data.orders,
  }));

  // Top transporters by deliveries
  const topGps = [...gps]
    .sort((a, b) => b.total_deliveries - a.total_deliveries)
    .slice(0, 5)
    .map(gp => ({
      name: gp.id.slice(0, 8),
      deliveries: gp.total_deliveries,
      rating: gp.rating,
    }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transporters by Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              Transporteurs par type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gpTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {gpTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Transporters by Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Statut des transporteurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gpStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {gpStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Commandes par statut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Revenus (K FCFA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenus"
                    stroke={COLORS.primary} 
                    strokeWidth={2} 
                    dot={{ fill: COLORS.primary }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="commissions" 
                    name="Commissions"
                    stroke={COLORS.success} 
                    strokeWidth={2}
                    dot={{ fill: COLORS.success }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      {topGps.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top 5 Transporteurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topGps} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="deliveries" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
