import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Plane,
  Package,
  Layers,
  Loader2,
  Lock,
  CheckCircle2,
  Search,
  X,
} from "lucide-react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PHONE_COUNTRIES } from "@/components/ui/PhoneInputWithCode";
import { KonnektPageLoader } from "@/components/ui/KonnektLoader";
import { toast } from "@/hooks/use-toast";
import { WORLD_CITIES } from "@/lib/worldCities";

const TEAL = "#0D9488";
const TEAL_DARK = "#0F766E";
const REF_REGEX = /^GP\d{4}$/i;
const REF_STORAGE_KEY = "gp_onboarding_ref";

const WHATSAPP_LINK =
  "https://wa.me/221789269756?text=Bonjour%20Konnekt%2C%20je%20viens%20de%20m%27inscrire%20sur%20la%20plateforme.%20Je%20suis%20pr%C3%AAt%20%C3%A0%20rejoindre%20le%20r%C3%A9seau%20et%20recevoir%20mes%20missions.";

const MODES = [
  { id: "Bagage soute", label: "Bagage soute", icon: Plane },
  { id: "Fret", label: "Fret", icon: Package },
  { id: "Les deux", label: "Les deux", icon: Layers },
];

const inputStyle: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1.5px solid #D1D5DB",
  borderRadius: 10,
  height: 48,
  color: "#111827",
  fontSize: 15,
};

