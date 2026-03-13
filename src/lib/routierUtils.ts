/**
 * Routier utilities — Size categories, pricing, weight formatting
 * Hybrid model: transporter sets prices, platform shows recommended prices
 */

// ── Size Categories (aligned with user spec) ─────────────────
export type SizeCategory = "S" | "M" | "L" | "XL";

interface SizeBadgeInfo {
  label: SizeCategory;
  color: string;
  bg: string;
  description: string;
  minKg: number;
  maxKg: number;
}

const SIZE_DEFINITIONS: SizeBadgeInfo[] = [
  { label: "S",  color: "text-emerald-700", bg: "bg-emerald-100 dark:bg-emerald-900/30", description: "0 – 50 kg",    minKg: 0,   maxKg: 50 },
  { label: "M",  color: "text-blue-700",    bg: "bg-blue-100 dark:bg-blue-900/30",       description: "50 – 200 kg",  minKg: 50,  maxKg: 200 },
  { label: "L",  color: "text-amber-700",   bg: "bg-amber-100 dark:bg-amber-900/30",     description: "200 – 500 kg", minKg: 200, maxKg: 500 },
  { label: "XL", color: "text-orange-700",  bg: "bg-orange-100 dark:bg-orange-900/30",   description: "500 – 1000 kg", minKg: 500, maxKg: 1000 },
];

/**
 * Get size category from weight
 */
export function getSizeFromWeight(weightKg: number): SizeBadgeInfo {
  if (weightKg <= 50)  return SIZE_DEFINITIONS[0];
  if (weightKg <= 200) return SIZE_DEFINITIONS[1];
  if (weightKg <= 500) return SIZE_DEFINITIONS[2];
  return SIZE_DEFINITIONS[3];
}

/**
 * Get all size definitions (for forms / display)
 */
export function getAllSizeCategories(): SizeBadgeInfo[] {
  return SIZE_DEFINITIONS;
}

/**
 * Map size category to price field name in DB
 */
export function getSizePriceField(size: SizeCategory): "price_s" | "price_m" | "price_l" | "price_xl" {
  const map: Record<SizeCategory, "price_s" | "price_m" | "price_l" | "price_xl"> = {
    S: "price_s", M: "price_m", L: "price_l", XL: "price_xl",
  };
  return map[size];
}

// ── Weight Formatting ────────────────────────────────────────
export function formatWeightShort(weightKg: number): string {
  if (weightKg >= 1000) return `${(weightKg / 1000).toFixed(1).replace(".0", "")} T`;
  return `${Math.round(weightKg)} kg`;
}

// ── Freight Type Labels (no emojis) ──────────────────────────
export const freightTypeLabels: Record<string, { label: string; icon: string }> = {
  colis: { label: "Colis", icon: "package" },
  palettes: { label: "Palettes", icon: "layers" },
  alimentaire: { label: "Alimentaire", icon: "apple" },
  frigorifie: { label: "Frigorifié", icon: "snowflake" },
  liquides: { label: "Liquides", icon: "droplet" },
  materiaux: { label: "Matériaux", icon: "brick" },
  btp: { label: "BTP", icon: "building" },
  vehicules: { label: "Véhicules", icon: "car" },
};

// ── Pricing result (hybrid model) ────────────────────────────
export interface RoutierPriceResult {
  sizeCategory: SizeCategory;
  transporterPrice: number;    // price set by transporter
  recommendedPrice: number;    // platform recommended price
  isPriceBelowRecommended: boolean;
  isPriceAboveRecommended: boolean;
}

/**
 * Get transporter price for a given size from an offer or pricing row
 */
export function getTransporterPriceForSize(
  pricing: { price_s?: number | null; price_m?: number | null; price_l?: number | null; price_xl?: number | null },
  size: SizeCategory
): number {
  const field = getSizePriceField(size);
  return (pricing as any)?.[field] || 0;
}

/**
 * Format price in FCFA
 */
export function formatPriceFCFA(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

/**
 * Get all price tiers from an offer (for display)
 */
export function getOfferPriceTiers(offer: { price_s?: number | null; price_m?: number | null; price_l?: number | null; price_xl?: number | null }): Array<{
  category: SizeCategory;
  weightRange: string;
  price: number;
}> {
  return SIZE_DEFINITIONS.map(s => ({
    category: s.label,
    weightRange: s.description,
    price: getTransporterPriceForSize(offer, s.label),
  }));
}

// ── Distance estimation (client-side, for UI) ────────────────
const KNOWN_DISTANCES: Record<string, number> = {
  "dakar-saint-louis": 260,
  "dakar-thiès": 70,
  "dakar-mbour": 83,
  "dakar-kaolack": 192,
  "dakar-touba": 194,
  "dakar-tambacounda": 467,
  "dakar-ziguinchor": 455,
  "dakar-abidjan": 2450,
  "dakar-bamako": 1250,
  "dakar-conakry": 950,
  "abidjan-bamako": 1100,
  "thiès-mbour": 36,
  "thiès-kaolack": 130,
  "kaolack-tambacounda": 280,
  "touba-kaolack": 120,
  "saint-louis-touba": 200,
};

/**
 * Estimate distance between two cities (symmetric lookup)
 */
export function estimateDistance(origin: string, destination: string): number {
  const a = origin.toLowerCase().trim();
  const b = destination.toLowerCase().trim();
  if (a === b) return 15;
  const key1 = `${a}-${b}`;
  const key2 = `${b}-${a}`;
  return KNOWN_DISTANCES[key1] || KNOWN_DISTANCES[key2] || Math.floor(Math.random() * 300) + 80;
}
