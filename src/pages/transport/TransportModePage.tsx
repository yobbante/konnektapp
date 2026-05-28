import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Luggage, Truck, Ship, Plane, Bike, Building2,
  Check, type LucideIcon,
} from "lucide-react";

type ModeConfig = {
  slug: string;
  icon: LucideIcon;
  hero: { title: string; subtitle: string };
  steps: string[];
  advantages: string[];
  pricing: { label: string; lines: { k: string; v: string }[]; note?: string };
  seo: { title: string; description: string };
};

export const TRANSPORT_MODES: Record<string, ModeConfig> = {
  "gp-bagages": {
    slug: "gp-bagages",
    icon: Luggage,
    hero: {
      title: "Vous voyagez. On remplit vos bagages autorisés.",
      subtitle: "Transportez des colis dans vos bagages accompagnés et gagnez sur chaque trajet.",
    },
    steps: [
      "Déclarez votre prochain voyage",
      "Recevez des colis à transporter",
      "Livrez et soyez payé à l'arrivée",
    ],
    advantages: [
      "Revenus complémentaires sur vos voyages",
      "Colis vérifiés et assurés",
      "Paiement Wave ou Orange Money",
      "Support 24h",
    ],
    pricing: {
      label: "Revenus estimés par trajet",
      lines: [
        { k: "Paris → Dakar · 23 kg", v: "37 000 – 69 000 FCFA" },
        { k: "New York → Dakar · 23 kg", v: "46 000 – 92 000 FCFA" },
        { k: "Dubai → Dakar · 23 kg", v: "42 000 – 83 000 FCFA" },
      ],
      note: "Selon le tarif négocié avec l'opérateur partenaire.",
    },
    seo: {
      title: "GP Bagages Konnekt — Transportez et gagnez sur vos voyages",
      description:
        "Rejoignez le réseau GP Konnekt. Transportez des colis dans vos bagages et gagnez sur chaque trajet Dakar-Paris, Dakar-New York, Dakar-Dubai.",
    },
  },
  "routier": {
    slug: "routier",
    icon: Truck,
    hero: {
      title: "Transport routier longue distance, simplifié.",
      subtitle: "Gérez vos trajets, vos clients et vos paiements depuis une seule plateforme.",
    },
    steps: [
      "Publiez vos trajets disponibles",
      "Recevez des demandes de chargement",
      "Confirmez et soyez payé à livraison",
    ],
    advantages: [
      "Remplissez vos camions à chaque trajet",
      "Tarification flexible",
      "Suivi GPS intégré (à venir)",
      "Facturation automatique",
    ],
    pricing: {
      label: "Modèle de commission",
      lines: [
        { k: "Commission Konnekt", v: "8 % par livraison" },
        { k: "Abonnement mensuel", v: "Aucun" },
        { k: "Premier mois", v: "Offert" },
      ],
    },
    seo: {
      title: "Transport Routier Konnekt — Gestion trajets Afrique",
      description:
        "Plateforme transport routier Afrique de l'Ouest. Gérez vos trajets, clients et paiements depuis Konnekt.",
    },
  },
  "maritime": {
    slug: "maritime",
    icon: Ship,
    hero: {
      title: "Fret maritime depuis et vers l'Afrique de l'Ouest.",
      subtitle: "Optimisez le remplissage de vos conteneurs et augmentez votre chiffre d'affaires.",
    },
    steps: [
      "Déclarez vos capacités disponibles",
      "Recevez des demandes de fret",
      "Gérez les documents et paiements",
    ],
    advantages: [
      "Optimisation du remplissage conteneur",
      "Gestion documentaire simplifiée",
      "Réseau de 15+ ports desservis",
      "Paiement sécurisé",
    ],
    pricing: {
      label: "Tarification",
      lines: [
        { k: "Commission Konnekt", v: "5 % par fret" },
        { k: "Abonnement Pro", v: "25 000 FCFA / mois" },
        { k: "Frais Pro réduits", v: "2,5 %" },
      ],
    },
    seo: {
      title: "Fret Maritime Konnekt — Conteneurs Afrique de l'Ouest",
      description:
        "Optimisez le remplissage de vos conteneurs. Plateforme fret maritime Konnekt pour transporteurs et armateurs.",
    },
  },
  "aerien": {
    slug: "aerien",
    icon: Plane,
    hero: {
      title: "Fret aérien express vers le monde entier.",
      subtitle: "Proposez vos capacités cargo et recevez des envois urgents à forte valeur.",
    },
    steps: [
      "Publiez vos vols disponibles",
      "Recevez des demandes cargo",
      "Gérez l'embarquement et livrez",
    ],
    advantages: [
      "Accès aux expéditeurs premium",
      "Cargaisons assurées",
      "Documentation douanière assistée",
      "Paiement en 24h après livraison",
    ],
    pricing: {
      label: "Tarification",
      lines: [
        { k: "Commission Konnekt", v: "6 % par envoi" },
        { k: "Minimum garanti", v: "5 000 FCFA / envoi" },
      ],
    },
    seo: {
      title: "Fret Aérien Konnekt — Cargo express international",
      description:
        "Plateforme fret aérien Konnekt. Proposez vos capacités cargo et recevez des envois urgents internationaux.",
    },
  },
  "coursier": {
    slug: "coursier",
    icon: Bike,
    hero: {
      title: "Livraison urbaine rapide à Dakar et en Afrique.",
      subtitle: "Rejoignez le réseau de coursiers Konnekt et recevez des missions près de vous.",
    },
    steps: [
      "Activez votre disponibilité",
      "Recevez des missions à proximité",
      "Livrez et encaissez",
    ],
    advantages: [
      "Missions 7j/7",
      "Paiement quotidien Wave",
      "Couverture accident incluse",
      "Application mobile simple",
    ],
    pricing: {
      label: "Tarification",
      lines: [
        { k: "Commission Konnekt", v: "12 % par livraison" },
        { k: "Bonus ponctualité", v: "+5 %" },
        { k: "Frais d'inscription", v: "Aucun" },
      ],
    },
    seo: {
      title: "Coursiers Konnekt — Livraison urbaine Dakar & Afrique",
      description:
        "Rejoignez le réseau coursier Konnekt. Missions 7j/7, paiement quotidien Wave, couverture accident incluse.",
    },
  },
  "entreprise": {
    slug: "entreprise",
    icon: Building2,
    hero: {
      title: "Solutions logistiques B2B pour les entreprises africaines.",
      subtitle: "Gérez vos flux logistiques, vos transporteurs et vos coûts depuis une interface unifiée.",
    },
    steps: [
      "Configurez votre compte entreprise",
      "Publiez vos besoins logistiques",
      "Comparez et choisissez vos transporteurs",
    ],
    advantages: [
      "Tableau de bord dédié",
      "Facturation mensuelle consolidée",
      "API disponible",
      "Account manager dédié",
    ],
    pricing: {
      label: "Forfaits entreprise",
      lines: [
        { k: "Starter", v: "Gratuit jusqu'à 10 envois / mois" },
        { k: "Growth", v: "50 000 FCFA / mois" },
        { k: "Enterprise", v: "Sur devis" },
      ],
    },
    seo: {
      title: "Konnekt Entreprise — Logistique B2B Afrique",
      description:
        "Solutions logistiques B2B pour entreprises africaines. Tableau de bord, facturation consolidée, API et account manager dédié.",
    },
  },
};

