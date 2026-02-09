/**
 * SmartGPResponses — Réponses automatiques intelligentes pour les GPs
 * 
 * V2: Messages exacts pour terrain — retard, relance, poids, dépôt, etc.
 * Envoyées en tant que GP (sender_type: "gp")
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, ChevronUp, ChevronDown, Loader2,
  Package, MapPin, Clock, CheckCircle, Truck, Calendar,
  Scale, AlertTriangle, Phone, RotateCcw, PackageX
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface OrderContext {
  id: string;
  order_number: string;
  status: string;
  weight: number;
  origin_city: string;
  destination_city: string;
  pickup_date: string | null;
  delivery_date: string | null;
  client_name: string;
  has_logistics: boolean;
  deposit_address: string | null;
  reception_address: string | null;
}

interface SmartGPResponse {
  id: string;
  icon: React.ComponentType<any>;
  label: string;
  color: string;
  getResponse: (ctx: OrderContext) => string;
  availableForStatus?: string[];
}

interface SmartGPResponsesProps {
  conversationId: string;
  currentUserId: string;
  onSelectMessage: (content: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function SmartGPResponses({
  conversationId,
  currentUserId,
  onSelectMessage,
  isExpanded = false,
  onToggleExpand,
}: SmartGPResponsesProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderContext, setOrderContext] = useState<OrderContext | null>(null);

  useEffect(() => {
    loadOrderContext();
  }, [conversationId]);

  const loadOrderContext = async () => {
    try {
      const { data: conv } = await supabase
        .from("conversations")
        .select("order_id, client_id")
        .eq("id", conversationId)
        .maybeSingle();

      if (!conv?.order_id) return;

      const [{ data: order }, { data: client }, { data: logistics }] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, status, weight, origin_city, destination_city, pickup_date, delivery_date, gp_profiles:gp_id(deposit_address, reception_address)")
          .eq("id", conv.order_id)
          .maybeSingle(),
        supabase.from("profiles").select("full_name").eq("user_id", conv.client_id).single(),
        supabase.from("order_logistics_options").select("id").eq("order_id", conv.order_id).maybeSingle(),
      ]);

      if (order) {
        setOrderContext({
          ...order,
          client_name: client?.full_name || "Client",
          has_logistics: !!logistics,
          deposit_address: (order.gp_profiles as any)?.deposit_address || null,
          reception_address: (order.gp_profiles as any)?.reception_address || null,
        });
      }
    } catch (err) {
      console.error("Error loading GP order context:", err);
    }
  };

  const smartResponses: SmartGPResponse[] = [
    // ── CONFIRM RECEPTION ──
    {
      id: "confirm_reception",
      icon: CheckCircle,
      label: "✅ Confirmer réception du colis",
      color: "bg-green-500/10 text-green-600",
      availableForStatus: ["accepted", "pending"],
      getResponse: (ctx) =>
        `✅ Colis bien reçu !\n\nBonjour ${ctx.client_name},\nVotre colis (${ctx.weight} kg) a été vérifié et pris en charge.\n\n📦 Commande: #${ctx.order_number.slice(-6)}\n📍 Trajet: ${ctx.origin_city} → ${ctx.destination_city}\n\nVous serez notifié à chaque étape du transport.`,
    },
    // ── DEPARTURE INFO ──
    {
      id: "departure_info",
      icon: Calendar,
      label: "✈️ Informer du départ imminent",
      color: "bg-blue-500/10 text-blue-600",
      availableForStatus: ["collected", "accepted"],
      getResponse: (ctx) => {
        const pickupStr = ctx.pickup_date
          ? format(new Date(ctx.pickup_date), "EEEE d MMMM", { locale: fr })
          : "prochainement";
        return `✈️ Départ prévu\n\nBonjour ${ctx.client_name},\nVotre colis partira ${pickupStr}.\n\n📍 ${ctx.origin_city} → ${ctx.destination_city}\nVous recevrez une notification dès que le colis sera en transit.`;
      },
    },
    // ── TRANSIT UPDATE ──
    {
      id: "in_transit_update",
      icon: Truck,
      label: "🚚 Colis en transit",
      color: "bg-purple-500/10 text-purple-600",
      availableForStatus: ["in_transit"],
      getResponse: (ctx) =>
        `✈️ Votre colis est en route\n\nBonjour ${ctx.client_name},\nVotre colis est actuellement en transit vers ${ctx.destination_city}.\n\nVous serez contacté dès mon arrivée pour organiser la remise.`,
    },
    // ── ARRIVED ──
    {
      id: "arrived_notification",
      icon: MapPin,
      label: "🛬 Notifier arrivée à destination",
      color: "bg-teal-500/10 text-teal-600",
      availableForStatus: ["arrived", "in_transit"],
      getResponse: (ctx) =>
        `🛬 Je suis arrivé à ${ctx.destination_city}\n\nBonjour ${ctx.client_name},\nJe suis arrivé avec votre colis.\n\n${ctx.has_logistics ? "Un livreur Konnekt vous contactera pour la livraison." : "Contactez-moi pour organiser la remise."}\n\n📦 Commande: #${ctx.order_number.slice(-6)}`,
    },
    // ── DEPOSIT ADDRESS ──
    {
      id: "deposit_address",
      icon: MapPin,
      label: "📍 Envoyer l'adresse de dépôt",
      color: "bg-amber-500/10 text-amber-600",
      availableForStatus: ["accepted", "pending"],
      getResponse: (ctx) => {
        if (ctx.deposit_address) {
          return `📍 Adresse de dépôt\n\nBonjour ${ctx.client_name},\nVoici l'adresse pour déposer votre colis :\n\n🏠 ${ctx.deposit_address}\n\n⚠️ N'oubliez pas votre QR code lors du dépôt.\nSi besoin, partagez-le avec la personne qui viendra déposer à votre place.`;
        }
        return `📍 L'adresse de dépôt vous sera communiquée très prochainement.\nJe vous recontacte dès que tout est organisé.`;
      },
    },
    // ── DELAY NOTICE ──
    {
      id: "delay_notice",
      icon: Clock,
      label: "⏳ Informer d'un retard",
      color: "bg-red-500/10 text-red-600",
      getResponse: (ctx) => {
        let delayInfo = "";
        if (ctx.delivery_date) {
          const daysLate = differenceInDays(new Date(), new Date(ctx.delivery_date));
          if (daysLate > 0) {
            delayInfo = `\n\n📅 Date prévue : ${format(new Date(ctx.delivery_date), "d MMMM", { locale: fr })}\n⏱️ Retard estimé : ${daysLate} jour(s)`;
          }
        }
        return `⏳ Information importante\n\nBonjour ${ctx.client_name},\nJe vous informe d'un retard sur votre commande #${ctx.order_number.slice(-6)}.${delayInfo}\n\nJe fais le maximum pour acheminer votre colis rapidement. Vous serez tenu informé de l'avancée.\n\nMerci pour votre patience.`;
      },
    },
    // ── PICKUP REMINDER (Relance) ──
    {
      id: "pickup_reminder",
      icon: RotateCcw,
      label: "🔔 Relancer le client pour dépôt",
      color: "bg-orange-500/10 text-orange-600",
      availableForStatus: ["accepted"],
      getResponse: (ctx) => {
        const pickupStr = ctx.pickup_date
          ? `avant le ${format(new Date(ctx.pickup_date), "d MMMM", { locale: fr })}`
          : "dès que possible";
        return `🔔 Rappel : dépôt de votre colis\n\nBonjour ${ctx.client_name},\nVotre colis pour ${ctx.destination_city} n'a pas encore été déposé.\n\nMerci de venir ${pickupStr}.\n\n📍 Lieu de dépôt : ${ctx.deposit_address || "À confirmer"}\n\n⚠️ Passé ce délai, la réservation pourra être annulée.\nN'oubliez pas votre QR code !`;
      },
    },
    // ── WEIGHT ISSUE ──
    {
      id: "weight_issue",
      icon: Scale,
      label: "⚖️ Signaler un écart de poids",
      color: "bg-orange-500/10 text-orange-600",
      availableForStatus: ["collected"],
      getResponse: (ctx) =>
        `⚖️ Vérification de poids\n\nBonjour ${ctx.client_name},\nLe poids de votre colis a été vérifié lors du dépôt.\n\nPoids déclaré : ${ctx.weight} kg\nLe nouveau poids vous sera communiqué avec le montant ajusté.\n\n💡 Seul le prix du poids sera recalculé. L'assurance et la logistique restent inchangées.`,
    },
    // ── UNCOLLECTED PACKAGE WARNING ──
    {
      id: "uncollected_warning",
      icon: PackageX,
      label: "⚠️ Colis non récupéré à destination",
      color: "bg-red-500/10 text-red-600",
      availableForStatus: ["arrived"],
      getResponse: (ctx) =>
        `⚠️ Votre colis attend votre récupération\n\nBonjour ${ctx.client_name},\nVotre colis est arrivé à ${ctx.destination_city} et attend d'être récupéré.\n\n${ctx.reception_address ? `📍 Lieu de retrait : ${ctx.reception_address}\n` : ""}Merci de venir le récupérer rapidement ou de m'indiquer une personne de confiance.\n\n⏰ Le colis ne peut pas être gardé indéfiniment.`,
    },
    // ── SHARE CONTACT ──
    {
      id: "contact_info",
      icon: Phone,
      label: "📞 Partager vos coordonnées",
      color: "bg-cyan-500/10 text-cyan-600",
      getResponse: () =>
        `📞 Coordonnées\n\nPour toute question urgente, vous pouvez me joindre directement via cette conversation.\n\nMerci de votre confiance !`,
    },
  ];

  const filteredResponses = orderContext
    ? smartResponses.filter(r => !r.availableForStatus || r.availableForStatus.includes(orderContext.status))
    : smartResponses.filter(r => !r.availableForStatus);

  const handleSelect = async (response: SmartGPResponse) => {
    if (!orderContext) {
      onSelectMessage(response.getResponse({
        id: "", order_number: "N/A", status: "pending", weight: 0,
        origin_city: "", destination_city: "", pickup_date: null,
        delivery_date: null, client_name: "Client", has_logistics: false,
        deposit_address: null, reception_address: null,
      }));
      return;
    }

    setSelectedId(response.id);
    setLoading(true);

    try {
      const content = response.getResponse(orderContext);
      
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        sender_type: "gp",
        content,
      });

      await supabase.from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

    } catch (err) {
      console.error("Error sending GP smart response:", err);
    } finally {
      setLoading(false);
      setTimeout(() => setSelectedId(null), 1500);
    }
  };

  return (
    <div className="border-t border-border bg-muted/30">
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Réponses GP</span>
          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
            {filteredResponses.length}
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
              {orderContext && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg text-xs text-primary mb-2">
                  <Package className="w-3.5 h-3.5" />
                  <span>#{orderContext.order_number.slice(-6)} · {orderContext.client_name} · {orderContext.weight}kg</span>
                </div>
              )}
              
              {filteredResponses.map((response) => {
                const Icon = response.icon;
                const isSelected = selectedId === response.id;

                return (
                  <motion.button
                    key={response.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelect(response)}
                    disabled={loading}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                      ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 bg-background"}
                    `}
                  >
                    <div className={`p-2 rounded-full ${response.color}`}>
                      {loading && isSelected ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-sm font-medium flex-1">{response.label}</span>
                    {isSelected && !loading && (
                      <CheckCircle className="w-4 h-4 text-primary" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
