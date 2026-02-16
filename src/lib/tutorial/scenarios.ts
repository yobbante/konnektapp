// ═══════════════════════════════════════════════
// KONNEKT TUTORIAL ENGINE — Scenario Definitions
// Immersive demo with mock screens & actions
// ═══════════════════════════════════════════════

import type { TutorialScenario } from "./types";

// ─── CLIENT SCENARIOS ───────────────────────────

export const clientScenarios: TutorialScenario[] = [
  {
    id: "client-envoi-complet",
    title: "Envoyer un colis",
    description: "Parcours complet : recherche → réservation → paiement → livraison.",
    icon: "Package",
    role: "client",
    status: "available",
    category: "envoi",
    steps: [
      { id: "c1-1", title: "Choisir « Envoyer un colis »", description: "Cliquez sur le bouton d'envoi depuis l'accueil.", instruction: "Dans la vraie app, ce bouton se trouve en bas de l'écran ou dans le menu principal.", actionIcon: "📦", actionLabel: "Envoyer un colis", mockScreen: "search", status: "locked" },
      { id: "c1-2", title: "Sélectionner une destination", description: "Choisissez l'itinéraire de votre envoi.", instruction: "Entrez la ville de départ et d'arrivée. Les offres disponibles s'affichent.", actionIcon: "🔍", actionLabel: "Rechercher", mockScreen: "search", status: "locked" },
      { id: "c1-3", title: "Choisir un transporteur", description: "Comparez les profils, badges et tarifs.", instruction: "Le badge KTP (Basic/Vérifié/Pro) indique le niveau de confiance du GP.", actionIcon: "👤", actionLabel: "Voir le profil", mockScreen: "offer-detail", status: "locked" },
      { id: "c1-4", title: "Indiquer le poids", description: "Entrez le poids estimé de votre colis.", instruction: "Le prix = poids × tarif/kg. Exemple : 3 kg × 5 000 FCFA = 15 000 FCFA.", actionIcon: "⚖️", actionLabel: "Saisir 3 kg", mockScreen: "weight-input", status: "locked" },
      { id: "c1-5", title: "Payer — Escrow activé", description: "Vos fonds sont bloqués en sécurité.", instruction: "L'argent est séquestré. Le GP ne le reçoit qu'après livraison confirmée.", actionIcon: "💳", actionLabel: "Payer 15 000 FCFA", mockScreen: "payment", mockMutation: "escrow_lock", status: "locked" },
      { id: "c1-6", title: "Scan dépôt par le GP", description: "Le GP scanne votre colis au départ.", instruction: "Statut → « Collecté ». Vous recevez une notification push.", actionIcon: "📱", actionLabel: "Simuler scan dépôt", mockScreen: "scan-deposit", mockMutation: "scan_deposit", status: "locked" },
      { id: "c1-7", title: "Suivi en transit", description: "Votre colis est en route.", instruction: "Le statut se met à jour à chaque étape du voyage.", actionIcon: "✈️", actionLabel: "Voir le suivi", mockScreen: "tracking", status: "locked" },
      { id: "c1-8", title: "Confirmer la réception", description: "Validez que vous avez bien reçu le colis.", instruction: "Cette action libère les fonds escrow vers le GP, commission déduite.", actionIcon: "✅", actionLabel: "Confirmer réception", mockScreen: "confirm-reception", mockMutation: "escrow_release", status: "locked" },
      { id: "c1-9", title: "Résultat financier", description: "Détail de la transaction terminée.", instruction: "Escrow 15 000 → Commission 750 (5%) → GP reçoit 14 250 FCFA.", actionIcon: "📊", actionLabel: "Voir le ledger", mockScreen: "ledger-result", status: "locked" },
    ],
  },
  {
    id: "client-escrow",
    title: "Comprendre l'Escrow",
    description: "Comment Konnekt protège votre argent.",
    icon: "Shield",
    role: "client",
    status: "available",
    category: "escrow",
    steps: [
      { id: "c3-1", title: "Blocage des fonds", description: "L'escrow se verrouille au paiement.", instruction: "Vos fonds sont bloqués dès la confirmation de réservation.", actionIcon: "🔒", actionLabel: "Verrouiller escrow", mockScreen: "escrow-detail", mockMutation: "escrow_lock", status: "locked" },
      { id: "c3-2", title: "Pendant le transport", description: "L'argent reste intouchable.", instruction: "Ni vous ni le GP ne pouvez toucher aux fonds en transit.", actionIcon: "🚚", actionLabel: "Voir le statut", mockScreen: "tracking", status: "locked" },
      { id: "c3-3", title: "Libération automatique", description: "Fonds libérés à la livraison.", instruction: "Après confirmation de réception → escrow libéré → commission déduite → payout GP.", actionIcon: "🔓", actionLabel: "Libérer les fonds", mockScreen: "escrow-detail", mockMutation: "escrow_release", status: "locked" },
    ],
  },
  {
    id: "client-ajustement",
    title: "Ajustement de poids",
    description: "Que se passe-t-il si le poids réel ≠ estimé.",
    icon: "Scale",
    role: "client",
    status: "available",
    category: "ajustement",
    steps: [
      { id: "c4-1", title: "Poids estimé vs réel", description: "Le GP pèse votre colis au dépôt.", instruction: "Vous avez estimé 5 kg. Le GP constate 6 kg → supplément de 5 000 FCFA.", actionIcon: "⚖️", actionLabel: "Voir la différence", mockScreen: "supplement-alert", status: "locked" },
      { id: "c4-2", title: "Notification supplément", description: "Konnekt calcule automatiquement.", instruction: "Nouveau prix = 6 kg × 5 000 = 30 000 au lieu de 25 000. +5 000 FCFA.", actionIcon: "🔔", actionLabel: "Voir le supplément", mockScreen: "supplement-alert", mockMutation: "weight_adjust_up", status: "locked" },
      { id: "c4-3", title: "Accepter ou refuser", description: "Vous décidez.", instruction: "Accepter → supplément ajouté à l'escrow. Refuser → commande annulée.", actionIcon: "✅", actionLabel: "Accepter le supplément", mockScreen: "payment", mockMutation: "supplement_pay", status: "locked" },
      { id: "c4-4", title: "Poids inférieur → Remboursement", description: "Remboursement automatique.", instruction: "Si poids réel < estimé, la différence est remboursée sur votre wallet.", actionIcon: "💰", actionLabel: "Voir le remboursement", mockScreen: "wallet-overview", mockMutation: "refund", status: "locked" },
    ],
  },
  {
    id: "client-scan",
    title: "Scanner un colis",
    description: "Utilisez le scan pour suivre vos colis.",
    icon: "ScanLine",
    role: "client",
    status: "available",
    category: "scan",
    steps: [
      { id: "c5-1", title: "Scanner le QR colis", description: "Chaque colis a un QR unique.", instruction: "Scannez pour voir le statut en temps réel.", actionIcon: "📷", actionLabel: "Scanner", mockScreen: "qr-scan", status: "locked" },
      { id: "c5-2", title: "Votre QR identité", description: "Votre identité numérique Konnekt.", instruction: "Montrez votre QR au GP pour qu'il vous identifie au dépôt.", actionIcon: "🆔", actionLabel: "Afficher mon QR", mockScreen: "qr-scan", status: "locked" },
    ],
  },
  {
    id: "client-litige",
    title: "Gestion litige",
    description: "Comment ouvrir un litige en cas de problème.",
    icon: "AlertTriangle",
    role: "client",
    status: "available",
    category: "litige",
    steps: [
      { id: "c7-1", title: "Ouvrir un litige", description: "Signalez un problème.", instruction: "Depuis le suivi, cliquez « Signaler un problème ».", actionIcon: "⚠️", actionLabel: "Signaler", mockScreen: "dispute-form", status: "locked" },
      { id: "c7-2", title: "Choisir la catégorie", description: "Colis endommagé, retard, perte…", instruction: "Chaque catégorie a un traitement et un délai spécifiques.", actionIcon: "📋", actionLabel: "Sélectionner", mockScreen: "dispute-form", status: "locked" },
      { id: "c7-3", title: "Résolution", description: "L'admin arbitre sous 72h.", instruction: "Le GP a 72h pour répondre. Sinon, escalade automatique.", actionIcon: "⚖️", actionLabel: "Voir la résolution", mockScreen: "ledger-result", mockMutation: "refund", status: "locked" },
    ],
  },
];

