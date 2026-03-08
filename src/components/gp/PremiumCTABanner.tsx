/**
 * PremiumCTABanner — Progressive CTA based on subscription tier
 * - Free: "Passez Premium" 
 * - Premium: "Passez Pro" (upgrade)
 * - Pro: hidden
 */
import { motion } from "framer-motion";
import {
  Crown, Zap, TrendingUp, ChevronRight, Lock, Rocket, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PremiumCTABannerProps {
  variant?: "compact" | "card" | "banner";
  context?: string;
  /** @deprecated Use subscription instead */
  isPremium?: boolean;
  subscription?: string;
  className?: string;
  gpId?: string;
  onUpgraded?: () => void;
}

const FREE_MESSAGES: Record<string, { title: string; desc: string }> = {
  performances: {
    title: "Débloquez vos statistiques",
    desc: "Revenus, taux de remplissage, satisfaction — tout en temps réel.",
  },
  wallet: {
    title: "Gagnez plus sur chaque livraison",
    desc: "Notifications prioritaires et dashboard performances.",
  },
  dashboard: {
    title: "Boostez votre activité",
    desc: "Réservations jusqu'à 12h avant départ, auto-accept et stats avancées.",
  },
  menu: {
    title: "Passez Premium",
    desc: "À partir de 9 900 FCFA/mois",
  },
  default: {
    title: "Passez Premium",
    desc: "Réservations tardives, visibilité prioritaire, auto-accept.",
  },
};

const UPGRADE_MESSAGES: Record<string, { title: string; desc: string }> = {
  performances: {
    title: "Passez Pro — Analytics complets",
    desc: "Rapports avancés, insights détaillés et support prioritaire.",
  },
  wallet: {
    title: "Passez Pro — Commission -40%",
    desc: "Réduisez votre commission et maximisez vos gains.",
  },
  dashboard: {
    title: "Passez Pro — Le maximum",
    desc: "Réservations jusqu'à 4h avant départ, commission -40%, boost auto.",
  },
  menu: {
    title: "Upgrade Pro",
    desc: "19 900 FCFA/mois — Le maximum",
  },
  default: {
    title: "Passez Pro",
    desc: "Réservations 4h avant départ, -40% commission, support dédié.",
  },
};

export function PremiumCTABanner({ variant = "card", context = "default", isPremium, subscription, className }: PremiumCTABannerProps) {
  const navigate = useNavigate();

  // Determine effective subscription
  const sub = subscription || (isPremium ? "premium" : "free");

  // Pro → never show
  if (sub === "pro") return null;

  const isUpgrade = sub === "premium";
  const messages = isUpgrade ? UPGRADE_MESSAGES : FREE_MESSAGES;
  const msg = messages[context] || messages.default;
  const goToPremium = () => navigate("/gp/premium");

  const accentColor = isUpgrade ? "violet" : "amber";
  const Icon = isUpgrade ? Rocket : Crown;
  const priceLabel = isUpgrade ? "19 900 FCFA/mois" : "9 900 FCFA/mois";
  const ctaLabel = isUpgrade ? "Passer Pro" : "Découvrir les formules";

  if (variant === "compact") {
    return (
      <motion.button
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        onClick={goToPremium}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl",
          isUpgrade
            ? "bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent border border-violet-500/20 hover:border-violet-500/40"
            : "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 hover:border-amber-500/40",
          "transition-all",
          className,
        )}
      >
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", isUpgrade ? "bg-violet-500/15" : "bg-amber-500/15")}>
          <Icon className={cn("w-4 h-4", isUpgrade ? "text-violet-500" : "text-amber-500")} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-semibold truncate">{msg.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{msg.desc}</p>
        </div>
        <ChevronRight className={cn("w-4 h-4 flex-shrink-0", isUpgrade ? "text-violet-500/60" : "text-amber-500/60")} />
      </motion.button>
    );
  }

  if (variant === "banner") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-2xl cursor-pointer p-4",
          isUpgrade
            ? "bg-gradient-to-br from-violet-500/15 via-violet-600/10 to-purple-500/10 border border-violet-500/25"
            : "bg-gradient-to-br from-amber-500/15 via-amber-600/10 to-orange-500/10 border border-amber-500/25",
          className,
        )}
        onClick={goToPremium}
      >
        <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2", isUpgrade ? "bg-violet-500/10" : "bg-amber-500/10")} />
        <div className="relative flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", isUpgrade ? "bg-violet-500/20" : "bg-amber-500/20")}>
            <Icon className={cn("w-5 h-5", isUpgrade ? "text-violet-500" : "text-amber-500")} />
          </div>
          <div className="flex-1 space-y-2.5">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">{msg.title}</p>
                <Badge variant="secondary" className={cn("text-[9px]", isUpgrade ? "bg-violet-500/15 text-violet-600 border-violet-500/30" : "bg-amber-500/15 text-amber-600 border-amber-500/30")}>
                  {priceLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{msg.desc}</p>
            </div>
            <div className="flex items-center gap-3">
              {isUpgrade ? (
                <>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3 text-violet-500" /> Réservation 4h avant
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <TrendingUp className="w-3 h-3 text-violet-500" /> -40% commission
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <TrendingUp className="w-3 h-3 text-amber-500" /> Priorité résultats
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Zap className="w-3 h-3 text-amber-500" /> Auto-accept
                  </div>
                </>
              )}
            </div>
            <Button size="sm" className={cn("h-8 gap-1.5 text-xs text-white", isUpgrade ? "bg-violet-500 hover:bg-violet-600" : "bg-amber-500 hover:bg-amber-600")}>
              <Icon className="w-3.5 h-3.5" />
              {ctaLabel}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default: card variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl p-4 space-y-3 cursor-pointer",
        isUpgrade
          ? "bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20"
          : "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20",
        className,
      )}
      onClick={goToPremium}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isUpgrade ? "bg-violet-500/15" : "bg-amber-500/15")}>
          <Icon className={cn("w-5 h-5", isUpgrade ? "text-violet-500" : "text-amber-500")} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">{msg.title}</p>
          <p className="text-[11px] text-muted-foreground">{msg.desc}</p>
        </div>
      </div>
      <div className="flex items-center justify-between bg-background/50 rounded-xl px-3 py-2">
        <div className="flex items-center gap-3">
          {isUpgrade ? (
            <>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3 text-violet-500" /> 4h avant départ
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <TrendingUp className="w-3 h-3 text-violet-500" /> -40% commission
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <TrendingUp className="w-3 h-3 text-amber-500" /> Priorité
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Zap className="w-3 h-3 text-amber-500" /> Auto-accept
              </div>
            </>
          )}
        </div>
        <p className={cn("text-xs font-bold", isUpgrade ? "text-violet-600" : "text-amber-600")}>{priceLabel}</p>
      </div>
      <Button className={cn("w-full gap-2 h-9 text-xs text-white", isUpgrade ? "bg-violet-500 hover:bg-violet-600" : "bg-amber-500 hover:bg-amber-600")}>
        <Icon className="w-3.5 h-3.5" />
        {ctaLabel}
      </Button>
    </motion.div>
  );
}

/** Lock overlay for premium-gated features */
export function PremiumLockOverlay({ feature }: { feature: string }) {
  const navigate = useNavigate();
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
        <Lock className="w-6 h-6 text-amber-500" />
      </div>
      <p className="text-sm font-bold mb-1">Fonctionnalité Premium</p>
      <p className="text-xs text-muted-foreground mb-3">{feature}</p>
      <Button size="sm" className="gap-1.5 h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate("/gp/premium")}>
        <Crown className="w-3.5 h-3.5" />
        Débloquer
      </Button>
    </div>
  );
}
