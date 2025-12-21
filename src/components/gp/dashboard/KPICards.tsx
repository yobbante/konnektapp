import { motion } from "framer-motion";
import { Package, CheckCircle, TrendingUp, Scale, Clock, Wallet } from "lucide-react";

interface KPICardsProps {
  stats: {
    todayAvailable: number;
    acceptedToday: number;
    completedToday: number;
    todayRevenue: number;
    weekRevenue: number;
    totalWeight: number;
  };
}

export function KPICards({ stats }: KPICardsProps) {
  const kpis = [
    {
      label: "Courses dispo.",
      value: stats.todayAvailable,
      icon: Package,
      color: "bg-secondary/10 text-secondary",
      highlight: stats.todayAvailable > 0,
    },
    {
      label: "Acceptées",
      value: stats.acceptedToday,
      icon: CheckCircle,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Terminées",
      value: stats.completedToday,
      icon: TrendingUp,
      color: "bg-success/10 text-success",
    },
    {
      label: "Revenus jour",
      value: `${stats.todayRevenue.toLocaleString()}`,
      suffix: "F",
      icon: Wallet,
      color: "bg-warning/10 text-warning",
    },
    {
      label: "Revenus sem.",
      value: `${stats.weekRevenue.toLocaleString()}`,
      suffix: "F",
      icon: TrendingUp,
      color: "bg-accent/10 text-accent",
    },
    {
      label: "Poids total",
      value: `${stats.totalWeight.toFixed(0)}`,
      suffix: "kg",
      icon: Scale,
      color: "bg-muted text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className={`relative p-3 rounded-xl border border-border/50 bg-card ${
            kpi.highlight ? "ring-2 ring-secondary/50" : ""
          }`}
        >
          <div className={`w-8 h-8 rounded-lg ${kpi.color} flex items-center justify-center mb-2`}>
            <kpi.icon className="w-4 h-4" />
          </div>
          <p className="text-lg font-bold text-foreground leading-tight">
            {kpi.value}
            {kpi.suffix && <span className="text-xs text-muted-foreground ml-0.5">{kpi.suffix}</span>}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{kpi.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
