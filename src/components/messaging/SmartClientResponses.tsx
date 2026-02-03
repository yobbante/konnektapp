/**
 * SmartClientResponses - Messages intelligents contextuels pour les clients
 * 
 * V2: Analyse le contexte réel de la commande et génère des réponses
 * basées sur les données actuelles (statut, poids, retard, etc.)
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, ChevronUp, ChevronDown, Send, Loader2,
  Package, MapPin, Clock, HelpCircle, CheckCircle, AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OrderContext {
  id: string;
  order_number: string;
  status: string;
  weight: number;
  origin_city: string;
  destination_city: string;
  created_at: string;
  pickup_date: string | null;
  delivery_date: string | null;
  actual_delivery_date: string | null;
  weight_tier_applied: string | null;
  logistics_status: string;
  has_logistics: boolean;
}

interface SmartResponse {
  id: string;
  icon: React.ComponentType<any>;
  message: string;
  getResponse: (ctx: OrderContext) => Promise<string>;
  color: string;
}

interface SmartClientResponsesProps {
  conversationId: string;
  currentUserId: string;
  onSelectMessage: (content: string) => void;
  onAutoResponse?: (response: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Status translations
const STATUS_LABELS: Record<string, string> = {
  pending: "En attente de confirmation",
  accepted: "Acceptée par le transporteur",
  collected: "Colis récupéré",
  in_transit: "En transit",
  arrived: "Arrivé à destination",
  delivered: "Livré",
  cancelled: "Annulée",
};

export function SmartClientResponses({ 
  conversationId,
  currentUserId,
  onSelectMessage, 
  onAutoResponse,
  isExpanded = false,
  onToggleExpand
}: SmartClientResponsesProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderContext, setOrderContext] = useState<OrderContext | null>(null);

  // Load order context from conversation
  useEffect(() => {
    loadOrderContext();
  }, [conversationId]);

  const loadOrderContext = async () => {
    try {
      // Get conversation to find order_id
      const { data: conversation } = await supabase
        .from("conversations")
        .select("order_id")
        .eq("id", conversationId)
        .maybeSingle();

      if (!conversation?.order_id) return;

      // Get order details
      const { data: order } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, weight, origin_city, destination_city,
          created_at, pickup_date, delivery_date, actual_delivery_date,
          weight_tier_applied, logistics_status
        `)
        .eq("id", conversation.order_id)
        .maybeSingle();

      if (order) {
        // Check if has logistics options
        const { data: logistics } = await supabase
          .from("order_logistics_options")
          .select("id")
          .eq("order_id", order.id)
          .maybeSingle();

        setOrderContext({
          ...order,
          has_logistics: !!logistics,
        });
      }
    } catch (error) {
      console.error("Error loading order context:", error);
    }
  };

  // Smart responses with context-aware logic
  const smartResponses: SmartResponse[] = [
    {
      id: "status",
      icon: Package,
      message: "Bonjour ! Pouvez-vous me donner le statut de mon colis ?",
      color: "bg-blue-500/10 text-blue-600",
      getResponse: async (ctx) => {
        const statusLabel = STATUS_LABELS[ctx.status] || ctx.status;
        const route = `${ctx.origin_city} → ${ctx.destination_city}`;
        
        let response = `📦 **Statut de votre commande #${ctx.order_number.slice(-6)}**\n\n`;
        response += `🚚 Trajet: ${route}\n`;
        response += `📍 Statut actuel: **${statusLabel}**\n`;
        response += `⚖️ Poids: ${ctx.weight} kg\n`;
        
        if (ctx.pickup_date) {
          response += `📅 Date de collecte: ${format(new Date(ctx.pickup_date), "d MMMM yyyy", { locale: fr })}\n`;
        }
        
        // Check for weight correction pending
        if (ctx.weight_tier_applied?.startsWith("pending:")) {
          const newWeight = ctx.weight_tier_applied.split(":")[1];
          response += `\n⚠️ **Action requise**: Le poids a été ajusté à ${newWeight} kg lors du dépôt. Veuillez confirmer sur votre page d'accueil.`;
        }
        
        return response;
      },
    },
    {
      id: "location",
      icon: MapPin,
      message: "Où en est la livraison de mon colis ?",
      color: "bg-green-500/10 text-green-600",
      getResponse: async (ctx) => {
        let response = "";
        
        switch (ctx.status) {
          case "pending":
            response = `⏳ Votre colis est en attente de confirmation par le transporteur. Vous serez notifié dès qu'il sera pris en charge.`;
            break;
          case "accepted":
            response = `✅ Le transporteur a accepté votre envoi ! Le colis sera collecté prochainement.`;
            if (ctx.pickup_date) {
              response += `\n📅 Date de collecte prévue: ${format(new Date(ctx.pickup_date), "d MMMM", { locale: fr })}`;
            }
            break;
          case "collected":
            response = `📦 Votre colis a été collecté et est en préparation pour le transport vers ${ctx.destination_city}.`;
            break;
          case "in_transit":
            response = `🚚 Votre colis est actuellement en transit vers ${ctx.destination_city}. La livraison est en cours.`;
            if (ctx.delivery_date) {
              response += `\n📅 Arrivée estimée: ${format(new Date(ctx.delivery_date), "d MMMM", { locale: fr })}`;
            }
            break;
          case "arrived":
            response = `✅ Votre colis est arrivé à ${ctx.destination_city} ! La livraison finale sera effectuée sous peu.`;
            break;
          case "delivered":
            response = `🎉 Votre colis a été livré avec succès ! Merci d'utiliser Yobbanté.`;
            break;
          default:
            response = `📍 Statut: ${STATUS_LABELS[ctx.status] || ctx.status}. Consultez l'onglet "Suivi" pour plus de détails.`;
        }
        
        return response;
      },
    },
    {
      id: "delay",
      icon: Clock,
      message: "Y a-t-il du retard sur ma livraison ?",
      color: "bg-orange-500/10 text-orange-600",
      getResponse: async (ctx) => {
        const now = new Date();
        
        // Check if delivery date has passed
        if (ctx.delivery_date) {
          const deliveryDate = new Date(ctx.delivery_date);
          if (now > deliveryDate && ctx.status !== "delivered") {
            const daysDiff = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
            return `⚠️ **Retard détecté**\n\nLa livraison était prévue pour le ${format(deliveryDate, "d MMMM", { locale: fr })} (${daysDiff} jour(s) de retard).\n\nLe transporteur a été notifié. Si vous n'avez pas de nouvelles sous 24h, contactez notre support.`;
          }
        }
        
        // Check pickup date
        if (ctx.pickup_date && ctx.status === "pending") {
          const pickupDate = new Date(ctx.pickup_date);
          if (now > pickupDate) {
            return `⚠️ La collecte était prévue pour le ${format(pickupDate, "d MMMM", { locale: fr })}. Le transporteur n'a pas encore confirmé le dépôt. Nous le contactons automatiquement.`;
          }
        }
        
        return `⏱️ **Aucun retard signalé**\n\nVotre livraison suit son cours normal. Vous recevrez une notification à chaque étape importante.`;
      },
    },
    {
      id: "confirm",
      icon: CheckCircle,
      message: "Je confirme être disponible pour recevoir le colis.",
      color: "bg-emerald-500/10 text-emerald-600",
      getResponse: async (ctx) => {
        // Log availability confirmation
        try {
          await supabase.from("order_status_history").insert({
            order_id: ctx.id,
            status: "client_available",
            changed_by: currentUserId,
            changed_by_type: "client",
            notes: "Client confirme disponibilité pour réception",
          });
        } catch (e) {
          console.error("Error logging availability:", e);
        }
        
        return `✅ **Disponibilité enregistrée**\n\nMerci ! Le transporteur a été informé que vous êtes disponible pour recevoir votre colis.\n\nVous serez contacté avant la livraison finale.`;
      },
    },
    {
      id: "help",
      icon: HelpCircle,
      message: "J'ai besoin d'aide concernant ma commande.",
      color: "bg-purple-500/10 text-purple-600",
      getResponse: async (ctx) => {
        let response = `👋 **Analyse de votre commande en cours...**\n\n`;
        
        // Diagnostic automatique
        const issues: string[] = [];
        
        // Check weight correction pending
        if (ctx.weight_tier_applied?.startsWith("pending:")) {
          issues.push("⚖️ Ajustement de poids en attente de confirmation");
        }
        
        // Check delayed pickup
        if (ctx.pickup_date && ctx.status === "pending") {
          const pickupDate = new Date(ctx.pickup_date);
          if (new Date() > pickupDate) {
            issues.push("📅 Collecte en retard");
          }
        }
        
        // Check delayed delivery
        if (ctx.delivery_date && !["delivered", "cancelled"].includes(ctx.status)) {
          const deliveryDate = new Date(ctx.delivery_date);
          if (new Date() > deliveryDate) {
            issues.push("🚚 Livraison en retard");
          }
        }
        
        if (issues.length > 0) {
          response += `**Problèmes détectés:**\n${issues.map(i => `• ${i}`).join("\n")}\n\n`;
          response += `Notre équipe support va examiner ces points et vous recontacter rapidement.`;
          
          // Create support ticket
          try {
            await supabase.from("notifications").insert({
              user_id: currentUserId,
              type: "support_request",
              title: "Demande d'aide reçue",
              message: `Votre demande concernant la commande #${ctx.order_number.slice(-6)} a été transmise au support.`,
              related_type: "order",
              related_id: ctx.id,
            });
          } catch (e) {
            console.error("Error creating support notification:", e);
          }
        } else {
          response += `✅ Aucun problème détecté sur votre commande.\n\n`;
          response += `Statut: ${STATUS_LABELS[ctx.status] || ctx.status}\n\n`;
          response += `Pour toute question spécifique, n'hésitez pas à écrire directement au transporteur dans cette conversation.`;
        }
        
        return response;
      },
    },
  ];

  const handleSelectResponse = async (response: SmartResponse) => {
    setSelectedId(response.id);
    setLoading(true);
    
    // Send the client message
    onSelectMessage(response.message);
    
    // Generate smart response based on context
    if (onAutoResponse && orderContext) {
      try {
        const autoResponse = await response.getResponse(orderContext);
        setTimeout(() => {
          onAutoResponse(autoResponse);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error("Error generating response:", error);
        setLoading(false);
      }
    } else if (onAutoResponse) {
      // No order context - fallback response
      setTimeout(() => {
        onAutoResponse("📋 Nous n'avons pas trouvé de commande associée à cette conversation. Veuillez préciser votre demande ou contacter le support.");
        setLoading(false);
      }, 500);
    }
    
    setTimeout(() => setSelectedId(null), 2500);
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
            Réponses intelligentes
          </span>
          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
            {orderContext ? "Contexte chargé" : "5"}
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
              {/* Order context indicator */}
              {orderContext && (
                <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg text-xs text-green-700 mb-2">
                  <CheckCircle className="w-3 h-3" />
                  <span>Commande #{orderContext.order_number.slice(-6)} - {orderContext.origin_city} → {orderContext.destination_city}</span>
                </div>
              )}
              
              {smartResponses.map((response) => {
                const Icon = response.icon;
                const isSelected = selectedId === response.id;
                
                return (
                  <motion.button
                    key={response.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectResponse(response)}
                    disabled={isSelected || loading}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border bg-background hover:border-primary/30 hover:bg-muted/50"
                    } ${loading && !isSelected ? "opacity-50" : ""}`}
                  >
                    <div className={`p-2 rounded-lg ${response.color} flex-shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm line-clamp-2 ${isSelected ? "text-primary font-medium" : ""}`}>
                        {response.message}
                      </p>
                      {isSelected && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-1 text-xs text-muted-foreground mt-1"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Analyse en cours...
                            </>
                          ) : (
                            <>✓ Réponse envoyée</>
                          )}
                        </motion.div>
                      )}
                    </div>
                    {!isSelected && !loading && (
                      <Send className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                    )}
                  </motion.button>
                );
              })}
              
              {/* Info text */}
              <p className="text-[10px] text-muted-foreground text-center pt-2">
                💡 Réponses basées sur les données réelles de votre commande
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