// ─── GP SCENARIOS ───────────────────────────────

export const gpScenarios: TutorialScenario[] = [
  {
    id: "gp-mission-complete",
    title: "Mission GP complète",
    description: "Du vol à la livraison et au paiement.",
    icon: "Plane",
    role: "gp",
    status: "available",
    category: "mission",
    steps: [
      { id: "g1-1", title: "Déclarer un voyage", description: "Créez votre prochain départ.", instruction: "Indiquez trajet, date, capacité et tarif au kilo.", actionIcon: "✈️", actionLabel: "Déclarer un vol", mockScreen: "declare-flight", status: "locked" },
      { id: "g1-2", title: "Recevoir une demande", description: "Un client réserve chez vous.", instruction: "Notification : « Nouveau colis — 3 kg — Paris → Douala ».", actionIcon: "🔔", actionLabel: "Voir la demande", mockScreen: "accept-mission", status: "locked" },
      { id: "g1-3", title: "Accepter la mission", description: "Confirmez la prise en charge.", instruction: "Vous avez 24h. Passé ce délai → annulation automatique.", actionIcon: "✅", actionLabel: "Accepter", mockScreen: "accept-mission", mockMutation: "escrow_lock", status: "locked" },
      { id: "g1-4", title: "Scanner le dépôt", description: "Scannez le colis à la réception.", instruction: "Le scan confirme la collecte. Statut → « Collecté ».", actionIcon: "📱", actionLabel: "Scanner dépôt", mockScreen: "scan-deposit", mockMutation: "scan_deposit", status: "locked" },
      { id: "g1-5", title: "Transit en cours", description: "Le colis voyage avec vous.", instruction: "Le statut se met à jour automatiquement.", actionIcon: "🛫", actionLabel: "En transit", mockScreen: "tracking", status: "locked" },
      { id: "g1-6", title: "Scanner arrivée", description: "Confirmez l'arrivée à destination.", instruction: "Le client est notifié pour venir récupérer.", actionIcon: "📱", actionLabel: "Scanner arrivée", mockScreen: "scan-delivery", mockMutation: "scan_delivery", status: "locked" },
      { id: "g1-7", title: "Livraison confirmée", description: "Le client valide la réception.", instruction: "Les fonds sont libérés vers votre wallet.", actionIcon: "🤝", actionLabel: "Client confirme", mockScreen: "confirm-reception", mockMutation: "escrow_release", status: "locked" },
      { id: "g1-8", title: "Paiement reçu", description: "Voir le détail du payout.", instruction: "15 000 FCFA − 750 commission (5%) = 14 250 FCFA crédités.", actionIcon: "💰", actionLabel: "Voir mon payout", mockScreen: "ledger-result", mockMutation: "commission_split", status: "locked" },
    ],
  },
  {
    id: "gp-commission",
    title: "Comprendre la commission",
    description: "Calcul progressif de la commission Konnekt.",
    icon: "Percent",
    role: "gp",
    status: "available",
    category: "commission",
    steps: [
      { id: "g2-1", title: "Commission progressive", description: "Le taux dépend de votre activité.", instruction: "0-49 livraisons : 5% → 50+ : 4% → 150+ : 3%. Plus vous livrez, moins vous payez.", actionIcon: "📈", actionLabel: "Voir les paliers", mockScreen: "commission-calc", status: "locked" },
      { id: "g2-2", title: "Calcul automatique", description: "La commission se déduit au payout.", instruction: "Sur 15 000 FCFA avec 5% : commission = 750 → vous recevez 14 250 FCFA.", actionIcon: "🧮", actionLabel: "Simuler un calcul", mockScreen: "commission-calc", mockMutation: "commission_split", status: "locked" },
      { id: "g2-3", title: "Bonus KTP", description: "Le Trust Score™ réduit votre taux.", instruction: "GP Pro (score 90+) : commission réduite à 2% au lieu de 5%.", actionIcon: "⭐", actionLabel: "Voir l'impact KTP", mockScreen: "badge-info", status: "locked" },
    ],
  },
  {
    id: "gp-dette",
    title: "Comprendre la dette",
    description: "Le système de dette et déduction automatique.",
    icon: "AlertCircle",
    role: "gp",
    status: "available",
    category: "dette",
    steps: [
      { id: "g3-1", title: "Comment naît une dette", description: "Commission non couverte = dette.", instruction: "Si votre solde est insuffisant, la commission impayée devient dette.", actionIcon: "📉", actionLabel: "Voir la dette", mockScreen: "debt-calc", status: "locked" },
      { id: "g3-2", title: "Déduction automatique", description: "Déduite des prochains gains.", instruction: "Payout 15 000 → commission 750 → dette 2 000 → net = 12 250 FCFA.", actionIcon: "🔄", actionLabel: "Simuler le payout", mockScreen: "debt-calc", mockMutation: "debt_deduct", status: "locked" },
      { id: "g3-3", title: "Résolution", description: "Livrer pour rembourser.", instruction: "Chaque livraison réduit votre dette automatiquement. Continuez !", actionIcon: "✅", actionLabel: "Voir le solde", mockScreen: "wallet-overview", status: "locked" },
    ],
  },
  {
    id: "gp-ajustement",
    title: "Ajustement de poids",
    description: "Gérer la différence poids estimé / réel.",
    icon: "Scale",
    role: "gp",
    status: "available",
    category: "ajustement",
    steps: [
      { id: "g4-1", title: "Peser le colis", description: "Vérifiez au dépôt.", instruction: "Client a estimé 5 kg. Votre balance indique 6 kg.", actionIcon: "⚖️", actionLabel: "Peser", mockScreen: "weight-input", status: "locked" },
      { id: "g4-2", title: "Déclarer la différence", description: "Le système calcule le supplément.", instruction: "+1 kg × 5 000 = 5 000 FCFA de supplément automatique.", actionIcon: "📝", actionLabel: "Déclarer 6 kg", mockScreen: "supplement-alert", mockMutation: "weight_adjust_up", status: "locked" },
      { id: "g4-3", title: "Attente validation client", description: "Le client accepte ou refuse.", instruction: "Accepter → supplément ajouté. Refuser → NE PAS prendre le colis.", actionIcon: "⏳", actionLabel: "En attente…", mockScreen: "supplement-alert", status: "locked" },
    ],
  },
  {
    id: "gp-colis-manuel",
    title: "Colis manuel hors plateforme",
    description: "Déclarer un colis géré hors Konnekt.",
    icon: "FileEdit",
    role: "gp",
    status: "available",
    category: "colis_manuel",
    steps: [
      { id: "g6-1", title: "Créer un colis manuel", description: "Envoi géré directement.", instruction: "Commission fixe 3%, pas d'assurance Konnekt, pas de protection litige.", actionIcon: "📝", actionLabel: "Créer colis manuel", mockScreen: "manual-parcel", status: "locked" },
      { id: "g6-2", title: "Impact stratégique", description: "Pas de bonus KTP.", instruction: "Les colis manuels ne comptent pas pour votre Trust Score™.", actionIcon: "⚠️", actionLabel: "Voir l'impact", mockScreen: "badge-info", status: "locked" },
    ],
  },
  {
    id: "gp-kyc",
    title: "KYC & Activation",
    description: "Complétez la vérification pour opérer.",
    icon: "BadgeCheck",
    role: "gp",
    status: "available",
    category: "kyc",
    steps: [
      { id: "g7-1", title: "Télécharger CNI/Passeport", description: "Pièce d'identité requise.", instruction: "Photo claire de votre document d'identité.", actionIcon: "🪪", actionLabel: "Uploader le document", mockScreen: "kyc-upload", status: "locked" },
      { id: "g7-2", title: "Selfie de vérification", description: "Confirmez votre identité.", instruction: "Prenez un selfie pour vérifier la correspondance.", actionIcon: "🤳", actionLabel: "Prendre un selfie", mockScreen: "kyc-upload", status: "locked" },
      { id: "g7-3", title: "Configurer la route", description: "Définissez votre trajet fixe.", instruction: "Cette route sera verrouillée après validation admin.", actionIcon: "🗺️", actionLabel: "Définir la route", mockScreen: "declare-flight", status: "locked" },
      { id: "g7-4", title: "Compte activé !", description: "Toutes les fonctionnalités débloquées.", instruction: "Vous pouvez maintenant recevoir des missions et créer des offres.", actionIcon: "🎉", actionLabel: "C'est parti !", mockScreen: "badge-info", status: "locked" },
    ],
  },
];
