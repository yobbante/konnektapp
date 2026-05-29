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
    title: "Créez votre profil",
    desc: "Inscription en 3 minutes. Déclarez vos trajets et votre capacité disponible.",
  },
  {
    n: "2",
    title: "Recevez des demandes",
    desc: "Des colis à transporter vous sont proposés selon vos trajets. Vous acceptez ce qui vous convient.",
  },
  {
    n: "3",
    title: "Soyez payé",
    desc: "Paiement sécurisé après livraison. Wave, Orange Money ou virement.",
  },
];

const partners = ["Wave", "Orange Money", "DHL", "Colissimo", "UPS", "Yobbanté"];

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
          backgroundColor: scrolled ? "rgba(13,27,42,0.95)" : "rgba(13,27,42,0.85)",
          borderColor: scrolled ? "rgba(255,255,255,0.1)" : "transparent",
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2 text-white">
            <span className="w-7 h-7 rounded-md grid place-items-center font-bold text-sm tracking-tight" style={{ backgroundColor: GREEN, color: NAVY }}>K</span>
            <span className="font-bold text-[15px] tracking-tight">KONNEKT</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <a href="#modes" onClick={scrollToModes} className="hover:text-white transition-colors">Solutions</a>
            <a href="#fonctionnement" className="hover:text-white transition-colors">Comment ça marche</a>
            <a href="#temoignages" className="hover:text-white transition-colors">Témoignages</a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/gp/connexion">
              <Button variant="ghost" size="sm" className="text-sm text-white hover:bg-white/10 hover:text-white">Se connecter</Button>
            </Link>
            <Link to="/beta">
              <Button size="sm" className="rounded-lg px-3.5 text-sm font-semibold shadow-sm" style={{ backgroundColor: GREEN, color: NAVY }}>
                Rejoindre <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button aria-label="Menu" className="p-2 -mr-2 text-white"><Menu className="w-5 h-5" /></button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[82%] flex flex-col">
                <div className="flex flex-col gap-1 mt-8">
                  <a href="#modes" onClick={() => setOpen(false)} className="px-3 py-3 rounded-lg text-base font-medium hover:bg-muted">Solutions</a>
                  <a href="#fonctionnement" onClick={() => setOpen(false)} className="px-3 py-3 rounded-lg text-base font-medium hover:bg-muted">Comment ça marche</a>
                  <a href="#temoignages" onClick={() => setOpen(false)} className="px-3 py-3 rounded-lg text-base font-medium hover:bg-muted">Témoignages</a>
                  <div className="h-px bg-border my-3" />
                  <p className="px-3 text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Solutions</p>
                  {transportModes.map((i) => (
                    <Link key={i.to} to={i.to} onClick={() => setOpen(false)} className="px-3 py-3 rounded-lg text-base font-medium hover:bg-muted">{i.title}</Link>
                  ))}
                  <div className="h-px bg-border my-3" />
                  <Link to="/gp/connexion" onClick={() => setOpen(false)} className="px-3 py-3 rounded-lg text-base font-medium hover:bg-muted">Se connecter</Link>
                </div>
                <div className="mt-auto pb-6">
                  <Link to="/beta" onClick={() => setOpen(false)}>
                    <Button className="w-full rounded-lg py-3 font-semibold" style={{ backgroundColor: GREEN, color: NAVY }}>
                      Rejoindre le réseau
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ───── HERO ───── */}
      <section className="relative px-4 pt-16 pb-20 md:pt-28 md:pb-28 overflow-hidden" style={{ backgroundColor: NAVY }}>
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl lg:text-[70px] font-bold tracking-tight leading-[1.05] text-white">
            La plateforme des<br className="hidden sm:block" /> transporteurs{" "}
            <span style={{ color: GREEN }}>internationaux.</span>
          </h1>

          <p className="text-base md:text-xl text-white/70 max-w-2xl mx-auto mt-7 leading-relaxed">
            Connectez vos trajets à des colis à transporter.
            De Dakar à Paris, New York ou Dubai.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-10 justify-center">
            <Link to="/beta" className="inline-flex items-center justify-center gap-2 rounded-lg px-7 py-3.5 font-semibold text-sm shadow-lg transition-transform hover:-translate-y-0.5" style={{ backgroundColor: GREEN, color: NAVY }}>
              Rejoindre le réseau <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#modes" onClick={scrollToModes} className="inline-flex items-center justify-center gap-2 border border-white/25 text-white rounded-lg px-7 py-3.5 font-semibold text-sm hover:bg-white/10 transition-colors">
              Découvrir les solutions
            </a>
          </div>
        </div>
      </section>

      {/* ───── CHIFFRES CLÉS ───── */}
      <section className="px-4 py-12 md:py-16 border-b border-gray-100" style={{ backgroundColor: NAVY }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="text-center">
              <div className="text-4xl md:text-5xl font-bold tracking-tight" style={{ color: GREEN }}>{m.value}</div>
              <div className="text-xs md:text-sm text-white/55 mt-2 font-medium">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───── MODES DE TRANSPORT ───── */}
      <section id="modes" className="px-4 py-16 md:py-24 bg-gray-50 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: GREEN }}>Nos solutions</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-3 leading-tight">
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
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-3 leading-tight">
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
            animation: konnekt-marquee 24s linear infinite;
          }
        `}</style>
      </section>

      {/* ───── TÉMOIGNAGES ───── */}
      <section id="temoignages" className="px-4 py-16 md:py-24 bg-gray-50 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: GREEN }}>Témoignages</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-3 leading-tight">
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
      <section className="relative px-4 py-16 md:py-24 overflow-hidden" style={{ backgroundColor: NAVY }}>
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-white">
            Rejoignez le réseau Konnekt
          </h2>
          <p className="text-base text-white/70 mt-5 max-w-xl mx-auto">
            Inscription en 3 minutes. Déclarez vos trajets et commencez à recevoir des demandes.
          </p>
          <div className="flex justify-center mt-10">
            <Link to="/beta" className="inline-flex items-center justify-center gap-2 rounded-lg px-7 py-3.5 font-semibold text-sm shadow-lg transition-transform hover:-translate-y-0.5" style={{ backgroundColor: GREEN, color: NAVY }}>
              Rejoindre le réseau <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="px-4 py-14 text-white safe-area-x safe-area-bottom" style={{ backgroundColor: NAVY }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div className="max-w-sm">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-md grid place-items-center font-bold text-sm" style={{ backgroundColor: GREEN, color: NAVY }}>K</span>
                <span className="font-bold tracking-tight">KONNEKT</span>
              </div>
              <p className="text-sm text-white/60 mt-4 leading-relaxed">
                Konnekt — La marketplace des transporteurs internationaux.
              </p>
            </div>

            <div className="flex flex-col gap-8 sm:flex-row sm:gap-16">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-white/80">Liens utiles</div>
                <ul className="mt-4 space-y-2.5">
                  <li><Link to="/a-propos" className="text-sm text-white/60 hover:text-white transition-colors">À propos</Link></li>
                  <li><Link to="/beta" className="text-sm text-white/60 hover:text-white transition-colors">Rejoindre le réseau</Link></li>
                  <li><Link to="/gp/connexion" className="text-sm text-white/60 hover:text-white transition-colors">Se connecter</Link></li>
                  <li><Link to="/cgu" className="text-sm text-white/60 hover:text-white transition-colors">CGU</Link></li>
                  <li><Link to="/confidentialite" className="text-sm text-white/60 hover:text-white transition-colors">Confidentialité</Link></li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-white/80">Réseaux</div>
                <div className="mt-4 flex items-center gap-3">
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-full grid place-items-center bg-white/10 hover:bg-white/20 transition-colors">
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-9 h-9 rounded-full grid place-items-center bg-white/10 hover:bg-white/20 transition-colors">
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 text-xs text-white/50">
            © 2026 Konnekt. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
