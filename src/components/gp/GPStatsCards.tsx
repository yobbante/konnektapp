import { motion } from "framer-motion";
import { Package, TrendingUp, Clock, Wallet, CheckCircle, AlertCircle } from "lucide-react";

interface GPStatsCardsProps {
  stats: {
    totalOffers: number;
    activeOffers: number;
    totalOrders: number;
    pendingOrders: number;
    inTransitOrders: number;
    completedOrders: number;
    revenue: number;
    balance: number;
  };
}

export function GPStatsCards({ stats }: GPStatsCardsProps) {
  const cards = [
    {
      label: "Offres actives",
      value: stats.activeOffers,
      subValue: `/${stats.totalOffers} total`,
      icon: Package,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      label: "Commandes en cours",
      value: stats.pendingOrders + stats.inTransitOrders,
      subValue: `${stats.pendingOrders} en attente`,
      icon: Clock,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Livraisons terminées",
      value: stats.completedOrders,
      subValue: `sur ${stats.totalOrders} commandes`,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Solde disponible",
      value: `${stats.balance.toLocaleString()}`,
      subValue: "FCFA",
      icon: Wallet,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-card rounded-2xl border border-border p-5 shadow-card"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{card.value}</p>
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className="text-xs text-muted-foreground mt-1">{card.subValue}</p>
        </motion.div>
      ))}
    </div>
  );
}
