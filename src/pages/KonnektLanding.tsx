import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Menu, ArrowRight, ArrowUpRight, Smartphone, Check,
  Zap, Truck, Ship, Plane, Briefcase, Building2, Luggage, Car,
  Activity, Layers, Network, Globe2, Wallet, Link2, ShieldCheck,
  Users, Building, Plane as PlaneIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/* ────────────────────────── Data ────────────────────────── */

const services = [
  { icon: Luggage, title: "GP International", sub: "Bagages diaspora", meta: "8 pays" },
  { icon: Truck, title: "Routier", sub: "Fret commercial", meta: "Inter-villes" },
  { icon: Ship, title: "Maritime", sub: "Conteneurs & fret mer", meta: "Multi-ports" },
  { icon: Plane, title: "Aérien", sub: "Cargo air rapide", meta: "Express 24-72h" },
  { icon: Zap, title: "Coursier Express", sub: "Livraison urbaine", meta: "Sous 2h" },
  { icon: Building2, title: "Agence", sub: "Billetterie & groupage", meta: "B2B / B2C" },
  { icon: Car, title: "Mobility", sub: "Navettes & VTC", meta: "Privé & groupé" },
  { icon: Briefcase, title: "Voyageur GP", sub: "Bagages accompagnés", meta: "Tous trajets" },
];

const letters = [
  { ch: "K", word: "Kinetic",  desc: "Mouvement temps réel — chaque colis, chaque mission, chaque scan tracé à la seconde.", icon: Activity },
  { ch: "O", word: "Operate",  desc: "Une seule plateforme pour 8 modes de transport — maritime, aérien, routier, GP, coursier.", icon: Layers },
  { ch: "N", word: "Network",  desc: "Un réseau actif de transporteurs vérifiés au Sénégal et dans la diaspora.", icon: Network },
  { ch: "N", word: "Native",   desc: "Pensé mobile-first pour l'Afrique — léger, rapide, hors-ligne, en français.", icon: Globe2 },
  { ch: "E", word: "Earnings", desc: "Paiement garanti à chaque mission. Escrow intégré, retraits mobile money.", icon: Wallet },
  { ch: "K", word: "Konnect",  desc: "Mise en relation instantanée client-transporteur via QR, scan ou demande directe.", icon: Link2 },
  { ch: "T", word: "Trust",    desc: "KYC, score de confiance, assurance par défaut, médiation des litiges.", icon: ShieldCheck },
];

const audiences = {
  transporteurs: {
    label: "Transporteurs",
    icon: Truck,
    title: "Plus de missions, moins de friction.",
    points: [
      "Recevez des missions filtrées par mode et par ville",
      "Paiement sécurisé par escrow à chaque livraison",
      "Tableau de bord, scan QR, géolocalisation intégrés",
    ],
    cta: { label: "Rejoindre la bêta", to: "/beta" },
  },
  entreprises: {
    label: "Entreprises",
    icon: Building,
    title: "Votre logistique, sous contrôle.",
    points: [
      "Devis multi-modes en temps réel et comparaison instantanée",
      "Suivi unifié de tous vos envois sur une seule interface",
      "Facturation centralisée, API et intégrations sur mesure",
    ],
    cta: { label: "Nous contacter", to: "/auth" },
  },
  diaspora: {
    label: "Diaspora",
    icon: PlaneIcon,
    title: "Envoyez en toute confiance.",
    points: [
      "Trouvez un GP vérifié pour vos colis et bagages",
      "Tarif transparent, paiement sécurisé jusqu'à livraison",
      "Code de réception et suivi en temps réel",
    ],
    cta: { label: "Découvrir", to: "/app" },
  },
} as const;

const steps = [
  { n: "01", title: "Téléchargez", body: "iOS et Android. Création de compte en moins de 2 minutes." },
  { n: "02", title: "Choisissez vos modes", body: "Sélectionnez les services qui correspondent à votre activité ou besoin." },
  { n: "03", title: "Opérez & encaissez", body: "Missions, suivi et paiements — tout est centralisé dans l'app." },
];

const testimonials = [
  { quote: "Trois à quatre missions de plus par semaine. L'interface est claire, je ne perds plus de temps.", name: "Ibrahima F.", role: "Taxi · Dakar" },
  { quote: "Mes missions Yobbanté arrivent automatiquement. Paiement rapide, aucun litige.", name: "Moussa S.", role: "GP Express · Dakar" },
  { quote: "J'opère Dakar–Bamako. Konnekt me trouve du fret dans les deux sens.", name: "Cheikh D.", role: "Routier · Sahel" },
];

