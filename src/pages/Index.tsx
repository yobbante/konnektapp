import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Search, ArrowRight, Package, Truck, Ship, Plane, Zap, 
  Shield, Clock, Globe, Users, CheckCircle, Briefcase,
  MapPin, Star, TrendingUp, Award, HeartHandshake
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeatureCard } from "@/components/FeatureCard";
import { StatsCard } from "@/components/StatsCard";
import { StepCard } from "@/components/StepCard";
import { TestimonialCard } from "@/components/TestimonialCard";
import { ShipmentOfferCard } from "@/components/ShipmentOfferCard";
import heroImage from "@/assets/hero-logistics.jpg";

const transportTypes = [
  { icon: Zap, label: "Express", color: "bg-transport-express/10 text-transport-express" },
  { icon: Truck, label: "Routier", color: "bg-transport-routier/10 text-transport-routier" },
  { icon: Ship, label: "Maritime", color: "bg-transport-maritime/10 text-transport-maritime" },
  { icon: Plane, label: "Aérien", color: "bg-transport-aerien/10 text-transport-aerien" },
  { icon: Briefcase, label: "Voyageur", color: "bg-transport-voyageur/10 text-transport-voyageur" },
];

const features = [
  { icon: Shield, title: "Sécurité garantie", description: "Tous nos GP sont vérifiés et validés. Assurance disponible pour chaque envoi." },
  { icon: Clock, title: "Suivi en temps réel", description: "Suivez votre colis à chaque étape, de la prise en charge à la livraison." },
  { icon: Globe, title: "Couverture régionale", description: "Réseau étendu en Afrique de l'Ouest : Sénégal, Côte d'Ivoire, Mali et plus." },
  { icon: Users, title: "Support dédié", description: "Notre équipe est disponible 7j/7 pour vous accompagner." },
  { icon: TrendingUp, title: "Prix transparents", description: "Comparez les offres et choisissez le meilleur rapport qualité-prix." },
  { icon: Award, title: "GP Premium", description: "Accédez aux meilleurs transporteurs avec des services prioritaires." },
];

const steps = [
  { icon: Package, title: "Décrivez votre envoi", description: "Indiquez l'origine, la destination, le poids et le type de transport souhaité." },
  { icon: Search, title: "Comparez les offres", description: "Recevez plusieurs propositions de GP vérifiés et comparez les prix." },
  { icon: CheckCircle, title: "Réservez & suivez", description: "Payez en toute sécurité et suivez votre colis jusqu'à destination." },
];

const testimonials = [
  { name: "Amadou Diallo", role: "Importateur, Dakar", content: "Yobbanté-GP a révolutionné ma façon de gérer mes expéditions. Je trouve des transporteurs fiables en quelques minutes.", rating: 5 },
  { name: "Marie Kouassi", role: "Commerçante, Abidjan", content: "Le suivi en temps réel me rassure énormément. Je recommande à tous mes collègues.", rating: 5 },
  { name: "Ibrahim Traoré", role: "GP Maritime, Dakar", content: "Grâce à l'abonnement Premium, j'ai triplé mes clients en 3 mois. Excellent service !", rating: 5 },
];

