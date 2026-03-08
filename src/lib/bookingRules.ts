/**
 * Booking Rules — Shared constants for booking cutoffs and auto-cancellation
 * 
 * BOOKING_CUTOFF_HOURS: Client cannot book if departure is within this window.
 * Reason: GP needs time to collect, weigh, and organize parcels before flight.
 * 
 * GP_RESPONSE_DEADLINE_HOURS: GP must accept/refuse within this window.
 * After expiry → auto-cancel + trust penalty.
 */

/** Minimum hours before departure for a client to book */
export const BOOKING_CUTOFF_HOURS = 48;

/** Hours a GP has to respond to a new order */
export const GP_RESPONSE_DEADLINE_HOURS = 24;

/** Luggage presets for voyage creation */
export const LUGGAGE_PRESETS = [
  { kg: 23, label: "23 kg", sublabel: "Valise soute" },
  { kg: 15, label: "15 kg", sublabel: "Valise cabine" },
  { kg: 12, label: "12 kg", sublabel: "Bagage cabine" },
] as const;

/**
 * Check if an offer is still bookable based on departure date
 * Returns true if departure is more than BOOKING_CUTOFF_HOURS away
 */
export function isOfferBookable(departureDateStr: string): boolean {
  const departure = new Date(departureDateStr);
  const cutoff = new Date(Date.now() + BOOKING_CUTOFF_HOURS * 60 * 60 * 1000);
  return departure > cutoff;
}

/**
 * Get human-readable cutoff message
 */
export function getBookingCutoffMessage(): string {
  return `Les réservations ferment ${BOOKING_CUTOFF_HOURS}h avant le départ`;
}
