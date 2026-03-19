import { useState, useMemo, forwardRef } from "react";
import { Check, Search, Globe, MapPin } from "lucide-react";
import { useActiveCities } from "@/hooks/useActiveCities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

// Extended world cities list with countries
// Featured cities (shown first by default)
export const FEATURED_CITIES = [
  // 🇸🇳 Sénégal
  { city: "Dakar", country: "SN", flag: "🇸🇳" },
  // 🇫🇷 France
  { city: "Paris", country: "FR", flag: "🇫🇷" },
  { city: "Marseille", country: "FR", flag: "🇫🇷" },
  { city: "Lyon", country: "FR", flag: "🇫🇷" },
  { city: "Lille", country: "FR", flag: "🇫🇷" },
  { city: "Bordeaux", country: "FR", flag: "🇫🇷" },
  { city: "Montpellier", country: "FR", flag: "🇫🇷" },
  { city: "Rennes", country: "FR", flag: "🇫🇷" },
  { city: "Rouen", country: "FR", flag: "🇫🇷" },
  { city: "Nîmes", country: "FR", flag: "🇫🇷" },
  // 🇺🇸 USA
  { city: "New York", country: "US", flag: "🇺🇸" },
  { city: "Washington", country: "US", flag: "🇺🇸" },
  { city: "Providence", country: "US", flag: "🇺🇸" },
  // 🇨🇦 Canada
  { city: "Montréal", country: "CA", flag: "🇨🇦" },
  { city: "Ottawa", country: "CA", flag: "🇨🇦" },
  { city: "Gatineau", country: "CA", flag: "🇨🇦" },
  // 🇲🇦 Maroc
  { city: "Casablanca", country: "MA", flag: "🇲🇦" },
  // 🇦🇪 UAE
  { city: "Dubaï", country: "AE", flag: "🇦🇪" },
  // 🇪🇸 Espagne
  { city: "Madrid", country: "ES", flag: "🇪🇸" },
  { city: "Barcelone", country: "ES", flag: "🇪🇸" },
  { city: "Almería", country: "ES", flag: "🇪🇸" },
  // 🇩🇪 Allemagne
  { city: "Berlin", country: "DE", flag: "🇩🇪" },
  { city: "Düsseldorf", country: "DE", flag: "🇩🇪" },
  // 🇧🇪 Belgique
  { city: "Bruxelles", country: "BE", flag: "🇧🇪" },
  // 🇨🇭 Suisse
  { city: "Genève", country: "CH", flag: "🇨🇭" },
  // 🇹🇷 Turquie
  { city: "Istanbul", country: "TR", flag: "🇹🇷" },
  // 🇱🇧 Liban
  { city: "Beyrouth", country: "LB", flag: "🇱🇧" },
  // 🇨🇮 Côte d'Ivoire
  { city: "Abidjan", country: "CI", flag: "🇨🇮" },
  // 🇲🇱 Mali
  { city: "Bamako", country: "ML", flag: "🇲🇱" },
  // 🇬🇳 Guinée
  { city: "Conakry", country: "GN", flag: "🇬🇳" },
  // 🇨🇲 Cameroun
  { city: "Douala", country: "CM", flag: "🇨🇲" },
  { city: "Yaoundé", country: "CM", flag: "🇨🇲" },
  // 🇨🇬 Congo
  { city: "Brazzaville", country: "CG", flag: "🇨🇬" },
  // 🇨🇩 RDC
  { city: "Kinshasa", country: "CD", flag: "🇨🇩" },
  // 🇬🇦 Gabon
  { city: "Libreville", country: "GA", flag: "🇬🇦" },
  // 🇬🇶 Guinée équatoriale
  { city: "Malabo", country: "GQ", flag: "🇬🇶" },
  // 🇹🇩 Tchad
  { city: "N'Djamena", country: "TD", flag: "🇹🇩" },
];

