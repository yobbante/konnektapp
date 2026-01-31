import { motion } from "framer-motion";
import { Package, Clock, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface GPQuickStatsProps {
  pendingCount: number;
  activeCount: number;
  completedThisMonth: number;
  nextDeparture?: string;
}

/**
 * GPQuickStats - Statistiques rapides pour GP Bagages
 * 
 * Affiche en un coup d'oeil les métriques clés du GP
 */
export function GPQuickStats({ 
  pendingCount, 
  activeCount, 
  completedThisMonth,
  nextDeparture 
}: GPQuickStatsProps) {
  const stats = [
    {
      label: "En attente",
      value: pendingCount,
      icon: Package,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "En cours",
      value: activeCount,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Ce mois",
      value: completedThisMonth,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Prochain",
      value: nextDeparture || "-",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex flex-col items-center p-3 rounded-xl",
              stat.bgColor
            )}
          >
            <Icon className={cn("w-4 h-4 mb-1", stat.color)} />
            <span className={cn(
              "font-bold",
              stat.isText ? "text-xs" : "text-lg",
              stat.color
            )}>
              {stat.value}
            </span>
            <span className="text-[10px] text-muted-foreground text-center">
              {stat.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
