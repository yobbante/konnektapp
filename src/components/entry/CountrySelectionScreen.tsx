import { useState, useMemo } from "react";
import konnektLogo from "@/assets/konnekt-logo-icon.png";
import { motion } from "framer-motion";
import { Search, ArrowRight, MapPin, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { COUNTRY_PHONE_CODES } from "@/lib/phoneCountryCodes";
import { useActiveCities } from "@/hooks/useActiveCities";

// Currency by country
const COUNTRY_CURRENCY: Record<string, string> = {
  SN: "XOF", CI: "XOF", ML: "XOF", BF: "XOF", TG: "XOF", BJ: "XOF", NE: "XOF", GW: "XOF",
  GN: "GNF", CM: "XAF", GA: "XAF", CG: "XAF", TD: "XAF", GQ: "XAF", CD: "CDF",
  NG: "NGN", GH: "GHS", ZA: "ZAR", EG: "EGP", MA: "MAD", DZ: "DZD", TN: "TND",
  FR: "EUR", BE: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", PT: "EUR",
  CH: "CHF", GB: "GBP", US: "USD", CA: "CAD", BR: "BRL",
  AE: "AED", SA: "SAR", QA: "QAR", TR: "TRY", LB: "LBP",
  CN: "CNY", JP: "JPY", IN: "INR", AU: "AUD",
  CV: "CVE", GM: "GMD", SL: "SLL", LR: "LRD", MR: "MRU",
};

interface CountrySelectionScreenProps {
  onSelect: (country: { code: string; name: string; flag: string; dialCode: string; currency: string; city?: string }) => void;
}

export function CountrySelectionScreen({ onSelect }: CountrySelectionScreenProps) {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const { cities: activeCities, loading } = useActiveCities();

  const filteredCities = useMemo(() => {
    if (!search) return activeCities;
    const q = search.toLowerCase();
    return activeCities.filter(c =>
      c.city.toLowerCase().includes(q) || c.country_name.toLowerCase().includes(q)
    );
  }, [search, activeCities]);

  const selectedCityData = activeCities.find(c => c.city === selectedCity);

  const handleConfirm = () => {
    if (!selectedCityData) return;
    const code = selectedCityData.country_code;
    onSelect({
      code,
      name: selectedCityData.country_name,
      flag: selectedCityData.flag,
      dialCode: COUNTRY_PHONE_CODES[code] || "+",
      currency: COUNTRY_CURRENCY[code] || "XOF",
      city: selectedCityData.city,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <img src={konnektLogo} alt="Konnekt" className="w-14 h-14 object-contain" />
        </motion.div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">KONNEKT</h1>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Choisissez votre ville de résidence
        </p>

        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl"
            autoFocus
          />
        </div>
      </div>

      {/* City list */}
      <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCities.length > 0 ? (
          <div className="space-y-1">
            {filteredCities.map((city, i) => (
              <motion.button
                key={city.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.01, 0.3) }}
                onClick={() => setSelectedCity(city.city)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  selectedCity === city.city
                    ? "bg-primary/10 ring-2 ring-primary/30"
                    : "hover:bg-muted/60"
                }`}
              >
                <span className="text-xl">{city.flag}</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{city.city}</p>
                  <p className="text-[11px] text-muted-foreground">{city.country_name}</p>
                </div>
                {selectedCity === city.city && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Aucune ville trouvée pour "{search}"</p>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-5 py-4 border-t border-border bg-background space-y-3 mt-auto">
        <Button
          className="w-full h-12 rounded-xl text-base"
          disabled={!selectedCity}
          onClick={handleConfirm}
        >
          <MapPin className="w-4 h-4 mr-2" />
          {selectedCity ? `Continuer avec ${selectedCity}` : "Sélectionnez une ville"}
          {selectedCity && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>

        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1.5">Vous avez déjà un compte ?</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-10 rounded-xl"
            onClick={() => { window.location.href = "/auth?mode=login"; }}
          >
            <LogIn className="w-4 h-4 mr-2" />
            Se connecter
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
