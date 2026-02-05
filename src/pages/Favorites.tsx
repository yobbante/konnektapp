import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Heart, ArrowRight, MapPin, Calendar, Star, 
  Trash2, Package, ArrowLeft, Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/hooks/useFavorites";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { getTransportIcon, getTransportLabel } from "@/lib/transportTypes";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { DualCurrencyCompact } from "@/components/booking/DualCurrencyDisplay";

interface FavoriteOffer {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  price_per_kg: number;
  currency: string;
  transport_type: string;
  available_capacity: number;
  status: string;
  gp_profiles?: {
    business_name: string;
    rating: number | null;
    verified_at: string | null;
  };
}

export default function Favorites() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<FavoriteOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const { favorites, toggleFavorite, isAuthenticated } = useFavorites();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    fetchFavoriteOffers();
  }, [favorites, isAuthenticated]);

  const fetchFavoriteOffers = async () => {
    if (favorites.size === 0) {
      setOffers([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("gp_offers")
        .select(`
          id, origin_city, origin_country, destination_city, destination_country,
          departure_date, price_per_kg, currency, transport_type, available_capacity, status,
          gp_profiles:gp_id (business_name, rating, verified_at)
        `)
        .in("id", Array.from(favorites))
        .order("departure_date", { ascending: true });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (offerId: string) => {
    await toggleFavorite(offerId);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader />

      <main 
        className="px-4 pb-24"
        style={{ paddingTop: 'calc(70px + env(safe-area-inset-top, 0px))' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Heart className="w-5 h-5 text-destructive fill-destructive" />
              Mes Favoris
            </h1>
            <p className="text-sm text-muted-foreground">Offres et transporteurs sauvegardés</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <MiniLoader size="lg" />
          </div>
        ) : offers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Aucun favori</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Sauvegardez des offres en cliquant sur le cœur pour les retrouver ici
            </p>
            <Button onClick={() => navigate("/offres")}>
              <Package className="w-4 h-4 mr-2" />
              Parcourir les offres
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-foreground">
                {offers.length} offre{offers.length > 1 ? 's' : ''} sauvegardée{offers.length > 1 ? 's' : ''}
              </h2>
            </div>

            {offers.map((offer, index) => {
              const TransportIcon = getTransportIcon(offer.transport_type);
              const isExpired = new Date(offer.departure_date) < new Date();

              return (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-card rounded-xl border border-border p-4 ${isExpired ? 'opacity-60' : ''}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="secondary" className="text-xs">
                      <TransportIcon className="w-3 h-3 mr-1" />
                      {getTransportLabel(offer.transport_type)}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {isExpired && (
                        <Badge variant="destructive" className="text-xs">Expirée</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveFavorite(offer.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Route */}
                  <div 
                    className="flex items-center gap-2 mb-3 cursor-pointer"
                    onClick={() => navigate(`/offres/${offer.id}`)}
                  >
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{offer.origin_city}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm">{offer.destination_city}</span>
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(offer.departure_date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {offer.available_capacity} kg dispo
                    </div>
                  </div>

                  {/* GP Info & Price */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {offer.gp_profiles?.business_name?.charAt(0) || 'G'}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{offer.gp_profiles?.business_name || 'GP'}</p>
                        {offer.gp_profiles?.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="text-[10px] text-muted-foreground">
                              {offer.gp_profiles.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {offer.price_per_kg.toLocaleString()}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          {offer.currency}/kg
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  {!isExpired && (
                    <Button 
                      className="w-full mt-3"
                      onClick={() => navigate(`/offres/${offer.id}`)}
                    >
                      Voir l'offre
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
