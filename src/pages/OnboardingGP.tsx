import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { KonnektLogo } from "@/components/ui/KonnektLogo";
import { KonnektPageLoader } from "@/components/ui/KonnektLoader";
import { MessageCircle, CheckCircle2, Phone, User, MapPin } from "lucide-react";

const TEAL = "hsl(168 60% 42%)";
const TEAL_DARK = "hsl(168 55% 22%)";

interface GPData {
  prenom: string;
  nom: string;
  telephone_1: string | null;
  navettes: string[] | null;
  reference: string;
}

export default function OnboardingGP() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gp, setGp] = useState<GPData | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!ref) {
        navigate("/rejoindre-gp", { replace: true });
        return;
      }
      const { data, error } = await supabase
        .from("transporteurs")
        .select("prenom, nom, telephone_1, navettes, reference")
        .ilike("reference", ref)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        navigate("/rejoindre-gp", { replace: true });
        return;
      }
      setGp(data as GPData);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [ref, navigate]);

  if (loading || !gp) return <KonnektPageLoader message="Chargement de votre invitation..." />;

  const navettes = gp.navettes ?? [];
  const fullName = `${gp.prenom} ${gp.nom}`.trim();
  const waText = encodeURIComponent(
    `Bonjour Konnekt, je suis ${fullName} (réf ${gp.reference}), partenaire Yobbanté. Je souhaite activer mon compte Konnekt.`
  );
  const waLink = `https://wa.me/221789269756?text=${waText}`;

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans">
      {/* HERO */}
      <section
        className="relative px-6 pt-10 pb-16 text-white"
        style={{ background: `linear-gradient(160deg, ${TEAL_DARK}, ${TEAL})` }}
      >
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <KonnektLogo size={32} className="brightness-0 invert" />
            <span className="text-xl font-extrabold tracking-tight">Konnekt</span>
          </div>
        </div>

        <div className="max-w-md mx-auto text-center">
          <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            Invitation personnelle 🎯
          </span>

          <h1
            className="mt-6 font-black leading-tight"
            style={{ fontSize: "clamp(40px, 11vw, 52px)" }}
          >
            Bonjour {gp.prenom} !
          </h1>

          <p className="mt-4 text-[18px] leading-relaxed text-white/80">
            Yobbanté vous invite à rejoindre le réseau Konnekt et recevoir vos
            missions directement sur WhatsApp.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            {["📱 Missions WhatsApp", "📍 Suivi temps réel", "💸 Paiements rapides"].map(
              (p) => (
                <span
                  key={p}
                  className="rounded-full bg-white/12 px-3.5 py-1.5 text-sm font-medium backdrop-blur-sm"
                >
                  {p}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* CARDS */}
      <main className="max-w-md mx-auto px-5 -mt-8 pb-16 space-y-5">
        {/* CARD PROFIL */}
        <div
          className="rounded-2xl bg-white p-6"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
        >
          <h2 className="text-lg font-bold text-[#0D1B2A]">Votre profil Yobbanté</h2>

          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#F0FAF8]">
                <User className="h-4 w-4" style={{ color: TEAL }} />
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Nom</p>
                <p className="font-semibold text-[#0D1B2A]">{fullName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#F0FAF8]">
                <Phone className="h-4 w-4" style={{ color: TEAL }} />
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Téléphone</p>
                <p className="font-semibold text-[#0D1B2A]">
                  {gp.telephone_1 || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#F0FAF8]">
                <MapPin className="h-4 w-4" style={{ color: TEAL }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#6B7280]">Destinations</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {navettes.length > 0 ? (
                    navettes.map((n) => (
                      <span
                        key={n}
                        className="rounded-full px-3 py-1 text-xs font-medium"
                        style={{ backgroundColor: "#F0FAF8", color: TEAL }}
                      >
                        {n}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[#6B7280]">À définir</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Profil vérifié
          </div>
        </div>

        {/* CARD ACTION */}
        <div
          className="rounded-2xl bg-white p-6"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
        >
          <h2 className="text-lg font-bold text-[#0D1B2A]">Dernière étape</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
            Confirmez votre inscription en nous contactant sur WhatsApp. Votre
            compte sera activé immédiatement.
          </p>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold text-white transition-transform active:scale-[0.98]"
            style={{ backgroundColor: "#25D366" }}
          >
            <MessageCircle className="h-5 w-5" />
            Rejoindre Konnekt sur WhatsApp →
          </a>

          <p className="mt-3 text-center text-xs text-[#6B7280]">
            🔒 Gratuit · Votre compte est déjà créé. Ce bouton l'active simplement.
          </p>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="pb-24 text-center text-xs text-[#6B7280]">
        © 2026 Konnekt by Yobbanté
      </footer>

      {/* Floating WhatsApp */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Rejoindre sur WhatsApp"
        className="fixed bottom-6 right-6 grid h-14 w-14 place-items-center rounded-full text-white transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: "#25D366", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 9999 }}
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </div>
  );
}
