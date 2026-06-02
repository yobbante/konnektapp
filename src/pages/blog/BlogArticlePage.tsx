/**
 * Blog Konnekt — SEO articles (config-driven, mobile-first).
 * Each article: unique H1, keyword-rich intro, internal links, CTA.
 */
import { Helmet } from "react-helmet-async";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "lucide-react";

const GREEN = "#3DAA8A";
const NAVY = "#0D1B2A";

type Block =
  | { t: "p"; text: string }
  | { t: "list"; items: string[] }
  | { t: "faq"; items: { q: string; a: string }[] };

interface Section {
  h2: string;
  blocks: Block[];
}

interface RelatedLink {
  label: string;
  to: string;
}

interface Article {
  slug: string;
  seoTitle: string;
  description: string;
  h1: string;
  intro: string;
  sections: Section[];
  cta: { label: string; href: string };
  related: RelatedLink[];
}

const ARTICLES: Record<string, Article> = {
  "gp-dakar-paris": {
    slug: "gp-dakar-paris",
    seoTitle: "Comment devenir GP Dakar Paris avec Konnekt — Guide 2026",
    description:
      "Guide complet pour devenir GP Dakar-Paris avec Konnekt : définition, revenus, inscription en 2 minutes et FAQ. Transportez des colis dans vos bagages et soyez payé.",
    h1: "Devenir GP Dakar-Paris avec Konnekt : le guide complet",
    intro:
      "Devenir GP Dakar-Paris est l'une des meilleures façons de rentabiliser vos voyages entre le Sénégal et la France. Avec Konnekt, chaque trajet Dakar-Paris peut devenir une source de revenus en transportant des colis dans vos bagages. Voici le guide complet 2026 pour devenir GP Dakar-Paris.",
    sections: [
      {
        h2: "Qu'est-ce qu'un GP ?",
        blocks: [
          {
            t: "p",
            text: "Un GP (Grand Porteur) est un voyageur qui transporte des colis dans ses bagages lors de ses voyages internationaux. Sur Dakar-Paris, les GPs permettent d'envoyer des colis en 3 à 5 jours pour un prix bien inférieur aux transporteurs classiques.",
          },
          {
            t: "p",
            text: "Le rôle du GP est simple : il déclare son voyage, indique la capacité de bagages disponible, collecte les colis avant le départ et les remet à destination. Pour mieux comprendre le métier, consultez notre définition complète du Grand Porteur.",
          },
        ],
      },
      {
        h2: "Pourquoi devenir GP avec Konnekt ?",
        blocks: [
          {
            t: "p",
            text: "Konnekt connecte les voyageurs réguliers Dakar-Paris avec des particuliers qui ont des colis à envoyer. En tant que GP Konnekt, vous recevez des demandes directement dans votre dashboard et êtes payé après chaque livraison.",
          },
          {
            t: "p",
            text: "Vous gardez le contrôle total : vous acceptez uniquement les colis qui vous conviennent, vous fixez votre disponibilité et vous bénéficiez d'un paiement sécurisé via Wave ou Orange Money après chaque mission réussie.",
          },
        ],
      },
      {
        h2: "Combien peut gagner un GP ?",
        blocks: [
          {
            t: "p",
            text: "Sur un trajet Dakar-Paris avec 20kg disponibles, un GP peut gagner entre 50 000 et 120 000 FCFA par voyage. Les revenus dépendent du poids transporté, de la fréquence de vos trajets et du type de colis.",
          },
          {
            t: "p",
            text: "Pour les voyageurs réguliers qui font plusieurs allers-retours Dakar-Paris par mois, l'activité de GP peut représenter un revenu complémentaire significatif, voire un revenu principal.",
          },
        ],
      },
      {
        h2: "Comment s'inscrire ?",
        blocks: [
          {
            t: "p",
            text: "L'inscription prend moins de 2 minutes sur usekonnekt.com. Le formulaire est simple, sans mot de passe. Notre équipe active votre compte sous 24h par WhatsApp, puis vous accédez à votre dashboard web et au bot WhatsApp pour gérer vos missions.",
          },
          {
            t: "p",
            text: "Une fois validé, vous publiez vos trajets Dakar-Paris avec vos dates et votre capacité. Les expéditeurs réservent, vous acceptez ce qui vous convient, puis vous collectez et transportez les colis. Après chaque livraison confirmée, votre paiement est libéré automatiquement par Wave ou Orange Money, sans avance ni risque.",
          },
        ],
      },
      {
        h2: "FAQ GP Dakar-Paris",
        blocks: [
          {
            t: "faq",
            items: [
              {
                q: "Combien de kilos peut-on transporter ?",
                a: "En général 23kg de bagages enregistrés sur les vols Dakar-Paris.",
              },
              {
                q: "Est-ce légal ?",
                a: "Oui, tant que les articles respectent la réglementation douanière.",
              },
            ],
          },
        ],
      },
    ],
    cta: { label: "Devenir GP Konnekt →", href: "/beta" },
    related: [
      { label: "Qu'est-ce qu'un Grand Porteur (GP) ?", to: "/blog/grand-porteur-definition" },
      { label: "Envoyer un colis Dakar-Paris : prix et délais", to: "/blog/envoyer-colis-dakar-paris" },
      { label: "Konnekt Sénégal : la marketplace des transporteurs", to: "/blog/konnekt-senegal" },
    ],
  },

  "envoyer-colis-dakar-paris": {
    slug: "envoyer-colis-dakar-paris",
    seoTitle: "Envoyer un colis Dakar Paris — Prix et délais 2026",
    description:
      "Envoyer un colis de Dakar à Paris en 2026 : comparatif des prix et délais entre GP Konnekt, DHL et Colissimo. Conseils pratiques et liste de ce que vous pouvez envoyer.",
    h1: "Envoyer un colis de Dakar à Paris : prix, délais et conseils",
    intro:
      "Envoyer un colis de Dakar à Paris peut coûter cher avec les transporteurs classiques. Heureusement, les GPs (Grands Porteurs) offrent une alternative moins chère et souvent plus rapide. Voici le comparatif 2026 des prix et délais pour envoyer un colis Dakar-Paris.",
    sections: [
      {
        h2: "Les options pour envoyer",
        blocks: [
          {
            t: "p",
            text: "Les GPs permettent d'envoyer des colis moins cher et souvent plus vite que les transporteurs classiques. Vous avez le choix entre les Grands Porteurs, les services express internationaux et la poste traditionnelle.",
          },
          {
            t: "p",
            text: "Pour la diaspora sénégalaise, le GP est devenu la solution préférée : il combine un coût réduit, des délais courts et une remise en main propre du colis à un proche. Là où les transporteurs classiques facturent au tarif fort et imposent des formalités, le GP voyage de toute façon et partage simplement la capacité disponible dans ses bagages.",
          },
          {
            t: "p",
            text: "Le choix dépend de votre priorité : si vous cherchez le prix le plus bas et un délai raisonnable, le GP est imbattable. Si vous avez besoin d'une livraison en 24 à 48h pour un envoi urgent, l'express international reste une option, mais à un coût nettement supérieur.",
          },
        ],
      },
      {
        h2: "Prix pour 1kg Dakar-Paris",
        blocks: [
          {
            t: "list",
            items: [
              "GP Konnekt : 3-5 jours · à partir de 12 200 FCFA/kg",
              "DHL Express : 1-2 jours · 80 000+ FCFA/kg",
              "Colissimo : 5-7 jours · 35 000+ FCFA/kg",
            ],
          },
          {
            t: "p",
            text: "Le GP reste l'option la plus économique pour un excellent rapport prix/délai. Pour comprendre qui transporte votre colis, découvrez comment devenir GP Dakar-Paris.",
          },
        ],
      },
      {
        h2: "Comment envoyer avec Yobbanté ?",
        blocks: [
          {
            t: "p",
            text: "Soumettez votre demande sur yobbante.com. Un GP partenaire est assigné. Vous payez par Wave ou Orange Money après la pesée. Le processus est simple, transparent et sécurisé du dépôt jusqu'à la livraison.",
          },
        ],
      },
      {
        h2: "Que peut-on envoyer ?",
        blocks: [
          {
            t: "list",
            items: [
              "Vêtements",
              "Chaussures",
              "Électronique",
              "Médicaments",
              "Alimentaire non périssable",
              "Cosmétiques",
              "Documents",
            ],
          },
          {
            t: "p",
            text: "Certains articles restent interdits ou réglementés : produits dangereux, liquides inflammables, denrées périssables et marchandises soumises à des restrictions douanières. En cas de doute, vérifiez toujours la réglementation avant de confier votre colis à un GP.",
          },
        ],
      },
      {
        h2: "Conseils pour bien envoyer",
        blocks: [
          {
            t: "p",
            text: "Emballez soigneusement vos affaires dans un sac ou un carton solide, indiquez clairement le contenu et le destinataire, et déclarez la valeur réelle des objets. Un colis bien préparé passe la douane plus facilement et arrive en bon état.",
          },
          {
            t: "p",
            text: "Anticipez les périodes de forte demande comme les fêtes ou les vacances : les places de GP partent vite et les prix peuvent grimper. Réserver tôt vous garantit un meilleur tarif et un départ rapide. Pour devenir vous-même transporteur, lisez notre guide pour devenir GP Dakar-Paris.",
          },
        ],
      },
    ],
    cta: { label: "Envoyer mon colis →", href: "https://yobbante.com" },
    related: [
      { label: "Devenir GP Dakar-Paris : le guide complet", to: "/blog/gp-dakar-paris" },
      { label: "Qu'est-ce qu'un Grand Porteur (GP) ?", to: "/blog/grand-porteur-definition" },
      { label: "Konnekt Sénégal : la marketplace des transporteurs", to: "/blog/konnekt-senegal" },
    ],
  },

  "konnekt-senegal": {
    slug: "konnekt-senegal",
    seoTitle: "Konnekt Sénégal — Marketplace des transporteurs",
    description:
      "Konnekt Sénégal est la marketplace de transport basée à Dakar qui connecte GPs, routiers, fret maritime et aérien avec les expéditeurs et la diaspora sénégalaise.",
    h1: "Konnekt Sénégal : la plateforme qui connecte transporteurs et expéditeurs",
    intro:
      "Konnekt Sénégal est la marketplace de transport née à Dakar qui connecte tous les types de transporteurs avec les expéditeurs. Que vous soyez GP, routier, transporteur maritime ou aérien, Konnekt vous met en relation avec ceux qui ont besoin d'envoyer.",
    sections: [
      {
        h2: "Konnekt, c'est quoi ?",
        blocks: [
          {
            t: "p",
            text: "Marketplace de transport basée à Dakar connectant tous types de transporteurs avec les expéditeurs. GPs, routiers, fret maritime et aérien, coursiers : Konnekt rassemble tous les modes de transport sur une seule plateforme.",
          },
          {
            t: "p",
            text: "Chaque transporteur est vérifié, noté et suivi pour garantir la fiabilité. Pour mieux comprendre l'acteur clé de l'écosystème, lisez notre définition du Grand Porteur.",
          },
          {
            t: "p",
            text: "Née au Sénégal, Konnekt répond à un besoin concret : rendre le transport de colis simple, abordable et fiable entre l'Afrique de l'Ouest et le reste du monde. La plateforme centralise les demandes, organise la mise en relation et sécurise les paiements, ce qui supprime l'incertitude des arrangements informels.",
          },
        ],
      },
      {
        h2: "Konnekt et la diaspora",
        blocks: [
          {
            t: "p",
            text: "La diaspora sénégalaise en France, aux États-Unis et au Canada est au cœur de l'activité de Konnekt. Les échanges réguliers entre le Sénégal et ces pays créent une demande forte pour le transport de colis fiable et abordable.",
          },
          {
            t: "p",
            text: "Grâce aux GPs, la diaspora peut envoyer et recevoir des colis rapidement. Découvrez comment envoyer un colis Dakar-Paris ou devenir GP Dakar-Paris.",
          },
        ],
      },
      {
        h2: "Les destinations",
        blocks: [
          {
            t: "p",
            text: "Paris, Lyon, Marseille, New York, Montréal, Dubai, Abidjan, Douala et 25+ destinations. Le réseau Konnekt couvre les principaux corridors de la diaspora et du commerce ouest-africain.",
          },
          {
            t: "p",
            text: "Chaque corridor a ses spécificités : l'axe Dakar-Paris est le plus actif grâce aux nombreux vols quotidiens, tandis que les liaisons vers New York et Montréal répondent aux besoins de la diaspora nord-américaine. Vers Dubai, Abidjan et Douala, Konnekt facilite aussi bien le transport personnel que le petit commerce.",
          },
        ],
      },
      {
        h2: "Tous les modes de transport",
        blocks: [
          {
            t: "p",
            text: "Au-delà des GPs, Konnekt rassemble les transporteurs routiers pour le fret terrestre en Afrique de l'Ouest, le fret maritime pour les conteneurs et gros volumes, le fret aérien pour les envois rapides et les coursiers pour la livraison urbaine. Cette approche multimodale fait de Konnekt une plateforme unique au Sénégal.",
          },
          {
            t: "p",
            text: "Que vous soyez un particulier qui envoie un colis ou un professionnel qui expédie régulièrement, vous trouvez sur Konnekt le mode de transport adapté à votre budget et à votre délai. Pour comprendre le rôle central du GP, lisez notre définition du Grand Porteur.",
          },
        ],
      },
    ],
    cta: { label: "Rejoindre Konnekt →", href: "/beta" },
    related: [
      { label: "Devenir GP Dakar-Paris : le guide complet", to: "/blog/gp-dakar-paris" },
      { label: "Envoyer un colis Dakar-Paris : prix et délais", to: "/blog/envoyer-colis-dakar-paris" },
      { label: "Qu'est-ce qu'un Grand Porteur (GP) ?", to: "/blog/grand-porteur-definition" },
    ],
  },

  "grand-porteur-definition": {
    slug: "grand-porteur-definition",
    seoTitle: "Grand Porteur GP : définition et fonctionnement",
    description:
      "Grand Porteur (GP) : définition, rôle et fonctionnement. Découvrez comment un GP transporte des colis dans ses bagages et pourquoi c'est 50-70% moins cher qu'un transporteur classique.",
    h1: "Qu'est-ce qu'un Grand Porteur (GP) ? Définition et rôle",
    intro:
      "Le terme Grand Porteur (GP) revient souvent dans le transport de colis entre l'Afrique et le reste du monde. Mais qu'est-ce qu'un Grand Porteur exactement ? Voici la définition complète et le fonctionnement d'un GP.",
    sections: [
      {
        h2: "Définition d'un GP",
        blocks: [
          {
            t: "p",
            text: "Un Grand Porteur est un particulier qui voyage régulièrement entre deux pays et transporte des colis dans ses bagages contre rémunération. C'est un maillon essentiel du transport informel devenu professionnel grâce à des plateformes comme Konnekt.",
          },
          {
            t: "p",
            text: "Le terme « Grand Porteur » est particulièrement répandu au sein de la diaspora africaine, où l'envoi de colis vers le pays d'origine est une pratique courante. Le GP profite de ses bagages autorisés pour rendre service tout en générant un revenu complémentaire à chaque voyage.",
          },
        ],
      },
      {
        h2: "Comment fonctionne un GP ?",
        blocks: [
          {
            t: "p",
            text: "Le GP déclare son voyage avec sa capacité disponible. Les expéditeurs réservent de l'espace. Le GP collecte, transporte et remet les colis. Le paiement est sécurisé et libéré après la livraison.",
          },
          {
            t: "p",
            text: "Sur un corridor populaire comme Dakar-Paris, le GP peut transporter jusqu'à 23kg de colis par voyage. Voyez notre guide pour devenir GP Dakar-Paris.",
          },
        ],
      },
      {
        h2: "GP vs transporteur classique",
        blocks: [
          {
            t: "list",
            items: [
              "Prix : GP 50-70% moins cher",
              "Délai : GP 3-7 jours",
              "Flexibilité : GP très élevée",
            ],
          },
          {
            t: "p",
            text: "Pour comparer concrètement les options, consultez notre comparatif des prix et délais pour envoyer un colis Dakar-Paris. La différence de prix s'explique simplement : le GP voyage de toute manière et ne facture que l'espace partagé, sans les frais fixes d'un transporteur professionnel.",
          },
        ],
      },
      {
        h2: "Le GP est-il fiable ?",
        blocks: [
          {
            t: "p",
            text: "La principale crainte des expéditeurs concerne la fiabilité. C'est précisément ce que résolvent les plateformes comme Konnekt : chaque GP est identifié, vérifié et noté. Le paiement est sécurisé et n'est libéré qu'une fois le colis livré, ce qui protège à la fois l'expéditeur et le transporteur.",
          },
          {
            t: "p",
            text: "Cette professionnalisation transforme une pratique autrefois informelle en un véritable service de transport. Le GP devient un acteur de confiance, suivi du dépôt jusqu'à la remise finale du colis à destination.",
          },
        ],
      },
      {
        h2: "Comment devenir GP ?",
        blocks: [
          {
            t: "p",
            text: "Devenir GP est accessible à tout voyageur régulier. Il suffit de s'inscrire en quelques minutes, de déclarer ses trajets et sa capacité disponible, puis d'accepter les colis proposés. Pour vous lancer, suivez notre guide complet pour devenir GP Dakar-Paris ou rejoignez directement le réseau Konnekt.",
          },
        ],
      },
    ],
    cta: { label: "Devenir GP sur Konnekt →", href: "/beta" },
    related: [
      { label: "Devenir GP Dakar-Paris : le guide complet", to: "/blog/gp-dakar-paris" },
      { label: "Envoyer un colis Dakar-Paris : prix et délais", to: "/blog/envoyer-colis-dakar-paris" },
      { label: "Konnekt Sénégal : la marketplace des transporteurs", to: "/blog/konnekt-senegal" },
    ],
  },
};