// Full world cities list
export const WORLD_CITIES = [
  ...FEATURED_CITIES,
  // Additional France
  { city: "Toulouse", country: "FR", flag: "🇫🇷" },
  { city: "Nice", country: "FR", flag: "🇫🇷" },
  { city: "Nantes", country: "FR", flag: "🇫🇷" },
  { city: "Strasbourg", country: "FR", flag: "🇫🇷" },
  // Additional Sénégal
  { city: "Thiès", country: "SN", flag: "🇸🇳" },
  { city: "Saint-Louis", country: "SN", flag: "🇸🇳" },
  { city: "Kaolack", country: "SN", flag: "🇸🇳" },
  { city: "Ziguinchor", country: "SN", flag: "🇸🇳" },
  { city: "Touba", country: "SN", flag: "🇸🇳" },
  { city: "Mbour", country: "SN", flag: "🇸🇳" },
  { city: "Rufisque", country: "SN", flag: "🇸🇳" },
  // Additional Côte d'Ivoire
  { city: "Bouaké", country: "CI", flag: "🇨🇮" },
  { city: "Yamoussoukro", country: "CI", flag: "🇨🇮" },
  { city: "San-Pédro", country: "CI", flag: "🇨🇮" },
  { city: "Daloa", country: "CI", flag: "🇨🇮" },
  // Additional USA
  { city: "Los Angeles", country: "US", flag: "🇺🇸" },
  { city: "Chicago", country: "US", flag: "🇺🇸" },
  { city: "Houston", country: "US", flag: "🇺🇸" },
  { city: "Miami", country: "US", flag: "🇺🇸" },
  { city: "Atlanta", country: "US", flag: "🇺🇸" },
  { city: "Dallas", country: "US", flag: "🇺🇸" },
  { city: "Boston", country: "US", flag: "🇺🇸" },
  { city: "San Francisco", country: "US", flag: "🇺🇸" },
  { city: "Seattle", country: "US", flag: "🇺🇸" },
  { city: "Denver", country: "US", flag: "🇺🇸" },
  { city: "Las Vegas", country: "US", flag: "🇺🇸" },
  // Additional Canada
  { city: "Toronto", country: "CA", flag: "🇨🇦" },
  { city: "Vancouver", country: "CA", flag: "🇨🇦" },
  { city: "Calgary", country: "CA", flag: "🇨🇦" },
  { city: "Québec", country: "CA", flag: "🇨🇦" },
  { city: "Edmonton", country: "CA", flag: "🇨🇦" },
  // UK
  { city: "Londres", country: "GB", flag: "🇬🇧" },
  { city: "Manchester", country: "GB", flag: "🇬🇧" },
  { city: "Birmingham", country: "GB", flag: "🇬🇧" },
  { city: "Liverpool", country: "GB", flag: "🇬🇧" },
  { city: "Leeds", country: "GB", flag: "🇬🇧" },
  { city: "Glasgow", country: "GB", flag: "🇬🇧" },
  // Additional Belgique
  { city: "Anvers", country: "BE", flag: "🇧🇪" },
  { city: "Liège", country: "BE", flag: "🇧🇪" },
  { city: "Gand", country: "BE", flag: "🇧🇪" },
  { city: "Charleroi", country: "BE", flag: "🇧🇪" },
  // Additional Allemagne
  { city: "Munich", country: "DE", flag: "🇩🇪" },
  { city: "Francfort", country: "DE", flag: "🇩🇪" },
  { city: "Hambourg", country: "DE", flag: "🇩🇪" },
  { city: "Cologne", country: "DE", flag: "🇩🇪" },
  // Additional Espagne
  { city: "Valence", country: "ES", flag: "🇪🇸" },
  { city: "Séville", country: "ES", flag: "🇪🇸" },
  { city: "Malaga", country: "ES", flag: "🇪🇸" },
  // Italie
  { city: "Rome", country: "IT", flag: "🇮🇹" },
  { city: "Milan", country: "IT", flag: "🇮🇹" },
  { city: "Naples", country: "IT", flag: "🇮🇹" },
  { city: "Turin", country: "IT", flag: "🇮🇹" },
  { city: "Florence", country: "IT", flag: "🇮🇹" },
  { city: "Venise", country: "IT", flag: "🇮🇹" },
  // Additional Suisse
  { city: "Zurich", country: "CH", flag: "🇨🇭" },
  { city: "Berne", country: "CH", flag: "🇨🇭" },
  { city: "Lausanne", country: "CH", flag: "🇨🇭" },
  { city: "Bâle", country: "CH", flag: "🇨🇭" },
  // Additional Maroc
  { city: "Rabat", country: "MA", flag: "🇲🇦" },
  { city: "Marrakech", country: "MA", flag: "🇲🇦" },
  { city: "Fès", country: "MA", flag: "🇲🇦" },
  { city: "Tanger", country: "MA", flag: "🇲🇦" },
  { city: "Agadir", country: "MA", flag: "🇲🇦" },
  // Additional Mali
  { city: "Sikasso", country: "ML", flag: "🇲🇱" },
  { city: "Ségou", country: "ML", flag: "🇲🇱" },
  { city: "Mopti", country: "ML", flag: "🇲🇱" },
  { city: "Kayes", country: "ML", flag: "🇲🇱" },
  // Additional Cameroun
  { city: "Bafoussam", country: "CM", flag: "🇨🇲" },
  { city: "Garoua", country: "CM", flag: "🇨🇲" },
  // Additional Guinée
  { city: "Nzérékoré", country: "GN", flag: "🇬🇳" },
  { city: "Kankan", country: "GN", flag: "🇬🇳" },
  // Burkina Faso
  { city: "Ouagadougou", country: "BF", flag: "🇧🇫" },
  { city: "Bobo-Dioulasso", country: "BF", flag: "🇧🇫" },
  // Togo
  { city: "Lomé", country: "TG", flag: "🇹🇬" },
  { city: "Kara", country: "TG", flag: "🇹🇬" },
  // Bénin
  { city: "Cotonou", country: "BJ", flag: "🇧🇯" },
  { city: "Porto-Novo", country: "BJ", flag: "🇧🇯" },
  // Ghana
  { city: "Accra", country: "GH", flag: "🇬🇭" },
  { city: "Kumasi", country: "GH", flag: "🇬🇭" },
  // Nigeria
  { city: "Lagos", country: "NG", flag: "🇳🇬" },
  { city: "Abuja", country: "NG", flag: "🇳🇬" },
  { city: "Kano", country: "NG", flag: "🇳🇬" },
  { city: "Port Harcourt", country: "NG", flag: "🇳🇬" },
  // Additional Gabon
  { city: "Port-Gentil", country: "GA", flag: "🇬🇦" },
  // Additional Congo
  { city: "Pointe-Noire", country: "CG", flag: "🇨🇬" },
  // Additional RD Congo
  { city: "Lubumbashi", country: "CD", flag: "🇨🇩" },
  // Algérie
  { city: "Alger", country: "DZ", flag: "🇩🇿" },
  { city: "Oran", country: "DZ", flag: "🇩🇿" },
  { city: "Constantine", country: "DZ", flag: "🇩🇿" },
  // Tunisie
  { city: "Tunis", country: "TN", flag: "🇹🇳" },
  { city: "Sfax", country: "TN", flag: "🇹🇳" },
  { city: "Sousse", country: "TN", flag: "🇹🇳" },
  // Égypte
  { city: "Le Caire", country: "EG", flag: "🇪🇬" },
  { city: "Alexandrie", country: "EG", flag: "🇪🇬" },
  // Additional UAE
  { city: "Abu Dhabi", country: "AE", flag: "🇦🇪" },
  { city: "Sharjah", country: "AE", flag: "🇦🇪" },
  // Arabie Saoudite
  { city: "Djeddah", country: "SA", flag: "🇸🇦" },
  { city: "Riyad", country: "SA", flag: "🇸🇦" },
  { city: "La Mecque", country: "SA", flag: "🇸🇦" },
  { city: "Médine", country: "SA", flag: "🇸🇦" },
  // Qatar
  { city: "Doha", country: "QA", flag: "🇶🇦" },
  // Additional Turquie
  { city: "Ankara", country: "TR", flag: "🇹🇷" },
  { city: "Izmir", country: "TR", flag: "🇹🇷" },
  // Liban
  { city: "Tripoli", country: "LB", flag: "🇱🇧" },
  // Portugal
  { city: "Lisbonne", country: "PT", flag: "🇵🇹" },
  { city: "Porto", country: "PT", flag: "🇵🇹" },
  // Pays-Bas
  { city: "Amsterdam", country: "NL", flag: "🇳🇱" },
  { city: "Rotterdam", country: "NL", flag: "🇳🇱" },
  { city: "La Haye", country: "NL", flag: "🇳🇱" },
  // Chine
  { city: "Pékin", country: "CN", flag: "🇨🇳" },
  { city: "Shanghai", country: "CN", flag: "🇨🇳" },
  { city: "Canton", country: "CN", flag: "🇨🇳" },
  { city: "Shenzhen", country: "CN", flag: "🇨🇳" },
  { city: "Hong Kong", country: "HK", flag: "🇭🇰" },
  // Japon
  { city: "Tokyo", country: "JP", flag: "🇯🇵" },
  { city: "Osaka", country: "JP", flag: "🇯🇵" },
  { city: "Kyoto", country: "JP", flag: "🇯🇵" },
  // Inde
  { city: "New Delhi", country: "IN", flag: "🇮🇳" },
  { city: "Mumbai", country: "IN", flag: "🇮🇳" },
  { city: "Bangalore", country: "IN", flag: "🇮🇳" },
  // Brésil
  { city: "São Paulo", country: "BR", flag: "🇧🇷" },
  { city: "Rio de Janeiro", country: "BR", flag: "🇧🇷" },
  { city: "Brasilia", country: "BR", flag: "🇧🇷" },
  // Australie
  { city: "Sydney", country: "AU", flag: "🇦🇺" },
  { city: "Melbourne", country: "AU", flag: "🇦🇺" },
  { city: "Brisbane", country: "AU", flag: "🇦🇺" },
  // Afrique du Sud
  { city: "Johannesburg", country: "ZA", flag: "🇿🇦" },
  { city: "Le Cap", country: "ZA", flag: "🇿🇦" },
  { city: "Durban", country: "ZA", flag: "🇿🇦" },
  // Mauritanie
  { city: "Nouakchott", country: "MR", flag: "🇲🇷" },
  // Niger
  { city: "Niamey", country: "NE", flag: "🇳🇪" },
  // Cap-Vert
  { city: "Praia", country: "CV", flag: "🇨🇻" },
  // Gambie
  { city: "Banjul", country: "GM", flag: "🇬🇲" },
  // Guinée-Bissau
  { city: "Bissau", country: "GW", flag: "🇬🇼" },
  // Sierra Leone
  { city: "Freetown", country: "SL", flag: "🇸🇱" },
  // Liberia
  { city: "Monrovia", country: "LR", flag: "🇱🇷" },
];

