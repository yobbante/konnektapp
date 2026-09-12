# Audit pré-production
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
