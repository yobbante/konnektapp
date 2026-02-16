// ═══════════════════════════════════════════════
// KONNEKT TUTORIAL ENGINE — React Context
// ═══════════════════════════════════════════════

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { TutorialEngineState, TutorialScenario, TutorialRole, TutorialState, TutorialMockState } from "./types";
import { getInitialMockState, mockEscrowLock, mockEscrowRelease, mockWeightAdjustment, mockScanAction } from "./mockEngine";

interface TutorialContextValue extends TutorialEngineState {
  startScenario: (scenario: TutorialScenario) => void;
  nextStep: () => void;
  previousStep: () => void;
  exitTutorial: () => void;
  completeCurrentStep: () => void;
  setRole: (role: TutorialRole) => void;
  applyMockAction: (action: (state: TutorialMockState) => TutorialMockState) => void;
  isStepActive: boolean;
  totalSteps: number;
  progress: number;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TutorialEngineState>({
    tutorialMode: false,
    currentRole: null,
    currentScenario: null,
    currentStepIndex: 0,
    stateMachine: "INIT",
    mockState: getInitialMockState(),
    completedScenarios: JSON.parse(localStorage.getItem("konnekt_tutorial_completed") || "[]"),
  });

  const startScenario = useCallback((scenario: TutorialScenario) => {
    const activatedSteps = scenario.steps.map((s, i) => ({
      ...s,
      status: i === 0 ? "active" as const : "locked" as const,
    }));
    setState(prev => ({
      ...prev,
      tutorialMode: true,
      currentScenario: { ...scenario, steps: activatedSteps },
      currentStepIndex: 0,
      stateMachine: "STEP_ACTIVE",
      mockState: getInitialMockState(),
    }));
  }, []);

  const completeCurrentStep = useCallback(() => {
    setState(prev => {
      if (!prev.currentScenario) return prev;
      const steps = [...prev.currentScenario.steps];
      steps[prev.currentStepIndex] = { ...steps[prev.currentStepIndex], status: "completed" };
      return {
        ...prev,
        currentScenario: { ...prev.currentScenario, steps },
        stateMachine: "STEP_COMPLETED",
      };
    });
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      if (!prev.currentScenario) return prev;
      const nextIdx = prev.currentStepIndex + 1;
      if (nextIdx >= prev.currentScenario.steps.length) {
        // Scenario complete
        const completed = [...prev.completedScenarios, prev.currentScenario.id];
        localStorage.setItem("konnekt_tutorial_completed", JSON.stringify(completed));
        return {
          ...prev,
          stateMachine: "SCENARIO_COMPLETED",
          completedScenarios: completed,
        };
      }
      const steps = [...prev.currentScenario.steps];
      steps[nextIdx] = { ...steps[nextIdx], status: "active" };
      return {
        ...prev,
        currentStepIndex: nextIdx,
        currentScenario: { ...prev.currentScenario, steps },
        stateMachine: "STEP_ACTIVE",
      };
    });
  }, []);

  const previousStep = useCallback(() => {
    setState(prev => {
      if (!prev.currentScenario || prev.currentStepIndex === 0) return prev;
      return {
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1,
        stateMachine: "STEP_ACTIVE",
      };
    });
  }, []);

  const exitTutorial = useCallback(() => {
    setState(prev => ({
      ...prev,
      tutorialMode: false,
      currentScenario: null,
      currentStepIndex: 0,
      stateMachine: "EXIT",
      mockState: getInitialMockState(),
    }));
  }, []);

  const setRole = useCallback((role: TutorialRole) => {
    setState(prev => ({ ...prev, currentRole: role }));
  }, []);

  const applyMockAction = useCallback((action: (state: TutorialMockState) => TutorialMockState) => {
    setState(prev => ({
      ...prev,
      mockState: action(prev.mockState),
    }));
  }, []);

  const value = useMemo<TutorialContextValue>(() => ({
    ...state,
    startScenario,
    nextStep,
    previousStep,
    exitTutorial,
    completeCurrentStep,
    setRole,
    applyMockAction,
    isStepActive: state.stateMachine === "STEP_ACTIVE",
    totalSteps: state.currentScenario?.steps.length || 0,
    progress: state.currentScenario
      ? ((state.currentStepIndex + (state.stateMachine === "STEP_COMPLETED" ? 1 : 0)) / state.currentScenario.steps.length) * 100
      : 0,
  }), [state, startScenario, nextStep, previousStep, exitTutorial, completeCurrentStep, setRole, applyMockAction]);

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}
