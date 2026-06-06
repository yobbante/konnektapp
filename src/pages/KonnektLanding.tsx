import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Menu, ArrowRight, Quote, FileText, MessageCircle, Wallet,
  Lock, CreditCard, MapPin, X, Apple, Smartphone, Bell, TrendingUp,
} from "lucide-react";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import konnektLogo from "@/assets/konnekt-k-logo.png";

/* ────────────────────────── Brand tokens ────────────────────────── */
const TEAL = "hsl(168 60% 42%)";
const TEAL_DARK = "hsl(168 60% 30%)";
const ORANGE = "hsl(24 85% 55%)";
const DARK = "#0D1B2A";
const GRAY = "#6B7280";

/* ────────────────────────── Data ────────────────────────── */
const steps = [
  {
    n: "01",
    Icon: FileText,
    title: "Inscrivez-vous",
    desc: "Formulaire en ligne, confirmation WhatsApp. 2 minutes chrono.",
  },
  {
    n: "02",
    Icon: MessageCircle,
    title: "Recevez vos missions",
    desc: "Avant chaque départ, les colis disponibles sur votre route arrivent directement sur votre WhatsApp.",
  },
  {
    n: "03",
    Icon: Wallet,
    title: "Touchez votre paiement",
    desc: "Livraison confirmée = virement immédiat via Wave ou Orange Money.",
  },
];

const trust = [
  {
    Icon: Lock,
    title: "Transporteurs vérifiés",
    desc: "Chaque partenaire est validé avant sa première mission.",
  },
  {
    Icon: CreditCard,
    title: "Paiements garantis",
    desc: "Votre rémunération est sécurisée dès la confirmation de collecte.",
  },
  {
    Icon: MapPin,
    title: "Suivi en temps réel",
    desc: "Chaque colis tracé de Dakar jusqu'à destination.",
  },
];

const testimonials = [
  {
    quote: "Je reçois mes missions avant chaque départ Paris. Simple et bien rémunéré.",
    name: "Fatou D.",
    role: "Dakar-Paris",
  },
  {
    quote: "J'aurais voulu connaître Konnekt bien plus tôt.",
    name: "Moussa K.",
    role: "Dakar-New York",
  },
  {
    quote: "Le virement arrive le jour même. Fiable et rapide.",
    name: "Aminata S.",
    role: "Dakar-Madrid",
  },
];

const faqs = [
  {
    q: "Comment fonctionne Konnekt ?",
    a: "Vous déclarez vos trajets entre Dakar et l'Europe. Avant chaque départ, les colis disponibles sur votre route vous sont proposés directement sur WhatsApp. Vous acceptez, vous transportez, vous êtes payé.",
  },
  {
    q: "Combien ça coûte de s'inscrire ?",
    a: "L'inscription est totalement gratuite et sans engagement. Vous ne payez rien : c'est vous qui êtes rémunéré pour chaque mission acceptée.",
  },
  {
    q: "Quand suis-je payé ?",
    a: "Dès que la livraison est confirmée, votre paiement est déclenché immédiatement via Wave ou Orange Money. Le virement arrive généralement le jour même.",
  },
  {
    q: "Comment recevoir mes missions ?",
    a: "Toutes vos missions arrivent directement sur votre WhatsApp avant chaque départ : destination, poids, date et rémunération. Vous gérez tout depuis votre téléphone.",
  },
  {
    q: "Mes paiements sont-ils sécurisés ?",
    a: "Oui. Votre rémunération est sécurisée dès la confirmation de collecte du colis. Aucun risque d'impayé : Konnekt garantit chaque transaction.",
  },
  {
    q: "Sur quelles destinations puis-je transporter ?",
    a: "Konnekt couvre 36 destinations, principalement entre Dakar et l'Europe (Paris, Madrid…), ainsi que vers New York et Dubai. La liste s'agrandit chaque mois.",
  },
];

const WHATSAPP_LINK =
  "https://wa.me/221789269756?text=Bonjour%20Konnekt%2C%20je%20viens%20de%20m%27inscrire%20sur%20la%20plateforme.%20Je%20suis%20pr%C3%AAt%20%C3%A0%20rejoindre%20le%20r%C3%A9seau%20et%20recevoir%20mes%20missions.";


