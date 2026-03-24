import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  TrendingDown, ChevronDown, BarChart3, Zap, Package, ArrowUpDown, MapPin, Star
} from "lucide-react";
import { format, isAfter, addDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { WORLD_CITIES, FEATURED_CITIES } from "@/components/gp/SearchableCitySelect";
import { useActiveCities } from "@/hooks/useActiveCities";
import { isOfferVisibleForBooking } from "@/lib/bookingRules";
import { GP_ONLY_MODE } from "@/config/featureFlags";

type TransportMode = "all" | "aerien" | "maritime" | "routier" | "gp";
type SortKey = "price" | "date" | "capacity" | "score";

interface MarketplaceListing {
  id: string;
  mode: "aerien" | "maritime" | "routier" | "gp";
  modeLabel: string;
  subType?: string;
  transportType?: string;
  origin: string;
  destination: string;
  departureDate: string;
  arrivalDate?: string;
  capacityTotal: number;
  capacityRemaining: number;
  capacityUnit: string;
  price: number;
  priceUnit: string;
  currency: string;
  providerName: string;
  providerId: string;
  providerRating: number;
  providerSubscription: string;
  isLastMinute: boolean;
  isBestPrice?: boolean;
  offerId: string;
}

const ALL_MODE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  aerien: { icon: Plane, color: "text-transport-aerien", bg: "bg-transport-aerien/10", label: "Aérien" },
  maritime: { icon: Ship, color: "text-transport-maritime", bg: "bg-transport-maritime/10", label: "Maritime" },
  routier: { icon: Truck, color: "text-transport-routier", bg: "bg-transport-routier/10", label: "Routier" },
  gp: { icon: Package, color: "text-transport-voyageur", bg: "bg-transport-voyageur/10", label: "GP Bagages" },
};

const MODE_CONFIG = GP_ONLY_MODE
  ? { gp: ALL_MODE_CONFIG.gp }
  : ALL_MODE_CONFIG;

