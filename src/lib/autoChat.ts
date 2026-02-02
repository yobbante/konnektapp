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
 * Message automatique envoyé quand le GP accepte une commande
 */
export function generateAcceptanceMessage(
  gpName: string,
  orderNumber: string,
  originCity: string,
  destinationCity: string
): string {
  return `✅ Bonne nouvelle !

${gpName} a accepté votre réservation ${orderNumber} !

📦 Trajet confirmé : ${originCity} → ${destinationCity}

Vous pouvez maintenant coordonner les détails du dépôt avec ${gpName}. 
L'adresse de dépôt et le numéro WhatsApp sont désormais disponibles dans les détails de votre commande.

💬 N'hésitez pas à discuter ici pour organiser le dépôt de votre colis.`;
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

/**
 * Envoie un message automatique quand le GP accepte une commande
 * et crée la conversation si elle n'existe pas
 */
export async function sendAcceptanceNotification(
  clientId: string,
  gpId: string,
  orderId: string,
  orderDetails: {
    orderNumber: string;
    originCity: string;
    destinationCity: string;
    gpName: string;
  }
): Promise<{ conversationId: string | null; error: string | null }> {
  try {
    // 1. Chercher ou créer la conversation
    let conversationId: string;
    
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("client_id", clientId)
      .eq("gp_id", gpId)
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
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
        return { conversationId: null, error: convError?.message || "Erreur création conversation" };
      }
      conversationId = newConv.id;
    }

    // 2. Générer et envoyer le message d'acceptation
    const acceptanceMessage = generateAcceptanceMessage(
      orderDetails.gpName,
      orderDetails.orderNumber,
      orderDetails.originCity,
      orderDetails.destinationCity
    );

    await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: gpId,
        sender_type: "system",
        content: acceptanceMessage,
      });

    // 3. Mettre à jour last_message_at
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    // 4. Créer une notification pour le client
    await supabase.from("notifications").insert({
      user_id: clientId,
      type: "order_accepted",
      title: "✅ Commande acceptée !",
      message: `${orderDetails.gpName} a accepté votre réservation ${orderDetails.orderNumber}`,
      related_type: "order",
      related_id: orderId,
    });

    return { conversationId, error: null };
  } catch (error: any) {
    console.error("Acceptance notification error:", error);
    return { conversationId: null, error: error.message };
  }
}

/**
 * Trouve la conversation existante pour une commande et y redirige
 * Retourne l'ID de conversation ou null si non trouvée
 */
export async function findConversationForOrder(
  orderId: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

    return data?.id || null;
  } catch (error) {
    console.error("Error finding conversation:", error);
    return null;
  }
}

/**
 * Trouve ou crée une conversation directe entre client et GP (sans commande spécifique)
 */
export async function getOrCreateDirectConversation(
  clientId: string,
  gpId: string
): Promise<{ conversationId: string | null; error: string | null }> {
  try {
    // Chercher une conversation existante sans order_id
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("client_id", clientId)
      .eq("gp_id", gpId)
      .is("order_id", null)
      .maybeSingle();

    if (existingConv) {
      return { conversationId: existingConv.id, error: null };
    }

    // Créer une nouvelle conversation
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        client_id: clientId,
        gp_id: gpId,
      })
      .select("id")
      .single();

    if (error) {
      return { conversationId: null, error: error.message };
    }

    return { conversationId: newConv.id, error: null };
  } catch (error: any) {
    return { conversationId: null, error: error.message };
  }
}
