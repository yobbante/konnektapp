import { useState, useMemo } from "react";
import { Check, Search, Globe } from "lucide-react";
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

// Extended world cities list with countries
export const WORLD_CITIES = [
  // France
  { city: "Paris", country: "FR", flag: "🇫🇷" },
  { city: "Lyon", country: "FR", flag: "🇫🇷" },
  { city: "Marseille", country: "FR", flag: "🇫🇷" },
  { city: "Toulouse", country: "FR", flag: "🇫🇷" },
  { city: "Bordeaux", country: "FR", flag: "🇫🇷" },
  { city: "Lille", country: "FR", flag: "🇫🇷" },
  { city: "Nice", country: "FR", flag: "🇫🇷" },
  { city: "Nantes", country: "FR", flag: "🇫🇷" },
  { city: "Strasbourg", country: "FR", flag: "🇫🇷" },
  { city: "Montpellier", country: "FR", flag: "🇫🇷" },
  { city: "Rennes", country: "FR", flag: "🇫🇷" },
  
  // Sénégal
  { city: "Dakar", country: "SN", flag: "🇸🇳" },
  { city: "Thiès", country: "SN", flag: "🇸🇳" },
  { city: "Saint-Louis", country: "SN", flag: "🇸🇳" },
  { city: "Kaolack", country: "SN", flag: "🇸🇳" },
  { city: "Ziguinchor", country: "SN", flag: "🇸🇳" },
  { city: "Touba", country: "SN", flag: "🇸🇳" },
  { city: "Mbour", country: "SN", flag: "🇸🇳" },
  { city: "Rufisque", country: "SN", flag: "🇸🇳" },
  
  // Côte d'Ivoire
  { city: "Abidjan", country: "CI", flag: "🇨🇮" },
  { city: "Bouaké", country: "CI", flag: "🇨🇮" },
  { city: "Yamoussoukro", country: "CI", flag: "🇨🇮" },
  { city: "San-Pédro", country: "CI", flag: "🇨🇮" },
  { city: "Daloa", country: "CI", flag: "🇨🇮" },
  
  // USA
  { city: "New York", country: "US", flag: "🇺🇸" },
  { city: "Los Angeles", country: "US", flag: "🇺🇸" },
  { city: "Chicago", country: "US", flag: "🇺🇸" },
  { city: "Houston", country: "US", flag: "🇺🇸" },
  { city: "Miami", country: "US", flag: "🇺🇸" },
  { city: "Atlanta", country: "US", flag: "🇺🇸" },
  { city: "Washington", country: "US", flag: "🇺🇸" },
  { city: "Dallas", country: "US", flag: "🇺🇸" },
  { city: "Boston", country: "US", flag: "🇺🇸" },
  { city: "San Francisco", country: "US", flag: "🇺🇸" },
  { city: "Seattle", country: "US", flag: "🇺🇸" },
  { city: "Denver", country: "US", flag: "🇺🇸" },
  { city: "Las Vegas", country: "US", flag: "🇺🇸" },
  
  // Canada
  { city: "Montréal", country: "CA", flag: "🇨🇦" },
  { city: "Toronto", country: "CA", flag: "🇨🇦" },
  { city: "Vancouver", country: "CA", flag: "🇨🇦" },
  { city: "Ottawa", country: "CA", flag: "🇨🇦" },
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
  
  // Belgique
  { city: "Bruxelles", country: "BE", flag: "🇧🇪" },
  { city: "Anvers", country: "BE", flag: "🇧🇪" },
  { city: "Liège", country: "BE", flag: "🇧🇪" },
  { city: "Gand", country: "BE", flag: "🇧🇪" },
  { city: "Charleroi", country: "BE", flag: "🇧🇪" },
  
  // Allemagne
  { city: "Berlin", country: "DE", flag: "🇩🇪" },
  { city: "Munich", country: "DE", flag: "🇩🇪" },
  { city: "Francfort", country: "DE", flag: "🇩🇪" },
  { city: "Hambourg", country: "DE", flag: "🇩🇪" },
  { city: "Cologne", country: "DE", flag: "🇩🇪" },
  { city: "Düsseldorf", country: "DE", flag: "🇩🇪" },
  
  // Espagne
  { city: "Madrid", country: "ES", flag: "🇪🇸" },
  { city: "Barcelone", country: "ES", flag: "🇪🇸" },
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
  
  // Suisse
  { city: "Genève", country: "CH", flag: "🇨🇭" },
  { city: "Zurich", country: "CH", flag: "🇨🇭" },
  { city: "Berne", country: "CH", flag: "🇨🇭" },
  { city: "Lausanne", country: "CH", flag: "🇨🇭" },
  { city: "Bâle", country: "CH", flag: "🇨🇭" },
  
  // Maroc
  { city: "Casablanca", country: "MA", flag: "🇲🇦" },
  { city: "Rabat", country: "MA", flag: "🇲🇦" },
  { city: "Marrakech", country: "MA", flag: "🇲🇦" },
  { city: "Fès", country: "MA", flag: "🇲🇦" },
  { city: "Tanger", country: "MA", flag: "🇲🇦" },
  { city: "Agadir", country: "MA", flag: "🇲🇦" },
  
  // Mali
  { city: "Bamako", country: "ML", flag: "🇲🇱" },
  { city: "Sikasso", country: "ML", flag: "🇲🇱" },
  { city: "Ségou", country: "ML", flag: "🇲🇱" },
  { city: "Mopti", country: "ML", flag: "🇲🇱" },
  { city: "Kayes", country: "ML", flag: "🇲🇱" },
  
  // Cameroun
  { city: "Douala", country: "CM", flag: "🇨🇲" },
  { city: "Yaoundé", country: "CM", flag: "🇨🇲" },
  { city: "Bafoussam", country: "CM", flag: "🇨🇲" },
  { city: "Garoua", country: "CM", flag: "🇨🇲" },
  
  // Guinée
  { city: "Conakry", country: "GN", flag: "🇬🇳" },
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
  
  // Gabon
  { city: "Libreville", country: "GA", flag: "🇬🇦" },
  { city: "Port-Gentil", country: "GA", flag: "🇬🇦" },
  
  // Congo
  { city: "Brazzaville", country: "CG", flag: "🇨🇬" },
  { city: "Pointe-Noire", country: "CG", flag: "🇨🇬" },
  
  // RD Congo
  { city: "Kinshasa", country: "CD", flag: "🇨🇩" },
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
  
  // Émirats
  { city: "Dubaï", country: "AE", flag: "🇦🇪" },
  { city: "Abu Dhabi", country: "AE", flag: "🇦🇪" },
  { city: "Sharjah", country: "AE", flag: "🇦🇪" },
  
  // Arabie Saoudite
  { city: "Djeddah", country: "SA", flag: "🇸🇦" },
  { city: "Riyad", country: "SA", flag: "🇸🇦" },
  { city: "La Mecque", country: "SA", flag: "🇸🇦" },
  { city: "Médine", country: "SA", flag: "🇸🇦" },
  
  // Qatar
  { city: "Doha", country: "QA", flag: "🇶🇦" },
  
  // Turquie
  { city: "Istanbul", country: "TR", flag: "🇹🇷" },
  { city: "Ankara", country: "TR", flag: "🇹🇷" },
  { city: "Izmir", country: "TR", flag: "🇹🇷" },
  
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

  // Get current city info for display
  const currentCity = useMemo(() => {
    return WORLD_CITIES.find(c => c.city === value && c.country === countryCode) || 
           WORLD_CITIES.find(c => c.city === value);
  }, [value, countryCode]);

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    if (!searchQuery) {
      // Show popular cities first when no search
      const popular = ["Dakar", "Paris", "New York", "Abidjan", "Montréal", "Bruxelles", "Londres", "Casablanca"];
      const popularCities = WORLD_CITIES.filter(c => popular.includes(c.city));
      const others = WORLD_CITIES.filter(c => !popular.includes(c.city));
      return [...popularCities, ...others];
    }
    
    const query = searchQuery.toLowerCase();
    return WORLD_CITIES.filter(c => 
      c.city.toLowerCase().includes(query) ||
      c.country.toLowerCase().includes(query)
    ).slice(0, 50); // Limit results for performance
  }, [searchQuery]);

  const CityList = () => (
    <Command className="w-full">
      <div className="flex items-center border-b px-3 bg-background sticky top-0 z-10">
        <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          className="flex h-12 w-full rounded-md bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
      </div>
      <CommandList className="max-h-[50vh] overflow-y-auto">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Globe className="w-8 h-8 text-muted-foreground/50" />
            <span>Aucune ville trouvée</span>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  onSelect(searchQuery, "XX");
                  setOpen(false);
                  setSearchQuery("");
                }}
              >
                Utiliser "{searchQuery}"
              </Button>
            )}
          </div>
        </CommandEmpty>
        <CommandGroup>
          {filteredCities.map((city, index) => (
            <CommandItem
              key={`${city.city}-${city.country}-${index}`}
              value={`${city.city} ${city.country}`}
              onSelect={() => {
                onSelect(city.city, city.country);
                setOpen(false);
                setSearchQuery("");
              }}
              className="flex items-center gap-3 py-3 px-3 cursor-pointer"
            >
              <span className="text-xl flex-shrink-0">{city.flag}</span>
              <span className="flex-1 text-base">{city.city}</span>
              <Check
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  value === city.city && countryCode === city.country
                    ? "opacity-100 text-primary"
                    : "opacity-0"
                )}
              />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  const TriggerButton = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn(
        "w-full h-12 justify-start text-left font-normal",
        !value && "text-muted-foreground",
        className
      )}
    >
      {currentCity ? (
        <span className="flex items-center gap-2 truncate">
          <span className="text-lg">{currentCity.flag}</span>
          <span className="truncate">{currentCity.city}</span>
        </span>
      ) : (
        <span className="flex items-center gap-2 text-muted-foreground">
          <Search className="w-4 h-4" />
          <span>Rechercher une ville...</span>
        </span>
      )}
    </Button>
  );

  // Use Drawer on mobile for better UX
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
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
            <CityList />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Use Popover on desktop
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {TriggerButton}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[320px] p-0 bg-popover z-50" 
        align="start"
        sideOffset={4}
      >
        <CityList />
      </PopoverContent>
    </Popover>
  );
}
