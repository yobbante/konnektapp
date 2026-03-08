/**
 * Premium Gating — Utility to check if a GP has premium subscription
 * and define which features are premium-only.
 */

export type PremiumFeature =
  | "performances"
  | "auto_accept"
  | "priority_visibility"
  | "reduced_commission"
  | "advanced_stats"
  | "extended_booking_window"
  | "departure_time";

export const PREMIUM_FEATURES: Record<PremiumFeature, { label: string; desc: string }> = {
  extended_booking_window: { label: "Fenêtre de réservation étendue", desc: "Vos clients peuvent réserver jusqu'à 12h avant le départ (vs 24h standard)" },
  departure_time: { label: "Heure de départ précise", desc: "Publiez l'heure exacte de départ pour vos clients" },
  performances: { label: "Performances", desc: "Statistiques avancées de votre activité" },
  auto_accept: { label: "Auto-accept", desc: "Acceptation automatique des réservations" },
  priority_visibility: { label: "Visibilité prioritaire", desc: "Profil mis en avant dans les recherches" },
  reduced_commission: { label: "Commission réduite", desc: "Taux préférentiel sur chaque livraison" },
  advanced_stats: { label: "Statistiques avancées", desc: "Graphiques et KPIs détaillés" },
};

export const PRO_EXTRA_FEATURES: Record<string, { label: string; desc: string }> = {
  extended_booking_pro: { label: "Réservation ultra-tardive", desc: "Vos clients peuvent réserver jusqu'à 4h avant le départ" },
  boost_visibility: { label: "Visibilité maximale", desc: "Boost automatique de vos trajets dans les résultats" },
  priority_support: { label: "Support prioritaire", desc: "Assistance dédiée et temps de réponse réduit" },
};

export function isGPPremium(subscription?: string): boolean {
  return subscription === "premium" || subscription === "pro";
}

export function getPremiumCommissionDiscount(subscription?: string): number {
  if (subscription === "pro") return 0.60;
  if (subscription === "premium") return 0.80;
  return 1.00;
}

export function canAccessFeature(subscription?: string, _feature?: PremiumFeature): boolean {
  return isGPPremium(subscription);
}
