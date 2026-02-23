/**
 * PhoneInputWithCode — Reusable phone input with country code selector
 * Emoji flag + dial code dropdown + phone input
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PHONE_COUNTRIES = [
  // Africa
  { code: "SN", flag: "🇸🇳", dial: "+221", name: "Sénégal" },
  { code: "CI", flag: "🇨🇮", dial: "+225", name: "Côte d'Ivoire" },
  { code: "CM", flag: "🇨🇲", dial: "+237", name: "Cameroun" },
  { code: "ML", flag: "🇲🇱", dial: "+223", name: "Mali" },
  { code: "GN", flag: "🇬🇳", dial: "+224", name: "Guinée" },
  { code: "BF", flag: "🇧🇫", dial: "+226", name: "Burkina Faso" },
  { code: "TG", flag: "🇹🇬", dial: "+228", name: "Togo" },
  { code: "BJ", flag: "🇧🇯", dial: "+229", name: "Bénin" },
  { code: "GH", flag: "🇬🇭", dial: "+233", name: "Ghana" },
  { code: "NG", flag: "🇳🇬", dial: "+234", name: "Nigeria" },
  { code: "GA", flag: "🇬🇦", dial: "+241", name: "Gabon" },
  { code: "CG", flag: "🇨🇬", dial: "+242", name: "Congo" },
  { code: "CD", flag: "🇨🇩", dial: "+243", name: "RD Congo" },
  { code: "MA", flag: "🇲🇦", dial: "+212", name: "Maroc" },
  { code: "DZ", flag: "🇩🇿", dial: "+213", name: "Algérie" },
  { code: "TN", flag: "🇹🇳", dial: "+216", name: "Tunisie" },
  { code: "EG", flag: "🇪🇬", dial: "+20", name: "Égypte" },
  { code: "MR", flag: "🇲🇷", dial: "+222", name: "Mauritanie" },
  { code: "NE", flag: "🇳🇪", dial: "+227", name: "Niger" },
  { code: "CV", flag: "🇨🇻", dial: "+238", name: "Cap-Vert" },
  { code: "GM", flag: "🇬🇲", dial: "+220", name: "Gambie" },
  { code: "GW", flag: "🇬🇼", dial: "+245", name: "Guinée-Bissau" },
  { code: "SL", flag: "🇸🇱", dial: "+232", name: "Sierra Leone" },
  { code: "LR", flag: "🇱🇷", dial: "+231", name: "Libéria" },
  { code: "ZA", flag: "🇿🇦", dial: "+27", name: "Afrique du Sud" },
  // Europe
  { code: "FR", flag: "🇫🇷", dial: "+33", name: "France" },
  { code: "GB", flag: "🇬🇧", dial: "+44", name: "Royaume-Uni" },
  { code: "BE", flag: "🇧🇪", dial: "+32", name: "Belgique" },
  { code: "DE", flag: "🇩🇪", dial: "+49", name: "Allemagne" },
  { code: "ES", flag: "🇪🇸", dial: "+34", name: "Espagne" },
  { code: "IT", flag: "🇮🇹", dial: "+39", name: "Italie" },
  { code: "CH", flag: "🇨🇭", dial: "+41", name: "Suisse" },
  { code: "PT", flag: "🇵🇹", dial: "+351", name: "Portugal" },
  { code: "NL", flag: "🇳🇱", dial: "+31", name: "Pays-Bas" },
  // Americas
  { code: "US", flag: "🇺🇸", dial: "+1", name: "États-Unis" },
  { code: "CA", flag: "🇨🇦", dial: "+1", name: "Canada" },
  { code: "BR", flag: "🇧🇷", dial: "+55", name: "Brésil" },
  // Middle East
  { code: "AE", flag: "🇦🇪", dial: "+971", name: "Émirats" },
  { code: "SA", flag: "🇸🇦", dial: "+966", name: "Arabie Saoudite" },
  { code: "QA", flag: "🇶🇦", dial: "+974", name: "Qatar" },
  { code: "TR", flag: "🇹🇷", dial: "+90", name: "Turquie" },
  // Asia
  { code: "CN", flag: "🇨🇳", dial: "+86", name: "Chine" },
  { code: "JP", flag: "🇯🇵", dial: "+81", name: "Japon" },
  { code: "IN", flag: "🇮🇳", dial: "+91", name: "Inde" },
  // Oceania
  { code: "AU", flag: "🇦🇺", dial: "+61", name: "Australie" },
];

export { PHONE_COUNTRIES };

interface PhoneInputWithCodeProps {
  value: string;
  onChange: (fullValue: string) => void;
  defaultCountry?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  onBlur?: (fullPhone: string) => void;
  /** Height variant */
  size?: "sm" | "md" | "lg";
  /** Extra content after the input (e.g. spinner) */
  suffix?: React.ReactNode;
}

export function PhoneInputWithCode({
  value,
  onChange,
  defaultCountry = "SN",
  placeholder = "77 123 45 67",
  className,
  inputClassName,
  disabled,
  onBlur,
  size = "md",
  suffix,
}: PhoneInputWithCodeProps) {
  // Parse initial dial code from value if present
  const findCountryFromValue = () => {
    if (value) {
      const match = PHONE_COUNTRIES.find(c => value.startsWith(c.dial));
      if (match) return match.code;
    }
    return defaultCountry;
  };

  const [selectedCode, setSelectedCode] = useState(findCountryFromValue);
  const [open, setOpen] = useState(false);

  const country = PHONE_COUNTRIES.find(c => c.code === selectedCode) || PHONE_COUNTRIES[0];

  // Strip dial code from displayed value
  const localNumber = value.startsWith(country.dial)
    ? value.slice(country.dial.length).trim()
    : value.startsWith("+") ? value : value;

  const heights = { sm: "h-9", md: "h-10", lg: "h-12" };
  const h = heights[size];

  return (
    <div className={cn("relative flex", className)}>
      {/* Country selector */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 px-2 border border-r-0 border-input bg-muted/50 rounded-l-md text-sm shrink-0 hover:bg-muted transition-colors",
          h,
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="text-base">{country.flag}</span>
        <span className="text-xs text-muted-foreground font-medium">{country.dial}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      {/* Phone input */}
      <div className="relative flex-1">
        <Input
          type="tel"
          disabled={disabled}
          placeholder={placeholder}
          value={localNumber}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9\s]/g, "");
            onChange(`${country.dial}${raw}`);
          }}
          onBlur={() => onBlur?.(`${country.dial}${localNumber}`)}
          className={cn(
            "rounded-l-none border-l-0",
            h,
            inputClassName
          )}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {suffix}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-64 max-h-60 overflow-auto rounded-lg border bg-popover shadow-lg">
            {PHONE_COUNTRIES.map((c) => (
              <button
                key={`${c.code}-${c.dial}`}
                type="button"
                onClick={() => {
                  // Re-compose with new dial code
                  onChange(`${c.dial}${localNumber}`);
                  setSelectedCode(c.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left",
                  c.code === selectedCode && "bg-accent/50 font-medium"
                )}
              >
                <span className="text-base">{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.dial}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
