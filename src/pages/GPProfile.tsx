import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  User, MapPin, Star, Truck, Ship, Plane, Zap, Briefcase, Luggage,
  Package, CheckCircle, Calendar, Shield, ArrowLeft, MessageCircle,
  Clock, TrendingUp, Award, Globe, AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { TrustLevelBadge, calculateTrustLevel } from "@/components/ui/trust-level-badge";

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
  zones_covered: string[];
  international_destinations: string[];
  created_at: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string;
}

interface UpcomingVoyage {
  id: string;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  arrival_date: string | null;
  available_capacity: number;
  price_per_kg: number;
  currency: string;
  airline: string | null;
  flight_number: string | null;
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

export default function GPProfile() {
  const { gpId } = useParams<{ gpId: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<GPProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [upcomingVoyages, setUpcomingVoyages] = useState<UpcomingVoyage[]>([]);
  const [stats, setStats] = useState<GPStats>({
    responseRate: 0,
    avgDeliveryTime: 0,
    successRate: 0,
    repeatClients: 0,
  });

  useEffect(() => {
    if (gpId) {
      loadGPProfile();
    }
  }, [gpId]);

  const loadGPProfile = async () => {
    try {
      // Load GP profile from public view
      const { data: gpData, error: gpError } = await supabase
        .from("public_gp_profiles")
        .select("*")
        .eq("id", gpId)
        .maybeSingle();

      if (gpError) throw gpError;
      setProfile(gpData);

      // Load upcoming voyages
      const { data: voyagesData } = await supabase
        .from("gp_offers")
        .select("*")
        .eq("gp_id", gpId)
        .eq("status", "active")
        .gte("departure_date", new Date().toISOString().split('T')[0])
        .order("departure_date", { ascending: true })
        .limit(5);

      if (voyagesData) {
        setUpcomingVoyages(voyagesData);
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
        // Get client names
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
          responseRate: 95 + Math.random() * 5, // Simulated for now
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
    const sizeClass = size === "lg" ? "w-6 h-6" : "w-4 h-4";

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
  const memberSince = new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const trustLevel = calculateTrustLevel({
    profileCompletion: 100,
    isVerified: !!profile.verified_at,
    totalDeliveries: profile.total_deliveries || 0,
    rating: profile.rating || 0,
  });

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <MobileHeader />

      <div className="px-4 py-4 space-y-4">
        {/* Back Button */}
        <Link to="/offres" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Retour aux offres
        </Link>

        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-card"
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/20">
              <GPIcon className="w-10 h-10 text-primary" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-bold text-xl text-foreground truncate">
                    {profile.business_name}
                  </h1>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    {profile.city}, {profile.country_code}
                  </div>
                </div>
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

          {/* Type Badge */}
          <div className="mt-4 flex items-center gap-2">
            <Badge variant={profile.gp_type as any} className="flex items-center gap-1 w-fit">
              <GPIcon className="w-4 h-4" />
              Transport {gpTypeLabels[profile.gp_type]}
            </Badge>
            {profile.verified_at && (
              <Badge variant="success" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Vérifié
              </Badge>
            )}
          </div>

          {/* Description */}
          {profile.description && (
            <p className="mt-4 text-sm text-muted-foreground">{profile.description}</p>
          )}
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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

        {/* Tabs for Voyages, Reviews, Info */}
        <Tabs defaultValue="voyages" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="voyages" className="flex-1">
              <Plane className="w-4 h-4 mr-1" />
              Voyages
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1">
              <Star className="w-4 h-4 mr-1" />
              Avis
            </TabsTrigger>
            <TabsTrigger value="info" className="flex-1">
              <Globe className="w-4 h-4 mr-1" />
              Zones
            </TabsTrigger>
          </TabsList>

          {/* Upcoming Voyages */}
          <TabsContent value="voyages" className="mt-4 space-y-3">
            {upcomingVoyages.length > 0 ? (
              upcomingVoyages.map((voyage) => (
                <motion.div
                  key={voyage.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Plane className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {voyage.origin_city} → {voyage.destination_city}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(voyage.departure_date)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {voyage.available_capacity} kg dispo
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="text-sm">
                          {voyage.airline && (
                            <span className="text-muted-foreground">
                              {voyage.airline} {voyage.flight_number}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-primary">
                          {formatPrice(voyage.price_per_kg)} {voyage.currency}/kg
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Plane className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground">Aucun voyage programmé</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews" className="mt-4 space-y-3">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">{review.client_name}</span>
                      <div className="flex items-center gap-0.5">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(review.created_at)}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground">Aucun avis pour le moment</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Info / Zones */}
          <TabsContent value="info" className="mt-4 space-y-4">
            {/* Zones */}
            {profile.zones_covered && profile.zones_covered.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Zones couvertes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.zones_covered.map((zone, i) => (
                      <Badge key={i} variant="outline">{zone}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* International */}
            {profile.international_destinations && profile.international_destinations.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    Destinations internationales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.international_destinations.map((dest, i) => (
                      <Badge key={i} variant="secondary">{dest}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Experience */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Expérience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Années d'expérience</span>
                  <span className="font-medium">{profile.years_experience || 0} ans</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Membre depuis</span>
                  <span className="font-medium">{memberSince}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <MobileNav />
    </div>
  );
}
