import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, Smartphone, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const transportChips = [
  { emoji: "🚕", label: "Taxi", color: "text-transport-voyageur" },
  { emoji: "✈️", label: "Aérien", color: "text-transport-aerien" },
  { emoji: "🚢", label: "Maritime", color: "text-transport-maritime" },
  { emoji: "🚌", label: "Bus", color: "text-transport-routier" },
  { emoji: "🏍️", label: "Moto Express", color: "text-transport-express" },
  { emoji: "🚛", label: "Routier", color: "text-transport-routier" },
  { emoji: "🚐", label: "Minibus", color: "text-muted-foreground" },
  { emoji: "📦", label: "GP Express", color: "text-transport-express" },
  { emoji: "🚗", label: "VTC", color: "text-muted-foreground" },
];

const modes = [
  { emoji: "🚕", name: "Taxi / VTC", sub: "Courses urbaines", bg: "bg-transport-voyageur/10" },
  { emoji: "🏍️", name: "Moto Express", sub: "Livraisons rapides", bg: "bg-transport-express/10" },
  { emoji: "🚌", name: "Bus / Car", sub: "Lignes interurbaines", bg: "bg-primary/10" },
  { emoji: "🚐", name: "Minibus", sub: "Transport groupé", bg: "bg-muted" },
  { emoji: "📦", name: "GP Express", sub: "Colis & fret léger", bg: "bg-transport-express/10" },
  { emoji: "🚛", name: "Routier", sub: "Fret commercial", bg: "bg-transport-routier/10" },
  { emoji: "🚢", name: "Maritime", sub: "Fret mer", bg: "bg-transport-maritime/10" },
  { emoji: "✈️", name: "Aérien", sub: "Cargo air", bg: "bg-transport-aerien/10" },
];

const benefits = [
  {
    emoji: "📡",
    title: "Missions en temps réel",
    body: "Recevez des missions directement sur votre téléphone. Acceptez ou refusez en un tap.",
  },
  {
    emoji: "💰",
    title: "Paiement rapide",
    body: "Chaque mission complétée est enregistrée. Suivez vos gains en temps réel dans l'app.",
  },
  {
    emoji: "🛡️",
    title: "Assuré par défaut",
    body: "Chaque mission inclut une couverture de base. Options premium selon le type de transport.",
  },
];

const steps = [
  { n: "01", title: "Téléchargez l'app", body: "Disponible sur iOS et Android. Créez votre profil en 2 minutes." },
  { n: "02", title: "Choisissez vos modes", body: "Taxi, moto, camion, maritime... Recevez les missions qui vous correspondent." },
  { n: "03", title: "Acceptez et gagnez", body: "Chaque mission = paiement garanti. Vos gains visibles à tout moment." },
];

const testimonials = [
  { emoji: "🚕", mode: "Taxi", color: "voyageur", quote: "Je reçois 3 à 4 missions de plus par semaine. Tout est simple.", name: "Ibrahima F.", sub: "Dakar · Taxi" },
  { emoji: "📦", mode: "GP Express", color: "express", quote: "Mes missions Yobbanté arrivent directement. Je ne rate plus rien.", name: "Moussa S.", sub: "Dakar · GP Express" },
  { emoji: "🚛", mode: "Routier", color: "routier", quote: "J'opère entre Dakar et Bamako. Konnekt me trouve des chargements dans les deux sens.", name: "Cheikh D.", sub: "Dakar–Bamako · Routier" },
];

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold tracking-widest text-primary uppercase text-center">{children}</p>
);

