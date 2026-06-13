import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, User, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { KonnektLoader } from "@/components/ui/KonnektLoader";
import { fetchYobbanteGp } from "@/lib/yobbante";
import { KONNEKT_CITIES } from "@/pages/GPDirectDashboard";

const TEAL = "#0D9488";
const TEAL_DARK = "#0F766E";
const REF_REGEX = /^GP\d{3,5}$/i;


const inputCls =
  "w-full rounded-lg border border-black/15 px-3 py-2.5 text-sm outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20";
const labelCls = "block text-xs font-semibold mb-1.5 text-black/70";

type ViewState = "loading" | "invalid" | "wizard";

interface LocalGp {
  id: string;
  prenom: string | null;
  nom: string | null;
  telephone_1: string | null;
  residence_city: string | null;
  navettes: string[] | null;
  beta_notes_conditions: string | null;
}

const SELECT_COLS =
  "id, prenom, nom, telephone_1, residence_city, navettes, beta_notes_conditions";

export default function OnboardingGP() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const startedRef = useRef(false);

  const [view, setView] = useState<ViewState>("loading");
  const [gp, setGp] = useState<LocalGp | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const normalizedRef = (ref || "").trim().toUpperCase();

  // Champs du wizard
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [residence, setResidence] = useState("");
  const [villeDepart, setVilleDepart] = useState("");
  const [villeArrivee, setVilleArrivee] = useState("");
  const [disponibilites, setDisponibilites] = useState("");

  const redirectToGp = useCallback(() => {
    window.location.replace(`/gp/${normalizedRef}`);
  }, [normalizedRef]);

  // ─── Chargement initial + pré-remplissage ───
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!REF_REGEX.test(normalizedRef)) {
      setView("invalid");
      return;
    }

    (async () => {
      // 1) Fiche locale
      let { data } = await supabase
        .from("transporteurs")
        .select(SELECT_COLS)
        .ilike("reference", normalizedRef)
        .maybeSingle();

      let local = data as LocalGp | null;

      // 2) Pré-remplissage Yobbanté si fiche absente ou incomplète
      const incomplete =
        !local || !local.prenom || !local.nom || !local.telephone_1;
      let yob = null as Awaited<ReturnType<typeof fetchYobbanteGp>> | null;
      if (incomplete) {
        yob = await fetchYobbanteGp(normalizedRef);
      }

      // 3) Création de la fiche locale si absente (SANS whatsapp_confirmed_at)
      if (!local) {
        if (!yob) {
          setView("invalid");
          return;
        }
        const { data: created } = await supabase
          .from("transporteurs")
          .insert({
            reference: normalizedRef,
            prenom: yob.prenom,
            nom: yob.nom,
            telephone_1: yob.telephone_1 || yob.telephone_2,
            navettes: [],
          })
          .select(SELECT_COLS)
          .maybeSingle();
        local = created as LocalGp | null;
      }

      if (!local) {
        setView("invalid");
        return;
      }

      setGp(local);
      setPrenom(local.prenom || yob?.prenom || "");
      setNom(local.nom || yob?.nom || "");
      setTelephone(local.telephone_1 || yob?.telephone_1 || yob?.telephone_2 || "");
      setResidence(local.residence_city || "");
      setVilleDepart((local.navettes || [])[0] || "");
      setVilleArrivee((local.navettes || [])[1] || "");
      setDisponibilites(local.beta_notes_conditions || "");
      setView("wizard");
    })();
  }, [normalizedRef]);

  const saveStep1 = async () => {
    if (!gp) return;
    setSaving(true);
    await supabase
      .from("transporteurs")
      .update({
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone_1: telephone.trim() || null,
        residence_city: residence.trim() || null,
      })
      .eq("id", gp.id);
    setSaving(false);
    setStep(2);
  };

  const saveStep2 = async () => {
    if (!gp) return;
    setSaving(true);
    const navetteList = navettes
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    await supabase
      .from("transporteurs")
      .update({
        navettes: navetteList,
        beta_notes_conditions: disponibilites.trim() || null,
        beta_wizard_completed_at: new Date().toISOString(),
      })
      .eq("id", gp.id);
    setSaving(false);
    redirectToGp();
  };

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
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center bg-white px-6 text-center"
        style={{ color: "#111827" }}
      >
        <h1 className="text-xl font-bold">Lien invalide ou expiré</h1>
        <p className="mt-3 text-muted-foreground">
          Ce lien d'invitation n'est pas reconnu.
        </p>
        <a
          href="/beta"
          className="mt-6 inline-flex items-center justify-center rounded-lg px-6 py-3 font-semibold text-sm text-white"
          style={{ backgroundColor: TEAL }}
        >
          Rejoindre Konnekt
        </a>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] bg-white flex flex-col"
      style={{ fontFamily: "Inter, sans-serif", color: "#111827" }}
    >
      <section
        className="px-5 pt-10 pb-8 text-center text-white"
        style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}
      >
        <span className="block text-2xl font-extrabold tracking-tight text-white">Konnekt</span>
        <span className="inline-flex items-center rounded-full bg-white/15 border border-white/25 px-3.5 py-1.5 mt-4 text-sm font-semibold backdrop-blur">
          Invitation personnelle · {normalizedRef}
        </span>
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold leading-tight text-white">
          {prenom ? <>Bienvenue {prenom} !</> : "Activez votre compte GP"}
        </h1>
      </section>

      <main className="px-5 py-8 max-w-md mx-auto w-full flex-1">
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className="flex-1 h-1.5 rounded-full"
              style={{ backgroundColor: s <= step ? TEAL : "#E5E7EB" }}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold inline-flex items-center gap-2">
              <User className="w-5 h-5" style={{ color: TEAL }} /> Mon profil
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Prénom</label>
                <input className={inputCls} value={prenom} onChange={(e) => setPrenom(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Nom</label>
                <input className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Téléphone</label>
              <input
                className={inputCls}
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+221 ..."
              />
            </div>
            <div>
              <label className={labelCls}>Ville de résidence principale</label>
              <input
                className={inputCls}
                value={residence}
                onChange={(e) => setResidence(e.target.value)}
                placeholder="Dakar"
              />
            </div>
            <button
              onClick={saveStep1}
              disabled={saving || prenom.trim().length < 2}
              className="w-full inline-flex items-center justify-center gap-2 text-white rounded-lg py-3.5 font-semibold text-sm disabled:opacity-50"
              style={{ backgroundColor: TEAL }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continuer <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold inline-flex items-center gap-2">
              <MapPin className="w-5 h-5" style={{ color: TEAL }} /> Mes navettes
            </h2>
            <div>
              <label className={labelCls}>Villes de navette</label>
              <input
                className={inputCls}
                value={navettes}
                onChange={(e) => setNavettes(e.target.value)}
                placeholder="Dakar, Paris, Bruxelles"
              />
              <p className="text-[11px] text-black/45 mt-1">Séparez les villes par des virgules.</p>
            </div>
            <div>
              <label className={labelCls}>Disponibilités</label>
              <textarea
                rows={4}
                className={inputCls}
                value={disponibilites}
                onChange={(e) => setDisponibilites(e.target.value)}
                placeholder="Ex : départs chaque mois, week-ends, sur demande…"
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-lg py-3 font-semibold text-sm border"
                style={{ borderColor: "#E5E7EB", color: "#6B7280" }}
              >
                Retour
              </button>
              <button
                onClick={saveStep2}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-50"
                style={{ backgroundColor: TEAL }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Accéder à mon espace <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
