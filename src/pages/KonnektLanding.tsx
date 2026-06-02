import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Menu, ArrowRight, Quote, Instagram, Linkedin,
  Truck, Ship, Plane, Building2, Luggage, Zap,
  Users, Globe2, Layers, ShieldCheck,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import konnektLogo from "@/assets/konnekt-k-logo.png";

/* ────────────────────────── Brand ────────────────────────── */

const NAVY = "#0D1B2A";
const GREEN = "#3DAA8A";
const GREEN_DARK = "#2C8A6E";

/* ────────────────────────── Data ────────────────────────── */

const transportModes = [
  { Icon: Luggage, title: "GP Bagages", desc: "Rentabilisez vos bagages sur vos trajets internationaux.", to: "/transport/gp-bagages" },
  { Icon: Truck, title: "Routier", desc: "Trouvez du fret sur vos trajets longue distance en Afrique.", to: "/transport/routier" },
  { Icon: Ship, title: "Maritime", desc: "Remplissez vos conteneurs entre les ports.", to: "/transport/maritime" },
  { Icon: Plane, title: "Aérien", desc: "Optimisez votre capacité cargo sur vos vols.", to: "/transport/aerien" },
  { Icon: Zap, title: "Coursier", desc: "Livraison urbaine rapide en ville.", to: "/transport/coursier" },
  { Icon: Building2, title: "Entreprise", desc: "Solutions logistiques B2B sur mesure.", to: "/transport/entreprise" },
];

const steps = [
  {
    n: "1",
    title: "Inscris-toi en 2 min",
    desc: "Formulaire simple, sans mot de passe.",
  },
  {
    n: "2",
    title: "Reçois ta validation",
    desc: "Notre équipe active ton compte sous 24h par WhatsApp.",
  },
  {
    n: "3",
    title: "Accède à tes missions",
    desc: "Dashboard web + bot WhatsApp.",
  },
];

const partners = ["Wave", "Orange Money", "DHL", "Colissimo", "Chronopost"];

const testimonials = [
  {
    quote: "Je déclare mon trajet Paris-Dakar et je reçois des demandes directement. C'est simple et fiable.",
    name: "Ibrahima F.",
    role: "GP Paris",
  },
  {
    quote: "En 6 mois, j'ai transporté plus de 200kg de colis. Konnekt gère tout, moi je voyage.",
    name: "Moussa S.",
    role: "GP Dakar-New York",
  },
  {
    quote: "La plateforme idéale pour gérer mes trajets professionnels et rentabiliser mes voyages.",
    name: "Cheikh D.",
    role: "Transporteur routier",
  },
];

/* ────────────────────────── Page ────────────────────────── */

