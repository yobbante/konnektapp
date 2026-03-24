import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface OfferFiltersState {
  minPrice: number;
  maxPrice: number;
  minWeight: number;
  dateFrom: string;
  dateTo: string;
  notifyEnabled: boolean;
}

interface UseOfferNotificationsProps {
  filters?: Partial<OfferFiltersState>;
  activeTransportType: string;
  searchQuery: string;
  enabled: boolean;
}

const defaultFilters: OfferFiltersState = {
  minPrice: 0,
  maxPrice: 50000,
  minWeight: 0,
  dateFrom: "",
  dateTo: "",
  notifyEnabled: false,
};

export function useOfferNotifications({ 
  filters = defaultFilters, 
  activeTransportType, 
  searchQuery,
  enabled 
}: UseOfferNotificationsProps) {
  const { toast } = useToast();
  const { notify } = useNotificationSound();
  const lastNotifiedRef = useRef<Set<string>>(new Set());

  const mergedFilters = { ...defaultFilters, ...filters };

  const matchesFilters = useCallback((offer: any) => {
    // Check transport type
    if (activeTransportType !== "all" && offer.transport_type !== activeTransportType) {
      return false;
    }

    // Check search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        offer.origin_city?.toLowerCase().includes(query) ||
        offer.destination_city?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Check price range
    if (mergedFilters.minPrice > 0 && offer.price_per_kg < mergedFilters.minPrice) {
      return false;
    }
    if (mergedFilters.maxPrice < 50000 && offer.price_per_kg > mergedFilters.maxPrice) {
      return false;
    }

    // Check weight
    if (mergedFilters.minWeight > 0 && offer.available_capacity < mergedFilters.minWeight) {
      return false;
    }

    // Check dates
    if (mergedFilters.dateFrom) {
      const departureDate = new Date(offer.departure_date);
      const fromDate = new Date(mergedFilters.dateFrom);
      if (departureDate < fromDate) return false;
    }
    if (mergedFilters.dateTo) {
      const departureDate = new Date(offer.departure_date);
      const toDate = new Date(mergedFilters.dateTo);
      if (departureDate > toDate) return false;
    }

    return true;
  }, [mergedFilters, activeTransportType, searchQuery]);

  useEffect(() => {
    if (!enabled || !mergedFilters.notifyEnabled) return;

    const channel = supabase
      .channel('offer-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gp_offers'
        },
        (payload) => {
          const newOffer = payload.new;
          
          // Skip if already notified
          if (lastNotifiedRef.current.has(newOffer.id)) return;
          
          // Check if offer matches current filters
          if (matchesFilters(newOffer)) {
            lastNotifiedRef.current.add(newOffer.id);
            
            toast({
              title: "Nouvelle offre disponible !",
              description: `${newOffer.origin_city} → ${newOffer.destination_city} à ${newOffer.price_per_kg} FCFA/kg`,
              duration: 10000,
            });

            // Play notification sound and vibrate
            notify({ sound: true, vibrate: [100, 50, 100] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, mergedFilters, matchesFilters, toast, notify]);

  const saveSearch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour sauvegarder vos alertes",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("saved_searches")
        .insert({
          user_id: user.id,
          transport_type: activeTransportType !== "all" ? activeTransportType : null,
          min_price: mergedFilters.minPrice > 0 ? mergedFilters.minPrice : null,
          max_price: mergedFilters.maxPrice < 50000 ? mergedFilters.maxPrice : null,
          min_weight: mergedFilters.minWeight > 0 ? mergedFilters.minWeight : null,
          notify_enabled: true,
        });

      if (error) throw error;

      toast({
        title: "Alerte sauvegardée",
        description: "Vous recevrez des notifications pour les nouvelles offres correspondantes",
      });
    } catch (error) {
      console.error("Error saving search:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'alerte",
        variant: "destructive",
      });
    }
  }, [mergedFilters, activeTransportType, toast]);

  return { saveSearch };
}
