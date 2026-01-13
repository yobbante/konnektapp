import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Search, ArrowLeft, Trash2, Bell, BellOff, Edit2,
  MapPin, ArrowRight, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SavedSearch {
  id: string;
  origin_city: string | null;
  destination_city: string | null;
  transport_type: string | null;
  min_price: number | null;
  max_price: number | null;
  min_weight: number | null;
  notify_enabled: boolean;
  created_at: string;
}

export default function SavedSearches() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchSearches();
  }, []);

  const fetchSearches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSearches(data || []);
    } catch (error) {
      console.error("Error fetching searches:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifications = async (searchId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("saved_searches")
        .update({ notify_enabled: enabled })
        .eq("id", searchId);

      if (error) throw error;

      setSearches(prev => prev.map(s => 
        s.id === searchId ? { ...s, notify_enabled: enabled } : s
      ));

      toast({
        title: enabled ? "Notifications activées" : "Notifications désactivées",
        description: enabled 
          ? "Vous recevrez des alertes pour cette recherche" 
          : "Vous ne recevrez plus d'alertes",
      });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const deleteSearch = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("saved_searches")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      setSearches(prev => prev.filter(s => s.id !== deleteId));
      toast({ title: "Recherche supprimée" });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const applySearch = (search: SavedSearch) => {
    const params = new URLSearchParams();
    if (search.transport_type) params.set("type", search.transport_type);
    if (search.origin_city) params.set("origin", search.origin_city);
    if (search.destination_city) params.set("destination", search.destination_city);
    navigate(`/offres?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader title="Mes recherches" showNotifications />

      <div className="px-4 py-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)} 
          className="-ml-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour
        </Button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : searches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Aucune recherche sauvegardée</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Activez les alertes sur la page des offres pour sauvegarder vos critères
            </p>
            <Button variant="default" onClick={() => navigate("/offres")}>
              Parcourir les offres
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {searches.length} recherche{searches.length > 1 ? 's' : ''} sauvegardée{searches.length > 1 ? 's' : ''}
            </p>

            {searches.map((search, index) => (
              <motion.div
                key={search.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl border border-border p-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {search.notify_enabled ? (
                      <Bell className="w-4 h-4 text-primary" />
                    ) : (
                      <BellOff className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      Créée le {new Date(search.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(search.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Search Criteria */}
                <div className="space-y-2 mb-4">
                  {(search.origin_city || search.destination_city) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{search.origin_city || 'Toutes origines'}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span>{search.destination_city || 'Toutes destinations'}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {search.transport_type && (
                      <Badge variant={search.transport_type as any}>
                        {search.transport_type}
                      </Badge>
                    )}
                    {search.min_price && (
                      <Badge variant="outline">Min: {search.min_price} FCFA</Badge>
                    )}
                    {search.max_price && search.max_price < 50000 && (
                      <Badge variant="outline">Max: {search.max_price} FCFA</Badge>
                    )}
                    {search.min_weight && (
                      <Badge variant="outline">≥ {search.min_weight} kg</Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={search.notify_enabled}
                      onCheckedChange={(checked) => toggleNotifications(search.id, checked)}
                    />
                    <span className="text-xs text-muted-foreground">Alertes</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applySearch(search)}
                  >
                    Appliquer
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette recherche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Vous ne recevrez plus d'alertes pour cette recherche.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSearch} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
