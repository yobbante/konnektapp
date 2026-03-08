/**
 * PremiumCTABanner — Conversion-optimized Premium upsell with tiered pricing
 * 3 tiers: Standard (free), Premium (9 900 FCFA/mois), Pro (coming soon)
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Crown, Zap, Star, ChevronRight, Lock, BarChart3, Eye, Percent,
  CheckCircle2, Bell, Package, Rocket, Shield, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PremiumCTABannerProps {
  variant?: "compact" | "card" | "banner";
  context?: string;
  isPremium?: boolean;
  className?: string;
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

const STANDARD_FEATURES = [
  { icon: Package, label: "Publier des trajets" },
  { icon: Bell, label: "Recevoir des demandes" },
  { icon: CheckCircle2, label: "Accepter manuellement" },
  { icon: Eye, label: "Visibilité standard" },
];

const PREMIUM_FEATURES = [
  { icon: TrendingUp, label: "Priorité dans les résultats", highlight: true },
  { icon: Zap, label: "Auto-acceptation des commandes", highlight: true },
  { icon: BarChart3, label: "Dashboard performances avancé", highlight: true },
  { icon: Star, label: "Badge Premium visible", highlight: true },
  { icon: Percent, label: "Statistiques revenus détaillées", highlight: false },
  { icon: Bell, label: "Notifications prioritaires", highlight: false },
];

const PRO_EXTRAS = [
  { icon: Rocket, label: "Visibilité maximale" },
  { icon: TrendingUp, label: "Boost automatique trajets" },
  { icon: Percent, label: "Commission réduite" },
  { icon: BarChart3, label: "Analytics avancés" },
  { icon: Shield, label: "Support prioritaire" },
];

export function PremiumCTABanner({ variant = "card", context = "default", isPremium, className }: PremiumCTABannerProps) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);

  if (isPremium) return null;

  const msg = PREMIUM_MESSAGES[context] || PREMIUM_MESSAGES.default;

  const handleUpgrade = () => {
    toast({ title: "Bientôt disponible", description: "L'abonnement Premium sera disponible très prochainement." });
  };

  const premiumDialog = (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/15 via-amber-600/10 to-orange-500/5 px-5 pt-6 pb-4">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-500/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <DialogHeader className="relative text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/25">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold">Choisissez votre formule</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Investissez dans votre activité, gagnez plus chaque mois.
            </p>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* ── STANDARD TIER ── */}
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">GP Standard</p>
                  <p className="text-[11px] text-muted-foreground">Fonctionnement de base</p>
                </div>
                <Badge variant="outline" className="text-[10px] h-5">Gratuit</Badge>
              </div>
              <div className="space-y-1.5">
                {STANDARD_FEATURES.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <f.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
              <div className="pt-1">
                <p className="text-[10px] text-muted-foreground text-center">Votre plan actuel</p>
              </div>
            </CardContent>
          </Card>

          {/* ── PREMIUM TIER ── */}
          <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-orange-500/5 shadow-md shadow-amber-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-bl-lg">
              RECOMMANDÉ
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <p className="text-sm font-bold">GP Premium</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Pour les GPs ambitieux</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-600">9 900</p>
                  <p className="text-[10px] text-muted-foreground -mt-0.5">FCFA / mois</p>
                </div>
              </div>

              <Separator className="bg-amber-500/15" />

              <div className="space-y-2">
                {PREMIUM_FEATURES.map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2.5"
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0",
                      f.highlight ? "bg-amber-500/15" : "bg-muted/50"
                    )}>
                      <f.icon className={cn("w-3.5 h-3.5", f.highlight ? "text-amber-600" : "text-muted-foreground")} />
                    </div>
                    <span className={cn("text-xs", f.highlight ? "font-medium" : "text-muted-foreground")}>
                      {f.label}
                    </span>
                    {f.highlight && <CheckCircle2 className="w-3.5 h-3.5 text-accent ml-auto flex-shrink-0" />}
                  </motion.div>
                ))}
              </div>

              {/* ROI argument */}
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 text-center">
                <p className="text-[11px] font-semibold text-accent">
                  💡 1 seul colis supplémentaire par mois rembourse l'abonnement
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  En moyenne, les GP Premium reçoivent 3x plus de demandes
                </p>
              </div>

              <Button
                className="w-full gap-2 h-11 text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-lg shadow-amber-500/20"
                onClick={handleUpgrade}
              >
                <Crown className="w-4 h-4" />
                Passer Premium — 9 900 FCFA/mois
              </Button>
            </CardContent>
          </Card>

          {/* ── PRO TIER (coming soon) ── */}
          <Card className="border-border/30 opacity-70">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Rocket className="w-4 h-4 text-primary" />
                  <p className="text-sm font-bold">GP Pro</p>
                  <Badge variant="secondary" className="text-[9px] h-4 ml-1">Bientôt</Badge>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold">19 900</p>
                  <p className="text-[10px] text-muted-foreground -mt-0.5">FCFA / mois</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRO_EXTRAS.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 rounded-md px-2 py-1">
                    <f.icon className="w-3 h-3" />
                    {f.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <p className="text-[10px] text-center text-muted-foreground px-4">
            Paiement sécurisé · Résiliable à tout moment · Sans engagement
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (variant === "compact") {
    return (
      <>
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowDialog(true)}
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
        {premiumDialog}
      </>
    );
  }

  if (variant === "banner") {
    return (
      <>
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
              <Button size="sm" className="h-8 gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setShowDialog(true)}>
                <Crown className="w-3.5 h-3.5" />
                Découvrir les formules
              </Button>
            </div>
          </div>
        </motion.div>
        {premiumDialog}
      </>
    );
  }

  // Default: card variant
  return (
    <>
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
        <Button className="w-full gap-2 h-9 text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setShowDialog(true)}>
          <Crown className="w-3.5 h-3.5" />
          Découvrir les formules
        </Button>
      </motion.div>
      {premiumDialog}
    </>
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
