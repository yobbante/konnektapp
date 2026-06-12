import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { KonnektLoader } from "@/components/ui/KonnektLoader";

const TEAL = "#0D9488";
const TEAL_DARK = "#0F766E";
const REF_REGEX = /^GP\d{3,5}$/i;
const WA_NUMBER = "221789269756";
const SUPPORT_PHONE = "+221 78 926 97 56";

type ViewState = "loading" | "invalid" | "activate" | "waiting" | "expired";

export default function OnboardingGP() {
  const { ref } = useParams<{ ref: string }>();
  const startedRef = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const expireTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [view, setView] = useState<ViewState>("loading");
  const [prenom, setPrenom] = useState<string>("");

  const normalizedRef = (ref || "").trim().toUpperCase();

  const redirectToGp = useCallback(() => {
    window.location.replace(`/gp/${normalizedRef}`);
  }, [normalizedRef]);

  const openWhatsApp = useCallback(() => {
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`KONNEKT ${normalizedRef}`)}`;
    window.open(url, "_blank", "noopener");
  }, [normalizedRef]);

  const clearTimers = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (expireTimer.current) clearTimeout(expireTimer.current);
    pollTimer.current = null;
    expireTimer.current = null;
  }, []);

  // ─── Chargement initial ───
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!REF_REGEX.test(normalizedRef)) {
      setView("invalid");
      return;
    }

    let settled = false;
    // Timeout 5s → étape activation par défaut
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setView("activate");
      }
    }, 5000);

    (async () => {
      const { data, error } = await supabase
        .from("transporteurs")
        .select("whatsapp_confirmed_at, prenom")
        .eq("reference", normalizedRef)
        .maybeSingle();

      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      if (error || !data) {
        setView("invalid");
        return;
      }

      if (data.prenom) setPrenom(data.prenom);

      if (data.whatsapp_confirmed_at) {
        redirectToGp();
        return;
      }

      setView("activate");
    })();

    return () => clearTimeout(timeout);
  }, [normalizedRef, redirectToGp]);

  // ─── Polling après clic WhatsApp ───
  const startPolling = useCallback(() => {
    openWhatsApp();
    setView("waiting");
    clearTimers();

    pollTimer.current = setInterval(async () => {
      const { data } = await supabase
        .from("transporteurs")
        .select("whatsapp_confirmed_at")
        .eq("reference", normalizedRef)
        .not("whatsapp_confirmed_at", "is", null)
        .maybeSingle();

      if (data?.whatsapp_confirmed_at) {
        clearTimers();
        redirectToGp();
      }
    }, 3000);

    // Timeout 10 minutes
    expireTimer.current = setTimeout(() => {
      clearTimers();
      setView("expired");
    }, 10 * 60 * 1000);
  }, [normalizedRef, openWhatsApp, redirectToGp, clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  // ─── RENDER ───
  if (view === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-white">
        <KonnektLoader size="lg" message="Chargement..." />
      </div>
    );
  }

  if (view === "invalid") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-white px-6 text-center" style={{ color: "#111827" }}>
        <h1 className="text-xl font-bold">Ce lien n'est pas valide.</h1>
        <p className="mt-3 text-muted-foreground">
          Contactez Konnekt au{" "}
          <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="font-semibold" style={{ color: TEAL }}>
            {SUPPORT_PHONE}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col" style={{ fontFamily: "Inter, sans-serif", color: "#111827" }}>
      <section
        className="px-5 pt-12 pb-12 text-center text-white"
        style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}
      >
        <span className="block text-3xl font-extrabold tracking-tight text-white">Konnekt</span>
        <span className="inline-flex items-center rounded-full bg-white/15 border border-white/25 px-3.5 py-1.5 mt-5 text-sm font-semibold backdrop-blur">
          Invitation personnelle · {normalizedRef}
        </span>
        <h1 className="mt-5 text-3xl sm:text-4xl font-extrabold leading-tight text-white">
          {prenom ? (
            <>
              Bienvenue <span className="font-extrabold">{prenom}</span> !
            </>
          ) : (
            "Activez votre compte GP"
          )}
        </h1>
      </section>

      <section className="px-5 py-10 max-w-md mx-auto w-full flex-1">
        {view === "activate" && (
          <div className="text-center">
            <button
              onClick={startPolling}
              className="w-full rounded-2xl px-6 py-4 text-base font-bold text-white shadow-lg active:scale-[0.98] transition-transform"
              style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}
            >
              📲 Activer mon compte sur WhatsApp →
            </button>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Envoyez le message pour activer votre compte.
              <br />
              Cette page se met à jour automatiquement.
            </p>
          </div>
        )}

        {view === "waiting" && (
          <div className="flex flex-col items-center text-center gap-4">
            <KonnektLoader size="md" />
            <p className="text-base font-medium text-muted-foreground">⏳ En attente de confirmation...</p>
          </div>
        )}

        {view === "expired" && (
          <div className="text-center">
            <p className="text-base text-muted-foreground leading-relaxed mb-5">
              Vous n'avez pas encore envoyé le message.
            </p>
            <button
              onClick={startPolling}
              className="w-full rounded-2xl px-6 py-4 text-base font-bold text-white shadow-lg active:scale-[0.98] transition-transform"
              style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}
            >
              Réessayer →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