export default function KonnektLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* NAV */}
      <header
        className={`sticky top-0 z-50 bg-background border-b border-border transition-shadow safe-area-x ${
          scrolled ? "shadow-sm" : ""
        }`}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex flex-col leading-none">
            <span className="font-bold text-xl text-foreground tracking-tight">KONNEKT</span>
            <span className="text-xs text-muted-foreground">by Yobbanté</span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" className="text-foreground">Se connecter</Button>
            </Link>
            <Link to="/beta">
              <Button className="bg-primary text-white hover:bg-primary/90 rounded-xl px-4 py-2 font-semibold text-sm">
                Rejoindre la bêta
              </Button>
            </Link>
          </div>

          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button aria-label="Menu" className="p-2 -mr-2">
                  <Menu className="w-6 h-6 text-foreground" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80%] flex flex-col">
                <div className="flex flex-col gap-1 mt-8">
                  <Link to="/auth" onClick={() => setOpen(false)} className="px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-muted">
                    Se connecter
                  </Link>
                  <Link to="/beta" onClick={() => setOpen(false)} className="px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-muted">
                    Rejoindre la bêta
                  </Link>
                </div>
                <div className="mt-auto pb-6">
                  <Link to="/beta" onClick={() => setOpen(false)}>
                    <Button className="w-full bg-primary text-white rounded-xl py-3 font-semibold">
                      Rejoindre la bêta
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="pt-16 pb-20 px-4" style={{ background: "hsl(40 30% 97%)" }}>
        <div className="max-w-sm mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium animate-fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            BÊTA DISPONIBLE
          </span>

          <h1 className="text-5xl font-bold tracking-tight text-foreground leading-tight mt-5 animate-fade-up">
            Le transport,<br />connecté.
          </h1>
          <p className="text-base text-muted-foreground max-w-xs mx-auto mt-3 leading-relaxed">
            Rejoignez le réseau de transporteurs qui travaillent plus, partout au Sénégal.
          </p>

          {/* Ticker */}
          <div className="mt-6 overflow-hidden -mx-4">
            <div className="flex gap-2 animate-marquee w-max">
              {[...transportChips, ...transportChips].map((c, i) => (
                <span key={i} className="bg-white border border-border rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                  <span>{c.emoji}</span>
                  <span className={c.color}>{c.label}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-8">
            <a href="#" className="bg-primary text-white rounded-xl py-3.5 px-6 font-semibold text-base w-full shadow-md active:scale-95 transition-transform inline-flex items-center justify-center gap-2">
              <Smartphone className="w-5 h-5" /> Télécharger l'app
            </a>
            <Link to="/beta" className="bg-white text-primary border-2 border-primary rounded-xl py-3.5 px-6 font-semibold text-base w-full inline-flex items-center justify-center">
              Rejoindre la bêta transporteur
            </Link>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-3">
            ✓ Gratuit · ✓ 30 secondes · ✓ Missions dès l'activation
          </p>

          <div className="grid grid-cols-4 gap-2 mt-8">
            {[
              { n: "200+", l: "Transporteurs" },
              { n: "8+", l: "Modes" },
              { n: "5", l: "Régions" },
              { n: "24h", l: "Activation" },
            ].map((s) => (
              <div key={s.l} className="bg-white rounded-2xl p-3 shadow-card border border-border text-center">
                <div className="text-xl font-bold text-foreground">{s.n}</div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODES */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-sm mx-auto">
          <SectionLabel>TOUS LES MODES</SectionLabel>
          <h2 className="text-2xl font-bold text-foreground text-center max-w-xs mx-auto mt-2 mb-8">
            Peu importe comment vous transportez. Konnekt vous connecte.
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {modes.map((m) => (
              <div key={m.name} className="bg-white border border-border rounded-2xl p-4 shadow-card flex flex-col items-center text-center gap-2 active:scale-95 transition-transform">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${m.bg}`}>
                  {m.emoji}
                </div>
                <div className="text-sm font-semibold text-foreground">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POURQUOI */}
      <section className="py-16 px-4" style={{ background: "hsl(40 30% 97%)" }}>
        <div className="max-w-sm mx-auto">
          <SectionLabel>POURQUOI KONNEKT</SectionLabel>
          <h2 className="text-2xl font-bold text-foreground text-center max-w-xs mx-auto mt-2 mb-8">
            Plus de missions. Moins de temps perdu.
          </h2>
          <div className="flex flex-col gap-4">
            {benefits.map((b) => (
              <div key={b.title} className="bg-white rounded-2xl p-5 shadow-card border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                  {b.emoji}
                </div>
                <h3 className="text-base font-semibold text-foreground mt-3">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT */}
      <section className="py-16 px-4 bg-background">
        <div className="max-w-sm mx-auto">
          <SectionLabel>COMMENT ÇA MARCHE</SectionLabel>
          <h2 className="text-2xl font-bold text-foreground text-center max-w-xs mx-auto mt-2 mb-8">
            3 étapes. Vous êtes actif.
          </h2>

          <div className="relative">
            <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-border z-0" />
            {steps.map((s) => (
              <div key={s.n} className="relative z-10 flex gap-4 pb-8">
                <div className="w-10 h-10 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {s.n}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          <a href="#" className="mt-8 bg-primary text-white rounded-xl py-3.5 w-full font-semibold text-base inline-flex items-center justify-center gap-2">
            <Smartphone className="w-5 h-5" /> Télécharger Konnekt <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* YOBBANTÉ */}
      <section className="py-12 px-4" style={{ background: "hsl(40 30% 97%)" }}>
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-2xl p-5 shadow-card border-l-4 border-l-secondary border-y border-r border-border">
            <div className="flex items-center">
              <span className="text-sm font-bold text-foreground">KONNEKT</span>
              <span className="text-muted-foreground mx-2">×</span>
              <span className="text-sm font-bold text-foreground">YOBBANTÉ</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              Déjà partenaire Yobbanté ? Vos missions apparaissent automatiquement dans Konnekt.
            </p>
            <Link to="/beta" className="mt-4 border-2 border-secondary text-secondary rounded-xl py-2.5 w-full font-semibold text-sm inline-flex items-center justify-center gap-1">
              Accéder à mon espace GP <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section className="py-16 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <SectionLabel>TÉMOIGNAGES</SectionLabel>
          <h2 className="text-2xl font-bold text-foreground text-center max-w-xs mx-auto mt-2 mb-8">
            Ce que disent nos transporteurs.
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
            {testimonials.map((t) => (
              <div key={t.name} className="min-w-[280px] rounded-2xl p-5 border border-border" style={{ background: "hsl(40 30% 97%)" }}>
                <span className={`text-xs font-medium rounded-full px-2.5 py-1 inline-flex items-center gap-1 bg-transport-${t.color}/10 text-transport-${t.color}`}>
                  <span>{t.emoji}</span> {t.mode}
                </span>
                <div className="text-warning text-sm mt-3">★★★★★</div>
                <p className="text-sm text-muted-foreground italic leading-relaxed mt-2">"{t.quote}"</p>
                <div className="text-sm font-semibold text-foreground mt-3">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 px-4 text-center bg-primary">
        <div className="max-w-sm mx-auto">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Prêt à recevoir plus de missions ?
          </h2>
          <p className="text-base text-white/70 mt-3">
            Téléchargez Konnekt. Gratuit. iOS et Android.
          </p>
          <a href="#" className="mt-8 bg-white text-primary rounded-xl py-4 px-8 font-bold text-base shadow-lg w-full inline-flex items-center justify-center gap-2">
            <Smartphone className="w-5 h-5" /> Télécharger l'app — Gratuit
          </a>
          <Link to="/beta" className="mt-3 border-2 border-white/30 text-white rounded-xl py-3.5 font-semibold text-sm w-full inline-flex items-center justify-center">
            Rejoindre la bêta en ligne
          </Link>
          <p className="text-sm text-white/60 mt-6">
            Vous êtes une entreprise ?{" "}
            <a href="https://wa.me/221000000000" className="text-white underline">Contactez-nous →</a>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-4 bg-foreground safe-area-x safe-area-bottom">
        <div className="max-w-sm mx-auto">
          <div className="text-white font-bold text-lg">KONNEKT</div>
          <div className="text-white/40 text-xs mt-1">by Yobbanté · Transport connecté</div>
          <div className="grid grid-cols-2 gap-2 mt-6">
            {["Transporteurs", "Entreprises", "À propos", "Bêta", "CGU", "Contact"].map((l) => (
              <a key={l} href="#" className="text-sm text-white/60 hover:text-white">{l}</a>
            ))}
          </div>
          <div className="text-xs text-white/30 text-center mt-8">
            © 2026 Konnekt · Yobbanté Sénégal
          </div>
        </div>
      </footer>
    </div>
  );
}
