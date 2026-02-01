/**
 * Hook for currency conversion V1.2
 * 
 * La devise est imposée par le GP sélectionné.
 * Le client ne peut ni la modifier, ni en choisir une autre.
 * FCFA (XOF) = monnaie de référence universelle.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  loadExchangeRates, 
  type ExchangeRate,
  formatDualCurrency,
  formatDualPricePerKg,
  convertToFCFA,
  convertFromFCFA,
  createCurrencyInfo,
  type CurrencyInfo
} from "@/lib/currencyUtils";

interface UseCurrencyConversionProps {
  gpCurrency: string; // The GP's chosen currency - IMMUTABLE for the client
}

export function useCurrencyConversion({ gpCurrency }: UseCurrencyConversionProps) {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExchangeRates()
      .then(setRates)
      .finally(() => setLoading(false));
  }, []);

  /**
   * Format amount with dual display: GP currency + FCFA equivalent
   * Ex: "45 USD (≈ 27 900 FCFA)"
   */
  const formatDual = useCallback((amount: number): string => {
    return formatDualCurrency(amount, gpCurrency, rates);
  }, [gpCurrency, rates]);

  /**
   * Format price per kg with dual display
   */
  const formatPricePerKgDual = useCallback((pricePerKg: number): string => {
    return formatDualPricePerKg(pricePerKg, gpCurrency, rates);
  }, [gpCurrency, rates]);

  /**
   * Convert from GP currency to FCFA (with markup for calculations)
   */
  const toFCFA = useCallback((amount: number, markupPercent: number = 2): number => {
    return convertToFCFA(amount, gpCurrency, rates, markupPercent);
  }, [gpCurrency, rates]);

  /**
   * Convert from FCFA to GP currency (for display)
   */
  const fromFCFA = useCallback((amountFCFA: number): number => {
    return convertFromFCFA(amountFCFA, gpCurrency, rates);
  }, [gpCurrency, rates]);

  /**
   * Get FCFA equivalent for an amount (no markup, for info display)
   */
  const getFCFAEquivalent = useCallback((amount: number): number => {
    return convertToFCFA(amount, gpCurrency, rates, 0);
  }, [gpCurrency, rates]);

  /**
   * Currency info object with all utilities
   */
  const currencyInfo = useMemo((): CurrencyInfo => {
    return createCurrencyInfo(gpCurrency, rates);
  }, [gpCurrency, rates]);

  /**
   * Check if GP uses FCFA directly
   */
  const isFCFA = gpCurrency === "XOF" || gpCurrency === "FCFA";

  return {
    // State
    loading,
    rates,
    gpCurrency,
    isFCFA,
    
    // Format functions
    formatDual,
    formatPricePerKgDual,
    
    // Conversion functions
    toFCFA,
    fromFCFA,
    getFCFAEquivalent,
    
    // Full currency info
    currencyInfo,
  };
}
