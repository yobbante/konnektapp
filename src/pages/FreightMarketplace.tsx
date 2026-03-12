import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Ship, Plane, Truck, Search, Filter, ArrowRight, Flame, Award, Clock,
  TrendingDown, ChevronDown, BarChart3, Zap, Package, ArrowUpDown, MapPin
} from "lucide-react";
import { format, isAfter, addDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

type TransportMode = "all" | "aerien" | "maritime" | "routier" | "gp";
type SortKey = "price" | "date" | "capacity";

interface MarketplaceListing {
  id: string;
  mode: "aerien" | "maritime" | "routier" | "gp";
  modeLabel: string;
  subType?: string; // LCL, FCL, etc
  origin: string;
  destination: string;
  departureDate: string;
  capacityTotal: number;
  capacityRemaining: number;
  capacityUnit: string;
  price: number;
  priceUnit: string;
  currency: string;
  providerName: string;
  providerId: string;
  isLastMinute: boolean;
  isBestPrice?: boolean;
  offerId: string;
}

const MODE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  aerien: { icon: Plane, color: "text-transport-aerien", bg: "bg-transport-aerien/10", label: "Aérien" },
  maritime: { icon: Ship, color: "text-transport-maritime", bg: "bg-transport-maritime/10", label: "Maritime" },
  routier: { icon: Truck, color: "text-transport-routier", bg: "bg-transport-routier/10", label: "Routier" },
  gp: { icon: Package, color: "text-transport-voyageur", bg: "bg-transport-voyageur/10", label: "GP Bagages" },
};

