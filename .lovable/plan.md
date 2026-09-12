# Navigation et connexion des GP Yobbanté

## Diagnostic confirmé
- La recherche Yobbanté répond correctement : test par référence GP3230 puis par son téléphone, tous deux en HTTP 200 avec un profil trouvé.
- La page de connexion actuelle ne consulte plus Yobbanté : elle cherche uniquement les profils locaux et affiche « Numéro non reconnu » sinon.
- Le choix du pays est ignoré hors Sénégal : le préfixe +221 est utilisé à sa place.
- Ces vérifications portent sur la recherche des profils, pas sur la livraison des messages WhatsApp ou une connexion complète.

## Modifications
1. Ajouter un bouton **Retour** en haut de la page « Rejoindre GP », avec retour à l’accueil si aucun historique interne n’est disponible.
2. Ajouter une invitation visible : **Déjà inscrit sur Konnekt ou accepté sur Yobbanté ? Connectez-vous sans vous réinscrire**, avec bouton **Se connecter**.
3. Rétablir la recherche Yobbanté après une recherche locale infructueuse ; distinguer un compte absent d’un service temporairement indisponible.
4. Corriger la prise en compte de l’indicatif et comparer les téléphones normalisés, sans identifier un compte sur ses huit derniers chiffres seulement.
5. Pour un profil reconnu uniquement sur Yobbanté, proposer la poursuite du parcours existant sans fabriquer une confirmation WhatsApp ni une session authentifiée.

## Détails techniques
- Réutiliser les boutons et couleurs sémantiques existants, sans refonte du reste de la page.
- Réutiliser le contrat `gp-lookup` vérifié et prévoir un délai maximal d’attente.
- Ne pas étendre la génération actuelle de liens d’accès côté navigateur aux profils Yobbanté : elle présente un risque de sécurité déjà identifié dans l’audit et nécessite une correction dédiée côté serveur.
- Aucune modification du projet Yobbanté ni publication automatique.

## Validation
- Vérifier Retour et Se connecter dans le navigateur.
- Tester la reconnaissance d’un profil Yobbanté existant, un numéro absent et une indisponibilité du service.
- Vérifier les indicatifs Sénégal et France, ainsi que les numéros déjà au format international.
