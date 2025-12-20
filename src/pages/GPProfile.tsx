import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  User, MapPin, Star, Truck, Ship, Plane, Zap, Briefcase,
  Package, CheckCircle, Calendar, Shield, ArrowLeft, MessageCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent } from "@/components/ui/card";

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

const gpTypeIcons: Record<string, any> = {
  express: Zap,
  routier: Truck,
  maritime: Ship,
  aerien: Plane,
  voyageur: Briefcase,
};

const gpTypeLabels: Record<string, string> = {
  express: "Express",
  routier: "Routier",
  maritime: "Maritime",
  aerien: "Aérien",
  voyageur: "Voyageur",
};

export default function GPProfile() {
  const { gpId } = useParams<{ gpId: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<GPProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

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
                {profile.verified_at && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Vérifié
                  </Badge>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-0.5">
                  {renderStars(profile.rating, "lg")}
                </div>
                <span className="font-bold text-lg">{profile.rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({profile.total_reviews} avis)</span>
              </div>
            </div>
          </div>

          {/* Type Badge */}
          <div className="mt-4">
            <Badge variant={profile.gp_type as any} className="flex items-center gap-1 w-fit">
              <GPIcon className="w-4 h-4" />
              Transport {gpTypeLabels[profile.gp_type]}
            </Badge>
          </div>

          {/* Description */}
          {profile.description && (
            <p className="mt-4 text-sm text-muted-foreground">{profile.description}</p>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="mobile-card text-center">
            <Package className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{profile.total_deliveries}</p>
            <p className="text-xs text-muted-foreground">Livraisons</p>
          </div>
          <div className="mobile-card text-center">
            <Calendar className="w-6 h-6 text-secondary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{profile.years_experience}</p>
            <p className="text-xs text-muted-foreground">Années exp.</p>
          </div>
          <div className="mobile-card text-center">
            <Star className="w-6 h-6 text-warning mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{profile.total_reviews}</p>
            <p className="text-xs text-muted-foreground">Avis</p>
          </div>
        </motion.div>

        {/* Zones */}
        {profile.zones_covered && profile.zones_covered.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Zones couvertes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.zones_covered.map((zone, i) => (
                    <Badge key={i} variant="outline">{zone}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* International */}
        {profile.international_destinations && profile.international_destinations.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Plane className="w-4 h-4 text-primary" />
                  Destinations internationales
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.international_destinations.map((dest, i) => (
                    <Badge key={i} variant="secondary">{dest}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Reviews */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            Avis clients ({profile.total_reviews})
          </h3>

          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-4">
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
                      {new Date(review.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground">Aucun avis pour le moment</p>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Member since */}
        <p className="text-center text-xs text-muted-foreground">
          Membre depuis {memberSince}
        </p>
      </div>

      <MobileNav />
    </div>
  );
}
