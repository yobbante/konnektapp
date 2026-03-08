/**
 * Booking Rules — Shared constants for booking cutoffs and auto-cancellation
 * 
 * BOOKING_CUTOFF_HOURS: Client cannot book if departure is within this window.
 * Reason: GP needs time to collect, weigh, and organize parcels before flight.
 * 
 * GP_RESPONSE_DEADLINE_HOURS: GP must accept/refuse within this window.
 * After expiry → auto-cancel + trust penalty.
 * 
 * CUTOFF BY SUBSCRIPTION:
 *   - Standard (free): 24h before departure
 *   - Premium: 12h before departure
 *   - Pro: 4h before departure
 */

/** Default minimum hours before departure for a standard client to book */
export const BOOKING_CUTOFF_HOURS = 24;

/** Premium GP: clients can book up to 12h before departure */
export const PREMIUM_CUTOFF_HOURS = 12;

/** Pro GP: clients can book up to 4h before departure */
export const PRO_CUTOFF_HOURS = 4;

/** Hours a GP has to respond to a new order */
export const GP_RESPONSE_DEADLINE_HOURS = 24;

/** Luggage presets for voyage creation */
export const LUGGAGE_PRESETS = [
  { kg: 23, label: "23 kg", sublabel: "Valise soute" },
  { kg: 15, label: "15 kg", sublabel: "Valise cabine" },
  { kg: 12, label: "12 kg", sublabel: "Bagage cabine" },
] as const;

/**
 * Get the cutoff hours based on GP subscription tier
 */
export function getCutoffBySubscription(subscription?: string): number {
  if (subscription === "pro") return PRO_CUTOFF_HOURS;
  if (subscription === "premium") return PREMIUM_CUTOFF_HOURS;
  return BOOKING_CUTOFF_HOURS;
}

/**
 * Check if an offer is still bookable based on departure date and GP subscription
 * Returns true if departure is more than cutoff hours away
 */
export function isOfferBookable(departureDateStr: string, subscription?: string): boolean {
  const departure = new Date(departureDateStr);
  const cutoffHours = getCutoffBySubscription(subscription);
  const cutoff = new Date(Date.now() + cutoffHours * 60 * 60 * 1000);
  return departure > cutoff;
}

/**
 * Get human-readable cutoff message based on subscription
 */
export function getBookingCutoffMessage(subscription?: string): string {
  const hours = getCutoffBySubscription(subscription);
  return `Les réservations ferment ${hours}h avant le départ`;
}

/**
 * Get the cutoff advantage label for a subscription tier
 */
export function getCutoffAdvantageLabel(subscription?: string): string | null {
  if (subscription === "pro") return "Réservations jusqu'à 4h avant le départ";
  if (subscription === "premium") return "Réservations jusqu'à 12h avant le départ";
  return null;
}
