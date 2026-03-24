import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Heart, ArrowLeft, Truck, MapPin, Star, Calendar, 
  Package, ArrowRight, Bell, BellOff, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useFavoriteTransporters } from "@/hooks/useFavoriteTransporters";
import { getCurrencySymbol } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FavoriteGP {
  id: string;
  business_name: string;
  gp_type: string;
  rating: number | null;
  total_reviews: number;
  total_deliveries: number;
  verified_at: string | null;
  city: string;
  country_code: string;
  default_currency?: string;
}

interface UpcomingTrip {
  id: string;
  gp_id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  arrival_date: string | null;
  available_capacity: number;
  price_per_kg: number;
  currency: string;
}

const gpTypeLabels: Record<string, string> = {
  express: "Express",
  routier: "Routier",
  maritime: "Maritime",
  aerien: "Aérien",
  voyageur: "Voyageur",
  agence: "Agence",
  bagages_international: "GP via Bagages",
};

const countryFlags: Record<string, string> = {
  FR: "🇫🇷", SN: "🇸🇳", ML: "🇲🇱", CI: "🇨🇮", MA: "🇲🇦", CM: "🇨🇲",
  GN: "🇬🇳", BF: "🇧🇫", TG: "🇹🇬", BJ: "🇧🇯", NE: "🇳🇪", GA: "🇬🇦",
  CG: "🇨🇬", CD: "🇨🇩", DZ: "🇩🇿", TN: "🇹🇳", BE: "🇧🇪", DE: "🇩🇪",
  IT: "🇮🇹", ES: "🇪🇸", GB: "🇬🇧", US: "🇺🇸", CA: "🇨🇦", AE: "🇦🇪",
};

export default function FavoriteTransporters() {
  const navigate = useNavigate();
  const { favoriteGPs, toggleFavoriteGP, isAuthenticated } = useFavoriteTransporters();
  const [loading, setLoading] = useState(true);
  const [transporters, setTransporters] = useState<FavoriteGP[]>([]);
  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingTrip[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    
    if (favoriteGPs.size > 0) {
      loadFavoriteTransporters();
    } else {
      setLoading(false);
    }
  }, [favoriteGPs, isAuthenticated, navigate]);

  const loadFavoriteTransporters = async () => {
    try {
      const gpIds = Array.from(favoriteGPs);
      
      // Load GP profiles
      const { data: gps } = await supabase
        .from("public_gp_profiles")
        .select("*")
        .in("id", gpIds);

      if (gps) {
        setTransporters(gps as FavoriteGP[]);
      }

      // Load upcoming trips from these GPs
      const { data: trips } = await supabase
        .from("gp_offers")
        .select("*")
        .in("gp_id", gpIds)
        .eq("status", "active")
        .gte("departure_date", new Date().toISOString())
        .order("departure_date", { ascending: true })
        .limit(20);

      if (trips) {
        setUpcomingTrips(trips as UpcomingTrip[]);
      }
    } catch (error) {
      console.error("Error loading favorite transporters:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTripsForGP = (gpId: string) => {
    return upcomingTrips.filter(trip => trip.gp_id === gpId);
  };

  const renderStars = (rating: number | null) => {
    const r = rating || 0;
    return (
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 text-warning fill-warning" />
        <span className="font-medium">{r.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <MobileHeader />

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/offres" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
            <Heart className="w-7 h-7 text-destructive fill-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">
            Mes Transporteurs Favoris
          </h1>
          <p className="text-sm text-muted-foreground">
            {transporters.length} transporteur{transporters.length > 1 ? "s" : ""} • 
            {upcomingTrips.length} trajet{upcomingTrips.length > 1 ? "s" : ""} à venir
          </p>
        </motion.div>

        {transporters.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Aucun transporteur favori
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Ajoutez des transporteurs à vos favoris pour recevoir des notifications quand ils publient de nouveaux trajets
            </p>
            <Button onClick={() => navigate("/offres")}>
              Explorer les offres
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {transporters.map((gp, index) => {
              const trips = getTripsForGP(gp.id);
              
              return (
                <motion.div
                  key={gp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      {/* GP Header */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Truck className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {gp.business_name}
                            </h3>
                            {gp.verified_at && (
                              <Badge variant="success" className="text-[10px]">Vérifié</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{gp.city}</span>
                            <span>{countryFlags[gp.country_code] || ""}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {gpTypeLabels[gp.gp_type] || gp.gp_type}
                            </Badge>
                            {renderStars(gp.rating)}
                            <span className="text-xs text-muted-foreground">
                              ({gp.total_reviews} avis)
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavoriteGP(gp.id)}
                          className="text-destructive"
                        >
                          <Heart className="w-5 h-5 fill-current" />
                        </Button>
                      </div>

                      {/* Upcoming trips */}
                      {trips.length > 0 ? (
                        <>
                          <Separator className="my-3" />
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-primary" />
                              Prochains trajets ({trips.length})
                            </h4>
                            <div className="space-y-2">
                              {trips.slice(0, 3).map(trip => (
                                <Link
                                  key={trip.id}
                                  to={`/offres/${trip.id}`}
                                  className="block p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span>{countryFlags[trip.origin_country] || ""}</span>
                                      <span className="font-medium text-sm">{trip.origin_city}</span>
                                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                      <span className="font-medium text-sm">{trip.destination_city}</span>
                                      <span>{countryFlags[trip.destination_country] || ""}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      {trip.price_per_kg} {getCurrencySymbol(trip.currency)}/kg
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                    <span>
                                      {format(new Date(trip.departure_date), "d MMM", { locale: fr })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Package className="w-3 h-3" />
                                      {trip.available_capacity} kg dispo
                                    </span>
                                  </div>
                                </Link>
                              ))}
                              {trips.length > 3 && (
                                <Link
                                  to={`/client/transporteurs/${gp.id}`}
                                  className="block text-center text-sm text-primary hover:underline py-2"
                                >
                                  Voir tous les {trips.length} trajets →
                                </Link>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <Separator className="my-3" />
                          <div className="text-center py-3 text-sm text-muted-foreground">
                            <Bell className="w-4 h-4 mx-auto mb-1 opacity-50" />
                            <p>Aucun trajet à venir</p>
                            <p className="text-xs">Vous serez notifié dès qu'un nouveau trajet sera publié</p>
                          </div>
                        </>
                      )}

                      {/* View profile button */}
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => navigate(`/client/transporteurs/${gp.id}`)}
                        >
                          Voir le profil complet
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
