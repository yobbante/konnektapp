import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Search, Package, ArrowRight, Filter, MapPin, Calendar, Star,
  SlidersHorizontal, Zap, Truck, Ship, Plane, Briefcase
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShipmentOfferCard } from "@/components/ShipmentOfferCard";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur";

const allOffers = [
  { id: "YOB-GP001", origin: "Dakar", destination: "Abidjan", date: "20 déc. 2024", price: 6500, transportType: "routier" as TransportType, gpName: "Mamadou Express", gpRating: 4.8, status: "available" as const },
  { id: "YOB-GP002", origin: "Dakar", destination: "Paris", date: "22 déc. 2024", price: 8500, transportType: "aerien" as TransportType, gpName: "Air Cargo SN", gpRating: 4.9, status: "available" as const },
  { id: "YOB-GP003", origin: "Abidjan", destination: "Bamako", date: "21 déc. 2024", price: 5500, transportType: "express" as TransportType, gpName: "Flash Livraison", gpRating: 4.7, status: "available" as const },
  { id: "YOB-GP004", origin: "Dakar", destination: "Casablanca", date: "23 déc. 2024", price: 12000, transportType: "maritime" as TransportType, gpName: "Atlantic Freight", gpRating: 4.6, status: "available" as const },
  { id: "YOB-GP005", origin: "Conakry", destination: "Dakar", date: "24 déc. 2024", price: 4500, transportType: "voyageur" as TransportType, gpName: "Moussa GP", gpRating: 4.5, status: "available" as const },
  { id: "YOB-GP006", origin: "Dakar", destination: "New York", date: "25 déc. 2024", price: 15000, transportType: "aerien" as TransportType, gpName: "World Express", gpRating: 4.9, status: "available" as const },
];

const transportFilters = [
  { type: "all", label: "Tous", icon: Package },
  { type: "express", label: "Express", icon: Zap },
  { type: "routier", label: "Routier", icon: Truck },
  { type: "maritime", label: "Maritime", icon: Ship },
  { type: "aerien", label: "Aérien", icon: Plane },
  { type: "voyageur", label: "Voyageur", icon: Briefcase },
];

export default function OffresPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOffers = allOffers.filter((offer) => {
    const matchesType = activeFilter === "all" || offer.transportType === activeFilter;
    const matchesSearch = 
      offer.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.gpName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="container">
          {/* Header */}
          <div className="mb-10">
            <Badge variant="secondary" className="mb-4">Marketplace</Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Offres de transport disponibles
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Parcourez les offres de nos partenaires GP vérifiés et réservez votre transport en quelques clics.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par ville, destination ou transporteur..."
                  className="pl-12 h-12"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="h-12">
                <SlidersHorizontal className="w-4 h-4" />
                Filtres avancés
              </Button>
            </div>

            {/* Transport Type Filters */}
            <div className="flex flex-wrap gap-2">
              {transportFilters.map((filter) => (
                <Button
                  key={filter.type}
                  variant={activeFilter === filter.type ? "gold" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter.type)}
                  className="gap-2"
                >
                  <filter.icon className="w-4 h-4" />
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="mb-6">
            <p className="text-muted-foreground">
              {filteredOffers.length} offre{filteredOffers.length > 1 ? "s" : ""} trouvée{filteredOffers.length > 1 ? "s" : ""}
            </p>
          </div>

          {/* Offers Grid */}
          {filteredOffers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOffers.map((offer, index) => (
                <ShipmentOfferCard key={offer.id} {...offer} delay={index * 0.05} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Aucune offre trouvée</h3>
              <p className="text-muted-foreground mb-6">
                Essayez de modifier vos critères de recherche
              </p>
              <Link to="/demande">
                <Button variant="gold">
                  Créer une demande personnalisée
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 p-8 rounded-2xl bg-muted/50 border border-border text-center"
          >
            <h3 className="text-2xl font-bold text-foreground mb-3">
              Vous ne trouvez pas ce que vous cherchez ?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Créez une demande personnalisée et recevez des offres adaptées de nos GP partenaires.
            </p>
            <Link to="/demande">
              <Button variant="gold" size="lg">
                Créer une demande
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
