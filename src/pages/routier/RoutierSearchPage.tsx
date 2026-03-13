/**
 * RoutierSearchPage — Client browses available routier routes
 * Shows routes with "À partir de X FCFA" + number of transporters
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Truck, MapPin, Users, ArrowRight, Package, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatPriceFCFA } from "@/lib/routierUtils";
import { SearchableCitySelect } from "@/components/gp/SearchableCitySelect";

interface RouteGroup {
  origin_city: string;
  destination_city: string;
  min_price_s: number;
  transporter_count: number;
  next_departure: string | null;
}

export default function RoutierSearchPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteGroup[]>([]);
  const [originFilter, setOriginFilter] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      // Get active routier offers grouped by route (no date filter for prototype)
      const { data, error } = await supabase
        .from("gp_offers")
        .select("origin_city, destination_city, price_s, price_m, price_l, price_xl, price_per_kg, departure_date, gp_id")
        .eq("transport_type", "routier")
        .eq("status", "active");

      if (error) throw error;

      // Group by route
      const groupMap = new Map<string, RouteGroup>();
      const gpSets = new Map<string, Set<string>>();

      (data || []).forEach((offer: any) => {
        const key = `${offer.origin_city}→${offer.destination_city}`;
        const prices = [offer.price_s, offer.price_m, offer.price_l, offer.price_xl].filter((p: any) => p && p > 0);
        // Fallback to price_per_kg if no size prices
        const minPrice = prices.length > 0 ? Math.min(...prices) : (offer.price_per_kg > 0 ? offer.price_per_kg * 25 : 0);

        if (!groupMap.has(key)) {
          groupMap.set(key, {
            origin_city: offer.origin_city,
            destination_city: offer.destination_city,
            min_price_s: minPrice || 0,
            transporter_count: 0,
            next_departure: offer.departure_date,
          });
          gpSets.set(key, new Set());
        }

        const group = groupMap.get(key)!;
        const gps = gpSets.get(key)!;
        gps.add(offer.gp_id);
        group.transporter_count = gps.size;

        if (minPrice > 0 && (group.min_price_s === 0 || minPrice < group.min_price_s)) {
          group.min_price_s = minPrice;
        }
        if (offer.departure_date < (group.next_departure || "9999")) {
          group.next_departure = offer.departure_date;
        }
      });

      setRoutes(Array.from(groupMap.values()).sort((a, b) => b.transporter_count - a.transporter_count));
    } catch (err) {
      console.error("Error loading routes:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoutes = routes.filter(r => {
    if (originFilter && !r.origin_city.toLowerCase().includes(originFilter.toLowerCase())) return false;
    if (destinationFilter && !r.destination_city.toLowerCase().includes(destinationFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <AppHeader />

      {/* Header */}
      <div className="px-4 pt-3 pb-4 bg-background border-b">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/envoyer")} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Transport Routier</h1>
            <p className="text-xs text-muted-foreground">Trouvez un transporteur pour votre colis</p>
          </div>
        </div>

        {/* Search filters */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
            <Input
              placeholder="Ville départ"
              value={originFilter}
              onChange={e => setOriginFilter(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <Input
              placeholder="Ville arrivée"
              value={destinationFilter}
              onChange={e => setDestinationFilter(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Chargement des routes...</p>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Truck className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">Aucune route disponible</p>
              <p className="text-sm text-muted-foreground mt-1">Publiez une mission personnalisée</p>
            </div>
            <Button onClick={() => navigate("/routier/mission")} className="mt-2">
              <Package className="w-4 h-4 mr-2" />
              Demander une mission
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {filteredRoutes.length} route{filteredRoutes.length > 1 ? "s" : ""} disponible{filteredRoutes.length > 1 ? "s" : ""}
            </p>

            {filteredRoutes.map((route, idx) => (
              <motion.button
                key={`${route.origin_city}-${route.destination_city}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/routier/resultats?from=${encodeURIComponent(route.origin_city)}&to=${encodeURIComponent(route.destination_city)}`)}
                className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:shadow-md transition-all active:scale-[0.98]"
              >
                {/* Route header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="font-semibold text-sm truncate">{route.origin_city}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
                    <span className="font-semibold text-sm truncate">{route.destination_city}</span>
                  </div>
                </div>

                {/* Price & info */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-primary">
                      À partir de {formatPriceFCFA(route.min_price_s)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">par colis</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {route.transporter_count} transporteur{route.transporter_count > 1 ? "s" : ""}
                      </span>
                      {route.next_departure && (
                        <span className="flex items-center gap-1">
                          🗓️ Prochain : {new Date(route.next_departure).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </motion.button>
            ))}
          </>
        )}

        {/* CTA Mission */}
        <div className="mt-6 p-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 text-center">
          <p className="text-sm font-semibold mb-1">Votre trajet n'est pas listé ?</p>
          <p className="text-xs text-muted-foreground mb-3">Publiez une mission et recevez des offres de transporteurs</p>
          <Button variant="outline" onClick={() => navigate("/routier/mission")} className="border-primary text-primary">
            <Package className="w-4 h-4 mr-2" />
            Demander une mission
          </Button>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
