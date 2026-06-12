/**
 * Yobbanté lookup — les 436 GPs vivent dans le projet Supabase Yobbanté
 * (tlvuextleczdsqxoguyq, Frankfurt). On y accède via sa propre edge function
 * publique `gp-lookup`, protégée par une clé partagée (pas d'auth Konnekt).
 *
 * La table locale `transporteurs` (projet Konnekt) ne sert qu'à stocker l'état
 * beta (wizard, tarif, navettes, notes). L'identité vient toujours de Yobbanté.
 */

const YOBBANTE_LOOKUP_URL =
  "https://tlvuextleczdsqxoguyq.supabase.co/functions/v1/gp-lookup";
const YOBBANTE_SHARED_KEY = "konnekt-yobbante-2026";

export interface YobbanteGp {
  prenom: string | null;
  nom: string | null;
  telephone_1: string | null;
  telephone_2: string | null;
  reference: string | null;
}

/**
 * Normalise la réponse de `gp-lookup`. L'edge function Yobbanté renvoie
 * `{ found, ref, prenom, nom, telephone_1, telephone_2 }` (clé `ref`, pas
 * `reference`). On supporte aussi un éventuel wrapper `{ data: {...} }`.
 */
function parseYobbanteResponse(payload: unknown): YobbanteGp | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = ((payload as { data?: unknown }).data ?? payload) as Record<
    string,
    unknown
  >;

  // Si l'API indique explicitement "non trouvé"
  if (raw.found === false) return null;

  const reference =
    (raw.reference as string | null) ?? (raw.ref as string | null) ?? null;
  const prenom = (raw.prenom as string | null) ?? null;
  const nom = (raw.nom as string | null) ?? null;
  const telephone_1 = (raw.telephone_1 as string | null) ?? null;
  const telephone_2 = (raw.telephone_2 as string | null) ?? null;

  if (!reference && !prenom && !nom && !telephone_1 && !telephone_2) {
    return null;
  }

  return { prenom, nom, telephone_1, telephone_2, reference };
}

/**
 * Cherche un GP par référence (ex: "GP4346") dans le projet Yobbanté.
 * Retourne null si introuvable ou en cas d'erreur réseau.
 */
export async function fetchYobbanteGp(refGp: string): Promise<YobbanteGp | null> {
  const normalizedRef = (refGp || "").trim().toUpperCase();
  if (!normalizedRef) return null;

  try {
    const res = await fetch(YOBBANTE_LOOKUP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-konnekt-key": YOBBANTE_SHARED_KEY,
      },
      body: JSON.stringify({ ref_gp: normalizedRef }),
    });
    if (!res.ok) {
      console.warn("[yobbante] gp-lookup HTTP", res.status, normalizedRef);
      return null;
    }
    const payload = await res.json().catch(() => null);
    return parseYobbanteResponse(payload);
  } catch (e) {
    console.error("[yobbante] gp-lookup failed:", e);
    return null;
  }
}

/**
 * Cherche un GP par numéro de téléphone (format E.164, ex: "+221771234567")
 * dans le projet Yobbanté via la même edge function `gp-lookup`.
 * Envoie le numéro sous plusieurs clés pour rester compatible avec l'API.
 * Retourne null si introuvable ou en cas d'erreur réseau.
 */
export async function fetchYobbanteGpByPhone(
  phoneE164: string
): Promise<YobbanteGp | null> {
  const phone = (phoneE164 || "").trim();
  if (!phone) return null;

  try {
    const res = await fetch(YOBBANTE_LOOKUP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-konnekt-key": YOBBANTE_SHARED_KEY,
      },
      body: JSON.stringify({ phone, telephone: phone, tel: phone }),
    });
    if (!res.ok) {
      console.warn("[yobbante] gp-lookup(phone) HTTP", res.status);
      return null;
    }
    const payload = await res.json().catch(() => null);
    return parseYobbanteResponse(payload);
  } catch (e) {
    console.error("[yobbante] gp-lookup(phone) failed:", e);
    return null;
  }
}

