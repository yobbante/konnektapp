/**
 * GP Pricing Engine — Single source of truth for all pricing logic
 * 
 * RULES (INVIOLABLE):
 * - GP chooses 2 values at registration: price_per_kg + forfait_valise_23kg
 * - These become the official pricing base, locked after admin validation
 * - All weight tiers are AUTOMATICALLY calculated from these 2 values
 * - Coefficients are system-level, fixed, not modifiable by GP
 */

// ── Regressive Coefficients (System-level, fixed) ──────────────────────
// Sub-1kg: forfait minimum at 1.50x (e.g. 10€/kg → 15€ minimum)
// Then regressive: more weight = lower effective price/kg
export const WEIGHT_TIER_COEFFICIENTS = [
  { min: 0, max: 1, coefficient: 1.50, label: "< 1 kg", description: "Forfait petit colis" },
  { min: 1, max: 5, coefficient: 1.00, label: "1 – 5 kg", description: "Prix de base" },
  { min: 5, max: 10, coefficient: 0.95, label: "5 – 10 kg", description: "Légère réduction" },
  { min: 10, max: 15, coefficient: 0.90, label: "10 – 15 kg", description: "Économie volume" },
  { min: 15, max: 23, coefficient: 0.85, label: "15 – 23 kg", description: "Pré-forfait" },
] as const;

export interface CalculatedTier {
  min_weight: number;
  max_weight: number;
  coefficient: number;
  price_per_kg: number;
  label: string;
  description: string;
  isForfait: boolean;
}

export interface GPPricingConfig {
  basePricePerKg: number;
  forfaitValise23kg: number;
  currency: string;
}

/**
 * Calculate all tiers from the 2 GP inputs
 * Returns 6 tiers: 5 weight-based + 1 forfait valise
 */
export function calculateTiers(config: GPPricingConfig): CalculatedTier[] {
  const { basePricePerKg, forfaitValise23kg } = config;

  const tiers: CalculatedTier[] = WEIGHT_TIER_COEFFICIENTS.map(tier => ({
    min_weight: tier.min,
    max_weight: tier.max,
    coefficient: tier.coefficient,
    price_per_kg: Math.round(basePricePerKg * tier.coefficient),
    label: tier.label,
    description: tier.description,
    isForfait: false,
  }));

  // Add forfait valise 23kg
  tiers.push({
    min_weight: 23,
    max_weight: 23,
    coefficient: 0, // Not applicable
    price_per_kg: forfaitValise23kg,
    label: "Forfait valise 23 kg",
    description: "Prix fixe valise",
    isForfait: true,
  });

  return tiers;
}

/**
 * Calculate total price for a given weight
 */
export function calculatePrice(weight: number, config: GPPricingConfig): number {
  const TMA = Math.round(config.basePricePerKg * 1.50);

  // Forfait valise 23kg exact
  if (weight === 23) {
    return config.forfaitValise23kg;
  }

  // Sub-1kg: TMA directement (forfait fixe, pas de multiplication par le poids)
  if (weight > 0 && weight <= 1) {
    return TMA;
  }

  let rawPrice: number;

  // 23kg+ packages: coefficient x0.85 (same as 15-23kg tier)
  if (weight > 23) {
    rawPrice = Math.round(weight * config.basePricePerKg * 0.85);
  } else {
    // Find the right tier (1kg+)
    const tier = WEIGHT_TIER_COEFFICIENTS.find(
      t => weight >= t.min && weight <= t.max
    ) || WEIGHT_TIER_COEFFICIENTS[WEIGHT_TIER_COEFFICIENTS.length - 1];

    rawPrice = Math.round(weight * config.basePricePerKg * tier.coefficient);
  }

  // TMA is the absolute floor — no parcel can cost less than the minimum tariff
  return Math.max(rawPrice, TMA);
}

/**
 * Get regressive discount info for a given weight
 * Returns the coefficient and savings percentage
 */
export function getRegressiveInfo(weight: number, basePricePerKg: number): {
  coefficient: number;
  effectivePricePerKg: number;
  savingsPercent: number;
  tierLabel: string;
} {
  if (weight > 0 && weight < 1) {
    return {
      coefficient: 1.50,
      effectivePricePerKg: Math.round(basePricePerKg * 1.50),
      savingsPercent: 0,
      tierLabel: "< 1 kg (forfait)",
    };
  }
  if (weight > 23) {
    return {
      coefficient: 0.85,
      effectivePricePerKg: Math.round(basePricePerKg * 0.85),
      savingsPercent: 15,
      tierLabel: "+23 kg (gros volume)",
    };
  }
  const tier = WEIGHT_TIER_COEFFICIENTS.find(
    t => weight >= t.min && weight <= t.max
  );
  if (!tier) {
    return { coefficient: 1, effectivePricePerKg: basePricePerKg, savingsPercent: 0, tierLabel: "—" };
  }
  return {
    coefficient: tier.coefficient,
    effectivePricePerKg: Math.round(basePricePerKg * tier.coefficient),
    savingsPercent: tier.coefficient > 1 ? 0 : Math.round((1 - tier.coefficient) * 100),
    tierLabel: tier.label,
  };
}

/**
 * Format price for display
 */
export function formatTierPrice(tier: CalculatedTier, currency: string, currencySymbol: string): string {
  if (tier.isForfait) {
    return `${tier.price_per_kg.toLocaleString()} ${currencySymbol}`;
  }
  return `${tier.price_per_kg.toLocaleString()} ${currencySymbol}/kg`;
}

/**
 * Get tier for a given weight
 */
export function getTierForWeight(weight: number): typeof WEIGHT_TIER_COEFFICIENTS[number] | null {
  return WEIGHT_TIER_COEFFICIENTS.find(
    t => weight > t.min && weight <= t.max
  ) || null;
}

/**
 * Convert GP pricing config to database weight tiers format
 */
export function configToDbTiers(config: GPPricingConfig): Array<{
  min_weight: number;
  max_weight: number;
  price_per_kg: number;
  currency: string;
  is_active: boolean;
}> {
  const tiers = calculateTiers(config);
  return tiers.map(t => ({
    min_weight: t.min_weight,
    max_weight: t.max_weight,
    price_per_kg: t.price_per_kg,
    currency: config.currency,
    is_active: true,
  }));
}

/**
 * Validate GP pricing inputs
 */
export function validatePricingInputs(basePricePerKg: number, forfaitValise23kg: number): { valid: boolean; error?: string } {
  if (!basePricePerKg || basePricePerKg <= 0) {
    return { valid: false, error: "Le prix au kilo doit être supérieur à 0" };
  }
  if (!forfaitValise23kg || forfaitValise23kg <= 0) {
    return { valid: false, error: "Le forfait valise 23 kg doit être supérieur à 0" };
  }
  if (forfaitValise23kg < basePricePerKg) {
    return { valid: false, error: "Le forfait valise devrait être supérieur au prix au kilo" };
  }
  return { valid: true };
}
