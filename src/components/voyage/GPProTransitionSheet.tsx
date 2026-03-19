/**
 * GPProTransitionSheet — Smooth transition from occasional GP to professional GP
 * Shows benefits preview and remaining setup steps
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Shield, TrendingUp, Users, ChevronRight,
  CheckCircle2, Circle, BarChart3, Zap, Award, ArrowRight,
  Luggage, ScanLine, Wallet, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle
} from "@/components/ui/drawer";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface GPProTransitionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStats?: {
    tripsPublished: number;
    ordersCompleted: number;
    totalEarnings: number;
    currency: string;
  };
}

const PRO_BENEFITS = [
  {
    icon: BarChart3,
    title: "Dashboard complet",
    desc: "Statistiques avancées, performance, revenus en temps réel",
  },
  {
    icon: Users,
    title: "Visibilité prioritaire",
    desc: "Apparaissez en premier dans les résultats de recherche",
  },
  {
    icon: Zap,
    title: "Auto-acceptation",
    desc: "Acceptez automatiquement les commandes selon vos critères",
  },
  {
    icon: Shield,
    title: "Assurance renforcée",
    desc: "Couverture élargie et coefficient KTP optimisé",
  },
  {
    icon: Award,
    title: "Badge Pro",
    desc: "Inspirez confiance avec un profil vérifié et certifié",
  },
];

const SETUP_STEPS = [
  { key: "identity", label: "Identité vérifiée", desc: "Pièce d'identité + selfie", required: true },
  { key: "navette", label: "Corridor défini", desc: "Votre trajet principal", required: true },
  { key: "pricing", label: "Tarification configurée", desc: "Prix/kg et forfaits", required: true },
  { key: "documents", label: "Documents métier", desc: "Licence ou registre de commerce", required: false },
];

export function GPProTransitionSheet({ open, onOpenChange, currentStats }: GPProTransitionSheetProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"benefits" | "setup">("benefits");

  const handleStartSetup = () => {
    onOpenChange(false);
    navigate("/gp/bagages/inscription");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-0">
          <DrawerTitle className="text-base font-bold text-center">
            {step === "benefits" ? "Passez au niveau supérieur" : "Ce qui vous attend"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto overscroll-contain px-4 pb-6" style={{ maxHeight: "75vh", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          <AnimatePresence mode="wait">
            {step === "benefits" ? (
              <motion.div
                key="benefits"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 pt-3"
              >
                {/* Current stats summary */}
                {currentStats && currentStats.tripsPublished > 0 && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">Votre parcours</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-foreground">{currentStats.tripsPublished}</p>
                        <p className="text-[9px] text-muted-foreground">Voyages</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{currentStats.ordersCompleted}</p>
                        <p className="text-[9px] text-muted-foreground">Colis livrés</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{currentStats.totalEarnings.toLocaleString('fr-FR')}</p>
                        <p className="text-[9px] text-muted-foreground">{currentStats.currency} gagnés</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Headline */}
                <div className="text-center py-2">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                    Vous transportez déjà avec succès. Devenez GP Pro pour débloquer tous les outils professionnels.
                  </p>
                </div>

                {/* Benefits list */}
                <div className="space-y-2">
                  {PRO_BENEFITS.map((benefit, idx) => (
                    <motion.div
                      key={benefit.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <benefit.icon className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{benefit.title}</p>
                        <p className="text-[10px] text-muted-foreground leading-snug">{benefit.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* CTA */}
                <div className="pt-2 space-y-2">
                  <Button
                    onClick={() => setStep("setup")}
                    className="w-full h-12 text-sm font-bold rounded-xl"
                  >
                    Voir les étapes
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="w-full py-2 text-xs text-muted-foreground"
                  >
                    Plus tard
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="setup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4 pt-3"
              >
                {/* Setup intro */}
                <div className="text-center pb-1">
                  <p className="text-xs text-muted-foreground">
                    Complétez ces étapes pour activer votre profil GP Pro
                  </p>
                </div>

                {/* Steps */}
                <div className="space-y-1.5">
                  {SETUP_STEPS.map((s, idx) => (
                    <motion.div
                      key={s.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-foreground">{s.label}</p>
                          {s.required && (
                            <Badge variant="secondary" className="text-[8px] h-4 px-1">Requis</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                      </div>
                      <Circle className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                    </motion.div>
                  ))}
                </div>

                {/* Estimated time */}
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <p className="text-[11px] text-muted-foreground">Environ 5 minutes pour compléter</p>
                </div>

                {/* CTAs */}
                <div className="space-y-2">
                  <Button
                    onClick={handleStartSetup}
                    className="w-full h-12 text-sm font-bold rounded-xl"
                  >
                    Commencer l'inscription
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <button
                    onClick={() => setStep("benefits")}
                    className="w-full py-2 text-xs text-muted-foreground"
                  >
                    Retour
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
