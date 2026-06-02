/**
 * Détection devise et pays selon l'indicatif téléphonique.
 * Utilisé à l'inscription et à la connexion GP.
 */
import { COUNTRY_PHONE_CODES } from "./phoneCountryCodes";

export type Currency = "EUR" | "USD" | "XOF" | "GBP" | "MAD" | "DZD" | "TND";

/** Renvoie une devise raisonnable à partir d'un indicatif téléphonique (+33, +221, …). */
export function currencyFromDialCode(dial: string): Currency {
  const d = dial.startsWith("+") ? dial : `+${dial}`;
  const eur = ["+33", "+32", "+41", "+44", "+49", "+34", "+39", "+31", "+351"];
  const xof = ["+221", "+223", "+224", "+225", "+226", "+227", "+228", "+229"];
  if (eur.includes(d)) return "EUR";
  if (d === "+1") return "USD";
  if (xof.includes(d)) return "XOF";
  if (d === "+212") return "MAD";
  if (d === "+213") return "DZD";
  if (d === "+216") return "TND";
  return "XOF";
}

/** Détecte l'indicatif depuis un numéro complet (+xx...). */
export function dialCodeFromPhone(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) return null;
  // Cherche le code le plus long qui matche
  const codes = Object.values(COUNTRY_PHONE_CODES)
    .filter((c) => c !== "+")
    .sort((a, b) => b.length - a.length);
  for (const c of codes) {
    if (cleaned.startsWith(c)) return c;
  }
  return null;
}

/** Devise depuis un numéro complet. */
export function currencyFromPhone(phone: string): Currency {
  const code = dialCodeFromPhone(phone);
  return code ? currencyFromDialCode(code) : "XOF";
}

/**
 * Détecte le pays par défaut via navigator.language.
 * Règle: fr-SN / sn → SN (+221), fr-FR → FR (+33), en-US → US (+1), sinon → SN (+221).
 */
export function detectDefaultCountry(): string {
  if (typeof navigator === "undefined") return "SN";
  const lang = (navigator.language || "").toLowerCase();
  if (lang.includes("fr-sn") || lang.includes("sn")) return "SN";
  if (lang.includes("fr-fr")) return "FR";
  if (lang.includes("en-us")) return "US";
  return "SN";
}
