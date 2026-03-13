/**
 * FullScreenOffresPopup — Unified Freight Board + Search
 * Mobile-optimized bourse logistique with capacity gauges, badges, corridor pricing
 */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Package, ArrowRight, Star, Loader2, Calendar as CalendarIcon, MapPin, Search,
  Zap, Truck, Ship, Plane, Luggage, X, Shield, Bus,
  Flame, Award, TrendingDown, ArrowUpDown, BarChart3, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, addDays, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { KTPBadge } from "@/components/ktp/KTPBadge";
import { type KTPLevel } from "@/hooks/useKTPStatus";

type TransportType = "mobility" | "all" | "routier" | "maritime" | "aerien" | "bagages";
type SortKey = "relevance" | "price" | "date" | "capacity";

interface FullScreenOffresPopupProps {
  open: boolean;
  onClose: () => void;
  initialOrigin?: string;
  initialDestination?: string;
  initialTab?: string;
}

const FILTER_TABS: { id: TransportType; label: string; icon: typeof Package }[] = [
  { id: "all", label: "Tout", icon: BarChart3 },
  { id: "bagages", label: "GP", icon: Luggage },
  { id: "routier", label: "Routier", icon: Truck },
  { id: "maritime", label: "Maritime", icon: Ship },
  { id: "aerien", label: "Aérien", icon: Plane },
  { id: "mobility", label: "Mobility", icon: Bus },
];

const TYPE_MAP: Record<string, string[]> = {
  aerien: ["aerien"],
  maritime: ["maritime"],
  routier: ["routier"],
  mobility: ["mobility"],
  bagages: ["bagages_accompagnes", "navette", "bagages_international", "voyageur"],
};

const MODE_CONFIG: Record<string, { icon: typeof Package; label: string; colorClass: string; bgClass: string }> = {
  bagages_international: { icon: Luggage, label: "GP", colorClass: "text-primary", bgClass: "bg-primary/10" },
  voyageur: { icon: Luggage, label: "GP", colorClass: "text-primary", bgClass: "bg-primary/10" },
  navette: { icon: Luggage, label: "GP", colorClass: "text-primary", bgClass: "bg-primary/10" },
  bagages_accompagnes: { icon: Luggage, label: "GP", colorClass: "text-primary", bgClass: "bg-primary/10" },
  routier: { icon: Truck, label: "Routier", colorClass: "text-blue-500", bgClass: "bg-blue-500/10" },
  maritime: { icon: Ship, label: "Maritime", colorClass: "text-cyan-500", bgClass: "bg-cyan-500/10" },
  aerien: { icon: Plane, label: "Aérien", colorClass: "text-purple-500", bgClass: "bg-purple-500/10" },
  mobility: { icon: Bus, label: "Mobility", colorClass: "text-rose-500", bgClass: "bg-rose-500/10" },
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Pertinence" },
  { value: "price", label: "Prix ↑" },
  { value: "date", label: "Date" },
  { value: "capacity", label: "Capacité" },
];

