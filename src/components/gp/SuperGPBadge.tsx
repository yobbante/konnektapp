/**
 * SuperGPBadge — Displays GP gamification level with progress
 */
import { Trophy, Star, Crown, Rocket, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuperGPBadgeProps {
  level: number;
  levelName: string;
  totalMissions: number;
  nextThreshold: number;
  badges?: string[];
  compact?: boolean;
}

const LEVEL_CONFIG: Record<number, { icon: any; gradient: string; glow: string }> = {
  0: { icon: Shield, gradient: "from-muted to-muted-foreground/20", glow: "" },
  1: { icon: Zap, gradient: "from-blue-500 to-blue-600", glow: "shadow-blue-500/20" },
  2: { icon: Star, gradient: "from-emerald-500 to-emerald-600", glow: "shadow-emerald-500/20" },
  3: { icon: Trophy, gradient: "from-amber-500 to-orange-500", glow: "shadow-amber-500/30" },
  4: { icon: Crown, gradient: "from-purple-500 to-violet-600", glow: "shadow-purple-500/30" },
  5: { icon: Rocket, gradient: "from-rose-500 to-pink-600", glow: "shadow-rose-500/30" },
};

export function SuperGPBadge({ level, levelName, totalMissions, nextThreshold, badges = [], compact = false }: SuperGPBadgeProps) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG[0];
  const Icon = config.icon;
  const progress = Math.min(100, Math.round((totalMissions / nextThreshold) * 100));

  if (compact) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[11px] font-bold bg-gradient-to-r shadow-lg",
        config.gradient, config.glow
      )}>
        <Icon className="w-3.5 h-3.5" />
        <span>{levelName}</span>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-2xl border bg-card space-y-3">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg",
          config.gradient, config.glow
        )}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold">{levelName}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              Niv. {level}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{totalMissions} missions complétées</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">{totalMissions} / {nextThreshold} missions</span>
          <span className="font-medium text-primary">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", config.gradient)}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {badges.includes("active") && <BadgePill label="GP Actif" color="bg-blue-500/10 text-blue-600" />}
          {badges.includes("confirmed") && <BadgePill label="Confirmé" color="bg-emerald-500/10 text-emerald-600" />}
          {badges.includes("super_gp") && <BadgePill label="Super GP" color="bg-amber-500/10 text-amber-600" />}
          {badges.includes("ambassador") && <BadgePill label="Ambassadeur" color="bg-purple-500/10 text-purple-600" />}
          {badges.includes("legend") && <BadgePill label="Légende" color="bg-rose-500/10 text-rose-600" />}
        </div>
      )}
    </div>
  );
}

function BadgePill({ label, color }: { label: string; color: string }) {
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", color)}>
      {label}
    </span>
  );
}
