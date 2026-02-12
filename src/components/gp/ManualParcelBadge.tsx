/**
 * ManualParcelBadge — Visual "Hors plateforme" badge for manual parcels
 */
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ManualParcelBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

export function ManualParcelBadge({ size = "sm", className }: ManualParcelBadgeProps) {
  return (
    <Badge
      className={cn(
        "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1",
        size === "sm" ? "text-[9px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        className
      )}
    >
      <AlertTriangle className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      Hors plateforme
    </Badge>
  );
}
