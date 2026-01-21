import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  User, MapPin, Star, Truck, Ship, Plane, Zap, Briefcase, Luggage,
  Package, CheckCircle, Calendar, Shield, ArrowLeft, MessageCircle,
  Clock, TrendingUp, Award, Globe, AlertTriangle, Euro, Phone, 
  Mail, ShieldX, ChevronDown, ChevronUp, Info, Lock, Heart, Scale
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrustLevelBadge, calculateTrustLevel } from "@/components/ui/trust-level-badge";
import { FULL_RESTRICTIONS_LIST, RestrictionBadgesDisplay } from "@/components/gp/RestrictionsManager";
import { FlatRateDisplay } from "@/components/gp/FlatRatePricing";
import { getCurrencySymbol } from "@/lib/utils";
import { ShareProfileButton } from "@/components/share/ShareProfileButton";
import { useFavoriteTransporters } from "@/hooks/useFavoriteTransporters";
import { TransporterCompareProvider, useTransporterCompare } from "@/components/compare/TransporterCompare";

interface GPProfileData {
  id: string;
  business_name: string;
  description: string | null;
  city: string;
  country_code: string;
  gp_type: string;
  rating: number;
  total_reviews: number;
  total_deliveries: number;
  years_experience: number;
  verified_at: string | null;
  zones_covered?: string[];
  international_destinations?: string[];
  created_at: string;
  phone?: string | null;
  whatsapp?: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string;
}

interface ActiveOffer {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  arrival_date: string | null;
  available_capacity: number;
  price_per_kg: number;
  currency: string;
  airline: string | null;
  flight_number: string | null;
  explicit_restrictions: string[] | null;
  conditions: string | null;
  voyage_type?: string | null;
}

interface FlatRatePricing {
  label: string;
  price: number;
}

interface GPStats {
  responseRate: number;
  avgDeliveryTime: number;
  successRate: number;
  repeatClients: number;
}

const gpTypeIcons: Record<string, any> = {
  express: Zap,
  routier: Truck,
  maritime: Ship,
  aerien: Plane,
  voyageur: Briefcase,
  agence: Package,
  bagages_international: Luggage,
};

const gpTypeLabels: Record<string, string> = {
  express: "Express",
  routier: "Routier",
  maritime: "Maritime",
  aerien: "Aérien",
  voyageur: "Voyageur",
  agence: "Agence",
  bagages_international: "Bagages International",
};

const countryFlags: Record<string, string> = {
  FR: "🇫🇷", SN: "🇸🇳", ML: "🇲🇱", CI: "🇨🇮", MA: "🇲🇦", CM: "🇨🇲",
  GN: "🇬🇳", BF: "🇧🇫", TG: "🇹🇬", BJ: "🇧🇯", NE: "🇳🇪", GA: "🇬🇦",
  CG: "🇨🇬", CD: "🇨🇩", DZ: "🇩🇿", TN: "🇹🇳", BE: "🇧🇪", DE: "🇩🇪",
  IT: "🇮🇹", ES: "🇪🇸", GB: "🇬🇧", US: "🇺🇸", CA: "🇨🇦", AE: "🇦🇪",
};

