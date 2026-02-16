import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { User, Truck, GraduationCap, RotateCcw, ChevronDown } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TutorialScenarioCard } from "@/components/tutorial/TutorialScenarioCard";
import { TutorialStepOverlay } from "@/components/tutorial/TutorialStepOverlay";
import { TutorialMockDashboard } from "@/components/tutorial/TutorialMockDashboard";
import { TutorialProvider, useTutorial } from "@/lib/tutorial/TutorialContext";
import { clientScenarios, gpScenarios } from "@/lib/tutorial/scenarios";
import { useUserRole } from "@/hooks/useUserRole";
import {
  mockEscrowLock, mockEscrowRelease, mockWeightAdjustment,
  mockScanAction, mockManualParcelCommission,
} from "@/lib/tutorial/mockEngine";
import type { TutorialScenario } from "@/lib/tutorial/types";

function TutorialEngineContent() {
  const location = useLocation();
  const { isGP, isAdmin } = useUserRole();
  const tutorial = useTutorial();
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (location.pathname.startsWith("/gp")) return "gp";
    return "client";
  });

  useEffect(() => {
    tutorial.setRole(activeTab as "client" | "gp");
  }, [activeTab]);

  const completedIds = tutorial.completedScenarios;
  const clientCompleted = clientScenarios.filter(s => completedIds.includes(s.id)).length;
  const gpCompleted = gpScenarios.filter(s => completedIds.includes(s.id)).length;

  const handleStartScenario = (scenario: TutorialScenario) => {
    // Apply initial mock mutations based on scenario type
    tutorial.startScenario(scenario);

    // Pre-populate mock state for certain scenarios
    if (scenario.category === "escrow" || scenario.category === "envoi") {
      setTimeout(() => {
        tutorial.applyMockAction(state => mockEscrowLock(state, 15000));
      }, 300);
    }
    if (scenario.category === "dette") {
      tutorial.applyMockAction(state => ({
        ...state,
        debt: { balance: 2000, auto_deducted: 0 },
      }));
    }
  };

  const handleReset = () => {
    localStorage.removeItem("konnekt_tutorial_completed");
    window.location.reload();
  };

  return (
    <div
      className="min-h-screen bg-muted/30"
      style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
    >
      <AppHeader title="Tutoriels" showBack />

      {/* Tutorial Overlay */}
      <TutorialStepOverlay />

      <div className="px-4 py-4 space-y-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">
            Konnekt Academy
          </h1>
          <p className="text-sm text-muted-foreground">
            Apprenez en pratiquant — aucune donnée réelle impactée
          </p>
          <Badge variant="outline" className="mt-2 text-xs border-amber-500/30 text-amber-600">
            🔒 Environnement Sandbox
          </Badge>
        </motion.div>

        {/* Mock Dashboard (visible during active tutorial) */}
        {tutorial.tutorialMode && tutorial.currentScenario && (
          <TutorialMockDashboard
            mockState={tutorial.mockState}
            role={tutorial.currentRole || "client"}
          />
        )}

        {/* Tabs */}
        {!tutorial.tutorialMode && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="client" className="gap-1.5">
                <User className="w-4 h-4" />
                Client ({clientCompleted}/{clientScenarios.length})
              </TabsTrigger>
              <TabsTrigger value="gp" className="gap-1.5">
                <Truck className="w-4 h-4" />
                GP ({gpCompleted}/{gpScenarios.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="client" className="mt-3 space-y-2">
              {clientScenarios.map((scenario, idx) => (
                <TutorialScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isCompleted={completedIds.includes(scenario.id)}
                  onStart={() => handleStartScenario(scenario)}
                  index={idx}
                />
              ))}
            </TabsContent>

            <TabsContent value="gp" className="mt-3 space-y-2">
              {gpScenarios.map((scenario, idx) => (
                <TutorialScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isCompleted={completedIds.includes(scenario.id)}
                  onStart={() => handleStartScenario(scenario)}
                  index={idx}
                />
              ))}
            </TabsContent>
          </Tabs>
        )}

        {/* Reset button */}
        {!tutorial.tutorialMode && completedIds.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="w-full gap-2 text-muted-foreground"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser tous les tutoriels
          </Button>
        )}
      </div>

      <MobileNav />
    </div>
  );
}

export default function TutorialEngine() {
  return (
    <TutorialProvider>
      <TutorialEngineContent />
    </TutorialProvider>
  );
}