/** Self-contained phone input with light styling (white field, teal focus). */
function StyledPhoneInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const findCountry = () => {
    const m = PHONE_COUNTRIES.find((c) => value.startsWith(c.dial));
    return m?.code ?? "SN";
  };
  const [selectedCode, setSelectedCode] = useState(findCountry);
  const [open, setOpen] = useState(false);
  const country = PHONE_COUNTRIES.find((c) => c.code === selectedCode) || PHONE_COUNTRIES[0];
  const local = value.startsWith(country.dial) ? value.slice(country.dial.length).trim() : "";

  return (
    <div className="relative flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 shrink-0"
        style={{
          backgroundColor: "#F9FAFB",
          border: "1.5px solid #D1D5DB",
          borderRight: "none",
          borderTopLeftRadius: 10,
          borderBottomLeftRadius: 10,
          color: "#111827",
          height: 48,
        }}
      >
        <span className="text-base">{country.flag}</span>
        <span className="text-xs font-medium" style={{ color: "#374151" }}>{country.dial}</span>
        <ChevronDown className="w-3 h-3" style={{ color: "#9CA3AF" }} />
      </button>
      <input
        type="tel"
        placeholder="77 123 45 67"
        value={local}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9\s]/g, "");
          onChange(`${country.dial}${raw}`);
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
        className="flex-1 px-3 outline-none"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1.5px solid #D1D5DB",
          borderTopRightRadius: 10,
          borderBottomRightRadius: 10,
          color: "#111827",
          fontSize: 15,
          height: 48,
        }}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-1 z-50 w-64 max-h-60 overflow-auto bg-white"
            style={{ border: "1px solid #E5E7EB", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
          >
            {PHONE_COUNTRIES.map((c) => (
              <button
                key={`${c.code}-${c.dial}`}
                type="button"
                onClick={() => {
                  onChange(`${c.dial}${local}`);
                  setSelectedCode(c.code);
                  setOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                style={{ color: "#111827" }}
              >
                <span className="text-base">{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs" style={{ color: "#6B7280" }}>{c.dial}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OnboardingGP() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const trackedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [refGp, setRefGp] = useState("");

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [phone, setPhone] = useState("+221");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [modes, setModes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedName, setSubmittedName] = useState("");

  // City autocomplete
  const [cityQuery, setCityQuery] = useState("");
  const [cityOpen, setCityOpen] = useState(false);

  const cityResults = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return WORLD_CITIES.filter(
      (c) => c.toLowerCase().includes(q) && !destinations.includes(c),
    ).slice(0, 8);
  }, [cityQuery, destinations]);

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
        .select("prenom, nom, telephone_1")
        .ilike("reference", normalizedRef)
        .maybeSingle();

      if (known) {
        if (known.prenom) setPrenom(known.prenom);
        if (known.nom) setNom(known.nom);
        if (known.telephone_1) setPhone(known.telephone_1);

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

  const addCity = (city: string) => {
    if (!destinations.includes(city)) setDestinations([...destinations, city]);
    setCityQuery("");
    setCityOpen(false);
  };

  const removeCity = (city: string) =>
    setDestinations(destinations.filter((c) => c !== city));

  const toggleMode = (value: string) =>
    setModes(modes.includes(value) ? modes.filter((v) => v !== value) : [...modes, value]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\s/g, "");
    if (!prenom.trim() || !nom.trim() || !/^\+\d{8,15}$/.test(cleanPhone)) {
      toast({
        title: "Champs requis",
        description: "Prénom, nom et téléphone WhatsApp au format +221XXXXXXXXX.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("rejoindre-gp", {
        body: { prenom: prenom.trim(), nom: nom.trim(), phone: cleanPhone, destinations, modes },
      });
      if (error) throw error;

      const konnektUserId = (data as { id?: string } | null)?.id ?? null;
      const storedRef = sessionStorage.getItem(REF_STORAGE_KEY) || refGp;

      if (storedRef && REF_REGEX.test(storedRef)) {
        try {
          await supabase.functions.invoke("gp-onboarding-track", {
            body: {
              ref_gp: storedRef,
              event: "registered",
              konnekt_user_id: konnektUserId,
            },
          });
        } catch {
          /* tracking is best-effort */
        }
      }

      setSubmittedName(prenom.trim());
      setSuccess(true);
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre inscription. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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
            "Rejoignez le réseau Konnekt"
          )}
        </h1>
        <p className="mt-3 text-white/85 text-base leading-relaxed max-w-lg mx-auto">
          Activez votre compte transporteur et recevez vos missions directement sur WhatsApp.
        </p>
      </section>

      {/* FORM */}
      <section className="px-5 py-10 max-w-2xl mx-auto">
        <div
          className="bg-white"
          style={{ border: "1px solid #E5E7EB", borderRadius: 16, padding: 32, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
        >
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-2xl font-bold" style={{ color: "#111827" }}>
                Inscription transporteur
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label style={{ color: "#374151", fontWeight: 600, fontSize: 14 }}>Prénom *</Label>
                  <Input
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Aïssatou"
                    required
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: "#374151", fontWeight: 600, fontSize: 14 }}>Nom *</Label>
                  <Input
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Diallo"
                    required
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label style={{ color: "#374151", fontWeight: 600, fontSize: 14 }}>
                  Téléphone WhatsApp *
                </Label>
                <PhoneInputWithCode value={phone} onChange={setPhone} defaultCountry="SN" size="lg" />
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  Format international, ex : +221789269756
                </p>
              </div>

              {/* DESTINATIONS — autocomplete multi-ville */}
              <div className="space-y-2">
                <Label style={{ color: "#374151", fontWeight: 600, fontSize: 14 }}>
                  Destinations habituelles
                </Label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "#9CA3AF" }}
                  />
                  <input
                    value={cityQuery}
                    onChange={(e) => {
                      setCityQuery(e.target.value);
                      setCityOpen(true);
                    }}
                    onFocus={(e) => {
                      setCityOpen(true);
                      e.currentTarget.style.borderColor = TEAL;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#D1D5DB";
                      setTimeout(() => setCityOpen(false), 150);
                    }}
                    placeholder="Rechercher une ville... ex: Paris, Dubai"
                    className="w-full pl-9 pr-3 outline-none"
                    style={{ ...inputStyle }}
                  />
                  {cityOpen && cityResults.length > 0 && (
                    <ul
                      className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white"
                      style={{ border: "1px solid #E5E7EB", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
                    >
                      {cityResults.map((c) => (
                        <li key={c}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addCity(c)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
                            style={{ color: "#111827" }}
                          >
                            {c}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {destinations.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {destinations.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: TEAL }}
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => removeCity(c)}
                          className="rounded-full hover:bg-white/20 p-0.5"
                          aria-label={`Retirer ${c}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* MODE */}
              <div className="space-y-2">
                <Label style={{ color: "#374151", fontWeight: 600, fontSize: 14 }}>
                  Mode de transport
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {MODES.map((m) => {
                    const active = modes.includes(m.id);
                    const Icon = m.icon;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleMode(m.id)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-colors"
                        style={
                          active
                            ? { border: `2px solid ${TEAL}`, backgroundColor: `${TEAL}14`, color: TEAL_DARK }
                            : { border: "2px solid #E5E7EB", color: "#374151" }
                        }
                      >
                        <Icon className="w-5 h-5" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full text-base text-white"
                style={{ height: 52, borderRadius: 12, fontWeight: 700, backgroundColor: TEAL }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = TEAL_DARK)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TEAL)}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Activer mon compte transporteur →"
                )}
              </Button>

              <p
                className="text-center flex items-center justify-center gap-1.5"
                style={{ color: "#6B7280", fontSize: 13 }}
              >
                <Lock className="w-3.5 h-3.5" />
                Gratuit · Sans engagement · Données sécurisées
              </p>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div
                className="w-16 h-16 rounded-full grid place-items-center mx-auto mb-4"
                style={{ backgroundColor: `${TEAL}1A` }}
              >
                <CheckCircle2 className="w-9 h-9" style={{ color: TEAL }} />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: "#111827" }}>
                Inscription enregistrée, {submittedName} !
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                Dernière étape : confirmez votre inscription sur WhatsApp pour activer votre compte et recevoir vos premières missions.
              </p>

              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="block mt-6">
                <Button
                  className="w-full text-base text-white gap-2"
                  style={{ height: 52, borderRadius: 12, fontWeight: 700, backgroundColor: "#25D366" }}
                >
                  <MessageCircle className="w-5 h-5" />
                  Confirmer mon inscription →
                </Button>
              </a>

              <p className="mt-3" style={{ color: "#6B7280", fontSize: 13 }}>
                Cette étape est indispensable pour activer votre compte.
              </p>
            </motion.div>
          )}
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
