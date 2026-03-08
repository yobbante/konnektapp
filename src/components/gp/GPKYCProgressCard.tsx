import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldCheck, ChevronDown, ChevronUp, Crown, Rocket,
  TrendingUp, Zap, BarChart3, Clock, Eye,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { isGPPremium } from "@/lib/premiumGating";

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

const PREMIUM_FEATURES = [
  { icon: Clock, label: "Réservation 12h avant" },
  { icon: TrendingUp, label: "Priorité résultats" },
  { icon: Zap, label: "Auto-accept" },
  { icon: BarChart3, label: "Stats avancées" },
];

const PRO_FEATURES = [
  { icon: Clock, label: "Réservation 4h avant" },
  { icon: TrendingUp, label: "Commission -40%" },
  { icon: Rocket, label: "Boost auto trajets" },
  { icon: Eye, label: "Visibilité maximale" },
];

export function GPKYCProgressCard({
  kycLevel,
  kycStatus,
  status,
  hasIdDocument,
  hasSelfie,
  subscription,
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
  const isPro = subscription === "pro";

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

  if (status === "suspended" || (progress === 100 && !isVerified && !isVerifying)) return null;

  // ── PRO → fully hidden ──
  if (isVerified && isPro) return null;

  // ── VERIFIED + PREMIUM → show "Upgrade to Pro" ──
  if (isVerified && isPremium) {
    return (
      <div ref={containerRef} className="w-full">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.995 }}
          onClick={() => setExpanded(prev => !prev)}
          className="w-full flex items-center gap-2.5 px-4 py-2 border-b bg-gradient-to-r from-violet-500/10 to-violet-500/5 border-violet-500/20 transition-colors"
        >
          <Rocket className="w-4 h-4 text-violet-500 flex-shrink-0" />
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-400 truncate">Passez Pro</span>
            <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 text-[8px] h-3.5 px-1.5">
              19 900 FCFA/mois
            </Badge>
          </div>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-violet-500/60 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-violet-500/60 flex-shrink-0" />
          )}
        </motion.button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-violet-500/15 bg-gradient-to-b from-violet-500/5 to-transparent"
            >
              <div className="px-4 py-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Maximisez vos gains avec le plan Pro.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRO_FEATURES.map((feat, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground p-1.5 rounded-md bg-violet-500/8 border border-violet-500/10">
                      <feat.icon className="w-3 h-3 text-violet-500 flex-shrink-0" />
                      {feat.label}
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="w-full text-xs h-8 gap-1.5 bg-violet-500 hover:bg-violet-600 text-white"
                  onClick={() => { setExpanded(false); navigate("/gp/premium"); }}
                >
                  <Rocket className="w-3.5 h-3.5" />
                  Passer Pro
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── VERIFIED + FREE → show "Upgrade to Premium" ──
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
          <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 truncate">Passez Premium</span>
            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[8px] h-3.5 px-1.5">
              9 900 FCFA/mois
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
                <p className="text-xs text-muted-foreground">
                  Débloquez la visibilité prioritaire et les réservations tardives.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PREMIUM_FEATURES.map((feat, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground p-1.5 rounded-md bg-amber-500/8 border border-amber-500/10">
                      <feat.icon className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      {feat.label}
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="w-full text-xs h-8 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => { setExpanded(false); navigate("/gp/premium"); }}
                >
                  <Crown className="w-3.5 h-3.5" />
                  Passer Premium
                </Button>
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
