import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useFavoriteTransporters() {
  const [favoriteGPs, setFavoriteGPs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch user and favorite transporters on mount
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
        setFavoriteGPs(new Set());
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchFavorites = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("transporter_favorites")
        .select("gp_id")
        .eq("user_id", uid);

      if (error) throw error;

      setFavoriteGPs(new Set(data?.map(f => f.gp_id) || []));
    } catch (error) {
      console.error("Error fetching favorite transporters:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavoriteGP = useCallback(async (gpId: string) => {
    if (!userId) {
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour sauvegarder vos transporteurs favoris",
      });
      return false;
    }

    const isFavorite = favoriteGPs.has(gpId);

    // Optimistic update
    setFavoriteGPs(prev => {
      const next = new Set(prev);
      if (isFavorite) {
        next.delete(gpId);
      } else {
        next.add(gpId);
      }
      return next;
    });

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("transporter_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("gp_id", gpId);

        if (error) throw error;

        toast({
          title: "Retiré des favoris",
          description: "Ce transporteur a été retiré de vos favoris",
        });
      } else {
        const { error } = await supabase
          .from("transporter_favorites")
          .insert({ user_id: userId, gp_id: gpId });

        if (error) throw error;

        toast({
          title: "Ajouté aux favoris",
          description: "Vous recevrez une notification pour ses prochains trajets",
        });
      }
      return true;
    } catch (error) {
      // Revert optimistic update
      setFavoriteGPs(prev => {
        const next = new Set(prev);
        if (isFavorite) {
          next.add(gpId);
        } else {
          next.delete(gpId);
        }
        return next;
      });
      
      console.error("Error toggling favorite GP:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier les favoris",
        variant: "destructive",
      });
      return false;
    }
  }, [userId, favoriteGPs, toast]);

  const isFavoriteGP = useCallback((gpId: string) => {
    return favoriteGPs.has(gpId);
  }, [favoriteGPs]);

  return {
    favoriteGPs,
    loading,
    isAuthenticated: !!userId,
    toggleFavoriteGP,
    isFavoriteGP,
  };
}
