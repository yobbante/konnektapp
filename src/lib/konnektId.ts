/**
 * Canonical Konnekt ID — unified across the entire app.
 * Format: KKT-XXXXXXXX (8 hex chars from UUID)
 * 
 * Used in: HeaderQRBadge, ProfileHeader, ScanQRTab, ClientWallet,
 * RecipientField search, and profile pages.
 */

export function getKonnektId(uuid: string | null | undefined): string {
  if (!uuid) return "";
  return `KKT-${uuid.substring(0, 8).toUpperCase()}`;
}

/**
 * Extract the raw 8-char hex from a KKT-XXXXXXXX string
 * for prefix-based DB lookups
 */
export function parseKonnektId(input: string): string | null {
  const match = input.trim().match(/^KKT-([0-9A-Fa-f]{4,8})$/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Check if a string looks like a Konnekt ID (KKT-...)
 */
export function isKonnektId(input: string): boolean {
  return /^KKT-[0-9A-Fa-f]{4,8}$/i.test(input.trim());
}
