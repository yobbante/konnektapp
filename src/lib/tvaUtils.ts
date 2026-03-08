/**
 * TVA Utilities
 * 
 * RÈGLE: La TVA (18%) est INCLUSE dans la commission Konnekt.
 * Le client paie le total affiché. La TVA est extraite comptablement.
 * 
 * Formule d'extraction: TVA = Commission × 18 / 118
 * Commission HT = Commission - TVA
 */

export const TVA_RATE = 18; // 18%

/**
 * Extract TVA from a TTC amount (TVA included)
 * Formula: TVA = amount × rate / (100 + rate)
 */
export function extractTVA(commissionTTC: number, rate: number = TVA_RATE): {
  tva: number;
  ht: number;
  ttc: number;
  rate: number;
} {
  const tva = Math.round(commissionTTC * rate / (100 + rate));
  const ht = commissionTTC - tva;
  return { tva, ht, ttc: commissionTTC, rate };
}

/**
 * Format TVA for display
 */
export function formatTVALine(commissionTTC: number, currencySymbol: string): string {
  const { tva } = extractTVA(commissionTTC);
  return `dont TVA ${TVA_RATE}%: ${tva.toLocaleString('fr-FR')} ${currencySymbol}`;
}

/**
 * Fixed commission for manual parcels only (1000 FCFA).
 * Platform orders use percentage-based commission with no minimum.
 */
export const MANUAL_PARCEL_COMMISSION_FCFA = 1000;
