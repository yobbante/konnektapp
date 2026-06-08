# Messagerie admin Konnekt — conversation complète + statut 926

Objectif: pouvoir ouvrir/interagir avec chaque message, voir **l'intégralité** de la conversation bot↔GP, répondre en libre ou via templates, rendre l'onglet Onboarding cliquable, et afficher en direct si la ligne WhatsApp **926** (le bot) est connectée.

## Constat technique
- La conversation réelle bot↔GP vit dans `whatsapp_inbound_messages` : `message_body` = message entrant du GP, `bot_reply` = réponse automatique du bot.
- Les réponses manuelles de l'admin vivent dans `gp_messages`.
- Aujourd'hui le détail (`WaThreadDetail`) ne lit **que** `gp_messages` → tout l'historique bot est invisible.
- L'onglet Onboarding (`whatsapp_inbound_messages` tag `konnekt_signup`) affiche des cartes statiques non cliquables.
- La ligne « 926 » est gérée par l'edge function `gp-bot` (et `webhook-whatsapp`).

## 1. Conversation complète bot↔GP (fusion des sources)
Dans `WaThreadDetail.load()`, charger et fusionner par téléphone, triés par date :
- `gp_messages` (in/out manuels) — comme aujourd'hui.
- `whatsapp_inbound_messages` filtrés sur le même numéro :
  - chaque ligne → un message **entrant** (`message_body`, direction `in`).
  - si `bot_reply` non vide → un message **sortant** marqué « Bot » (libellé + icône `Bot`, style distinct du message admin manuel).
- Affichage : 3 styles de bulles → GP (entrant, blanc), Bot (sortant, teinté + badge « Bot auto »), Admin (sortant vert). Tri chronologique unique.

La liste des threads WhatsApp (`fetchWaThreads`) sera aussi alimentée par `whatsapp_inbound_messages` (groupé par `sender_phone`) en plus de `gp_messages`, pour que chaque GP ayant parlé au bot apparaisse (dédup par numéro).

## 2. Onglet Onboarding cliquable (séparé)
- Les cartes d'inscription restent dans leur onglet, mais deviennent cliquables : un clic ouvre le détail unifié de la conversation pour ce numéro (même `WaThreadDetail`, donc composer + historique complet).
- On conserve le bouton « Valider dans Terrain » à l'intérieur du détail.

## 3. Composer : libre + templates (déjà présent, généralisé)
- Le composer (message libre, toggle Templates, envoi enregistré / ouverture WhatsApp) existe déjà dans `WaThreadDetail`. Il devient accessible depuis l'onglet Onboarding via le clic ci-dessus.
- Aucune régression sur l'envoi (`gp_messages` insert + `wa.me`).

## 4. Statut « 926 connecté » — test live de l'edge function
- Ajouter un endpoint santé sans effet de bord dans `gp-bot` : si la requête contient `{ ping: true }` (ou méthode GET), renvoyer `{ status: "ok" }` immédiatement, **sans** écrire en base ni traiter de message.
- Côté frontend (header de la messagerie), un petit badge « Ligne 926 » :
  - au chargement, appelle `supabase.functions.invoke("gp-bot", { body: { ping: true } })`.
  - réponse OK → point vert « 926 connectée », erreur/timeout → point rouge « 926 hors ligne ».
  - bouton refresh pour re-tester.

## Section technique
- Fichier principal: `src/pages/AdminMessages.tsx`
  - `fetchWaThreads`: union `gp_messages` + `whatsapp_inbound_messages` (groupés par numéro normalisé), dédup, statut inchangé.
  - `WaThreadDetail.load`: merge des deux tables → timeline triée avec champ `source` (`gp` | `bot` | `inbound`) pour le style de bulle.
  - Onglet Onboarding: remplacer le `<div>` non cliquable par un `<button>` qui set `waSelected` (thread construit depuis le `sender_phone`).
  - Header: composant `LineStatus` qui ping `gp-bot`.
- Edge function `supabase/functions/gp-bot/index.ts`: court-circuit `ping`/GET → `{status:"ok"}` avant toute logique/insert.
- Pas de migration DB nécessaire (lecture seule des tables existantes).

## Vérification
- Ouvrir une conversation (ex: +33751390284) et confirmer que le message GP de 12:25 + la réponse bot Yobbanté apparaissent dans le bon ordre.
- Cliquer une carte Onboarding → la conversation s'ouvre avec composer.
- Tester template + message libre (enregistré, puis WhatsApp).
- Vérifier le badge 926 (vert si `gp-bot` répond au ping).
