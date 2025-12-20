import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TransportType, transportConfig } from "@/lib/transportTypes";

interface TransportTypeCardProps {
  type: TransportType;
  title?: string;
  description?: string;
  selected?: boolean;
  onClick?: () => void;
}

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
      
      <h3 className="font-semibold text-lg text-foreground mb-1">{title || config.title}</h3>
      <p className="text-sm text-muted-foreground">{description || config.description}</p>
    </motion.button>
  );
}