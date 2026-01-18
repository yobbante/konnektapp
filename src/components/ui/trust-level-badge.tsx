import { Shield, ShieldCheck, ShieldAlert, Award, Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type TrustLevel = "new" | "basic" | "verified" | "premium" | "elite";

interface TrustLevelBadgeProps {
  level: TrustLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

const TRUST_LEVELS: Record<TrustLevel, {
  label: string;
  description: string;
  icon: typeof Shield;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  new: {
    label: "Nouveau",
    description: "Membre récent de la plateforme",
    icon: Shield,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-muted",
  },
  basic: {
    label: "Basique",
    description: "Profil partiellement complété",
    icon: ShieldAlert,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  verified: {
    label: "Vérifié",
    description: "Profil complet et vérifié par l'équipe",
    icon: ShieldCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  premium: {
    label: "Premium",
    description: "Membre premium avec accès prioritaire",
    icon: Award,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
  },
  elite: {
    label: "Élite",
    description: "Top contributeur de la plateforme",
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-gradient-to-r from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/50",
  },
};

export function TrustLevelBadge({ 
  level, 
  size = "md", 
  className,
  showLabel = false 
}: TrustLevelBadgeProps) {
  const config = TRUST_LEVELS[level];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const containerSizeClasses = {
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2",
  };

  const badge = (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border",
        containerSizeClasses[size],
        config.bgColor,
        config.borderColor,
        showLabel && "px-2.5 py-1",
        className
      )}
    >
      <Icon className={cn(sizeClasses[size], config.color)} />
      {showLabel && (
        <span className={cn("text-xs font-medium", config.color)}>
          {config.label}
        </span>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-center">
            <p className="font-semibold">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Calculate trust level based on profile data
 */
export function calculateTrustLevel({
  profileCompletion = 0,
  isVerified = false,
  isPremium = false,
  totalDeliveries = 0,
  rating = 0,
  accountAgeMonths = 0,
}: {
  profileCompletion?: number;
  isVerified?: boolean;
  isPremium?: boolean;
  totalDeliveries?: number;
  rating?: number;
  accountAgeMonths?: number;
}): TrustLevel {
  // Elite: Premium + 100+ deliveries + 4.5+ rating
  if (isPremium && totalDeliveries >= 100 && rating >= 4.5) {
    return "elite";
  }
  
  // Premium: Has premium subscription and verified
  if (isPremium && isVerified) {
    return "premium";
  }
  
  // Verified: Admin-verified OR (100% profile + 10+ deliveries)
  if (isVerified || (profileCompletion >= 100 && totalDeliveries >= 10)) {
    return "verified";
  }
  
  // Basic: Some profile data filled (>50%)
  if (profileCompletion >= 50 || accountAgeMonths >= 1) {
    return "basic";
  }
  
  // New: Fresh account
  return "new";
}
