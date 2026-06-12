/**
 * /gp/connexion — Fallback "J'ai perdu mon lien GP"
 *
 * Le flow principal d'accès GP se fait via le lien personnalisé
 * usekonnekt.com/gp/[ref_gp]. Cette page sert UNIQUEMENT de secours :
 * le GP entre son téléphone → on retrouve sa référence dans `transporteurs`
 * → on lui affiche son lien personnel et un bouton pour le recevoir sur
 * WhatsApp depuis le 926. Aucun code, aucun mot de passe.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, ArrowRight, Loader2, MessageCircle, Info,
  AlertTriangle, LinkIcon, CheckCircle2,
} from "lucide-react";
import { PhoneCountrySelect, useDetectedCountry, buildFullPhone } from "@/components/PhoneCountrySelect";
import { fetchYobbanteGpByPhone } from "@/lib/yobbante";

const KONNEKT_WA = "221789269756";
const SUPPORT_TEL = "+221 78 926 97 56";
const SUPPORT_TEL_RAW = "221789269756";
const GP_REF_KEY = "konnekt_gp_ref";

/** Normalise un numéro vers E.164 (+221XXXXXXXXX par défaut pour le local SN). */
function normalizePhoneE164(raw: string, fallbackDial = "+221"): string {
  let s = (raw || "").replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("+")) return s;
  // numéro local sans indicatif (ex: 77XXXXXXXX ou 077XXXXXXXX)
  s = s.replace(/^0+/, "");
  return `${fallbackDial}${s}`;
}

/** Normalise une référence GP au format GPXXXX (ajoute le préfixe si absent). */
function normalizeRef(raw: string): string {
  const s = (raw || "").trim().toUpperCase();
  if (!s) return s;
  return /^GP/.test(s) ? s : `GP${s.replace(/\D/g, "")}`;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "needs_whatsapp"; firstName?: string; ref: string }
  | { kind: "ok"; firstName?: string; ref: string };

