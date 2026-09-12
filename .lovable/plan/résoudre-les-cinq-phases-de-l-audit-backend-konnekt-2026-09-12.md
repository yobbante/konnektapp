# Résoudre les cinq phases de l’audit backend Konnekt

## Objectif
Appliquer les cinq phases sans perdre de données, casser les services existants ni bloquer le parcours bêta sans connexion. Ne pas publier pendant les corrections.

## Corrections au rapport initial
Le rapport date du 22 avril : ses recommandations de suppression ne reflètent plus les usages actuels. Les départs aériens et maritimes, trajets programmés, portefeuilles Mobility et historiques saisonniers sont encore utilisés. Leur suppression immédiate casserait ces services.

## Phase 1 — Intégrité et références partenaires
- Contrôler les relations manquantes et compter les données orphelines avant toute contrainte ; ne supprimer aucune donnée pour faire passer une migration.
- Ajouter les relations métier vérifiées, notamment commande–mission et demandes–propositions acceptées.
- Relier les identités aux profils publics lorsque cette correspondance est valide ; ne pas modifier le schéma d’authentification.
- Conserver les références polymorphiques documentées plutôt que leur imposer une relation incorrecte.
- Ajouter aux commandes la référence externe et les métadonnées partenaires, avec les index nécessaires.
- Ajouter l’origine applicative aux offres, notifications, litiges et avis, puis adapter leurs écritures sans attribuer arbitrairement les anciennes données à une application.

## Phase 2 — Intégrations partenaires sécurisées
- Créer le registre des partenaires, leurs clés hashées et leurs destinations de notification, avec accès administrateur limité et clés réservées au serveur.
- Reprendre la clé Yobbanté existante côté serveur sans l’exposer ni interrompre les échanges ; permettre sa rotation et sa révocation.
- Remplacer la reconnaissance codée en dur par une vérification dynamique : partenaire actif, droits par opération, quotas et protection contre les doublons.
- Persister référence externe et métadonnées lors de la création de commande.
- Prévoir les notifications partenaires avec signature, nouvelles tentatives et protection contre les destinations réseau privées ; aucun envoi tant qu’une destination autorisée n’est pas configurée.

## Phase 3 — Opérations métier atomiques
- Inventorier les règles existantes de prix, commission, capacité, devise et séquestre avant centralisation.
- Créer une seule opération serveur de création de commande, validée et autorisée, puis migrer les appels client, partenaires et missions.
- Centraliser l’annulation et le remboursement interne dans une transaction atomique, protégée contre les répétitions.
- Faire converger les chemins de libération des fonds vers une opération atomique commune ; conserver temporairement les anciennes entrées comme relais compatibles.
- Vérifier qu’un appel simultané ou répété ne débite, rembourse ou crédite jamais deux fois.

## Phase 4 — Consolidation sans casse
- Établir les correspondances des départs aériens/maritimes, trajets programmés, portefeuilles et historiques avant migration.
- Migrer les données et adapter tous leurs usages, y compris les fonctions, règles d’accès et écrans d’administration.
- Ne pas forcer un portefeuille Mobility dans un profil GP lorsque les identités ou devises ne correspondent pas : prévoir une représentation commune conservant ces distinctions.
- Comparer volumes, références et soldes avant/après ; conserver un retour arrière.
- Supprimer chaque ancienne table séparément uniquement après absence de dépendances et recette concluante ; soumettre les suppressions à approbation.

## Phase 5 — Historique unifié
- Créer un journal commun alimenté côté serveur pour les actions et changements d’état pertinents.
- Migrer progressivement les historiques non critiques avec identifiants d’origine pour éviter les doublons.
- Conserver les journaux financiers, de séquestre et de scan nécessaires à la traçabilité.
- Vérifier la consultation autorisée et empêcher les utilisateurs de fabriquer ou modifier des événements.

## Validation et livraison
- Après chaque phase : vérifier les migrations appliquées, permissions, accès anonymes/connectés et régressions des parcours concernés.
- Tester Yobbanté, le parcours bêta, les créations/annulations et les opérations financières concurrentes sans mouvement d’argent réel.
- Mettre à jour le rapport avec les résultats réellement observés, les changements appliqués et les tests bloqués.
- Les tests administrateur, paiements et notifications réels nécessiteront des accès autorisés et des moyens de test disponibles ; ne pas les déclarer validés par simple lecture du code.

## Détails techniques
- Toutes les modifications de structure passent par les migrations Lovable Cloud ; droits explicites et RLS pour chaque nouvelle table.
- Fonctions financières transactionnelles, contrôle d’identité serveur, verrouillage des lignes et clés d’idempotence.
- Aucun secret dans le navigateur ; aucun accès privilégié accordé sur la seule base d’une référence GP ou du stockage local.
- Les tables simplement dépourvues de clé étrangère ne sont pas nécessairement incorrectes : les tables de configuration et les références polymorphiques sont traitées selon leur rôle réel.