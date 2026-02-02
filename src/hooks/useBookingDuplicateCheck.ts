/**
 * useBookingDuplicateCheck - Hook pour prévenir les réservations en double
 * 
 * Implémente un verrou de 10 minutes pour empêcher la soumission
 * de réservations identiques (même client, même offre/GP)
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingOrderId?: string;
  message?: string;
}

export function useBookingDuplicateCheck() {
  const [checking, setChecking] = useState(false);

  /**
   * Vérifie si une réservation similaire existe dans les 10 dernières minutes
   */
  const checkForDuplicate = useCallback(async (
    clientId: string,
    gpId: string,
    originCity: string,
    destinationCity: string,
    weight?: number
  ): Promise<DuplicateCheckResult> => {
    setChecking(true);
    
    try {
      // Calculer le timestamp il y a 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      // Chercher une commande similaire récente
      const { data: existingOrders, error } = await supabase
        .from("orders")
        .select("id, order_number, created_at, status")
        .eq("client_id", clientId)
        .eq("gp_id", gpId)
        .eq("origin_city", originCity)
        .eq("destination_city", destinationCity)
        .gte("created_at", tenMinutesAgo)
        .in("status", ["pending", "accepted", "collected", "in_transit"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error checking for duplicate:", error);
        // En cas d'erreur, on laisse passer pour ne pas bloquer
        return { isDuplicate: false };
      }

      if (existingOrders && existingOrders.length > 0) {
        const existing = existingOrders[0];
        return {
          isDuplicate: true,
          existingOrderId: existing.id,
          message: `Une réservation similaire (${existing.order_number}) a été créée il y a moins de 10 minutes. Voulez-vous continuer quand même ?`,
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error("Error in duplicate check:", error);
      return { isDuplicate: false };
    } finally {
      setChecking(false);
    }
  }, []);

  /**
   * Vérifie si le client a déjà une réservation active pour cette offre
   */
  const checkActiveBookingForOffer = useCallback(async (
    clientId: string,
    offerId: string
  ): Promise<DuplicateCheckResult> => {
    setChecking(true);
    
    try {
      const { data: existingOrders, error } = await supabase
        .from("orders")
        .select("id, order_number, status")
        .eq("client_id", clientId)
        .eq("offer_id", offerId)
        .in("status", ["pending", "accepted", "collected", "in_transit"])
        .limit(1);

      if (error) {
        console.error("Error checking for active booking:", error);
        return { isDuplicate: false };
      }

      if (existingOrders && existingOrders.length > 0) {
        const existing = existingOrders[0];
        return {
          isDuplicate: true,
          existingOrderId: existing.id,
          message: `Vous avez déjà une réservation active (${existing.order_number}) pour cette offre.`,
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error("Error in active booking check:", error);
      return { isDuplicate: false };
    } finally {
      setChecking(false);
    }
  }, []);

  return {
    checking,
    checkForDuplicate,
    checkActiveBookingForOffer,
  };
}
