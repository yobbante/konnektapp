import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Package, Car, History, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RoutierQuickActionsProps {
  pendingCount?: number;
  activeCount?: number;
}

/**
 * RoutierQuickActions - Actions rapides pour dashboard routier
 * 
 * Adapté métier routier : pas de tarification (prix auto),
 * focus sur missions et flotte
 */
export function RoutierQuickActions({ pendingCount = 0, activeCount = 0 }: RoutierQuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    {
      label: "Missions",
      sublabel: pendingCount > 0 ? `${pendingCount} nouvelles` : "Voir",
      icon: Package,
      path: "/routier/demandes",
      variant: pendingCount > 0 ? "default" : "outline",
      highlight: pendingCount > 0,
    },
    {
      label: "Ma flotte",
      sublabel: "Véhicules",
      icon: Car,
      path: "/routier/vehicules",
      variant: "outline",
    },
    {
      label: "Historique",
      sublabel: "Passé",
      icon: History,
      path: "/routier/historique",
      variant: "outline",
    },
    {
      label: "Profil public",
      sublabel: "Modifier",
      icon: User,
      path: "/routier/profil-public",
      variant: "outline",
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
          variant={action.variant as any}
          size="lg"
          className={cn(
            "h-auto py-3 px-4 flex flex-col items-center gap-1 text-xs relative",
            action.highlight && "bg-primary hover:bg-primary/90 ring-2 ring-primary/30"
          )}
          onClick={() => navigate(action.path)}
        >
          {action.highlight && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
          )}
          <action.icon className="w-5 h-5" />
          <span className="font-medium">{action.label}</span>
          <span className="text-[10px] opacity-70">{action.sublabel}</span>
        </Button>
      ))}
    </motion.div>
  );
}
