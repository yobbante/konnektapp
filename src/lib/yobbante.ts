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
    const data: YobbanteGp | null =
      (payload as { data?: YobbanteGp } | null)?.data ??
      (payload as YobbanteGp | null) ??
      null;

    if (
      data &&
      !data.prenom &&
      !data.nom &&
      !data.telephone_1 &&
      !data.telephone_2
    ) {
      return null;
    }
    return data;
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
    const data: YobbanteGp | null =
      (payload as { data?: YobbanteGp } | null)?.data ??
      (payload as YobbanteGp | null) ??
      null;

    if (
      data &&
      !data.prenom &&
      !data.nom &&
      !data.telephone_1 &&
      !data.telephone_2 &&
      !data.reference
    ) {
      return null;
    }
    return data;
  } catch (e) {
    console.error("[yobbante] gp-lookup(phone) failed:", e);
    return null;
  }
}

