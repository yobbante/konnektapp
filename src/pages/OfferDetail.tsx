import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, MapPin, Calendar, Clock, Star, Package, 
  Truck, Shield, MessageCircle, Phone, Share2, Heart,
  Zap, Ship, Plane, Briefcase, User, CheckCircle
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur";

const transportIcons: Record<TransportType, React.ElementType> = {
  express: Zap,
  routier: Truck,
  maritime: Ship,
  aerien: Plane,
  voyageur: Briefcase,
};

// Mock data - in production, fetch from Supabase
const mockOffers: Record<string, any> = {
  "1": { 
    id: "1", 
    origin: "Dakar", 
    originCountry: "Sénégal",
    destination: "Abidjan", 
    destinationCountry: "Côte d'Ivoire",
    departureDate: "2024-12-22",
    arrivalDate: "2024-12-25",
    price: 6500, 
    type: "routier" as TransportType, 
    gpName: "Mamadou Express", 
    gpRating: 4.8,
    gpDeliveries: 234,
    gpVerified: true,
    availableCapacity: 150,
    totalCapacity: 200,
    description: "Transport routier régulier entre Dakar et Abidjan. Départ tous les lundis et jeudis. Colis sécurisés et assurés.",
    conditions: "Poids minimum 1kg. Emballage soigné requis. Pas de produits périssables."
  },
  "2": { 
    id: "2", 
    origin: "Dakar", 
    originCountry: "Sénégal",
    destination: "Paris", 
    destinationCountry: "France",
    departureDate: "2024-12-24",
    arrivalDate: "2024-12-26",
    price: 8500, 
    type: "aerien" as TransportType, 
    gpName: "Air Cargo SN", 
    gpRating: 4.9,
    gpDeliveries: 567,
    gpVerified: true,
    availableCapacity: 50,
    totalCapacity: 100,
    description: "Fret aérien express vers Paris CDG. Livraison rapide et sécurisée pour vos colis urgents.",
    conditions: "Poids max 30kg par colis. Documents requis pour la douane."
  },
  "3": { 
    id: "3", 
    origin: "Abidjan", 
    originCountry: "Côte d'Ivoire",
    destination: "Bamako", 
    destinationCountry: "Mali",
    departureDate: "2024-12-23",
    arrivalDate: "2024-12-24",
    price: 5500, 
    type: "express" as TransportType, 
    gpName: "Flash Livraison", 
    gpRating: 4.7,
    gpDeliveries: 189,
    gpVerified: true,
    availableCapacity: 30,
    totalCapacity: 50,
    description: "Service express 24h entre Abidjan et Bamako. Suivi en temps réel disponible.",
    conditions: "Colis de moins de 20kg. Livraison porte à porte."
  },
};

export default function OfferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    // Simulate fetching offer
    setTimeout(() => {
      const foundOffer = mockOffers[id || ""] || mockOffers["1"];
      setOffer(foundOffer);
      setLoading(false);
    }, 300);
  }, [id]);

  const handleBook = () => {
    toast({
      title: "Réservation initiée",
      description: "Vous allez être redirigé vers le formulaire de réservation",
    });
    navigate("/demande");
  };

  const handleContact = () => {
    toast({
      title: "Message",
      description: "Fonctionnalité de messagerie disponible après connexion",
    });
    navigate("/messages");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-safe">
        <MobileHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
        <MobileNav />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-background pb-safe">
        <MobileHeader />
        <div className="px-4 py-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="font-semibold text-lg mb-2">Offre non trouvée</h2>
          <Link to="/offres">
            <Button variant="default">Voir les offres</Button>
          </Link>
        </div>
        <MobileNav />
      </div>
    );
  }

  const TypeIcon = transportIcons[offer.type as TransportType] || Truck;
  const capacityPercentage = ((offer.totalCapacity - offer.availableCapacity) / offer.totalCapacity) * 100;

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Custom Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold">Détail de l'offre</span>
          <div className="flex gap-1">
            <button 
              onClick={() => setIsFavorite(!isFavorite)}
              className="p-2"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? "fill-destructive text-destructive" : ""}`} />
            </button>
            <button className="p-2">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 pb-32">
        {/* Route Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-card mb-4"
        >
          <div className="flex items-center justify-between mb-4">
            <Badge variant={offer.type as any} className="gap-1">
              <TypeIcon className="w-3 h-3" />
              {offer.type}
            </Badge>
            <Badge variant="success">Disponible</Badge>
          </div>

          {/* Route */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="font-semibold">{offer.origin}</span>
              </div>
              <p className="text-xs text-muted-foreground ml-5">{offer.originCountry}</p>
            </div>
            <div className="flex-shrink-0 px-3">
              <div className="w-12 h-px bg-border relative">
                <TypeIcon className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                <span className="font-semibold">{offer.destination}</span>
                <div className="w-3 h-3 rounded-full bg-accent" />
              </div>
              <p className="text-xs text-muted-foreground mr-5">{offer.destinationCountry}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Départ</p>
                <p className="text-sm font-medium">{new Date(offer.departureDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Arrivée estimée</p>
                <p className="text-sm font-medium">{new Date(offer.arrivalDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* GP Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mobile-card mb-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{offer.gpName}</p>
                {offer.gpVerified && (
                  <CheckCircle className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span>{offer.gpRating}</span>
                </div>
                <span className="text-muted-foreground">{offer.gpDeliveries} livraisons</span>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={handleContact}>
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>

          {offer.gpVerified && (
            <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary font-medium">Transporteur vérifié</span>
            </div>
          )}
        </motion.div>

        {/* Capacity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mobile-card mb-4"
        >
          <h3 className="font-semibold text-sm mb-3">Capacité disponible</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{offer.availableCapacity}kg restants</span>
            <span className="text-sm font-medium">{offer.totalCapacity}kg total</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${capacityPercentage}%` }}
            />
          </div>
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mobile-card mb-4"
        >
          <h3 className="font-semibold text-sm mb-2">Description</h3>
          <p className="text-sm text-muted-foreground">{offer.description}</p>
        </motion.div>

        {/* Conditions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mobile-card mb-4"
        >
          <h3 className="font-semibold text-sm mb-2">Conditions</h3>
          <p className="text-sm text-muted-foreground">{offer.conditions}</p>
        </motion.div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 pb-safe">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Prix par kg</p>
            <p className="text-2xl font-bold text-primary">
              {offer.price.toLocaleString()} <span className="text-sm font-normal">FCFA</span>
            </p>
          </div>
          <Button variant="default" size="lg" onClick={handleBook} className="px-8">
            Réserver maintenant
          </Button>
        </div>
      </div>
    </div>
  );
}
