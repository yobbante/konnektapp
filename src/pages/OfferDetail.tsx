import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, MapPin, Calendar, Clock, Star, Package, 
  Truck, Shield, MessageCircle, Phone, Share2, Heart,
  Zap, Ship, Plane, Briefcase, User, CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/hooks/useFavorites";
import { createAutoConversationAfterBooking } from "@/lib/autoChat";
import { getCurrencySymbol } from "@/components/ui/currency-selector";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur";

const transportIcons: Record<TransportType, React.ElementType> = {
  express: Zap,
  routier: Truck,
  maritime: Ship,
  aerien: Plane,
  voyageur: Briefcase,
};

interface GPOffer {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  arrival_date: string | null;
  price_per_kg: number;
  currency: string;
  transport_type: string;
  available_capacity: number;
  total_capacity: number;
  description: string | null;
  conditions: string | null;
  gp_id: string;
}

interface GPProfile {
  business_name: string;
  rating: number;
  total_deliveries: number;
  verified_at: string | null;
}

export default function OfferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [offer, setOffer] = useState<GPOffer | null>(null);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    loadOffer();
  }, [id]);

  const loadOffer = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch offer from database
      const { data: offerData, error: offerError } = await supabase
        .from("gp_offers")
        .select("*")
        .eq("id", id)
        .eq("status", "active")
        .single();

      if (offerError || !offerData) {
        setLoading(false);
        return;
      }

      setOffer(offerData);

      // Fetch GP profile (public view)
      const { data: gpData } = await supabase
        .from("public_gp_profiles")
        .select("business_name, rating, total_deliveries, verified_at")
        .eq("id", offerData.gp_id)
        .single();

      if (gpData) {
        setGpProfile(gpData);
      }
    } catch (error) {
      console.error("Error loading offer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Save booking state before redirecting
      sessionStorage.setItem("pending_booking_state", JSON.stringify({
        offerId: id,
        returnPath: `/offres/${id}`,
        timestamp: Date.now(),
      }));
      
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour réserver. Vous serez redirigé après.",
      });
      navigate("/auth");
      return;
    }

    if (!offer) return;

    setBooking(true);
    try {
      // Create order with pending_info status
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          client_id: user.id,
          gp_id: offer.gp_id,
          offer_id: offer.id,
          origin_city: offer.origin_city,
          origin_country: offer.origin_country,
          destination_city: offer.destination_city,
          destination_country: offer.destination_country,
          price_per_kg: offer.price_per_kg,
          weight: 1,
          total_price: offer.price_per_kg,
          status: "pending" as const,
          logistics_status: "pending_info",
          order_number: "TEMP",
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      toast({
        title: "Réservation créée",
        description: "Complétez le formulaire pour finaliser",
      });
      navigate(`/order/${orderData.id}/complete`);
    } catch (error) {
      console.error("Booking error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la réservation",
        variant: "destructive",
      });
    } finally {
      setBooking(false);
    }
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

  const TypeIcon = transportIcons[offer.transport_type as TransportType] || Truck;
  const capacityPercentage = ((offer.total_capacity - offer.available_capacity) / offer.total_capacity) * 100;

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
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                  toast({ title: "Connexion requise", description: "Connectez-vous pour ajouter aux favoris" });
                  navigate("/auth");
                  return;
                }
                id && toggleFavorite(id);
              }}
              className="p-2"
            >
              <Heart className={`w-5 h-5 ${id && isFavorite(id) ? "fill-destructive text-destructive" : ""}`} />
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
            <Badge variant={offer.transport_type as any} className="gap-1">
              <TypeIcon className="w-3 h-3" />
              {offer.transport_type}
            </Badge>
            <Badge variant="success">Disponible</Badge>
          </div>

          {/* Route */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="font-semibold">{offer.origin_city}</span>
              </div>
              <p className="text-xs text-muted-foreground ml-5">{offer.origin_country}</p>
            </div>
            <div className="flex-shrink-0 px-3">
              <div className="w-12 h-px bg-border relative">
                <TypeIcon className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                <span className="font-semibold">{offer.destination_city}</span>
                <div className="w-3 h-3 rounded-full bg-accent" />
              </div>
              <p className="text-xs text-muted-foreground mr-5">{offer.destination_country}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Départ</p>
                <p className="text-sm font-medium">{new Date(offer.departure_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Arrivée estimée</p>
                <p className="text-sm font-medium">
                  {offer.arrival_date 
                    ? new Date(offer.arrival_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                    : "À confirmer"}
                </p>
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
          <Link to={`/client/transporteurs/${offer.gp_id}`} className="flex items-center gap-3 mb-4 group">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold group-hover:text-primary transition-colors">{gpProfile?.business_name || "Transporteur"}</p>
                {gpProfile?.verified_at && (
                  <CheckCircle className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span>{gpProfile?.rating || 0}</span>
                </div>
                <span className="text-muted-foreground">{gpProfile?.total_deliveries || 0} livraisons</span>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={(e) => { e.preventDefault(); handleContact(); }}>
              <MessageCircle className="w-4 h-4" />
            </Button>
          </Link>

          {gpProfile?.verified_at && (
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
            <span className="text-sm text-muted-foreground">{offer.available_capacity}kg restants</span>
            <span className="text-sm font-medium">{offer.total_capacity}kg total</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${capacityPercentage}%` }}
            />
          </div>
        </motion.div>

        {/* Description */}
        {offer.description && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mobile-card mb-4"
          >
            <h3 className="font-semibold text-sm mb-2">Description</h3>
            <p className="text-sm text-muted-foreground">{offer.description}</p>
          </motion.div>
        )}

        {/* Conditions */}
        {offer.conditions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mobile-card mb-4"
          >
            <h3 className="font-semibold text-sm mb-2">Conditions</h3>
            <p className="text-sm text-muted-foreground">{offer.conditions}</p>
          </motion.div>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 pb-safe">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Prix par kg</p>
            <p className="text-2xl font-bold text-primary">
              {offer.price_per_kg.toLocaleString()} <span className="text-sm font-normal">{getCurrencySymbol(offer.currency || "FCFA")}</span>
            </p>
          </div>
          <Button 
            variant="default" 
            size="lg" 
            onClick={handleBook} 
            disabled={booking}
            className="px-8"
          >
            {booking ? "Réservation..." : "Réserver maintenant"}
          </Button>
        </div>
      </div>
    </div>
  );
}