const trust = [
  { icon: ShieldCheck, label: "KYC vérifié" },
  { icon: Wallet, label: "Escrow intégré" },
  { icon: Activity, label: "Suivi temps réel" },
];

/* ────────────────────────── Subcomponents ────────────────────────── */

function LetterRail({ active }: { active: number }) {
  return (
    <div className="hidden lg:flex flex-col gap-2 fixed left-6 top-1/2 -translate-y-1/2 z-30">
      {letters.map((l, i) => (
        <a
          key={i}
          href={`#letter-${i}`}
          className={`group flex items-center gap-3 transition-all ${
            active === i ? "opacity-100" : "opacity-40 hover:opacity-80"
          }`}
        >
          <span
            className={`w-8 h-8 grid place-items-center rounded-full text-xs font-bold tracking-widest border transition-colors ${
              active === i ? "bg-foreground text-background border-foreground" : "border-border text-foreground"
            }`}
          >
            {l.ch}
          </span>
          <span className={`text-xs font-medium uppercase tracking-widest text-foreground transition-opacity ${
            active === i ? "opacity-100" : "opacity-0 group-hover:opacity-60"
          }`}>
            {l.word}
          </span>
        </a>
      ))}
    </div>
  );
}

function ServiceCard({ icon: Icon, title, sub, meta }: { icon: any; title: string; sub: string; meta: string }) {
  return (
    <div className="group relative bg-card border border-border rounded-2xl p-5 transition-all hover:border-foreground/30 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </div>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="text-base font-semibold text-foreground mt-4 tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 leading-snug">{sub}</p>
      <div className="mt-4 pt-3 border-t border-border text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
        {meta}
      </div>
    </div>
  );
}

/* ────────────────────────── Page ────────────────────────── */

