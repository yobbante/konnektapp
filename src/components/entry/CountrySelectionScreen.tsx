import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Globe, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ALL_COUNTRIES } from "@/components/gp/SearchableCountrySelect";
import { COUNTRY_PHONE_CODES } from "@/lib/phoneCountryCodes";

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

// Popular countries shown first
const POPULAR_CODES = ["SN", "FR", "CI", "CM", "ML", "US", "CA", "BE", "GB", "MA"];

interface CountrySelectionScreenProps {
  onSelect: (country: { code: string; name: string; flag: string; dialCode: string; currency: string }) => void;
}

export function CountrySelectionScreen({ onSelect }: CountrySelectionScreenProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const popular = useMemo(() => 
    POPULAR_CODES.map(code => ALL_COUNTRIES.find(c => c.code === code)!).filter(Boolean),
    []
  );

  const filtered = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return ALL_COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const displayList = search ? filtered : popular;
  const selectedCountry = ALL_COUNTRIES.find(c => c.code === selected);

  const handleConfirm = () => {
    if (!selectedCountry) return;
    onSelect({
      code: selectedCountry.code,
      name: selectedCountry.name,
      flag: selectedCountry.flag,
      dialCode: COUNTRY_PHONE_CODES[selectedCountry.code] || "+",
      currency: COUNTRY_CURRENCY[selectedCountry.code] || "XOF",
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
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Votre pays</h1>
            <p className="text-xs text-muted-foreground">Ce choix définit votre devise et indicatif</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un pays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
      </div>

      {/* Country list */}
      <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
        {!search && (
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Pays populaires
          </p>
        )}
        
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {displayList.map((country, i) => (
              <motion.button
                key={country.code}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => setSelected(country.code)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  selected === country.code
                    ? "bg-primary/10 ring-2 ring-primary/30"
                    : "hover:bg-muted/60"
                }`}
              >
                <span className="text-2xl">{country.flag}</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{country.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {COUNTRY_PHONE_CODES[country.code]} · {COUNTRY_CURRENCY[country.code] || "—"}
                  </p>
                </div>
                {selected === country.code && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                  >
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </AnimatePresence>

          {search && filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Aucun pays trouvé pour "{search}"
            </p>
          )}
        </div>

        {!search && (
          <>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-5 mb-2">
              Tous les pays
            </p>
            <div className="space-y-1">
              {ALL_COUNTRIES
                .filter(c => !POPULAR_CODES.includes(c.code))
                .map((country) => (
                  <button
                    key={country.code}
                    onClick={() => setSelected(country.code)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selected === country.code
                        ? "bg-primary/10 ring-2 ring-primary/30"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <span className="text-2xl">{country.flag}</span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{country.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {COUNTRY_PHONE_CODES[country.code]} · {COUNTRY_CURRENCY[country.code] || "—"}
                      </p>
                    </div>
                    {selected === country.code && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Confirm button */}
      <div className="px-5 py-4 border-t border-border bg-background">
        <Button
          className="w-full h-12 rounded-xl text-base"
          disabled={!selected}
          onClick={handleConfirm}
        >
          {selectedCountry ? (
            <>
              <span className="mr-2">{selectedCountry.flag}</span>
              Continuer avec {selectedCountry.name}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            "Sélectionnez votre pays"
          )}
        </Button>
      </div>
    </motion.div>
  );
}
