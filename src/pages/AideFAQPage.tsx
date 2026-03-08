/**
 * Aide & FAQ — Help center for Konnekt users
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ChevronDown, ChevronUp, MessageCircle, Mail, Phone, Package, CreditCard, Shield, Truck, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const FAQ_CATEGORIES = [
  {
    icon: Package,
    title: "Envois & Commandes",
    items: [
      { q: "Comment envoyer un colis avec Konnekt ?", a: "Rendez-vous sur « Envoyer un colis », choisissez un transporteur sur votre trajet, sélectionnez le poids et les détails de votre colis, puis confirmez le paiement. Votre colis sera pris en charge par le GP sélectionné." },
      { q: "Quels types de colis puis-je envoyer ?", a: "Vous pouvez envoyer des colis standards, documents, effets personnels, denrées alimentaires (non périssables), et bien plus. Les produits illicites, dangereux ou interdits par les compagnies aériennes sont strictement exclus." },
      { q: "Comment suivre mon colis ?", a: "Chaque commande possède un numéro de suivi (CMD-XXXX). Utilisez la page « Suivi » ou scannez le QR code fourni pour voir l'état en temps réel de votre envoi." },
      { q: "Que faire si mon colis est en retard ?", a: "Consultez le suivi pour voir le dernier statut. Si le retard dépasse l'estimation, contactez le transporteur via la messagerie intégrée ou ouvrez un litige depuis votre commande." },
    ],
  },
  {
    icon: CreditCard,
    title: "Paiements & Tarifs",
    items: [
      { q: "Comment fonctionne le paiement ?", a: "Le paiement est sécurisé via un système d'escrow (séquestre). Votre argent est bloqué jusqu'à la confirmation de livraison, puis libéré au transporteur. Vous pouvez payer par Wallet Konnekt, Wave ou Orange Money." },
      { q: "Y a-t-il des frais de service ?", a: "Konnekt applique une commission transparente de 0% pour les clients. Les frais de service sont à la charge du transporteur." },
      { q: "Comment fonctionne le supplément de poids ?", a: "Si le poids réel de votre colis dépasse le poids déclaré lors de la réservation, un supplément proportionnel vous sera demandé avant l'expédition." },
      { q: "Comment obtenir un remboursement ?", a: "En cas de litige résolu en votre faveur, le remboursement est effectué automatiquement sur votre Wallet Konnekt dans un délai de 48h." },
    ],
  },
  {
    icon: Truck,
    title: "Transporteurs (GP)",
    items: [
      { q: "Qu'est-ce qu'un GP ?", a: "Un GP (Gestionnaire de Parcours) est un transporteur vérifié sur Konnekt. Chaque GP est identifié par son KYC, sa notation et son indice de confiance (KTP) pour garantir la fiabilité du service." },
      { q: "Comment devenir GP ?", a: "Inscrivez-vous comme transporteur, complétez votre profil avec vos documents d'identité et informations professionnelles. Après vérification, vous pourrez publier vos offres de transport." },
      { q: "Qu'est-ce que le KTP ?", a: "Le Konnekt Trust Protocol (KTP) est notre système de notation interne qui évalue la fiabilité d'un transporteur basé sur sa ponctualité, la conformité des scans, la satisfaction client et la discipline plateforme." },
    ],
  },
  {
    icon: Shield,
    title: "Sécurité & Litiges",
    items: [
      { q: "Mes données sont-elles protégées ?", a: "Oui, toutes vos données personnelles sont chiffrées et stockées de manière sécurisée. Nous respectons les réglementations en vigueur sur la protection des données." },
      { q: "Comment ouvrir un litige ?", a: "Depuis le détail de votre commande, cliquez sur « Signaler un problème ». Décrivez la situation et joignez des preuves si possible. Notre équipe traitera votre demande sous 48h." },
      { q: "Que couvre l'assurance ?", a: "L'assurance optionnelle couvre la perte ou la détérioration de votre colis jusqu'à la valeur déclarée, selon le palier choisi lors de la réservation." },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(!open)} className="w-full text-left">
      <div className="flex items-start justify-between gap-3 py-3 px-1">
        <p className="text-sm font-medium flex-1">{q}</p>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="text-sm text-muted-foreground pb-3 px-1 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

export default function AideFAQPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filteredCategories = FAQ_CATEGORIES.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold">Aide & FAQ</h1>
            <p className="text-[11px] text-muted-foreground">Trouvez des réponses à vos questions</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6 max-w-lg mx-auto">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une question..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>

        {/* FAQ Categories */}
        {filteredCategories.map((cat, i) => (
          <section key={i}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <cat.icon className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-semibold text-sm">{cat.title}</h2>
            </div>
            <div className="bg-card rounded-xl border border-border divide-y divide-border px-3">
              {cat.items.map((item, j) => (
                <FAQItem key={j} q={item.q} a={item.a} />
              ))}
            </div>
          </section>
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-10">
            <HelpCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun résultat pour « {search} »</p>
          </div>
        )}

        {/* Contact */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Besoin d'aide supplémentaire ?</h2>
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Chat support</p>
                <p className="text-[11px] text-muted-foreground">Disponible 7j/7, 8h-22h</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate("/messages")}>
                Écrire
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Mail className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-[11px] text-muted-foreground">support@konnekt.app</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Phone className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">WhatsApp</p>
                <p className="text-[11px] text-muted-foreground">+221 XX XXX XX XX</p>
              </div>
            </div>
          </div>
        </section>

        <div className="pb-8" />
      </div>
    </div>
  );
}
