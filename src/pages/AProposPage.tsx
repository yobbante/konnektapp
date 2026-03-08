/**
 * À propos — About Konnekt
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Users, Shield, Truck, Heart, Zap, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const APP_VERSION = "1.0.0";

const stats = [
  { label: "Transporteurs vérifiés", value: "500+", icon: Truck },
  { label: "Pays couverts", value: "15+", icon: Globe },
  { label: "Colis livrés", value: "10K+", icon: Zap },
];

const values = [
  { icon: Shield, title: "Confiance", desc: "Chaque transporteur est vérifié (KYC) et noté par notre système de confiance KTP." },
  { icon: Users, title: "Communauté", desc: "Un réseau de voyageurs et transporteurs qui relie l'Afrique au monde." },
  { icon: Heart, title: "Transparence", desc: "Prix affichés, 0% de frais cachés côté client, escrow sécurisé." },
  { icon: MapPin, title: "Proximité", desc: "Des points de dépôt et de retrait au plus proche de chez vous." },
];

export default function AProposPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold">À propos</h1>
            <p className="text-[11px] text-muted-foreground">Konnekt v{APP_VERSION}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <span className="text-3xl font-black text-primary">K</span>
          </div>
          <h2 className="text-xl font-bold">Konnekt</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            La plateforme qui connecte expéditeurs et transporteurs vérifiés pour des envois sécurisés entre l'Afrique et le monde entier.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl border border-border p-3 text-center"
            >
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-1.5" />
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Mission */}
        <section>
          <h3 className="font-bold text-sm mb-3">Notre mission</h3>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Konnekt est né d'un constat simple : envoyer un colis entre l'Afrique et l'Europe devrait être aussi simple qu'envoyer un message. Notre plateforme met en relation des voyageurs réguliers avec des personnes souhaitant expédier des colis, créant ainsi un réseau de transport communautaire, sécurisé et abordable.
            </p>
          </div>
        </section>

        {/* Values */}
        <section>
          <h3 className="font-bold text-sm mb-3">Nos valeurs</h3>
          <div className="space-y-3">
            {values.map((val, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-start gap-3 bg-card rounded-xl border border-border p-3.5"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <val.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{val.title}</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{val.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section>
          <h3 className="font-bold text-sm mb-3">Comment ça marche</h3>
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            {[
              { step: "1", title: "Choisissez un trajet", desc: "Trouvez un transporteur vérifié sur votre itinéraire" },
              { step: "2", title: "Réservez en ligne", desc: "Déclarez votre colis, choisissez les options et payez" },
              { step: "3", title: "Déposez votre colis", desc: "Rendez-vous au point de dépôt indiqué" },
              { step: "4", title: "Suivez en temps réel", desc: "Scans QR, notifications et suivi GPS" },
              { step: "5", title: "Livraison confirmée", desc: "Le destinataire confirme et le paiement est libéré" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="text-center space-y-1 pt-4 pb-8">
          <p className="text-xs text-muted-foreground">Konnekt © 2026. Tous droits réservés.</p>
          <p className="text-[10px] text-muted-foreground/60">Version {APP_VERSION} • Made with ❤️ in Africa</p>
        </div>
      </div>
    </div>
  );
}