export default function TransportModePage() {
  const { slug = "" } = useParams();
  const cfg = TRANSPORT_MODES[slug];
  if (!cfg) return <Navigate to="/" replace />;

  const Icon = cfg.icon;
  const canonical = `https://usekonnekt.com/transport/${cfg.slug}`;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Helmet>
        <title>{cfg.seo.title}</title>
        <meta name="description" content={cfg.seo.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={cfg.seo.title} />
        <meta property="og:description" content={cfg.seo.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Header minimal */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border safe-area-x">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-sm tracking-tight">K</span>
            <span className="font-bold text-[15px] tracking-tight">KONNEKT</span>
          </Link>
          <Link to="/beta">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-3.5 text-sm font-semibold shadow-sm min-h-[44px]">
              Rejoindre <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative px-4 pt-14 pb-16 md:pt-20 md:pb-20 border-b border-border overflow-hidden">
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 grid place-items-center mb-6">
            <Icon className="w-8 h-8 text-primary" strokeWidth={1.75} />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            {cfg.hero.title}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mt-5 leading-relaxed">
            {cfg.hero.subtitle}
          </p>
          <div className="mt-8">
            <Link
              to="/beta"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-6 py-3.5 font-semibold text-sm shadow-md hover:bg-primary/90 min-h-[44px]"
            >
              Rejoindre <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="px-4 py-16 md:py-20 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">Comment ça marche</p>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mt-3">En 3 étapes simples</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {cfg.steps.map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm">
                  {i + 1}
                </div>
                <p className="mt-4 text-base font-medium text-foreground leading-snug">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AVANTAGES */}
      <section className="px-4 py-16 md:py-20 border-b border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">Avantages</p>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mt-3">Pourquoi Konnekt</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
            {cfg.advantages.map((a, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 grid place-items-center flex-shrink-0">
                  <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
                </div>
                <p className="text-sm md:text-base font-medium text-foreground leading-snug pt-1">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="px-4 py-16 md:py-20 border-b border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">Pricing indicatif</p>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mt-3">{cfg.pricing.label}</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border shadow-sm">
            {cfg.pricing.lines.map((l) => (
              <div key={l.k} className="flex items-center justify-between px-5 py-4">
                <span className="text-sm md:text-base text-muted-foreground">{l.k}</span>
                <span className="text-sm md:text-base font-semibold text-foreground text-right">{l.v}</span>
              </div>
            ))}
          </div>
          {cfg.pricing.note && (
            <p className="mt-4 text-xs text-muted-foreground text-center">{cfg.pricing.note}</p>
          )}
          <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground text-center">
            Tarifs susceptibles de varier
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Rejoindre le réseau Konnekt
          </h2>
          <p className="mt-4 text-muted-foreground">
            Inscription gratuite, activation sous 24h via WhatsApp.
          </p>
          <div className="mt-8">
            <Link
              to="/beta"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-7 py-4 font-semibold text-sm shadow-md hover:bg-primary/90 min-h-[44px]"
            >
              Rejoindre Konnekt <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
