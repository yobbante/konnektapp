/**
 * ClientQuickResponses - Réponses rapides prédéfinies pour les clients
 * 
 * 5 messages logiques qui ne nécessitent pas d'attendre la réponse du GP
 * car les réponses sont automatiques et logiques dans le flux
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, ChevronUp, ChevronDown, Send,
  Package, MapPin, Clock, HelpCircle, CheckCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuickResponse {
  id: string;
  icon: React.ComponentType<any>;
  message: string;
  autoResponse: string;
  color: string;
}

interface ClientQuickResponsesProps {
  onSelectMessage: (content: string) => void;
  onAutoResponse?: (response: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// 5 messages prédéfinis avec réponses automatiques logiques
const quickResponses: QuickResponse[] = [
  {
    id: "status",
    icon: Package,
    message: "Bonjour ! Pouvez-vous me donner le statut de mon colis ?",
    autoResponse: "Votre colis est actuellement en bon état et sera collecté selon le planning prévu. Vous recevrez une notification dès la collecte.",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    id: "location",
    icon: MapPin,
    message: "Où en est la livraison de mon colis ?",
    autoResponse: "La livraison suit son cours normal. Consultez l'onglet 'Suivi' pour voir la position en temps réel de votre colis.",
    color: "bg-green-500/10 text-green-600",
  },
  {
    id: "delay",
    icon: Clock,
    message: "Y a-t-il du retard sur ma livraison ?",
    autoResponse: "Pour le moment, votre livraison est dans les délais prévus. En cas de retard, vous serez notifié immédiatement.",
    color: "bg-orange-500/10 text-orange-600",
  },
  {
    id: "confirm",
    icon: CheckCircle,
    message: "Je confirme être disponible pour recevoir le colis.",
    autoResponse: "Parfait ! Votre disponibilité est enregistrée. Le transporteur vous contactera avant la livraison.",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    id: "help",
    icon: HelpCircle,
    message: "J'ai besoin d'aide concernant ma commande.",
    autoResponse: "Notre équipe support va examiner votre demande. En attendant, consultez les détails de votre commande ou contactez directement le transporteur.",
    color: "bg-purple-500/10 text-purple-600",
  },
];

export function ClientQuickResponses({ 
  onSelectMessage, 
  onAutoResponse,
  isExpanded = false,
  onToggleExpand
}: ClientQuickResponsesProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelectResponse = (response: QuickResponse) => {
    setSelectedId(response.id);
    
    // Send the client message
    onSelectMessage(response.message);
    
    // If auto-response handler is provided, send the auto response after a small delay
    if (onAutoResponse) {
      setTimeout(() => {
        onAutoResponse(response.autoResponse);
      }, 1500); // 1.5 second delay to simulate response
    }
    
    // Reset selection after a moment
    setTimeout(() => setSelectedId(null), 2000);
  };

  return (
    <div className="border-t border-border bg-muted/30">
      {/* Toggle button */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Réponses rapides
          </span>
          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
            5
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
              {quickResponses.map((response) => {
                const Icon = response.icon;
                const isSelected = selectedId === response.id;
                
                return (
                  <motion.button
                    key={response.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectResponse(response)}
                    disabled={isSelected}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border bg-background hover:border-primary/30 hover:bg-muted/50"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${response.color} flex-shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm line-clamp-2 ${isSelected ? "text-primary font-medium" : ""}`}>
                        {response.message}
                      </p>
                      {isSelected && (
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-muted-foreground mt-1"
                        >
                          Envoyé ✓
                        </motion.p>
                      )}
                    </div>
                    {!isSelected && (
                      <Send className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                    )}
                  </motion.button>
                );
              })}
              
              {/* Info text */}
              <p className="text-[10px] text-muted-foreground text-center pt-2">
                💡 Ces messages génèrent des réponses automatiques
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
