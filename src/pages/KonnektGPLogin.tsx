/**
 * /konnekt/gp — Login GP simplifié (téléphone + code 4 chiffres WhatsApp)
 *
 * Prototype frontend :
 * - Le téléphone identifie le GP (table gp_profiles)
 * - Le code à 4 chiffres = 4 premiers caractères de la référence GP (id)
 * - Aucun mot de passe
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, ArrowRight, Loader2, MessageCircle, Phone, ShieldCheck, KeyRound,
  AlertTriangle, Info,
} from "lucide-react";

const KONNEKT_WA = "221781221891";
const SUPPORT_TEL = "+221 78 460 40 03";
const SUPPORT_TEL_RAW = "221784604003";

function cleanPhone(v: string) {
  const t = v.trim();
  const plus = t.startsWith("+") ? "+" : "";
  return plus + t.replace(/[^\d]/g, "");
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "pending_activation"; firstName?: string }
  | { kind: "wrong_code" }
  | { kind: "ok"; firstName?: string; gpId: string };

export default function KonnektGPLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("+221 ");
  const [code, setCode] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  /* Force light mode */
  useEffect(() => {
    document.title = "Konnekt GP — Connexion";
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (hadDark) root.classList.add("dark");
    };
  }, []);

  const submit = async () => {
    setState({ kind: "loading" });
    const cleanedPhone = phone.replace(/\D/g, "");
    const cleanedCode = code.trim().toLowerCase();

    if (cleanedPhone.length < 8 || cleanedCode.length !== 4) {
      setState({ kind: "wrong_code" });
      return;
    }

    // Lookup by phone (or whatsapp)
    const { data, error } = await supabase
      .from("gp_profiles")
      .select("id, business_name, status, phone, whatsapp")
      .or(`phone.ilike.%${cleanedPhone.slice(-8)},whatsapp.ilike.%${cleanedPhone.slice(-8)}`)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setState({ kind: "not_found" });
      return;
    }

    const gp = data as any;
    const refPart = String(gp.id || "").replace(/[^0-9a-f]/gi, "").slice(0, 4).toLowerCase();
    const codeOk = refPart && refPart === cleanedCode;

    if (gp.status && gp.status !== "active" && gp.status !== "verified") {
      const fn = (gp.business_name || "").split(/\s+/)[0];
      setState({ kind: "pending_activation", firstName: fn });
      return;
    }

    if (!codeOk) {
      setState({ kind: "wrong_code" });
      return;
    }

    const fn = (gp.business_name || "").split(/\s+/)[0];
    sessionStorage.setItem("konnekt_gp_first_login", "1");
    sessionStorage.setItem("konnekt_gp_first_name", fn || "");
    setState({ kind: "ok", firstName: fn, gpId: gp.id });
    setTimeout(() => navigate("/gp/apercu"), 600);
  };

  const isLoading = state.kind === "loading";

  return (
    <div className="min-h-screen bg-white text-[#0D1B2A] font-sans">
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
            Connectez-vous à Konnekt
          </h1>
          <p className="text-sm text-black/60 text-center mt-2">
            Réservé aux GP partenaires activés.
          </p>

          {/* Encart d'aide */}
          <div
            className="mt-6 flex items-start gap-3 rounded-xl px-4 py-3 border"
            style={{ borderColor: "rgba(61,170,138,0.25)", backgroundColor: "rgba(61,170,138,0.08)" }}
          >
            <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#3DAA8A" }} />
            <p className="text-sm leading-relaxed">
              Connectez-vous avec votre <span className="font-semibold">téléphone</span>{" "}
              et le <span className="font-semibold">code à 4 chiffres</span> reçu par WhatsApp.
            </p>
          </div>

          {/* Form */}
          <div className="mt-5 bg-white border border-black/10 rounded-2xl p-5 shadow-sm">
            <label className="block text-xs font-semibold mb-1.5">Téléphone</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(cleanPhone(e.target.value))}
                placeholder="+221 77 000 00 00"
                className="w-full bg-white border border-black/15 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:border-[#3DAA8A]"
                style={{ ["--tw-ring-color" as any]: "rgba(61,170,138,0.3)" }}
              />
            </div>

            <label className="block text-xs font-semibold mb-1.5 mt-4">Code WhatsApp (4 chiffres)</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
              <input
                inputMode="text"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s/g, "").slice(0, 4))}
                placeholder="ex. A12F"
                className="w-full bg-white border border-black/15 rounded-lg pl-9 pr-3 py-2.5 text-sm tracking-[0.4em] uppercase outline-none focus:ring-2 focus:border-[#3DAA8A]"
                style={{ ["--tw-ring-color" as any]: "rgba(61,170,138,0.3)" }}
              />
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={submit}
              className="w-full mt-5 inline-flex items-center justify-center gap-2 text-white rounded-lg py-3.5 font-semibold text-sm shadow-md disabled:opacity-60"
              style={{ backgroundColor: "#3DAA8A" }}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Me connecter
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>

            {/* States */}
            {state.kind === "ok" && (
              <div className="mt-4 text-sm rounded-lg px-3 py-2.5 border flex items-center gap-2"
                style={{ borderColor: "rgba(22,163,74,0.3)", backgroundColor: "rgba(22,163,74,0.08)", color: "#15803D" }}
              >
                <ShieldCheck className="w-4 h-4" /> Bienvenue {state.firstName || ""}, redirection…
              </div>
            )}

            {state.kind === "wrong_code" && (
              <div className="mt-4 text-sm rounded-lg px-3 py-2.5 border flex items-start gap-2"
                style={{ borderColor: "rgba(220,38,38,0.25)", backgroundColor: "rgba(220,38,38,0.06)", color: "#B91C1C" }}
              >
                <AlertTriangle className="w-4 h-4 mt-0.5" />
                <div>
                  Code à 4 chiffres incorrect. Vérifiez le code reçu par WhatsApp ou demandez-le à nouveau.
                </div>
              </div>
            )}

            {state.kind === "pending_activation" && (
              <div className="mt-4 text-sm rounded-lg px-3 py-3 border"
                style={{ borderColor: "rgba(234,179,8,0.35)", backgroundColor: "rgba(234,179,8,0.08)", color: "#92400E" }}
              >
                <div className="font-semibold mb-1">Compte en cours d'activation</div>
                <p className="leading-relaxed">
                  Votre compte est en cours d'activation. Vous recevrez vos identifiants sous 24h.
                </p>
                <p className="mt-2">
                  Questions :{" "}
                  <a href={`tel:${SUPPORT_TEL_RAW}`} className="font-semibold underline">{SUPPORT_TEL}</a>
                </p>
              </div>
            )}

            {state.kind === "not_found" && (
              <div className="mt-4 text-sm rounded-lg px-3 py-3 border"
                style={{ borderColor: "rgba(220,38,38,0.25)", backgroundColor: "rgba(220,38,38,0.06)", color: "#B91C1C" }}
              >
                <div className="font-semibold mb-1">Numéro non trouvé</div>
                <p className="leading-relaxed">
                  Inscrivez-vous d'abord sur{" "}
                  <Link to="/beta" className="font-semibold underline">usekonnekt.com</Link>
                </p>
                <p className="mt-2">
                  Ou contactez :{" "}
                  <a href={`tel:${SUPPORT_TEL_RAW}`} className="font-semibold underline">{SUPPORT_TEL}</a>
                </p>
              </div>
            )}
          </div>

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
