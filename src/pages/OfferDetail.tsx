import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, MapPin, Calendar, Clock, Star, Package, 
  Truck, Shield, MessageCircle, Share2, Heart,
  Zap, Ship, Plane, Briefcase, User, CheckCircle, ArrowRight, Scale, Luggage,
  Info, AlertCircle, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/hooks/useFavorites";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RealTimeTrackingMap } from "@/components/tracking/RealTimeTrackingMap";
import { MiniLoader } from "@/components/ui/MiniLoader";

import { Bus } from "lucide-react";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur" | "bagages_international" | "mobility" | "occasionnel";

const transportConfig: Record<TransportType, { icon: React.ElementType; color: string; gradient: string }> = {
  express: { icon: Zap, color: "text-orange-500", gradient: "from-orange-500/20 to-amber-500/20" },
  routier: { icon: Truck, color: "text-blue-500", gradient: "from-blue-500/20 to-cyan-500/20" },
  maritime: { icon: Ship, color: "text-cyan-500", gradient: "from-cyan-500/20 to-teal-500/20" },
  aerien: { icon: Plane, color: "text-purple-500", gradient: "from-purple-500/20 to-pink-500/20" },
  voyageur: { icon: Briefcase, color: "text-green-500", gradient: "from-green-500/20 to-emerald-500/20" },
  bagages_international: { icon: Luggage, color: "text-primary", gradient: "from-primary/20 to-primary/10" },
  mobility: { icon: Bus, color: "text-emerald-500", gradient: "from-emerald-500/20 to-green-500/20" },
  occasionnel: { icon: Plane, color: "text-amber-500", gradient: "from-amber-500/20 to-orange-500/20" },
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
  price_s?: number | null;
  price_m?: number | null;
  price_l?: number | null;
  price_xl?: number | null;
}

interface GPProfile {
  business_name: string;
  rating: number;
  total_deliveries: number;
  verified_at: string | null;
}