const POPULAR_CITIES = FEATURED_CITIES.map(c => c.city);

// NOTE: FEATURED_CITIES and WORLD_CITIES are still exported for backward compat.
// For search filters, use useActiveCities() hook which reads from DB (admin-managed).

interface CityListProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filteredCities: typeof WORLD_CITIES;
  value: string;
  countryCode: string;
  onSelect: (city: string, country: string) => void;
  onClose: () => void;
  placeholder: string;
}

function CityListContent({
  searchQuery,
  onSearchChange,
  filteredCities,
  value,
  countryCode,
  onSelect,
  onClose,
  placeholder,
}: CityListProps) {
  const [showAll, setShowAll] = useState(false);
  const featuredSet = useMemo(() => new Set(FEATURED_CITIES.map(c => `${c.city}-${c.country}`)), []);

  // When searching, show all results. Otherwise show featured first
  const citiesToShow = useMemo(() => {
    if (searchQuery) return filteredCities;
    if (showAll) return filteredCities;
    return filteredCities.filter(c => featuredSet.has(`${c.city}-${c.country}`));
  }, [filteredCities, searchQuery, showAll, featuredSet]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center border-b px-3 bg-background sticky top-0 z-10">
        <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          className="flex h-12 w-full rounded-md bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => { onSearchChange(e.target.value); setShowAll(true); }}
          autoFocus
        />
      </div>
      <div 
        className="overflow-y-auto overscroll-contain" 
        style={{ 
          maxHeight: "55vh", 
          WebkitOverflowScrolling: "touch", 
          touchAction: "pan-y",
        } as React.CSSProperties}
      >
        {citiesToShow.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
            <Globe className="w-8 h-8 text-muted-foreground/50" />
            <span>Aucune ville trouvée</span>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  onSelect(searchQuery, "XX");
                  onClose();
                }}
              >
                Utiliser "{searchQuery}"
              </Button>
            )}
          </div>
        ) : (
          <div className="p-1">
            {(() => {
              let lastCountry = "";
              return citiesToShow.map((city, index) => {
                const isSelected = value === city.city && countryCode === city.country;
                const showHeader = city.country !== lastCountry;
                lastCountry = city.country;
                return (
                  <div key={`${city.city}-${city.country}-${index}`}>
                    {showHeader && (
                      <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1 first:mt-0">
                        {city.flag} {city.country}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        onSelect(city.city, city.country);
                        onClose();
                      }}
                      className={cn(
                        "flex items-center gap-3 w-full py-2.5 px-3 rounded-md text-left transition-colors",
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/80 active:bg-muted"
                      )}
                    >
                      <span className="flex-1 text-sm font-medium">{city.city}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                      )}
                    </button>
                  </div>
                );
              });
            })()}
            {!searchQuery && !showAll && filteredCities.length > citiesToShow.length && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full py-3 text-sm text-primary font-medium hover:bg-muted/50 rounded-md mt-1 flex items-center justify-center gap-1"
              >
                <Globe className="w-4 h-4" />
                Voir toutes les villes ({filteredCities.length - citiesToShow.length} de plus)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface SearchableCitySelectProps {
  value: string;
  countryCode: string;
  onSelect: (city: string, countryCode: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function SearchableCitySelect({
  value,
  countryCode,
  onSelect,
  placeholder = "Rechercher une ville...",
  label,
  className,
}: SearchableCitySelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const { cities: activeCities } = useActiveCities();

  // Build city list from active platform cities
  const platformCities = useMemo(() => {
    return activeCities.map(c => ({ city: c.city, country: c.country_code, flag: c.flag }));
  }, [activeCities]);

  const currentCity = useMemo(() => {
    return platformCities.find(c => c.city === value && c.country === countryCode) ||
           platformCities.find(c => c.city === value) ||
           WORLD_CITIES.find(c => c.city === value && c.country === countryCode) ||
           WORLD_CITIES.find(c => c.city === value);
  }, [value, countryCode, platformCities]);

  // Sort: current country first, then the rest
  const sortedCities = useMemo(() => {
    const currentCountryCities = platformCities.filter(c => c.country === countryCode);
    const rest = platformCities.filter(c => c.country !== countryCode);
    return [...currentCountryCities, ...rest];
  }, [countryCode, platformCities]);

  const filteredCities = useMemo(() => {
    if (!searchQuery) return sortedCities;
    const query = searchQuery.toLowerCase();
    return sortedCities.filter(c =>
      c.city.toLowerCase().includes(query) ||
      c.flag.includes(searchQuery)
    );
  }, [searchQuery, sortedCities]);

  const handleClose = () => {
    setOpen(false);
    setSearchQuery("");
  };

  const TriggerButton = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn(
        "w-full h-11 justify-start text-left font-normal gap-2",
        !value && "text-muted-foreground",
        className
      )}
    >
      {currentCity ? (
        <>
          <span className="text-base">{currentCity.flag}</span>
          <span className="truncate text-sm">{currentCity.city}</span>
        </>
      ) : (
        <>
          <MapPin className="w-4 h-4" />
          <span className="text-sm">Choisir une ville</span>
        </>
      )}
    </Button>
  );

  const listProps: CityListProps = {
    searchQuery,
    onSearchChange: setSearchQuery,
    filteredCities,
    value,
    countryCode,
    onSelect,
    onClose: handleClose,
    placeholder,
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearchQuery(""); }}>
        <DrawerTrigger asChild>
          {TriggerButton}
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {label || "Sélectionner une ville"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-2 pb-safe">
            <CityListContent {...listProps} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearchQuery(""); }}>
      <PopoverTrigger asChild>
        {TriggerButton}
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0 bg-popover z-50"
        align="start"
        sideOffset={4}
      >
        <CityListContent {...listProps} />
      </PopoverContent>
    </Popover>
  );
}
