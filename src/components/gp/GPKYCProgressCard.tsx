import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldCheck, ChevronDown, ChevronUp, Crown,
  TrendingUp, Zap, BarChart3, Star, Eye,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { isGPPremium } from "@/lib/premiumGating";
import { PremiumCTABanner } from "@/components/gp/PremiumCTABanner";

interface GPKYCProgressCardProps {
  kycLevel: number;
  kycStatus: string;
  status: string;
  hasIdDocument: boolean;
  hasSelfie: boolean;
  hasBusinessReg: boolean;
  subscription?: string;
  gpId?: string;
  onActivateBadge?: () => void;
}

export function GPKYCProgressCard({
  kycLevel,
  kycStatus,
  status,
  hasIdDocument,
  hasSelfie,
  hasBusinessReg,
  subscription,
  gpId,
}: GPKYCProgressCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const steps = [
    { label: "Inscription", done: true },
    { label: "Passeport / CNI", done: hasIdDocument },
    { label: "Selfie", done: hasSelfie },
  ];

  const completedSteps = steps.filter(s => s.done).length;
  const progress = Math.round((completedSteps / steps.length) * 100);
  const isVerifying = kycStatus === "pending";
  const isVerified = kycLevel >= 1;
  const isPremium = isGPPremium(subscription);

  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    const handleScroll = () => setExpanded(false);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [expanded]);

  // Hide only if suspended or (progress complete but not verified and not verifying)
  if (status === "suspended" || (progress === 100 && !isVerified && !isVerifying)) return null;

  // ── PREMIUM SUBSCRIBER VIEW ──
  if (isVerified && isPremium) {
    return (
      <div ref={containerRef} className="w-full">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.995 }}
          onClick={() => setExpanded(prev => !prev)}
          className="w-full flex items-center gap-2.5 px-4 py-2 border-b bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/20 transition-colors"
        >
          <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 truncate">GP Premium</span>
            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[8px] h-3.5 px-1.5 gap-0.5">
              Actif
            </Badge>
          </div>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-amber-500/60 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-amber-500/60 flex-shrink-0" />
          )}
        </motion.button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-amber-500/15 bg-gradient-to-b from-amber-500/5 to-transparent"
            >
              <div className="px-4 py-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: TrendingUp, label: "Visibilité prioritaire", active: true },
                    { icon: Zap, label: "Auto-accept", active: true },
                    { icon: BarChart3, label: "Stats avancées", active: true },
                    { icon: Star, label: "Badge Premium", active: true },
                  ].map((feat, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-[11px] p-2 rounded-lg bg-amber-500/8 border border-amber-500/10"
                    >
                      <feat.icon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span className="text-foreground/80">{feat.label}</span>
                    </div>
                  ))}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-8 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                  onClick={() => {
                    setExpanded(false);
                    navigate("/gp/performances");
                  }}
                >
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                  Voir mes performances
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── VERIFIED BUT NOT PREMIUM → show upgrade CTA ──
  if (isVerified && !isPremium) {
    return (
      <div ref={containerRef} className="w-full">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.995 }}
          onClick={() => setExpanded(prev => !prev)}
          className="w-full flex items-center gap-2.5 px-4 py-2 border-b bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/20 transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium truncate">GP Vérifié</span>
            <span className="text-[10px] text-amber-600 font-medium">Passez Premium</span>
          </div>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          )}
        </motion.button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-border/50 bg-card/80 backdrop-blur-sm"
            >
              <div className="px-4 py-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Profil vérifié. Débloquez les avantages Premium pour booster votre activité.
                </p>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { icon: TrendingUp, label: "Priorité résultats" },
                    { icon: Zap, label: "Auto-accept" },
                    { icon: BarChart3, label: "Stats avancées" },
                    { icon: Eye, label: "Visibilité max" },
                  ].map((feat, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground p-1.5 rounded-md bg-muted/40"
                    >
                      <feat.icon className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      {feat.label}
                    </div>
                  ))}
                </div>

                <PremiumCTABanner variant="compact" context="performances" isPremium={false} gpId={gpId} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── KYC IN PROGRESS VIEW (not yet verified) ──
  const label = isVerifying
    ? "Vérification en cours..."
    : `Profil ${progress}% complété`;

  const accentColor = progress === 100
    ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
    : "from-primary/5 to-primary/[0.02] border-primary/15";

  return (
    <div ref={containerRef} className="w-full">
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={{ scale: 0.995 }}
        onClick={() => setExpanded(prev => !prev)}
        className={cn(
          "w-full flex items-center gap-2.5 px-4 py-2 border-b bg-gradient-to-r transition-colors",
          accentColor
        )}
      >
        <ShieldCheck className={cn(
          "w-4 h-4 flex-shrink-0",
          isVerifying ? "text-blue-500" : "text-primary"
        )} />
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium truncate">{label}</span>
          {!isVerifying && (
            <Progress value={progress} className="h-1 w-16 flex-shrink-0" />
          )}
          {isVerifying && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        )}
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-border/50 bg-card/80 backdrop-blur-sm"
          >
            <div className="px-4 py-3 space-y-2.5">
              {!isVerifying && (
                <div className="flex items-center gap-3">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center",
                        step.done ? "bg-emerald-500/15" : "bg-muted"
                      )}>
                        {step.done ? (
                          <Shield className="w-2.5 h-2.5 text-emerald-500" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        )}
                      </div>
                      <span className={cn(
                        "text-[11px]",
                        step.done ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {isVerifying && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Vos documents sont en cours de vérification.
                </p>
              )}

              <Button
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => {
                  setExpanded(false);
                  navigate("/gp/apercu");
                }}
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                Compléter mon profil
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
