/**
 * PremiumCTABanner — Lightweight CTA badges that navigate to /gp/premium
 * No more dialog — all CTAs redirect to the dedicated premium page
 */
import { motion } from "framer-motion";
import {
  Crown, Zap, TrendingUp, ChevronRight, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PremiumCTABannerProps {
  variant?: "compact" | "card" | "banner";
  context?: string;
  isPremium?: boolean;
  className?: string;
  gpId?: string;
  onUpgraded?: () => void;
}

const PREMIUM_MESSAGES: Record<string, { title: string; desc: string }> = {
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
    desc: "Visibilité prioritaire, auto-accept et statistiques avancées.",
  },
  menu: {
    title: "Passez Premium",
    desc: "9 900 FCFA/mois — Gagnez plus, plus vite.",
  },
  default: {
    title: "Passez Premium",
    desc: "Visibilité prioritaire, statistiques avancées, auto-accept.",
  },
};

export function PremiumCTABanner({ variant = "card", context = "default", isPremium, className }: PremiumCTABannerProps) {
  const navigate = useNavigate();

  if (isPremium) return null;

  const msg = PREMIUM_MESSAGES[context] || PREMIUM_MESSAGES.default;
  const goToPremium = () => navigate("/gp/premium");

  if (variant === "compact") {
    return (
      <motion.button
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        onClick={goToPremium}
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
          "relative overflow-hidden rounded-2xl cursor-pointer",
          "bg-gradient-to-br from-amber-500/15 via-amber-600/10 to-orange-500/10",
          "border border-amber-500/25 p-4",
          className,
        )}
        onClick={goToPremium}
      >
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
                  9 900 FCFA/mois
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{msg.desc}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <TrendingUp className="w-3 h-3 text-amber-500" /> Priorité résultats
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Zap className="w-3 h-3 text-amber-500" /> Auto-accept
              </div>
            </div>
            <Button size="sm" className="h-8 gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white">
              <Crown className="w-3.5 h-3.5" />
              Découvrir les formules
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
        "bg-gradient-to-br from-amber-500/10 to-orange-500/5",
        "border border-amber-500/20",
        className,
      )}
      onClick={goToPremium}
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
      <div className="flex items-center justify-between bg-background/50 rounded-xl px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <TrendingUp className="w-3 h-3 text-amber-500" /> Priorité
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Zap className="w-3 h-3 text-amber-500" /> Auto-accept
          </div>
        </div>
        <p className="text-xs font-bold text-amber-600">9 900 FCFA/mois</p>
      </div>
      <Button className="w-full gap-2 h-9 text-xs bg-amber-500 hover:bg-amber-600 text-white">
        <Crown className="w-3.5 h-3.5" />
        Voir les formules
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
