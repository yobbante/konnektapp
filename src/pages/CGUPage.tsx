/**
 * CGU & Confidentialité — Terms of Service and Privacy Policy
 */
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, FileText, Shield, Scale } from "lucide-react";

type Tab = "cgu" | "privacy";

export default function CGUPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPrivacyRoute = location.pathname.startsWith("/confidentialite");
  const [tab, setTab] = useState<Tab>(isPrivacyRoute ? "privacy" : "cgu");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold">CGU & Confidentialité</h1>
            <p className="text-[11px] text-muted-foreground">Dernière mise à jour : Mars 2026</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-2">
          <button
            onClick={() => setTab("cgu")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === "cgu" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            CGU
          </button>
          <button
            onClick={() => setTab("privacy")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === "privacy" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <Shield className="w-3.5 h-3.5 inline mr-1" />
            Confidentialité
          </button>
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto">
        {tab === "cgu" ? <CGUContent /> : <PrivacyContent />}
        <div className="pb-8" />
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-3">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <h2 className="font-bold text-sm">{title}</h2>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>;
}

function CGUContent() {
  return (
    <div>
      <SectionTitle icon={Scale} title="1. Objet" />
      <P>
        Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Konnekt, service de mise en relation entre expéditeurs de colis et transporteurs (GP - Gestionnaires de Parcours).
      </P>

      <SectionTitle icon={FileText} title="2. Inscription et compte" />
      <P>
        L'utilisation de Konnekt nécessite la création d'un compte. L'utilisateur s'engage à fournir des informations exactes et à jour. Tout compte créé est personnel et ne peut être cédé à un tiers.
      </P>
      <P>
        Les transporteurs (GP) doivent compléter un processus de vérification d'identité (KYC) avant de pouvoir accepter des commandes sur la plateforme.
      </P>

      <SectionTitle icon={FileText} title="3. Fonctionnement du service" />
      <P>
        Konnekt met en relation des expéditeurs avec des transporteurs vérifiés. L'expéditeur choisit un transporteur, déclare le contenu et le poids de son colis, et effectue le paiement. Le montant est placé en séquestre (escrow) jusqu'à confirmation de la livraison.
      </P>
      <P>
        En cas de différence entre le poids déclaré et le poids réel constaté par le transporteur, un supplément peut être facturé à l'expéditeur avant l'expédition.
      </P>

      <SectionTitle icon={FileText} title="4. Responsabilités" />
      <P>
        Konnekt agit en tant qu'intermédiaire technique. La responsabilité du transport incombe au transporteur (GP). Konnekt met en œuvre les moyens nécessaires pour vérifier la fiabilité des transporteurs via le Konnekt Trust Protocol (KTP).
      </P>
      <P>
        L'expéditeur est responsable de la déclaration exacte du contenu de son colis. L'envoi de produits illicites, dangereux ou interdits entraîne la suspension immédiate du compte.
      </P>

      <SectionTitle icon={FileText} title="5. Tarification et paiement" />
      <P>
        Les tarifs sont fixés par les transporteurs et affichés de manière transparente. Konnekt prélève une commission sur chaque transaction, à la charge du transporteur. Le paiement est sécurisé par le système d'escrow.
      </P>

      <SectionTitle icon={FileText} title="6. Litiges" />
      <P>
        En cas de litige (perte, détérioration, retard significatif), l'utilisateur peut ouvrir une réclamation depuis son espace. Konnekt s'engage à traiter chaque litige dans un délai de 48h et à proposer une résolution équitable.
      </P>

      <SectionTitle icon={FileText} title="7. Résiliation" />
      <P>
        L'utilisateur peut supprimer son compte à tout moment en contactant le support. Les abonnements Premium/Pro sont résiliables à tout moment, sans engagement. La résiliation prend effet à la fin de la période en cours.
      </P>

      <SectionTitle icon={FileText} title="8. Modification des CGU" />
      <P>
        Konnekt se réserve le droit de modifier les présentes CGU. Les utilisateurs seront informés de tout changement significatif par notification dans l'application.
      </P>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div>
      <SectionTitle icon={Shield} title="1. Données collectées" />
      <P>
        Konnekt collecte les données nécessaires au fonctionnement du service : nom, prénom, email, numéro de téléphone, adresses de livraison, historique de commandes, données de géolocalisation (avec consentement pour les GP).
      </P>

      <SectionTitle icon={Shield} title="2. Utilisation des données" />
      <P>
        Vos données sont utilisées pour : la mise en relation avec les transporteurs, le suivi des colis, la gestion des paiements, l'amélioration du service, et la communication relative à vos commandes.
      </P>
      <P>
        Nous ne vendons jamais vos données personnelles à des tiers. Les données de géolocalisation des transporteurs sont utilisées uniquement pour le suivi en temps réel des livraisons.
      </P>

      <SectionTitle icon={Shield} title="3. Sécurité" />
      <P>
        Toutes les données sont chiffrées en transit et au repos. Les informations de paiement sont traitées par des prestataires certifiés. L'accès aux données est strictement limité au personnel autorisé.
      </P>

      <SectionTitle icon={Shield} title="4. Conservation" />
      <P>
        Les données de compte sont conservées tant que le compte est actif, puis supprimées dans un délai de 6 mois après la fermeture. Les données de transaction sont conservées 5 ans conformément aux obligations légales.
      </P>

      <SectionTitle icon={Shield} title="5. Vos droits" />
      <P>
        Vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits, contactez-nous à privacy@konnekt.app.
      </P>

      <SectionTitle icon={Shield} title="6. Cookies" />
      <P>
        Konnekt utilise des cookies techniques essentiels au fonctionnement de l'application. Aucun cookie publicitaire n'est utilisé sans votre consentement explicite.
      </P>
    </div>
  );
}
