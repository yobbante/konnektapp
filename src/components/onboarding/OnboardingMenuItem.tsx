import { HelpCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetAllOnboarding, OnboardingRole } from "@/hooks/useOnboarding";
import { useToast } from "@/hooks/use-toast";

interface OnboardingMenuItemProps {
  onResetOnboarding?: () => void;
  role?: OnboardingRole;
}

export function OnboardingMenuItem({ onResetOnboarding, role }: OnboardingMenuItemProps) {
  const { toast } = useToast();

  const handleReset = () => {
    if (onResetOnboarding) {
      onResetOnboarding();
    }
    toast({
      title: "Tutoriel réinitialisé",
      description: "Le guide de bienvenue sera affiché à la prochaine visite",
    });
  };

  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-2"
      onClick={handleReset}
    >
      <HelpCircle className="w-4 h-4" />
      Revoir le tutoriel
    </Button>
  );
}

export function ResetAllOnboardingButton() {
  const { toast } = useToast();

  const handleResetAll = () => {
    resetAllOnboarding();
    toast({
      title: "Tous les tutoriels réinitialisés",
      description: "Les guides seront affichés à la prochaine connexion",
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResetAll}
      className="gap-2"
    >
      <RotateCcw className="w-4 h-4" />
      Réinitialiser tous les tutoriels
    </Button>
  );
}
