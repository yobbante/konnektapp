import { motion } from "framer-motion";
import { Search, Package, BarChart3, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onViewCourses: () => void;
  onViewDeliveries: () => void;
  onViewPerformance: () => void;
  onViewEarnings: () => void;
}

export function QuickActions({ 
  onViewCourses, 
  onViewDeliveries, 
  onViewPerformance, 
  onViewEarnings 
}: QuickActionsProps) {
  const actions = [
    {
      label: "Courses disponibles",
      icon: Search,
      onClick: onViewCourses,
      variant: "default" as const,
    },
    {
      label: "Mes livraisons",
      icon: Package,
      onClick: onViewDeliveries,
      variant: "outline" as const,
    },
    {
      label: "Performances",
      icon: BarChart3,
      onClick: onViewPerformance,
      variant: "outline" as const,
    },
    {
      label: "Mes gains",
      icon: Coins,
      onClick: onViewEarnings,
      variant: "gold" as const,
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
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
