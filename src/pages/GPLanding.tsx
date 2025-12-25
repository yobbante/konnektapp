import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, CheckCircle, Users, TrendingUp, Shield, 
  Wallet, BarChart3, Clock, Star, Package, Globe, Truck, 
  Ship, Plane, Zap, Building2, Route, Award, HeartHandshake
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeatureCard } from "@/components/FeatureCard";

const activityTypes = [
  { 
    icon: Truck, 
    title: "Transport Routier", 
    description: "Camions, fourgons, utilitaires",
    color: "bg-primary/10 text-primary"
  },
  { 
    icon: Ship, 
    title: "Transport Maritime", 
    description: "Conteneurs, fret maritime",
    color: "bg-blue-500/10 text-blue-500"
  },
  { 
    icon: Plane, 
    title: "Transport Aérien", 
    description: "Fret aérien international",
    color: "bg-purple-500/10 text-purple-500"
  },
  { 
    icon: Zap, 
    title: "Express / Coursiers", 
    description: "Livraisons rapides B2B/B2C",
    color: "bg-secondary/10 text-secondary"
  },
  { 
    icon: Building2, 
    title: "Agences de Voyage", 
    description: "Billetterie, fret accompagné",
    color: "bg-accent/10 text-accent"
  },
];

const benefits = [
  { icon: Users, title: "Accès à des milliers de clients", description: "Recevez des demandes d'envoi correspondant à vos zones de couverture." },
  { icon: Wallet, title: "Paiements sécurisés", description: "Recevez vos paiements de manière sécurisée via notre système de séquestre." },
  { icon: BarChart3, title: "Dashboard complet", description: "Gérez vos offres, suivez vos statistiques et optimisez votre activité." },
  { icon: TrendingUp, title: "Visibilité accrue", description: "Passez en Premium pour apparaître en priorité sur les recherches." },
  { icon: Shield, title: "Plateforme de confiance", description: "Bénéficiez de la crédibilité de Yobbanté auprès des clients." },
  { icon: Clock, title: "Support 24/7", description: "Notre équipe vous accompagne à chaque étape de votre activité." },
];

const steps = [
  { step: "1", title: "Choisissez votre activité", description: "Sélectionnez votre type de transport parmi nos 5 catégories." },
  { step: "2", title: "Complétez votre profil", description: "Renseignez vos informations et documents en quelques minutes." },
  { step: "3", title: "Commencez à recevoir des demandes", description: "Une fois validé, accédez aux demandes de transport." },
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
  { value: "5000+", label: "Transporteurs actifs" },
  { value: "50K+", label: "Livraisons" },
  { value: "15+", label: "Pays couverts" },
  { value: "4.8/5", label: "Note moyenne" },
];

const testimonials = [
  { name: "Mamadou D.", role: "Transporteur routier", quote: "Grâce à Yobbanté, j'ai triplé mon activité en 6 mois.", rating: 5 },
  { name: "Fatou S.", role: "Coursière Express", quote: "Interface simple et paiements toujours à temps.", rating: 5 },
  { name: "Ibrahima N.", role: "Agence de voyage", quote: "Parfait pour compléter nos revenus avec le fret accompagné.", rating: 5 },
];

export default function GPLanding() {
  const navigate = useNavigate();

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
              <Badge variant="gold" className="mb-6">Rejoignez le réseau Yobbanté</Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-secondary mb-6">
                Développez votre activité de transport
              </h1>
              <p className="text-lg text-primary-foreground/80 mb-8">
                Quel que soit votre métier – routier, maritime, aérien, coursier ou agence de voyage – 
                rejoignez la première plateforme logistique d'Afrique de l'Ouest.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  "Inscription gratuite en 3 étapes",
                  "Accès à des demandes qualifiées",
                  "Paiements sécurisés par séquestre",
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
                    Devenir transporteur
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
              {stats.map((stat) => (
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

      {/* Activity Types */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge variant="secondary" className="mb-4">Activités</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Quelle est votre activité ?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Yobbanté accueille tous les professionnels du transport et de la logistique
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {activityTypes.map((activity, index) => (
              <motion.button
                key={activity.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate("/gp/inscription")}
                className="p-6 rounded-2xl bg-card border border-border hover:border-primary hover:shadow-lg transition-all text-center group"
              >
                <div className={`w-14 h-14 rounded-xl ${activity.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <activity.icon className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{activity.title}</h3>
                <p className="text-xs text-muted-foreground">{activity.description}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Comment ça marche</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Inscription en 3 étapes simples
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Rejoignez notre réseau en moins de 5 minutes
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center relative"
              >
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {step.step}
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link to="/gp/inscription">
              <Button variant="gold" size="xl">
                Commencer mon inscription
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Avantages</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pourquoi rejoindre Yobbanté ?
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

      {/* Testimonials */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge variant="secondary" className="mb-4">Témoignages</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ils nous font confiance
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-foreground mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </motion.div>
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
              Rejoignez les milliers de transporteurs qui font confiance à Yobbanté. 
              L'inscription est gratuite et prend moins de 5 minutes.
            </p>
            <Link to="/gp/inscription">
              <Button variant="gold" size="xl">
                Devenir transporteur maintenant
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