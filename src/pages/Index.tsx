import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, Truck, Search, ArrowRight, Zap, Ship, Plane, 
  MapPin, Star, Shield, Clock, Briefcase
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur";

const transportTypes = [
  { type: "express" as TransportType, icon: Zap, label: "Express", color: "bg-transport-express/10 text-transport-express border-transport-express/20" },
  { type: "routier" as TransportType, icon: Truck, label: "Routier", color: "bg-transport-routier/10 text-transport-routier border-transport-routier/20" },
  { type: "maritime" as TransportType, icon: Ship, label: "Maritime", color: "bg-transport-maritime/10 text-transport-maritime border-transport-maritime/20" },
  { type: "aerien" as TransportType, icon: Plane, label: "Aérien", color: "bg-transport-aerien/10 text-transport-aerien border-transport-aerien/20" },
  { type: "voyageur" as TransportType, icon: Briefcase, label: "Voyageur", color: "bg-transport-voyageur/10 text-transport-voyageur border-transport-voyageur/20" },
];

const allOffers = [
  { id: "1", origin: "Dakar", destination: "Abidjan", price: 6500, type: "routier" as TransportType, gpName: "Mamadou Express", rating: 4.8 },
  { id: "2", origin: "Dakar", destination: "Paris", price: 8500, type: "aerien" as TransportType, gpName: "Air Cargo SN", rating: 4.9 },
  { id: "3", origin: "Abidjan", destination: "Bamako", price: 5500, type: "express" as TransportType, gpName: "Flash Livraison", rating: 4.7 },
  { id: "4", origin: "Dakar", destination: "Casablanca", price: 12000, type: "maritime" as TransportType, gpName: "Atlantic Freight", rating: 4.6 },
  { id: "5", origin: "Conakry", destination: "Dakar", price: 4500, type: "voyageur" as TransportType, gpName: "Moussa GP", rating: 4.5 },
  { id: "6", origin: "Lagos", destination: "Accra", price: 7500, type: "routier" as TransportType, gpName: "West Africa Trans", rating: 4.6 },
];

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<TransportType | null>(null);

  const filteredOffers = allOffers.filter((offer) => {
    const matchesType = !selectedType || offer.type === selectedType;
    const matchesSearch = !searchQuery || 
      offer.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.destination.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const displayedOffers = selectedType || searchQuery ? filteredOffers : filteredOffers.slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      {/* Hero Section */}
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
          
          <p className="text-muted-foreground text-sm mb-5">
            Connectez-vous avec des transporteurs vérifiés
          </p>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une ville, destination..."
              className="pl-10 h-11 bg-muted/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Quick Action */}
          <Link to="/demande">
            <Button variant="default" size="lg" className="w-full mb-5">
              <Package className="w-5 h-5" />
              Envoyer un colis
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Transport Types - Interactive Filter */}
      <section className="px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Voir les offres</h2>
          {selectedType && (
            <button
              onClick={() => setSelectedType(null)}
              className="text-sm text-primary font-medium"
            >
              Tout voir
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {transportTypes.map((type) => (
            <button 
              key={type.label} 
              onClick={() => setSelectedType(selectedType === type.type ? null : type.type)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                selectedType === type.type 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : type.color
              }`}
            >
              <type.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Filtered Offers List */}
      <section className="px-4 py-4">
        {(selectedType || searchQuery) && (
          <p className="text-sm text-muted-foreground mb-3">
            {filteredOffers.length} offre{filteredOffers.length > 1 ? "s" : ""} 
            {selectedType && ` ${transportTypes.find(t => t.type === selectedType)?.label}`}
          </p>
        )}

        <div className="space-y-3">
          {displayedOffers.map((offer, index) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/offres/${offer.id}`}>
                <div className="mobile-card active:scale-[0.98] transition-transform">
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

        {filteredOffers.length === 0 && (
          <div className="text-center py-8">
            <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune offre trouvée</p>
          </div>
        )}

        {!selectedType && !searchQuery && (
          <Link to="/offres" className="block mt-4">
            <Button variant="outline" className="w-full">
              Voir toutes les offres
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        )}

        {(selectedType || searchQuery) && filteredOffers.length > 0 && (
          <Link to={`/offres${selectedType ? `?type=${selectedType}` : ''}`} className="block mt-4">
            <Button variant="outline" className="w-full">
              Voir sur la page offres
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        )}
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

      {/* Why Us */}
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