export default function KonnektGPLogin() {
  const navigate = useNavigate();
  const detectedCountry = useDetectedCountry();
  const [country, setCountry] = useState(detectedCountry);
  const [localPhone, setLocalPhone] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const fullPhone = buildFullPhone(localPhone, country);

  /* Force light mode */
  useEffect(() => {
    document.title = "Konnekt GP — Retrouver mon lien";
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (hadDark) root.classList.add("dark");
    };
  }, []);

  const submit = async () => {
    setState({ kind: "loading" });
    const e164 = normalizePhoneE164(fullPhone);
    const cleanedPhone = e164.replace(/\D/g, "");
    if (cleanedPhone.length < 8) {
      setState({ kind: "not_found" });
      return;
    }

    const tail = cleanedPhone.slice(-8);

    // 1) Recherche locale (table transporteurs = profils GP Konnekt)
    const { data, error } = await supabase
      .from("transporteurs")
      .select("reference, prenom, telephone_1, telephone_2, whatsapp_confirmed_at")
      .or(`telephone_1.ilike.%${tail},telephone_2.ilike.%${tail}`)
      .limit(1)
      .maybeSingle();

    const local = !error && data ? (data as any) : null;

    // CAS A — trouvé et activé localement → accès immédiat
    if (local?.reference && local.whatsapp_confirmed_at) {
      const ref = normalizeRef(local.reference);
      try { localStorage.setItem(GP_REF_KEY, ref); } catch { /* ignore */ }
      navigate(`/gp/${ref}`, { replace: true });
      return;
    }

    // 2) Recherche cross-projet Yobbanté (par téléphone E.164)
    const yob = await fetchYobbanteGpByPhone(e164).catch(() => null);

    const yobRef = yob?.reference
      ? normalizeRef(yob.reference)
      : local?.reference
        ? normalizeRef(local.reference)
        : null;

    // CAS B — connu dans Yobbanté (ou local non activé) → invitation WhatsApp
    if (yobRef) {
      setState({
        kind: "needs_whatsapp",
        firstName: (yob?.prenom || local?.prenom || "").split(/\s+/)[0],
        ref: yobRef,
      });
      return;
    }

    // CAS C — introuvable dans les deux bases
    setState({ kind: "not_found" });
  };

  const isLoading = state.kind === "loading";

  const waMessage =
    state.kind === "needs_whatsapp" ? `MON LIEN ${state.ref}` : "";


  return (
    <div className="min-h-screen bg-white text-[#0D1B2A] font-sans">
      <Helmet>
        <title>Konnekt GP — Retrouver mon lien</title>
        <meta name="description" content="Retrouvez votre lien d'accès GP Konnekt avec votre numéro de téléphone." />
        <link rel="canonical" href="https://usekonnekt.com/gp/connexion" />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-black/5">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-black/50" />
            <span
              className="w-7 h-7 rounded-md grid place-items-center font-bold text-sm text-white"
              style={{ backgroundColor: "#3DAA8A" }}
            >
              K
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[15px] tracking-tight">KONNEKT</span>
              <span className="text-[10px] text-black/50">Espace GP</span>
            </div>
          </Link>
          <a
            href={`https://wa.me/${KONNEKT_WA}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-white px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
            style={{ backgroundColor: "#25D366" }}
          >
            <MessageCircle className="w-3.5 h-3.5" /> Aide
          </a>
        </div>
      </header>

      <main className="px-4 py-10">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-center">
            Retrouvez votre lien GP
          </h1>
          <p className="text-sm text-black/60 text-center mt-2">
            Vous accédez normalement à votre espace via votre lien personnel.
            Vous l'avez perdu ? Entrez votre téléphone.
          </p>

          {/* Encart d'aide */}
          <div
            className="mt-6 flex items-start gap-3 rounded-xl px-4 py-3 border"
            style={{ borderColor: "rgba(61,170,138,0.25)", backgroundColor: "rgba(61,170,138,0.08)" }}
          >
            <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#3DAA8A" }} />
            <p className="text-sm leading-relaxed">
              Entrez le <span className="font-semibold">téléphone</span> utilisé lors de votre inscription.
              Nous retrouvons votre lien d'accès personnel.
            </p>
          </div>

          {/* Form */}
          {state.kind !== "ok" && (
            <div className="mt-5 bg-white border border-black/10 rounded-2xl p-5 shadow-sm">
              <label className="block text-xs font-semibold mb-1.5">Téléphone</label>
              <PhoneCountrySelect
                value={localPhone}
                country={country}
                onChange={(local, c) => {
                  setLocalPhone(local);
                  setCountry(c);
                }}
                placeholder="77 000 00 00"
              />

              <button
                type="button"
                disabled={isLoading}
                onClick={submit}
                className="w-full mt-5 inline-flex items-center justify-center gap-2 text-white rounded-lg py-3.5 font-semibold text-sm shadow-md disabled:opacity-60"
                style={{ backgroundColor: "#3DAA8A" }}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Retrouver mon lien
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>

              {state.kind === "not_found" && (
                <div className="mt-4 text-sm rounded-lg px-3 py-3 border"
                  style={{ borderColor: "rgba(220,38,38,0.25)", backgroundColor: "rgba(220,38,38,0.06)", color: "#B91C1C" }}
                >
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Numéro non trouvé
                  </div>
                  <p className="leading-relaxed">
                    Pas encore inscrit ?{" "}
                    <Link to="/beta" className="font-semibold underline">Rejoindre Konnekt</Link>
                  </p>
                  <p className="mt-2">
                    Ou contactez :{" "}
                    <a href={`tel:${SUPPORT_TEL_RAW}`} className="font-semibold underline">{SUPPORT_TEL}</a>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Success — lien retrouvé */}
          {state.kind === "ok" && (
            <div className="mt-5 bg-white border rounded-2xl p-5 shadow-sm"
              style={{ borderColor: "rgba(22,163,74,0.3)" }}>
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#15803D" }}>
                <CheckCircle2 className="w-5 h-5" /> Lien retrouvé{state.firstName ? `, ${state.firstName} !` : " !"}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg px-3 py-3 border border-black/10 bg-black/[0.02]">
                <LinkIcon className="w-4 h-4 flex-shrink-0" style={{ color: "#3DAA8A" }} />
                <span className="text-sm break-all">{personalLink}</span>
              </div>

              <a
                href={`https://wa.me/${KONNEKT_WA}?text=${encodeURIComponent(waMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-4 inline-flex items-center justify-center gap-2 text-white rounded-lg py-3.5 font-semibold text-sm shadow-md"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle className="w-4 h-4" /> Recevoir mon lien sur WhatsApp
              </a>

              <button
                type="button"
                onClick={() => navigate(`/gp/${state.ref}`)}
                className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-lg py-3 font-semibold text-sm border"
                style={{ borderColor: "rgba(61,170,138,0.4)", color: "#3DAA8A" }}
              >
                Ouvrir mon espace GP <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <p className="text-center text-xs text-black/50 mt-6">
            Pas encore inscrit ?{" "}
            <Link to="/beta" className="font-semibold" style={{ color: "#3DAA8A" }}>
              Rejoindre Konnekt
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
