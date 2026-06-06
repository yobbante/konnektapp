import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  MapPin,
  Wallet,
  CheckCircle2,
  Loader2,
  Plane,
  Package,
  Layers,
  ChevronDown,
  Rocket,
  Lock,
  Quote,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInputWithCode } from "@/components/ui/PhoneInputWithCode";
import { toast } from "@/hooks/use-toast";

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

const ADVANTAGES = [
  { icon: MessageCircle, title: "Missions sur WhatsApp", desc: "Recevez vos missions directement sur WhatsApp." },
  { icon: MapPin, title: "Suivi en temps réel", desc: "Suivez l'acheminement de vos colis en direct." },
  { icon: Wallet, title: "Paiements rapides", desc: "Des paiements rapides et 100% transparents." },
];

const TESTIMONIALS = [
  { quote: "Je reçois mes missions avant chaque départ. Pratique et rapide.", author: "Fatou", route: "Dakar-Paris" },
  { quote: "Simple à utiliser, paiement reçu le jour J.", author: "Moussa", route: "Dakar-New York" },
  { quote: "J'aurais voulu découvrir Konnekt plus tôt.", author: "Aminata", route: "Dakar-Madrid" },
];

const TEAL = "#3DAA8A";
const NAVY = "#0D1B2A";

export default function RejoindreGP() {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [phone, setPhone] = useState("+221");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [modes, setModes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedName, setSubmittedName] = useState("");

  const toggle = (arr: string[], set: (v: string[]) => void, value: string) => {
    set(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const scrollToForm = () => {
    document.getElementById("form-section")?.scrollIntoView({ behavior: "smooth" });
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
      const { error } = await supabase.functions.invoke("rejoindre-gp", {
        body: { prenom: prenom.trim(), nom: nom.trim(), phone: cleanPhone, destinations, modes },
      });
      if (error) throw error;
      setSubmittedName(prenom.trim());
      setSuccess(true);
      document.getElementById("form-section")?.scrollIntoView({ behavior: "smooth" });
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

  return (
    <div className="min-h-[100dvh] bg-white text-[#0D1B2A]" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* SECTION 1 — HERO */}
      <section
        className="relative min-h-[100dvh] flex flex-col items-center justify-center px-5 py-12 text-center text-white overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #134e45 55%, ${TEAL} 130%)` }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto w-full"
        >
          <span className="block text-3xl font-extrabold tracking-tight" style={{ color: TEAL }}>
            Konnekt
          </span>

          <span className="inline-flex items-center gap-1.5 mt-6 px-3.5 py-1.5 rounded-full text-sm font-semibold bg-white/10 border border-white/15 backdrop-blur">
            <Rocket className="w-4 h-4" style={{ color: "#F97316" }} />
            Accès bêta ouvert
          </span>

          <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold leading-tight">
            Rejoignez le réseau Konnekt
          </h1>
          <p className="mt-4 text-white/75 text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
            Vous voyagez régulièrement ? Transformez vos trajets en revenus garantis.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-3 text-left">
            {ADVANTAGES.map((a, i) => (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur"
              >
                <div className="w-10 h-10 rounded-xl grid place-items-center mb-2" style={{ backgroundColor: `${TEAL}33` }}>
                  <a.icon className="w-5 h-5" style={{ color: TEAL }} />
                </div>
                <p className="font-semibold text-sm">{a.title}</p>
                <p className="text-xs text-white/60 mt-1">{a.desc}</p>
              </motion.div>
            ))}
          </div>

          <button
            onClick={scrollToForm}
            className="mt-10 inline-flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors"
            aria-label="Aller au formulaire"
          >
            <span className="text-xs font-medium uppercase tracking-wider">S'inscrire</span>
            <motion.span animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
              <ChevronDown className="w-7 h-7" />
            </motion.span>
          </button>
        </motion.div>
      </section>

      {/* SECTION 2 / 3 — FORM / CONFIRMATION */}
      <section id="form-section" className="px-5 py-12 max-w-2xl mx-auto scroll-mt-4">
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
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
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

      {/* SECTION 4 — SOCIAL PROOF */}
      <section className="px-5 pb-14 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-6">Ils font déjà partie du réseau</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.author} className="rounded-2xl bg-[#0D1B2A]/[0.03] border border-black/5 p-5">
              <Quote className="w-6 h-6 mb-2" style={{ color: TEAL }} />
              <p className="text-sm leading-relaxed">{t.quote}</p>
              <p className="mt-3 text-xs font-semibold" style={{ color: TEAL }}>
                {t.author} · <span className="text-muted-foreground font-normal">{t.route}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 py-10 text-center text-white" style={{ backgroundColor: NAVY }}>
        <span className="text-2xl font-extrabold" style={{ color: TEAL }}>
          Konnekt
        </span>
        <a href="https://usekonnekt.com" className="block mt-2 text-sm text-white/70 hover:text-white transition-colors">
          usekonnekt.com
        </a>
        <p className="mt-3 text-xs text-white/50">© 2026 Konnekt by Yobbanté</p>
      </footer>
    </div>
  );
}
