import { Shield, Clock, CheckCircle, AlertCircle, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EscrowStatusBadgeProps {
  status: "pending" | "held" | "released" | "refunded" | "disputed" | string;
  size?: "sm" | "md";
}

const statusConfig = {
  pending: {
    label: "En attente",
    icon: Clock,
    variant: "outline" as const,
    className: "border-warning text-warning",
  },
  held: {
    label: "En séquestre",
    icon: Shield,
    variant: "outline" as const,
    className: "border-primary text-primary bg-primary/10",
  },
  released: {
    label: "Libéré",
    icon: CheckCircle,
    variant: "success" as const,
    className: "",
  },
  refunded: {
    label: "Remboursé",
    icon: RefreshCcw,
    variant: "outline" as const,
    className: "border-muted-foreground text-muted-foreground",
  },
  disputed: {
    label: "En litige",
    icon: AlertCircle,
    variant: "destructive" as const,
    className: "",
  },
};

export function EscrowStatusBadge({ status, size = "sm" }: EscrowStatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;
  
  const sizeClasses = size === "sm" ? "text-xs" : "text-sm";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  return (
    <Badge 
      variant={config.variant} 
      className={`${sizeClasses} ${config.className} flex items-center gap-1`}
    >
      <Icon className={iconSize} />
      {config.label}
    </Badge>
  );
}