export default function OfferDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const source = searchParams.get("source"); // "air" | "maritime" | null
  const navigate = useNavigate();
  const { toast } = useToast();
  const [offer, setOffer] = useState<GPOffer | null>(null);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [isOwnOffer, setIsOwnOffer] = useState(false);
  
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    loadOffer();
  }, [id, source]);

  const loadOffer = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      // If source=air, check air_departures first
      if (source === "air") {
        const { data: airData } = await supabase
          .from("air_departures")
          .select("*")
          .eq("id", id)
          .eq("status", "active")
          .maybeSingle();
        if (airData) {
          setDetectedType("aerien");
          setOffer({
            id: airData.id,
            origin_city: airData.origin_city,
            origin_country: airData.origin_country,
            destination_city: airData.destination_city,
            destination_country: airData.destination_country,
            departure_date: airData.departure_date,
            arrival_date: airData.arrival_date,
            price_per_kg: airData.price_per_kg,
            currency: airData.currency,
            transport_type: "aerien",
            available_capacity: airData.available_capacity_kg,
            total_capacity: airData.total_capacity_kg,
            description: airData.description,
            conditions: null,
            gp_id: airData.gp_id,
          });
          const { data: gpData } = await supabase
            .from("public_gp_profiles")
            .select("business_name, rating, total_deliveries, verified_at")
            .eq("id", airData.gp_id)
            .maybeSingle();
          if (gpData) setGpProfile(gpData);
          else setGpProfile({ business_name: airData.airline || "Cargo Aérien", rating: 0, total_deliveries: 0, verified_at: null });
          setLoading(false);
          return;
        }
      }

      // If source=maritime, check maritime_departures first
      if (source === "maritime") {
        const { data: marData } = await supabase
          .from("maritime_departures")
          .select("*")
          .eq("id", id)
          .eq("status", "active")
          .maybeSingle();
        if (marData) {
          setDetectedType("maritime");
          setOffer({
            id: marData.id,
            origin_city: marData.origin_port || marData.origin_country,
            origin_country: marData.origin_country,
            destination_city: marData.destination_port || marData.destination_country,
            destination_country: marData.destination_country,
            departure_date: marData.departure_date,
            arrival_date: marData.arrival_date,
            price_per_kg: marData.price_per_m3 || marData.price_total || 0,
            currency: marData.currency,
            transport_type: "maritime",
            available_capacity: marData.available_capacity_m3,
            total_capacity: marData.total_capacity_m3,
            description: marData.description,
            conditions: null,
            gp_id: marData.gp_id,
          });
          const { data: gpData } = await supabase
            .from("public_gp_profiles")
            .select("business_name, rating, total_deliveries, verified_at")
            .eq("id", marData.gp_id)
            .maybeSingle();
          if (gpData) setGpProfile(gpData);
          else setGpProfile({ business_name: "Maritime", rating: 0, total_deliveries: 0, verified_at: null });
          setLoading(false);
          return;
        }
      }

      // Try gp_offers first
      const { data: offerData } = await supabase
        .from("gp_offers")
        .select("*")
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();

      if (offerData) {
        setOffer(offerData);
        setDetectedType(offerData.transport_type);
        const { data: gpData } = await supabase
          .from("public_gp_profiles")
          .select("business_name, rating, total_deliveries, verified_at")
          .eq("id", offerData.gp_id)
          .maybeSingle();
        if (gpData) setGpProfile(gpData);
      } else {
        // Fallback: check mobility_offers
        const { data: mobData } = await supabase
          .from("mobility_offers")
          .select("*, mobility_profiles(business_name, rating, total_trips, verified_at)")
          .eq("id", id)
          .maybeSingle();
        if (mobData) {
          setDetectedType("mobility");
          setOffer({
            id: mobData.id,
            origin_city: mobData.origin_city,
            origin_country: mobData.origin_country,
            destination_city: mobData.destination_city,
            destination_country: mobData.destination_country,
            departure_date: mobData.departure_date,
            arrival_date: null,
            price_per_kg: mobData.price_per_seat,
            currency: mobData.currency || "XOF",
            transport_type: "mobility",
            available_capacity: mobData.available_seats,
            total_capacity: mobData.total_seats,
            description: mobData.luggage_policy,
            conditions: mobData.cancellation_policy,
            gp_id: mobData.mobility_profile_id,
          });
          if (mobData.mobility_profiles) {
            setGpProfile({
              business_name: mobData.mobility_profiles.business_name,
              rating: mobData.mobility_profiles.rating || 0,
              total_deliveries: mobData.mobility_profiles.total_trips || 0,
              verified_at: mobData.mobility_profiles.verified_at,
            });
          }
        } else {
          // Last resort: check air_departures and maritime_departures
          const { data: airFallback } = await supabase.from("air_departures").select("*").eq("id", id).eq("status", "active").maybeSingle();
          if (airFallback) {
            setDetectedType("aerien");
            setOffer({
              id: airFallback.id, origin_city: airFallback.origin_city, origin_country: airFallback.origin_country,
              destination_city: airFallback.destination_city, destination_country: airFallback.destination_country,
              departure_date: airFallback.departure_date, arrival_date: airFallback.arrival_date,
              price_per_kg: airFallback.price_per_kg, currency: airFallback.currency, transport_type: "aerien",
              available_capacity: airFallback.available_capacity_kg, total_capacity: airFallback.total_capacity_kg,
              description: airFallback.description, conditions: null, gp_id: airFallback.gp_id,
            });
            const { data: gpData } = await supabase.from("public_gp_profiles").select("business_name, rating, total_deliveries, verified_at").eq("id", airFallback.gp_id).maybeSingle();
            if (gpData) setGpProfile(gpData);
          } else {
            const { data: marFallback } = await supabase.from("maritime_departures").select("*").eq("id", id).eq("status", "active").maybeSingle();
            if (marFallback) {
              setDetectedType("maritime");
              setOffer({
                id: marFallback.id, origin_city: marFallback.origin_port || marFallback.origin_country, origin_country: marFallback.origin_country,
                destination_city: marFallback.destination_port || marFallback.destination_country, destination_country: marFallback.destination_country,
                departure_date: marFallback.departure_date, arrival_date: marFallback.arrival_date,
                price_per_kg: marFallback.price_per_m3 || marFallback.price_total || 0, currency: marFallback.currency, transport_type: "maritime",
                available_capacity: marFallback.available_capacity_m3, total_capacity: marFallback.total_capacity_m3,
                description: marFallback.description, conditions: null, gp_id: marFallback.gp_id,
              });
              const { data: gpData } = await supabase.from("public_gp_profiles").select("business_name, rating, total_deliveries, verified_at").eq("id", marFallback.gp_id).maybeSingle();
              if (gpData) setGpProfile(gpData);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading offer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const transportType = detectedType || offer?.transport_type;
      const returnPath = transportType === "mobility"
        ? `/mobility/reserver?trip=${id}`
        : transportType === "routier"
        ? `/routier/reserver?offer=${id}&gp=${offer?.gp_id}`
        : transportType === "aerien"
        ? `/aerien/reserver?departure=${id}`
        : transportType === "maritime"
        ? `/maritime/reserver?departure=${id}`
        : `/reservation/gp/${offer?.gp_id}?offer=${id}`;
      sessionStorage.setItem("pending_booking_state", JSON.stringify({
        offerId: id,
        gpId: offer?.gp_id,
        returnPath,
        timestamp: Date.now(),
      }));
      
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour réserver.",
      });
      navigate("/auth");
      return;
    }

    if (!offer) return;
    
    const transportType = detectedType || offer.transport_type;
    if (transportType === "mobility") {
      navigate(`/mobility/reserver?trip=${id}`);
    } else if (transportType === "routier") {
      navigate(`/routier/reserver?offer=${id}&gp=${offer.gp_id}`);
    } else if (transportType === "aerien") {
      navigate(`/aerien/reserver?departure=${id}`);
    } else if (transportType === "maritime") {
      navigate(`/maritime/reserver?departure=${id}`);
    } else {
      navigate(`/reservation/gp/${offer.gp_id}?offer=${id}`);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Offre de transport: ${offer?.origin_city} → ${offer?.destination_city}`,
      text: `Transport disponible le ${offer?.departure_date ? format(new Date(offer.departure_date), "d MMMM", { locale: fr }) : ""} - ${offer?.price_per_kg} ${getCurrencySymbol(offer?.currency || "FCFA")}/kg`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Lien copié !",
          description: "Le lien a été copié dans le presse-papiers",
        });
      }
    } catch (error) {
      // User cancelled or error
      console.log("Share cancelled or failed");
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
        <div className="flex items-center justify-center h-screen">
          <MiniLoader size="lg" showText text="Chargement..." />
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-background pb-safe">
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

  const isMobility = offer.transport_type === "mobility";
  const isRoutier = offer.transport_type === "routier";
  const config = transportConfig[offer.transport_type as TransportType] || transportConfig.routier;
  const TypeIcon = config.icon;
  const capacityPercentage = ((offer.total_capacity - offer.available_capacity) / offer.total_capacity) * 100;
  const currencySymbol = getCurrencySymbol(offer.currency || "FCFA");
  const capacityUnit = isMobility ? "places" : "kg";
  const priceUnit = isMobility ? "/siège" : "/kg";

  // Routier size pricing
  const routierSizes = isRoutier ? [
    { label: "S", desc: "< 5kg", price: offer.price_s },
    { label: "M", desc: "5-15kg", price: offer.price_m },
    { label: "L", desc: "15-30kg", price: offer.price_l },
    { label: "XL", desc: "> 30kg", price: offer.price_xl },
  ] : [];
  const routierMinPrice = isRoutier
    ? Math.min(...[offer.price_s, offer.price_m, offer.price_l, offer.price_xl].filter((p): p is number => !!p && p > 0)) || offer.price_per_kg
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header with Gradient */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`fixed top-0 left-0 right-0 z-40 bg-gradient-to-r ${config.gradient} backdrop-blur-md border-b border-border/50`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 -ml-2 rounded-full hover:bg-background/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold">Détail de l'offre</span>
            <div className="flex gap-1">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) {
                    toast({ title: "Connexion requise", description: "Connectez-vous pour ajouter aux favoris" });
                    navigate("/auth");
                    return;
                  }
                  id && toggleFavorite(id);
                }}
                className="p-2 rounded-full hover:bg-background/50 transition-colors"
              >
                <Heart className={`w-5 h-5 transition-all ${id && isFavorite(id) ? "fill-destructive text-destructive scale-110" : ""}`} />
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handleShare}
                className="p-2 rounded-full hover:bg-background/50 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Spacer for fixed header */}
      <div style={{ height: 'calc(56px + env(safe-area-inset-top, 0px))' }} />

      <div className="px-4 py-4" style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Animated Route Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} border border-border/50 p-5 mb-4`}
        >
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-30">
            <motion.div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/20 blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </div>

          <div className="relative z-10">
            {/* Transport type badge */}
            <div className="flex items-center justify-between mb-6">
              <Badge className={`gap-1.5 px-3 py-1 ${config.color} bg-background/80`}>
                <TypeIcon className="w-3.5 h-3.5" />
                {offer.transport_type === "bagages_international" ? "GP via Bagages" : offer.transport_type === "mobility" ? "Mobilité" : offer.transport_type}
              </Badge>
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Disponible
              </Badge>
            </div>

            {/* Animated Route Visualization */}
            <div className="flex items-center gap-4 mb-6">
              {/* Origin */}
              <div className="flex-1">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 mb-1"
                >
                  <div className="w-4 h-4 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <span className="font-bold text-lg">{offer.origin_city}</span>
                </motion.div>
                <p className="text-sm text-muted-foreground ml-6">{offer.origin_country}</p>
              </div>

              {/* Animated connection line */}
              <div className="flex-shrink-0 relative w-16">
                <div className="absolute inset-y-1/2 left-0 right-0 h-0.5 bg-border" />
                <motion.div 
                  className="absolute inset-y-1/2 left-0 h-0.5 bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-lg"
                  initial={{ left: "0%", opacity: 0 }}
                  animate={{ left: "calc(50% - 16px)", opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                >
                  <TypeIcon className={`w-4 h-4 ${config.color}`} />
                </motion.div>
              </div>

              {/* Destination */}
              <div className="flex-1 text-right">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-end gap-2 mb-1"
                >
                  <span className="font-bold text-lg">{offer.destination_city}</span>
                  <div className="w-4 h-4 rounded-full bg-accent shadow-lg shadow-accent/30 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </motion.div>
                <p className="text-sm text-muted-foreground mr-6">{offer.destination_country}</p>
              </div>
            </div>

            {/* GP Profile Card - Inline */}
            <Link to={`/client/transporteurs/${offer.gp_id}`} className="flex items-center gap-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl group mt-4">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
              >
                <User className="w-6 h-6 text-primary" />
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">{gpProfile?.business_name || "Transporteur"}</p>
                  {gpProfile?.verified_at && (
                    <CheckCircle className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-warning fill-warning" />
                    <span className="font-medium">{gpProfile?.rating?.toFixed(1) || "0.0"}</span>
                  </div>
                  <span className="text-muted-foreground">{gpProfile?.total_deliveries || 0} {isMobility ? "trajets" : "livraisons"}</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            {/* Dates with icons */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-background/60 backdrop-blur-sm rounded-xl mt-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Départ</p>
                  <p className="font-semibold">{format(new Date(offer.departure_date), "d MMM yyyy", { locale: fr })}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Arrivée</p>
                  <p className="font-semibold">
                    {offer.arrival_date 
                      ? format(new Date(offer.arrival_date), "d MMM", { locale: fr })
                      : "À confirmer"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Route Map Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <RealTimeTrackingMap
            originCity={offer.origin_city}
            destinationCity={offer.destination_city}
            currentStatus="pending"
            progress={0}
            transportType={offer.transport_type}
          />
        </motion.div>

        {/* Routier Size Pricing Grid */}
        {isRoutier && routierSizes.some(s => s.price && s.price > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="bg-card rounded-2xl border border-border p-4 mb-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Tarifs par taille de colis</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {routierSizes.map(s => (
                <div key={s.label} className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                  <p className="text-sm font-bold text-primary">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground mb-1">{s.desc}</p>
                  <p className="text-sm font-extrabold">
                    {s.price && s.price > 0 ? `${s.price.toLocaleString()}` : "—"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">FCFA</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Capacity Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl border border-border p-4 mb-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Capacité disponible</h3>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl font-bold text-primary">{offer.available_capacity} {capacityUnit}</span>
            <span className="text-sm text-muted-foreground">sur {offer.total_capacity} {capacityUnit}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${capacityPercentage}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </motion.div>

        {/* Description */}
        {offer.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl border border-border p-4 mb-4"
          >
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{offer.description}</p>
          </motion.div>
        )}

        {/* Conditions */}
        {offer.conditions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card rounded-2xl border border-border p-4 mb-4"
          >
            <h3 className="font-semibold mb-2">Conditions</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{offer.conditions}</p>
          </motion.div>
        )}

        {/* Additional Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50 bg-gradient-to-br from-muted/30 to-muted/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Informations importantes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-background/60 rounded-xl">
                <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Protection Konnekt</p>
                  <p className="text-xs text-muted-foreground">Vos envois sont protégés par notre assurance incluse jusqu'à 50 000 FCFA</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-background/60 rounded-xl">
                <FileText className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Documents requis</p>
                  <p className="text-xs text-muted-foreground">Pièce d'identité valide et description du contenu du colis</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-warning/5 border border-warning/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-warning">Articles interdits</p>
                  <p className="text-xs text-muted-foreground">Produits illicites, armes, denrées périssables non emballées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Fixed Bottom CTA with proper safe area - positioned above MobileNav */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-30"
        style={{ 
          bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))'
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              {isRoutier ? (
                <>
                  <p className="text-xs text-muted-foreground">À partir de</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary">{routierMinPrice.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">FCFA</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Prix {isMobility ? "par siège" : "par kg"}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary">{offer.price_per_kg.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">{currencySymbol}{priceUnit}</span>
                  </div>
                </>
              )}
            </div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button 
                size="lg" 
                onClick={handleBook} 
                className="px-8 gap-2 shadow-lg shadow-primary/20"
              >
                {isMobility ? "Réserver une place" : "Réserver maintenant"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
      
      <MobileNav />
    </div>
  );
}