/**
 * GPDirectDashboard — Accès direct au tableau de bord GP via lien personnalisé
 *
 * URL : /gp/[ref_gp]  (ex: /gp/GP4346)
 * Vérifie que ref_gp existe dans la table `transporteurs` puis affiche
 * un tableau de bord léger (sans code ni mot de passe), alimenté par la
 * fiche transporteur (nom, navettes, référence, téléphone).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, Loader2, MessageCircle, MapPin, Plane, Package,
  Calendar, AlertTriangle, ShieldCheck,
} from "lucide-react";

const KONNEKT_WA = "221789269756";
const SUPPORT_TEL = "+221 78 926 97 56";

interface Transporteur {
  reference: string;
  prenom: string | null;
  nom: string | null;
  telephone_1: string | null;
  navettes: string[] | null;
  whatsapp_confirmed_at: string | null;
}

type State =
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "ok"; gp: Transporteur };

export default function GPDirectDashboard({ refGp }: { refGp: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  /* Force light mode (espace GP) */
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (hadDark) root.classList.add("dark");
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setState({ kind: "loading" });
      const { data, error } = await supabase
        .from("transporteurs")
        .select("reference, prenom, nom, telephone_1, navettes, whatsapp_confirmed_at")
        .ilike("reference", refGp)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setState({ kind: "not_found" });
        return;
      }
      setState({ kind: "ok", gp: data as Transporteur });
    })();
    return () => {
      active = false;
    };
  }, [refGp]);

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#3DAA8A" }} />
      </div>
    );
  }

  if (state.kind === "not_found") {
    return (
      <div className="min-h-screen bg-white text-[#0D1B2A] font-sans grid place-items-center px-4">
        <Helmet>
          <title>Konnekt GP — Lien introuvable</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-12 h-12 rounded-full grid place-items-center mb-4"
            style={{ backgroundColor: "rgba(220,38,38,0.08)" }}>
            <AlertTriangle className="w-6 h-6" style={{ color: "#B91C1C" }} />
          </div>
          <h1 className="text-xl font-bold">Lien introuvable</h1>
          <p className="text-sm text-black/60 mt-2">
            Ce lien GP <span className="font-semibold">{refGp}</span> n'existe pas ou n'est plus valide.
          </p>
          <Link
            to="/gp/connexion"
            className="mt-6 inline-flex items-center justify-center gap-2 text-white rounded-lg px-5 py-3 font-semibold text-sm"
            style={{ backgroundColor: "#3DAA8A" }}
          >
            Retrouver mon lien <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const gp = state.gp;
  const firstName = gp.prenom?.trim() || "";
  const fullName = [gp.prenom, gp.nom].filter(Boolean).join(" ").trim() || "GP Konnekt";
  const navettes = gp.navettes || [];

  return (
    <div className="min-h-screen bg-white text-[#0D1B2A] font-sans">
      <Helmet>
        <title>Konnekt GP — Mon espace</title>
        <meta name="description" content="Tableau de bord GP Konnekt." />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-black/5">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2">
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

      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Welcome */}
        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#3DAA8A" }}>
          <ShieldCheck className="w-4 h-4" /> {gp.reference}
        </div>
        <h1 className="text-2xl font-bold tracking-tight mt-1">
          Bonjour {firstName || fullName} 👋
        </h1>
        <p className="text-sm text-black/60 mt-1">
          Bienvenue dans votre espace GP Konnekt.
        </p>

        {/* Navettes */}
        <div className="mt-5 bg-white border border-black/10 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Plane className="w-4 h-4" style={{ color: "#3DAA8A" }} /> Mes navettes
          </div>
          {navettes.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {navettes.map((n, i) => (
                <li key={i} className="flex items-center gap-2 text-sm rounded-lg px-3 py-2.5"
                  style={{ backgroundColor: "rgba(61,170,138,0.06)" }}>
                  <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "#3DAA8A" }} />
                  {n}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/50 mt-3">Aucune navette enregistrée.</p>
          )}
        </div>

        {/* Quick actions */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={`https://wa.me/${KONNEKT_WA}?text=${encodeURIComponent("DEP ")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-black/10 p-4 shadow-sm flex flex-col gap-2"
          >
            <Calendar className="w-5 h-5" style={{ color: "#3DAA8A" }} />
            <span className="text-sm font-semibold">Déclarer un départ</span>
            <span className="text-[11px] text-black/50">via WhatsApp</span>
          </a>
          <a
            href={`https://wa.me/${KONNEKT_WA}?text=${encodeURIComponent("MES MISSIONS")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-black/10 p-4 shadow-sm flex flex-col gap-2"
          >
            <Package className="w-5 h-5" style={{ color: "#3DAA8A" }} />
            <span className="text-sm font-semibold">Mes missions</span>
            <span className="text-[11px] text-black/50">via WhatsApp</span>
          </a>
        </div>

        {/* Contact */}
        <p className="text-center text-xs text-black/50 mt-6">
          Une question ? Contactez-nous au{" "}
          <a href={`tel:${KONNEKT_WA}`} className="font-semibold" style={{ color: "#3DAA8A" }}>
            {SUPPORT_TEL}
          </a>
        </p>
      </main>
    </div>
  );
}
