import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Truck, ArrowRight, Shield, Star, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Hero section dédiée aux visiteurs non connectés
 * Affiche des CTAs pour inscription client et transporteur
 */
export function GuestLandingHero() {
  const stats = [
    { icon: Package, value: "10K+", label: "Colis livrés" },
    { icon: Users, value: "500+", label: "Transporteurs" },
    { icon: Globe, value: "25+", label: "Destinations" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 md:py-20">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="container relative px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Badge variant="secondary" className="mb-4 gap-2">
            <Shield className="w-3 h-3" />
            Plateforme sécurisée
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
            Envoyez vos colis{" "}
            <span className="text-primary">partout en Afrique</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Connectez-vous avec des transporteurs vérifiés pour vos envois nationaux et internationaux. 
            Paiement sécurisé et suivi en temps réel.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mb-12"
        >
          <Link to="/auth">
            <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8">
              <Package className="w-5 h-5" />
              Envoyer un colis
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/transporteur/inscription">
            <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 text-base px-8">
              <Truck className="w-5 h-5" />
              Devenir transporteur
            </Button>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center gap-6 md:gap-12"
        >
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-4 mt-10"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-full border border-border shadow-sm">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Paiement sécurisé</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-full border border-border shadow-sm">
            <Star className="w-4 h-4 text-warning fill-warning" />
            <span className="text-sm font-medium">Transporteurs vérifiés</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-full border border-border shadow-sm">
            <Globe className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Afrique & Europe</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