export default function FreightMarketplace() {
  const navigate = useNavigate();
  const [modeFilter, setModeFilter] = useState<TransportMode>("all");
  const [routeSearch, setRouteSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [showFilters, setShowFilters] = useState(false);

  const today = startOfDay(new Date()).toISOString();

  // Fetch all GP offers (covers GP bagages, routier mode offers)
  const { data: gpOffers = [] } = useQuery({
    queryKey: ["marketplace-gp-offers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gp_offers")
        .select("*, gp_profiles!gp_offers_gp_id_fkey(business_name, id)")
        .eq("status", "active")
        .gte("departure_date", today.split("T")[0])
        .order("departure_date", { ascending: true });
      return data || [];
    },
  });

  // Fetch air departures
  const { data: airDepartures = [] } = useQuery({
    queryKey: ["marketplace-air-departures"],
    queryFn: async () => {
      const { data } = await supabase
        .from("air_departures")
        .select("*, gp_profiles!air_departures_gp_id_fkey(business_name, id)")
        .eq("status", "active")
        .gte("departure_date", today.split("T")[0])
        .order("departure_date", { ascending: true });
      return data || [];
    },
  });

  // Fetch corridor pricing snapshots for avg price indicator
  const { data: corridorPricing = [] } = useQuery({
    queryKey: ["marketplace-corridor-pricing"],
    queryFn: async () => {
      const { data } = await supabase
        .from("corridor_pricing_snapshots")
        .select("*")
        .order("snapshot_at", { ascending: false });
      return data || [];
    },
  });

  // Normalize all data into unified listings
  const listings: MarketplaceListing[] = useMemo(() => {
    const result: MarketplaceListing[] = [];
    const tomorrow = addDays(new Date(), 2);

    // GP offers → map transport_type
    gpOffers.forEach((o: any) => {
      const mode = o.transport_type === "routier" ? "routier" :
        o.transport_type === "maritime" ? "maritime" :
        o.transport_type === "aerien" ? "aerien" : "gp";
      
      result.push({
        id: o.id,
        mode,
        modeLabel: MODE_CONFIG[mode]?.label || "GP",
        origin: `${o.origin_city}, ${o.origin_country}`,
        destination: `${o.destination_city}, ${o.destination_country}`,
        departureDate: o.departure_date,
        capacityTotal: o.total_capacity || 0,
        capacityRemaining: o.available_capacity || 0,
        capacityUnit: "kg",
        price: o.price_per_kg || 0,
        priceUnit: "/kg",
        currency: o.currency || "XOF",
        providerName: o.gp_profiles?.business_name || "Transporteur",
        providerId: o.gp_profiles?.id || o.gp_id,
        isLastMinute: isAfter(tomorrow, new Date(o.departure_date)),
        offerId: o.id,
      });
    });

    // Air departures
    airDepartures.forEach((a: any) => {
      result.push({
        id: `air-${a.id}`,
        mode: "aerien",
        modeLabel: "Cargo Aérien",
        subType: a.airline || undefined,
        origin: `${a.origin_city}, ${a.origin_country}`,
        destination: `${a.destination_city}, ${a.destination_country}`,
        departureDate: a.departure_date,
        capacityTotal: a.total_capacity_kg || 0,
        capacityRemaining: a.available_capacity_kg || 0,
        capacityUnit: "kg",
        price: a.price_per_kg || 0,
        priceUnit: "/kg",
        currency: a.currency || "XOF",
        providerName: a.gp_profiles?.business_name || "Cargo",
        providerId: a.gp_profiles?.id || a.gp_id,
        isLastMinute: isAfter(tomorrow, new Date(a.departure_date)),
        offerId: a.id,
      });
    });

    return result;
  }, [gpOffers, airDepartures]);

  // Mark best price per route
  const listingsWithBadges = useMemo(() => {
    const routeGroups: Record<string, MarketplaceListing[]> = {};
    listings.forEach((l) => {
      const key = `${l.origin}->${l.destination}`;
      if (!routeGroups[key]) routeGroups[key] = [];
      routeGroups[key].push(l);
    });

    const bestPriceIds = new Set<string>();
    Object.values(routeGroups).forEach((group) => {
      if (group.length > 1) {
        const cheapest = group.reduce((a, b) => (a.price < b.price ? a : b));
        bestPriceIds.add(cheapest.id);
      }
    });

    return listings.map((l) => ({ ...l, isBestPrice: bestPriceIds.has(l.id) }));
  }, [listings]);

  // Filtering & sorting
  const filtered = useMemo(() => {
    let result = listingsWithBadges;

    if (modeFilter !== "all") {
      result = result.filter((l) => l.mode === modeFilter);
    }

    if (routeSearch.trim()) {
      const q = routeSearch.toLowerCase();
      result = result.filter(
        (l) =>
          l.origin.toLowerCase().includes(q) ||
          l.destination.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "price") return a.price - b.price;
      if (sortBy === "capacity") return b.capacityRemaining - a.capacityRemaining;
      return new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime();
    });

    return result;
  }, [listingsWithBadges, modeFilter, routeSearch, sortBy]);

  const lastMinuteCount = filtered.filter((l) => l.isLastMinute).length;

  // Corridor avg prices
  const avgPriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    corridorPricing.forEach((c: any) => {
      map[c.corridor_key] = c.avg_price_per_kg;
    });
    return map;
  }, [corridorPricing]);

  const getPriceIndicator = (listing: MarketplaceListing) => {
    const key = `${listing.origin.split(",")[0].trim().toLowerCase()}_${listing.destination.split(",")[0].trim().toLowerCase()}`;
    const avg = avgPriceMap[key];
    if (!avg) return null;
    const ratio = listing.price / avg;
    if (ratio <= 0.85) return { label: "Très compétitif", color: "text-success" };
    if (ratio <= 1.0) return { label: "Bon prix", color: "text-success" };
    if (ratio <= 1.15) return { label: "Prix normal", color: "text-muted-foreground" };
    return { label: "Au-dessus du marché", color: "text-warning" };
  };

  const handleBook = (listing: MarketplaceListing) => {
    if (listing.mode === "gp" || listing.mode === "aerien") {
      navigate(`/reservation/gp/${listing.providerId}?offer=${listing.offerId}`);
    } else {
      navigate(`/offres/${listing.offerId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader />

      {/* Hero header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
        <div className="container max-w-4xl py-6 px-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Freight Board</h1>
              <p className="text-xs text-muted-foreground">Bourse logistique en temps réel</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3 text-xs">
            <Badge variant="outline" className="gap-1">
              <Package className="w-3 h-3" />
              {listings.length} offres actives
            </Badge>
            {lastMinuteCount > 0 && (
              <Badge className="gap-1 bg-destructive/15 text-destructive border-destructive/30">
                <Flame className="w-3 h-3" />
                {lastMinuteCount} last minute
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container max-w-4xl px-4 py-3 space-y-3">
          {/* Mode filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {(["all", "aerien", "maritime", "routier", "gp"] as TransportMode[]).map((mode) => {
              const config = mode === "all" ? null : MODE_CONFIG[mode];
              const Icon = config?.icon || BarChart3;
              const count = mode === "all" ? listings.length : listings.filter((l) => l.mode === mode).length;
              return (
                <button
                  key={mode}
                  onClick={() => setModeFilter(mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    modeFilter === mode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {mode === "all" ? "Tout" : config?.label}
                  <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search & sort row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une route..."
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <ArrowUpDown className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date départ</SelectItem>
                <SelectItem value="price">Prix ↑</SelectItem>
                <SelectItem value="capacity">Capacité ↓</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="container max-w-4xl px-4 py-4 space-y-3">
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">Aucune offre disponible</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {modeFilter !== "all" ? "Essayez un autre mode de transport" : "Les transporteurs n'ont pas encore publié d'offres"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((listing, i) => {
              const config = MODE_CONFIG[listing.mode];
              const Icon = config?.icon || Package;
              const fillPercent = listing.capacityTotal > 0
                ? ((listing.capacityTotal - listing.capacityRemaining) / listing.capacityTotal) * 100
                : 0;
              const isAlmostFull = fillPercent > 80;
              const priceIndicator = getPriceIndicator(listing);

              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    className={`overflow-hidden cursor-pointer active:scale-[0.99] transition-all hover:shadow-md ${
                      listing.isLastMinute ? "border-destructive/30 ring-1 ring-destructive/10" : ""
                    }`}
                    onClick={() => handleBook(listing)}
                  >
                    <CardContent className="p-3.5">
                      {/* Top row: mode + badges */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg ${config?.bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${config?.color}`} />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-foreground">{listing.modeLabel}</span>
                            {listing.subType && (
                              <span className="text-[10px] text-muted-foreground ml-1">· {listing.subType}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {listing.isLastMinute && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-destructive/15 text-destructive border-destructive/30 gap-0.5">
                              <Flame className="w-2.5 h-2.5" /> Last min
                            </Badge>
                          )}
                          {listing.isBestPrice && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-success/15 text-success border-success/30 gap-0.5">
                              <Award className="w-2.5 h-2.5" /> Best price
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm">
                            <MapPin className="w-3 h-3 text-primary shrink-0" />
                            <span className="font-medium truncate">{listing.origin.split(",")[0]}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{listing.destination.split(",")[0]}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 pl-5">
                            {listing.providerName}
                          </p>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 mb-2.5">
                        {/* Date */}
                        <div className="text-center bg-muted/40 rounded-lg py-1.5 px-1">
                          <Clock className="w-3 h-3 mx-auto text-muted-foreground mb-0.5" />
                          <p className="text-[10px] font-semibold">
                            {format(new Date(listing.departureDate), "d MMM", { locale: fr })}
                          </p>
                        </div>
                        {/* Price */}
                        <div className="text-center bg-primary/5 rounded-lg py-1.5 px-1">
                          <p className="text-xs font-bold text-primary">
                            {listing.price.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {listing.currency}{listing.priceUnit}
                          </p>
                        </div>
                        {/* Capacity */}
                        <div className="text-center bg-muted/40 rounded-lg py-1.5 px-1">
                          <p className={`text-xs font-bold ${isAlmostFull ? "text-destructive" : "text-foreground"}`}>
                            {listing.capacityRemaining.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {listing.capacityUnit} restant
                          </p>
                        </div>
                      </div>

                      {/* Capacity gauge */}
                      <div className="mb-2">
                        <Progress
                          value={fillPercent}
                          className={`h-1.5 ${isAlmostFull ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`}
                        />
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[9px] text-muted-foreground">
                            {Math.round(fillPercent)}% rempli
                          </span>
                          {isAlmostFull && (
                            <span className="text-[9px] text-destructive font-medium flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" /> Presque complet
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price indicator if available */}
                      {priceIndicator && (
                        <div className="flex items-center gap-1 mb-2">
                          <TrendingDown className={`w-3 h-3 ${priceIndicator.color}`} />
                          <span className={`text-[10px] font-medium ${priceIndicator.color}`}>
                            {priceIndicator.label}
                          </span>
                        </div>
                      )}

                      {/* CTA */}
                      <Button size="sm" className="w-full h-8 text-xs gap-1.5">
                        Réserver <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