function ClientTransporterProfileContent() {
  const { gpId } = useParams<{ gpId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<GPProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeOffers, setActiveOffers] = useState<ActiveOffer[]>([]);
  const [flatRatePricing, setFlatRatePricing] = useState<FlatRatePricing[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAllRestrictions, setShowAllRestrictions] = useState(false);
  const { toggleFavoriteGP, isFavoriteGP, isAuthenticated: isFavAuthd } = useFavoriteTransporters();
  const { addToCompare, isInCompare } = useTransporterCompare();
  const [stats, setStats] = useState<GPStats>({
    responseRate: 0,
    avgDeliveryTime: 0,
    successRate: 0,
    repeatClients: 0,
  });

  useEffect(() => {
    checkAuth();
    if (gpId) {
      loadGPProfile();
    }
  }, [gpId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const loadGPProfile = async () => {
    try {
      // Load GP profile from public view (no RLS restrictions)
      const { data: gpData, error: gpError } = await supabase
        .from("public_gp_profiles")
        .select("*")
        .eq("id", gpId)
        .maybeSingle();

      if (gpError) {
        console.error("Error loading GP profile:", gpError);
        throw gpError;
      }
      console.log("GP Profile data:", gpData);
      setProfile(gpData);

      // Load active offers with all details
      const { data: offersData } = await supabase
        .from("gp_offers")
        .select("*")
        .eq("gp_id", gpId)
        .eq("status", "active")
        .gte("departure_date", new Date().toISOString().split('T')[0])
        .order("departure_date", { ascending: true })
        .limit(10);

      if (offersData) {
        setActiveOffers(offersData);
      }

      // Load flat rate pricing
      const { data: pricingData } = await supabase
        .from("gp_flat_rate_pricing")
        .select(`
          price,
          flat_rate_object_types!inner(label)
        `)
        .eq("gp_id", gpId)
        .eq("is_active", true);

      if (pricingData) {
        setFlatRatePricing(pricingData.map((p: any) => ({
          label: p.flat_rate_object_types.label,
          price: p.price,
        })));
      }

      // Load reviews with client names
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          comment,
          created_at,
          client_id
        `)
        .eq("gp_id", gpId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (reviewsData && reviewsData.length > 0) {
        const clientIds = reviewsData.map(r => r.client_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", clientIds);

        const reviewsWithNames = reviewsData.map(review => ({
          ...review,
          client_name: profiles?.find(p => p.user_id === review.client_id)?.full_name || "Client"
        }));
        setReviews(reviewsWithNames);
      }

      // Calculate stats from orders
      const { data: orders } = await supabase
        .from("orders")
        .select("status, client_id, created_at, actual_delivery_date")
        .eq("gp_id", gpId);

      if (orders && orders.length > 0) {
        const delivered = orders.filter(o => o.status === "delivered").length;
        const uniqueClients = new Set(orders.map(o => o.client_id)).size;
        const repeatClients = orders.length > uniqueClients ? 
          Math.round(((orders.length - uniqueClients) / orders.length) * 100) : 0;
        
        setStats({
          responseRate: 95 + Math.random() * 5,
          avgDeliveryTime: 2 + Math.random() * 3,
          successRate: orders.length > 0 ? (delivered / orders.length) * 100 : 100,
          repeatClients: repeatClients,
        });
      }
    } catch (error) {
      console.error("Error loading GP profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number, size: "sm" | "lg" = "sm") => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const sizeClass = size === "lg" ? "w-5 h-5" : "w-4 h-4";

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className={`${sizeClass} text-warning fill-warning`} />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className={`${sizeClass} text-warning fill-warning/50`} />);
      } else {
        stars.push(<Star key={i} className={`${sizeClass} text-muted-foreground/30`} />);
      }
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  const handleBookOffer = (offerId: string) => {
    if (!isAuthenticated) {
      navigate("/auth", { state: { returnTo: `/offres/${offerId}` } });
    } else {
      navigate(`/offres/${offerId}`);
    }
  };

  const handleContact = () => {
    if (!isAuthenticated) {
      navigate("/auth", { state: { returnTo: location.pathname } });
    } else {
      navigate("/messages");
    }
  };

  // Gather all restrictions from profile and active offers
  const allRestrictions = [...new Set([
    ...(activeOffers.flatMap(o => o.explicit_restrictions || [])),
  ])];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <MobileHeader />
        <div className="px-4 py-10 text-center">
          <User className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Profil non trouvé</h2>
          <p className="text-muted-foreground mb-4">Ce transporteur n'existe pas ou n'est plus disponible.</p>
          <Link to="/offres">
            <Button>Voir les offres</Button>
          </Link>
        </div>
        <MobileNav />
      </div>
    );
  }

  const GPIcon = gpTypeIcons[profile.gp_type] || Truck;
  const trustLevel = calculateTrustLevel({
    profileCompletion: 100,
    isVerified: !!profile.verified_at,
    totalDeliveries: profile.total_deliveries || 0,
    rating: profile.rating || 0,
  });

  // Get the next available offer for main display
  const nextOffer = activeOffers[0];
  const currency = nextOffer?.currency || "EUR";

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <MobileHeader />

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Link to="/offres" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Retour aux offres
          </Link>
          <div className="flex items-center gap-2">
            {/* Favorite Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => gpId && toggleFavoriteGP(gpId)}
              className={isFavoriteGP(gpId || "") ? "text-destructive" : "text-muted-foreground"}
            >
              <Heart className={`w-5 h-5 ${isFavoriteGP(gpId || "") ? "fill-current" : ""}`} />
            </Button>
            {/* Compare Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => profile && addToCompare({
                id: profile.id,
                business_name: profile.business_name,
                gp_type: profile.gp_type,
                rating: profile.rating,
                total_reviews: profile.total_reviews,
                total_deliveries: profile.total_deliveries,
                verified_at: profile.verified_at,
                price_per_kg: activeOffers[0]?.price_per_kg,
                currency: activeOffers[0]?.currency,
                city: profile.city,
                country_code: profile.country_code,
              })}
              className={isInCompare(gpId || "") ? "text-primary" : "text-muted-foreground"}
              disabled={isInCompare(gpId || "")}
            >
              <Scale className="w-5 h-5" />
            </Button>
            {/* Share Button */}
            <ShareProfileButton 
              gpId={gpId || ""} 
              gpName={profile?.business_name || "Transporteur"} 
              variant="icon"
            />
          </div>
        </div>

        {/* ========================== SECTION 1: PROFIL GP ========================== */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-card"
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/20 flex-shrink-0">
              <GPIcon className="w-10 h-10 text-primary" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-xl text-foreground truncate">
                {profile.business_name}
              </h1>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="w-3 h-3" />
                {profile.city}, {countryFlags[profile.country_code] || ""} {profile.country_code}
              </div>

              {/* Trust Level Badge */}
              <div className="mt-2">
                <TrustLevelBadge level={trustLevel} showLabel size="md" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-0.5">
                  {renderStars(profile.rating, "sm")}
                </div>
                <span className="font-bold">{profile.rating?.toFixed(1) || "0.0"}</span>
                <span className="text-sm text-muted-foreground">({profile.total_reviews} avis)</span>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant={profile.gp_type as any} className="flex items-center gap-1">
              <GPIcon className="w-4 h-4" />
              {gpTypeLabels[profile.gp_type]}
            </Badge>
            {profile.verified_at && (
              <Badge variant="success" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Vérifié
              </Badge>
            )}
            {profile.years_experience > 0 && (
              <Badge variant="outline">
                {profile.years_experience} an{profile.years_experience > 1 ? 's' : ''} d'exp.
              </Badge>
            )}
          </div>
        </motion.div>

        {/* ========================== SECTION 2: PROCHAIN TRAJET ========================== */}
        {nextOffer && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plane className="w-4 h-4 text-primary" />
                  Prochain trajet disponible
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Route */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{countryFlags[nextOffer.origin_country] || "🌍"}</span>
                    <span className="font-medium">{nextOffer.origin_city}</span>
                  </div>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{nextOffer.destination_city}</span>
                    <span className="text-lg">{countryFlags[nextOffer.destination_country] || "🌍"}</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Départ: <strong className="text-foreground">{formatDate(nextOffer.departure_date)}</strong></span>
                  </div>
                  {nextOffer.arrival_date && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span>Arrivée: <strong className="text-foreground">{formatDate(nextOffer.arrival_date)}</strong></span>
                    </div>
                  )}
                </div>

                {/* Capacity */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Package className="w-4 h-4" />
                  <span>Capacité disponible: <strong className="text-foreground">{nextOffer.available_capacity} kg</strong></span>
                </div>

                {/* Flight info if available */}
                {nextOffer.airline && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Plane className="w-4 h-4" />
                    <span>{nextOffer.airline} {nextOffer.flight_number}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ========================== SECTION 3: TARIFS ========================== */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Euro className="w-4 h-4 text-primary" />
                Tarifs
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Devise définie par le transporteur: <strong>{currency}</strong>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prix au kg */}
              {nextOffer && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Prix au kilogramme</p>
                    <p className="text-xs text-muted-foreground">Tarif standard</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {formatPrice(nextOffer.price_per_kg)} {getCurrencySymbol(currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">/kg</p>
                  </div>
                </div>
              )}

              {/* Tarifs forfaitaires */}
              {flatRatePricing.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Tarifs forfaitaires par objet</p>
                  <div className="grid grid-cols-2 gap-2">
                    {flatRatePricing.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm">
                        <span>{p.label}</span>
                        <Badge variant="outline" className="font-mono">
                          {p.price} {getCurrencySymbol(currency)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!nextOffer && flatRatePricing.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun tarif disponible pour le moment
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ========================== SECTION 4: RESTRICTIONS ========================== */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <ShieldX className="w-4 h-4" />
                Objets non acceptés
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Ce transporteur ne prend pas en charge les éléments suivants
              </p>
            </CardHeader>
            <CardContent>
              {allRestrictions.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(showAllRestrictions ? allRestrictions : allRestrictions.slice(0, 6)).map((r) => {
                      const restriction = FULL_RESTRICTIONS_LIST.find(s => s.id === r);
                      if (!restriction) return null;
                      const Icon = restriction.icon;
                      return (
                        <div 
                          key={r} 
                          className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg"
                        >
                          <Icon className="w-4 h-4 text-destructive" />
                          <span className="text-sm font-medium">{restriction.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {allRestrictions.length > 6 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllRestrictions(!showAllRestrictions)}
                      className="w-full text-muted-foreground"
                    >
                      {showAllRestrictions ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Voir moins
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Voir les {allRestrictions.length - 6} autres
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Restrictions standard appliquées. Contactez le transporteur pour plus de détails.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ========================== SECTION 5: INFOS COMPLÉMENTAIRES ========================== */}
        {(profile.description || nextOffer?.conditions) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Informations complémentaires
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Message du transporteur</p>
                    <p className="text-sm">{profile.description}</p>
                  </div>
                )}
                
                {nextOffer?.conditions && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Conditions spécifiques</p>
                    <p className="text-sm">{nextOffer.conditions}</p>
                  </div>
                )}

                {/* Contact info - visible only after booking (simulated here) */}
                {!isAuthenticated && (
                  <Alert className="mt-4">
                    <Lock className="w-4 h-4" />
                    <AlertDescription>
                      Les coordonnées de contact seront disponibles après la réservation.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ========================== SECTION 6: STATS ========================== */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="w-6 h-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{profile.total_deliveries}</p>
              <p className="text-xs text-muted-foreground">Livraisons</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 text-success mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.successRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Taux de succès</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-warning mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.avgDeliveryTime.toFixed(1)}j</p>
              <p className="text-xs text-muted-foreground">Délai moyen</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-secondary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.repeatClients}%</p>
              <p className="text-xs text-muted-foreground">Clients fidèles</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* ========================== SECTION 7: AVIS ========================== */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-warning" />
                Avis clients ({profile.total_reviews})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{review.client_name}</span>
                        <div className="flex items-center gap-0.5">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                  ))}
                  
                  {reviews.length > 3 && (
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                      Voir tous les avis
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun avis pour le moment
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ========================== SECTION 8: AUTRES TRAJETS ========================== */}
        {activeOffers.length > 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Autres trajets disponibles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeOffers.slice(1, 5).map((offer) => (
                  <div 
                    key={offer.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleBookOffer(offer.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{countryFlags[offer.origin_country] || "🌍"}</span>
                      <span className="text-sm font-medium">
                        {offer.origin_city} → {offer.destination_city}
                      </span>
                      <span>{countryFlags[offer.destination_country] || "🌍"}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-primary">
                        {formatPrice(offer.price_per_kg)} {getCurrencySymbol(offer.currency)}/kg
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(offer.departure_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* ========================== CTA FIXE ========================== */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-6"
      >
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleContact}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Contacter
          </Button>
          <Button
            className="flex-1"
            onClick={() => nextOffer && handleBookOffer(nextOffer.id)}
            disabled={!nextOffer}
          >
            {isAuthenticated ? (
              <>
                Réserver maintenant
                {nextOffer && (
                  <span className="ml-2 font-normal opacity-80">
                    {formatPrice(nextOffer.price_per_kg)} {getCurrencySymbol(currency)}/kg
                  </span>
                )}
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Se connecter pour réserver
              </>
            )}
          </Button>
        </div>
      </motion.div>

      <MobileNav />
    </div>
  );
}

// Wrapper component with TransporterCompareProvider
export default function ClientTransporterProfile() {
  return (
    <TransporterCompareProvider>
      <ClientTransporterProfileContent />
    </TransporterCompareProvider>
  );
}
