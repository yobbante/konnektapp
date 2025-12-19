import { motion } from "framer-motion";
import { LucideIcon, Zap, Truck, Ship, Plane, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur";

interface TransportTypeCardProps {
  type: TransportType;
  title: string;
  description: string;
  selected?: boolean;
  onClick?: () => void;
}

const transportConfig: Record<TransportType, { icon: LucideIcon; color: string; bgColor: string }> = {
  express: { 
    icon: Zap, 
    color: "text-transport-express", 
    bgColor: "bg-transport-express/10 border-transport-express/30" 
  },
  routier: { 
    icon: Truck, 
    color: "text-transport-routier", 
    bgColor: "bg-transport-routier/10 border-transport-routier/30" 
  },
  maritime: { 
    icon: Ship, 
    color: "text-transport-maritime", 
    bgColor: "bg-transport-maritime/10 border-transport-maritime/30" 
  },
  aerien: { 
    icon: Plane, 
    color: "text-transport-aerien", 
    bgColor: "bg-transport-aerien/10 border-transport-aerien/30" 
  },
  voyageur: { 
    icon: Briefcase, 
    color: "text-transport-voyageur", 
    bgColor: "bg-transport-voyageur/10 border-transport-voyageur/30" 
  },
};

export function TransportTypeCard({ type, title, description, selected, onClick }: TransportTypeCardProps) {
  const config = transportConfig[type];
  const Icon = config.icon;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative p-6 rounded-2xl border-2 text-left transition-all duration-200 w-full",
        "hover:shadow-lg",
        selected 
          ? "border-secondary bg-secondary/5 shadow-md" 
          : "border-border bg-card hover:border-muted-foreground/30"
      )}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-secondary flex items-center justify-center"
        >
          <svg className="w-4 h-4 text-secondary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
      
      <div className={cn("w-14 h-14 rounded-xl border flex items-center justify-center mb-4", config.bgColor)}>
        <Icon className={cn("w-7 h-7", config.color)} />
      </div>
      
      <h3 className="font-semibold text-lg text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.button>
  );
}
