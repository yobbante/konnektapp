import { motion } from "framer-motion";
import { Shield, ShieldCheck, Star, Camera, CreditCard, ChevronRight, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GPKYCProgressCardProps {
  kycLevel: number;
  kycStatus: string;
  status: string;
  hasIdDocument: boolean;
  hasSelfie: boolean;
  hasBusinessReg: boolean;
  onActivateBadge: () => void;
}

export function GPKYCProgressCard({
  kycLevel,
  kycStatus,
  status,
  hasIdDocument,
  hasSelfie,
  hasBusinessReg,
  onActivateBadge,
}: GPKYCProgressCardProps) {
  // Don't show if already premium or suspended
  if (kycLevel >= 2 || status === "suspended") return null;

  const steps = [
    { label: "Inscription", done: true, icon: Shield },
    { label: "Pièce d'identité", done: hasIdDocument, icon: CreditCard },
    { label: "Selfie vérification", done: hasSelfie, icon: Camera },
  ];

  const completedSteps = steps.filter(s => s.done).length;
  const progress = Math.round((completedSteps / steps.length) * 100);
  const isVerifying = kycStatus === "pending";
  const isVerified = kycLevel >= 1;

  if (isVerified && kycLevel < 2) {
    // Level 1 verified — show premium upgrade nudge
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Passez GP Premium</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Commission réduite, support prioritaire, mise en avant.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
      </motion.div>
    );
  }

  // Level 0 — show KYC progression
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Profil professionnel</p>
        </div>
        <span className={cn(
          "text-xs font-bold px-2 py-0.5 rounded-full",
          progress === 100 ? "bg-emerald-500/10 text-emerald-600" :
          progress >= 50 ? "bg-amber-500/10 text-amber-600" :
          "bg-muted text-muted-foreground"
        )}>
          {progress}%
        </span>
      </div>

      <Progress value={progress} className="h-2" />

      {isVerifying ? (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            Vérification en cours...
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center",
                  step.done ? "bg-emerald-500/10" : "bg-muted"
                )}>
                  <step.icon className={cn("w-3 h-3", step.done ? "text-emerald-500" : "text-muted-foreground")} />
                </div>
                <span className={cn("text-xs", step.done ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {progress < 100 && (
            <Button
              size="sm"
              className="w-full text-xs h-9"
              onClick={onActivateBadge}
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              Activer le badge Vérifié
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Les clients préfèrent les GP vérifiés. Débloquez retrait illimité.
          </p>
        </>
      )}
    </motion.div>
  );
}
