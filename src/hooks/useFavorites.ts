import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch user and favorites on mount
  useEffect(() => {
    const fetchUserAndFavorites = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        await fetchFavorites(user.id);
      } else {
        setLoading(false);
      }
    };

    fetchUserAndFavorites();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        await fetchFavorites(session.user.id);
      } else {
        setUserId(null);
        setFavorites(new Set());
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchFavorites = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("offer_favorites")
        .select("offer_id")
        .eq("user_id", uid);

      if (error) throw error;

      setFavorites(new Set(data?.map(f => f.offer_id) || []));
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = useCallback(async (offerId: string) => {
    if (!userId) {
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour sauvegarder vos favoris",
      });
      return false;
    }

    const isFavorite = favorites.has(offerId);

    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFavorite) {
        next.delete(offerId);
      } else {
        next.add(offerId);
      }
      return next;
    });

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("offer_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("offer_id", offerId);

        if (error) throw error;

        toast({
          title: "Retiré des favoris",
          description: "L'offre a été retirée de vos favoris",
        });
      } else {
        const { error } = await supabase
          .from("offer_favorites")
          .insert({ user_id: userId, offer_id: offerId });

        if (error) throw error;

        toast({
          title: "Ajouté aux favoris",
          description: "L'offre a été sauvegardée dans vos favoris",
        });
      }
      return true;
    } catch (error) {
      // Revert optimistic update
      setFavorites(prev => {
        const next = new Set(prev);
        if (isFavorite) {
          next.add(offerId);
        } else {
          next.delete(offerId);
        }
        return next;
      });
      
      console.error("Error toggling favorite:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier les favoris",
        variant: "destructive",
      });
      return false;
    }
  }, [userId, favorites, toast]);

  const isFavorite = useCallback((offerId: string) => {
    return favorites.has(offerId);
  }, [favorites]);

  return {
    favorites,
    loading,
    isAuthenticated: !!userId,
    toggleFavorite,
    isFavorite,
  };
}
