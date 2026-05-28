import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useKonnektPublicStats } from "@/hooks/useKonnektPublicStats";
import {
  Menu, ArrowRight, Check, Handshake, MessageCircle, Globe2, Quote,
  Truck, Ship, Plane, Briefcase, Building2, Luggage, Car, Zap,
  ShieldCheck, Activity, Wallet,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

/* ────────────────────────── Data ────────────────────────── */

const services = [
  { icon: Luggage, title: "GP International", sub: "Bagages diaspora", meta: "International" },
  { icon: Truck, title: "Routier", sub: "Fret commercial", meta: "Inter-villes" },
  { icon: Ship, title: "Maritime", sub: "Conteneurs & fret mer", meta: "Multi-ports" },
  { icon: Plane, title: "Aérien", sub: "Cargo air rapide", meta: "Express" },
  { icon: Zap, title: "Coursier Express", sub: "Livraison urbaine", meta: "Sous 2h" },
  { icon: Building2, title: "Agence", sub: "Billetterie & groupage", meta: "B2B / B2C" },
  { icon: Car, title: "Mobility", sub: "Navettes & VTC", meta: "Privé & groupé" },
  { icon: Briefcase, title: "Voyageur GP", sub: "Bagages accompagnés", meta: "Tous trajets" },
];

const featuredTestimonial = {
  quote: "Mes missions Yobbanté arrivent automatiquement. Paiement rapide, aucun litige.",
  name: "Moussa S.",
  role: "GP Express · Dakar",
  initials: "MS",
  color: "#3DAA8A",
};

const otherTestimonials = [
  { quote: "Trois à quatre missions de plus par semaine. L'interface est claire, je ne perds plus de temps.", name: "Ibrahima F.", role: "Taxi · Dakar", initials: "IF", color: "#0EA5E9" },
  { quote: "J'opère Dakar–Bamako. Konnekt me trouve du fret dans les deux sens.", name: "Cheikh D.", role: "Routier · Sahel", initials: "CD", color: "#F59E0B" },
];

const faqs = [
  {
    q: "C'est gratuit ?",
    a: "Oui, totalement gratuit pour les transporteurs.",
  },
  {
    q: "Quel lien avec Yobbanté ?",
    a: "Konnekt est la plateforme officielle des transporteurs partenaires Yobbanté. Vos missions Yobbanté arrivent ici.",
  },
  {
    q: "J'utilise déjà le bot WhatsApp 122. Pourquoi Konnekt ?",
    a: "Le bot continue de fonctionner. Konnekt vous donne en plus un tableau de bord pour voir toutes vos missions, déclarer vos départs, et gérer votre profil.",
  },
  {
    q: "Que se passe-t-il après mon inscription ?",
    a: "Notre équipe vous contacte sur WhatsApp dans les 24h pour activer votre compte.",
  },
  {
    q: "Comment je reçois mon argent ?",
    a: "Wave ou Orange Money, après chaque mission.",
  },
];

const trust = [
  { icon: ShieldCheck, label: "KYC vérifié" },
  { icon: Wallet, label: "Paiement garanti" },
  { icon: Activity, label: "Suivi temps réel" },
];

/* ────────────────────────── Subcomponents ────────────────────────── */

function ServiceCard({ icon: Icon, title, sub, meta }: { icon: any; title: string; sub: string; meta: string }) {
  return (
    <div className="group relative bg-card border border-border rounded-2xl p-5 transition-all hover:border-primary/40 hover:-translate-y-0.5">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold text-foreground mt-4 tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 leading-snug">{sub}</p>
      <div className="mt-4 pt-3 border-t border-border text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
        {meta}
      </div>
    </div>
  );
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      className="w-11 h-11 rounded-full grid place-items-center text-white text-sm font-bold flex-shrink-0"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

/* ────────────────────────── Page ────────────────────────── */

export default function KonnektLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const liveStats = useKonnektPublicStats();


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
            <span className="font-bold text-[15px] tracking-tight">KONNEKT</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#services" className="hover:text-foreground transition-colors">Services</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <a href="#confiance" className="hover:text-foreground transition-colors">Confiance</a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-sm">Se connecter</Button>
            </Link>
            <Link to="/beta">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-3.5 text-sm font-semibold shadow-sm">
                Rejoindre <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
                    { l: "FAQ", h: "#faq" },
                    { l: "Confiance", h: "#confiance" },
                  ].map((i) => (
                    <a key={i.l} href={i.h} onClick={() => setOpen(false)} className="px-3 py-3 rounded-lg text-base font-medium hover:bg-muted">{i.l}</a>
                  ))}
                  <div className="h-px bg-border my-3" />
                  <Link to="/auth" onClick={() => setOpen(false)} className="px-3 py-3 rounded-lg text-base font-medium hover:bg-muted">Se connecter</Link>
                </div>
                <div className="mt-auto pb-6">
                  <Link to="/beta" onClick={() => setOpen(false)}>
                    <Button className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold">
                      Rejoindre Konnekt
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ───── HERO ───── */}
      <section className="relative px-4 pt-14 pb-16 md:pt-24 md:pb-24 border-b border-border overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-border rounded-full px-3 py-1 text-[11px] font-medium tracking-widest uppercase text-muted-foreground bg-card">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Accès prioritaire · Sénégal & diaspora
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-[68px] font-bold tracking-tight leading-[1.05] mt-7">
            Gérez vos trajets<br />
            et missions de transport,{" "}
            <span className="text-primary">partout dans le monde</span>.
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mt-6 leading-relaxed">
            Recevez vos colis à transporter, confirmez vos livraisons, et soyez payé —
            tout depuis WhatsApp et Konnekt.
          </p>

          {/* Nos partenaires opérateurs */}
          <div
            className="mt-6 mx-auto max-w-xl text-left rounded-lg px-5 py-3"
            style={{
              backgroundColor: "rgba(61, 170, 138, 0.10)",
              borderLeft: "3px solid #3DAA8A",
            }}
          >
            <p className="flex items-start gap-2.5 text-sm text-foreground leading-relaxed">
              <Handshake className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span>
                <span className="font-semibold">Nos partenaires opérateurs</span> —{" "}
                Konnekt est partenaire de Yobbanté. Les transporteurs Konnekt reçoivent des missions Yobbanté directement dans leur dashboard.
              </span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
            <Link to="/beta" className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-6 py-3.5 font-semibold text-sm shadow-md hover:bg-primary/90 transition-colors">
              Rejoindre Konnekt <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#services" className="inline-flex items-center justify-center gap-2 border border-border bg-card hover:bg-muted text-foreground rounded-lg px-6 py-3.5 font-semibold text-sm transition-colors">
              Découvrir les services
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-7 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Gratuit</span>
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 2 minutes</span>
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Sénégal & diaspora</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Via WhatsApp</span>
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Via navigateur</span>
          </div>

          {/* Stats réelles (live depuis la base) */}
          <div className="mt-12 grid grid-cols-3 max-w-2xl mx-auto border-t border-border pt-8 gap-2">
            {[
              { n: liveStats.transporteurs, l: "transporteurs actifs" },
              { n: liveStats.pays, l: "pays couverts" },
              { n: liveStats.livraisons, l: "livraisons réussies" },
            ].map((s) => (
              <div key={s.l} className="text-center border-r border-border last:border-r-0 px-2">
                <div className="text-lg md:text-2xl font-bold tracking-tight text-foreground">{s.n}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FEATURED TESTIMONIAL (juste après le hero) ───── */}
      <section className="px-4 py-12 md:py-16 border-b border-border bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <figure className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm relative">
            <Quote className="absolute top-5 right-5 w-7 h-7 text-primary/20" />
            <blockquote className="text-lg md:text-xl leading-relaxed text-foreground font-medium pr-8">
              « {featuredTestimonial.quote} »
            </blockquote>
            <figcaption className="mt-5 pt-5 border-t border-border flex items-center gap-3">
              <Avatar initials={featuredTestimonial.initials} color={featuredTestimonial.color} />
              <div>
                <div className="text-sm font-semibold text-foreground">{featuredTestimonial.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{featuredTestimonial.role}</div>
              </div>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ───── SERVICES ───── */}
      <section id="services" className="px-4 py-16 md:py-24 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-10">
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">Services</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3 max-w-xl leading-tight">
                Tous vos modes de transport.
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Une plateforme pour vos missions Yobbanté et au-delà — choisissez les modes qui correspondent à votre activité.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {services.map((s) => <ServiceCard key={s.title} {...s} />)}
          </div>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <section id="faq" className="px-4 py-16 md:py-24 border-b border-border bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">FAQ</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3 leading-tight">
              Questions fréquentes
            </h2>
          </div>

          <Accordion type="single" collapsible className="bg-card border border-border rounded-2xl px-5 md:px-7 shadow-sm">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className={i === faqs.length - 1 ? "border-b-0" : ""}>
                <AccordionTrigger className="text-left text-base font-semibold text-foreground hover:no-underline py-5">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-8 text-center">
            <a
              href="https://wa.me/221781221891"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <MessageCircle className="w-4 h-4" /> Une autre question ? Écrivez-nous sur WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ───── CONFIANCE — autres témoignages ───── */}
      <section id="confiance" className="px-4 py-16 md:py-24 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-10">
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">Confiance</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3 leading-tight max-w-xl">
                Ils utilisent Konnekt au quotidien.
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

          <div className="grid md:grid-cols-2 gap-4">
            {otherTestimonials.map((t) => (
              <figure key={t.name} className="bg-card border border-border rounded-2xl p-6 flex flex-col">
                <blockquote className="text-base leading-relaxed text-foreground flex-1">
                  « {t.quote} »
                </blockquote>
                <figcaption className="mt-6 pt-6 border-t border-border flex items-center gap-3">
                  <Avatar initials={t.initials} color={t.color} />
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA FINAL ───── */}
      <section className="relative px-4 py-16 md:py-24 bg-primary text-primary-foreground border-b border-primary overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-[11px] font-semibold tracking-widest text-primary-foreground/80 uppercase">Konnekt</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3 leading-tight">
            Prêt à recevoir vos missions Yobbanté ?
          </h2>
          <p className="text-base text-primary-foreground/85 mt-5 max-w-xl mx-auto">
            Inscription en 2 minutes. Notre équipe vous contacte sur WhatsApp dans les 24h.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-10 justify-center">
            <Link to="/beta" className="inline-flex items-center justify-center gap-2 bg-background text-primary rounded-lg px-6 py-3.5 font-semibold text-sm hover:bg-background/95 transition-colors shadow-md">
              Rejoindre Konnekt <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://wa.me/221781221891"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-primary-foreground/40 text-primary-foreground rounded-lg px-6 py-3.5 font-semibold text-sm hover:bg-primary-foreground/10 transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Écrire sur WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="px-4 py-14 bg-background safe-area-x safe-area-bottom">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-sm">K</span>
                <span className="font-bold tracking-tight">KONNEKT</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3 max-w-xs leading-relaxed">
                La plateforme officielle des transporteurs partenaires <span className="font-medium text-foreground">Yobbanté</span> · Sénégal & diaspora.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Globe2 className="w-3.5 h-3.5" /> Dakar · Sénégal
              </div>
            </div>
            {[
              { t: "Produit", l: ["Services", "Rejoindre", "FAQ"] },
              { t: "Légal", l: ["CGU", "Confidentialité", "Mentions"] },
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
            <span>+221 78 122 18 91 · +221 78 460 40 03</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
