import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Extended country list
export const ALL_COUNTRIES = [
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "GN", name: "Guinée", flag: "🇬🇳" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "BJ", name: "Bénin", flag: "🇧🇯" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "MR", name: "Mauritanie", flag: "🇲🇷" },
  { code: "GW", name: "Guinée-Bissau", flag: "🇬🇼" },
  { code: "CV", name: "Cap-Vert", flag: "🇨🇻" },
  { code: "GM", name: "Gambie", flag: "🇬🇲" },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "CD", name: "RD Congo", flag: "🇨🇩" },
  { code: "GQ", name: "Guinée équatoriale", flag: "🇬🇶" },
  { code: "TD", name: "Tchad", flag: "🇹🇩" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
  { code: "DZ", name: "Algérie", flag: "🇩🇿" },
  { code: "TN", name: "Tunisie", flag: "🇹🇳" },
  { code: "EG", name: "Égypte", flag: "🇪🇬" },
  { code: "AE", name: "Émirats Arabes Unis", flag: "🇦🇪" },
  { code: "SA", name: "Arabie Saoudite", flag: "🇸🇦" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "LB", name: "Liban", flag: "🇱🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "US", name: "États-Unis", flag: "🇺🇸" },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧" },
  { code: "BE", name: "Belgique", flag: "🇧🇪" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪" },
  { code: "ES", name: "Espagne", flag: "🇪🇸" },
  { code: "IT", name: "Italie", flag: "🇮🇹" },
  { code: "CH", name: "Suisse", flag: "🇨🇭" },
  { code: "NL", name: "Pays-Bas", flag: "🇳🇱" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "TR", name: "Turquie", flag: "🇹🇷" },
  { code: "CN", name: "Chine", flag: "🇨🇳" },
  { code: "JP", name: "Japon", flag: "🇯🇵" },
  { code: "IN", name: "Inde", flag: "🇮🇳" },
  { code: "BR", name: "Brésil", flag: "🇧🇷" },
  { code: "ZA", name: "Afrique du Sud", flag: "🇿🇦" },
  { code: "AU", name: "Australie", flag: "🇦🇺" },
];

// Popular cities by country
export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  FR: ["Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux", "Lille", "Nice", "Nantes", "Strasbourg", "Montpellier", "Rennes", "Rouen", "Nîmes"],
  SN: ["Dakar", "Thiès", "Saint-Louis", "Kaolack", "Ziguinchor", "Touba", "Mbour"],
  CI: ["Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro", "Daloa"],
  CM: ["Douala", "Yaoundé", "Bafoussam", "Garoua", "Maroua"],
  ML: ["Bamako", "Sikasso", "Ségou", "Mopti", "Kayes"],
  MA: ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir"],
  CA: ["Montréal", "Toronto", "Vancouver", "Ottawa", "Calgary", "Québec", "Gatineau", "Edmonton"],
  US: ["New York", "Los Angeles", "Chicago", "Houston", "Miami", "Atlanta", "Washington", "Providence"],
  AE: ["Dubaï", "Abu Dhabi", "Sharjah", "Ajman"],
  BE: ["Bruxelles", "Anvers", "Liège", "Gand", "Charleroi"],
  GB: ["Londres", "Manchester", "Birmingham", "Liverpool", "Leeds"],
  DE: ["Berlin", "Munich", "Francfort", "Hambourg", "Cologne", "Düsseldorf"],
  ES: ["Madrid", "Barcelone", "Valence", "Séville", "Malaga", "Almería"],
  IT: ["Rome", "Milan", "Naples", "Turin", "Florence"],
  CH: ["Genève", "Zurich", "Berne", "Lausanne", "Bâle"],
  TR: ["Istanbul", "Ankara", "Izmir"],
  LB: ["Beyrouth", "Tripoli"],
  GN: ["Conakry", "Nzérékoré", "Kankan"],
  CG: ["Brazzaville", "Pointe-Noire"],
  CD: ["Kinshasa", "Lubumbashi"],
  GA: ["Libreville", "Port-Gentil"],
  GQ: ["Malabo"],
  TD: ["N'Djamena"],
};

interface SearchableCountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableCountrySelect({
  value,
  onValueChange,
  placeholder = "Sélectionner un pays",
  className,
}: SearchableCountrySelectProps) {
  const [open, setOpen] = useState(false);

  const selectedCountry = ALL_COUNTRIES.find((c) => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span>{selectedCountry.flag}</span>
              <span className="truncate">{selectedCountry.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un pays..." />
          <CommandList>
            <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
            <CommandGroup>
              {ALL_COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code}`}
                  onSelect={() => {
                    onValueChange(country.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="mr-2">{country.flag}</span>
                  {country.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface SearchableCityInputProps {
  value: string;
  onValueChange: (value: string) => void;
  countryCode: string;
  placeholder?: string;
  className?: string;
}

export function SearchableCityInput({
  value,
  onValueChange,
  countryCode,
  placeholder = "Ville",
  className,
}: SearchableCityInputProps) {
  const [open, setOpen] = useState(false);
  const cities = CITIES_BY_COUNTRY[countryCode] || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {value || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Rechercher ou saisir..."
            value={value}
            onValueChange={onValueChange}
          />
          <CommandList>
            <CommandEmpty>
              <button
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Utiliser "{value}"
              </button>
            </CommandEmpty>
            {cities.length > 0 && (
              <CommandGroup heading="Villes populaires">
                {cities.map((city) => (
                  <CommandItem
                    key={city}
                    value={city}
                    onSelect={() => {
                      onValueChange(city);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === city ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {city}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
