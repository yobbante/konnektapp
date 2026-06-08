import { motion } from "framer-motion";
import {
  MessageCircle,
  MapPin,
  Wallet,
  Plane,
  ChevronDown,
  Rocket,
  Quote,
} from "lucide-react";
import { GpJoinCard } from "@/components/gp/GpJoinCard";

const TEAL = "#0D9488";
const TEAL_DARK = "#0F766E";
const NAVY = "#0D1B2A";

const ADVANTAGES = [
  { icon: MessageCircle, title: "Missions sur WhatsApp", desc: "Recevez des demandes de transport de bagages sur votre navette." },
  { icon: MapPin, title: "Vous gardez le contrôle", desc: "Vous fixez votre tarif au kilo et acceptez ce qui vous convient." },
  { icon: Wallet, title: "Paiements sécurisés", desc: "Votre paiement est garanti et versé à la livraison." },
];

const STEPS = [
  { n: 1, title: "Inscrivez votre navette", desc: "Indiquez votre trajet régulier, ex : Dakar → Paris." },
  { n: 2, title: "Recevez des bagages à transporter", desc: "Des clients réservent vos kilos disponibles." },
  { n: 3, title: "Livrez et soyez payé", desc: "Le destinataire récupère son colis, vous êtes réglé." },
];

const TESTIMONIALS = [
  { quote: "Je reçois des bagages à transporter avant chaque vol. Mes kilos ne sont plus perdus.", author: "Fatou", route: "Dakar → Paris" },
  { quote: "Simple : je donne mon trajet, je reçois les demandes, je suis payé à la livraison.", author: "Moussa", route: "Dakar → New York" },
  { quote: "J'aurais voulu découvrir Konnekt plus tôt.", author: "Aminata", route: "Dakar → Madrid" },
];

export default function RejoindreGP() {
  const scrollToForm = () => document.getElementById("form-section")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-[100dvh] bg-white text-[#0D1B2A]" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* HERO */}
      <section
        className="relative min-h-[100dvh] flex flex-col items-center justify-center px-5 py-12 text-center text-white overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${TEAL_DARK} 70%, ${TEAL} 130%)` }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto w-full"
        >
          <span className="block text-3xl font-extrabold tracking-tight" style={{ color: "#fff" }}>
            Konnekt
          </span>

          <span className="inline-flex items-center gap-1.5 mt-6 px-3.5 py-1.5 rounded-full text-sm font-semibold bg-white/10 border border-white/15 backdrop-blur">
            <Rocket className="w-4 h-4" style={{ color: "#F97316" }} />
            Devenez GP · transporteur de bagages
          </span>

          <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold leading-tight">
            Vos kilos voyagent.<br />Faites-en un revenu.
          </h1>
          <p className="mt-4 text-white/75 text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
            Vous voyagez régulièrement sur un même trajet ? Transportez les bagages d'autres
            voyageurs et soyez payé à chaque livraison.
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
                <div className="w-10 h-10 rounded-xl grid place-items-center mb-2" style={{ backgroundColor: `${TEAL}55` }}>
                  <a.icon className="w-5 h-5 text-white" />
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

      {/* HOW IT WORKS */}
      <section className="px-5 py-12 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-7" style={{ color: NAVY }}>
          Comment ça marche
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border p-5" style={{ borderColor: "#E5E7EB" }}>
              <div
                className="w-9 h-9 rounded-full grid place-items-center font-bold text-white mb-3"
                style={{ backgroundColor: TEAL }}
              >
                {s.n}
              </div>
              <p className="font-semibold text-sm" style={{ color: NAVY }}>{s.title}</p>
              <p className="text-xs mt-1" style={{ color: "#6B7280" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FORM */}
      <section id="form-section" className="px-5 pb-12 max-w-2xl mx-auto scroll-mt-4">
        <div
          className="bg-white"
          style={{ border: "1px solid #E5E7EB", borderRadius: 16, padding: 28, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Plane className="w-5 h-5" style={{ color: TEAL }} />
            <h2 className="text-2xl font-bold" style={{ color: NAVY }}>
              Inscription GP
            </h2>
          </div>
          <GpJoinCard />
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="px-5 pb-14 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-6" style={{ color: NAVY }}>
          Ils font déjà partie du réseau
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.author} className="rounded-2xl border p-5" style={{ borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" }}>
              <Quote className="w-6 h-6 mb-2" style={{ color: TEAL }} />
              <p className="text-sm leading-relaxed" style={{ color: NAVY }}>{t.quote}</p>
              <p className="mt-3 text-xs font-semibold" style={{ color: TEAL_DARK }}>
                {t.author} · <span style={{ color: "#6B7280", fontWeight: 400 }}>{t.route}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 py-10 text-center text-white" style={{ backgroundColor: NAVY }}>
        <span className="text-2xl font-extrabold text-white">Konnekt</span>
        <a href="https://usekonnekt.com" className="block mt-2 text-sm text-white/70 hover:text-white transition-colors">
          usekonnekt.com
        </a>
        <p className="mt-3 text-xs text-white/50">© 2026 Konnekt by Yobbanté</p>
      </footer>
    </div>
  );
}
