import { AlertCircle, RefreshCw, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * NoMatchFeedback - Feedback client explicite V1.1
 * 
 * Explique pourquoi aucun transporteur n'est disponible
 * et propose des actions alternatives pour améliorer le matching.
 */

export type NoMatchReason = 
  | "no_available" 
  | "price_too_low" 
  | "zone_not_covered" 
  | "expired";

interface NoMatchFeedbackProps {
  reason: NoMatchReason;
  onModifySchedule?: () => void;
  onRetryLater?: () => void;
  onModifyRoute?: () => void;
  className?: string;
}

const feedbackMessages: Record<NoMatchReason, { title: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  no_available: {
    title: "Aucun transporteur disponible",
    description: "Aucun transporteur n'est disponible sur ce créneau. Essayez d'élargir vos dates ou de relancer plus tard.",
    icon: AlertCircle,
  },
  price_too_low: {
    title: "Prix non accepté",
    description: "Le prix proposé n'a pas été accepté par les transporteurs pour ce type de trajet. Le système ajustera les prochaines estimations.",
    icon: AlertCircle,
  },
  zone_not_covered: {
    title: "Zone peu couverte",
    description: "Très peu de transporteurs opèrent dans cette zone actuellement. Nous travaillons à étendre notre réseau.",
    icon: MapPin,
  },
  expired: {
    title: "Demande expirée",
    description: "Le créneau de recherche a expiré sans trouver de transporteur. Vous pouvez relancer une nouvelle demande.",
    icon: AlertCircle,
  },
};

export function NoMatchFeedback({
  reason,
  onModifySchedule,
  onRetryLater,
  onModifyRoute,
  className,
}: NoMatchFeedbackProps) {
  const feedback = feedbackMessages[reason];
  const Icon = feedback.icon;

  return (
    <Card className={`border-warning/30 bg-warning/5 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">{feedback.title}</h3>
            <p className="text-sm text-muted-foreground">{feedback.description}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {onModifySchedule && (
            <Button
              variant="outline"
              size="sm"
              onClick={onModifySchedule}
              className="flex-1 min-w-[140px]"
            >
              <Calendar className="w-4 h-4 mr-1" />
              Modifier le créneau
            </Button>
          )}
          
          {onRetryLater && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetryLater}
              className="flex-1 min-w-[140px]"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Relancer plus tard
            </Button>
          )}

          {onModifyRoute && (reason === "zone_not_covered") && (
            <Button
              variant="outline"
              size="sm"
              onClick={onModifyRoute}
              className="flex-1 min-w-[140px]"
            >
              <MapPin className="w-4 h-4 mr-1" />
              Modifier l'itinéraire
            </Button>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-warning/20">
          Plus le creneau est large, plus vous avez de chances de trouver un transporteur.
        </p>
      </CardContent>
    </Card>
  );
}
