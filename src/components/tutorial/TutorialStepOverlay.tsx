import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X, CheckCircle, Lightbulb, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTutorial } from "@/lib/tutorial/TutorialContext";
import { TutorialMockScreen } from "./TutorialMockScreen";
import { mockEscrowLock, mockEscrowRelease, mockWeightAdjustment, mockScanAction } from "@/lib/tutorial/mockEngine";

export function TutorialStepOverlay() {
  const {
    tutorialMode, currentScenario, currentStepIndex, stateMachine,
    completeCurrentStep, nextStep, previousStep, exitTutorial,
    progress, totalSteps, mockState, applyMockAction,
  } = useTutorial();
  const [actionDone, setActionDone] = useState(false);

  if (!tutorialMode || !currentScenario || stateMachine === "EXIT") return null;

  const isCompleted = stateMachine === "SCENARIO_COMPLETED";
  const currentStep = currentScenario.steps[currentStepIndex];
  const isStepCompleted = stateMachine === "STEP_COMPLETED";

  const handleAction = () => {
    setActionDone(true);
    // Apply mock mutation if defined
    if (currentStep.mockMutation) {
      switch (currentStep.mockMutation) {
        case "escrow_lock":
          applyMockAction(s => mockEscrowLock(s, 15000));
          break;
        case "escrow_release":
          applyMockAction(s => mockEscrowRelease(s));
          break;
        case "scan_deposit":
          applyMockAction(s => mockScanAction(s, "deposit"));
          break;
        case "scan_delivery":
          applyMockAction(s => mockScanAction(s, "delivery"));
          break;
        case "weight_adjust_up":
          applyMockAction(s => mockWeightAdjustment(s, 5, 6, 5000));
          break;
        case "refund":
          applyMockAction(s => mockWeightAdjustment(s, 5, 4, 5000));
          break;
        case "supplement_pay":
          applyMockAction(s => mockEscrowLock(s, 5000));
          break;
        case "commission_split":
          applyMockAction(s => mockEscrowRelease(s));
          break;
        case "debt_deduct":
          applyMockAction(s => ({
            ...s,
            debt: { balance: Math.max(0, s.debt.balance - 2000), auto_deducted: s.debt.auto_deducted + 2000 },
            ledger: [...s.ledger, {
              id: `led-${Date.now()}`, type: "debt_deduction" as const, amount: 2000,
              description: "Déduction dette automatique", timestamp: new Date().toISOString(),
            }],
          }));
          break;
      }
    }
    setTimeout(() => {
      completeCurrentStep();
      setActionDone(false);
    }, 600);
  };

  const handleNext = () => {
    setActionDone(false);
    nextStep();
  };

  const handlePrev = () => {
    setActionDone(false);
    previousStep();
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Top bar */}
        <div className="relative z-10 px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] bg-white/10 text-white border-white/20 gap-1">
              <Sparkles className="w-3 h-3" />
              Mode Démo
            </Badge>
            <span className="text-white/50 text-[10px]">{currentScenario.title}</span>
          </div>
          <button onClick={exitTutorial} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="relative z-10 px-4 pb-2">
          <div className="flex gap-1">
            {currentScenario.steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full flex-1 transition-all duration-500 ${
                  i < currentStepIndex ? "bg-green-400" :
                  i === currentStepIndex ? (isStepCompleted ? "bg-green-400" : "bg-primary") :
                  "bg-white/15"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-white/40 text-[10px]">Étape {currentStepIndex + 1}/{totalSteps}</span>
          </div>
        </div>

        {/* Mock Screen Area */}
        <div className="relative z-10 flex-1 flex flex-col px-3 overflow-hidden">
          {!isCompleted && currentStep?.mockScreen && (
            <motion.div
              key={`screen-${currentStep.id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25 }}
              className="flex-1 overflow-y-auto pb-2"
            >
              <TutorialMockScreen
                screen={currentStep.mockScreen}
                mockState={mockState}
                role={currentScenario.role}
                stepIndex={currentStepIndex}
              />
            </motion.div>
          )}

          {isCompleted && (
            <div className="flex-1 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Scénario terminé ! 🎉</h3>
                <p className="text-sm text-white/60 mb-2">
                  Vous maîtrisez « {currentScenario.title} »
                </p>

                {/* Mini summary */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 mt-4 text-left max-w-xs mx-auto space-y-1">
                  <p className="text-[11px] text-white/40 font-medium mb-1.5">📊 Résumé sandbox</p>
                  <p className="text-[11px] text-white/60">Wallet Client : {mockState.clientWallet.balance.toLocaleString()} FCFA</p>
                  <p className="text-[11px] text-white/60">Wallet GP : {mockState.gpWallet.balance.toLocaleString()} FCFA</p>
                  <p className="text-[11px] text-white/60">Escrow : {mockState.escrow.status}</p>
                  <p className="text-[11px] text-white/60">Entrées ledger : {mockState.ledger.length}</p>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Bottom Card */}
        {!isCompleted && currentStep && (
          <motion.div
            key={currentStep.id}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 mx-3 mb-4 bg-card rounded-2xl shadow-2xl border border-border/40 overflow-hidden"
          >
            <div className="p-4">
              {/* Step header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-base">{currentStep.actionIcon || "📌"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-foreground">{currentStep.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{currentStep.description}</p>
                </div>
              </div>

              {/* Instruction tip */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-2.5 mb-3">
                <div className="flex gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground/80">{currentStep.instruction}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {currentStepIndex > 0 && (
                  <Button variant="ghost" size="sm" onClick={handlePrev} className="rounded-xl px-2.5">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}

                {isStepCompleted ? (
                  <Button size="sm" onClick={handleNext} className="flex-1 rounded-xl gap-1.5 h-10">
                    {currentStepIndex === totalSteps - 1 ? "Terminer 🎉" : "Étape suivante"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleAction}
                    disabled={actionDone}
                    className="flex-1 rounded-xl gap-1.5 h-10 relative overflow-hidden"
                  >
                    {actionDone ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-sm"
                      >
                        ✓
                      </motion.span>
                    ) : (
                      <>
                        <span>{currentStep.actionIcon}</span>
                        <span className="text-xs">{currentStep.actionLabel || "J'ai compris"}</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Completed → return button */}
        {isCompleted && (
          <div className="relative z-10 px-3 mb-4">
            <Button onClick={exitTutorial} className="w-full rounded-xl h-11">
              Retour aux tutoriels
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