function CTAButton({ label, href }: { label: string; href: string }) {
  const isExternal = href.startsWith("http");
  const cls =
    "inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-xl font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95";
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={{ backgroundColor: GREEN }}>
        {label}
      </a>
    );
  }
  return (
    <Link to={href} className={cls} style={{ backgroundColor: GREEN }}>
      {label}
    </Link>
  );
}

export default function BlogArticlePage() {
  const { slug = "" } = useParams();
  const article = ARTICLES[slug];
  if (!article) return <Navigate to="/" replace />;

  const canonical = `https://usekonnekt.com/blog/${article.slug}`;

  const faqSection = article.sections.find((s) => s.blocks.some((b) => b.t === "faq"));
  const faqBlock = faqSection?.blocks.find((b): b is Extract<Block, { t: "faq" }> => b.t === "faq");

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.h1,
    description: article.description,
    author: { "@type": "Organization", name: "Konnekt" },
    publisher: { "@type": "Organization", name: "Konnekt" },
    mainEntityOfPage: canonical,
  };

  const faqJsonLd = faqBlock
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqBlock.items.map((qa) => ({
          "@type": "Question",
          name: qa.q,
          acceptedAnswer: { "@type": "Answer", text: qa.a },
        })),
      }
    : null;

  return (
    <div className="min-h-screen bg-white" style={{ color: NAVY }}>
      <Helmet>
        <title>{article.seoTitle}</title>
        <meta name="description" content={article.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={article.seoTitle} />
        <meta property="og:description" content={article.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify(articleJsonLd)}</script>
        {faqJsonLd && <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>}
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-gray-400" />
            <span
              className="w-7 h-7 rounded-md grid place-items-center font-bold text-sm text-white"
              style={{ backgroundColor: GREEN }}
            >
              K
            </span>
            <span className="font-bold text-[15px] tracking-tight">KONNEKT</span>
          </Link>
          <Link
            to="/beta"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white rounded-lg px-3.5 min-h-[40px]"
            style={{ backgroundColor: GREEN }}
          >
            Rejoindre <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: GREEN }}>
          Blog Konnekt
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mt-3">
          {article.h1}
        </h1>
        <p className="text-base md:text-lg text-[#0D1B2A]/70 mt-5 leading-relaxed">{article.intro}</p>

        {article.sections.map((section, si) => (
          <section key={si} className="mt-10">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">{section.h2}</h2>
            <div className="mt-4 space-y-4">
              {section.blocks.map((block, bi) => {
                if (block.t === "p") {
                  return (
                    <p key={bi} className="text-base text-[#0D1B2A]/80 leading-relaxed">
                      {block.text}
                    </p>
                  );
                }
                if (block.t === "list") {
                  return (
                    <ul key={bi} className="space-y-2">
                      {block.items.map((it, ii) => (
                        <li key={ii} className="flex items-start gap-2 text-base text-[#0D1B2A]/80">
                          <span
                            className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: GREEN }}
                          />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <div key={bi} className="space-y-4">
                    {block.items.map((qa, qi) => (
                      <div key={qi} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="font-semibold text-[#0D1B2A]">{qa.q}</p>
                        <p className="text-[#0D1B2A]/75 mt-1.5">{qa.a}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* CTA */}
        <div
          className="mt-12 rounded-2xl p-6 md:p-8 text-center"
          style={{ backgroundColor: NAVY }}
        >
          <p className="text-white font-bold text-lg md:text-xl">Prêt à passer à l'action ?</p>
          <div className="mt-5">
            <CTAButton label={article.cta.label} href={article.cta.href} />
          </div>
        </div>

        {/* Related */}
        <nav className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0D1B2A]/60">
            À lire aussi
          </p>
          <ul className="mt-4 space-y-2.5">
            {article.related.map((r) => (
              <li key={r.to}>
                <Link
                  to={r.to}
                  className="inline-flex items-center gap-2 text-base font-medium hover:underline"
                  style={{ color: GREEN }}
                >
                  <ArrowRight className="w-4 h-4" />
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </div>
  );
}
