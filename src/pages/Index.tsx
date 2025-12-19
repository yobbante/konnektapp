import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, Truck, Search, ArrowRight, Zap, Ship, Plane, 
  MapPin, Star, Shield, Clock
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const transportTypes = [
  { icon: Zap, label: "Express", color: "bg-transport-express/10 text-transport-express" },
  { icon: Truck, label: "Routier", color: "bg-transport-routier/10 text-transport-routier" },
  { icon: Ship, label: "Maritime", color: "bg-transport-maritime/10 text-transport-maritime" },
  { icon: Plane, label: "Aérien", color: "bg-transport-aerien/10 text-transport-aerien" },
];

const recentOffers = [
  { id: "1", origin: "Dakar", destination: "Abidjan", price: 6500, type: "routier", gpName: "Mamadou Express", rating: 4.8 },
  { id: "2", origin: "Dakar", destination: "Paris", price: 8500, type: "aerien", gpName: "Air Cargo SN", rating: 4.9 },
  { id: "3", origin: "Abidjan", destination: "Bamako", price: 5500, type: "express", gpName: "Flash Livraison", rating: 4.7 },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      {/* Hero Section - Mobile Optimized */}
      <section className="px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Badge variant="default" className="mb-4">
            🚀 #1 en Afrique de l'Ouest
          </Badge>
          
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight">
            Envoyez vos colis <br />
            <span className="text-primary">partout en Afrique</span>
          </h1>
          
          <p className="text-muted-foreground text-sm mb-6">
            Connectez-vous avec des transporteurs vérifiés
          </p>

          {/* Quick Actions - 2 taps */}
          <div className="flex flex-col gap-3 mb-6">
            <Link to="/demande">
              <Button variant="default" size="lg" className="w-full">
                <Package className="w-5 h-5" />
                Envoyer un colis
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/offres">
              <Button variant="outline" size="lg" className="w-full">
                <Search className="w-5 h-5" />
                Voir les offres
              </Button>
            </Link>
          </div>

          {/* Transport Types - Scrollable */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {transportTypes.map((type) => (
              <Link 
                key={type.label} 
                to={`/offres?type=${type.label.toLowerCase()}`}
                className="flex-shrink-0"
              >
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${type.color} border border-current/20`}>
                  <type.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{type.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Quick Stats */}
      <section className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="mobile-card text-center">
            <p className="text-xl font-bold text-primary">5000+</p>
            <p className="text-xs text-muted-foreground">GP vérifiés</p>
          </div>
          <div className="mobile-card text-center">
            <p className="text-xl font-bold text-primary">50K+</p>
            <p className="text-xs text-muted-foreground">Colis livrés</p>
          </div>
          <div className="mobile-card text-center">
            <p className="text-xl font-bold text-primary">4.8</p>
            <p className="text-xs text-muted-foreground">Note moyenne</p>
          </div>
        </div>
      </section>

      {/* Recent Offers */}
      <section className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Offres récentes</h2>
          <Link to="/offres" className="text-sm text-primary font-medium">
            Voir tout
          </Link>
        </div>

        <div className="space-y-3">
          {recentOffers.map((offer, index) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/offres/${offer.id}`}>
                <div className="mobile-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{offer.origin}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium text-sm">{offer.destination}</span>
                    </div>
                    <Badge variant={offer.type as any} className="text-xs">
                      {offer.type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{offer.gpName}</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-warning fill-warning" />
                        <span className="text-xs">{offer.rating}</span>
                      </div>
                    </div>
                    <span className="font-bold text-primary">{offer.price} FCFA/kg</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why Us - Simple */}
      <section className="px-4 py-4">
        <h2 className="font-semibold text-foreground mb-4">Pourquoi nous choisir</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="mobile-card flex flex-col items-center text-center p-4">
            <Shield className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm font-medium">GP Vérifiés</span>
          </div>
          <div className="mobile-card flex flex-col items-center text-center p-4">
            <Clock className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm font-medium">Suivi temps réel</span>
          </div>
        </div>
      </section>

      {/* GP CTA */}
      <section className="px-4 py-6 mb-4">
        <div className="bg-primary rounded-2xl p-5 text-center">
          <Truck className="w-10 h-10 text-primary-foreground mx-auto mb-3" />
          <h3 className="font-bold text-primary-foreground mb-2">Vous êtes transporteur ?</h3>
          <p className="text-primary-foreground/80 text-sm mb-4">
            Rejoignez notre réseau et développez votre activité
          </p>
          <Link to="/gp/inscription">
            <Button variant="secondary" size="default" className="w-full">
              Devenir GP
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <MobileNav />
    </div>
  );
}
