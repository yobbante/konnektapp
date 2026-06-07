import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInputWithCode } from "@/components/ui/PhoneInputWithCode";
import { KonnektPageLoader } from "@/components/ui/KonnektLoader";
import { toast } from "@/hooks/use-toast";

const TEAL = "#3DAA8A";
const NAVY = "#0D1B2A";
const REF_REGEX = /^GP\d{4}$/i;
const REF_STORAGE_KEY = "gp_onboarding_ref";

const WHATSAPP_LINK =
  "https://wa.me/221789269756?text=Bonjour%20Konnekt%2C%20je%20viens%20de%20m%27inscrire%20sur%20la%20plateforme.%20Je%20suis%20pr%C3%AAt%20%C3%A0%20rejoindre%20le%20r%C3%A9seau%20et%20recevoir%20mes%20missions.";

const DESTINATIONS = [
  "France",
  "Espagne",
  "Italie",
  "USA",
  "Canada",
  "Belgique",
  "Maroc",
  "Côte d'Ivoire",
  "Autre",
];

const MODES = [
  { id: "Bagage soute", label: "Bagage soute", icon: Plane },
  { id: "Fret", label: "Fret", icon: Package },
  { id: "Les deux", label: "Les deux", icon: Layers },
];

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

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    const normalizedRef = (ref || "").trim().toUpperCase();

    // Invalid format -> fall back to the generic landing
    if (!REF_REGEX.test(normalizedRef)) {
      navigate("/rejoindre-gp", { replace: true });
      return;
    }

    setRefGp(normalizedRef);
    sessionStorage.setItem(REF_STORAGE_KEY, normalizedRef);

    (async () => {
      // Look up the known GP profile (anon read allowed)
      const { data: known } = await supabase
        .from("transporteurs")
        .select("prenom, nom, telephone_1")
        .ilike("reference", normalizedRef)
        .maybeSingle();

      if (known) {
        if (known.prenom) setPrenom(known.prenom);
        if (known.nom) setNom(known.nom);
        if (known.telephone_1) setPhone(known.telephone_1);

        // Track the click only for known references
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

  const toggle = (arr: string[], set: (v: string[]) => void, value: string) => {
    set(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

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

      // Track the registration + link the Konnekt account to the GP ref
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
    <div className="min-h-[100dvh] bg-white text-[#0D1B2A]" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* HERO */}
      <section
        className="px-5 pt-12 pb-10 text-center text-white"
        style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #134e45 60%, ${TEAL} 130%)` }}
      >
        <span className="block text-3xl font-extrabold tracking-tight" style={{ color: TEAL }}>
          Konnekt
        </span>
        <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 mt-5 text-sm font-medium backdrop-blur">
          Invitation personnelle · {refGp}
        </span>
        <h1 className="mt-5 text-3xl sm:text-4xl font-extrabold leading-tight">
          {prenom ? `Bienvenue ${prenom} !` : "Rejoignez le réseau Konnekt"}
        </h1>
        <p className="mt-3 text-white/75 text-base leading-relaxed max-w-lg mx-auto">
          Activez votre compte transporteur et recevez vos missions directement sur WhatsApp.
        </p>
      </section>

      {/* FORM */}
      <section className="px-5 py-10 max-w-2xl mx-auto">
        <div className="rounded-3xl bg-white border border-black/5 p-6 shadow-xl shadow-black/5">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-2xl font-bold">Inscription transporteur</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Prénom *</Label>
                  <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Aïssatou" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Nom *</Label>
                  <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Diallo" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Téléphone WhatsApp *</Label>
                <PhoneInputWithCode value={phone} onChange={setPhone} defaultCountry="SN" size="lg" />
                <p className="text-xs text-muted-foreground">Format international, ex : +221789269756</p>
              </div>

              <div className="space-y-2">
                <Label>Destinations habituelles</Label>
                <div className="flex flex-wrap gap-2">
                  {DESTINATIONS.map((d) => {
                    const active = destinations.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => toggle(destinations, setDestinations, d)}
                        className="px-3 py-1.5 rounded-full text-sm border transition-colors"
                        style={
                          active
                            ? { backgroundColor: TEAL, color: "#fff", borderColor: TEAL }
                            : { backgroundColor: "transparent", color: NAVY, borderColor: "#d1d5db" }
                        }
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mode de transport</Label>
                <div className="grid grid-cols-3 gap-2">
                  {MODES.map((m) => {
                    const active = modes.includes(m.id);
                    const Icon = m.icon;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggle(modes, setModes, m.id)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-medium transition-colors"
                        style={
                          active
                            ? { borderColor: "#F97316", backgroundColor: "#F9731619", color: "#F97316" }
                            : { borderColor: "#d1d5db", color: NAVY }
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
                className="w-full text-base font-semibold text-white hover:opacity-90"
                style={{ height: 56, backgroundColor: TEAL }}
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "S'inscrire gratuitement →"}
              </Button>

              <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Gratuit · Sans engagement · Vos données sont sécurisées
              </p>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full grid place-items-center mx-auto mb-4" style={{ backgroundColor: `${TEAL}26` }}>
                <CheckCircle2 className="w-9 h-9" style={{ color: TEAL }} />
              </div>
              <h2 className="text-2xl font-bold">Inscription enregistrée, {submittedName} !</h2>
              <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                Dernière étape : confirmez votre inscription sur WhatsApp pour activer votre compte et recevoir vos premières missions.
              </p>

              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="block mt-6">
                <Button className="w-full text-base font-semibold text-white gap-2 hover:opacity-90" style={{ height: 56, backgroundColor: "#25D366" }}>
                  <MessageCircle className="w-5 h-5" />
                  Confirmer mon inscription →
                </Button>
              </a>

              <p className="mt-3 text-xs text-muted-foreground">
                Cette étape est indispensable pour activer votre compte.
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 py-10 text-center text-white" style={{ backgroundColor: NAVY }}>
        <span className="text-2xl font-extrabold" style={{ color: TEAL }}>
          Konnekt
        </span>
        <p className="mt-3 text-xs text-white/50">© 2026 Konnekt by Yobbanté</p>
      </footer>
    </div>
  );
}
