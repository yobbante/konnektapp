import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X, CheckCircle, Lightbulb, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTutorial } from "@/lib/tutorial/TutorialContext";

export function TutorialStepOverlay() {
  const {
    tutorialMode, currentScenario, currentStepIndex, stateMachine,
    completeCurrentStep, nextStep, previousStep, exitTutorial,
    progress, totalSteps, mockState,
  } = useTutorial();

  if (!tutorialMode || !currentScenario || stateMachine === "EXIT") return null;

  const isCompleted = stateMachine === "SCENARIO_COMPLETED";
  const currentStep = currentScenario.steps[currentStepIndex];
  const isStepCompleted = stateMachine === "STEP_COMPLETED";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col"
      >
        {/* Semi-transparent backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()} />

        {/* Top bar */}
        <div className="relative z-10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-xs font-medium bg-white/10 px-2.5 py-1 rounded-full">
              🎓 Mode Tutoriel
            </span>
          </div>
          <button
            onClick={exitTutorial}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Progress */}
        <div className="relative z-10 px-4 mb-2">
          <Progress value={progress} className="h-1 bg-white/10" />
          <div className="flex justify-between mt-1">
            <span className="text-white/50 text-[10px]">{currentScenario.title}</span>
            <span className="text-white/50 text-[10px]">{currentStepIndex + 1}/{totalSteps}</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom card */}
        <motion.div
          key={isCompleted ? "done" : currentStep?.id}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="relative z-10 mx-3 mb-6 bg-card rounded-2xl shadow-2xl border border-border/30 overflow-hidden"
        >
          {isCompleted ? (
            // ── Scenario Complete ──
            <div className="p-5 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Scénario terminé !</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Vous maîtrisez maintenant « {currentScenario.title} »
              </p>

              {/* Mock state summary */}
              <div className="bg-muted/50 rounded-xl p-3 mb-4 text-left space-y-1.5">
                <p className="text-xs font-semibold text-foreground">📊 Résumé sandbox</p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Wallet Client : {mockState.clientWallet.balance.toLocaleString()} FCFA</p>
                  <p>Wallet GP : {mockState.gpWallet.balance.toLocaleString()} FCFA</p>
                  <p>Escrow : {mockState.escrow.status} ({mockState.escrow.amount.toLocaleString()} FCFA)</p>
                  <p>Entrées ledger : {mockState.ledger.length}</p>
                  {mockState.commission.amount > 0 && (
                    <p>Commission : {mockState.commission.amount.toLocaleString()} FCFA ({mockState.commission.rate}%)</p>
                  )}
                  {mockState.debt.balance > 0 && (
                    <p className="text-amber-500">Dette restante : {mockState.debt.balance.toLocaleString()} FCFA</p>
                  )}
                </div>
              </div>

              <Button onClick={exitTutorial} className="w-full rounded-xl">
                Retour aux tutoriels
              </Button>
            </div>
          ) : (
            // ── Active Step ──
            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">{currentStepIndex + 1}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">{currentStep.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{currentStep.description}</p>
                </div>
              </div>

              {/* Instruction */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 mb-4">
                <div className="flex gap-2">
                  <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{currentStep.instruction}</p>
                </div>
              </div>

              {/* Mock state preview if relevant */}
              {mockState.ledger.length > 0 && (
                <div className="bg-muted/40 rounded-xl p-2.5 mb-3 max-h-24 overflow-y-auto">
                  {mockState.ledger.slice(-3).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 text-[11px] py-0.5">
                      <span className={entry.type === "payout" ? "text-green-500" : entry.type === "commission" ? "text-amber-500" : "text-muted-foreground"}>
                        {entry.type === "payout" ? "↗" : entry.type === "commission" ? "↙" : "•"}
                      </span>
                      <span className="text-muted-foreground truncate">{entry.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {currentStepIndex > 0 && (
                  <Button variant="outline" size="sm" onClick={previousStep} className="rounded-xl">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                {isStepCompleted ? (
                  <Button size="sm" onClick={nextStep} className="flex-1 rounded-xl gap-1">
                    {currentStepIndex === totalSteps - 1 ? "Terminer" : "Étape suivante"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={completeCurrentStep} className="flex-1 rounded-xl">
                    J'ai compris ✓
                  </Button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
