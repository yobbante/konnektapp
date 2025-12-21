import { motion } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, Package, Wallet, Users } from "lucide-react";

interface GPStatsChartsProps {
  orders: any[];
  gpType: string;
}

export function GPStatsCharts({ orders, gpType }: GPStatsChartsProps) {
  // Process data for charts
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyOrders = last7Days.map(date => {
    const dayOrders = orders.filter(o => o.created_at?.split('T')[0] === date);
    return {
      date: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
      commandes: dayOrders.length,
      revenue: dayOrders.reduce((sum, o) => sum + (o.total_price || 0), 0) / 1000,
    };
  });

  const statusDistribution = [
    { name: 'En attente', value: orders.filter(o => o.status === 'pending').length, color: '#f59e0b' },
    { name: 'En cours', value: orders.filter(o => ['accepted', 'collected', 'in_transit'].includes(o.status)).length, color: '#3b82f6' },
    { name: 'Livrées', value: orders.filter(o => o.status === 'delivered').length, color: '#10b981' },
    { name: 'Annulées', value: orders.filter(o => o.status === 'cancelled').length, color: '#ef4444' },
  ].filter(s => s.value > 0);

  const monthlyRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total_price || 0), 0);

  const avgOrderValue = orders.length > 0 
    ? Math.round(orders.reduce((sum, o) => sum + (o.total_price || 0), 0) / orders.length)
    : 0;

  const uniqueClients = [...new Set(orders.map(o => o.client_id))].length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-success" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Revenus ce mois</p>
          <p className="text-lg font-bold text-foreground">
            {monthlyRevenue.toLocaleString()} <span className="text-xs font-normal">FCFA</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Valeur moy./commande</p>
          <p className="text-lg font-bold text-foreground">
            {avgOrderValue.toLocaleString()} <span className="text-xs font-normal">FCFA</span>
          </p>
        </motion.div>
      </div>

      {/* Orders Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl border border-border p-4"
      >
        <h3 className="font-semibold text-foreground text-sm mb-4">Commandes (7 derniers jours)</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyOrders}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
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
              />
              <Bar dataKey="commandes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Revenue Trend */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-xl border border-border p-4"
      >
        <h3 className="font-semibold text-foreground text-sm mb-4">Revenus (en milliers FCFA)</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyOrders}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
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
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--success))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Status Distribution */}
      {statusDistribution.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <h3 className="font-semibold text-foreground text-sm mb-4">Répartition des statuts</h3>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {statusDistribution.map((status) => (
                <div key={status.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
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

      {/* Clients */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card rounded-xl border border-border p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{uniqueClients}</p>
            <p className="text-xs text-muted-foreground">Clients uniques</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
