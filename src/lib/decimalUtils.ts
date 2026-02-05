/**
 * Normalise une entrée numérique (gère virgule et point comme séparateur décimal)
 * @param input Valeur saisie par l'utilisateur
 * @returns Nombre normalisé avec max 2 décimales
 */
export function normalizeDecimalInput(input: string): string {
  // Remplacer la virgule par un point
  let normalized = input.replace(',', '.');
  
  // Ne garder que les chiffres, le point et le signe négatif
  normalized = normalized.replace(/[^\d.-]/g, '');
  
  // Empêcher plusieurs points
  const parts = normalized.split('.');
  if (parts.length > 2) {
    normalized = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limiter à 2 décimales
  if (parts.length === 2 && parts[1].length > 2) {
    normalized = parts[0] + '.' + parts[1].substring(0, 2);
  }
  
  return normalized;
}

/**
 * Parse une valeur décimale flexible (accepte , ou .)
 * @param input Valeur à parser
 * @returns Nombre parsé ou 0 si invalide
 */
export function parseDecimalInput(input: string): number {
  if (!input || input === '-' || input === '.') return 0;
  const normalized = normalizeDecimalInput(input);
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formate un nombre avec 2 décimales pour l'affichage
 * @param value Nombre à formater
 * @param forceDecimals Toujours afficher les décimales même si .00
 * @returns Chaîne formatée
 */
export function formatDecimalDisplay(value: number, forceDecimals: boolean = false): string {
  if (!forceDecimals && Number.isInteger(value)) {
    return value.toLocaleString('fr-FR');
  }
  return value.toLocaleString('fr-FR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

/**
 * Arrondit à 2 décimales pour les calculs
 */
export function roundTo2Decimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Arrondit à l'entier pour la base de données (si nécessaire)
 */
export function roundForDatabase(value: number): number {
  return Math.round(value);
}
