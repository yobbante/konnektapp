/**
 * Centralized country flags mapping
 * RULE: Never fallback to globe emoji. Use the origin/destination flag if same country, or empty string.
 */
export const COUNTRY_FLAGS: Record<string, string> = {
  FR: "🇫🇷", SN: "🇸🇳", CI: "🇨🇮", CM: "🇨🇲", ML: "🇲🇱", US: "🇺🇸", CA: "🇨🇦",
  AE: "🇦🇪", GB: "🇬🇧", BE: "🇧🇪", MA: "🇲🇦", TN: "🇹🇳", GA: "🇬🇦", CG: "🇨🇬",
  DE: "🇩🇪", ES: "🇪🇸", IT: "🇮🇹", CH: "🇨🇭", NL: "🇳🇱", GN: "🇬🇳",
  BF: "🇧🇫", TG: "🇹🇬", BJ: "🇧🇯", NE: "🇳🇪", GH: "🇬🇭", NG: "🇳🇬",
  CD: "🇨🇩", DZ: "🇩🇿", EG: "🇪🇬", KE: "🇰🇪", ZA: "🇿🇦", PT: "🇵🇹",
  BR: "🇧🇷", MX: "🇲🇽", JP: "🇯🇵", CN: "🇨🇳", IN: "🇮🇳", TR: "🇹🇷",
  SA: "🇸🇦", QA: "🇶🇦", RU: "🇷🇺", AU: "🇦🇺", GW: "🇬🇼", GM: "🇬🇲",
  MR: "🇲🇷", LB: "🇱🇧", SE: "🇸🇪", NO: "🇳🇴", DK: "🇩🇰", FI: "🇫🇮",
  AT: "🇦🇹", IE: "🇮🇪", PL: "🇵🇱", CZ: "🇨🇿", RO: "🇷🇴", HU: "🇭🇺",
  LU: "🇱🇺", ET: "🇪🇹", TZ: "🇹🇿", UG: "🇺🇬", RW: "🇷🇼", MW: "🇲🇼",
};

/**
 * Get flag for a country code. Never returns globe emoji.
 * If code not found, returns empty string.
 */
export function getFlag(code: string): string {
  if (!code) return "";
  return COUNTRY_FLAGS[code.toUpperCase()] || "";
}
