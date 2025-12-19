import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ArrowRight, CheckCircle, Users, TrendingUp, Shield, 
  Wallet, BarChart3, Clock, Star, Package, Globe
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeatureCard } from "@/components/FeatureCard";

const benefits = [
  { icon: Users, title: "Accès à des milliers de clients", description: "Recevez des demandes d'envoi correspondant à vos zones de couverture." },
  { icon: Wallet, title: "Paiements sécurisés", description: "Recevez vos paiements de manière sécurisée et rapide." },
  { icon: BarChart3, title: "Dashboard complet", description: "Gérez vos offres, suivez vos statistiques et optimisez votre activité." },
  { icon: TrendingUp, title: "Visibilité accrue", description: "Passez en Premium pour apparaître en priorité sur les recherches." },
  { icon: Shield, title: "Plateforme de confiance", description: "Bénéficiez de la crédibilité de Yobbanté-GP auprès des clients." },
  { icon: Clock, title: "Support 24/7", description: "Notre équipe vous accompagne à chaque étape." },
];

const plans = [
  {
    name: "Gratuit",
    price: "0",
    period: "/mois",
    description: "Idéal pour démarrer",
    features: [
      "Profil GP vérifié",
      "Réception de demandes",
      "Messagerie clients",
      "3 offres actives max",
      "Support standard",
    ],
    cta: "Commencer gratuitement",
    popular: false,
  },
  {
    name: "Premium",
    price: "49 000",
    currency: "FCFA",
    period: "/mois",
    description: "Pour les professionnels",
    features: [
      "Tout le plan Gratuit",
      "Offres illimitées",
      "Mise en avant prioritaire",
      "Badge Premium visible",
      "Analytics avancés",
      "Support prioritaire",
      "Alertes demandes en temps réel",
    ],
    cta: "Passer Premium",
    popular: true,
  },
];

const stats = [
  { value: "5000+", label: "GP actifs" },
  { value: "50K+", label: "Livraisons" },
  { value: "15+", label: "Pays" },
  { value: "4.8/5", label: "Note moyenne" },
];

export default function GPLanding() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero */}
      <section className="pt-24 pb-20 bg-hero-gradient text-primary-foreground">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="gold" className="mb-6">Espace Transporteur</Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-secondary mb-6">
                Développez votre activité de transport
              </h1>
              <p className="text-lg text-primary-foreground/80 mb-8">
                Rejoignez le premier réseau de transporteurs en Afrique de l'Ouest. 
                Recevez des demandes, gérez vos offres et développez votre clientèle.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  "Inscription gratuite et validation rapide",
                  "Accès à des milliers de clients potentiels",
                  "Paiements sécurisés et reversements rapides",
                  "Outils de gestion et analytics",
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/gp/inscription">
                  <Button variant="hero" size="xl">
                    Devenir GP maintenant
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="hero-outline" size="lg">
                    J'ai déjà un compte
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:grid grid-cols-2 gap-6"
            >
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="p-6 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 text-center"
                >
                  <p className="text-3xl font-bold text-secondary mb-1">{stat.value}</p>
                  <p className="text-sm text-primary-foreground/70">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Avantages</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pourquoi devenir GP Yobbanté ?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Des outils puissants pour développer votre activité de transport
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <FeatureCard key={benefit.title} {...benefit} delay={index * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Tarifs</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Choisissez votre formule
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Commencez gratuitement, passez Premium pour plus de visibilité
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-8 rounded-2xl border-2 ${
                  plan.popular 
                    ? "border-secondary bg-card shadow-lg" 
                    : "border-border bg-card"
                }`}
              >
                {plan.popular && (
                  <Badge variant="gold" className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Populaire
                  </Badge>
                )}
                
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground mb-4">{plan.description}</p>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.currency && (
                    <span className="text-lg text-muted-foreground ml-1">{plan.currency}</span>
                  )}
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle className={`w-5 h-5 flex-shrink-0 ${plan.popular ? "text-secondary" : "text-success"}`} />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/gp/inscription">
                  <Button 
                    variant={plan.popular ? "gold" : "outline"} 
                    className="w-full"
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Prêt à développer votre activité ?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Rejoignez les milliers de transporteurs qui font confiance à Yobbanté-GP. 
              L'inscription est gratuite et prend moins de 5 minutes.
            </p>
            <Link to="/gp/inscription">
              <Button variant="gold" size="xl">
                Commencer maintenant
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
