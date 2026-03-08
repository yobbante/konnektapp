/**
 * Size badge utility for weight-based categorization (Cocolis-style)
 */

export type SizeCategory = "S" | "M" | "L" | "XL" | "XXL";

interface SizeBadgeInfo {
  label: SizeCategory;
  color: string;
  bg: string;
  description: string;
}

export function getSizeFromWeight(weightKg: number): SizeBadgeInfo {
  if (weightKg <= 50) return { label: "S", color: "text-emerald-700", bg: "bg-emerald-100 dark:bg-emerald-900/30", description: "< 50 kg" };
  if (weightKg <= 200) return { label: "M", color: "text-blue-700", bg: "bg-blue-100 dark:bg-blue-900/30", description: "50-200 kg" };
  if (weightKg <= 1000) return { label: "L", color: "text-amber-700", bg: "bg-amber-100 dark:bg-amber-900/30", description: "200 kg - 1T" };
  if (weightKg <= 5000) return { label: "XL", color: "text-orange-700", bg: "bg-orange-100 dark:bg-orange-900/30", description: "1-5 T" };
  return { label: "XXL", color: "text-red-700", bg: "bg-red-100 dark:bg-red-900/30", description: "> 5 T" };
}

export function formatWeightShort(weightKg: number): string {
  if (weightKg >= 1000) return `${(weightKg / 1000).toFixed(1).replace(".0", "")} T`;
  return `${Math.round(weightKg)} kg`;
}

export const freightTypeLabels: Record<string, { label: string; emoji: string }> = {
  colis: { label: "Colis", emoji: "📦" },
  palettes: { label: "Palettes", emoji: "🪵" },
  alimentaire: { label: "Alimentaire", emoji: "🍎" },
  frigorifie: { label: "Frigorifié", emoji: "❄️" },
  liquides: { label: "Liquides", emoji: "🛢️" },
  materiaux: { label: "Matériaux", emoji: "🪨" },
  btp: { label: "BTP", emoji: "🏗️" },
  vehicules: { label: "Véhicules", emoji: "🚗" },
};
