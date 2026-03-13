/**
 * RoutierRouteResultsPage — Client sees all transporters on a route
 * with prices per size S/M/L/XL + "Prix recommandé Konnekt"
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Truck, Star, Shield, Users, Package, Loader2, Info, CheckCircle2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { getAllSizeCategories, formatPriceFCFA, getTransporterPriceForSize, type SizeCategory } from "@/lib/routierUtils";

interface TransporterOffer {
  id: string;
  gp_id: string;
  business_name: string;
  rating: number | null;
  total_deliveries: number | null;
  departure_date: string;
  arrival_date: string | null;
  available_capacity: number;
  price_s: number | null;
  price_m: number | null;
  price_l: number | null;
  price_xl: number | null;
  vehicle_name: string | null;
  status: string;
}

interface RecommendedPrices {
  recommended_price_s: number;
  recommended_price_m: number;
  recommended_price_l: number;
  recommended_price_xl: number;
}

export default function RoutierRouteResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const originCity = searchParams.get("from") || "";
  const destCity = searchParams.get("to") || "";

  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<TransporterOffer[]>([]);
  const [recommended, setRecommended] = useState<RecommendedPrices | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizeCategory>("S");
  const sizes = getAllSizeCategories();

  useEffect(() => {
    if (originCity && destCity) loadResults();
  }, [originCity, destCity]);

  const loadResults = async () => {
    setLoading(true);
    try {
      // Load offers for this route
      const { data: offersData, error: offersError } = await supabase
        .from("gp_offers")
        .select(`
          id, gp_id, departure_date, arrival_date, available_capacity,
          price_s, price_m, price_l, price_xl, status,
          gp_profiles!gp_offers_gp_id_fkey(business_name, rating, total_deliveries)
        `)
        .eq("transport_type", "routier")
        .eq("status", "active")
        .ilike("origin_city", originCity)
        .ilike("destination_city", destCity)
        .gte("departure_date", new Date().toISOString().split("T")[0])
        .order("departure_date", { ascending: true });

      if (offersError) throw offersError;

      const mapped: TransporterOffer[] = (offersData || []).map((o: any) => ({
        id: o.id,
        gp_id: o.gp_id,
        business_name: o.gp_profiles?.business_name || "Transporteur",
        rating: o.gp_profiles?.rating,
        total_deliveries: o.gp_profiles?.total_deliveries,
        departure_date: o.departure_date,
        arrival_date: o.arrival_date,
        available_capacity: o.available_capacity,
        price_s: o.price_s,
        price_m: o.price_m,
        price_l: o.price_l,
        price_xl: o.price_xl,
        vehicle_name: null,
        status: o.status,
      }));
      setOffers(mapped);

      // Load recommended prices
      const { data: recData } = await supabase
        .rpc("get_routier_recommended_prices", {
          p_origin_city: originCity,
          p_destination_city: destCity,
        });

      if (recData && recData.length > 0) {
        setRecommended(recData[0]);
      }
    } catch (err) {
      console.error("Error loading results:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendedForSize = (size: SizeCategory): number => {
    if (!recommended) return 0;
    const map: Record<SizeCategory, keyof RecommendedPrices> = {
      S: "recommended_price_s", M: "recommended_price_m",
      L: "recommended_price_l", XL: "recommended_price_xl",
    };
    return recommended[map[size]] || 0;
  };

  const handleSelectOffer = (offer: TransporterOffer) => {
    // Store selection and redirect to booking
    sessionStorage.setItem("routier_booking", JSON.stringify({
      offerId: offer.id,
      gpId: offer.gp_id,
      businessName: offer.business_name,
      originCity,
      destinationCity: destCity,
      departureDate: offer.departure_date,
      sizeCategory: selectedSize,
      price: getTransporterPriceForSize(offer, selectedSize),
    }));
    navigate("/routier/mission"); // TODO: dedicated booking page
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <AppHeader />

      {/* Route header */}
      <div className="px-4 pt-3 pb-4 bg-card border-b">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/routier/recherche")} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold">{originCity}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="font-bold">{destCity}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {offers.length} transporteur{offers.length > 1 ? "s" : ""} disponible{offers.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Size selector */}
        <div className="flex gap-2">
          {sizes.map(s => (
            <button
              key={s.label}
              onClick={() => setSelectedSize(s.label)}
              className={`flex-1 py-2 px-2 rounded-xl border-2 text-center transition-all ${
                selectedSize === s.label
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <p className={`text-sm font-bold ${selectedSize === s.label ? "text-primary" : ""}`}>{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.description}</p>
            </button>
          ))}
        </div>

        {/* Recommended price indicator */}
        {recommended && getRecommendedForSize(selectedSize) > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border">
            <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Prix recommandé Konnekt : <span className="font-bold text-foreground">{formatPriceFCFA(getRecommendedForSize(selectedSize))}</span>
            </p>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Recherche de transporteurs...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Truck className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">Aucun transporteur disponible</p>
              <p className="text-sm text-muted-foreground mt-1">Publiez une mission et recevez des offres</p>
            </div>
            <Button onClick={() => navigate("/routier/mission")}>
              <Package className="w-4 h-4 mr-2" />
              Demander une mission
            </Button>
          </div>
        ) : (
          offers.map((offer, idx) => {
            const price = getTransporterPriceForSize(offer, selectedSize);
            const recPrice = getRecommendedForSize(selectedSize);
            const isBelowRec = recPrice > 0 && price < recPrice;
            const isAboveRec = recPrice > 0 && price > recPrice * 1.2;

            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                {/* Transporter header */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-transport-routier/10 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-transport-routier" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{offer.business_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {offer.rating && (
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                              {offer.rating.toFixed(1)}
                            </span>
                          )}
                          {(offer.total_deliveries || 0) > 0 && (
                            <span>{offer.total_deliveries} livraisons</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isBelowRec && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 text-xs">
                        Compétitif
                      </Badge>
                    )}
                  </div>

                  {/* Price grid */}
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    {sizes.map(s => {
                      const p = getTransporterPriceForSize(offer, s.label);
                      const isSelected = selectedSize === s.label;
                      return (
                        <button
                          key={s.label}
                          onClick={() => setSelectedSize(s.label)}
                          className={`py-2 px-1 rounded-lg text-center transition-all ${
                            isSelected ? "bg-primary/10 border border-primary" : "bg-muted/50"
                          }`}
                        >
                          <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                          <p className={`text-xs font-bold ${isSelected ? "text-primary" : ""}`}>
                            {p > 0 ? `${(p / 1000).toFixed(0)}k` : "—"}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected price + CTA */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-bold text-primary">{formatPriceFCFA(price)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Colis {selectedSize} • Départ {new Date(offer.departure_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleSelectOffer(offer)} className="gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Réserver
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <MobileNav />
    </div>
  );
}
