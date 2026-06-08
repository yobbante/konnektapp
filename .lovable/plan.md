## Objectif

Corriger la liste GP de `/admin/beta-tracking` pour : (1) afficher les **vraies références**, (2) ne plus rendre des GP invisibles comme Tiyah, (3) ajouter un **tri intelligent**, une **ligne dépliable** avec toutes les infos + le tracking horodaté, et un **bouton WhatsApp** pour réclamer les compléments de dossier.

## Diagnostic (déjà confirmé en base)

- La liste lit uniquement `gp_profiles`. La réf affichée est fabriquée (`GP` + 4 chars de l'UUID) — ce ne sont pas les vraies réfs.
- Les vraies réfs existent dans `gp_profiles.reference` (souvent vide), et surtout dans la table `transporteurs` (réfs Yobbanté: `GP7880`…) et `gp_onboarding_events.ref_gp` (`GP9391`, `GP9779`…).
- « Tiyah » n'existe nulle part dans la base Konnekt (aucun profil créé après 11:20 aujourd'hui). Décision retenue : la liste fusionnera **profils Konnekt + GP référencés Yobbanté (`transporteurs`)**, sans inclure les simples ouvertures de lien.

## Modifications (uniquement `src/pages/AdminBetaTracking.tsx`)

### 1. Chargement des données
- Charger en plus la table `transporteurs` (`reference, prenom, nom, telephone_1, telephone_2, navettes, created_at, welcome_sent_at`) et `gp_onboarding_events` (`ref_gp, event, occurred_at`).
- Construire une liste **unifiée**, dédupliquée par référence :
  - Source A = `gp_profiles` (profil complet : ville, statut, missions, KYC, téléphone…).
  - Source B = `transporteurs` (GP invités Yobbanté pas encore profil complet) — ajoutés seulement si leur réf n'est pas déjà couverte par un profil.
  - Réf affichée = `reference` réelle si disponible (profil ou transporteur), sinon fallback actuel.
  - Rapprochement profil↔transporteur par `reference` puis, à défaut, par téléphone normalisé.

### 2. Vraies références
- Colonne « Réf » = la vraie référence (`GP7880`, etc.). Plus de réf dérivée de l'UUID sauf absence totale d'info.

### 3. Tri intelligent
- En-têtes de colonnes cliquables (Réf, Nom, Ville, Inscrit le, Missions, Statut) avec tri asc/desc et indicateur de flèche.
- Tri par défaut : date d'inscription décroissante.
- Conserver les filtres existants Tous / Inscrits / Non inscrits, + ajout d'un onglet « Yobbanté (non inscrits) » pour les réfs présentes seulement dans `transporteurs`.

### 4. Ligne dépliable (clic)
- Au clic sur une ligne, dépliage d'un panneau détail affichant :
  - Identité : prénom/nom, business_name, téléphone(s)/WhatsApp, ville, pays, navettes/itinéraires.
  - Statut & dossier : statut, `kyc_status`/`kyc_level`, abonnement, total missions, note, source beta.
  - **Tracking horodaté** : timeline construite depuis `gp_onboarding_events` filtrée sur la réf (lien ouvert, inscrit…) + date de création + `welcome_sent_at`, chaque étape avec heure (`toLocaleString fr-FR`).
- Animation de dépliage légère (conforme au standard, sans jitter).

### 5. Bouton compléments de dossier
- Dans le panneau détail : bouton **« Demander compléments (WhatsApp) »** qui ouvre `wa.me/<téléphone normalisé>` avec un message pré-rempli listant les pièces manquantes (template court). Aucun enregistrement en base.
- Bouton désactivé si aucun numéro disponible.

## Hors périmètre
- Pas de migration ni de modification de schéma.
- Pas de changement à la logique d'onboarding, de soumission ou de tracking côté `OnboardingGP`.
- Aucune autre section du dashboard touchée.

## Note sur Tiyah
Comme aucune donnée « Tiyah » n'existe côté Konnekt, elle n'apparaîtra que si son inscription a créé un profil ou une entrée `transporteurs`. Après ce correctif, tout GP présent dans l'une de ces deux tables sera visible avec sa vraie réf ; si Tiyah reste absente, c'est que son inscription n'a rien écrit côté Konnekt (problème côté flux d'inscription, à traiter séparément).
