/**
 * /gp/connexion — Connexion GP sécurisée (lien magique + WhatsApp).
 *
 * Le GP entre son téléphone → on le retrouve dans `transporteurs`.
 *  - CAS A (trouvé) : génération d'un token unique stocké dans auth_tokens,
 *    puis 2 options : lien magique (copier) ou code par WhatsApp.
 *  - CAS B (introuvable) : invitation à rejoindre Konnekt.
 *
 * Aucun mot de passe. Token valable 15 minutes.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, ArrowRight, Loader2, MessageCircle, Info,
  AlertTriangle, CheckCircle2, Copy, Check, Link2, Zap,
} from "lucide-react";
import { PhoneCountrySelect } from "@/components/PhoneCountrySelect";
import { generateToken, normalizeRef, TOKEN_TTL_MS } from "@/lib/gpSession";

const KONNEKT_WA = "221789269756";
const SUPPORT_TEL = "+221 78 926 97 56";
const SUPPORT_TEL_RAW = "221789269756";

/** Normalise un numéro vers E.164 (+221XXXXXXXXX par défaut pour le local SN). */
function normalizePhoneE164(raw: string, fallbackDial = "+221"): string {
  let s = (raw || "").replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("+")) return s;
  s = s.replace(/^0+/, "");
  return `${fallbackDial}${s}`;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "found"; firstName?: string; ref: string; token: string };

