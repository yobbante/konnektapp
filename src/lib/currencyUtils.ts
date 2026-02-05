/**
 * Currency Utilities V1.2
 * 
 * RÈGLE MÉTIER:
 * - FCFA (XOF) = monnaie de référence universelle
 * - Calcul / stockage / arbitrage (assurance, logistique) → FCFA uniquement
 * - Affichage → devise GP + (≈ FCFA) 
 * - Paiement → devise GP UNIQUEMENT (jamais FCFA)
 * - La devise du GP est imposée au client (pas de choix)
 * 
 * V1.3 RULES:
 * - Assurance: calculée/stockée en FCFA, affichée en devise GP
 * - Modification de poids: seul le prix poids change, assurance/logistique figés
 * - Panier/paiement: devise GP exclusivement
 */

import { supabase } from "@/integrations/supabase/client";
import { getCurrencySymbol } from "@/components/ui/currency-selector";

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

// Cache for exchange rates
let ratesCache: ExchangeRate[] = [];
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load exchange rates from database
 */
export async function loadExchangeRates(): Promise<ExchangeRate[]> {
  const now = Date.now();
  if (ratesCache.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
    return ratesCache;
  }

  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*");

  if (error) {
    console.error("Error loading exchange rates:", error);
    return ratesCache;
  }

  ratesCache = data || [];
  lastFetchTime = now;
  return ratesCache;
}

/**
 * Get rate for a specific currency pair
 */
export function getRate(rates: ExchangeRate[], from: string, to: string): number | null {
  if (from === to) return 1;
  
  // Direct rate
  const direct = rates.find(r => r.from_currency === from && r.to_currency === to);
  if (direct) return direct.rate;
  
  // Inverse rate
  const inverse = rates.find(r => r.from_currency === to && r.to_currency === from);
  if (inverse) return 1 / inverse.rate;
  
  // Via EUR (common base)
  const toEur = rates.find(r => r.from_currency === from && r.to_currency === "EUR");
  const fromEur = rates.find(r => r.from_currency === "EUR" && r.to_currency === to);
  if (toEur && fromEur) return toEur.rate * fromEur.rate;
  
  // Via XOF
  const toXof = rates.find(r => r.from_currency === from && r.to_currency === "XOF");
  const fromXof = rates.find(r => r.from_currency === "XOF" && r.to_currency === to);
  if (toXof && fromXof) return toXof.rate * fromXof.rate;
  
  return null;
}

/**
 * Convert amount between currencies using loaded rates
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRate[]
): number {
  if (fromCurrency === toCurrency) return amount;
  
  const rate = getRate(rates, fromCurrency, toCurrency);
  if (rate === null) {
    console.warn(`No rate found for ${fromCurrency} -> ${toCurrency}`);
    return amount;
  }
  
  return amount * rate;
}

/**
 * Convert to FCFA (XOF) - the reference currency
 * Uses a "taux majoré" (markup rate) for safety margin
 */
export function convertToFCFA(
  amount: number,
  fromCurrency: string,
  rates: ExchangeRate[],
  markupPercent: number = 2 // 2% safety margin
): number {
  if (fromCurrency === "XOF" || fromCurrency === "FCFA") return amount;
  
  const converted = convertAmount(amount, fromCurrency, "XOF", rates);
  // Apply markup
  return Math.ceil(converted * (1 + markupPercent / 100));
}

/**
 * Convert from FCFA (XOF) to another currency
 */
export function convertFromFCFA(
  amountFCFA: number,
  toCurrency: string,
  rates: ExchangeRate[]
): number {
  if (toCurrency === "XOF" || toCurrency === "FCFA") return amountFCFA;
  return convertAmount(amountFCFA, "XOF", toCurrency, rates);
}

/**
 * Format a price with dual currency display
 * RÈGLE UI: FCFA toujours affiché entre parenthèses
 * 
 * Format: "45 USD (≈ 27 900 FCFA)"
 */
export function formatDualCurrency(
  amount: number,
  currency: string,
  rates: ExchangeRate[]
): string {
  const symbol = getCurrencySymbol(currency);
  const formattedAmount = amount.toLocaleString('fr-FR');
  
  // If already FCFA, just show FCFA
  if (currency === "XOF" || currency === "FCFA") {
    return `${formattedAmount} FCFA`;
  }
  
  // Convert to FCFA for reference display
  const fcfaAmount = convertToFCFA(amount, currency, rates, 0); // No markup for display
  const formattedFCFA = fcfaAmount.toLocaleString('fr-FR');
  
  return `${formattedAmount} ${symbol} (≈ ${formattedFCFA} FCFA)`;
}

/**
 * Format price per kg with dual currency
 */
export function formatDualPricePerKg(
  pricePerKg: number,
  currency: string,
  rates: ExchangeRate[]
): string {
  const symbol = getCurrencySymbol(currency);
  
  if (currency === "XOF" || currency === "FCFA") {
    return `${pricePerKg.toLocaleString('fr-FR')} FCFA/kg`;
  }
  
  const fcfaAmount = convertToFCFA(pricePerKg, currency, rates, 0);
  
  return `${pricePerKg.toLocaleString('fr-FR')} ${symbol}/kg (≈ ${fcfaAmount.toLocaleString('fr-FR')} FCFA)`;
}

/**
 * Insurance calculation in FCFA with reconversion
 * 
 * Formule V1.2:
 * valeur_colis_fcfa = valeur_colis_devise_gp × taux_conversion_majoré
 * assurance_fcfa = MAX(assurance_min, MIN(valeur × 2%, assurance_max))
 * assurance_affichée = assurance_fcfa ÷ taux_conversion
 */
