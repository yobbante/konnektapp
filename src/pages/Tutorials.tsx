import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Package, Search, MessageSquare, Heart, Star, 
  Truck, FileCheck, MapPin, Wallet, BarChart3,
  ChevronLeft, ChevronRight, CheckCircle, Play,
  User, Shield
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TutorialStep {
  icon: any;
  title: string;
  description: string;
  tips: string[];
}

const clientTutorials: TutorialStep[] = [
  {
    icon: Search,
    title: "Trouvez des offres",
    description: "Parcourez les offres de transport disponibles et filtrez par destination, date et prix.",
    tips: [
      "Utilisez les filtres pour affiner votre recherche",
      "Comparez les prix au kilogramme",
      "Vérifiez les avis des transporteurs"
    ]
  },
  {
    icon: Package,
    title: "Réservez un envoi",
    description: "Sélectionnez une offre, indiquez le poids de votre colis et procédez à la réservation.",
    tips: [
      "Précisez bien le contenu de votre colis",
      "Indiquez la valeur déclarée pour l'assurance",
      "Ajoutez des instructions spéciales si nécessaire"
    ]
  },
  {
    icon: MessageSquare,
    title: "Communiquez avec le GP",
    description: "Échangez directement avec votre transporteur pour coordonner la collecte et la livraison.",
    tips: [
      "Confirmez les détails de collecte",
      "Partagez les coordonnées du destinataire",
      "Restez réactif aux messages"
    ]
  },
  {
    icon: MapPin,
    title: "Suivez votre colis",
    description: "Suivez l'état de votre envoi en temps réel depuis votre espace client.",
    tips: [
      "Consultez le statut régulièrement",
      "Recevez des notifications automatiques",
      "Contactez le support si besoin"
    ]
  },
  {
    icon: Heart,
    title: "Sauvegardez vos favoris",
    description: "Ajoutez les offres et transporteurs de confiance à vos favoris.",
    tips: [
      "Cliquez sur le cœur pour sauvegarder",
      "Retrouvez-les dans 'Mes Favoris'",
      "Recevez des alertes sur vos trajets préférés"
    ]
  }
];

const transporterTutorials: TutorialStep[] = [
  {
    icon: FileCheck,
    title: "Complétez votre profil",
    description: "Un profil complet avec tous vos documents inspire confiance aux clients.",
    tips: [
      "Ajoutez votre licence de transport",
      "Téléchargez vos documents d'assurance",
      "Décrivez votre flotte et expérience"
    ]
  },
  {
    icon: Package,
    title: "Publiez vos offres",
    description: "Créez des offres de transport avec vos trajets, capacités et tarifs.",
    tips: [
      "Indiquez des dates précises de départ",
      "Fixez des prix compétitifs",
      "Précisez vos conditions de transport"
    ]
  },
  {
    icon: MapPin,
    title: "Gérez vos zones",
    description: "Configurez vos zones de couverture pour apparaître dans les recherches.",
    tips: [
      "Ajoutez toutes les villes desservies",
      "Indiquez vos destinations régulières",
      "Mettez à jour selon vos trajets"
    ]
  },
  {
    icon: MessageSquare,
    title: "Répondez rapidement",
    description: "Les clients apprécient une réponse rapide. Soyez réactif !",
    tips: [
      "Activez les notifications",
      "Répondez sous 24h maximum",
      "Utilisez les messages prédéfinis"
    ]
  },
  {
    icon: Wallet,
    title: "Gérez vos revenus",
    description: "Suivez vos gains et effectuez des retraits depuis votre tableau de bord.",
    tips: [
      "Consultez vos transactions en détail",
      "Effectuez des retraits réguliers",
      "Suivez votre progression mensuelle"
    ]
  },
  {
    icon: Star,
    title: "Développez votre réputation",
    description: "Chaque livraison réussie renforce votre score et visibilité.",
    tips: [
      "Respectez toujours les délais",
      "Demandez des avis après livraison",
      "Communiquez proactivement"
    ]
  }
];

function TutorialViewer({ 
  tutorials, 
  title,
  accentColor 
}: { 
  tutorials: TutorialStep[]; 
  title: string;
  accentColor: string;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = ((currentStep + 1) / tutorials.length) * 100;
  const currentTutorial = tutorials[currentStep];
  const StepIcon = currentTutorial.icon;

  return (
    <Card className="overflow-hidden">
      {/* Header with progress */}
      <div className={`p-4 ${accentColor} text-white`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{title}</h3>
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            {currentStep + 1} / {tutorials.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5 bg-white/20" />
      </div>

      <CardContent className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col items-center text-center mb-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                accentColor.includes('primary') ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
              }`}>
                <StepIcon className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-lg mb-2">{currentTutorial.title}</h4>
              <p className="text-sm text-muted-foreground">{currentTutorial.description}</p>
            </div>

            <div className="space-y-2 mb-4">
              {currentTutorial.tips.map((tip, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{tip}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Précédent
          </Button>
          <Button
            size="sm"
            onClick={() => setCurrentStep(Math.min(tutorials.length - 1, currentStep + 1))}
            disabled={currentStep === tutorials.length - 1}
            className="flex-1"
          >
            Suivant
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {tutorials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep 
                  ? "bg-primary w-5" 
                  : index < currentStep
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Tutorials() {
  const navigate = useNavigate();

  return (
    <div 
      className="min-h-screen bg-muted/30"
      style={{
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <AppHeader title="Tutoriels" showBack />

      <div className="px-4 py-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-xl font-bold text-foreground mb-1">
            Apprenez à utiliser Konnekt
          </h1>
          <p className="text-sm text-muted-foreground">
            Guides complets pour clients et transporteurs
          </p>
        </motion.div>

        {/* Tutorial Tabs */}
        <Tabs defaultValue="client" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="client" className="gap-2">
              <User className="w-4 h-4" />
              Client
            </TabsTrigger>
            <TabsTrigger value="transporter" className="gap-2">
              <Truck className="w-4 h-4" />
              Transporteur
            </TabsTrigger>
          </TabsList>

          <TabsContent value="client" className="mt-4">
            <TutorialViewer 
              tutorials={clientTutorials} 
              title="Guide Client"
              accentColor="bg-gradient-to-r from-primary to-primary/80"
            />
          </TabsContent>

          <TabsContent value="transporter" className="mt-4">
            <TutorialViewer 
              tutorials={transporterTutorials}
              title="Guide Transporteur"
              accentColor="bg-gradient-to-r from-secondary to-secondary/80"
            />
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Besoin d'aide ?</h3>
          
          <Button 
            variant="outline" 
            className="w-full justify-start gap-3"
            onClick={() => navigate("/settings")}
          >
            <Shield className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">Centre d'aide</p>
              <p className="text-xs text-muted-foreground">FAQ et support</p>
            </div>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start gap-3"
            onClick={() => navigate("/messages")}
          >
            <MessageSquare className="w-5 h-5 text-success" />
            <div className="text-left">
              <p className="font-medium">Contacter le support</p>
              <p className="text-xs text-muted-foreground">Nous sommes là pour vous</p>
            </div>
          </Button>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
