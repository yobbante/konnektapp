import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  MapPin,
  Wallet,
  CheckCircle2,
  Loader2,
  Plane,
  Truck,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  "Autre",
];

const MODES = [
  { id: "Bagage soute", label: "Bagage soute", icon: Plane },
  { id: "Fret", label: "Fret", icon: Truck },
  { id: "Les deux", label: "Les deux", icon: ArrowRight },
];

const ADVANTAGES = [
  { icon: MessageCircle, title: "Missions sur WhatsApp", desc: "Recevez vos missions directement sur WhatsApp." },
  { icon: MapPin, title: "Suivi en temps réel", desc: "Suivez l'acheminement de vos colis en direct." },
  { icon: Wallet, title: "Paiements rapides", desc: "Des paiements rapides et 100% transparents." },
];

export default function RejoindreGP() {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [phone, setPhone] = useState("+221");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [modes, setModes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const toggle = (arr: string[], set: (v: string[]) => void, value: string) => {
    set(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prenom.trim() || !nom.trim() || !/^\+\d{8,15}$/.test(phone.replace(/\s/g, ""))) {
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
        body: { prenom: prenom.trim(), nom: nom.trim(), phone: phone.replace(/\s/g, ""), destinations, modes },
      });
      if (error) throw error;
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

  return (
    <div className="min-h-[100dvh] bg-[#0D1B2A] text-white">
      {/* HERO */}
      <section className="px-5 pt-12 pb-8 max-w-2xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-block text-3xl font-extrabold tracking-tight text-[#3DAA8A]">
            Konnekt
          </span>
          <h1 className="mt-5 text-3xl sm:text-4xl font-extrabold leading-tight">
            Rejoignez le réseau Konnekt
          </h1>
          <p className="mt-3 text-white/70 text-base leading-relaxed">
            Transporteur partenaire Yobbanté ? Accédez à votre espace et recevez vos missions.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3 text-left">
          {ADVANTAGES.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="rounded-2xl bg-white/5 border border-white/10 p-4"
            >
              <div className="w-10 h-10 rounded-xl bg-[#3DAA8A]/20 grid place-items-center mb-2">
                <a.icon className="w-5 h-5 text-[#3DAA8A]" />
              </div>
              <p className="font-semibold text-sm">{a.title}</p>
              <p className="text-xs text-white/60 mt-1">{a.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FORM / SUCCESS */}
      <section className="px-5 pb-20 max-w-2xl mx-auto">
        <div className="rounded-3xl bg-white text-[#0D1B2A] p-6 shadow-2xl">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-xl font-bold">Inscription transporteur</h2>

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
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+221XXXXXXXXX"
                  required
                />
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
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          active
                            ? "bg-[#3DAA8A] text-white border-[#3DAA8A]"
                            : "bg-transparent border-input text-[#0D1B2A]"
                        }`}
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
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-medium transition-colors ${
                          active
                            ? "border-[#F97316] bg-[#F97316]/10 text-[#F97316]"
                            : "border-input text-[#0D1B2A]"
                        }`}
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
                className="w-full h-12 text-base font-semibold bg-[#3DAA8A] hover:bg-[#349279] text-white"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "S'inscrire"}
              </Button>
            </form>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#3DAA8A]/15 grid place-items-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9 text-[#3DAA8A]" />
              </div>
              <h2 className="text-xl font-bold">Inscription enregistrée ✅</h2>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                Dernière étape : confirmez votre inscription sur WhatsApp pour activer votre compte.
              </p>

              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="block mt-6">
                <Button className="w-full h-12 text-base font-semibold bg-[#25D366] hover:bg-[#1fb959] text-white gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Confirmer mon inscription →
                </Button>
              </a>

              <p className="mt-3 text-xs text-muted-foreground">
                Cette étape est indispensable pour activer votre compte et recevoir vos premières missions.
              </p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
