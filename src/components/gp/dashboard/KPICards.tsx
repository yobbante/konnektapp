import { motion } from "framer-motion";
import { Package, CheckCircle, TrendingUp, Scale, Wallet, Users } from "lucide-react";

interface KPICardsProps {
  stats: {
    missionsInProgress: number;
    missionsCompleted: number;
    totalVolume: number;
    totalRevenue: number;
    activeClients: number;
  };
  gpType?: string;
}

function getVolumeDisplay(volume: number, gpType?: string): { value: string; unit: string } {
  switch (gpType) {
    case 'maritime':
    case 'routier':
      // Convert to tonnes for fret
      const tonnes = volume / 1000;
      return { value: tonnes >= 1 ? tonnes.toFixed(1) : volume.toFixed(0), unit: tonnes >= 1 ? 't' : 'kg' };
    case 'aerien':
      // Use m³ for air freight
      const m3 = volume / 100; // Approximate conversion
      return { value: m3.toFixed(1), unit: 'm³' };
    default:
      // kg for voyageur, express, agence
      return { value: volume >= 1000 ? (volume / 1000).toFixed(1) : volume.toFixed(0), unit: volume >= 1000 ? 't' : 'kg' };
  }
}

export function KPICards({ stats, gpType }: KPICardsProps) {
  const volumeDisplay = getVolumeDisplay(stats.totalVolume, gpType);

  const kpis = [
    {
      label: "En cours",
      value: stats.missionsInProgress,
      icon: Package,
      color: "bg-secondary/10 text-secondary",
      highlight: stats.missionsInProgress > 0,
    },
    {
      label: "Terminées",
      value: stats.missionsCompleted,
      icon: CheckCircle,
      color: "bg-success/10 text-success",
    },
    {
      label: "Volume total",
      value: volumeDisplay.value,
      suffix: volumeDisplay.unit,
      icon: Scale,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Revenus",
      value: stats.totalRevenue >= 1000000 
        ? `${(stats.totalRevenue / 1000000).toFixed(1)}M` 
        : stats.totalRevenue >= 1000 
          ? `${(stats.totalRevenue / 1000).toFixed(0)}k`
          : stats.totalRevenue.toLocaleString(),
      suffix: "F",
      icon: Wallet,
      color: "bg-warning/10 text-warning",
    },
    {
      label: "Clients actifs",
      value: stats.activeClients,
      icon: Users,
      color: "bg-accent/10 text-accent",
    },
    {
      label: "Performance",
      value: stats.missionsCompleted > 0 
        ? Math.round((stats.missionsCompleted / (stats.missionsCompleted + stats.missionsInProgress)) * 100) 
        : 0,
      suffix: "%",
      icon: TrendingUp,
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