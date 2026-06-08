import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { KonnektPageLoader } from "@/components/ui/KonnektLoader";
import { GpJoinCard } from "@/components/gp/GpJoinCard";

const TEAL = "#0D9488";
const TEAL_DARK = "#0F766E";
const REF_REGEX = /^GP\d{4}$/i;
const REF_STORAGE_KEY = "gp_onboarding_ref";

export default function OnboardingGP() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const trackedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [refGp, setRefGp] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [phone, setPhone] = useState("+221");

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    const normalizedRef = (ref || "").trim().toUpperCase();
    if (!REF_REGEX.test(normalizedRef)) {
      navigate("/rejoindre-gp", { replace: true });
      return;
    }

    setRefGp(normalizedRef);
    sessionStorage.setItem(REF_STORAGE_KEY, normalizedRef);

    (async () => {
      const { data: known } = await supabase
        .from("transporteurs")
        .select("prenom, nom, telephone_1, telephone_2")
        .ilike("reference", normalizedRef)
        .maybeSingle();

      if (known) {
        if (known.prenom) setPrenom(known.prenom);
        if (known.nom) setNom(known.nom);
        const tel = known.telephone_1 || known.telephone_2;
        if (tel) setPhone(tel);

        try {
          const { data } = await supabase.functions.invoke("gp-onboarding-track", {
            body: { ref_gp: normalizedRef, event: "link_opened" },
          });
          if (data?.already_registered) {
            navigate("/gp/connexion", { replace: true });
            return;
          }
        } catch {
          /* tracking is best-effort */
        }
      }

      setLoading(false);
    })();
  }, [ref, navigate]);

  const handleRegistered = async (konnektUserId: string | null) => {
    const storedRef = sessionStorage.getItem(REF_STORAGE_KEY) || refGp;
    if (storedRef && REF_REGEX.test(storedRef)) {
      try {
        await supabase.functions.invoke("gp-onboarding-track", {
          body: { ref_gp: storedRef, event: "registered", konnekt_user_id: konnektUserId },
        });
      } catch {
        /* tracking is best-effort */
      }
    }
  };

  if (loading) return <KonnektPageLoader message="Chargement de votre invitation..." />;

  return (
    <div className="min-h-[100dvh] bg-white" style={{ fontFamily: "Inter, sans-serif", color: "#111827" }}>
      {/* HERO */}
      <section
        className="px-5 pt-12 pb-12 text-center text-white"
        style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}
      >
        <span className="block text-3xl font-extrabold tracking-tight text-white">Konnekt</span>
        <span className="inline-flex items-center rounded-full bg-white/15 border border-white/25 px-3.5 py-1.5 mt-5 text-sm font-semibold backdrop-blur">
          Invitation personnelle · {refGp}
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
        <p className="mt-3 text-white/85 text-base leading-relaxed max-w-lg mx-auto">
          Confirmez votre navette et recevez vos missions de transport de bagages directement sur WhatsApp.
        </p>
      </section>

      {/* FORM */}
      <section className="px-5 py-10 max-w-2xl mx-auto">
        <div
          className="bg-white"
          style={{ border: "1px solid #E5E7EB", borderRadius: 16, padding: 28, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
        >
          <GpJoinCard
            initialPrenom={prenom}
            initialNom={nom}
            initialPhone={phone}
            onRegistered={handleRegistered}
          />
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="px-5 py-10 text-center text-white"
        style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}
      >
        <span className="text-2xl font-extrabold text-white">Konnekt</span>
        <p className="mt-3 text-xs text-white/70">© 2026 Konnekt by Yobbanté</p>
      </footer>
    </div>
  );
}
