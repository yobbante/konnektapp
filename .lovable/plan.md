
# Refonte landing page Konnekt — corporate, épurée, interactive

## Direction visuelle

- **Style** : corporate fintech / logistique premium (référence : Linear, Stripe, Maersk).
- **Palette** : light mode (blanc + crème + foncé `hsl(220 20% 20%)`), accent teal `--primary` et orange `--secondary` parcimonieux.
- **Typo** : Inter, hiérarchie tranchée — display 56-72px, corps 15-16px, tracking serré sur les titres.
- **Zéro emoji** partout. Toutes les icônes via Lucide (`Truck`, `Ship`, `Plane`, `Bike`, `Luggage`, `Building2`, `Car`, `Zap`).
- **Motifs** : grille fine (1px borders), cartes plates avec hover subtil, lignes de séparation, pas de gradient lourd.

## Concept éditorial : "K · O · N · N · E · K · T"

Les 7 lettres du logo deviennent un fil narratif. Chaque lettre porte un mot-clé corporate qui s'enchaîne en scroll :

```
K — Kinetic       (mouvement temps réel)
O — Operate       (opérations multi-modes)
N — Network       (réseau de transporteurs)
N — Native        (mobile-first Sénégal/Afrique)
E — Earnings      (paiements garantis)
K — Konnect       (mise en relation instantanée)
T — Trust         (KYC, escrow, assurance)
```

Affiché en bandeau sticky vertical à gauche sur desktop, et en frise horizontale animée sur mobile.

## Structure des sections (8 blocs)

1. **Hero minimal**
   - Eyebrow "BÊTA · Sénégal" + titre énorme `Le transport, connecté.`
   - Sous-titre 1 phrase + 2 CTA (Télécharger l'app / Rejoindre la bêta).
   - Pas de stats bruyants — 1 ligne discrète "200+ transporteurs · 8 modes · 5 régions".

2. **Bandeau lettres K-O-N-N-E-K-T** (interactif)
   - Frise horizontale, chaque lettre cliquable → scroll-spy qui surligne la lettre active.
   - Sur desktop : barre fixe à gauche pendant tout le scroll.

3. **Les 8 services** (grille interactive)
   - Source : `transportConfig` (express, routier, maritime, aérien, voyageur GP, agence, bagages international, mobility).
   - Cartes uniformes avec icône Lucide, titre, description courte, micro-stat (ex : "Délai moyen 24h").
   - Hover : ligne d'accent + flèche révélée. Mobile : grid 2 cols.

4. **Pour qui ?** (toggle Transporteurs / Entreprises / Diaspora)
   - Tabs élégants ; le contenu change avec 3 bénéfices ciblés par audience.

5. **Comment ça marche** (3 étapes minimalistes)
   - Numérotation type "01 / 02 / 03", lignes verticales, pas de cercles colorés.

6. **Preuve & confiance**
   - Logos partenaires (placeholders), 3 témoignages courts en carousel, badges "KYC vérifié · Escrow · Assurance".

7. **CTA final** (bandeau pleine largeur teal)
   - Single-focus : téléchargement app + lien bêta.

8. **Footer corporate**
   - 4 colonnes : Produit, Services, Entreprise, Légal. Bandeau bas avec mention `by Yobbanté`.

## Interactions / animations

- Apparition au scroll (fade + translate, 200ms, easing standard).
- Scroll-spy lettres K-O-N-N-E-K-T ↔ sections.
- Hover cartes services : élévation discrète + traînée d'accent.
- Marquee des modes en hero : conservée mais sans emoji, uniquement icônes Lucide + label.
- Aucune librairie nouvelle : Tailwind + animations CSS existantes (`animate-fade-up`, `animate-marquee`).

## Implémentation technique

- Réécriture complète de `src/pages/KonnektLanding.tsx`.
- Création de petits sous-composants colocalisés en haut du fichier (ServiceCard, LetterRail, AudienceTabs, StepRow).
- Tokens : uniquement variables sémantiques (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`, `text-secondary`, `text-transport-*`).
- Icônes pour les 8 services tirées directement de `transportConfig[type].icon`.
- Aucune modification des routes, du backend, ni des autres pages.
- Mobile-first (viewport 390px), desktop ≥768px enrichit avec rail latéral des lettres.

## Hors scope

- Pas de changement de copy stratégique (on garde la promesse actuelle).
- Pas de nouvelles routes ni d'images générées.
- Pas de modification des sections `/beta`, `/auth`, `/app`.