export default function KonnektLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeLetter, setActiveLetter] = useState(0);
  const [audience, setAudience] = useState<keyof typeof audiences>("transporteurs");
  const lettersRef = useRef<HTMLDivElement>(null);

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

  // Scroll-spy for letters
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.letter);
            if (!Number.isNaN(idx)) setActiveLetter(idx);
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    const els = document.querySelectorAll("[data-letter]");
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const aud = audiences[audience];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* ───── NAV ───── */}
      <header
        className={`sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b transition-colors safe-area-x ${
          scrolled ? "border-border" : "border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-sm tracking-tight">K</span>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[15px] tracking-tight">KONNEKT</span>
              <span className="text-[10px] text-muted-foreground tracking-wide">by Yobbanté</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#services" className="hover:text-foreground transition-colors">Services</a>
            <a href="#manifeste" className="hover:text-foreground transition-colors">Manifeste</a>
            <a href="#audiences" className="hover:text-foreground transition-colors">Pour qui</a>
            <a href="#confiance" className="hover:text-foreground transition-colors">Confiance</a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-sm">Se connecter</Button>
            </Link>
            <Link to="/beta">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-3.5 text-sm font-semibold shadow-sm">
                Rejoindre la bêta <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button aria-label="Menu" className="p-2 -mr-2"><Menu className="w-5 h-5" /></button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[82%] flex flex-col">
                <div className="flex flex-col gap-1 mt-8">
                  {[
                    { l: "Services", h: "#services" },
                    { l: "Manifeste", h: "#manifeste" },
                    { l: "Pour qui", h: "#audiences" },
                    { l: "Confiance", h: "#confiance" },
                  ].map((i) => (
                    <a key={i.l} href={i.h} onClick={() => setOpen(false)} className="px-3 py-3 rounded-lg text-base font-medium hover:bg-muted">{i.l}</a>
                  ))}
                  <div className="h-px bg-border my-3" />
                  <Link to="/auth" onClick={() => setOpen(false)} className="px-3 py-3 rounded-lg text-base font-medium hover:bg-muted">Se connecter</Link>
                </div>
                <div className="mt-auto pb-6">
                  <Link to="/beta" onClick={() => setOpen(false)}>
                    <Button className="w-full bg-foreground text-background rounded-lg py-3 font-semibold">
                      Rejoindre la bêta
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ───── HERO ───── */}
      <section className="relative px-4 pt-16 pb-20 md:pt-28 md:pb-32 border-b border-border overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-border rounded-full px-3 py-1 text-[11px] font-medium tracking-widest uppercase text-muted-foreground bg-card">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Bêta · Sénégal
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-[88px] font-bold tracking-tight leading-[0.95] mt-8">
            Le transport,<br />
            <span className="text-muted-foreground">connecté.</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mt-6 leading-relaxed">
            Une seule plateforme pour tous les modes de transport au Sénégal et dans la diaspora.
            Pour les transporteurs, les entreprises, et ceux qui envoient.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-10 justify-center">
            <Link to="/beta" className="inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-lg px-6 py-3.5 font-semibold text-sm shadow-md hover:bg-foreground/90 transition-colors">
              Rejoindre la bêta <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#services" className="inline-flex items-center justify-center gap-2 border border-border bg-card hover:bg-muted text-foreground rounded-lg px-6 py-3.5 font-semibold text-sm transition-colors">
              Découvrir les services
            </a>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Gratuit</span>
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 2 minutes</span>
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> iOS & Android</span>
          </div>

          {/* Stats line */}
          <div className="mt-16 grid grid-cols-3 max-w-2xl mx-auto border-t border-border pt-8">
            {[
              { n: "200+", l: "Transporteurs" },
              { n: "8", l: "Modes" },
              { n: "5", l: "Régions" },
            ].map((s) => (
              <div key={s.l} className="text-center border-r border-border last:border-r-0 px-2">
                <div className="text-3xl md:text-4xl font-bold tracking-tight">{s.n}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── LETTER MARQUEE (mobile + tablet visual cue) ───── */}
      <div className="border-b border-border bg-card overflow-hidden lg:hidden">
        <div className="flex items-center gap-2 py-4 animate-marquee w-max">
          {[...letters, ...letters].map((l, i) => (
            <div key={i} className="flex items-center gap-3 px-5 whitespace-nowrap">
              <span className="w-7 h-7 grid place-items-center rounded-full bg-foreground text-background text-xs font-bold">{l.ch}</span>
              <span className="text-xs uppercase tracking-widest font-semibold text-foreground">{l.word}</span>
              <span className="w-1 h-1 rounded-full bg-border" />
            </div>
          ))}
        </div>
      </div>

      {/* ───── SERVICES ───── */}
      <section id="services" className="px-4 py-20 md:py-28 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">Services</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3 max-w-xl leading-tight">
                Huit modes. Une plateforme.
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Tous les modes de transport disponibles sur Konnekt. Sélectionnez celui dont vous avez besoin — ou cumulez-les.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {services.map((s) => <ServiceCard key={s.title} {...s} />)}
          </div>
        </div>
      </section>

      {/* ───── MANIFESTE — K·O·N·N·E·K·T ───── */}
      <section id="manifeste" className="px-4 py-20 md:py-28 border-b border-border bg-muted/30 relative">
        <LetterRail active={activeLetter} />
        <div className="max-w-3xl mx-auto" ref={lettersRef}>
          <p className="text-[11px] font-semibold tracking-widest text-primary uppercase text-center">Manifeste</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3 text-center leading-tight">
            Sept lettres. Sept promesses.
          </h2>
          <p className="text-sm md:text-base text-muted-foreground text-center max-w-xl mx-auto mt-4">
            K·O·N·N·E·K·T n'est pas un nom — c'est notre cahier des charges.
          </p>

          <div className="mt-16 space-y-2">
            {letters.map((l, i) => {
              const Ico = l.icon;
              return (
                <div
                  key={i}
                  id={`letter-${i}`}
                  data-letter={i}
                  className="group grid grid-cols-[auto_1fr] gap-5 md:gap-8 items-start py-6 border-t border-border hover:bg-card/60 transition-colors px-3 -mx-3 rounded-lg"
                >
                  <div className="flex flex-col items-center gap-1.5 pt-1">
                    <span className="text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-none">{l.ch}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <Ico className="w-4 h-4 text-primary" strokeWidth={2} />
                      <h3 className="text-lg md:text-xl font-bold tracking-tight">{l.word}</h3>
                    </div>
                    <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed">{l.desc}</p>
                  </div>
                </div>
              );
            })}
            <div className="border-t border-border" />
          </div>
        </div>
      </section>

      {/* ───── AUDIENCES ───── */}
      <section id="audiences" className="px-4 py-20 md:py-28 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center">
            <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">Pour qui</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3 leading-tight">
              Une plateforme. Trois publics.
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mt-10">
            <div className="inline-flex p-1 bg-muted rounded-xl border border-border">
              {(Object.keys(audiences) as Array<keyof typeof audiences>).map((k) => {
                const A = audiences[k];
                const Ico = A.icon;
                const active = audience === k;
                return (
                  <button
                    key={k}
                    onClick={() => setAudience(k)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Ico className="w-4 h-4" />
                    {A.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 mt-12 items-center">
            <div>
              <h3 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight animate-fade-up" key={audience}>
                {aud.title}
              </h3>
              <ul className="mt-6 space-y-3">
                {aud.points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm md:text-base text-muted-foreground">
                    <span className="mt-1 w-5 h-5 rounded-full bg-primary/10 grid place-items-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Link to={aud.cta.to} className="inline-flex items-center gap-2 mt-8 bg-foreground text-background rounded-lg px-5 py-3 text-sm font-semibold hover:bg-foreground/90 transition-colors">
                {aud.cta.label} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                {services.slice(0, 4).map((s) => {
                  const Ico = s.icon;
                  return (
                    <div key={s.title} className="border border-border rounded-xl p-4 bg-background">
                      <Ico className="w-5 h-5 text-foreground mb-3" strokeWidth={1.75} />
                      <div className="text-sm font-semibold tracking-tight">{s.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 pt-5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium uppercase tracking-widest">Aperçu services</span>
                <a href="#services" className="text-foreground font-medium hover:underline inline-flex items-center gap-1">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── COMMENT ───── */}
      <section className="px-4 py-20 md:py-28 border-b border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center">
            <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">Démarrer</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3 leading-tight">
              Trois étapes. Vous êtes actif.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-14">
            {steps.map((s, i) => (
              <div key={s.n} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-5 left-[calc(50%+24px)] right-0 h-px bg-border" />
                )}
                <div className="text-[11px] font-bold tracking-widest text-primary">{s.n}</div>
                <h3 className="text-xl font-bold tracking-tight mt-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CONFIANCE ───── */}
      <section id="confiance" className="px-4 py-20 md:py-28 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">Confiance</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3 leading-tight max-w-xl">
                Ce qu'en disent ceux qui l'utilisent.
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {trust.map((t) => (
                <span key={t.label} className="inline-flex items-center gap-1.5 border border-border rounded-full px-3 py-1.5 text-xs font-medium bg-card">
                  <t.icon className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <figure key={t.name} className="bg-card border border-border rounded-2xl p-6 flex flex-col">
                <blockquote className="text-base leading-relaxed text-foreground flex-1">
                  "{t.quote}"
                </blockquote>
                <figcaption className="mt-6 pt-6 border-t border-border">
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA FINAL ───── */}
      <section className="px-4 py-20 md:py-28 bg-foreground text-background border-b border-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">Konnekt</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3 leading-tight">
            Le transport sénégalais. Connecté, enfin.
          </h2>
          <p className="text-base text-background/60 mt-5 max-w-xl mx-auto">
            Téléchargez l'app ou rejoignez la bêta. Gratuit, sans engagement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-10 justify-center">
            <a href="#" className="inline-flex items-center justify-center gap-2 bg-background text-foreground rounded-lg px-6 py-3.5 font-semibold text-sm hover:bg-background/90 transition-colors">
              <Smartphone className="w-4 h-4" /> Télécharger l'app
            </a>
            <Link to="/beta" className="inline-flex items-center justify-center gap-2 border border-background/30 text-background rounded-lg px-6 py-3.5 font-semibold text-sm hover:bg-background/10 transition-colors">
              Rejoindre la bêta <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="px-4 py-14 bg-background safe-area-x safe-area-bottom">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-md bg-foreground text-background grid place-items-center font-bold text-sm">K</span>
                <span className="font-bold tracking-tight">KONNEKT</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3 max-w-xs leading-relaxed">
                Le transport, connecté. Une plateforme par <span className="font-medium text-foreground">Yobbanté</span> · Sénégal.
              </p>
            </div>
            {[
              { t: "Produit", l: ["Services", "Bêta", "Téléchargement", "Tarifs"] },
              { t: "Entreprise", l: ["À propos", "Carrières", "Contact", "Presse"] },
              { t: "Légal", l: ["CGU", "Confidentialité", "Cookies", "Mentions"] },
            ].map((c) => (
              <div key={c.t}>
                <div className="text-xs font-semibold uppercase tracking-widest text-foreground">{c.t}</div>
                <ul className="mt-4 space-y-2.5">
                  {c.l.map((i) => (
                    <li key={i}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{i}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-6 border-t border-border flex items-center justify-between flex-wrap gap-3 text-xs text-muted-foreground">
            <span>© 2026 Konnekt · Tous droits réservés</span>
            <span>Dakar · Sénégal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
