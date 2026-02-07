import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Package, Search, MessageSquare, Bell, Heart, Star, 
  Truck, FileCheck, MapPin, Wallet, BarChart3, Settings,
  Shield, Users, AlertTriangle, HelpCircle,
  ChevronLeft, ChevronRight, Sparkles, CheckCircle
} from "lucide-react";

export interface OnboardingStep {
  icon: any;
  title: string;
  description: string;
  tips?: string[];
}

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
  role: "client" | "transporter" | "admin";
  userName?: string;
}

const clientSteps: OnboardingStep[] = [
  {
    icon: Sparkles,
    title: "Bienvenue sur Konnekt !",
    description: "Votre plateforme de transport sécurisé par scan entre le Sénégal et l'Afrique. Découvrons ensemble comment envoyer votre premier colis.",
    tips: [
      "Comparez les offres de différents transporteurs",
      "Suivez vos colis en temps réel",
      "Communiquez directement avec les GPs"
    ]
  },
  {
    icon: Search,
    title: "Trouvez des offres",
    description: "Parcourez les offres de transport disponibles et filtrez par destination, date et prix pour trouver celle qui vous convient.",
    tips: [
      "Utilisez les filtres pour affiner votre recherche",
      "Comparez les prix au kilogramme",
      "Vérifiez les avis des transporteurs"
    ]
  },
  {
    icon: Package,
    title: "Réservez un envoi",
    description: "Sélectionnez une offre, indiquez le poids de votre colis et procédez à la réservation en quelques clics.",
    tips: [
      "Précisez bien le contenu de votre colis",
      "Indiquez la valeur déclarée pour l'assurance",
      "Ajoutez des instructions spéciales si nécessaire"
    ]
  },
  {
    icon: MessageSquare,
    title: "Communiquez avec le GP",
    description: "Échangez directement avec votre transporteur pour coordonner la collecte et la livraison de votre colis.",
    tips: [
      "Confirmez les détails de collecte",
      "Partagez les coordonnées du destinataire",
      "Restez réactif aux messages"
    ]
  },
  {
    icon: Heart,
    title: "Sauvegardez vos favoris",
    description: "Ajoutez les offres et transporteurs de confiance à vos favoris pour les retrouver facilement lors de vos prochains envois.",
    tips: [
      "Cliquez sur le cœur pour sauvegarder",
      "Retrouvez-les dans 'Mes Favoris'",
      "Recevez des alertes sur vos trajets préférés"
    ]
  }
];

const transporterSteps: OnboardingStep[] = [
  {
    icon: Sparkles,
    title: "Bienvenue Partenaire GP !",
    description: "Développez votre activité de transport en rejoignant notre réseau. Voici comment maximiser vos opportunités sur la plateforme.",
    tips: [
      "Complétez votre profil à 100%",
      "Publiez des offres régulièrement",
      "Répondez rapidement aux demandes"
    ]
  },
  {
    icon: FileCheck,
    title: "Complétez votre profil",
    description: "Un profil complet avec tous vos documents inspire confiance. Les clients privilégient les GPs vérifiés.",
    tips: [
      "Ajoutez votre licence de transport",
      "Téléchargez vos documents d'assurance",
      "Décrivez votre flotte et expérience"
    ]
  },
  {
    icon: Package,
    title: "Publiez vos offres",
    description: "Créez des offres de transport avec vos trajets, capacités et tarifs. Plus vous publiez, plus vous êtes visible.",
    tips: [
      "Indiquez des dates précises de départ",
      "Fixez des prix compétitifs",
      "Précisez vos conditions de transport"
    ]
  },
  {
    icon: MapPin,
    title: "Gérez vos zones",
    description: "Configurez vos zones de couverture et destinations internationales pour apparaître dans les recherches pertinentes.",
    tips: [
      "Ajoutez toutes les villes desservies",
      "Indiquez vos destinations régulières",
      "Mettez à jour selon vos trajets"
    ]
  },
  {
    icon: Wallet,
    title: "Gérez vos revenus",
    description: "Suivez vos gains, gérez votre portefeuille et effectuez des retraits depuis votre tableau de bord.",
    tips: [
      "Consultez vos transactions en détail",
      "Effectuez des retraits réguliers",
      "Suivez votre progression mensuelle"
    ]
  },
  {
    icon: Star,
    title: "Développez votre réputation",
    description: "Chaque livraison réussie renforce votre score. Les meilleurs GPs obtiennent le badge 'Vérifié' et plus de missions.",
    tips: [
      "Respectez toujours les délais",
      "Demandez des avis après livraison",
      "Communiquez proactivement"
    ]
  }
];