/* ────────────────────────── Page ────────────────────────── */
export default function KonnektLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Force light mode + neutral theme on the marketing landing
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const removed: string[] = [];
    ["theme-admin", "theme-transporter", "theme-client", "theme-routier", "theme-maritime", "theme-aerien"].forEach((c) => {
      if (root.classList.contains(c)) { removed.push(c); root.classList.remove(c); }
    });
    root.classList.remove("dark");
    return () => {
      if (hadDark) root.classList.add("dark");
      removed.forEach((c) => root.classList.add(c));
    };
  }, []);

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const Dot = () => (
    <span className="inline-block w-1.5 h-1.5 rounded-full mx-2 align-middle" style={{ backgroundColor: ORANGE }} />
  );

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif", color: DARK }}>
      <Helmet>
        <title>Konnekt — Vos trajets, vos revenus</title>
        <meta name="description" content="Vous voyagez entre Dakar et l'Europe ? Recevez des missions cargo avant chaque départ avec Konnekt. Simple, rapide, rémunéré." />
        <link rel="canonical" href="https://usekonnekt.com/" />
        <meta property="og:title" content="Konnekt — Vos trajets, vos revenus" />
        <meta property="og:description" content="Recevez des missions cargo avant chaque départ. Simple, rapide, rémunéré." />
        <meta property="og:url" content="https://usekonnekt.com/" />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* ───── NAVBAR (floating pill) ───── */}
      <header className="fixed top-3 inset-x-0 z-50 px-4">
        <div
          className="max-w-5xl mx-auto flex items-center justify-between gap-4 pl-5 pr-3 py-2.5 rounded-full transition-all"
          style={{
            backgroundColor: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.10)" : "0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid rgba(13,27,42,0.06)",
          }}
        >
          <Link to="/" className="flex items-center gap-2">
            <img src={konnektLogo} alt="Konnekt" className="w-7 h-7 object-contain" />
            <span className="font-extrabold text-[16px] tracking-tight" style={{ color: TEAL_DARK }}>Konnekt</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium" style={{ color: GRAY }}>
            <a href="#fonctionnement" onClick={scrollTo("fonctionnement")} className="hover:text-[#0D1B2A] transition-colors">Comment ça marche</a>
            <a href="#confiance" onClick={scrollTo("confiance")} className="hover:text-[#0D1B2A] transition-colors">Pour qui</a>
            <a href="#cta" onClick={scrollTo("cta")} className="hover:text-[#0D1B2A] transition-colors">Rejoindre</a>
          </nav>

          <div className="hidden md:block">
            <Link
              to="/rejoindre-gp"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: TEAL }}
            >
              Rejoindre <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <button onClick={() => setOpen(true)} aria-label="Menu" className="md:hidden p-1.5 rounded-full" style={{ color: DARK }}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-0 w-[82%] max-w-xs h-full bg-white p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <img src={konnektLogo} alt="Konnekt" className="w-7 h-7 object-contain" />
                <span className="font-extrabold text-[16px]" style={{ color: TEAL_DARK }}>Konnekt</span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fermer" style={{ color: DARK }}><X className="w-6 h-6" /></button>
            </div>
            <nav className="flex flex-col gap-1 text-[15px] font-medium" style={{ color: DARK }}>
              <a href="#fonctionnement" onClick={scrollTo("fonctionnement")} className="py-3 border-b border-gray-100">Comment ça marche</a>
              <a href="#confiance" onClick={scrollTo("confiance")} className="py-3 border-b border-gray-100">Pour qui</a>
              <a href="#cta" onClick={scrollTo("cta")} className="py-3 border-b border-gray-100">Rejoindre</a>
            </nav>
            <Link to="/rejoindre-gp" onClick={() => setOpen(false)} className="mt-auto inline-flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-white" style={{ backgroundColor: TEAL }}>
              Rejoindre le réseau <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ───── SECTION 1 · HERO ───── */}
      <section className="relative bg-white px-5 pt-28 pb-16 md:pt-40 md:pb-24 overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold"
              style={{ backgroundColor: "hsl(168 60% 42% / 0.1)", color: TEAL_DARK }}
            >
              🚀 Accès bêta ouvert
            </span>

            <h1 className="mt-6 tracking-tight leading-[1.02] text-[48px] md:text-[72px]">
              <span className="block font-black" style={{ color: DARK }}>Konnekt.</span>
              <span className="block font-normal" style={{ color: "#9CA3AF" }}>Vos trajets,</span>
              <span className="block font-black" style={{ color: TEAL }}>vos revenus.</span>
            </h1>

            <p className="mt-6 text-[18px] leading-relaxed max-w-md" style={{ color: GRAY }}>
              Vous voyagez entre Dakar et l'Europe ? Recevez des missions cargo avant chaque départ. Simple, rapide, rémunéré.
            </p>

            <p className="mt-6 text-[14px] font-medium" style={{ color: GRAY }}>
              422 transporteurs <Dot /> 36 destinations <Dot /> Lancement juillet 2026
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link
                to="/rejoindre-gp"
                className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: TEAL }}
              >
                Rejoindre le réseau <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#fonctionnement"
                onClick={scrollTo("fonctionnement")}
                className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-semibold border-2 transition-colors hover:bg-[hsl(168_60%_42%/0.06)]"
                style={{ borderColor: TEAL, color: TEAL_DARK }}
              >
                En savoir plus
              </a>
            </div>
          </div>

          {/* Right — phone mockup */}
          <div className="relative hidden md:flex justify-center items-center">
            <div
              className="absolute w-[420px] h-[420px] rounded-full"
              style={{ background: "radial-gradient(circle, hsl(168 60% 42% / 0.18), transparent 70%)" }}
            />
            <div
              className="relative w-[260px] rounded-[2.5rem] bg-white p-3 shadow-2xl"
              style={{ transform: "rotate(6deg)", border: "1px solid rgba(13,27,42,0.06)" }}
            >
              <div className="rounded-[2rem] overflow-hidden" style={{ backgroundColor: "#ECE5DD" }}>
                {/* WhatsApp-like header */}
                <div className="flex items-center gap-2 px-3 py-3 text-white" style={{ backgroundColor: "#075E54" }}>
                  <MessageCircle className="w-5 h-5" />
                  <div className="leading-tight">
                    <p className="text-[13px] font-semibold">Konnekt</p>
                    <p className="text-[10px] opacity-80">en ligne</p>
                  </div>
                </div>
                {/* Messages */}
                <div className="p-3 space-y-2 min-h-[300px]">
                  <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 shadow-sm max-w-[85%]">
                    <p className="text-[12px] font-semibold" style={{ color: TEAL_DARK }}>Nouvelle mission 📦</p>
                    <p className="text-[11px] mt-1" style={{ color: DARK }}>Dakar → Paris · 12 kg</p>
                    <p className="text-[11px]" style={{ color: GRAY }}>Départ : 15/06 · Rémunération 18 000 FCFA</p>
                  </div>
                  <div className="rounded-xl rounded-tr-sm px-3 py-2 shadow-sm max-w-[70%] ml-auto" style={{ backgroundColor: "#DCF8C6" }}>
                    <p className="text-[11px]" style={{ color: DARK }}>J'accepte ✅</p>
                  </div>
                  <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 shadow-sm max-w-[85%]">
                    <p className="text-[11px]" style={{ color: DARK }}>Parfait ! Collecte confirmée. Paiement à la livraison via Wave 💸</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── SECTION 2 · CHIFFRES ───── */}
      <section className="px-5 py-16 md:py-24" style={{ backgroundColor: "#F8F9FA" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          {[
            { value: "422+", label: "transporteurs" },
            { value: "36", label: "destinations" },
            { value: "J+0", label: "paiement après livraison" },
          ].map((m) => (
            <div key={m.label}>
              <div className="font-black text-5xl md:text-6xl tracking-tight" style={{ color: TEAL }}>{m.value}</div>
              <div className="mt-2 text-[15px]" style={{ color: GRAY }}>{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───── SECTION 3 · COMMENT ÇA MARCHE ───── */}
      <section id="fonctionnement" className="bg-white px-5 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold tracking-[0.2em] uppercase" style={{ color: TEAL }}>Processus</p>
            <h2 className="mt-3 font-black tracking-tight text-4xl md:text-[56px]" style={{ color: DARK }}>Simple comme bonjour.</h2>
            <p className="mt-3 text-[17px]" style={{ color: GRAY }}>3 étapes. Pas plus.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl p-7 bg-white"
                style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)", borderRadius: 16 }}
              >
                <div className="font-black text-5xl" style={{ color: "#E5E7EB" }}>{s.n}</div>
                <div className="w-12 h-12 rounded-xl grid place-items-center mt-4 mb-4" style={{ backgroundColor: "hsl(168 60% 42% / 0.1)" }}>
                  <s.Icon className="w-6 h-6" style={{ color: TEAL_DARK }} />
                </div>
                <h3 className="font-bold text-xl tracking-tight" style={{ color: DARK }}>{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: GRAY }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── SECTION 4 · CONFIANCE ───── */}
      <section id="confiance" className="px-5 py-16 md:py-24" style={{ backgroundColor: DARK }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold tracking-[0.2em] uppercase" style={{ color: ORANGE }}>Confiance</p>
            <h2 className="mt-3 tracking-tight text-4xl md:text-[64px] leading-[1.05] text-white">
              Sécurité et fiabilité,<br />
              <span className="italic font-normal" style={{ color: "#9CA3AF" }}>au cœur de Konnekt.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {trust.map((t) => (
              <div key={t.title}>
                <div className="w-12 h-12 rounded-xl grid place-items-center mb-4" style={{ backgroundColor: "hsl(168 60% 42% / 0.15)" }}>
                  <t.Icon className="w-6 h-6" style={{ color: TEAL }} />
                </div>
                <h3 className="font-bold text-xl text-white">{t.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "#9CA3AF" }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── SECTION 5 · TÉMOIGNAGES ───── */}
      <section id="temoignages" className="px-5 py-16 md:py-24" style={{ backgroundColor: "#F5F5F5" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold tracking-[0.2em] uppercase" style={{ color: TEAL }}>Témoignages</p>
            <h2 className="mt-3 font-black tracking-tight text-4xl md:text-[56px]" style={{ color: DARK }}>Ce qu'ils en disent.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl p-7 bg-white" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)", borderRadius: 16 }}>
                <Quote className="w-7 h-7 mb-4" style={{ color: "hsl(168 60% 42% / 0.4)" }} />
                <p className="text-[15px] leading-relaxed" style={{ color: DARK }}>"{t.quote}"</p>
                <div className="mt-5">
                  <p className="font-semibold text-[14px]" style={{ color: DARK }}>{t.name}</p>
                  <p className="text-[13px]" style={{ color: GRAY }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── SECTION · TÉLÉCHARGER L'APP ───── */}
      <section className="bg-white px-5 py-16 md:py-24 overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <p className="text-[12px] font-bold tracking-[0.2em] uppercase" style={{ color: TEAL }}>Application</p>
            <h2 className="mt-3 font-black tracking-tight text-4xl md:text-[56px]" style={{ color: DARK }}>
              Konnekt dans votre poche.
            </h2>
            <p className="mt-5 text-[18px] leading-relaxed max-w-md" style={{ color: GRAY }}>
              Recevez vos missions, suivez vos colis et touchez vos paiements depuis votre téléphone. Disponible bientôt sur iOS et Android.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href="#"
                className="inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-white transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: DARK }}
              >
                <Apple className="w-6 h-6" />
                <span className="text-left leading-tight">
                  <span className="block text-[11px] opacity-70">Télécharger sur</span>
                  <span className="block text-[15px] font-semibold">App Store</span>
                </span>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-white transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: DARK }}
              >
                <Smartphone className="w-6 h-6" />
                <span className="text-left leading-tight">
                  <span className="block text-[11px] opacity-70">Disponible sur</span>
                  <span className="block text-[15px] font-semibold">Google Play</span>
                </span>
              </a>
            </div>
          </div>

          {/* Right — phone mockup */}
          <div className="relative hidden md:flex justify-center items-center">
            <div
              className="absolute w-[420px] h-[420px] rounded-full"
              style={{ background: "radial-gradient(circle, hsl(168 60% 42% / 0.18), transparent 70%)" }}
            />
            <div
              className="relative w-[260px] rounded-[2.5rem] bg-white p-3 shadow-2xl"
              style={{ transform: "rotate(-6deg)", border: "1px solid rgba(13,27,42,0.06)" }}
            >
              <div className="rounded-[2rem] overflow-hidden" style={{ backgroundColor: "#F8F9FA" }}>
                {/* App header */}
                <div className="px-4 py-4 text-white" style={{ backgroundColor: TEAL_DARK }}>
                  <p className="text-[11px] opacity-80">Bonjour 👋</p>
                  <p className="text-[16px] font-bold">Vos missions</p>
                </div>
                {/* App body */}
                <div className="p-4 space-y-3 min-h-[300px]">
                  <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ backgroundColor: "hsl(168 60% 42% / 0.12)" }}>
                      <Bell className="w-4 h-4" style={{ color: TEAL_DARK }} />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold" style={{ color: DARK }}>Dakar → Paris</p>
                      <p className="text-[11px]" style={{ color: GRAY }}>12 kg · 18 000 FCFA</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ backgroundColor: "hsl(24 85% 55% / 0.12)" }}>
                      <TrendingUp className="w-4 h-4" style={{ color: ORANGE }} />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold" style={{ color: DARK }}>Gains du mois</p>
                      <p className="text-[11px]" style={{ color: GRAY }}>124 000 FCFA</p>
                    </div>
                  </div>
                  <div className="rounded-2xl p-3 text-white" style={{ backgroundColor: TEAL }}>
                    <p className="text-[12px] font-semibold">Prochain départ</p>
                    <p className="text-[11px] opacity-90">15/06 · Dakar → Madrid</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── SECTION · FAQ ───── */}
      <section id="faq" className="px-5 py-16 md:py-24" style={{ backgroundColor: "#F8F9FA" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[12px] font-bold tracking-[0.2em] uppercase" style={{ color: TEAL }}>FAQ</p>
            <h2 className="mt-3 font-black tracking-tight text-4xl md:text-[56px]" style={{ color: DARK }}>Questions fréquentes.</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="bg-white border-none rounded-2xl px-5"
                style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
              >
                <AccordionTrigger className="text-left text-[16px] font-semibold hover:no-underline" style={{ color: DARK }}>
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed" style={{ color: GRAY }}>
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ───── SECTION 6 · CTA FINAL ───── */}
      <section id="cta" className="px-5 py-20 md:py-28 text-center" style={{ backgroundColor: TEAL_DARK }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="font-black tracking-tight text-4xl md:text-[56px] text-white">Prêt à rejoindre le réseau ?</h2>
          <p className="mt-5 text-[17px] leading-relaxed text-white/80">
            L'inscription prend 2 minutes. Votre première mission peut arriver cette semaine.
          </p>
          <Link
            to="/rejoindre-gp"
            className="mt-9 inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-bold bg-white transition-transform hover:-translate-y-0.5"
            style={{ color: TEAL_DARK }}
          >
            Rejoindre maintenant <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-4 text-[14px] text-white/70">Gratuit · Sans engagement</p>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="bg-white border-t border-gray-200 px-5 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[14px]" style={{ color: GRAY }}>
          <div className="flex items-center gap-2">
            <img src={konnektLogo} alt="Konnekt" className="w-6 h-6 object-contain" />
            <span className="font-extrabold" style={{ color: TEAL_DARK }}>Konnekt</span>
          </div>
          <p>© 2026 Konnekt by Yobbanté</p>
          <div className="flex items-center gap-4">
            <Link to="/cgu" className="hover:text-[#0D1B2A] transition-colors">CGU</Link>
            <Link to="/confidentialite" className="hover:text-[#0D1B2A] transition-colors">Confidentialité</Link>
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-[#0D1B2A] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
