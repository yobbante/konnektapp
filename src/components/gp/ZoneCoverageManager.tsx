import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, MapPin, Plane, Ship, Building2, Truck, 
  ChevronDown, ChevronUp, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransportType } from "@/lib/transportTypes";

// Types pour les zones de couverture
export interface CoverageZone {
  id: string;
  country: string;
  city: string;
  specificPoint?: string; // Aéroport, port, etc.
  address?: string;
  cities?: string[]; // Pour multi-sélection
}

interface ZoneCoverageManagerProps {
  zones: CoverageZone[];
  onZonesChange: (zones: CoverageZone[]) => void;
  transportType: TransportType | null;
}

// Données de référence
const countries = [
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "GN", name: "Guinée", flag: "🇬🇳" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "BJ", name: "Bénin", flag: "🇧🇯" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "BE", name: "Belgique", flag: "🇧🇪" },
  { code: "CH", name: "Suisse", flag: "🇨🇭" },
  { code: "ES", name: "Espagne", flag: "🇪🇸" },
  { code: "IT", name: "Italie", flag: "🇮🇹" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪" },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧" },
  { code: "US", name: "États-Unis", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
  { code: "DZ", name: "Algérie", flag: "🇩🇿" },
  { code: "TN", name: "Tunisie", flag: "🇹🇳" },
];

const citiesByCountry: Record<string, string[]> = {
  SN: ["Dakar", "Thiès", "Saint-Louis", "Mbour", "Kaolack", "Ziguinchor", "Touba"],
  CI: ["Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro", "Korhogo"],
  ML: ["Bamako", "Sikasso", "Ségou", "Mopti", "Kayes"],
  BF: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou"],
  GN: ["Conakry", "Kankan", "Kindia", "Nzérékoré"],
  CM: ["Douala", "Yaoundé", "Garoua", "Bafoussam"],
  TG: ["Lomé", "Sokodé", "Kara"],
  BJ: ["Cotonou", "Porto-Novo", "Parakou"],
  GH: ["Accra", "Kumasi", "Tamale"],
  NG: ["Lagos", "Abuja", "Kano", "Port Harcourt", "Ibadan"],
  FR: ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Toulouse"],
  BE: ["Bruxelles", "Anvers", "Liège", "Charleroi"],
  CH: ["Genève", "Zurich", "Lausanne", "Berne"],
  ES: ["Madrid", "Barcelone", "Valence", "Séville"],
  IT: ["Rome", "Milan", "Naples", "Turin", "Florence"],
  DE: ["Berlin", "Munich", "Francfort", "Hambourg", "Cologne"],
  GB: ["Londres", "Birmingham", "Manchester", "Glasgow"],
  US: ["New York", "Los Angeles", "Chicago", "Houston", "Miami"],
  CA: ["Montréal", "Toronto", "Vancouver", "Ottawa"],
  MA: ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger"],
  DZ: ["Alger", "Oran", "Constantine"],
  TN: ["Tunis", "Sfax", "Sousse"],
};

const airportsByCity: Record<string, string[]> = {
  "Dakar": ["Aéroport Blaise Diagne (DSS)"],
  "Paris": ["Charles de Gaulle (CDG)", "Orly (ORY)"],
  "Abidjan": ["Aéroport Félix Houphouët-Boigny (ABJ)"],
  "Douala": ["Aéroport de Douala (DLA)"],
  "Casablanca": ["Aéroport Mohammed V (CMN)"],
  "New York": ["JFK", "Newark (EWR)", "LaGuardia (LGA)"],
  "Londres": ["Heathrow (LHR)", "Gatwick (LGW)"],
  "Bruxelles": ["Brussels Airport (BRU)"],
  "Genève": ["Aéroport de Genève (GVA)"],
  "Montréal": ["Montréal-Trudeau (YUL)"],
};

const portsByCity: Record<string, string[]> = {
  Dakar: ["Port Autonome de Dakar"],
  Abidjan: ["Port Autonome d'Abidjan"],
  Douala: ["Port de Douala"],
  Lagos: ["Port d'Apapa", "Port de Tin Can"],
  Casablanca: ["Port de Casablanca"],
  Marseille: ["Grand Port Maritime de Marseille"],
};

