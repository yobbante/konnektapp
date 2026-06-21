/**
 * gpSession — Gestion de la session GP (lien magique).
 *
 * La session est stockée en localStorage sous la forme :
 *   gp_session: { ref, phone, expires } (expires = timestamp ms)
 *
 * Aucune authentification Supabase : l'accès est validé via un token unique
 * (table auth_tokens) puis matérialisé par cette session locale de 24h.
 */

export const GP_SESSION_KEY = "gp_session";
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h
export const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 min

export interface GpSession {
  ref: string;
  phone: string;
  expires: number;
}

/** Normalise une référence GP au format GPXXXX (majuscules). */
export function normalizeRef(raw: string): string {
  const s = (raw || "").trim().toUpperCase();
  if (!s) return s;
  return /^GP/.test(s) ? s : `GP${s.replace(/\D/g, "")}`;
}

/** Récupère la session GP courante si elle est valide, sinon null. */
export function getGpSession(): GpSession | null {
  try {
    const raw = localStorage.getItem(GP_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GpSession;
    if (!s?.ref || !s?.expires || s.expires <= Date.now()) {
      localStorage.removeItem(GP_SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

/** Vrai si une session valide existe pour la référence donnée. */
export function hasValidGpSession(ref: string): boolean {
  const s = getGpSession();
  if (!s) return false;
  return normalizeRef(s.ref) === normalizeRef(ref);
}

/** Crée / écrase la session GP (24h). */
export function setGpSession(ref: string, phone: string): void {
  const session: GpSession = {
    ref: normalizeRef(ref),
    phone: phone || "",
    expires: Date.now() + SESSION_DURATION_MS,
  };
  try {
    localStorage.setItem(GP_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

/** Supprime la session GP (déconnexion). */
export function clearGpSession(): void {
  try {
    localStorage.removeItem(GP_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Génère un token unique (UUID v4 + timestamp en suffixe). */
export function generateToken(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${uuid}-${Date.now()}`;
}
