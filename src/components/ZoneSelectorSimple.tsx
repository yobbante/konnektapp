import { useState } from "react";
import { Globe, MapPin, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ZoneSelectorSimpleProps {
  selectedZones: string[];
  onZonesChange: (zones: string[]) => void;
  selectedInternational: string[];
  onInternationalChange: (destinations: string[]) => void;
  transportType: string | null;
}

// Régions prédéfinies pour simplifier la sélection
const zonePresets = [
  { 
    value: "local", 
    label: "Local (Ma ville uniquement)", 
    zones: [] // Sera défini par la ville du GP
  },
  { 
    value: "national", 
    label: "🇸🇳 National (Tout le pays)", 
    zones: ["National"]
  },
  { 
    value: "afrique_ouest", 
    label: "Afrique de l'Ouest", 
    zones: ["Sénégal", "Mali", "Côte d'Ivoire", "Guinée", "Burkina Faso", "Gambie", "Mauritanie", "Niger", "Togo", "Bénin", "Ghana", "Nigeria", "Guinée-Bissau"]
  },
  { 
    value: "afrique", 
    label: "Toute l'Afrique", 
    zones: ["Afrique de l'Ouest", "Afrique du Nord", "Afrique Centrale", "Afrique de l'Est", "Afrique Australe"]
  },
  { 
    value: "international", 
    label: "International (Monde entier)", 
    zones: ["International"]
  },
];

// Destinations internationales groupées
const internationalOptions = [
  { value: "europe", label: "🇪🇺 Europe", countries: ["France", "Espagne", "Italie", "Belgique", "Allemagne", "Royaume-Uni", "Portugal"] },
  { value: "amerique_nord", label: "🇺🇸 Amérique du Nord", countries: ["États-Unis", "Canada"] },
  { value: "maghreb", label: "🇲🇦 Maghreb", countries: ["Maroc", "Tunisie", "Algérie"] },
  { value: "moyen_orient", label: "🇦🇪 Moyen-Orient", countries: ["Dubaï", "Arabie Saoudite", "Qatar"] },
  { value: "asie", label: "🇨🇳 Asie", countries: ["Chine", "Turquie", "Inde"] },
];

// Pays africains pour sélection multiple
const africanCountries = [
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "GN", name: "Guinée", flag: "🇬🇳" },
  { code: "GW", name: "Guinée-Bissau", flag: "🇬🇼" },
  { code: "GM", name: "Gambie", flag: "🇬🇲" },
  { code: "MR", name: "Mauritanie", flag: "🇲🇷" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "BJ", name: "Bénin", flag: "🇧🇯" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
  { code: "TN", name: "Tunisie", flag: "🇹🇳" },
  { code: "DZ", name: "Algérie", flag: "🇩🇿" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "CD", name: "RD Congo", flag: "🇨🇩" },
];

export function ZoneSelectorSimple({ 
  selectedZones, 
  onZonesChange,
  selectedInternational,
  onInternationalChange,
  transportType
}: ZoneSelectorSimpleProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [showCustomSelection, setShowCustomSelection] = useState(false);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const presetData = zonePresets.find(p => p.value === preset);
    if (presetData) {
      onZonesChange(presetData.zones);
      if (preset !== 'international') {
        onInternationalChange([]);
      }
    }
    setShowCustomSelection(preset === 'international' || preset === 'afrique_ouest');
  };

  const toggleCountry = (countryName: string) => {
    if (selectedZones.includes(countryName)) {
      onZonesChange(selectedZones.filter(z => z !== countryName));
    } else {
      onZonesChange([...selectedZones, countryName]);
    }
  };

  const toggleInternationalRegion = (regionValue: string) => {
    const region = internationalOptions.find(r => r.value === regionValue);
    if (!region) return;

    const allSelected = region.countries.every(c => selectedInternational.includes(c));
    if (allSelected) {
      onInternationalChange(selectedInternational.filter(c => !region.countries.includes(c)));
    } else {
      const newDestinations = [...selectedInternational];
      region.countries.forEach(country => {
        if (!newDestinations.includes(country)) {
          newDestinations.push(country);
        }
      });
      onInternationalChange(newDestinations);
    }
  };

  // Texte adapté au type de transport
  const getZoneLabel = () => {
    switch (transportType) {
      case 'voyageur':
        return "Vos trajets habituels";
      case 'maritime':
        return "Ports de départ/arrivée";
      case 'aerien':
        return "Aéroports desservis";
      default:
        return "Zone de couverture";
    }
  };

  return (
    <div className="space-y-6">
      {/* Zone principale - Dropdown simple */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-base font-medium">
          <MapPin className="w-5 h-5 text-secondary" />
          {getZoneLabel()} *
        </Label>
        
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full h-12 text-base">
            <SelectValue placeholder="Sélectionnez votre zone de couverture" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-50">
            {zonePresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value} className="py-3">
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sélection personnalisée des pays africains */}
      {(selectedPreset === 'afrique_ouest' || selectedPreset === 'afrique') && (
        <div className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border">
          <Label className="text-sm font-medium text-foreground">
            Personnalisez vos pays de couverture (optionnel)
          </Label>
          <div className="flex flex-wrap gap-2">
            {africanCountries.slice(0, selectedPreset === 'afrique' ? 20 : 13).map((country) => {
              const isSelected = selectedZones.includes(country.name);
              return (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => toggleCountry(country.name)}
                  className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                    isSelected
                      ? "border-secondary bg-secondary/10 text-secondary font-medium"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {country.flag} {country.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Destinations internationales */}
      {selectedPreset === 'international' && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Globe className="w-5 h-5 text-secondary" />
            Destinations internationales
          </Label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {internationalOptions.map((region) => {
              const selectedCount = region.countries.filter(c => 
                selectedInternational.includes(c)
              ).length;
              const allSelected = selectedCount === region.countries.length;

              return (
                <button
                  key={region.value}
                  type="button"
                  onClick={() => toggleInternationalRegion(region.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    allSelected
                      ? "border-secondary bg-secondary/10"
                      : selectedCount > 0
                      ? "border-secondary/50 bg-secondary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{region.label}</span>
                    {selectedCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {region.countries.join(", ")}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Résumé des zones sélectionnées */}
      {(selectedZones.length > 0 || selectedInternational.length > 0) && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/20">
          <p className="text-sm font-medium text-foreground mb-2">✓ Vos zones de couverture :</p>
          <div className="flex flex-wrap gap-2">
            {selectedPreset && selectedPreset !== 'international' && (
              <Badge variant="secondary">
                {zonePresets.find(p => p.value === selectedPreset)?.label.split(' ').slice(1).join(' ')}
              </Badge>
            )}
            {selectedZones.filter(z => !['National', 'International'].includes(z) && !z.includes('Afrique')).map((zone) => (
              <Badge key={zone} variant="outline" className="text-xs">
                {zone}
              </Badge>
            ))}
            {selectedInternational.map((dest) => (
              <Badge key={dest} variant="gold" className="text-xs">
                {dest}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
