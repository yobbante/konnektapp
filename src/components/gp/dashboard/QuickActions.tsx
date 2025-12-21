import { motion } from "framer-motion";
import { Search, Package, BarChart3, Coins, UserCog, History } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onUpdateProfile: () => void;
  onViewMissions: () => void;
  onViewHistory: () => void;
  onViewStats: () => void;
}

export function QuickActions({ 
  onUpdateProfile, 
  onViewMissions, 
  onViewHistory, 
  onViewStats 
}: QuickActionsProps) {
  const actions = [
    {
      label: "Mon profil",
      icon: UserCog,
      onClick: onUpdateProfile,
      variant: "outline" as const,
    },
    {
      label: "Missions en cours",
      icon: Package,
      onClick: onViewMissions,
      variant: "default" as const,
    },
    {
      label: "Historique",
      icon: History,
      onClick: onViewHistory,
      variant: "outline" as const,
    },
    {
      label: "Statistiques",
      icon: BarChart3,
      onClick: onViewStats,
      variant: "gold" as const,
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-2 gap-2"
    >
      {actions.map((action, index) => (
        <Button
          key={action.label}
          variant={action.variant}
          size="lg"
          className="h-auto py-3 px-4 flex flex-col items-center gap-1.5 text-xs"
          onClick={action.onClick}
        >
          <action.icon className="w-5 h-5" />
          <span className="font-medium">{action.label}</span>
        </Button>
      ))}
    </motion.div>
  );
}
