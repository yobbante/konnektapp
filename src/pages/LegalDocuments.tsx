/**
 * LegalDocuments - Page des documents légaux
 * 
 * Contient tous les documents juridiques :
 * - Conditions Générales d'Utilisation (CGU)
 * - Conditions Générales de Vente (CGV)
 * - Politique de confidentialité
 * - Charte transporteur
 * - Contrat de transport
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, ChevronRight, ArrowLeft, Shield, Scale, 
  Lock, Truck, Package, CheckCircle, ChevronDown
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LegalDocument {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  lastUpdated: string;
  content: string;
}

const legalDocuments: LegalDocument[] = [
  {
    id: "cgu",
    title: "Conditions Générales d'Utilisation",
    icon: FileText,
    lastUpdated: "1er février 2026",
    content: `
# CONDITIONS GÉNÉRALES D'UTILISATION

## Article 1 - Objet

Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités et conditions d'utilisation de la plateforme Konnekt, accessible via l'application mobile et le site web.

Konnekt est une plateforme de mise en relation entre expéditeurs de colis et transporteurs partenaires.

## Article 2 - Définitions

- **Plateforme** : désigne l'application mobile et le site web Konnekt
- **Utilisateur** : toute personne physique ou morale utilisant la Plateforme
- **Client** : utilisateur souhaitant expédier un colis
- **Transporteur** : partenaire proposant des services de transport
- **Colis** : bien confié au transporteur pour acheminement

## Article 3 - Inscription et Compte

3.1 L'utilisation de la Plateforme nécessite la création d'un compte personnel.

3.2 L'Utilisateur s'engage à fournir des informations exactes et à les maintenir à jour.

3.3 Le compte est personnel et ne peut être cédé à un tiers.

3.4 L'Utilisateur est responsable de la confidentialité de ses identifiants.

## Article 4 - Services proposés

4.1 La Plateforme permet aux Clients de :
- Rechercher des transporteurs disponibles
- Comparer les offres de transport
- Réserver un service de transport
- Suivre l'acheminement de leurs colis
- Communiquer avec les transporteurs

4.2 La Plateforme permet aux Transporteurs de :
- Publier des offres de transport
- Gérer leurs réservations
- Communiquer avec les clients
- Suivre leurs revenus

## Article 5 - Responsabilités

5.1 Konnekt agit en qualité d'intermédiaire et n'est pas partie au contrat de transport conclu entre le Client et le Transporteur.

5.2 Le Transporteur demeure seul responsable de l'exécution du contrat de transport.

5.3 Konnekt s'engage à maintenir la Plateforme opérationnelle dans les meilleures conditions.

## Article 6 - Paiements

6.1 Les paiements sont effectués via les moyens de paiement proposés sur la Plateforme.

6.2 Un système d'escrow sécurise les transactions entre Clients et Transporteurs.

6.3 Les fonds ne sont libérés au Transporteur qu'après confirmation de livraison.

## Article 7 - Données personnelles

7.1 Le traitement des données personnelles est effectué conformément à notre Politique de Confidentialité.

7.2 Les données sont collectées et traitées dans le respect de la réglementation applicable.

## Article 8 - Propriété intellectuelle

8.1 Tous les éléments de la Plateforme sont protégés par le droit de propriété intellectuelle.

8.2 Toute reproduction non autorisée est strictement interdite.

## Article 9 - Modification des CGU

9.1 Konnekt se réserve le droit de modifier les présentes CGU.

9.2 Les Utilisateurs seront informés de toute modification substantielle.

## Article 10 - Droit applicable

Les présentes CGU sont soumises au droit sénégalais. Tout litige sera soumis aux tribunaux compétents de Dakar.

---
*Dernière mise à jour : 1er février 2026*
    `,
  },
  {
    id: "cgv",
    title: "Conditions Générales de Vente",
    icon: Scale,
    lastUpdated: "1er février 2026",
    content: `
# CONDITIONS GÉNÉRALES DE VENTE

## Article 1 - Prix et Facturation

1.1 Les prix des services sont affichés sur la Plateforme et exprimés en FCFA.

1.2 Le prix total inclut :
- Le tarif de transport
- Les frais de service Konnekt
- L'assurance de base
- Les taxes applicables

1.3 Une facture électronique est émise pour chaque transaction.

## Article 2 - Modalités de paiement

2.1 Le paiement est exigible au moment de la réservation.

2.2 Moyens de paiement acceptés :
- Mobile Money (Orange Money, Wave, Free Money)
- Cartes bancaires
- Virement bancaire

2.3 La transaction est sécurisée par cryptage SSL.

## Article 3 - Système d'Escrow

3.1 Les fonds sont conservés sur un compte séquestre jusqu'à la livraison.

3.2 Le Transporteur reçoit le paiement après confirmation de livraison par le Client.

3.3 En cas de litige, les fonds sont conservés jusqu'à résolution.

## Article 4 - Annulation et Remboursement

4.1 Annulation par le Client :
- Plus de 48h avant : remboursement intégral
- Moins de 48h : retenue de 20%
- Après collecte : aucun remboursement

4.2 Annulation par le Transporteur :
- Remboursement intégral du Client
- Pénalités possibles pour le Transporteur

## Article 5 - Assurance

5.1 Une assurance de base est incluse dans chaque envoi.

5.2 Des options d'assurance complémentaire sont disponibles.

5.3 L'indemnisation maximale est limitée à la valeur déclarée du colis.

## Article 6 - Réclamations

6.1 Toute réclamation doit être formulée dans les 7 jours suivant la livraison.

6.2 Les réclamations doivent être accompagnées de justificatifs.

6.3 Le traitement des réclamations intervient sous 15 jours ouvrés.

---
*Dernière mise à jour : 1er février 2026*
    `,
  },
  {
    id: "confidentialite",
    title: "Politique de Confidentialité",
    icon: Lock,
    lastUpdated: "1er février 2026",
    content: `
# POLITIQUE DE CONFIDENTIALITÉ

## 1. Collecte des données

Nous collectons les données suivantes :
- Données d'identification (nom, prénom, email, téléphone)
- Données de géolocalisation (pour le suivi des colis)
- Données de paiement (via prestataires sécurisés)
- Données d'utilisation de la Plateforme

## 2. Finalités du traitement

Les données sont utilisées pour :
- Fournir nos services de mise en relation
- Traiter les paiements
- Améliorer nos services
- Communiquer avec vous
- Respecter nos obligations légales

## 3. Partage des données

Vos données peuvent être partagées avec :
- Les transporteurs (pour l'exécution du service)
- Nos prestataires de paiement
- Les autorités (sur demande légale)

## 4. Sécurité

Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :
- Cryptage des données
- Accès restreint
- Surveillance continue

## 5. Vos droits

Vous disposez des droits suivants :
- Droit d'accès à vos données
- Droit de rectification
- Droit à l'effacement
- Droit à la portabilité
- Droit d'opposition

Pour exercer vos droits : privacy@konnekt.app

## 6. Cookies

Nous utilisons des cookies pour :
- Le bon fonctionnement du site
- L'analyse d'audience
- La personnalisation

## 7. Conservation

Les données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées.

---
*Dernière mise à jour : 1er février 2026*
    `,
  },
  {
    id: "charte-transporteur",
    title: "Charte du Transporteur",
    icon: Truck,
    lastUpdated: "1er février 2026",
    content: `
# CHARTE DU TRANSPORTEUR PARTENAIRE

## Engagement qualité

En tant que Transporteur partenaire Konnekt, vous vous engagez à :

### 1. Professionnalisme
- Respecter les horaires de collecte et livraison
- Communiquer proactivement avec les clients
- Maintenir vos véhicules en bon état
- Porter une tenue correcte

### 2. Sécurité des colis
- Manipuler les colis avec soin
- Respecter les consignes de transport (fragile, etc.)
- Signaler immédiatement tout incident
- Ne jamais ouvrir les colis

### 3. Respect des tarifs
- Appliquer uniquement les tarifs convenus
- Ne demander aucun supplément non autorisé
- Utiliser exclusivement le système de paiement de la Plateforme

### 4. Réactivité
- Répondre aux demandes sous 24h maximum
- Accepter ou refuser les missions rapidement
- Mettre à jour le statut des livraisons en temps réel

### 5. Conformité légale
- Disposer de tous les documents requis
- Maintenir une assurance valide
- Respecter le code de la route

## Sanctions

Le non-respect de cette charte peut entraîner :
- Un avertissement
- Une suspension temporaire
- Une exclusion définitive de la Plateforme

---
*Dernière mise à jour : 1er février 2026*
    `,
  },
  {
    id: "contrat-transport",
    title: "Contrat de Transport Type",
    icon: Package,
    lastUpdated: "1er février 2026",
    content: `
# CONTRAT DE TRANSPORT TYPE

## Entre les parties

Le présent contrat est conclu entre :
- Le **Client** (Expéditeur)
- Le **Transporteur** (Partenaire Konnekt)

Avec Konnekt agissant en qualité d'intermédiaire.

## Objet du contrat

Le Transporteur s'engage à acheminer le(s) colis du Client du point de collecte au point de livraison.

## Obligations du Transporteur

1. Collecter le colis à la date et au lieu convenus
2. Acheminer le colis dans les délais annoncés
3. Remettre le colis au destinataire désigné
4. Informer le Client de l'avancement de la livraison
5. Signaler tout problème rencontré

## Obligations du Client

1. Préparer le colis conformément aux exigences
2. Déclarer le contenu exact du colis
3. Fournir les coordonnées correctes du destinataire
4. Payer le prix convenu
5. Ne pas expédier de marchandises interdites

## Marchandises interdites

Sont interdits à l'envoi :
- Substances dangereuses
- Produits illicites
- Argent liquide
- Animaux vivants
- Objets de valeur non déclarés

## Responsabilité

Le Transporteur est responsable des dommages causés aux colis, dans la limite de la valeur déclarée et assurée.

## Litige

En cas de litige, les parties s'engagent à rechercher une solution amiable via la médiation de Konnekt.

---
*Dernière mise à jour : 1er février 2026*
    `,
  },
];

export default function LegalDocuments() {
  const navigate = useNavigate();
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const activeDocument = selectedDoc 
    ? legalDocuments.find(d => d.id === selectedDoc) 
    : null;

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />
      
      <main 
        className="px-4 pb-24"
        style={{ paddingTop: 'calc(70px + env(safe-area-inset-top, 0px))' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => selectedDoc ? setSelectedDoc(null) : navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {selectedDoc ? activeDocument?.title : "Documents Légaux"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {selectedDoc ? `Mis à jour : ${activeDocument?.lastUpdated}` : "Informations juridiques"}
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!selectedDoc ? (
              // Document List
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                {legalDocuments.map((doc, index) => {
                  const Icon = doc.icon;
                  return (
                    <motion.button
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedDoc(doc.id)}
                      className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground mb-0.5 text-sm">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Mis à jour : {doc.lastUpdated}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </motion.button>
                  );
                })}

                {/* Trust Section */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-r from-success/10 to-primary/10 rounded-2xl p-4 mt-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-5 h-5 text-success" />
                    <h3 className="font-semibold text-sm">Protection & Transparence</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Konnekt s'engage à protéger vos données et à opérer en toute transparence. 
                    Nous mettons à jour régulièrement nos documents légaux pour refléter les évolutions 
                    de nos services et de la réglementation.
                  </p>
                </motion.div>
              </motion.div>
            ) : (
              // Document Content
              <motion.div
                key="content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="p-4">
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none"
                      style={{ fontSize: '14px', lineHeight: '1.7' }}
                    >
                      {activeDocument?.content.split('\n').map((line, i) => {
                        if (line.startsWith('# ')) {
                          return <h1 key={i} className="text-xl font-bold mb-4 mt-2">{line.slice(2)}</h1>;
                        }
                        if (line.startsWith('## ')) {
                          return <h2 key={i} className="text-lg font-semibold mb-3 mt-6">{line.slice(3)}</h2>;
                        }
                        if (line.startsWith('### ')) {
                          return <h3 key={i} className="text-base font-medium mb-2 mt-4">{line.slice(4)}</h3>;
                        }
                        if (line.startsWith('- ')) {
                          return <li key={i} className="ml-4 mb-1">{line.slice(2)}</li>;
                        }
                        if (line.startsWith('---')) {
                          return <hr key={i} className="my-4 border-border" />;
                        }
                        if (line.startsWith('*') && line.endsWith('*')) {
                          return <p key={i} className="text-xs text-muted-foreground italic">{line.slice(1, -1)}</p>;
                        }
                        if (line.trim() === '') {
                          return <br key={i} />;
                        }
                        return <p key={i} className="mb-2">{line}</p>;
                      })}
                    </div>
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <MobileNav />
    </div>
  );
}