export function ZoneCoverageManager({ zones, onZonesChange, transportType }: ZoneCoverageManagerProps) {
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  const generateId = () => `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addZone = () => {
    const newZone: CoverageZone = {
      id: generateId(),
      country: "",
      city: "",
      specificPoint: "",
      address: "",
      cities: [],
    };
    onZonesChange([...zones, newZone]);
    setExpandedZones(prev => new Set([...prev, newZone.id]));
  };

  const updateZone = (id: string, updates: Partial<CoverageZone>) => {
    onZonesChange(zones.map(z => z.id === id ? { ...z, ...updates } : z));
  };

  const removeZone = (id: string) => {
    onZonesChange(zones.filter(z => z.id !== id));
    setExpandedZones(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedZones(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCity = (zoneId: string, city: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    
    const currentCities = zone.cities || [];
    const updatedCities = currentCities.includes(city)
      ? currentCities.filter(c => c !== city)
      : [...currentCities, city];
    
    updateZone(zoneId, { cities: updatedCities });
  };

  const getZoneLabel = () => {
    switch (transportType) {
      case "voyageur":
        return "Destination de voyage";
      case "aerien":
        return "Zone aérienne desservie";
      case "maritime":
        return "Zone maritime desservie";
      case "routier":
        return "Zone routière desservie";
      case "agence":
        return "Zone couverte par l'agence";
      case "express":
        return "Zone de livraison express";
      default:
        return "Zone de couverture";
    }
  };

  const getMaxZones = () => {
    if (transportType === "voyageur") return 2;
    return Infinity;
  };

  const getSpecificPointLabel = () => {
    switch (transportType) {
      case "voyageur":
      case "aerien":
        return "Aéroport";
      case "maritime":
        return "Port";
      default:
        return null;
    }
  };

  const getSpecificPointOptions = (city: string) => {
    switch (transportType) {
      case "voyageur":
      case "aerien":
        return airportsByCity[city] || [];
      case "maritime":
        return portsByCity[city] || [];
      default:
        return [];
    }
  };

  const showMultipleCities = transportType === "aerien" || transportType === "agence" || transportType === "express";
  const showAddress = transportType !== "voyageur" && transportType !== "aerien";

  const getZoneIcon = () => {
    switch (transportType) {
      case "voyageur":
      case "aerien":
        return Plane;
      case "maritime":
        return Ship;
      case "agence":
        return Building2;
      case "routier":
      case "express":
        return Truck;
      default:
        return Globe;
    }
  };

  const ZoneIcon = getZoneIcon();
  const maxZones = getMaxZones();
  const canAddMore = zones.length < maxZones;

  return (
    <div className="space-y-4">
      {/* Description selon le type */}
      <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20">
        <div className="flex items-start gap-3">
          <ZoneIcon className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              {transportType === "voyageur" && "Où voyagez-vous régulièrement ?"}
              {transportType === "aerien" && "Quelles destinations aériennes desservez-vous ?"}
              {transportType === "maritime" && "Quels ports desservez-vous ?"}
              {transportType === "routier" && "Quelles zones géographiques couvrez-vous ?"}
              {transportType === "agence" && "Quelles villes votre agence couvre-t-elle ?"}
              {transportType === "express" && "Quelles zones livrez-vous en express ?"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {transportType === "voyageur" && "Ajoutez vos destinations de voyage principales (maximum 2 zones)."}
              {transportType === "aerien" && "Ajoutez tous les pays et aéroports que vous desservez."}
              {transportType === "maritime" && "Ajoutez chaque port desservi comme une zone distincte."}
              {transportType === "routier" && "Définissez les zones géographiques de vos livraisons."}
              {transportType === "agence" && "Indiquez les villes où vous pouvez collecter et livrer."}
              {transportType === "express" && "Définissez vos zones de livraison rapide."}
            </p>
          </div>
        </div>
      </div>

      {/* Liste des zones */}
      <AnimatePresence mode="popLayout">
        {zones.map((zone, index) => (
          <motion.div
            key={zone.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-border rounded-xl overflow-hidden bg-card"
          >
            {/* Header de zone */}
            <div 
              className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleExpanded(zone.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-secondary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {zone.country 
                      ? `${countries.find(c => c.code === zone.country)?.flag} ${countries.find(c => c.code === zone.country)?.name}`
                      : `${getZoneLabel()} ${index + 1}`}
                  </p>
                  {zone.city && (
                    <p className="text-sm text-muted-foreground">
                      {showMultipleCities && zone.cities?.length 
                        ? zone.cities.join(", ") 
                        : zone.city}
                      {zone.specificPoint && ` • ${zone.specificPoint}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeZone(zone.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                {expandedZones.has(zone.id) ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Contenu de zone */}
            <AnimatePresence>
              {expandedZones.has(zone.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-4 border-t border-border">
                    {/* Pays */}
                    <div className="space-y-2">
                      <Label>Pays *</Label>
                      <Select
                        value={zone.country}
                        onValueChange={(value) => updateZone(zone.id, { 
                          country: value, 
                          city: "", 
                          specificPoint: "",
                          cities: []
                        })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionnez un pays" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50 max-h-64">
                          {countries.map(c => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.flag} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Ville(s) */}
                    {zone.country && (
                      <div className="space-y-2">
                        <Label>
                          {showMultipleCities ? "Villes desservies *" : "Ville *"}
                        </Label>
                        
                        {showMultipleCities ? (
                          <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-input bg-background min-h-[60px]">
                            {(citiesByCountry[zone.country] || []).map(city => (
                              <Badge
                                key={city}
                                variant={(zone.cities || []).includes(city) ? "default" : "outline"}
                                className="cursor-pointer transition-all"
                                onClick={() => toggleCity(zone.id, city)}
                              >
                                {city}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Select
                            value={zone.city}
                            onValueChange={(value) => updateZone(zone.id, { 
                              city: value, 
                              specificPoint: "" 
                            })}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Sélectionnez une ville" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border border-border z-50">
                              {(citiesByCountry[zone.country] || []).map(city => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}

                    {/* Point spécifique (Aéroport/Port) */}
                    {zone.city && getSpecificPointLabel() && (
                      <div className="space-y-2">
                        <Label>{getSpecificPointLabel()}</Label>
                        {getSpecificPointOptions(zone.city).length > 0 ? (
                          <Select
                            value={zone.specificPoint}
                            onValueChange={(value) => updateZone(zone.id, { specificPoint: value })}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder={`Sélectionnez un ${getSpecificPointLabel()?.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent className="bg-background border border-border z-50">
                              {getSpecificPointOptions(zone.city).map(point => (
                                <SelectItem key={point} value={point}>{point}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder={`Nom du ${getSpecificPointLabel()?.toLowerCase()}`}
                            value={zone.specificPoint || ""}
                            onChange={(e) => updateZone(zone.id, { specificPoint: e.target.value })}
                          />
                        )}
                      </div>
                    )}

                    {/* Adresse */}
                    {showAddress && zone.city && (
                      <div className="space-y-2">
                        <Label>
                          {transportType === "agence" && "Adresse de l'agence"}
                          {transportType === "routier" && "Adresse du dépôt / entrepôt"}
                          {transportType === "express" && "Adresse du hub / point de collecte"}
                          {transportType === "maritime" && "Adresse du terminal"}
                          {!["agence", "routier", "express", "maritime"].includes(transportType || "") && "Adresse (optionnel)"}
                        </Label>
                        <Input
                          placeholder="Ex: 123 Rue Principale, Quartier Centre"
                          value={zone.address || ""}
                          onChange={(e) => updateZone(zone.id, { address: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Bouton ajouter */}
      {canAddMore && (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={addZone}
        >
          <Plus className="w-4 h-4" />
          Ajouter une zone de couverture
        </Button>
      )}

      {!canAddMore && transportType === "voyageur" && (
        <p className="text-sm text-muted-foreground text-center">
          Maximum 2 destinations pour les voyageurs
        </p>
      )}

      {/* Résumé */}
      {zones.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-muted/50">
          <p className="text-sm font-medium text-foreground mb-2">Résumé des zones :</p>
          <div className="flex flex-wrap gap-2">
            {zones.map(zone => {
              if (!zone.country) return null;
              const country = countries.find(c => c.code === zone.country);
              const cityText = showMultipleCities && zone.cities?.length 
                ? zone.cities.join(", ")
                : zone.city;
              
              return (
                <Badge key={zone.id} variant="secondary" className="text-xs">
                  {country?.flag} {country?.name}
                  {cityText && ` - ${cityText}`}
                  {zone.specificPoint && ` (${zone.specificPoint})`}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
