/**
 * Routier utilities — Size categories, pricing, weight formatting
 * Aligned with Konnekt routier pricing structure
 */

// ── Size Categories ──────────────────────────────────────────
export type SizeCategory = "S" | "M" | "L" | "XL" | "FRET";

interface SizeBadgeInfo {
  label: SizeCategory;
  color: string;
  bg: string;
  description: string;
}

/**
 * Get size category from weight (aligned with routier pricing grid)
 * S: 0-50kg | M: 50-100kg | L: 100-200kg | XL: 200-300kg | FRET: >300kg
 */
export function getSizeFromWeight(weightKg: number): SizeBadgeInfo {
  if (weightKg <= 50) return { label: "S", color: "text-emerald-700", bg: "bg-emerald-100 dark:bg-emerald-900/30", description: "0-50 kg" };
  if (weightKg <= 100) return { label: "M", color: "text-blue-700", bg: "bg-blue-100 dark:bg-blue-900/30", description: "50-100 kg" };
  if (weightKg <= 200) return { label: "L", color: "text-amber-700", bg: "bg-amber-100 dark:bg-amber-900/30", description: "100-200 kg" };
  if (weightKg <= 300) return { label: "XL", color: "text-orange-700", bg: "bg-orange-100 dark:bg-orange-900/30", description: "200-300 kg" };
  return { label: "FRET", color: "text-red-700", bg: "bg-red-100 dark:bg-red-900/30", description: "> 300 kg" };
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

// ── Distance Bands (client-side fallback, DB is source of truth) ──
const DISTANCE_BANDS = [
  { minKm: 0, maxKm: 50, basePriceFcfa: 1500 },
  { minKm: 50, maxKm: 150, basePriceFcfa: 2500 },
  { minKm: 150, maxKm: 300, basePriceFcfa: 4000 },
  { minKm: 300, maxKm: 600, basePriceFcfa: 6500 },
  { minKm: 600, maxKm: 1000, basePriceFcfa: 9000 },
];

// ── Size Coefficients (client-side fallback) ──
const SIZE_COEFFICIENTS: Record<SizeCategory, number> = {
  S: 1.0,
  M: 2.0,
  L: 3.5,
  XL: 5.5,
  FRET: 0, // handled separately
};

const WEIGHT_SUPPLEMENT_PER_KG = 200; // FCFA
const FREIGHT_THRESHOLD_KG = 300;
const FREIGHT_PRICE_PER_KG = 150;
const FREIGHT_PRICE_PER_M3 = 25000;

// ── Pricing result ───────────────────────────────────────────
export interface RoutierPriceResult {
  sizeCategory: SizeCategory;
  basePrice: number;        // base price for S at this distance
  coefficient: number;
  unitPrice: number;         // base * coefficient
  quantity: number;
  weightSupplement: number;  // extra charge if exceeds category max
  totalPrice: number;
  isFreight: boolean;
  pricingMethod: "standard" | "freight_weight" | "volume_or_weight";
}

/**
 * Calculate routier price (client-side, for instant estimates)
 * Use the DB function `calculate_routier_price()` for authoritative pricing
 */
export function calculateRoutierPrice(
  distanceKm: number,
  weightKg: number,
  quantity: number = 1,
  volumeM3?: number
): RoutierPriceResult {
  // Freight mode for heavy loads
  if (weightKg > FREIGHT_THRESHOLD_KG) {
    let total: number;
    let method: "freight_weight" | "volume_or_weight" = "freight_weight";

    if (volumeM3 && volumeM3 > 0) {
      total = Math.max(
        Math.round(weightKg * FREIGHT_PRICE_PER_KG),
        Math.round(volumeM3 * FREIGHT_PRICE_PER_M3)
      );
      method = "volume_or_weight";
    } else {
      total = Math.round(weightKg * FREIGHT_PRICE_PER_KG);
    }

    return {
      sizeCategory: "FRET",
      basePrice: 0,
      coefficient: 0,
      unitPrice: total,
      quantity,
      weightSupplement: 0,
      totalPrice: total * quantity,
      isFreight: true,
      pricingMethod: method,
    };
  }

  // Get base price from distance band
  const band = DISTANCE_BANDS.find(b => distanceKm >= b.minKm && distanceKm < b.maxKm);
  let basePrice: number;
  if (band) {
    basePrice = band.basePriceFcfa;
  } else if (distanceKm >= 1000) {
    basePrice = 9000 + Math.round((distanceKm - 1000) * 8);
  } else {
    basePrice = 1500; // fallback
  }

  // Get size category
  const sizeInfo = getSizeFromWeight(weightKg);
  const category = sizeInfo.label as SizeCategory;
  const coefficient = SIZE_COEFFICIENTS[category] || 1.0;

  // Category max weights
  const categoryMaxWeights: Record<string, number> = { S: 50, M: 100, L: 200, XL: 300 };
  const maxWeight = categoryMaxWeights[category] || 50;

  // Calculate
  const unitPrice = Math.round(basePrice * coefficient);
  const weightSupplement = weightKg > maxWeight
    ? Math.round((weightKg - maxWeight) * WEIGHT_SUPPLEMENT_PER_KG)
    : 0;
  const totalPrice = (unitPrice + weightSupplement) * quantity;

  return {
    sizeCategory: category,
    basePrice,
    coefficient,
    unitPrice,
    quantity,
    weightSupplement,
    totalPrice,
    isFreight: false,
    pricingMethod: "standard",
  };
}

/**
 * Format price in FCFA
 */
export function formatPriceFCFA(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

/**
 * Get all price tiers for a given distance (for comparison display)
 */
export function getPriceTiersForDistance(distanceKm: number): Array<{
  category: SizeCategory;
  weightRange: string;
  price: number;
}> {
  const band = DISTANCE_BANDS.find(b => distanceKm >= b.minKm && distanceKm < b.maxKm);
  const basePrice = band?.basePriceFcfa ?? 1500;

  return [
    { category: "S", weightRange: "0-50 kg", price: Math.round(basePrice * 1.0) },
    { category: "M", weightRange: "50-100 kg", price: Math.round(basePrice * 2.0) },
    { category: "L", weightRange: "100-200 kg", price: Math.round(basePrice * 3.5) },
    { category: "XL", weightRange: "200-300 kg", price: Math.round(basePrice * 5.5) },
  ];
}
