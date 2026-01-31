import { motion } from "framer-motion";
import { Truck, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoutierQuickStatsProps {
  missionsEnAttente: number;
  missionsEnCours: number;
  livraisonsTerminees: number;
  vehiculesActifs: number;
}

/**
 * RoutierQuickStats - Statistiques rapides pour Transporteur Routier
 * 
 * Métriques opérationnelles adaptées au métier routier
 */
export function RoutierQuickStats({ 
  missionsEnAttente, 
  missionsEnCours, 
  livraisonsTerminees,
  vehiculesActifs 
}: RoutierQuickStatsProps) {
  const stats = [
    {
      label: "À accepter",
      value: missionsEnAttente,
      icon: AlertTriangle,
      color: missionsEnAttente > 0 ? "text-amber-600" : "text-muted-foreground",
      bgColor: missionsEnAttente > 0 ? "bg-amber-500/10" : "bg-muted",
      pulse: missionsEnAttente > 0,
    },
    {
      label: "En route",
      value: missionsEnCours,
      icon: Truck,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Livrées",
      value: livraisonsTerminees,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Véhicules",
      value: vehiculesActifs,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
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
              "flex flex-col items-center p-3 rounded-xl relative",
              stat.bgColor
            )}
          >
            {stat.pulse && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            )}
            <Icon className={cn("w-4 h-4 mb-1", stat.color)} />
            <span className={cn("font-bold text-lg", stat.color)}>
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
