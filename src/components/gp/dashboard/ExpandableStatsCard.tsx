/**
 * ExpandableStatsCard - Interactive stats card that expands with actions
 * 
 * Used in GP Dashboard for quick stats with expandable quick actions
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
  variant?: "default" | "outline" | "destructive";
}

interface ExpandableStatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  actions?: QuickAction[];
  isText?: boolean;
}

export function ExpandableStatsCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  actions = [],
  isText = false,
}: ExpandableStatsCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasActions = actions.length > 0;

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl overflow-hidden transition-all",
        bgColor,
        hasActions && "cursor-pointer"
      )}
      onClick={() => hasActions && setExpanded(!expanded)}
    >
      {/* Main Card Content */}
      <div className="flex flex-col items-center p-3">
        <div className="flex items-center justify-between w-full mb-1">
          <Icon className={cn("w-4 h-4", color)} />
          {hasActions && (
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className={cn("w-3 h-3", color, "opacity-60")} />
            </motion.div>
          )}
        </div>
        <span className={cn(
          "font-bold",
          isText ? "text-xs" : "text-lg",
          color
        )}>
          {value}
        </span>
        <span className="text-[10px] text-muted-foreground text-center">
          {label}
        </span>
      </div>

      {/* Expandable Actions */}
      <AnimatePresence>
        {expanded && hasActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/50"
          >
            <div className="p-2 space-y-1">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || "ghost"}
                  size="sm"
                  className="w-full h-8 text-xs justify-start"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                >
                  {action.icon && <action.icon className="w-3 h-3 mr-2" />}
                  {action.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Grid container for 4 expandable cards
interface ExpandableStatsGridProps {
  children: React.ReactNode;
}

export function ExpandableStatsGrid({ children }: ExpandableStatsGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {children}
    </div>
  );
}
