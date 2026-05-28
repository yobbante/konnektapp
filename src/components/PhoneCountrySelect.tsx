/**
 * PhoneCountrySelect — Champ téléphone avec sélecteur d'indicatif pays.
 * Compact mobile-first, sans dépendance externe.
 *
 * Émet onChange(fullPhone) avec le format "+CCDIGITS" (ex: "+221771234567").
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { COUNTRY_PHONE_CODES } from "@/lib/phoneCountryCodes";
import { detectDefaultCountry } from "@/lib/phoneCurrency";

const COUNTRY_LABELS: Record<string, { flag: string; name: string }> = {
  SN: { flag: "🇸🇳", name: "Sénégal" },
  FR: { flag: "🇫🇷", name: "France" },
  CI: { flag: "🇨🇮", name: "Côte d'Ivoire" },
  ML: { flag: "🇲🇱", name: "Mali" },
  BF: { flag: "🇧🇫", name: "Burkina Faso" },
  GN: { flag: "🇬🇳", name: "Guinée" },
  BJ: { flag: "🇧🇯", name: "Bénin" },
  TG: { flag: "🇹🇬", name: "Togo" },
  NE: { flag: "🇳🇪", name: "Niger" },
  CM: { flag: "🇨🇲", name: "Cameroun" },
  GA: { flag: "🇬🇦", name: "Gabon" },
  MA: { flag: "🇲🇦", name: "Maroc" },
  DZ: { flag: "🇩🇿", name: "Algérie" },
  TN: { flag: "🇹🇳", name: "Tunisie" },
  US: { flag: "🇺🇸", name: "USA" },
  CA: { flag: "🇨🇦", name: "Canada" },
  GB: { flag: "🇬🇧", name: "Royaume-Uni" },
  BE: { flag: "🇧🇪", name: "Belgique" },
  CH: { flag: "🇨🇭", name: "Suisse" },
  DE: { flag: "🇩🇪", name: "Allemagne" },
  ES: { flag: "🇪🇸", name: "Espagne" },
  IT: { flag: "🇮🇹", name: "Italie" },
  PT: { flag: "🇵🇹", name: "Portugal" },
  NL: { flag: "🇳🇱", name: "Pays-Bas" },
  AE: { flag: "🇦🇪", name: "Émirats" },
};

const ORDERED = [
  "SN", "FR", "CI", "ML", "GN", "BF", "BJ", "TG", "NE", "CM", "GA",
  "MA", "DZ", "TN", "US", "CA", "GB", "BE", "CH", "DE", "ES", "IT", "PT", "NL", "AE",
];

interface Props {
  value: string;           // numéro local sans indicatif (ex: "771234567")
  country: string;         // ISO2 code (ex: "SN")
  onChange: (localPhone: string, country: string, fullPhone: string) => void;
  invalid?: boolean;
  onBlur?: () => void;
  placeholder?: string;
}

export function PhoneCountrySelect({ value, country, onChange, invalid, onBlur, placeholder }: Props) {
  const dial = COUNTRY_PHONE_CODES[country] || "+221";

  const handleCountry = (c: string) => {
    const newDial = COUNTRY_PHONE_CODES[c] || "+221";
    onChange(value, c, `${newDial}${value}`);
  };

  const handleLocal = (raw: string) => {
    const local = raw.replace(/\D/g, "");
    onChange(local, country, `${dial}${local}`);
  };

  return (
    <div
      className={`flex items-stretch rounded-lg border bg-background transition-colors focus-within:ring-2 ${
        invalid
          ? "border-destructive focus-within:ring-destructive/20 focus-within:border-destructive"
          : "border-border focus-within:ring-primary/30 focus-within:border-primary"
      }`}
    >
      <div className="relative flex items-center pl-2.5 pr-1 border-r border-border">
        <span className="text-base leading-none mr-1.5" aria-hidden>
          {COUNTRY_LABELS[country]?.flag || "🌐"}
        </span>
        <span className="text-sm font-medium text-foreground tabular-nums">{dial}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
        <select
          aria-label="Indicatif pays"
          value={country}
          onChange={(e) => handleCountry(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        >
          {ORDERED.map((c) => (
            <option key={c} value={c}>
              {COUNTRY_LABELS[c]?.flag} {COUNTRY_LABELS[c]?.name} ({COUNTRY_PHONE_CODES[c]})
            </option>
          ))}
        </select>
      </div>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={value}
        onChange={(e) => handleLocal(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder || "77 123 45 67"}
        className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
      />
    </div>
  );
}

/** Hook utilitaire pour initialiser un state téléphone+pays détecté. */
export function useDetectedCountry(initial?: string): string {
  const [c] = useState<string>(() => initial || detectDefaultCountry());
  return c;
}

/** Donne le numéro complet "+XXNNNN" à partir d'un local + country. */
export function buildFullPhone(local: string, country: string): string {
  const dial = COUNTRY_PHONE_CODES[country] || "+221";
  return `${dial}${local.replace(/\D/g, "")}`;
}
