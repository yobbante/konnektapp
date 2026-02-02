/**
 * ExpandableStatsCard - Mobile-optimized interactive stats card
 * 
 * Features:
 * - Smooth expand/collapse animation
 * - Touch-optimized tap targets
 * - Quick actions revealed on expand
 * - Haptic feedback ready
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost" | "destructive";
}

interface ExpandableStatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  actions?: QuickAction[];
  isText?: boolean;
  subtitle?: string;
}

export function ExpandableStatsCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  actions = [],
  isText = false,
  subtitle,
}: ExpandableStatsCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasActions = actions.length > 0;

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl overflow-hidden transition-all shadow-sm",
        bgColor,
        hasActions && "cursor-pointer active:scale-[0.98]"
      )}
      onClick={() => hasActions && setExpanded(!expanded)}
      whileTap={hasActions ? { scale: 0.98 } : undefined}
    >
      {/* Main Card Content */}
      <div className="flex flex-col items-center p-3 min-h-[80px]">
        <div className="flex items-center justify-between w-full mb-2">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", `${bgColor} bg-opacity-50`)}>
            <Icon className={cn("w-4 h-4", color)} />
          </div>
          {hasActions && (
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className={cn("w-5 h-5 rounded-full flex items-center justify-center", `${bgColor}`)}
            >
              <ChevronDown className={cn("w-3 h-3", color, "opacity-70")} />
            </motion.div>
          )}
        </div>
        
        <div className="text-center w-full">
          <motion.span 
            className={cn(
              "font-bold block",
              isText ? "text-xs leading-tight" : "text-xl",
              color
            )}
            layout
          >
            {value}
          </motion.span>
          <span className="text-[10px] text-muted-foreground leading-tight block mt-0.5">
            {label}
          </span>
          {subtitle && (
            <span className="text-[9px] text-muted-foreground/70 block">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Expandable Actions Panel */}
      <AnimatePresence>
        {expanded && hasActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 bg-background/50 p-2 space-y-1.5">
              {actions.map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Button
                    variant={action.variant || "ghost"}
                    size="sm"
                    className={cn(
                      "w-full h-9 text-xs justify-start gap-2 rounded-lg",
                      "hover:bg-primary/10 active:scale-[0.98]"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                  >
                    {action.icon && <action.icon className="w-3.5 h-3.5" />}
                    {action.label}
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Grid container for expandable cards - Responsive
interface ExpandableStatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function ExpandableStatsGrid({ children, columns = 4 }: ExpandableStatsGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-2 sm:gap-3", gridCols[columns])}>
      {children}
    </div>
  );
}