export function calculateInsuranceInFCFA(
  declaredValue: number,
  declaredCurrency: string,
  rates: ExchangeRate[],
  options: {
    minInsuranceFCFA?: number;
    maxInsuranceFCFA?: number;
    insuranceRate?: number; // Default 2%
  } = {}
): {
  valueFCFA: number;
  insuranceFCFA: number;
  insuranceInCurrency: number;
} {
  const {
    minInsuranceFCFA = 500,     // Minimum 500 FCFA
    maxInsuranceFCFA = 100000,  // Maximum 100,000 FCFA
    insuranceRate = 0.02        // 2%
  } = options;

  // Step 1: Convert declared value to FCFA with markup
  const valueFCFA = convertToFCFA(declaredValue, declaredCurrency, rates);
  
  // Step 2: Calculate insurance in FCFA
  const rawInsurance = valueFCFA * insuranceRate;
  const insuranceFCFA = Math.max(minInsuranceFCFA, Math.min(rawInsurance, maxInsuranceFCFA));
  
  // Step 3: Convert back to GP currency for display
  const insuranceInCurrency = convertFromFCFA(insuranceFCFA, declaredCurrency, rates);
  
  return {
    valueFCFA,
    insuranceFCFA: Math.ceil(insuranceFCFA),
    insuranceInCurrency: Math.ceil(insuranceInCurrency)
  };
}

/**
 * V1.3: Weight modification utilities
 * When weight changes, ONLY the weight price changes.
 * Insurance and delivery prices remain FIXED.
 */
export interface PriceBreakdown {
  weightPrice: number;      // Prix du poids (seul élément variable)
  insurancePrice: number;   // Assurance (FIXÉ, en devise GP, stocké en FCFA)
  logisticsPrice: number;   // Logistique (FIXÉ)
  flatRateTotal: number;    // Articles forfaitaires (FIXÉ)
  totalPrice: number;       // Total en devise GP
  currency: string;
}

/**
 * Recalculate price after weight modification
 * RULE: Only weight price changes, everything else is fixed
 */
export function recalculateWeightPrice(
  newWeight: number,
  pricePerKg: number,
  fixedInsurance: number,    // Already in GP currency
  fixedLogistics: number,
  fixedFlatRate: number,
  currency: string
): PriceBreakdown {
  const weightPrice = Math.round(newWeight * pricePerKg);
  
  return {
    weightPrice,
    insurancePrice: fixedInsurance,
    logisticsPrice: fixedLogistics,
    flatRateTotal: fixedFlatRate,
    totalPrice: weightPrice + fixedInsurance + fixedLogistics + fixedFlatRate,
    currency,
  };
}

/**
 * Convert insurance from FCFA (storage) to GP currency (display)
 * RULE: Insurance is ALWAYS stored in FCFA, displayed in GP currency
 */
export function insuranceFCFAtoDisplay(
  insuranceFCFA: number,
  gpCurrency: string,
  rates: ExchangeRate[]
): { displayAmount: number; fcfaAmount: number } {
  if (gpCurrency === "XOF" || gpCurrency === "FCFA") {
    return { displayAmount: insuranceFCFA, fcfaAmount: insuranceFCFA };
  }
  
  const displayAmount = convertFromFCFA(insuranceFCFA, gpCurrency, rates);
  return {
    displayAmount: Math.round(displayAmount * 100) / 100,
    fcfaAmount: insuranceFCFA,
  };
}

/**
 * Format insurance with dual display following V1.3 rules
 * Format: "7.5 USD (≈ 4 500 FCFA)"
 */
export function formatInsuranceDual(
  insuranceFCFA: number,
  gpCurrency: string,
  rates: ExchangeRate[]
): string {
  const { displayAmount, fcfaAmount } = insuranceFCFAtoDisplay(insuranceFCFA, gpCurrency, rates);
  const symbol = getCurrencySymbol(gpCurrency);
  
  if (gpCurrency === "XOF" || gpCurrency === "FCFA") {
    return `${fcfaAmount.toLocaleString('fr-FR')} FCFA`;
  }
  
  return `${displayAmount.toLocaleString('fr-FR')} ${symbol} (≈ ${fcfaAmount.toLocaleString('fr-FR')} FCFA)`;
}

/**
 * Hook-friendly currency info
 */
export interface CurrencyInfo {
  gpCurrency: string;
  gpSymbol: string;
  isFCFA: boolean;
  rates: ExchangeRate[];
  format: (amount: number) => string;
  formatDual: (amount: number) => string;
  toFCFA: (amount: number) => number;
  fromFCFA: (amount: number) => number;
}

export function createCurrencyInfo(
  gpCurrency: string,
  rates: ExchangeRate[]
): CurrencyInfo {
  const symbol = getCurrencySymbol(gpCurrency);
  const isFCFA = gpCurrency === "XOF" || gpCurrency === "FCFA";
  
  return {
    gpCurrency,
    gpSymbol: symbol,
    isFCFA,
    rates,
    format: (amount: number) => `${amount.toLocaleString('fr-FR')} ${symbol}`,
    formatDual: (amount: number) => formatDualCurrency(amount, gpCurrency, rates),
    toFCFA: (amount: number) => convertToFCFA(amount, gpCurrency, rates),
    fromFCFA: (amount: number) => convertFromFCFA(amount, gpCurrency, rates),
  };
}
