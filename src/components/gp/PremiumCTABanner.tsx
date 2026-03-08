/**
 * PremiumCTABanner — Reusable conversion-optimized Premium upsell
 * Variants: compact (inline), card (standalone), banner (full-width)
 */
import { motion } from "framer-motion";
import { Crown, Zap, Star, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PremiumCTABannerProps {
  variant?: "compact" | "card" | "banner";
  context?: string; // e.g. "performances", "wallet", "dashboard"
  isPremium?: boolean;
  className?: string;
}

const PREMIUM_MESSAGES: Record<string, { title: string; desc: string }> = {
  performances: {
    title: "Débloquez vos statistiques",
    desc: "Revenus, taux de remplissage, satisfaction — tout en temps réel.",
  },
  wallet: {
    title: "Commission réduite à 3%",
    desc: "Gagnez plus sur chaque livraison avec Premium.",
  },
  dashboard: {
    title: "Boostez votre activité",
    desc: "Visibilité prioritaire, auto-accept et statistiques avancées.",
  },
  menu: {
    title: "Passez Premium",
    desc: "Débloquez toutes les fonctionnalités pro.",
  },
  default: {
    title: "Passez Premium",
    desc: "Commission réduite, visibilité prioritaire, statistiques avancées.",
  },
};

export function PremiumCTABanner({ variant = "card", context = "default", isPremium, className }: PremiumCTABannerProps) {
  const { toast } = useToast();

  if (isPremium) return null;

  const msg = PREMIUM_MESSAGES[context] || PREMIUM_MESSAGES.default;

  const handleUpgrade = () => {
    toast({ title: "Bientôt disponible", description: "L'abonnement Premium sera disponible prochainement." });
  };

  if (variant === "compact") {
    return (
      <motion.button
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleUpgrade}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl",
          "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent",
          "border border-amber-500/20 hover:border-amber-500/40 transition-all",
          className,
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          <Crown className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-semibold truncate">{msg.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{msg.desc}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-500/60 flex-shrink-0" />
      </motion.button>
    );
  }

  if (variant === "banner") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-amber-500/15 via-amber-600/10 to-orange-500/10",
          "border border-amber-500/25 p-4",
          className,
        )}
      >
        {/* Decorative */}
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-500/10 blur-2xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Crown className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 space-y-2.5">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">{msg.title}</p>
                <Badge variant="secondary" className="text-[9px] bg-amber-500/15 text-amber-600 border-amber-500/30">
                  PRO
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{msg.desc}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Zap className="w-3 h-3 text-amber-500" /> Commission 3%
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Star className="w-3 h-3 text-amber-500" /> Priorité
              </div>
            </div>
            <Button size="sm" className="h-8 gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={handleUpgrade}>
              <Crown className="w-3.5 h-3.5" />
              Passer Premium
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
        "rounded-2xl p-4 space-y-3",
        "bg-gradient-to-br from-amber-500/10 to-orange-500/5",
        "border border-amber-500/20",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Crown className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">{msg.title}</p>
          <p className="text-[11px] text-muted-foreground">{msg.desc}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/50 rounded-lg px-2.5 py-1.5">
          <Zap className="w-3 h-3 text-amber-500" /> Commission réduite
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/50 rounded-lg px-2.5 py-1.5">
          <Star className="w-3 h-3 text-amber-500" /> Visibilité +
        </div>
      </div>
      <Button className="w-full gap-2 h-9 text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={handleUpgrade}>
        <Crown className="w-3.5 h-3.5" />
        Passer Premium
      </Button>
    </motion.div>
  );
}

/** Lock overlay for premium-gated features */
export function PremiumLockOverlay({ feature }: { feature: string }) {
  const { toast } = useToast();
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
        <Lock className="w-6 h-6 text-amber-500" />
      </div>
      <p className="text-sm font-bold mb-1">Fonctionnalité Premium</p>
      <p className="text-xs text-muted-foreground mb-3">{feature}</p>
      <Button size="sm" className="gap-1.5 h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={() => toast({ title: "Bientôt disponible", description: "L'abonnement Premium sera disponible prochainement." })}>
        <Crown className="w-3.5 h-3.5" />
        Débloquer
      </Button>
    </div>
  );
}
