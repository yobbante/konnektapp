# Konnekt — Corrections pré-production en dix chantiers

## Objectif
Corriger les blocages du rapport et établir les preuves de fonctionnement avant toute ouverture commerciale. Garder les sept services accessibles et l’entrée bêta publique, mais protéger les dossiers et opérations privés. Aucune publication automatique.

## 1. Connexion et inscription fiables
- Diagnostiquer séparément les attentes de connexion dans l’application et les indisponibilités d’accès aux données.
- Supprimer les blocages liés aux changements de session ; prévoir une erreur claire, un délai maximum et un bouton Réessayer.
- Reprendre la création des profils métier après confirmation de l’adresse e-mail, sans désactiver cette confirmation.
- Tester connexion, rechargement, expiration, déconnexion et reprise après incident.

## 2. Sécurité GP et confidentialité
- Charger tous les résultats de sécurité disponibles, y compris connecteurs/Wiz lorsqu’ils sont présents.
- Remplacer les liens fabriqués dans le navigateur et la session locale falsifiable par une validation serveur.
- Envoyer les liens uniquement au canal vérifié ; vérifier que l’expéditeur WhatsApp possède la référence demandée ; consommer les jetons une seule fois, atomiquement.
- Retirer les lectures et écritures publiques dangereuses sur jetons, profils, commandes et départs, en raccordant d’abord les parcours bêta aux opérations serveur autorisées.
- Exposer uniquement les informations publiques nécessaires à la découverte et au suivi. Tester les accès directs et croisés.

## 3. Comptes QA et accès administrateur
- Créer huit comptes distincts : client, GP, routier, aérien, maritime, Mobility, coursier et agence, avec profils métier et données de test identifiables.
- Confirmer les comptes par des boîtes réellement contrôlées ; ne pas utiliser les adresses fictives du rapport.
- Tester l’administration avec un compte explicitement autorisé, sans promouvoir arbitrairement un compte existant.
- Dépendances : adresses de test confirmables et autorisation d’accès administrateur.

## 4. Paiements, retraits et remboursements
- Inventorier les prestataires et connexions déjà configurés avant tout choix d’intégration.
- Interdire qu’un navigateur déclare seul un paiement réussi ou un retrait terminé.
- Confirmer les paiements par notifications signées ; vérifier montant, devise, bénéficiaire et unicité des opérations côté serveur.
- Rendre cohérents réservation, fonds réservés, libération, remboursement et retraits ; traiter échecs et notifications répétées.
- Tant que le prestataire n’est pas opérationnel, afficher un état indisponible/en attente, jamais un faux succès.
- Dépendance : compte prestataire et environnement de test utilisables ; demander les éléments manquants via les formulaires sécurisés.

## 5. GP et routier
- Conserver le parcours GP existant et sécuriser ses transitions financières.
- Corriger le lien de suivi routier et harmoniser réservation directe et conversion de mission.
- Tester supplément de poids, annulation, collecte, code de livraison incorrect/correct, litige et double confirmation.

## 6. Aérien et maritime
- Relier proposition acceptée à réservation ferme, paiement confirmé, suivi et livraison.
- Distinguer explicitement une demande de devis d’une réservation confirmée.
- Préserver les spécificités métier existantes : documents, capacité, groupage/conteneur et frais déclarés ; ne pas inventer de tarifs commerciaux.

## 7. Mobility, coursier et agence
- Mobility : exclure les départs passés, afficher des dates non ambiguës et appliquer le jour recherché.
- Sécuriser la réservation du dernier siège, le ticket, le double scan, les annulations et la rémunération.
- Raccorder coursier/agence à un espace opérationnel adapté aux capacités existantes : missions, exécution et revenus ; compléter les maillons absents plutôt que laisser l’utilisateur à l’accueil.
- Faire valider toute nouvelle règle commerciale ou gestion de collaborateurs non définie dans l’existant.

## 8. Administration
- Raccorder la recherche admin et clarifier l’accès à l’espace terrain avec les protections adéquates.
- Exécuter les opérations sensibles côté serveur avec vérification des permissions et journal d’audit.
- Vérifier suspension/réactivation, KYC, litiges, retraits et remboursements effectifs ; faire respecter les suspensions côté serveur.

## 9. Préparation opérationnelle
- Corriger les annonces périmées ; signaler les témoignages, chiffres et promesses nécessitant une validation, sans inventer de preuves.
- Vérifier expéditeur e-mail, WhatsApp entrant/sortant et gestion des indisponibilités.
- Contrôler supervision et sauvegardes ; documenter ce qui reste à démontrer pour la restauration et la charge.
- Tester téléphone, clavier, petites hauteurs et réseau lent, puis le domaine publié sans déployer implicitement les modifications.

## 10. Recette finale et décision de lancement
- Rejouer chaque parcours complet avec les comptes QA : inscription → validation → offre → réservation → paiement → exécution → livraison/ticket → règlement.
- Tester annulation, remboursement, litige, concurrence, répétition des actions et accès interdits.
- Relancer les scans de sécurité après correction et vérifier les résultats disponibles des connecteurs.
- Livrer un rapport mis à jour distinguant : corrigé et vérifié, corrigé mais non vérifié, bloqué par une dépendance externe.
- Ne donner le feu vert qu’après validation des scénarios critiques ; une page affichée ne vaut pas une recette complète.

## Organisation et détails techniques
- Avancer dans cet ordre : accès et sessions → sécurité et droits → comptes QA → finances et parcours → administration → recette finale.
- Suivre les dix chantiers dans la feuille de route ; conserver les preuves de test sans coordonnées privées ni secrets.
- Utiliser les migrations approuvées pour les permissions, fonctions et transactions ; conserver les contrôles serveur et les accès nécessaires aux services internes.
- Ajouter des tests ciblés de non-régression et des essais navigateur. Les opérations de test ne doivent pas encaisser d’argent réel, envoyer de messages à des clients ou modifier leurs dossiers.
- Les réglages Cloud concernent à la fois l’aperçu et l’application publiée : prévoir des changements compatibles et ne pas supprimer les données métier.
