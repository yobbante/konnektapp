/**
 * Konnekt Travel Pass Badge — Client-facing
 * 
 * Displays KTP level + Trust Score on GP cards and profiles.
 * Compact badge for search results, detailed for profile pages.
 */

import { motion } from "framer-motion";
import { Shield, ShieldCheck, Award, Crown, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { KTP_LEVELS, getTrustScoreColor, getTrustScoreLabel, type KTPLevel } from "@/hooks/useKTPStatus";
import { cn } from "@/lib/utils";

interface KTPBadgeProps {
  level: KTPLevel;
  trustScore: number;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  showLabel?: boolean;
  className?: string;
}

const LEVEL_ICONS: Record<KTPLevel, typeof Shield> = {
  inactive: Shield,
  basic: Shield,
  verified: ShieldCheck,
  pro: Crown,
};

export function KTPBadge({
  level,
  trustScore,
  size = "md",
  showScore = true,
  showLabel = false,
  className,
}: KTPBadgeProps) {
  const config = KTP_LEVELS[level];
  const Icon = LEVEL_ICONS[level];

  const sizeClasses = {
    sm: { icon: "w-3 h-3", text: "text-[10px]", container: "px-1.5 py-0.5 gap-1", score: "text-[10px]" },
    md: { icon: "w-3.5 h-3.5", text: "text-xs", container: "px-2 py-1 gap-1.5", score: "text-xs" },
    lg: { icon: "w-4 h-4", text: "text-sm", container: "px-3 py-1.5 gap-2", score: "text-sm" },
  };

  const s = sizeClasses[size];

  if (level === "inactive") return null;

  const badge = (
    <div className={cn(
      "inline-flex items-center rounded-full border font-medium",
      s.container,
      config.bgColor,
      config.borderColor,
      className
    )}>
      <Icon className={cn(s.icon, config.color)} />
      {showLabel && (
        <span className={cn(s.text, config.color)}>{config.label}</span>
      )}
      {showScore && (
        <span className={cn(s.score, "font-bold", getTrustScoreColor(trustScore))}>
          {trustScore}
        </span>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <div className="text-center space-y-1">
            <p className="font-semibold flex items-center justify-center gap-1">
              {config.icon} KTP {config.label}
            </p>
            <p className="text-xs">Trust Score : {trustScore}/100 — {getTrustScoreLabel(trustScore)}</p>
            <p className="text-[10px] text-muted-foreground">{config.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Detailed KTP badge for profile pages
 */
export function KTPProfileBadge({
  level,
  trustScore,
  commissionRate,
  paymentRule,
  className,
}: {
  level: KTPLevel;
  trustScore: number;
  commissionRate?: number;
  paymentRule?: string;
  className?: string;
}) {
  if (level === "inactive") return null;

  const config = KTP_LEVELS[level];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "p-3 rounded-xl border-2",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg",
          config.gradient
        )}>
          {trustScore}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <span className={cn("font-bold", config.color)}>KTP {config.label}</span>
            {level === "pro" && (
              <Badge className="bg-violet-500 text-white text-[10px] px-1.5">
                Recommandé
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trust Score : {trustScore}/100 — {getTrustScoreLabel(trustScore)}
          </p>
        </div>
      </div>

      {(commissionRate || paymentRule) && (
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
          {commissionRate !== undefined && commissionRate < 5 && (
            <span className="text-[10px] text-primary flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Commission réduite : {commissionRate}%
            </span>
          )}
          {paymentRule && paymentRule !== "after_delivery" && (
            <span className="text-[10px] text-primary flex items-center gap-1">
              ⚡ Paiement accéléré
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Mini Trust Score display for offer cards
 */
export function TrustScoreMini({ score, className }: { score: number; className?: string }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold",
      score >= 80 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
      score >= 60 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
      "bg-destructive/10 text-destructive",
      className
    )}>
      <Shield className="w-2.5 h-2.5" />
      {score}
    </div>
  );
}
