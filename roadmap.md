# Audit pré-production
- [x] Connexion GP : accès direct au lien ajouté, consommation vérifiée et échecs de sauvegarde onboarding sans redirection ; logo officiel rétabli.
- [ ] Valider la connexion GP réelle de bout en bout avec un lien neuf ; sécurité serveur GP toujours à finaliser.
- [ ] Résoudre les cinq phases de l’audit backend : intégrité, partenaires, opérations atomiques, consolidation et historique unifié ; préserver le parcours bêta.
  - [x] Socle phase 1 : huit relations validées sans orphelins, colonnes partenaires et origine applicative, index commandes.
  - [ ] Phase 1 : adapter les écritures à l’origine applicative et persister les métadonnées dans les endpoints.
  - [x] Socle phase 2 : trois registres partenaires avec RLS ; accès aux clés refusé à anon/authenticated vérifié.
  - [ ] Phase 2 : intégrer les clés hashées, rotation, quotas, endpoints et notifications signées.
  - [ ] Phase 3 : centraliser création, annulation et libération atomiques ; aucune correction financière appliquée à ce stade.
  - [ ] Phase 4 : migrer les usages avant consolidation ; tables actives conservées, aucune suppression appliquée.
  - [x] Socle phase 5 : audit_events et déclencheurs commandes/litiges ; écriture client et exécution publique du déclencheur refusées.
  - [ ] Phase 5 : reprise des historiques non critiques et tests de mutations authentifiées.
  - [ ] Sécurité : 150 signalements existants du linter à trier ; nombre inchangé après les migrations.
- [x] Tester les entrées publiques de tous les modes et les redirections client.
- [x] Auditer code client, transporteurs, admin et permissions actuelles.
- [x] Documenter les essais réels, échecs et étapes non validées dans le rapport.
- [ ] Créer huit comptes QA utilisables — bloqué : inscriptions API sans réponse, zéro compte créé ; confirmation via boîtes QA contrôlées nécessaire.
- [ ] Achever les réservations/livraisons E2E de chaque mode — bloqué : comptes QA et paiements de test opérationnels indisponibles.
- [ ] Tester les mutations administrateur — bloqué : compte disponible sans rôle admin, accès connecté en attente ; compte admin autorisé nécessaire.


# Corrections pré-production — dix chantiers
- [ ] 1. Connexion/inscription : callbacks différés et erreur récupérable ajoutés ; validation et reprise après confirmation à terminer.
- [ ] 2. Sécurité GP et permissions : résultats de scan chargés ; migration sécurisée des parcours publics nécessaire.
- [ ] 3. Comptes QA : bloqué par boîtes de confirmation contrôlées et autorisation admin.
- [ ] 4. Paiements : prestataire de test à confirmer ; ne pas simuler de succès.
- [ ] 5. GP/routier : suivi et cohérence financière à corriger/tester.
- [ ] 6. Aérien/maritime : conversion opérationnelle à compléter.
- [ ] 7. Mobility/coursier/agence : parcours et concurrence à sécuriser.
- [ ] 8. Administration : routes, audit et mutations à vérifier.
- [ ] 9. Préparation opérationnelle : e-mails, WhatsApp, sauvegardes et supervision à vérifier.
- [ ] 10. Recette finale : dépend des corrections, comptes QA et paiements de test.

# Ouverture Konnekt — sept points
- [ ] 1. Vérifier l’état Cloud, les permissions réelles et les fonctions déployées.
- [ ] 2. Sécuriser connexion GP, WhatsApp et données privées en préservant l’entrée bêta publique.
- [ ] 3. Connecter et valider paiements, retraits et remboursements ; dépend des accès prestataire.
- [ ] 4. Aligner l’accueil sur les sept activités sans promesses non vérifiées.
- [ ] 5. Valider chaque activité de bout en bout et l’isolation entre comptes.
- [ ] 6. Vérifier conditions, assurance, exclusions, remboursements, contacts et litiges ; validation métier nécessaire.
- [ ] 7. Relancer les scans et vérifier le domaine publié sans publication automatique.

## Vérifications ouverture réalisées
- [x] Lovable Cloud répond normalement (authentification et base).
- [x] Trois fonctions financières mises en refus sûr et déployées : lock-escrow, wallet-withdraw, pay-weight-supplement. Tests authentifiés : 503 PAYMENTS_NOT_AVAILABLE, avant toute mutation.
- [x] Accueil : sept activités, accès Envoyer/Transporter/Voyager ; date passée, chiffres non prouvés et garanties de paiement retirés. Vérification navigateur sur ordinateur.
- [x] Scan backend relancé : 16 constats (7 erreurs, 9 avertissements), non résolus par les changements financiers.
- [ ] Connexion GP et permissions privées : migration coordonnée toujours à réaliser ; aucune déclaration de résolution.
- [ ] Paiements réels : aucun secret prestataire ni connexion de paiement trouvé ; intégration et validation nécessaires.
- [ ] Recette multi-comptes, validation commerciale, notifications réelles, scans connecteurs et domaine publié restent non validés.

## Accès transporteurs
- [ ] Diagnostiquer et corriger les blocages Yobbanté / acceptation administrateur ; tester les accès et refus.

### Résultat accès transporteurs
- [x] Diagnostic : appels Yobbanté directs bloqués CORS, saisie internationale altérée, 9 GP verified sans price_locked_at.
- [x] Relais yobbante-lookup déployé ; tests HTTP directs ref et téléphone : 200 found=true. Indicatif international corrigé.
- [x] Guard : validation administrateur prise en compte indépendamment du tarif ; parcours invitation isolé ; routes dashboards protégées.
- [ ] Validation E2E complète bloquée : navigateur reçoit 503 du relais malgré les réponses directes 200 ; aucun accès dashboard réel certifié.
- [ ] Sécurité serveur sessions GP et tests comptes administrateur restent indispensables avant production.

## Correction connexion et accès global
- [ ] Corriger la recherche Yobbanté et vérifier les restrictions globales et /admin sans contourner les rôles.
