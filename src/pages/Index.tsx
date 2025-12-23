import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, Truck, ArrowRight, Zap, Ship, Plane, 
  MapPin, Star, Shield, Clock, Briefcase, Building2, Filter, Scale, Weight
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { CompareProvider, useCompare, CompareOffer } from "@/components/offers/OfferCompare";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur" | "agence";

const transportTypes = [
  { type: "voyageur" as TransportType, icon: Briefcase, label: "GP", color: "bg-transport-voyageur/10 text-transport-voyageur border-transport-voyageur/20" },
  { type: "agence" as TransportType, icon: Building2, label: "Agence", color: "bg-transport-agence/10 text-transport-agence border-transport-agence/20" },
  { type: "express" as TransportType, icon: Zap, label: "Express", color: "bg-transport-express/10 text-transport-express border-transport-express/20" },
  { type: "routier" as TransportType, icon: Truck, label: "Routier", color: "bg-transport-routier/10 text-transport-routier border-transport-routier/20" },
  { type: "maritime" as TransportType, icon: Ship, label: "Maritime", color: "bg-transport-maritime/10 text-transport-maritime border-transport-maritime/20" },
  { type: "aerien" as TransportType, icon: Plane, label: "Aérien", color: "bg-transport-aerien/10 text-transport-aerien border-transport-aerien/20" },
];

