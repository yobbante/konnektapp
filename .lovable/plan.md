# Résoudre les sept points de l’audit d’ouverture Konnekt

## Objectif
Lever les blocages de l’audit d’ouverture du 12 septembre, sans confondre services accessibles et services validés, sans supprimer de données et sans publier automatiquement.

## Les sept points
1. **Vérifier le service et les accès réels.** Confirmer la santé de Lovable Cloud, les permissions déployées et les fonctions utilisées. Réutiliser les corrections déjà appliquées lors de l’audit backend.
2. **Sécuriser les comptes GP et les données privées.** Remplacer la session locale modifiable par une session contrôlée côté serveur. Envoyer les liens uniquement au propriétaire du numéro, vérifier l’expéditeur WhatsApp et consommer chaque lien une seule fois. Remplacer les permissions bêta trop larges sans casser l’entrée publique ni l’inscription.
3. **Fiabiliser les paiements.** Empêcher tout faux succès d’encaissement ou de retrait. Intégrer le prestataire disponible, contrôler ses confirmations et tester les échecs, doublons, remboursements et mouvements du portefeuille. En l’absence des accès nécessaires, garder les transactions externes indisponibles plutôt que simuler un paiement.
4. **Corriger l’accueil.** Retirer les dates passées et les promesses non vérifiées ; présenter les sept activités avec des accès cohérents pour envoyer, transporter et voyager. Indiquer honnêtement les services non encore opérationnels.
5. **Valider les sept parcours.** Tester GP, routier, aérien, maritime, Mobility, coursier et agence : inscription, demande, acceptation, suivi, livraison ou contrôle, paiement et annulation selon l’activité. Utiliser des comptes distincts pour vérifier l’isolation ; corriger les ruptures détectées. Ne pas créer de réservation ou de paiement réel pour la recette.
6. **Vérifier le cadre commercial.** Contrôler la cohérence des conditions, assurances, exclusions, remboursements, contacts et litiges. Corriger les contradictions dans l’application ; signaler les preuves ou décisions métier nécessaires, sans inventer de couverture d’assurance ni prétendre fournir une validation juridique.
7. **Revalider avant ouverture.** Relancer les scans disponibles, dont les connecteurs lorsqu’ils sont accessibles, corriger les alertes confirmées et réaliser une recette dans l’aperçu. Contrôler aussi le domaine publié en lecture seule ; distinguer sa version des corrections non publiées.

## Détails techniques
- Migrations approuvées pour toute évolution de schéma ; privilèges explicites et RLS pour chaque table concernée.
- Autorisations serveur pour les opérations GP ; jetons stockés sous forme hashée, expiration et consommation atomique.
- Notifications de paiement signées et opérations idempotentes ; aucun statut payé décidé uniquement par le navigateur.
- Tests ciblés et Playwright avec comptes autorisés ; aucune élévation administrative implicite.
- Conserver les services et tables encore utilisés ; intégrer les chantiers backend existants, sans doublonner les migrations.

## Livrable et dépendances
Un rapport actualisé indique pour chacun des sept points : corrigé et testé, partiellement validé, ou bloqué avec sa raison. Les accès au prestataire, les comptes de test autorisés, les confirmations e-mail/WhatsApp et les documents commerciaux peuvent nécessiter votre intervention. Aucun lancement commercial ne sera déclaré prêt sur la seule base de tests simulés.
