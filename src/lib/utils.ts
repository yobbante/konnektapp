import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency symbol helper
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    EUR: "€",
    USD: "$",
    XOF: "FCFA",
    XAF: "FCFA",
    GBP: "£",
    CAD: "CAD",
    AED: "AED",
    MAD: "MAD",
    FCFA: "FCFA",
  };
  return symbols[currency] || currency;
}
