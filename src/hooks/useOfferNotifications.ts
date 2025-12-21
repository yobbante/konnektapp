import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AdvancedFiltersState } from "@/components/offers/AdvancedFilters";

interface UseOfferNotificationsProps {
  filters: AdvancedFiltersState;
  activeTransportType: string;
  searchQuery: string;
  enabled: boolean;
}

export function useOfferNotifications({ 
  filters, 
  activeTransportType, 
  searchQuery,
  enabled 
}: UseOfferNotificationsProps) {
  const { toast } = useToast();
  const lastNotifiedRef = useRef<Set<string>>(new Set());

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
    if (filters.minPrice > 0 && offer.price_per_kg < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice < 50000 && offer.price_per_kg > filters.maxPrice) {
      return false;
    }

    // Check weight
    if (filters.minWeight > 0 && offer.available_capacity < filters.minWeight) {
      return false;
    }

    // Check dates
    if (filters.dateFrom) {
      const departureDate = new Date(offer.departure_date);
      const fromDate = new Date(filters.dateFrom);
      if (departureDate < fromDate) return false;
    }
    if (filters.dateTo) {
      const departureDate = new Date(offer.departure_date);
      const toDate = new Date(filters.dateTo);
      if (departureDate > toDate) return false;
    }

    return true;
  }, [filters, activeTransportType, searchQuery]);

  useEffect(() => {
    if (!enabled || !filters.notifyEnabled) return;

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
              title: "🎉 Nouvelle offre disponible !",
              description: `${newOffer.origin_city} → ${newOffer.destination_city} à ${newOffer.price_per_kg} FCFA/kg`,
              duration: 10000,
            });

            // Play notification sound if available
            try {
              const audio = new Audio('/notification.mp3');
              audio.volume = 0.3;
              audio.play().catch(() => {});
            } catch {}
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, filters, matchesFilters, toast]);

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
          min_price: filters.minPrice > 0 ? filters.minPrice : null,
          max_price: filters.maxPrice < 50000 ? filters.maxPrice : null,
          min_weight: filters.minWeight > 0 ? filters.minWeight : null,
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
  }, [filters, activeTransportType, toast]);

  return { saveSearch };
}
