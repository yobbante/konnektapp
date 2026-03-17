/**
 * SmartClientResponses - Messages intelligents contextuels pour les clients
 * 
 * V3: Messages intelligents pour GP Via Bagages
 * Analyse le contexte réel de la commande et génère des réponses
 * basées sur les données actuelles (statut, poids, retard, etc.)
 * 
 * RÈGLES:
 * - Réponses dynamiques basées sur la commande
 * - Aucun message générique vide
 * - Zéro mensonge, zéro promesse irréaliste
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, ChevronUp, ChevronDown, Send, Loader2,
  Package, MapPin, Clock, HelpCircle, CheckCircle, AlertTriangle,
  Shield, Scale, Truck, Calendar, DollarSign, User
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInsuranceDual, loadExchangeRates, getInsuranceInGpCurrency, type ExchangeRate } from "@/lib/currencyUtils";

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
  has_insurance: boolean;
  insurance_amount: number;
  currency: string;
  gp_deposit_address: string | null;
  gp_name: string;
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
          weight_tier_applied, logistics_status, has_insurance, insurance_amount, currency,
          gp_profiles:gp_id(business_name, deposit_address)
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
          has_insurance: order.has_insurance || false,
          insurance_amount: order.insurance_amount || 0,
          currency: order.currency || "XOF",
          gp_deposit_address: (order.gp_profiles as any)?.deposit_address || null,
          gp_name: (order.gp_profiles as any)?.business_name || "Transporteur",
        });
      }
    } catch (error) {
      console.error("Error loading order context:", error);
    }
  };

  // V3: Smart responses for GP Via Bagages
  const smartResponses: SmartResponse[] = [
    // 1️⃣ « Où en est mon colis ? »
    {
      id: "status",
      icon: Package,
      message: "Où en est mon colis ?",
      color: "bg-blue-500/10 text-blue-600",
      getResponse: async (ctx) => {
        switch (ctx.status) {
          case "pending":
            return `En attente de confirmation.\n\nVotre GP est en cours de traitement de votre demande.\nVous serez notifie des acceptation.`;
          case "accepted":
            return `Votre GP a accepte la commande.\n\nLa remise du colis est en cours d'organisation.\nLieu de depot: ${ctx.gp_deposit_address || "A confirmer"}`;
          case "collected":
            return `Colis collecte avec succes.\n\nIl est desormais sous la responsabilite du GP.\nPoids verifie: ${ctx.weight} kg`;
          case "in_transit":
            return `Votre colis est actuellement en transit.\n\nTrajet: ${ctx.origin_city} - ${ctx.destination_city}\nVous serez notifie a l'arrivee.`;
          case "arrived":
            return `Le GP est arrive a ${ctx.destination_city}.\n\nLa livraison finale est en cours d'organisation.`;
          case "delivered":
            return `Colis livre avec succes !\n\nMerci d'avoir utilise Konnekt.\nN'hesitez pas a laisser un avis.`;
          default:
            return `Statut: ${STATUS_LABELS[ctx.status] || ctx.status}\nConsultez l'onglet "Suivi" pour plus de details.`;
        }
      },
    },
    // 2️⃣ « Quand dois-je déposer mon colis ? »
    {
      id: "deposit_date",
      icon: Calendar,
      message: "Quand dois-je déposer mon colis ?",
      color: "bg-amber-500/10 text-amber-600",
      getResponse: async (ctx) => {
        if (ctx.status === "pending") {
          return `⏳ La date de dépôt vous sera communiquée dès validation par le GP.\nUn QR code sera requis lors de la remise.`;
        }
        if (ctx.pickup_date) {
          return `📅 Date de dépôt prévue:\n${format(new Date(ctx.pickup_date), "EEEE d MMMM yyyy", { locale: fr })}\n\n📍 Lieu: ${ctx.gp_deposit_address || "À confirmer"}\n⚠️ Un QR code sera requis lors de la remise.`;
        }
        return `📍 La date et le lieu de dépôt vous seront communiqués dès validation complète par le GP.\nUn QR code sera requis lors de la remise.`;
      },
    },
    // 3️⃣ « Où dois-je déposer mon colis ? »
    {
      id: "location",
      icon: MapPin,
      message: "Où dois-je déposer mon colis ?",
      color: "bg-green-500/10 text-green-600",
      getResponse: async (ctx) => {
        if (ctx.status === "pending") {
          return `⏳ Le lieu de dépôt sera communiqué après acceptation par le GP.`;
        }
        if (ctx.gp_deposit_address) {
          return `📍 Adresse de dépôt:\n${ctx.gp_deposit_address}\n\n⚠️ Cette information est partagée uniquement après acceptation du GP.`;
        }
        return `📍 L'adresse exacte sera partagée par le GP ${ctx.gp_name}.\nContactez-le directement dans cette conversation.`;
      },
    },
    // 4️⃣ « Quand vais-je recevoir mon colis ? »
    {
      id: "delivery_date",
      icon: Clock,
      message: "Quand vais-je recevoir mon colis ?",
      color: "bg-purple-500/10 text-purple-600",
      getResponse: async (ctx) => {
        if (ctx.status === "arrived") {
          return `🛬 Le GP est arrivé à ${ctx.destination_city} !\n\nLa livraison finale est en cours d'organisation.\nVous serez contacté très prochainement.`;
        }
        if (ctx.status === "delivered") {
          return `🎉 Votre colis a déjà été livré le ${ctx.actual_delivery_date ? format(new Date(ctx.actual_delivery_date), "d MMMM", { locale: fr }) : "récemment"}.`;
        }
        if (ctx.delivery_date) {
          return `⏳ Livraison estimée:\n${format(new Date(ctx.delivery_date), "EEEE d MMMM yyyy", { locale: fr })}\n\nLa date dépend du trajet du GP. Vous serez notifié dès son arrivée à destination.`;
        }
        return `⏳ La date de réception dépend du trajet du GP.\nVous serez notifié dès son arrivée à destination.`;
      },
    },
    // 5️⃣ « Le GP est-il arrivé ? »
    {
      id: "gp_arrived",
      icon: Truck,
      message: "Le GP est-il arrivé ?",
      color: "bg-indigo-500/10 text-indigo-600",
      getResponse: async (ctx) => {
        if (ctx.status === "arrived" || ctx.status === "delivered") {
          return `🛬 Oui, le GP est arrivé à ${ctx.destination_city} !\n\nLa livraison finale ${ctx.status === "delivered" ? "a été effectuée" : "est en cours d'organisation"}.`;
        }
        if (ctx.status === "in_transit") {
          return `✈️ Le GP est actuellement en transit.\nTrajet: ${ctx.origin_city} → ${ctx.destination_city}\n\nVous serez notifié dès son arrivée.`;
        }
        return `⏳ Le GP n'est pas encore parti.\nStatut actuel: ${STATUS_LABELS[ctx.status] || ctx.status}`;
      },
    },
    // 6️⃣ « Puis-je envoyer quelqu'un à ma place ? »
    {
      id: "delegate",
      icon: User,
      message: "Puis-je envoyer quelqu'un à ma place ?",
      color: "bg-cyan-500/10 text-cyan-600",
      getResponse: async () => {
        return `👤 Oui, c'est possible !\n\nVous devrez partager votre QR code de remise avec la personne autorisée.\n\n📲 Le QR code se trouve sur la page de suivi de votre commande.`;
      },
    },
    // 7️⃣ « J'ai modifié le poids de mon colis » / Poids modifié
    {
      id: "weight_change",
      icon: Scale,
      message: "Le poids de mon colis a changé",
      color: "bg-orange-500/10 text-orange-600",
      getResponse: async (ctx) => {
        if (ctx.weight_tier_applied?.startsWith("pending:")) {
          const newWeight = ctx.weight_tier_applied.split(":")[1];
          return `⚠️ Correction de poids détectée !\n\n🔁 Ancien poids: ${ctx.weight} kg\n🔁 Nouveau poids: ${newWeight} kg\n\n👉 Action requise: Rendez-vous sur votre page d'accueil pour confirmer le nouveau poids.\n\n💡 Seul le prix du poids est ajusté. L'assurance et la logistique restent inchangées.`;
        }
        return `⚖️ Poids actuel: ${ctx.weight} kg\n\nSi le poids réel diffère, le GP effectuera la vérification lors du dépôt et vous devrez confirmer tout ajustement.`;
      },
    },
    // 8️⃣ « Pourquoi le prix a changé ? »
    {
      id: "price_change",
      icon: DollarSign,
      message: "Pourquoi le prix a changé ?",
      color: "bg-rose-500/10 text-rose-600",
      getResponse: async () => {
        return `💡 Le prix peut changer pour une raison:\n\nLe poids réel du colis a été vérifié lors du dépôt et diffère du poids déclaré.\n\n👉 Important:\n• Seul le prix du poids est recalculé\n• L'assurance reste inchangée\n• La logistique reste inchangée\n\nVous devez confirmer tout ajustement avant que la commande continue.`;
      },
    },
    // 9️⃣ « Ai-je une assurance sur mon colis ? »
    {
      id: "insurance",
      icon: Shield,
      message: "Ai-je une assurance sur mon colis ?",
      color: "bg-emerald-500/10 text-emerald-600",
      getResponse: async (ctx) => {
        if (ctx.has_insurance && ctx.insurance_amount > 0) {
          const rates = await loadExchangeRates();
          const insuranceDisplay = formatInsuranceDual(ctx.insurance_amount, ctx.currency, rates);
          return `🛡️ Oui, votre colis est assuré !\n\nMontant: ${insuranceDisplay}\n\nL'assurance couvre les dommages et pertes pendant le transport.`;
        }
        return `⚠️ Vous avez choisi de ne pas assurer ce colis.\n\nSans assurance, Konnekt ne peut pas garantir le remboursement en cas de perte ou dommage.`;
      },
    },
    // 🔟 « J'ai besoin d'aide concernant ma commande »
    {
      id: "help",
      icon: HelpCircle,
      message: "J'ai besoin d'aide concernant ma commande",
      color: "bg-slate-500/10 text-slate-600",
      getResponse: async (ctx) => {
        // Diagnostic automatique
        const issues: string[] = [];
        
        if (ctx.weight_tier_applied?.startsWith("pending:")) {
          issues.push("⚖️ Ajustement de poids en attente de confirmation");
        }
        
        if (ctx.pickup_date && ctx.status === "pending") {
          const pickupDate = new Date(ctx.pickup_date);
          if (new Date() > pickupDate) {
            issues.push("📅 Collecte en retard");
          }
        }
        
        if (ctx.delivery_date && !["delivered", "cancelled"].includes(ctx.status)) {
          const deliveryDate = new Date(ctx.delivery_date);
          if (new Date() > deliveryDate) {
            issues.push("🚚 Livraison en retard");
          }
        }
        
        let response = `👋 **Nous avons bien reçu votre demande.**\n\n📌 Commande: #${ctx.order_number.slice(-6)}\n📦 Statut: ${STATUS_LABELS[ctx.status] || ctx.status}\n`;
        
        if (issues.length > 0) {
          response += `\n⚠️ **Points détectés:**\n${issues.map(i => `• ${i}`).join("\n")}\n\nUn agent Konnekt vous contactera si nécessaire.`;
          
          // Log support request
          try {
            await supabase.from("notifications").insert({
              user_id: currentUserId,
              type: "support_request",
              title: "Demande d'aide",
              message: `Aide demandée pour commande #${ctx.order_number.slice(-6)}`,
              related_type: "order",
              related_id: ctx.id,
            });
          } catch (e) {}
        } else {
          response += `\n✅ Aucun problème détecté.\nPour toute question, écrivez directement au GP dans cette conversation.`;
        }
        
        return response;
      },
    },
  ];

  const handleSelectResponse = async (response: SmartResponse) => {
    setSelectedId(response.id);
    setLoading(true);

    try {
      const clientMessage = response.message;
      
      // 1. Insert client message immediately
      const { error: clientError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        sender_type: "client",
        content: clientMessage,
      });
      
      if (clientError) throw clientError;
      
      // 2. Generate auto-response based on context
      let autoResponse: string;
      
      if (orderContext) {
        autoResponse = await response.getResponse(orderContext);
      } else {
        autoResponse = "📋 Nous n'avons pas trouvé de commande associée à cette conversation. Veuillez préciser votre demande ou contacter le support.";
      }
      
      // 3. Get GP ID for the conversation to send as GP (auto-response)
      const { data: conversation } = await supabase
        .from("conversations")
        .select("gp_id, gp_profiles:gp_id(user_id)")
        .eq("id", conversationId)
        .single();
      
      const gpUserId = (conversation?.gp_profiles as any)?.user_id;
      
      // 4. Insert auto-response as GP message (automated response on behalf of GP)
      const { error: responseError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: gpUserId || conversation?.gp_id || currentUserId,
        sender_type: "gp", // Use "gp" as sender_type (auto-response on behalf of GP)
        content: `🤖 Réponse automatique\n\n${autoResponse}`,
      });
      
      if (responseError) throw responseError;
      
      // 5. Update conversation last_message_at
      await supabase.from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
      
      // 6. Notify via callback if provided
      if (onAutoResponse) {
        onAutoResponse(autoResponse);
      }
      
    } catch (error) {
      console.error("Error sending smart response:", error);
    } finally {
      setLoading(false);
      setTimeout(() => setSelectedId(null), 1500);
    }
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
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg text-xs text-primary mb-2">
                  <CheckCircle className="w-3 h-3" />
                  <span>Commande #{orderContext.order_number.slice(-6)} - {orderContext.origin_city} → {orderContext.destination_city}</span>
                </div>
              )}
              
              {/* Weight correction warning */}
              {orderContext?.weight_tier_applied?.startsWith("pending:") && (
                <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg text-xs text-amber-700 mb-2 border border-amber-300">
                  <AlertTriangle className="w-3 h-3" />
                  <span>⚠️ Correction de poids en attente de confirmation</span>
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
