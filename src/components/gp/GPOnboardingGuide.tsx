import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Package, FileCheck, MapPin, Plus, MessageSquare, Star,
  ChevronRight, ChevronLeft, X, CheckCircle, Circle,
  Sparkles, Zap, TrendingUp, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  action?: string;
  actionLabel?: string;
  tips: string[];
  completed?: boolean;
}

interface GPOnboardingGuideProps {
  gpProfile: any;
  hasOffers: boolean;
  hasOrders: boolean;
  hasDocuments: boolean;
  onDismiss: () => void;
  onAction: (action: string) => void;
}

const ONBOARDING_DISMISSED_KEY = "gp_onboarding_dismissed";

export function GPOnboardingGuide({
  gpProfile,
  hasOffers,
  hasOrders,
  hasDocuments,
  onDismiss,
  onAction,
}: GPOnboardingGuideProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: "profile",
      title: "Complétez votre profil",
      description: "Un profil complet inspire confiance et attire plus de clients. Ajoutez vos documents et informations.",
      icon: FileCheck,
      action: "/transporter/profile",
      actionLabel: "Compléter mon profil",
      tips: [
        "Ajoutez une photo de votre entreprise",
        "Décrivez vos services en détail",
        "Téléchargez tous vos documents officiels"
      ],
      completed: hasDocuments,
    },
    {
      id: "offer",
      title: "Publiez votre première offre",
      description: "Créez une offre de transport pour apparaître dans les résultats de recherche et recevoir des réservations.",
      icon: Package,
      action: "create_offer",
      actionLabel: "Créer une offre",
      tips: [
        "Fixez un prix compétitif par kg",
        "Indiquez clairement les dates de départ",
        "Précisez les conditions de transport"
      ],
      completed: hasOffers,
    },
    {
      id: "zones",
      title: "Définissez vos zones de couverture",
      description: "Configurez les zones géographiques que vous desservez pour être visible par les clients de ces régions.",
      icon: MapPin,
      action: "/transporter/profile",
      actionLabel: "Configurer mes zones",
      tips: [
        "Soyez précis sur les villes desservies",
        "Ajoutez les destinations internationales",
        "Mettez à jour régulièrement vos trajets"
      ],
      completed: (gpProfile?.zones_covered?.length || 0) > 0,
    },
    {
      id: "respond",
      title: "Répondez aux demandes",
      description: "Consultez les demandes personnalisées des clients et proposez vos devis pour décrocher des missions.",
      icon: MessageSquare,
      action: "/gp/demandes",
      actionLabel: "Voir les demandes",
      tips: [
        "Répondez rapidement aux demandes",
        "Proposez des prix justes",
        "Soyez transparent sur les délais"
      ],
      completed: hasOrders,
    },
    {
      id: "success",
      title: "Développez votre réputation",
      description: "Livrez avec excellence, collectez des avis positifs et devenez un partenaire de confiance sur la plateforme.",
      icon: Star,
      tips: [
        "Respectez toujours les délais",
        "Communiquez proactivement avec vos clients",
        "Demandez des avis après chaque livraison"
      ],
      completed: (gpProfile?.total_deliveries || 0) > 5,
    },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;
  const currentStepData = steps[currentStep];

  const handleAction = () => {
    if (currentStepData.action) {
      if (currentStepData.action.startsWith("/")) {
        navigate(currentStepData.action);
      } else {
        onAction(currentStepData.action);
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    onDismiss();
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-24 right-4 z-40"
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full shadow-lg bg-gradient-to-r from-secondary to-secondary/80"
          size="lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Guide ({completedSteps}/{steps.length})
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-gradient-to-br from-card via-card to-primary/5 rounded-2xl border border-border shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
              <Zap className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Guide de démarrage</h3>
              <p className="text-xs text-muted-foreground">
                {completedSteps}/{steps.length} étapes complétées
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  step.completed
                    ? "bg-success text-success-foreground"
                    : index === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="p-4"
        >
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              currentStepData.completed 
                ? "bg-success/20 text-success" 
                : "bg-primary/10 text-primary"
            }`}>
              <currentStepData.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-foreground">{currentStepData.title}</h4>
                {currentStepData.completed && (
                  <Badge variant="success" className="text-xs">Complété</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {currentStepData.description}
              </p>

              {/* Tips */}
              <div className="space-y-1.5 mb-4">
                {currentStepData.tips.map((tip, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    {tip}
                  </div>
                ))}
              </div>

              {/* Action */}
              {currentStepData.actionLabel && !currentStepData.completed && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleAction}
                  className="w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {currentStepData.actionLabel}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="p-4 border-t border-border flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Précédent
        </Button>
        <div className="flex items-center gap-1">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep ? "bg-primary w-4" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={nextStep}
          disabled={currentStep === steps.length - 1}
        >
          Suivant
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Stats Preview */}
      {completedSteps >= 3 && (
        <div className="px-4 pb-4">
          <Card className="bg-gradient-to-r from-success/10 to-success/5 border-success/20">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-foreground">Vous progressez bien !</p>
                  <p className="text-xs text-muted-foreground">
                    Les transporteurs qui complètent leur profil reçoivent 3x plus de demandes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
}

// Hook to check if onboarding should be shown
export function useGPOnboarding(gpProfile: any) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    // Show onboarding if not dismissed and profile is pending or new
    if (!dismissed && gpProfile?.status === "pending") {
      setShowOnboarding(true);
    }
  }, [gpProfile]);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    dismissOnboarding,
    resetOnboarding,
  };
}
