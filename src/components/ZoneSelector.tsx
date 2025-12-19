import { useState } from "react";
import { Check, Globe, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ZoneSelectorProps {
  selectedZones: string[];
  onZonesChange: (zones: string[]) => void;
  selectedInternational: string[];
  onInternationalChange: (destinations: string[]) => void;
}

const westAfricanCountries = [
  { code: "SN", name: "Sénégal", cities: ["Dakar", "Thiès", "Saint-Louis", "Kaolack", "Ziguinchor", "Touba"] },
  { code: "CI", name: "Côte d'Ivoire", cities: ["Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro", "Korhogo"] },
  { code: "ML", name: "Mali", cities: ["Bamako", "Sikasso", "Mopti", "Ségou", "Kayes"] },
  { code: "BF", name: "Burkina Faso", cities: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou"] },
  { code: "GN", name: "Guinée", cities: ["Conakry", "Nzérékoré", "Kankan", "Kindia"] },
  { code: "GW", name: "Guinée-Bissau", cities: ["Bissau", "Bafatá", "Gabú"] },
  { code: "GM", name: "Gambie", cities: ["Banjul", "Serekunda"] },
  { code: "MR", name: "Mauritanie", cities: ["Nouakchott", "Nouadhibou"] },
  { code: "NE", name: "Niger", cities: ["Niamey", "Zinder", "Maradi"] },
  { code: "TG", name: "Togo", cities: ["Lomé", "Sokodé", "Kara"] },
  { code: "BJ", name: "Bénin", cities: ["Cotonou", "Porto-Novo", "Parakou"] },
  { code: "GH", name: "Ghana", cities: ["Accra", "Kumasi", "Takoradi"] },
  { code: "NG", name: "Nigeria", cities: ["Lagos", "Abuja", "Kano", "Port Harcourt"] },
];

const internationalDestinations = [
  { region: "Europe", countries: ["France", "Espagne", "Italie", "Belgique", "Allemagne", "Royaume-Uni", "Portugal"] },
  { region: "Amérique du Nord", countries: ["États-Unis", "Canada"] },
  { region: "Maghreb", countries: ["Maroc", "Tunisie", "Algérie"] },
  { region: "Moyen-Orient", countries: ["Dubaï", "Arabie Saoudite", "Qatar"] },
  { region: "Asie", countries: ["Chine", "Turquie", "Inde"] },
];

export function ZoneSelector({ 
  selectedZones, 
  onZonesChange,
  selectedInternational,
  onInternationalChange 
}: ZoneSelectorProps) {
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  const toggleZone = (zone: string) => {
    if (selectedZones.includes(zone)) {
      onZonesChange(selectedZones.filter((z) => z !== zone));
    } else {
      onZonesChange([...selectedZones, zone]);
    }
  };

  const toggleCountry = (countryCode: string) => {
    const country = westAfricanCountries.find((c) => c.code === countryCode);
    if (!country) return;

    const allCities = country.cities.map((city) => `${city}, ${country.name}`);
    const allSelected = allCities.every((city) => selectedZones.includes(city));

    if (allSelected) {
      onZonesChange(selectedZones.filter((z) => !allCities.includes(z)));
    } else {
      const newZones = [...selectedZones];
      allCities.forEach((city) => {
        if (!newZones.includes(city)) {
          newZones.push(city);
        }
      });
      onZonesChange(newZones);
    }
  };

  const toggleInternational = (destination: string) => {
    if (selectedInternational.includes(destination)) {
      onInternationalChange(selectedInternational.filter((d) => d !== destination));
    } else {
      onInternationalChange([...selectedInternational, destination]);
    }
  };

  return (
    <div className="space-y-8">
      {/* West African Zones */}
      <div>
        <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-secondary" />
          Afrique de l'Ouest *
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {westAfricanCountries.map((country) => {
            const countryZones = country.cities.map((city) => `${city}, ${country.name}`);
            const selectedCount = countryZones.filter((z) => selectedZones.includes(z)).length;
            const allSelected = selectedCount === country.cities.length;
            const someSelected = selectedCount > 0 && !allSelected;

            return (
              <div key={country.code} className="border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedCountry(expandedCountry === country.code ? null : country.code)}
                  className={cn(
                    "w-full px-4 py-3 flex items-center justify-between transition-colors",
                    someSelected || allSelected ? "bg-secondary/10" : "bg-card hover:bg-muted/50"
                  )}
                >
                  <span className="font-medium text-foreground">{country.name}</span>
                  <div className="flex items-center gap-2">
                    {selectedCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedCount}
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCountry(country.code);
                      }}
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        allSelected 
                          ? "bg-secondary border-secondary" 
                          : someSelected
                          ? "bg-secondary/50 border-secondary"
                          : "border-border"
                      )}
                    >
                      {(allSelected || someSelected) && <Check className="w-3 h-3 text-secondary-foreground" />}
                    </button>
                  </div>
                </button>
                
                {expandedCountry === country.code && (
                  <div className="p-3 bg-muted/30 border-t border-border space-y-2">
                    {country.cities.map((city) => {
                      const zoneKey = `${city}, ${country.name}`;
                      const isSelected = selectedZones.includes(zoneKey);
                      
                      return (
                        <button
                          key={city}
                          type="button"
                          onClick={() => toggleZone(zoneKey)}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg flex items-center justify-between transition-colors text-left",
                            isSelected ? "bg-secondary/20" : "hover:bg-muted"
                          )}
                        >
                          <span className="text-sm text-foreground">{city}</span>
                          <div
                            className={cn(
                              "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                              isSelected ? "bg-secondary border-secondary" : "border-border"
                            )}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-secondary-foreground" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* International Destinations */}
      <div>
        <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-secondary" />
          Destinations internationales (optionnel)
        </h3>
        <div className="space-y-4">
          {internationalDestinations.map((region) => (
            <div key={region.region}>
              <p className="text-sm text-muted-foreground mb-2">{region.region}</p>
              <div className="flex flex-wrap gap-2">
                {region.countries.map((country) => {
                  const isSelected = selectedInternational.includes(country);
                  
                  return (
                    <button
                      key={country}
                      type="button"
                      onClick={() => toggleInternational(country)}
                      className={cn(
                        "px-4 py-2 rounded-full border-2 text-sm font-medium transition-all",
                        isSelected
                          ? "border-secondary bg-secondary/10 text-secondary"
                          : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                      )}
                    >
                      {country}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Summary */}
      {(selectedZones.length > 0 || selectedInternational.length > 0) && (
        <div className="p-4 rounded-xl bg-muted/50 border border-border">
          <p className="text-sm font-medium text-foreground mb-2">Résumé de vos zones :</p>
          <div className="flex flex-wrap gap-2">
            {selectedZones.map((zone) => (
              <Badge key={zone} variant="secondary" className="text-xs">
                {zone}
              </Badge>
            ))}
            {selectedInternational.map((dest) => (
              <Badge key={dest} variant="gold" className="text-xs">
                🌍 {dest}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
