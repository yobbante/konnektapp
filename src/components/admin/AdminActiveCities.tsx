import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, ToggleLeft, ToggleRight, Search, Trash2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAllPlatformCities, invalidateCityCache } from "@/hooks/useActiveCities";
import { WORLD_CITIES } from "@/components/gp/SearchableCitySelect";

export function AdminActiveCities() {
  const { cities, loading, refetch } = useAllPlatformCities();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newCity, setNewCity] = useState("");
  const [newCountryCode, setNewCountryCode] = useState("");
  const [newCountryName, setNewCountryName] = useState("");
  const [newFlag, setNewFlag] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  // Suggestions from WORLD_CITIES not already in platform
  const existingKeys = new Set(cities.map(c => `${c.city}-${c.country_code}`));
  const suggestions = WORLD_CITIES.filter(c => !existingKeys.has(`${c.city}-${c.country}`));
  const [suggestionSearch, setSuggestionSearch] = useState("");
  const filteredSuggestions = suggestionSearch
    ? suggestions.filter(c => c.city.toLowerCase().includes(suggestionSearch.toLowerCase()))
    : suggestions.slice(0, 20);

  const filtered = search
    ? cities.filter(c => c.city.toLowerCase().includes(search.toLowerCase()) || c.country_name.toLowerCase().includes(search.toLowerCase()))
    : cities;

  const toggleCity = async (id: string, currentActive: boolean) => {
    setToggling(id);
    const { error } = await supabase
      .from("platform_active_cities")
      .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success(currentActive ? "Ville désactivée" : "Ville activée");
      invalidateCityCache();
      refetch();
    }
    setToggling(null);
  };

  const addCity = async () => {
    if (!newCity || !newCountryCode) {
      toast.error("Ville et code pays requis");
      return;
    }
    const { error } = await supabase
      .from("platform_active_cities")
      .insert({
        city: newCity,
        country_code: newCountryCode,
        country_name: newCountryName || newCountryCode,
        flag: newFlag || "",
        sort_order: cities.length + 1,
      });

    if (error) {
      if (error.code === "23505") {
        toast.error("Cette ville existe déjà");
      } else {
        toast.error("Erreur: " + error.message);
      }
    } else {
      toast.success(`${newCity} ajoutée`);
      invalidateCityCache();
      refetch();
      setShowAdd(false);
      setNewCity("");
      setNewCountryCode("");
      setNewCountryName("");
      setNewFlag("");
    }
  };

  const addFromSuggestion = async (city: string, country: string, flag: string) => {
    // Find country name from WORLD_CITIES metadata
    const countryNames: Record<string, string> = {
      SN: "Sénégal", FR: "France", US: "États-Unis", CA: "Canada", MA: "Maroc",
      AE: "Émirats Arabes Unis", ES: "Espagne", DE: "Allemagne", BE: "Belgique",
      CH: "Suisse", TR: "Turquie", LB: "Liban", CI: "Côte d'Ivoire", ML: "Mali",
      GN: "Guinée", CM: "Cameroun", CG: "République du Congo", CD: "RD Congo",
      GA: "Gabon", GQ: "Guinée Équatoriale", TD: "Tchad", IT: "Italie",
      GB: "Royaume-Uni", NL: "Pays-Bas", PT: "Portugal", BF: "Burkina Faso",
      TG: "Togo", BJ: "Bénin", GH: "Ghana", NG: "Nigeria", DZ: "Algérie",
      TN: "Tunisie", EG: "Égypte", SA: "Arabie Saoudite", QA: "Qatar",
      CN: "Chine", JP: "Japon", IN: "Inde", BR: "Brésil", AU: "Australie",
      ZA: "Afrique du Sud", HK: "Hong Kong",
    };

    const { error } = await supabase
      .from("platform_active_cities")
      .insert({
        city,
        country_code: country,
        country_name: countryNames[country] || country,
        flag,
        sort_order: cities.length + 1,
      });

    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      toast.success(`${city} ajoutée`);
      invalidateCityCache();
      refetch();
    }
  };

  const deleteCity = async (id: string, cityName: string) => {
    const { error } = await supabase
      .from("platform_active_cities")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success(`${cityName} supprimée`);
      invalidateCityCache();
      refetch();
    }
  };

  const activeCount = cities.filter(c => c.is_active).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Villes actives ({activeCount}/{cities.length})
          </CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une ville..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="max-h-[400px] overflow-y-auto space-y-1">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Chargement...</div>
        ) : (
          <AnimatePresence>
            {filtered.map(city => (
              <motion.div
                key={city.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{city.flag}</span>
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate block">{city.city}</span>
                    <span className="text-[11px] text-muted-foreground">{city.country_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={city.is_active ? "default" : "secondary"} className="text-[10px]">
                    {city.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={toggling === city.id}
                    onClick={() => toggleCity(city.id, city.is_active)}
                  >
                    {city.is_active ? (
                      <ToggleRight className="w-4 h-4 text-primary" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => deleteCity(city.id, city.city)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>

      {/* Add city dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Ajouter une ville
            </DialogTitle>
          </DialogHeader>

          {/* Quick add from existing list */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ajout rapide depuis la liste</Label>
            <Input
              placeholder="Rechercher..."
              value={suggestionSearch}
              onChange={e => setSuggestionSearch(e.target.value)}
              className="h-9"
            />
            <div className="max-h-[200px] overflow-y-auto space-y-0.5 border rounded-md p-1">
              {filteredSuggestions.map((s, i) => (
                <button
                  key={`${s.city}-${s.country}-${i}`}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted text-left"
                  onClick={() => addFromSuggestion(s.city, s.country, s.flag)}
                >
                  <span>{s.flag}</span>
                  <span className="font-medium">{s.city}</span>
                  <span className="text-muted-foreground text-xs">({s.country})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <Label className="text-sm font-medium">Ou ajouter manuellement</Label>
            <Input placeholder="Nom de la ville" value={newCity} onChange={e => setNewCity(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Code pays (ex: FR)" value={newCountryCode} onChange={e => setNewCountryCode(e.target.value.toUpperCase())} maxLength={2} />
              <Input placeholder="Emoji drapeau" value={newFlag} onChange={e => setNewFlag(e.target.value)} />
            </div>
            <Input placeholder="Nom du pays" value={newCountryName} onChange={e => setNewCountryName(e.target.value)} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={addCity} disabled={!newCity || !newCountryCode}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