export default function KonnektLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const metrics = [
    { Icon: Users, value: "20+", label: "Transporteurs actifs" },
    { Icon: Globe2, value: "25", label: "Pays couverts" },
    { Icon: Layers, value: "6", label: "Modes de transport" },
    { Icon: ShieldCheck, value: "100%", label: "Paiement sécurisé" },
  ];

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

  const scrollToModes = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("modes")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#0D1B2A]">
      <Helmet>
        <title>Konnekt — La marketplace des transporteurs internationaux</title>
        <meta name="description" content="Konnekt connecte vos trajets à des colis à transporter. GP, routier, maritime, aérien : déclarez vos trajets et soyez payé en toute sécurité." />
        <link rel="canonical" href="https://usekonnekt.com/" />
        <meta property="og:title" content="Konnekt — La marketplace des transporteurs internationaux" />
        <meta property="og:description" content="Connectez vos trajets à des colis à transporter. De Dakar à Paris, New York ou Dubai." />
        <meta property="og:url" content="https://usekonnekt.com/" />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* ───── NAV ───── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b transition-colors safe-area-x"
        style={{
          backgroundColor: scrolled ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)",
          borderColor: scrolled ? "rgba(13,27,42,0.08)" : "transparent",
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2" style={{ color: NAVY }}>
            <img src={konnektLogo} alt="Konnekt" className="w-8 h-8 object-contain" />
            <span className="font-display font-extrabold text-[16px] tracking-tight">KONNEKT</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#0D1B2A]/70">
            <a href="#modes" onClick={scrollToModes} className="hover:text-[#0D1B2A] transition-colors">Solutions</a>
            <a href="#fonctionnement" className="hover:text-[#0D1B2A] transition-colors">Comment ça marche</a>
            <a href="#temoignages" className="hover:text-[#0D1B2A] transition-colors">Témoignages</a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/gp/connexion">
              <Button variant="ghost" size="sm" className="text-sm text-[#0D1B2A] hover:bg-[#0D1B2A]/5 hover:text-[#0D1B2A]">Se connecter</Button>
            </Link>
            <Link to="/beta">
              <Button size="sm" className="rounded-lg px-3.5 text-sm font-semibold shadow-sm" style={{ backgroundColor: GREEN, color: "#ffffff" }}>
                Rejoindre <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button aria-label="Menu" className="p-2 -mr-2 rounded-lg transition-colors hover:bg-[#0D1B2A]/5" style={{ color: NAVY }}><Menu className="w-6 h-6" /></button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[86%] max-w-sm flex flex-col p-0 bg-white">
                <div className="flex items-center gap-2 px-5 pt-6 pb-5 border-b border-gray-100">
                  <img src={konnektLogo} alt="Konnekt" className="w-8 h-8 object-contain" />
                  <span className="font-display font-extrabold text-[16px] tracking-tight" style={{ color: NAVY }}>KONNEKT</span>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
                  <p className="px-3 text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Navigation</p>
                  <a href="#modes" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-[15px] font-medium text-[#0D1B2A] hover:bg-gray-50 transition-colors">Solutions</a>
                  <a href="#fonctionnement" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-[15px] font-medium text-[#0D1B2A] hover:bg-gray-50 transition-colors">Comment ça marche</a>
                  <a href="#temoignages" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-[15px] font-medium text-[#0D1B2A] hover:bg-gray-50 transition-colors">Témoignages</a>
                  <div className="h-px bg-gray-100 my-4" />
                  <p className="px-3 text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Modes de transport</p>
                  {transportModes.map((i) => (
                    <Link key={i.to} to={i.to} onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium text-[#0D1B2A] hover:bg-gray-50 transition-colors">
                      <i.Icon className="w-4 h-4 flex-shrink-0" style={{ color: GREEN }} strokeWidth={1.75} />
                      {i.title}
                    </Link>
                  ))}
                  <div className="h-px bg-gray-100 my-4" />
                  <Link to="/gp/connexion" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-[15px] font-medium text-[#0D1B2A] hover:bg-gray-50 transition-colors">Se connecter</Link>
                </div>
                <div className="px-5 pb-7 pt-3 border-t border-gray-100">
                  <Link to="/beta" onClick={() => setOpen(false)}>
                    <Button className="w-full rounded-xl py-5 font-semibold text-[15px]" style={{ backgroundColor: GREEN, color: "#ffffff" }}>
                      Rejoindre le réseau <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>


      {/* ───── HERO ───── */}
      <section className="relative px-4 pt-16 pb-20 md:pt-28 md:pb-28 overflow-hidden bg-white">
        <div
          className="absolute inset-0 opacity-[0.55] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(13,27,42,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(13,27,42,0.05) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-6xl lg:text-[68px] font-extrabold tracking-tight leading-[1.05]" style={{ color: NAVY }}>
            Gérez vos trajets<br className="hidden sm:block" /> et{" "}
            <span style={{ color: GREEN_DARK }}>missions de transport</span>,<br className="hidden sm:block" /> partout dans le monde.
          </h1>

          <p className="text-base md:text-xl text-[#0D1B2A]/60 max-w-2xl mx-auto mt-7 leading-relaxed">
            Connectez vos trajets à des colis à transporter.
            De Dakar à Paris, New York ou Dubai.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-10 justify-center">
            <Link to="/beta" className="inline-flex items-center justify-center gap-2 rounded-lg px-7 py-3.5 font-semibold text-sm shadow-lg transition-transform hover:-translate-y-0.5" style={{ backgroundColor: GREEN, color: "#ffffff" }}>
              Rejoindre le réseau <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#modes" onClick={scrollToModes} className="inline-flex items-center justify-center gap-2 border rounded-lg px-7 py-3.5 font-semibold text-sm transition-colors hover:bg-[#0D1B2A]/5" style={{ borderColor: "rgba(13,27,42,0.2)", color: NAVY }}>
              Découvrir les solutions
            </a>
          </div>
        </div>
      </section>


      {/* ───── CHIFFRES CLÉS ───── */}
      <section className="px-4 py-12 md:py-16 border-b border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="text-center">
              <div className="font-display text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: GREEN_DARK }}>{m.value}</div>
              <div className="text-xs md:text-sm text-[#0D1B2A]/55 mt-2 font-medium">{m.label}</div>
            </div>
          ))}
        </div>
      </section>


      {/* ───── MODES DE TRANSPORT ───── */}
      <section id="modes" className="px-4 py-16 md:py-24 bg-gray-50 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: GREEN }}>Nos solutions</p>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mt-3 leading-tight">
              Un mode de transport, une page dédiée
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transportModes.map(({ Icon, title, desc, to }) => (
              <Link
                key={to}
                to={to}
                className="group bg-white border border-gray-200 rounded-2xl p-6 transition-all hover:border-[#3DAA8A]/50 hover:shadow-md flex items-start gap-5"
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(61,170,138,0.1)" }}>
                  <Icon className="w-7 h-7" style={{ color: GREEN }} strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-snug">{desc}</p>
                  <div className="mt-3 text-sm font-semibold inline-flex items-center gap-1" style={{ color: GREEN }}>
                    En savoir plus <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───── COMMENT ÇA MARCHE ───── */}
      <section id="fonctionnement" className="px-4 py-16 md:py-24 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: GREEN }}>Comment ça marche</p>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mt-3 leading-tight">
              Trois étapes pour commencer
            </h2>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            {/* connecting line on desktop */}
            <div className="hidden md:block absolute top-7 left-[16.66%] right-[16.66%] h-px bg-gray-200" />
            {steps.map((s) => (
              <div key={s.n} className="relative text-center">
                <div className="w-14 h-14 rounded-full grid place-items-center text-2xl font-bold mx-auto relative z-10 border-4 border-white" style={{ backgroundColor: "rgba(61,170,138,0.12)", color: GREEN }}>
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold tracking-tight mt-5">{s.title}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CAROUSEL PARTENAIRES ───── */}
      <section className="px-4 py-14 md:py-16 bg-white border-b border-gray-100 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm font-medium text-gray-400 mb-8">Ils nous font confiance</p>
          <div className="relative overflow-hidden" style={{ maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)" }}>
            <div className="flex gap-16 w-max animate-konnekt-marquee">
              {[...partners, ...partners].map((p, i) => (
                <span
                  key={i}
                  className="text-xl md:text-2xl font-bold text-gray-300 whitespace-nowrap grayscale select-none"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
        <style>{`
          @keyframes konnekt-marquee {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          .animate-konnekt-marquee {
            animation: konnekt-marquee 40s linear infinite;
          }
        `}</style>
      </section>

      {/* ───── TÉMOIGNAGES ───── */}
      <section id="temoignages" className="px-4 py-16 md:py-24 bg-gray-50 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: GREEN }}>Témoignages</p>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mt-3 leading-tight">
              Ils utilisent Konnekt
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <figure key={t.name} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col relative">
                <Quote className="absolute top-5 right-5 w-7 h-7" style={{ color: "rgba(61,170,138,0.18)" }} />
                <blockquote className="text-[15px] leading-relaxed text-gray-700 italic flex-1 pr-6">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-6 pt-5 border-t border-gray-100">
                  <div className="text-sm font-bold" style={{ color: GREEN }}>{t.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA FINAL ───── */}
      <section className="relative px-4 py-16 md:py-24 overflow-hidden bg-gray-50 border-t border-gray-100">
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight leading-tight" style={{ color: NAVY }}>
            Rejoignez le réseau Konnekt
          </h2>
          <p className="text-base text-[#0D1B2A]/60 mt-5 max-w-xl mx-auto">
            Inscription en 3 minutes. Déclarez vos trajets et commencez à recevoir des demandes.
          </p>
          <div className="flex justify-center mt-10">
            <Link to="/beta" className="inline-flex items-center justify-center gap-2 rounded-lg px-7 py-3.5 font-semibold text-sm shadow-lg transition-transform hover:-translate-y-0.5" style={{ backgroundColor: GREEN, color: "#ffffff" }}>
              Rejoindre le réseau <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>


      {/* ───── FOOTER ───── */}
      <footer className="px-4 py-14 safe-area-x safe-area-bottom bg-white border-t border-gray-100" style={{ color: NAVY }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div className="max-w-sm">
              <div className="flex items-center gap-2">
                <img src={konnektLogo} alt="Konnekt" className="w-8 h-8 object-contain" />
                <span className="font-display font-extrabold tracking-tight">KONNEKT</span>
              </div>
              <p className="text-sm text-[#0D1B2A]/60 mt-4 leading-relaxed">
                Konnekt — La marketplace des transporteurs internationaux.
              </p>
            </div>

            <div className="flex flex-col gap-8 sm:flex-row sm:gap-16">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-[#0D1B2A]/70">Liens utiles</div>
                <ul className="mt-4 space-y-2.5">
                  <li><Link to="/a-propos" className="text-sm text-[#0D1B2A]/60 hover:text-[#0D1B2A] transition-colors">À propos</Link></li>
                  <li><Link to="/beta" className="text-sm text-[#0D1B2A]/60 hover:text-[#0D1B2A] transition-colors">Rejoindre le réseau</Link></li>
                  <li><Link to="/gp/connexion" className="text-sm text-[#0D1B2A]/60 hover:text-[#0D1B2A] transition-colors">Se connecter</Link></li>
                  <li><Link to="/cgu" className="text-sm text-[#0D1B2A]/60 hover:text-[#0D1B2A] transition-colors">CGU</Link></li>
                  <li><Link to="/confidentialite" className="text-sm text-[#0D1B2A]/60 hover:text-[#0D1B2A] transition-colors">Confidentialité</Link></li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-[#0D1B2A]/70">Réseaux</div>
                <div className="mt-4 flex items-center gap-3">
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-full grid place-items-center bg-[#0D1B2A]/5 hover:bg-[#0D1B2A]/10 transition-colors">
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-9 h-9 rounded-full grid place-items-center bg-[#0D1B2A]/5 hover:bg-[#0D1B2A]/10 transition-colors">
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-gray-100 text-xs text-[#0D1B2A]/50">
            © 2026 Konnekt. Tous droits réservés.
          </div>
        </div>
      </footer>

    </div>
  );
}