export function FullScreenOffresPopup({ open, onClose, initialOrigin, initialDestination, initialTab }: FullScreenOffresPopupProps) {
  const navigate = useNavigate();
  const [searchOrigin, setSearchOrigin] = useState(initialOrigin || "");
  const [searchDest, setSearchDest] = useState(initialDestination || "");
  const [activeType, setActiveType] = useState<TransportType>((initialTab as TransportType) || "all");
  const [sortBy, setSortBy] = useState<SortKey>("relevance");
  const [offers, setOffers] = useState<any[]>([]);
  const [corridorPricing, setCorridorPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setSearchOrigin(initialOrigin || "");
      setSearchDest(initialDestination || "");
      setActiveType((initialTab as TransportType) || "all");
      fetchAll();
    }
  }, [open, initialOrigin, initialDestination, initialTab]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [gpRes, mobRes, airRes, corridorRes] = await Promise.all([
        supabase
          .from("gp_offers")
          .select("id, origin_city, origin_country, destination_city, destination_country, departure_date, price_per_kg, currency, transport_type, available_capacity, total_capacity, status, gp_id")
          .eq("status", "active")
          .gte("departure_date", today)
          .gt("available_capacity", 0)
          .order("departure_date", { ascending: true })
          .limit(60),
        supabase
          .from("mobility_offers")
          .select("id, origin_city, origin_country, destination_city, destination_country, departure_date, price_per_seat, currency, available_seats, total_seats, status, mobility_profile_id, departure_time")
          .eq("status", "active")
          .gte("departure_date", today)
          .gt("available_seats", 0)
          .order("departure_date", { ascending: true })
          .limit(20),
        supabase
          .from("air_departures")
          .select("id, origin_city, origin_country, destination_city, destination_country, departure_date, price_per_kg, currency, available_capacity_kg, total_capacity_kg, status, gp_id, airline")
          .eq("status", "active")
          .gte("departure_date", today)
          .order("departure_date", { ascending: true })
          .limit(20),
        supabase
          .from("corridor_pricing_snapshots")
          .select("corridor_key, avg_price_per_kg")
          .order("snapshot_at", { ascending: false })
          .limit(100),
      ]);

      // Enrich GP offers with profiles + KTP
      const gpData = gpRes.data || [];
      let enrichedGp: any[] = [];
      if (gpData.length > 0) {
        const gpIds = [...new Set(gpData.map(o => o.gp_id))];
        const [profilesRes, ktpRes, subsRes] = await Promise.all([
          supabase.from("public_gp_profiles").select("id, business_name, rating, default_currency").in("id", gpIds),
          supabase.from("ktp_status").select("gp_id, ktp_level, trust_score").in("gp_id", gpIds),
          supabase.from("gp_profiles").select("id, subscription").in("id", gpIds),
        ]);
        const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
        const ktpMap = new Map(ktpRes.data?.map(k => [k.gp_id, k]) || []);
        const subsMap = new Map(subsRes.data?.map(s => [s.id, s.subscription]) || []);
        enrichedGp = gpData.map(o => ({
          ...o,
          gp_profile: profileMap.get(o.gp_id),
          ktp: ktpMap.get(o.gp_id),
          subscription: subsMap.get(o.gp_id) || "free",
        }));
      }

      // Air departures → unified format
      const airData = (airRes.data || []).map((a: any) => ({
        id: `air-${a.id}`,
        origin_city: a.origin_city,
        origin_country: a.origin_country,
        destination_city: a.destination_city,
        destination_country: a.destination_country,
        departure_date: a.departure_date,
        price_per_kg: a.price_per_kg,
        currency: a.currency,
        transport_type: "aerien",
        available_capacity: a.available_capacity_kg,
        total_capacity: a.total_capacity_kg,
        gp_id: a.gp_id,
        gp_profile: { business_name: a.airline || "Cargo Aérien" },
        ktp: null,
        subscription: "free",
        subType: a.airline,
      }));

      // Mobility → unified format
      const mobData = (mobRes.data || []);
      let enrichedMob: any[] = [];
      if (mobData.length > 0) {
        const mobIds = [...new Set(mobData.map(o => o.mobility_profile_id))];
        const { data: mobProfiles } = await supabase.from("mobility_profiles").select("id, business_name, rating").in("id", mobIds);
        const mobProfileMap = new Map(mobProfiles?.map(p => [p.id, p]) || []);
        enrichedMob = mobData.map(o => ({
          ...o,
          transport_type: "mobility",
          price_per_kg: o.price_per_seat,
          available_capacity: o.available_seats,
          total_capacity: o.total_seats,
          gp_id: o.mobility_profile_id,
          gp_profile: mobProfileMap.get(o.mobility_profile_id) || { business_name: "Transporteur" },
          ktp: null,
          subscription: "free",
        }));
      }

      setOffers([...enrichedGp, ...airData, ...enrichedMob]);
      setCorridorPricing(corridorRes.data || []);
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  // Corridor avg prices
  const avgPriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    corridorPricing.forEach((c: any) => {
      map[c.corridor_key] = c.avg_price_per_kg;
    });
    return map;
  }, [corridorPricing]);

  const getPriceIndicator = (offer: any) => {
    const key = `${(offer.origin_city || "").toLowerCase()}_${(offer.destination_city || "").toLowerCase()}`;
    const avg = avgPriceMap[key];
    if (!avg || !offer.price_per_kg) return null;
    const ratio = offer.price_per_kg / avg;
    if (ratio <= 0.85) return { label: "Très compétitif", icon: TrendingDown, className: "text-emerald-500" };
    if (ratio <= 1.0) return { label: "Bon prix", icon: TrendingDown, className: "text-emerald-500" };
    if (ratio <= 1.15) return null; // Normal, don't show
    return { label: "Au-dessus du marché", icon: TrendingDown, className: "text-amber-500" };
  };

  // Best price per route
  const bestPriceIds = useMemo(() => {
    const routes: Record<string, { id: string; price: number }[]> = {};
    offers.forEach(o => {
      const key = `${o.origin_city}-${o.destination_city}`;
      if (!routes[key]) routes[key] = [];
      routes[key].push({ id: o.id, price: o.price_per_kg || 0 });
    });
    const ids = new Set<string>();
    Object.values(routes).forEach(group => {
      if (group.length > 1) {
        const cheapest = group.reduce((a, b) => a.price < b.price ? a : b);
        ids.add(cheapest.id);
      }
    });
    return ids;
  }, [offers]);

  const tomorrow = useMemo(() => addDays(new Date(), 2), []);

  const filteredOffers = useMemo(() => {
    let result = offers;

    // Filter by mode
    if (activeType !== "all") {
      const allowed = TYPE_MAP[activeType] || [];
      result = result.filter(o => allowed.includes(o.transport_type));
    }

    // Filter by search
    if (searchOrigin) {
      result = result.filter(o => o.origin_city?.toLowerCase().includes(searchOrigin.toLowerCase()));
    }
    if (searchDest) {
      result = result.filter(o => o.destination_city?.toLowerCase().includes(searchDest.toLowerCase()));
    }

    // Sort
    if (sortBy === "price") {
      result = [...result].sort((a, b) => (a.price_per_kg || 0) - (b.price_per_kg || 0));
    } else if (sortBy === "date") {
      result = [...result].sort((a, b) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime());
    } else if (sortBy === "capacity") {
      result = [...result].sort((a, b) => (b.available_capacity || 0) - (a.available_capacity || 0));
    } else {
      // Relevance: Premium/Pro first, then KTP, then trust score
      const subPriority: Record<string, number> = { pro: 2, premium: 1, free: 0 };
      const ktpPriority: Record<string, number> = { pro: 3, verified: 2, basic: 1 };
      result = [...result].sort((a, b) => {
        const aSub = subPriority[a.subscription] || 0;
        const bSub = subPriority[b.subscription] || 0;
        if (bSub !== aSub) return bSub - aSub;
        const aP = ktpPriority[a.ktp?.ktp_level] || 0;
        const bP = ktpPriority[b.ktp?.ktp_level] || 0;
        if (bP !== aP) return bP - aP;
        return (b.ktp?.trust_score || 0) - (a.ktp?.trust_score || 0);
      });
    }

    return result;
  }, [offers, activeType, searchOrigin, searchDest, sortBy]);

  const lastMinuteCount = useMemo(() => filteredOffers.filter(o => isAfter(tomorrow, new Date(o.departure_date))).length, [filteredOffers, tomorrow]);

  const formatDate = (d: string) => {
    try { return format(new Date(d), "d MMM", { locale: fr }); } catch { return d; }
  };

  const handleOfferClick = (offer: any) => {
    onClose();
    if (offer.transport_type === "mobility") {
      navigate(`/mobility/reserver?trip=${offer.id}`);
    } else {
      navigate(`/offres/${offer.id}`);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="freight-board"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm">Freight Board</h2>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{loading ? "..." : `${filteredOffers.length} offres`}</span>
                {lastMinuteCount > 0 && (
                  <span className="flex items-center gap-0.5 text-destructive font-semibold">
                    <Flame className="w-2.5 h-2.5" /> {lastMinuteCount} last min
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="w-4.5 h-4.5" />
          </Button>
        </div>

        {/* Search + Filters — sticky compact */}
        <div className="px-3 pt-2 pb-1.5 space-y-1.5 bg-card border-b border-border shrink-0">
          {/* Search inputs */}
          <div className="flex gap-1.5">
            <div className="flex-1 flex items-center gap-1.5 bg-muted/40 rounded-lg px-2 py-1.5">
              <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
              <input
                type="text"
                placeholder="Départ"
                value={searchOrigin}
                onChange={e => setSearchOrigin(e.target.value)}
                className="bg-transparent text-xs text-foreground outline-none w-full placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center text-muted-foreground/40">
              <ArrowRight className="w-3 h-3" />
            </div>
            <div className="flex-1 flex items-center gap-1.5 bg-muted/40 rounded-lg px-2 py-1.5">
              <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="Destination"
                value={searchDest}
                onChange={e => setSearchDest(e.target.value)}
                className="bg-transparent text-xs text-foreground outline-none w-full placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Mode tabs + Sort */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar">
              {FILTER_TABS.map(tab => {
                const isActive = activeType === tab.id;
                const count = tab.id === "all" ? offers.length : offers.filter(o => (TYPE_MAP[tab.id] || []).includes(o.transport_type)).length;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveType(tab.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all border ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border"
                    }`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                    {count > 0 && <span className="opacity-60">{count}</span>}
                  </button>
                );
              })}
            </div>
            {/* Sort button */}
            <button
              onClick={() => {
                const idx = SORT_OPTIONS.findIndex(s => s.value === sortBy);
                setSortBy(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].value);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-muted/60 text-muted-foreground border border-border shrink-0"
            >
              <ArrowUpDown className="w-3 h-3" />
              {SORT_OPTIONS.find(s => s.value === sortBy)?.label}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredOffers.length > 0 ? (
            <div className="space-y-2">
              {filteredOffers.map((offer: any, i: number) => {
                const config = MODE_CONFIG[offer.transport_type] || MODE_CONFIG.routier;
                const TransportIcon = config.icon;
                const isMobility = offer.transport_type === "mobility";
                const fillPercent = offer.total_capacity > 0
                  ? ((offer.total_capacity - offer.available_capacity) / offer.total_capacity) * 100
                  : 0;
                const isAlmostFull = fillPercent > 80;
                const isLastMinute = isAfter(tomorrow, new Date(offer.departure_date));
                const isBestPrice = bestPriceIds.has(offer.id);
                const priceIndicator = getPriceIndicator(offer);

                return (
                  <motion.button
                    key={offer.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.25) }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOfferClick(offer)}
                    className={`w-full bg-card border rounded-xl p-3 text-left transition-all ${
                      isLastMinute
                        ? "border-destructive/25 ring-1 ring-destructive/5"
                        : "border-border hover:border-primary/20"
                    }`}
                  >
                    {/* Row 1: Mode icon + Route + Price */}
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${config.bgClass} flex items-center justify-center shrink-0 mt-0.5`}>
                        <TransportIcon className={`w-4 h-4 ${config.colorClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[13px] font-bold text-foreground truncate">{offer.origin_city}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                          <span className="text-[13px] font-bold text-foreground truncate">{offer.destination_city}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">
                            {offer.gp_profile?.business_name || "Transporteur"}
                          </span>
                          {offer.gp_profile?.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                              <Star className="w-2.5 h-2.5 fill-amber-500" />
                              {Number(offer.gp_profile.rating).toFixed(1)}
                            </span>
                          )}
                          {offer.ktp && (
                            <KTPBadge level={offer.ktp.ktp_level as KTPLevel} trustScore={offer.ktp.trust_score || 0} size="sm" />
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-extrabold text-primary leading-none">
                          {offer.price_per_kg?.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {offer.currency || "CFA"}{isMobility ? "/siège" : "/kg"}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Date + Badges + Capacity gauge */}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {formatDate(offer.departure_date)}
                      </span>
                      {isLastMinute && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-destructive/10 text-destructive border-destructive/20 gap-0.5">
                          <Flame className="w-2.5 h-2.5" /> Last min
                        </Badge>
                      )}
                      {isBestPrice && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5">
                          <Award className="w-2.5 h-2.5" /> Best price
                        </Badge>
                      )}
                      {isAlmostFull && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/20 gap-0.5">
                          <Zap className="w-2.5 h-2.5" /> Presque plein
                        </Badge>
                      )}
                      {priceIndicator && (
                        <span className={`text-[9px] font-medium flex items-center gap-0.5 ${priceIndicator.className}`}>
                          <priceIndicator.icon className="w-2.5 h-2.5" />
                          {priceIndicator.label}
                        </span>
                      )}
                    </div>

                    {/* Row 3: Capacity bar */}
                    {offer.total_capacity > 0 && (
                      <div className="mt-1.5">
                        <Progress
                          value={fillPercent}
                          className={`h-1 ${isAlmostFull ? "[&>div]:bg-destructive" : "[&>div]:bg-primary/60"}`}
                        />
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[9px] text-muted-foreground">
                            {offer.available_capacity?.toLocaleString()} {isMobility ? "places" : "kg"} dispo
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {Math.round(fillPercent)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Aucune offre trouvée</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Essayez un autre itinéraire ou mode</p>
              {(searchOrigin || searchDest) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => { setSearchOrigin(""); setSearchDest(""); }}
                >
                  Réinitialiser
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}