export default function KonnektGPLogin() {
  const [country, setCountry] = useState("SN"); // +221 Sénégal par défaut
  const [localPhone, setLocalPhone] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  const dial = country === "SN" ? "+221" : undefined;

  /* Force light mode */
  useEffect(() => {
    document.title = "Konnekt GP — Connexion";
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => { if (hadDark) root.classList.add("dark"); };
  }, []);

  const submit = async () => {
    setState({ kind: "loading" });
    const e164 = normalizePhoneE164(localPhone ? `${dial || "+221"}${localPhone}` : "");
    const cleanedPhone = e164.replace(/\D/g, "");
    if (cleanedPhone.length < 8) {
      setState({ kind: "not_found" });
      return;
    }

    const tail = cleanedPhone.slice(-8);

    // Recherche dans transporteurs (numéro normalisé E.164)
    const { data, error } = await supabase
      .from("transporteurs")
      .select("reference, prenom, telephone_1, telephone_2")
      .or(`telephone_1.ilike.%${tail},telephone_2.ilike.%${tail}`)
      .limit(1)
      .maybeSingle();

    const local = !error && data ? (data as any) : null;

    if (!local?.reference) {
      setState({ kind: "not_found" });
      return;
    }

    const ref = normalizeRef(local.reference);

    // CAS A — génération du token (15 min) + stockage
    const token = generateToken();
    const { error: insErr } = await supabase.from("auth_tokens").insert({
      token,
      phone: e164,
      ref_gp: ref,
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      used: false,
    });

    if (insErr) {
      setState({ kind: "not_found" });
      return;
    }

    setState({
      kind: "found",
      firstName: (local.prenom || "").split(/\s+/)[0],
      ref,
      token,
    });
  };

  const isLoading = state.kind === "loading";

  const magicLink =
    state.kind === "found"
      ? `${typeof window !== "undefined" ? window.location.origin : "https://usekonnekt.com"}/gp/auth?token=${state.token}`
      : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(magicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-white text-[#0D1B2A] font-sans">
      <Helmet>
        <title>Konnekt GP — Connexion</title>
        <meta name="description" content="Connectez-vous à votre espace GP Konnekt avec votre numéro de téléphone." />
        <link rel="canonical" href="https://usekonnekt.com/gp/connexion" />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-black/5">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-black/50" />
            <span className="w-7 h-7 rounded-md grid place-items-center font-bold text-sm text-white" style={{ backgroundColor: "#3DAA8A" }}>K</span>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[15px] tracking-tight">KONNEKT</span>
              <span className="text-[10px] text-black/50">Espace GP</span>
            </div>
          </Link>
          <a href={`https://wa.me/${KONNEKT_WA}`} target="_blank" rel="noopener noreferrer"
            className="text-[11px] font-semibold text-white px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
            style={{ backgroundColor: "#25D366" }}>
            <MessageCircle className="w-3.5 h-3.5" /> Aide
          </a>
        </div>
      </header>

      <main className="px-4 py-10">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-center">
            Connexion GP
          </h1>
          <p className="text-sm text-black/60 text-center mt-2">
            Entrez le téléphone utilisé lors de votre inscription pour accéder
            à votre espace en toute sécurité.
          </p>

          {/* Form */}
          {state.kind !== "found" && (
            <div className="mt-6 bg-white border border-black/10 rounded-2xl p-5 shadow-sm">
              <label className="block text-xs font-semibold mb-1.5">Téléphone</label>
              <PhoneCountrySelect
                value={localPhone}
                country={country}
                onChange={(local, c) => { setLocalPhone(local); setCountry(c); }}
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
                Se connecter
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>

              {state.kind === "not_found" && (
                <div className="mt-4 text-sm rounded-lg px-3 py-3 border"
                  style={{ borderColor: "rgba(220,38,38,0.25)", backgroundColor: "rgba(220,38,38,0.06)", color: "#B91C1C" }}>
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Numéro non reconnu
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

          {/* CAS A — trouvé : 2 options */}
          {state.kind === "found" && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-base font-bold justify-center" style={{ color: "#15803D" }}>
                <CheckCircle2 className="w-5 h-5" />
                Bonjour{state.firstName ? ` ${state.firstName}` : ""}, vous êtes reconnu ✓
              </div>

              {/* OPTION 1 — Lien magique */}
              <div className="bg-white border rounded-2xl p-5 shadow-sm" style={{ borderColor: "rgba(61,170,138,0.35)" }}>
                <div className="flex items-center gap-2 text-base font-bold" style={{ color: "#0D7A5F" }}>
                  <Zap className="w-5 h-5" /> Accès instantané
                </div>
                <button
                  type="button"
                  onClick={copyLink}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 text-white rounded-lg py-3.5 font-semibold text-sm shadow-md"
                  style={{ backgroundColor: "#3DAA8A" }}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Lien copié !" : "Copier mon lien d'accès"}
                </button>
                <div className="mt-3 flex items-center gap-2 text-[12px] text-black/45 break-all rounded-lg bg-black/[0.03] px-3 py-2">
                  <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{magicLink}</span>
                </div>
                <p className="text-xs text-black/55 mt-2.5 leading-relaxed">
                  Ouvrez ce lien depuis n'importe quel appareil. Valable 15 minutes.
                </p>
              </div>

              {/* OPTION 2 — WhatsApp */}
              <div className="bg-white border rounded-2xl p-5 shadow-sm" style={{ borderColor: "rgba(37,211,102,0.35)" }}>
                <div className="flex items-center gap-2 text-base font-bold" style={{ color: "#15803D" }}>
                  <MessageCircle className="w-5 h-5" /> Recevoir un code par WhatsApp
                </div>
                <a
                  href={`https://wa.me/${KONNEKT_WA}?text=${encodeURIComponent(`CODE ${state.ref}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 text-white rounded-lg py-3.5 font-semibold text-sm shadow-md"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <MessageCircle className="w-4 h-4" /> Envoyer CODE {state.ref}
                </a>
                <p className="text-xs text-black/55 mt-2.5 leading-relaxed">
                  Uniquement si vous avez déjà échangé avec Konnekt sur WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setState({ kind: "idle" })}
                className="w-full text-center text-[13px] font-medium text-black/50 underline"
              >
                Utiliser un autre numéro
              </button>
            </div>
          )}

          {/* Encart d'aide */}
          {state.kind !== "found" && (
            <div className="mt-6 flex items-start gap-3 rounded-xl px-4 py-3 border"
              style={{ borderColor: "rgba(61,170,138,0.25)", backgroundColor: "rgba(61,170,138,0.08)" }}>
              <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#3DAA8A" }} />
              <p className="text-sm leading-relaxed">
                Votre accès se fait sans mot de passe : nous vous envoyons un
                lien sécurisé valable 15 minutes.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
