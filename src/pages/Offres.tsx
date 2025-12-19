import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { 
  Search, Package, ArrowRight, MapPin, Star,
  Zap, Truck, Ship, Plane, Briefcase, ChevronLeft
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur";

const allOffers = [
  { id: "YOB-GP001", origin: "Dakar", destination: "Abidjan", date: "20 déc.", price: 6500, transportType: "routier" as TransportType, gpName: "Mamadou Express", gpRating: 4.8 },
  { id: "YOB-GP002", origin: "Dakar", destination: "Paris", date: "22 déc.", price: 8500, transportType: "aerien" as TransportType, gpName: "Air Cargo SN", gpRating: 4.9 },
  { id: "YOB-GP003", origin: "Abidjan", destination: "Bamako", date: "21 déc.", price: 5500, transportType: "express" as TransportType, gpName: "Flash Livraison", gpRating: 4.7 },
  { id: "YOB-GP004", origin: "Dakar", destination: "Casablanca", date: "23 déc.", price: 12000, transportType: "maritime" as TransportType, gpName: "Atlantic Freight", gpRating: 4.6 },
  { id: "YOB-GP005", origin: "Conakry", destination: "Dakar", date: "24 déc.", price: 4500, transportType: "voyageur" as TransportType, gpName: "Moussa GP", gpRating: 4.5 },
  { id: "YOB-GP006", origin: "Dakar", destination: "New York", date: "25 déc.", price: 15000, transportType: "aerien" as TransportType, gpName: "World Express", gpRating: 4.9 },
  { id: "YOB-GP007", origin: "Lagos", destination: "Accra", date: "26 déc.", price: 7500, transportType: "routier" as TransportType, gpName: "West Africa Trans", gpRating: 4.6 },
  { id: "YOB-GP008", origin: "Dakar", destination: "Nouakchott", date: "27 déc.", price: 4000, transportType: "express" as TransportType, gpName: "Sahel Express", gpRating: 4.4 },
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
  const [searchParams] = useSearchParams();
  const typeFromUrl = searchParams.get("type") || "all";
  const [activeFilter, setActiveFilter] = useState(typeFromUrl);
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
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      {/* Sticky Search & Filters */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Ville, destination, transporteur..."
            className="pl-10 h-10 bg-muted/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Transport Filters - Scrollable */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {transportFilters.map((filter) => (
            <button
              key={filter.type}
              onClick={() => setActiveFilter(filter.type)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeFilter === filter.type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <filter.icon className="w-3.5 h-3.5" />
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {filteredOffers.length} offre{filteredOffers.length > 1 ? "s" : ""} trouvée{filteredOffers.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Offers List */}
      <div className="px-4 pb-24">
        {filteredOffers.length > 0 ? (
          <div className="space-y-3">
            {filteredOffers.map((offer, index) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/offres/${offer.id}`}>
                  <div className="mobile-card active:scale-[0.98] transition-transform">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant={offer.transportType as any} className="text-xs">
                        {transportFilters.find(f => f.type === offer.transportType)?.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{offer.date}</span>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium">{offer.origin}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{offer.destination}</span>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">{offer.gpName.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{offer.gpName}</p>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-warning fill-warning" />
                            <span className="text-xs text-muted-foreground">{offer.gpRating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{offer.price.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">FCFA/kg</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Aucune offre trouvée</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Essayez de modifier vos critères
            </p>
            <Link to="/demande">
              <Button variant="default" size="sm">
                Créer une demande
              </Button>
            </Link>
          </div>
        )}

        {/* CTA */}
        {filteredOffers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 p-4 rounded-xl bg-muted/50 border border-border text-center"
          >
            <p className="text-sm text-muted-foreground mb-3">
              Vous ne trouvez pas votre trajet ?
            </p>
            <Link to="/demande">
              <Button variant="default" size="sm" className="w-full">
                Créer une demande personnalisée
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
