# Plan — Déblocage complet Konnekt (lancement 01/07/2026)

Requête lourde en 8 parties. Avant d'attaquer, j'ai besoin de clarifications structurelles, sinon je vais devoir faire des hypothèses qui risquent de casser des choses ou de produire du faux.

## Ce que je peux faire en confiance

**Partie 5 — Recentrage marque (landing + /beta)**
Modifs purement textuelles sur `KonnektLanding.tsx` et `BetaLandingPage.tsx`. Pas d'ambiguïté.

**Partie 6 — SEO**
- `index.html` pour le sitewide (titre + description par défaut + og + canonical).
- Installation `react-helmet-async` + `HelmetProvider` dans `main.tsx`.
- `<Helmet>` par page sur `/`, `/beta`, `/gp`.

**Partie 7 — /gp/connexion**
- Renommer la route `/gp/login` (actuellement `KonnektGPLogin`) en `/gp/connexion` (garder l'ancienne en redirect).
- Vérifier qu'aucune route `/gp/:slug` ne capture `connexion`/`dashboard`/`profil`/`missions`/`departs`.
- Pointer "J'ai déjà un compte" sur `/gp` vers `/gp/connexion`.

**Partie 4 — Sélecteur pays téléphone**
Utiliser `src/lib/phoneCountryCodes.ts` qui existe déjà. Détection via `navigator.language` (FR→+33, US→+1, défaut→+221). Appliqué sur `/beta` et `/gp/connexion`.

**Partie 8 — Devise auto via indicatif**
Mapping indicatif→devise au moment du signup/login, stocké dans `gp_profiles` (colonne `currency` à ajouter si absente — je vérifierai avant).

**Partie 2 — Date de lancement & verrou**
- Maj `app_lock_settings.launch_at` → 2026-07-01.
- Désactiver `is_locked` (la plateforme doit être accessible).
- Le composant `SiteLock` reste en place mais inactif tant que `is_locked=false`.

## Ce qui nécessite des décisions de votre part

### A. Partie 1 — "Débloquer tous les modes de transport"

Le projet a un flag global `GP_ONLY_MODE = true` dans `src/config/featureFlags.ts` qui filtre routier/maritime/aérien/mobility partout (navigation, dashboards, recherche, etc.). Il y a aussi une mémoire projet `GP ONLY MODE filtering` qui documente ce comportement comme intentionnel.

**Question 1 :** Je passe `GP_ONLY_MODE = false` globalement ? Cela réactive d'un coup :
- Tous les onglets transport (routier, maritime, aérien, mobility) dans les nav clients/transporteurs
- Toutes les pages `/routier/*`, `/maritime/*`, `/aerien/*`, `/mobility/*` dans la home
- L'admin board complet
- Les sélecteurs de mode dans les formulaires

Risque : ces modules existent mais n'ont jamais été testés en lancement réel. Je recommande oui mais je veux votre validation explicite avant de toucher le flag.

### B. Partie 1 — Formulaire /beta multi-rôles

Aujourd'hui `/beta` capture **uniquement des GP** (nom, téléphone, ville, trajets). Vous demandez d'ajouter 4 rôles : GP / Transporteur Pro / Particulier / Entreprise.

**Question 2 :** Que se passe-t-il quand un "Particulier" ou une "Entreprise" s'inscrit sur `/beta` ?
- Option a) Sélecteur de rôle en haut + le même formulaire simplifié (juste tag différent en DB) → rapide.
- Option b) 4 formulaires distincts avec champs spécifiques (SIRET pour entreprise, etc.) → grosse refonte.

Je pars sur (a) sauf indication contraire — un champ `role` ajouté à la table `beta_requests` (ou équivalent) + tag.

### C. Partie 3 — Chiffres réels sur /gp

Les tables `transporteurs` et `dossiers` mentionnées **n'existent pas** dans ce projet. Les équivalents sont :
- `gp_profiles` (avec `status='verified'` ≈ actif)
- `orders` ou `bookings` (avec un état "livré")

**Question 3 :** Je mappe ainsi ?
- "Transporteurs actifs" = `count(gp_profiles WHERE status='verified')`
- "Livraisons réalisées" = `count(orders WHERE status='delivered')` (ou équivalent — je vérifierai le nom exact)
- "Pays couverts" = pays distincts dans les trajets actifs des GP vérifiés

Et fetch côté client via Supabase au chargement de `/gp`, avec fallback "—" si 0.

## Ordre d'exécution proposé (après vos réponses)

1. Partie 2 (verrou off, date)
2. Partie 1A (flag + navigation) — sous réserve Q1
3. Partie 1B (formulaire beta multi-rôles) — sous réserve Q2
4. Partie 7 (route /gp/connexion)
5. Partie 4 (sélecteur téléphone)
6. Partie 8 (devise auto + migration colonne si besoin)
7. Partie 3 (chiffres réels) — sous réserve Q3
8. Partie 5 (textes marque)
9. Partie 6 (SEO + Helmet)

Répondez aux 3 questions et j'enchaîne tout d'une traite.