function IndexContent() {
  const [selectedType, setSelectedType] = useState<TransportType | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("gp_offers")
        .select(`
          *,
          gp_profiles!inner(business_name, rating),
          vehicles(id, name, vehicle_type, max_weight_kg)
        `)
        .eq("status", "active")
        .gte("departure_date", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error("Error loading offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOffers = offers.filter((offer) => {
    return !selectedType || offer.transport_type === selectedType;
  });

  const displayedOffers = selectedType ? filteredOffers : filteredOffers.slice(0, 4);

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

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <Link to="/demande" className="flex-1">
              <Button variant="default" size="lg" className="w-full">
                <Package className="w-5 h-5" />
                Envoyer un colis
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/gp/inscription" className="flex-1">
              <Button variant="outline" size="lg" className="w-full">
                <Truck className="w-5 h-5" />
                Devenir transporteur
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground text-lg">Offres disponibles</h2>
          <div className="flex items-center gap-2">
            {selectedType && (
              <button
                onClick={() => setSelectedType(null)}
                className="text-xs text-primary font-medium hover:underline"
              >
                Tout voir
              </button>
            )}
            {/* Mobile: Sheet for filters */}
            <Sheet open={showFilterSheet} onOpenChange={setShowFilterSheet}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="outline" size="sm" className="gap-1">
                  <Filter className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[50vh] rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Type de transport</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {transportTypes.map((type) => (
                    <button
                      key={type.label}
                      onClick={() => {
                        setSelectedType(selectedType === type.type ? null : type.type);
                        setShowFilterSheet(false);
                      }}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        selectedType === type.type 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : `${type.color} hover:shadow-md bg-card`
                      }`}
                    >
                      <type.icon className={`w-5 h-5 ${selectedType === type.type ? 'text-primary-foreground' : ''}`} />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Responsive Grid */}
        <div className="flex flex-col lg:flex-row lg:gap-6">
          
          {/* Transport Type Selector */}
          <div className="lg:w-48 lg:flex-shrink-0 mb-4 lg:mb-0">
            {/* Mobile: Horizontal scroll with icons only */}
            <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {transportTypes.map((type, index) => (
                <motion.button 
                  key={type.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedType(selectedType === type.type ? null : type.type)}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all flex-shrink-0 ${
                    selectedType === type.type 
                      ? "bg-primary text-primary-foreground border-primary shadow-lg" 
                      : `${type.color} hover:shadow-md bg-card`
                  }`}
                  title={type.label}
                >
                  <type.icon className={`w-5 h-5 ${selectedType === type.type ? 'text-primary-foreground' : ''}`} />
                </motion.button>
              ))}
            </div>
            
            {/* Desktop: Full buttons */}
            <div className="hidden lg:flex lg:flex-col gap-2">
              {transportTypes.map((type, index) => (
                <motion.button 
                  key={type.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedType(selectedType === type.type ? null : type.type)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all w-full ${
                    selectedType === type.type 
                      ? "bg-primary text-primary-foreground border-primary shadow-lg" 
                      : `${type.color} hover:shadow-md bg-card`
                  }`}
                >
                  <type.icon className={`w-5 h-5 flex-shrink-0 ${selectedType === type.type ? 'text-primary-foreground' : ''}`} />
                  <span className="text-sm font-medium">{type.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
          
          {/* Offers List */}
          <div className="flex-1">
            {selectedType && (
              <p className="text-sm text-muted-foreground mb-3">
                {filteredOffers.length} offre{filteredOffers.length > 1 ? "s" : ""} {transportTypes.find(t => t.type === selectedType)?.label}
              </p>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayedOffers.map((offer, index) => (
                  <OfferCard key={offer.id} offer={offer} index={index} />
                ))}
              </div>
            )}

            {!loading && filteredOffers.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucune offre disponible</p>
              </div>
            )}

            {!loading && !selectedType && offers.length > 0 && (
              <Link to="/offres" className="block mt-4">
                <Button variant="outline" className="w-full">
                  Voir toutes les offres
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}

            {!loading && selectedType && filteredOffers.length > 0 && (
              <Link to={`/offres?type=${selectedType}`} className="block mt-4">
                <Button variant="outline" className="w-full">
                  Voir sur la page offres
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="mobile-card text-center">
            <p className="text-xl font-bold text-primary">5000+</p>
            <p className="text-xs text-muted-foreground">Transporteurs</p>
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
            <span className="text-sm font-medium">Transporteurs vérifiés</span>
          </div>
          <div className="mobile-card flex flex-col items-center text-center p-4">
            <Clock className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm font-medium">Suivi temps réel</span>
          </div>
        </div>
      </section>

      {/* Transporter CTA */}
      <section className="px-4 py-6 mb-4">
        <div className="bg-primary rounded-2xl p-5 text-center">
          <Truck className="w-10 h-10 text-primary-foreground mx-auto mb-3" />
          <h3 className="font-bold text-primary-foreground mb-2">Vous êtes transporteur ?</h3>
          <p className="text-primary-foreground/80 text-sm mb-4">
            Rejoignez notre réseau et développez votre activité
          </p>
          <Link to="/gp/inscription">
            <Button variant="secondary" size="default" className="w-full">
              Devenir transporteur
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <MobileNav />
    </div>
  );
}

// Offer Card with compare functionality
function OfferCard({ offer, index }: { offer: any; index: number }) {
  const { addToCompare, isInCompare, removeFromCompare } = useCompare();
  
  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isInCompare(offer.id)) {
      removeFromCompare(offer.id);
    } else {
      const compareOffer: CompareOffer = {
        id: offer.id,
        origin_city: offer.origin_city,
        origin_country: offer.origin_country,
        destination_city: offer.destination_city,
        destination_country: offer.destination_country,
        departure_date: offer.departure_date,
        price_per_kg: offer.price_per_kg,
        currency: offer.currency,
        transport_type: offer.transport_type,
        available_capacity: offer.available_capacity,
        gp_name: offer.gp_profiles?.business_name || "Transporteur",
        gp_rating: offer.gp_profiles?.rating,
      };
      addToCompare(compareOffer);
    }
  };

  const TypeIcon = transportTypes.find(t => t.type === offer.transport_type)?.icon || Package;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/offres/${offer.id}`}>
        <div className="mobile-card active:scale-[0.98] transition-transform h-full relative">
          {/* Compare Button */}
          <button
            onClick={handleCompare}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors z-10 ${
              isInCompare(offer.id) 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <Scale className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-between mb-2 pr-10">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{offer.origin_city}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium text-sm">{offer.destination_city}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={offer.transport_type as any} className="text-xs">
              <TypeIcon className="w-3 h-3 mr-1" />
              {offer.transport_type === 'voyageur' ? 'GP' : transportTypes.find(t => t.type === offer.transport_type)?.label || offer.transport_type}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{offer.gp_profiles?.business_name || "Transporteur"}</span>
              {offer.gp_profiles?.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span className="text-xs">{offer.gp_profiles?.rating?.toFixed(1)}</span>
                </div>
              )}
            </div>
            <span className="font-bold text-primary">{offer.price_per_kg} FCFA/kg</span>
          </div>
          {/* Vehicle & Capacity Info */}
          {(offer.vehicles || offer.available_capacity) && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
              {offer.vehicles && (
                <div className="flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  <span>{offer.vehicles.name || offer.vehicles.vehicle_type}</span>
                </div>
              )}
              {offer.available_capacity && (
                <Badge variant="outline" className="text-xs ml-auto">
                  {offer.available_capacity} kg dispo
                </Badge>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export default function Index() {
  return (
    <CompareProvider>
      <IndexContent />
    </CompareProvider>
  );
}
