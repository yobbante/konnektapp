/**
 * Premium Gating — Utility to check if a GP has premium subscription
 * and define which features are premium-only.
 */

export type PremiumFeature =
  | "performances"
  | "auto_accept"
  | "priority_visibility"
  | "reduced_commission"
  | "advanced_stats";

export const PREMIUM_FEATURES: Record<PremiumFeature, { label: string; desc: string }> = {
  performances: { label: "Performances", desc: "Statistiques avancées de votre activité" },
  auto_accept: { label: "Auto-accept", desc: "Acceptation automatique des réservations" },
  priority_visibility: { label: "Visibilité prioritaire", desc: "Profil mis en avant dans les recherches" },
  reduced_commission: { label: "Commission réduite", desc: "Taux préférentiel sur chaque livraison" },
  advanced_stats: { label: "Statistiques avancées", desc: "Graphiques et KPIs détaillés" },
};

export function isGPPremium(subscription?: string): boolean {
  return subscription === "premium" || subscription === "pro";
}

export function canAccessFeature(subscription?: string, _feature?: PremiumFeature): boolean {
  return isGPPremium(subscription);
}
