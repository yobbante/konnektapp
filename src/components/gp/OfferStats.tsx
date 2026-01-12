import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, MousePointer, TrendingUp, BarChart3, Package, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface OfferStat {
  id: string;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  views_count: number;
  bookings_count: number;
  total_capacity: number;
  available_capacity: number;
  status: string;
}

interface OfferStatsProps {
  gpId: string;
}

export function OfferStats({ gpId }: OfferStatsProps) {
  const [offers, setOffers] = useState<OfferStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOfferStats();
  }, [gpId]);

  const fetchOfferStats = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gp_offers")
      .select("id, origin_city, destination_city, departure_date, views_count, bookings_count, total_capacity, available_capacity, status")
      .eq("gp_id", gpId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setOffers(data);
    }
    setLoading(false);
  };

  // Calculate totals
  const totalViews = offers.reduce((sum, o) => sum + (o.views_count || 0), 0);
  const totalBookings = offers.reduce((sum, o) => sum + (o.bookings_count || 0), 0);
  const avgConversionRate = totalViews > 0 ? (totalBookings / totalViews) * 100 : 0;

  // Calculate per-offer stats
  const calculateConversionRate = (offer: OfferStat) => {
    const views = offer.views_count || 0;
    const bookings = offer.bookings_count || 0;
    return views > 0 ? (bookings / views) * 100 : 0;
  };

  const calculateCapacityUsage = (offer: OfferStat) => {
    const used = offer.total_capacity - offer.available_capacity;
    return offer.total_capacity > 0 ? (used / offer.total_capacity) * 100 : 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-card text-center"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Eye className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalViews}</p>
          <p className="text-xs text-muted-foreground">Vues totales</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mobile-card text-center"
        >
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
            <MousePointer className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalBookings}</p>
          <p className="text-xs text-muted-foreground">Réservations</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mobile-card text-center"
        >
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-5 h-5 text-secondary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{avgConversionRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Taux conversion</p>
        </motion.div>
      </div>

      {/* Per-Offer Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Performance par offre
          </CardTitle>
        </CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Aucune offre disponible</p>
            </div>
          ) : (
            <div className="space-y-4">
              {offers.map((offer, i) => {
                const conversionRate = calculateConversionRate(offer);
                const capacityUsage = calculateCapacityUsage(offer);

                return (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {offer.origin_city} → {offer.destination_city}
                      </span>
                      <Badge variant={offer.status === 'active' ? 'success' : 'warning'} className="text-[10px]">
                        {offer.status === 'active' ? 'Active' : 'Pause'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Eye className="w-3 h-3" />
                          <span className="text-xs">Vues</span>
                        </div>
                        <p className="font-semibold text-sm">{offer.views_count || 0}</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <MousePointer className="w-3 h-3" />
                          <span className="text-xs">Résa</span>
                        </div>
                        <p className="font-semibold text-sm">{offer.bookings_count || 0}</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Percent className="w-3 h-3" />
                          <span className="text-xs">Taux</span>
                        </div>
                        <p className="font-semibold text-sm text-primary">{conversionRate.toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* Capacity Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Capacité utilisée</span>
                        <span>{capacityUsage.toFixed(0)}%</span>
                      </div>
                      <Progress value={capacityUsage} className="h-2" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
