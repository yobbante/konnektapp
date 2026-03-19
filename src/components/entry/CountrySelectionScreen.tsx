import { useState, useMemo } from "react";
import konnektLogo from "@/assets/konnekt-logo-transparent.png";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Globe, ArrowRight, MapPin, ChevronLeft, ChevronDown, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ALL_COUNTRIES } from "@/components/gp/SearchableCountrySelect";
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

// Popular countries shown first
const POPULAR_CODES = ["SN", "FR", "CI", "CM", "ML", "US", "CA", "BE", "GB", "MA"];

interface CountrySelectionScreenProps {
  onSelect: (country: { code: string; name: string; flag: string; dialCode: string; currency: string; city?: string }) => void;
}

export function CountrySelectionScreen({ onSelect }: CountrySelectionScreenProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  // City step
  const [step, setStep] = useState<"country" | "city">("country");
  const [citySearch, setCitySearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

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

  // Cities for selected country
  const countryCities = useMemo(() => {
    if (!selected) return [];
    const cities = WORLD_CITIES.filter(c => c.country === selected);
    if (!citySearch) return cities;
    const q = citySearch.toLowerCase();
    return cities.filter(c => c.city.toLowerCase().includes(q));
  }, [selected, citySearch]);

  const handleCountryNext = () => {
    if (!selected) return;
    setStep("city");
  };

  const handleConfirm = () => {
    if (!selectedCountry) return;
    onSelect({
      code: selectedCountry.code,
      name: selectedCountry.name,
      flag: selectedCountry.flag,
      dialCode: COUNTRY_PHONE_CODES[selectedCountry.code] || "+",
      currency: COUNTRY_CURRENCY[selectedCountry.code] || "XOF",
      city: selectedCity || undefined,
    });
  };

  // === CITY STEP ===
  if (step === "city" && selectedCountry) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        className="fixed inset-0 z-50 bg-background flex flex-col"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-3">
          <button onClick={() => { setStep("country"); setCitySearch(""); setSelectedCity(null); }} className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <ChevronLeft className="w-4 h-4" /> Retour
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Votre ville</h1>
              <p className="text-xs text-muted-foreground">{selectedCountry.flag} {selectedCountry.name} — Choisissez votre ville de résidence</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une ville..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              className="pl-10 h-11 rounded-xl"
              autoFocus
            />
          </div>
        </div>

        {/* City list */}
        <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
          {countryCities.length > 0 ? (
            <div className="space-y-1">
              {countryCities.map((city) => (
                <motion.button
                  key={`${city.city}-${city.country}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedCity(city.city)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selectedCity === city.city
                      ? "bg-primary/10 ring-2 ring-primary/30"
                      : "hover:bg-muted/60"
                  }`}
                >
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium flex-1 text-left">{city.city}</span>
                  {selectedCity === city.city && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-2">Aucune ville trouvée</p>
              {citySearch && (
                <Button variant="outline" size="sm" onClick={() => setSelectedCity(citySearch)}>
                  Utiliser "{citySearch}"
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="px-5 py-4 border-t border-border bg-background">
          <Button className="w-full h-12 rounded-xl text-base" onClick={handleConfirm}>
            {selectedCity ? (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Continuer avec {selectedCity}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Passer cette étape
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    );
  }

  // === COUNTRY STEP ===
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col items-center"
        >
          <div className="w-20 h-20 flex items-center justify-center mb-4">
            <img src={konnektLogo} alt="Konnekt" className="w-16 h-16 object-contain drop-shadow-lg" />
          </div>
        </motion.div>

        <h1 className="text-3xl font-extrabold text-center mb-2 tracking-tight">KONNEKT</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Sélectionnez votre pays de résidence pour commencer
        </p>

        {/* Country selector tab */}
        <button
          onClick={() => setShowPicker(true)}
          className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/50 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            {selectedCountry ? (
              <>
                <span className="text-3xl">{selectedCountry.flag}</span>
                <div className="text-left">
                  <p className="font-semibold">{selectedCountry.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {COUNTRY_PHONE_CODES[selectedCountry.code]} · {COUNTRY_CURRENCY[selectedCountry.code] || "—"}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-muted-foreground font-medium">Choisir votre pays</span>
              </>
            )}
          </div>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: selected ? 1 : 0.4 }}
          className="w-full mt-6"
        >
          <Button
            className="w-full h-12 rounded-xl text-base"
            disabled={!selected}
            onClick={handleCountryNext}
          >
            Continuer
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>

      {/* Login link at bottom */}
      <div className="px-6 pb-6 w-full max-w-sm">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Vous avez déjà un compte ?</p>
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl"
            onClick={() => {
              window.location.href = "/auth?mode=login";
            }}
          >
            <LogIn className="w-4 h-4 mr-2" />
            Se connecter
          </Button>
        </div>
      </div>

      {/* Country picker popup */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) setShowPicker(false); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Drag handle */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="px-5 pb-3">
                <h2 className="text-lg font-bold mb-3">Sélectionner un pays</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un pays..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 rounded-xl"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
                {!search && (
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Pays populaires
                  </p>
                )}

                <div className="space-y-1">
                  {displayList.map((country, i) => (
                    <motion.button
                      key={country.code}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.015 }}
                      onClick={() => {
                        setSelected(country.code);
                        setSearch("");
                        setShowPicker(false);
                      }}
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
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        </div>
                      )}
                    </motion.button>
                  ))}

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
                            onClick={() => {
                              setSelected(country.code);
                              setSearch("");
                              setShowPicker(false);
                            }}
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
                                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                              </div>
                            )}
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
