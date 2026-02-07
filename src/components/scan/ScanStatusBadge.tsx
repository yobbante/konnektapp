/**
 * ScanStatusBadge - Unified status display component for scan results
 * Uses semantic design tokens for consistent theming across all scan views.
 */
import { 
  Clock, CheckCircle, Package, Truck, AlertTriangle, 
  XCircle, MapPin, ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { 
  label: string; 
  icon: typeof Clock; 
  className: string;
  pulse?: boolean;
}> = {
  pending: { 
    label: "En attente", 
    icon: Clock, 
    className: "bg-warning/15 text-warning border-warning/30",
  },
  accepted: { 
    label: "Acceptée", 
    icon: CheckCircle, 
    className: "bg-primary/10 text-primary border-primary/30",
  },
  collected: { 
    label: "Collecté", 
    icon: Package, 
    className: "bg-accent/10 text-accent border-accent/30",
  },
  in_transit: { 
    label: "En transit", 
    icon: Truck, 
    className: "bg-secondary/10 text-secondary border-secondary/30",
    pulse: true,
  },
  arrived: { 
    label: "Arrivé", 
    icon: MapPin, 
    className: "bg-success/15 text-success border-success/30",
  },
  delivered: { 
    label: "Livré", 
    icon: ShieldCheck, 
    className: "bg-success/15 text-success border-success/30",
  },
  cancelled: { 
    label: "Annulé", 
    icon: XCircle, 
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  disputed: { 
    label: "En litige", 
    icon: AlertTriangle, 
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
};

interface ScanStatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function ScanStatusBadge({ status, size = "md", showIcon = true, className }: ScanStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0 h-5 gap-0.5",
    md: "text-xs px-2.5 py-0.5 h-6 gap-1",
    lg: "text-sm px-3 py-1 h-8 gap-1.5",
  };

  const iconSizes = { sm: "w-2.5 h-2.5", md: "w-3 h-3", lg: "w-4 h-4" };

  return (
    <Badge 
      variant="outline"
      className={cn(
        "font-medium border inline-flex items-center",
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2 mr-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-40" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {showIcon && !config.pulse && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}
