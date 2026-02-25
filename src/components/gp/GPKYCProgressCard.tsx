import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface GPKYCProgressCardProps {
  kycLevel: number;
  kycStatus: string;
  status: string;
  hasIdDocument: boolean;
  hasSelfie: boolean;
  hasBusinessReg: boolean;
  onActivateBadge?: () => void;
}

export function GPKYCProgressCard({
  kycLevel,
  kycStatus,
  status,
  hasIdDocument,
  hasSelfie,
  hasBusinessReg,
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

  if (kycLevel >= 2 || status === "suspended" || (progress === 100 && !isVerified && !isVerifying)) return null;

  const label = isVerified
    ? "GP Vérifié — Passez Premium"
    : isVerifying
    ? "Vérification en cours..."
    : `Profil ${progress}% complété`;

  const accentColor = isVerified
    ? "from-amber-500/10 to-amber-500/5 border-amber-500/20"
    : progress === 100
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
          isVerified ? "text-amber-500" : isVerifying ? "text-blue-500" : "text-primary"
        )} />
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium truncate">{label}</span>
          {!isVerified && !isVerifying && (
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
              {!isVerified && !isVerifying && (
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

              {isVerified && (
                <p className="text-xs text-muted-foreground">
                  Commission réduite, support prioritaire, mise en avant.
                </p>
              )}

              <Button
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => {
                  setExpanded(false);
                  navigate(isVerified ? "/gp/parametres" : "/gp/apercu");
                }}
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                {isVerified ? "Gérer mon compte" : "Compléter mon profil"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