export default function FreightMarketplace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPopup = searchParams.get("popup") === "1";
  const [modeFilter, setModeFilter] = useState<TransportMode>(GP_ONLY_MODE ? "gp" : "all");
  const [originSearch, setOriginSearch] = useState(searchParams.get("origin") || "");
  const [destSearch, setDestSearch] = useState(searchParams.get("dest") || "");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [showFilters, setShowFilters] = useState(false);
  const [activePicker, setActivePicker] = useState<"origin" | "dest" | null>(null);
  const [cityQuery, setCityQuery] = useState("");

  const today = startOfDay(new Date()).toISOString();

  // Fetch GP offers (in GP_ONLY_MODE, filter to GP bagages types only)
  const { data: gpOffers = [] } = useQuery({
    queryKey: ["marketplace-gp-offers", GP_ONLY_MODE],
    queryFn: async () => {
      let query = supabase
        .from("gp_offers")
        .select("*, gp_profiles!gp_offers_gp_id_fkey(business_name, id, rating, subscription)")
        .eq("status", "active")
        .gte("departure_date", today.split("T")[0])
        .gt("available_capacity", 0)
        .order("departure_date", { ascending: true });
      if (GP_ONLY_MODE) {
        query = query.in("transport_type", ["bagages_international", "occasionnel", "voyageur"] as any);
      }
      const { data } = await query;
      return data || [];
    },
  });

  // Fetch air departures (disabled in GP_ONLY_MODE)
  const { data: airDepartures = [] } = useQuery({
    queryKey: ["marketplace-air-departures"],
    queryFn: async () => {
      if (GP_ONLY_MODE) return [];
      const { data } = await supabase
        .from("air_departures")
        .select("*, gp_profiles!air_departures_gp_id_fkey(business_name, id, rating, subscription)")
        .eq("status", "active")
        .gte("departure_date", today.split("T")[0])
        .order("departure_date", { ascending: true });
      return data || [];
    },
    enabled: !GP_ONLY_MODE,
  });

  // Fetch maritime departures (disabled in GP_ONLY_MODE)
  const { data: maritimeDepartures = [] } = useQuery({
    queryKey: ["marketplace-maritime-departures"],
    queryFn: async () => {
      if (GP_ONLY_MODE) return [];
      const { data } = await supabase
        .from("maritime_departures")
        .select("*, gp_profiles!maritime_departures_gp_id_fkey(business_name, id, rating, subscription)")
        .eq("status", "active")
        .gte("departure_date", today.split("T")[0])
        .order("departure_date", { ascending: true });
      return data || [];
    },
    enabled: !GP_ONLY_MODE,
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
      if (!isOfferVisibleForBooking(o)) return;

      const mode = o.transport_type === "routier" ? "routier" :
        o.transport_type === "maritime" ? "maritime" :
        o.transport_type === "aerien" ? "aerien" : "gp";
      
      result.push({
        id: o.id,
        mode,
        modeLabel: MODE_CONFIG[mode]?.label || "GP",
        transportType: o.transport_type,
        origin: `${o.origin_city}, ${o.origin_country}`,
        destination: `${o.destination_city}, ${o.destination_country}`,
        departureDate: o.departure_date,
        arrivalDate: o.arrival_date || undefined,
        capacityTotal: o.total_capacity || 0,
        capacityRemaining: o.available_capacity || 0,
        capacityUnit: "kg",
        price: o.price_per_kg || 0,
        priceUnit: "/kg",
        currency: o.currency || "XOF",
        providerName: o.gp_profiles?.business_name || "Transporteur",
        providerId: o.gp_profiles?.id || o.gp_id,
        providerRating: o.gp_profiles?.rating || 0,
        providerSubscription: o.gp_profiles?.subscription || "free",
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
        arrivalDate: a.arrival_date || undefined,
        capacityTotal: a.total_capacity_kg || 0,
        capacityRemaining: a.available_capacity_kg || 0,
        capacityUnit: "kg",
        price: a.price_per_kg || 0,
        priceUnit: "/kg",
        currency: a.currency || "XOF",
        providerName: a.gp_profiles?.business_name || "Cargo",
        providerId: a.gp_profiles?.id || a.gp_id,
        providerRating: a.gp_profiles?.rating || 0,
        providerSubscription: a.gp_profiles?.subscription || "free",
        isLastMinute: isAfter(tomorrow, new Date(a.departure_date)),
        offerId: a.id,
      });
    });

    // Maritime departures
    maritimeDepartures.forEach((m: any) => {
      const typeLabel = m.maritime_type === "fcl" ? "FCL" : m.maritime_type === "lcl" ? "LCL" : m.maritime_type === "vehicle" ? "RoRo" : "Maritime";
      result.push({
        id: `mar-${m.id}`,
        mode: "maritime" as const,
        modeLabel: "Maritime",
        subType: typeLabel,
        origin: `${m.origin_port}, ${m.origin_country}`,
        destination: `${m.destination_port}, ${m.destination_country}`,
        departureDate: m.departure_date,
        capacityTotal: m.total_capacity_m3 || 0,
        capacityRemaining: m.available_capacity_m3 || 0,
        capacityUnit: "m³",
        price: m.maritime_type === "fcl" ? (m.price_total || 0) : (m.price_per_m3 || 0),
        priceUnit: m.maritime_type === "fcl" ? " total" : "/m³",
        currency: m.currency || "XOF",
        providerName: m.gp_profiles?.business_name || "Transitaire",
        providerId: m.gp_profiles?.id || m.gp_id,
        providerRating: m.gp_profiles?.rating || 0,
        providerSubscription: m.gp_profiles?.subscription || "free",
        isLastMinute: isAfter(tomorrow, new Date(m.departure_date)),
        offerId: m.id,
      });
    });

    return result;
  }, [gpOffers, airDepartures, maritimeDepartures]);

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

    if (originSearch.trim()) {
      const q = originSearch.toLowerCase();
      result = result.filter((l) => l.origin.toLowerCase().includes(q));
    }

    if (destSearch.trim()) {
      const q = destSearch.toLowerCase();
      result = result.filter((l) => l.destination.toLowerCase().includes(q));
    }

    const scoreListing = (l: MarketplaceListing) => {
      const subBoost = l.providerSubscription === "pro" ? 1000 : l.providerSubscription === "premium" ? 500 : 0;
      return subBoost + (l.providerRating || 0);
    };

    result.sort((a, b) => {
      if (sortBy === "price") return a.price - b.price;
      if (sortBy === "capacity") return b.capacityRemaining - a.capacityRemaining;
      if (sortBy === "score") return scoreListing(b) - scoreListing(a);
      return new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime();
    });

    return result;
  }, [listingsWithBadges, modeFilter, originSearch, destSearch, sortBy]);

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
    // Always open offer details first
    navigate(`/offres/${listing.offerId}`);
  };

  return (
    <div className={`bg-background pb-24 min-h-screen ${isPopup ? "animate-in fade-in slide-in-from-bottom-4 duration-200" : ""}`}>
      {/* Popup-style close bar */}
      {isPopup ? (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h1 className="text-base font-bold text-foreground">Freight Board</h1>
            </div>
            <button 
              onClick={() => navigate(-1)} 
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <span className="text-sm font-bold text-muted-foreground">✕</span>
            </button>
          </div>
          <div className="flex gap-2 pb-2 text-[10px]">
            <span className="text-muted-foreground flex items-center gap-1">
              <Package className="w-3 h-3" />
              {listings.length} offres
            </span>
            {lastMinuteCount > 0 && (
              <span className="text-destructive flex items-center gap-1">
                <Flame className="w-3 h-3" />
                {lastMinuteCount} last minute
              </span>
            )}
          </div>
        </div>
      ) : (
        <AppHeader />
      )}

      {/* Hero header — only in non-popup mode */}
      {!isPopup && (
        <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
          <div className="container max-w-4xl py-4 px-4">
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
      )}

      {/* Filters — sticky below popup header or at top */}
      <div className={`sticky ${isPopup ? "top-[88px]" : "top-0"} z-30 bg-background/95 backdrop-blur-md border-b border-border`}>
        <div className="container max-w-4xl px-4 py-3 space-y-3">
          {/* Mode filter tabs */}
          <div className="flex gap-1">
            {(GP_ONLY_MODE ? ["gp"] as TransportMode[] : ["all", "aerien", "maritime", "routier", "gp"] as TransportMode[]).map((mode) => {
              const config = mode === "all" ? null : MODE_CONFIG[mode];
              const Icon = config?.icon || BarChart3;
              const count = mode === "all" ? listings.length : listings.filter((l) => l.mode === mode).length;
              return (
                <button
                  key={mode}
                  onClick={() => setModeFilter(mode)}
                  className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    modeFilter === mode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {mode === "all" ? "Tout" : config?.label}
                </button>
              );
            })}
          </div>

          {/* Search & sort row */}
          <div className="flex gap-2">
            <button
              onClick={() => { setCityQuery(""); setActivePicker("origin"); }}
              className="flex-1 flex items-center gap-1.5 px-2.5 h-9 rounded-md border border-input bg-background text-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-success shrink-0" />
              <span className={originSearch ? "text-foreground font-medium truncate" : "text-muted-foreground truncate"}>
                {originSearch || "Départ..."}
              </span>
            </button>
            <button
              onClick={() => { setCityQuery(""); setActivePicker("dest"); }}
              className="flex-1 flex items-center gap-1.5 px-2.5 h-9 rounded-md border border-input bg-background text-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-destructive shrink-0" />
              <span className={destSearch ? "text-foreground font-medium truncate" : "text-muted-foreground truncate"}>
                {destSearch || "Destination..."}
              </span>
            </button>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-[110px] h-9 text-xs">
                <ArrowUpDown className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Score ★</SelectItem>
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
                    <CardContent className="p-0">
                      {/* Gradient accent bar */}
                      <div className={`h-1 w-full bg-gradient-to-r ${
                        listing.mode === "gp" ? "from-transport-voyageur to-transport-voyageur/60" :
                        listing.mode === "aerien" ? "from-transport-aerien to-transport-aerien/60" :
                        listing.mode === "maritime" ? "from-transport-maritime to-transport-maritime/60" :
                        "from-transport-routier to-transport-routier/60"
                      }`} />
                      
                      <div className="px-3.5 py-3">
                        {/* Top: Route + Badges */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-8 h-8 rounded-xl ${config?.bg} flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-4 h-4 ${config?.color}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-foreground truncate">
                                  {listing.origin.split(",")[0]}
                                </span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                                <span className="text-sm font-bold text-foreground truncate">
                                  {listing.destination.split(",")[0]}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {listing.providerName}
                                </span>
                                {listing.providerRating > 0 && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                                    <Star className="w-2.5 h-2.5 fill-amber-500" />
                                    {listing.providerRating.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Price */}
                          <div className="flex-shrink-0 ml-2">
                            <div className="bg-primary/8 rounded-xl px-2.5 py-1.5 text-center min-w-[60px]">
                              <span className="text-sm font-extrabold text-primary leading-none whitespace-nowrap">
                                {listing.price.toLocaleString()}
                              </span>
                              <span className="text-[8px] text-primary/70 block leading-tight font-semibold">
                                {listing.currency}{listing.priceUnit}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Info chips */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5" />
                            {format(new Date(listing.departureDate), "d MMM", { locale: fr })}
                          </span>
                          {listing.arrivalDate && (
                            <span className="text-[9px] text-muted-foreground">
                              → {format(new Date(listing.arrivalDate), "d MMM", { locale: fr })}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-full">
                            {listing.capacityRemaining.toLocaleString()} {listing.capacityUnit}
                          </span>
                          {listing.isLastMinute && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-destructive/15 text-destructive border-destructive/30 gap-0.5">
                              <Flame className="w-2.5 h-2.5" /> Last min
                            </Badge>
                          )}
                          {listing.isBestPrice && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-success/15 text-success border-success/30 gap-0.5">
                              Best price
                            </Badge>
                          )}
                          {listing.transportType === "occasionnel" && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-600 border-amber-500/30 gap-0.5">
                              🧳 Occasionnel
                            </Badge>
                          )}
                          {isAlmostFull && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/20 gap-0.5">
                              <Zap className="w-2.5 h-2.5" /> {Math.round(fillPercent)}%
                            </Badge>
                          )}
                          {priceIndicator && (
                            <span className={`text-[9px] font-medium ${priceIndicator.color}`}>
                              {priceIndicator.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {!isPopup && <MobileNav />}

      {/* City Picker Drawer */}
      <CityPickerDrawer
        open={!!activePicker}
        onOpenChange={(open) => { if (!open) setActivePicker(null); }}
        title={activePicker === "origin" ? "Ville de départ" : "Ville de destination"}
        onSelect={(city) => {
          if (activePicker === "origin") setOriginSearch(city);
          else setDestSearch(city);
          setActivePicker(null);
          setCityQuery("");
        }}
        cityQuery={cityQuery}
        onCityQueryChange={setCityQuery}
      />
    </div>
  );
}

// ── City Picker Drawer ──
function CityPickerDrawer({
  open, onOpenChange, title, onSelect, cityQuery, onCityQueryChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSelect: (city: string) => void;
  cityQuery: string;
  onCityQueryChange: (q: string) => void;
}) {
  const { cities: activeCities } = useActiveCities();
  const activeCitiesFormatted = useMemo(() => 
    activeCities.map(c => ({ city: c.city, country: c.country_code, flag: c.flag })),
    [activeCities]
  );

  const filteredCities = useMemo(() => {
    if (!cityQuery) return activeCitiesFormatted;
    const q = cityQuery.toLowerCase();
    return activeCitiesFormatted.filter((c) => c.city.toLowerCase().includes(q));
  }, [cityQuery, activeCitiesFormatted]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher une ville..."
              value={cityQuery}
              onChange={(e) => onCityQueryChange(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
          </div>
        </div>
        <div className="overflow-y-auto overscroll-contain px-2 pb-6" style={{ maxHeight: "55vh", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          {filteredCities.slice(0, 30).map((city) => (
            <button
              key={`${city.city}-${city.country}`}
              onClick={() => onSelect(city.city)}
              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-left hover:bg-muted/60 active:bg-muted transition-colors"
            >
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium flex-1">{city.city}</span>
            </button>
          ))}
          {filteredCities.length === 0 && cityQuery && (
            <button
              onClick={() => onSelect(cityQuery)}
              className="w-full py-3 text-sm text-primary font-medium text-center"
            >
              Utiliser "{cityQuery}"
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