const recentOffers = [
  { id: "YOB-GP001", origin: "Dakar", destination: "Abidjan", date: "20 déc. 2024", price: 6500, transportType: "routier" as const, gpName: "Mamadou Express", gpRating: 4.8, status: "available" as const },
  { id: "YOB-GP002", origin: "Dakar", destination: "Paris", date: "22 déc. 2024", price: 8500, transportType: "aerien" as const, gpName: "Air Cargo SN", gpRating: 4.9, status: "available" as const },
  { id: "YOB-GP003", origin: "Abidjan", destination: "Bamako", date: "21 déc. 2024", price: 5500, transportType: "express" as const, gpName: "Flash Livraison", gpRating: 4.7, status: "available" as const },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Logistique Afrique de l'Ouest" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/60" />
        </div>

        <div className="container relative z-10 py-20">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="gold" className="mb-6 px-4 py-2">
                <span className="mr-2">🚀</span> Marketplace de fret #1 en Afrique de l'Ouest
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-secondary mb-6 leading-tight"
            >
              Envoyez vos colis <br />
              <span className="text-primary-foreground">partout en Afrique</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl"
            >
              Connectez-vous avec des milliers de transporteurs vérifiés. 
              Maritime, aérien, routier ou express — trouvez la solution idéale pour vos envois.
            </motion.p>

            {/* Transport Type Pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-3 mb-8"
            >
              {transportTypes.map((type, index) => (
                <div
                  key={type.label}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20"
                >
                  <type.icon className="w-4 h-4 text-secondary" />
                  <span className="text-sm font-medium text-primary-foreground">{type.label}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link to="/demande">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  <Package className="w-5 h-5" />
                  Envoyer un colis
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/gp">
                <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                  <Truck className="w-5 h-5" />
                  Devenir transporteur GP
                </Button>
              </Link>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-primary-foreground/20"
            >
              <div>
                <p className="text-3xl font-bold text-secondary">5000+</p>
                <p className="text-sm text-primary-foreground/70">GP vérifiés</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-secondary">50K+</p>
                <p className="text-sm text-primary-foreground/70">Colis livrés</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-secondary">15+</p>
                <p className="text-sm text-primary-foreground/70">Pays couverts</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-secondary">4.8/5</p>
                <p className="text-sm text-primary-foreground/70">Note moyenne</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Recent Offers Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Offres récentes</h2>
              <p className="text-muted-foreground">Réservez votre transport dès maintenant</p>
            </div>
            <Link to="/offres">
              <Button variant="outline">
                Voir toutes les offres
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentOffers.map((offer, index) => (
              <ShipmentOfferCard key={offer.id} {...offer} delay={index * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
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
              Simple, rapide, fiable
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              En 3 étapes, trouvez le transporteur idéal pour vos envois
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <StepCard
                key={step.title}
                step={index + 1}
                {...step}
                delay={index * 0.15}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-center mt-12"
          >
            <Link to="/demande">
              <Button variant="gold" size="lg">
                Commencer maintenant
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Pourquoi Yobbanté-GP</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              La plateforme qui vous simplifie la vie
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Découvrez les avantages qui font de nous le choix préféré des entreprises et particuliers
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} delay={index * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* GP Section */}
      <section className="py-20 bg-hero-gradient text-primary-foreground">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Badge variant="gold" className="mb-6">Devenir GP</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-6">
                Rejoignez notre réseau de transporteurs
              </h2>
              <p className="text-primary-foreground/80 mb-8 text-lg">
                Vous êtes transporteur maritime, aérien, routier ou voyageur avec capacité bagages ? 
                Monétisez votre activité et accédez à des milliers de clients.
              </p>

              <ul className="space-y-4 mb-8">
                {[
                  "Inscription gratuite et validation rapide",
                  "Accès à un flux constant de demandes",
                  "Outils de gestion et analytics",
                  "Paiements sécurisés et reversements rapides",
                  "Abonnement Premium pour plus de visibilité",
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link to="/gp/inscription">
                <Button variant="hero" size="lg">
                  <Truck className="w-5 h-5" />
                  Devenir GP maintenant
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-6"
            >
              <StatsCard icon={Users} value="5000+" label="GP actifs" delay={0.1} />
              <StatsCard icon={Package} value="50K+" label="Livraisons" delay={0.2} />
              <StatsCard icon={Globe} value="15+" label="Pays" delay={0.3} />
              <StatsCard icon={Star} value="4.8" label="Note moyenne" delay={0.4} />
            </motion.div>
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
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Témoignages</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Découvrez ce que nos clients et partenaires GP disent de nous
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={testimonial.name} {...testimonial} delay={index * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Prêt à simplifier vos envois ?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Rejoignez des milliers d'utilisateurs qui font confiance à Yobbanté-GP pour leurs 
              expéditions en Afrique de l'Ouest et dans le monde.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/demande">
                <Button variant="gold" size="xl">
                  <Package className="w-5 h-5" />
                  Envoyer un colis
                </Button>
              </Link>
              <Link to="/gp/inscription">
                <Button variant="outline" size="xl">
                  <HeartHandshake className="w-5 h-5" />
                  Devenir partenaire GP
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