const adminSteps: OnboardingStep[] = [
  {
    icon: Shield,
    title: "Bienvenue Administrateur",
    description: "Gérez l'ensemble de la plateforme depuis votre tableau de bord centralisé. Voici un aperçu de vos outils.",
    tips: [
      "Utilisez la recherche globale",
      "Surveillez les indicateurs clés",
      "Gérez les utilisateurs et rôles"
    ]
  },
  {
    icon: Users,
    title: "Gestion des utilisateurs",
    description: "Validez les inscriptions GP, gérez les profils clients et attribuez les permissions selon les besoins.",
    tips: [
      "Vérifiez les documents des GPs",
      "Approuvez ou refusez les demandes",
      "Attribuez les rôles avec précaution"
    ]
  },
  {
    icon: Package,
    title: "Suivi des commandes",
    description: "Supervisez toutes les commandes de la plateforme, intervenez en cas de problème et assurez la qualité du service.",
    tips: [
      "Filtrez par statut et date",
      "Consultez les détails logistiques",
      "Intervenez sur les litiges"
    ]
  },
  {
    icon: AlertTriangle,
    title: "Arbitrage des litiges",
    description: "Résolvez les conflits entre clients et transporteurs de manière équitable avec les outils d'arbitrage intégrés.",
    tips: [
      "Écoutez les deux parties",
      "Consultez l'historique des échanges",
      "Appliquez les sanctions appropriées"
    ]
  },
  {
    icon: BarChart3,
    title: "Statistiques & Analytics",
    description: "Analysez les performances de la plateforme avec des tableaux de bord détaillés et des rapports exportables.",
    tips: [
      "Suivez les KPIs principaux",
      "Identifiez les tendances",
      "Prenez des décisions data-driven"
    ]
  }
];

export function OnboardingDialog({
  open,
  onComplete,
  onSkip,
  role,
  userName
}: OnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = role === "client" ? clientSteps 
    : role === "transporter" ? transporterSteps 
    : adminSteps;
  
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header with gradient */}
        <div className={`p-6 ${
          role === "admin" 
            ? "bg-gradient-to-br from-slate-800 to-slate-900 text-white" 
            : role === "transporter"
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
            : "bg-gradient-to-br from-cyan-500 to-blue-500 text-white"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">
                Étape {currentStep + 1} sur {steps.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              Passer
            </Button>
          </div>
          
          <Progress value={progress} className="h-1.5 bg-white/20" />
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                  role === "admin" 
                    ? "bg-slate-100 text-slate-800" 
                    : role === "transporter"
                    ? "bg-primary/10 text-primary"
                    : "bg-cyan-100 text-cyan-600"
                }`}>
                  <StepIcon className="w-8 h-8" />
                </div>
                
                <DialogHeader className="text-center">
                  <DialogTitle className="text-xl mb-2">
                    {currentStep === 0 && userName 
                      ? currentStepData.title.replace("!", `, ${userName} !`)
                      : currentStepData.title
                    }
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    {currentStepData.description}
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Tips */}
              {currentStepData.tips && (
                <div className="space-y-2 mb-6">
                  {currentStepData.tips.map((tip, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Précédent
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1"
            >
              {isLastStep ? (
                <>
                  Commencer
                  <Sparkles className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? "bg-primary w-6" 
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
