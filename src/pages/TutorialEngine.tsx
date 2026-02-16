import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { User, Truck, GraduationCap, RotateCcw } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TutorialScenarioCard } from "@/components/tutorial/TutorialScenarioCard";
import { TutorialStepOverlay } from "@/components/tutorial/TutorialStepOverlay";
import { TutorialProvider, useTutorial } from "@/lib/tutorial/TutorialContext";
import { clientScenarios, gpScenarios } from "@/lib/tutorial/scenarios";
import { useUserRole } from "@/hooks/useUserRole";
import type { TutorialScenario } from "@/lib/tutorial/types";

function TutorialEngineContent() {
  const location = useLocation();
  const { isGP } = useUserRole();
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
    tutorial.startScenario(scenario);
  };

  const handleReset = () => {
    localStorage.removeItem("konnekt_tutorial_completed");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-muted/30" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      <AppHeader title="Tutoriels" showBack />
      <TutorialStepOverlay />

      <div className="px-4 py-4 space-y-4">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">Konnekt Academy</h1>
          <p className="text-sm text-muted-foreground">Apprenez en pratiquant — mode démo interactif</p>
          <Badge variant="outline" className="mt-2 text-xs border-amber-500/30 text-amber-600">
            🔒 Environnement Sandbox — aucun impact réel
          </Badge>
        </motion.div>

        {/* Tabs */}
        {!tutorial.tutorialMode && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="client" className="gap-1.5 text-xs">
                <User className="w-3.5 h-3.5" />
                Client ({clientCompleted}/{clientScenarios.length})
              </TabsTrigger>
              <TabsTrigger value="gp" className="gap-1.5 text-xs">
                <Truck className="w-3.5 h-3.5" />
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

        {/* Reset */}
        {!tutorial.tutorialMode && completedIds.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="w-full gap-2 text-muted-foreground">
            <RotateCcw className="w-4 h-4" />
            Réinitialiser les tutoriels
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
