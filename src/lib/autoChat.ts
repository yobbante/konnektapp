import { supabase } from "@/integrations/supabase/client";

/**
 * Génère un message d'accroche automatique pour démarrer une conversation
 * après une réservation
 */
export function generateBookingHookMessage(
  clientName: string,
  gpName: string,
  orderNumber: string,
  originCity: string,
  destinationCity: string
): string {
  return `🎉 Bonjour !

Votre réservation ${orderNumber} a été créée avec succès !

📦 Trajet : ${originCity} → ${destinationCity}
🚚 Transporteur : ${gpName}

${gpName} va prendre contact avec vous pour confirmer les détails de l'envoi (adresse de collecte, horaires, etc.).

N'hésitez pas à poser vos questions ici. Bonne communication ! 🚀`;
}

/**
 * Crée ou récupère une conversation entre un client et un GP
 * et envoie un message automatique après une réservation
 */
export async function createAutoConversationAfterBooking(
  clientId: string,
  gpId: string,
  orderId: string,
  orderDetails: {
    orderNumber: string;
    originCity: string;
    destinationCity: string;
    gpName: string;
    clientName?: string;
  }
): Promise<{ conversationId: string | null; error: string | null }> {
  try {
    // 1. Vérifier si une conversation existe déjà pour cette commande
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("client_id", clientId)
      .eq("gp_id", gpId)
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingConv) {
      return { conversationId: existingConv.id, error: null };
    }

    // 2. Créer une nouvelle conversation
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({
        client_id: clientId,
        gp_id: gpId,
        order_id: orderId,
      })
      .select("id")
      .single();

    if (convError || !newConv) {
      console.error("Error creating conversation:", convError);
      return { conversationId: null, error: convError?.message || "Erreur création conversation" };
    }

    // 3. Générer le message d'accroche
    const hookMessage = generateBookingHookMessage(
      orderDetails.clientName || "Client",
      orderDetails.gpName,
      orderDetails.orderNumber,
      orderDetails.originCity,
      orderDetails.destinationCity
    );

    // 4. Envoyer le message automatique (système)
    const { error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: newConv.id,
        sender_id: clientId, // Le message apparaît comme envoyé par le système/client
        sender_type: "system",
        content: hookMessage,
      });

    if (messageError) {
      console.error("Error sending auto message:", messageError);
    }

    // 5. Mettre à jour la date du dernier message
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", newConv.id);

    return { conversationId: newConv.id, error: null };
  } catch (error: any) {
    console.error("Auto conversation error:", error);
    return { conversationId: null, error: error.message };
  }
}
