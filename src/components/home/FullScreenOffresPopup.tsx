/**
 * FullScreenOffresPopup — Full-screen overlay showing offers list with search & filter
 * Replaces the old /offres page navigation
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Package, ArrowRight, Star, Loader2, Heart, Calendar, MapPin, Search,
  Zap, Truck, Ship, Plane, Luggage, X, ChevronRight, Shield, Bus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useFavorites } from "@/hooks/useFavorites";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { KTPBadge } from "@/components/ktp/KTPBadge";
import { useKTPPublic, type KTPLevel } from "@/hooks/useKTPStatus";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur" | "agence" | "bagages_international";

interface FullScreenOffresPopupProps {
  open: boolean;
  onClose: () => void;
  initialOrigin?: string;
  initialDestination?: string;
  initialTab?: string;
}

const FILTER_TABS = [
  { id: "mobility", label: "Mobility", icon: Bus },
  { id: "all", label: "Tout", icon: Package },
  { id: "routier", label: "Routier", icon: Truck },
  { id: "maritime", label: "Maritime", icon: Ship },
  { id: "aerien", label: "Aérien", icon: Plane },
  { id: "bagages", label: "GP", icon: Luggage },
];

const TYPE_MAP: Record<string, string[]> = {
  aerien: ["aerien"],
  maritime: ["maritime"],
  routier: ["routier"],
  mobility: ["mobility"],
  bagages: ["bagages_accompagnes", "navette", "bagages_international", "voyageur"],
};

const TRANSPORT_CONFIG: Record<string, { icon: typeof Package; label: string; color: string }> = {
  bagages_international: { icon: Luggage, label: "GP", color: "text-primary" },
  voyageur: { icon: Luggage, label: "GP", color: "text-primary" },
  express: { icon: Zap, label: "Express", color: "text-secondary" },
  routier: { icon: Truck, label: "Routier", color: "text-blue-500" },
  maritime: { icon: Ship, label: "Maritime", color: "text-cyan-500" },
  aerien: { icon: Plane, label: "Aérien", color: "text-purple-500" },
  mobility: { icon: Bus, label: "Mobility", color: "text-rose-500" },
  agence: { icon: Package, label: "Agence", color: "text-muted-foreground" },
  navette: { icon: Luggage, label: "GP", color: "text-primary" },
  bagages_accompagnes: { icon: Luggage, label: "GP", color: "text-primary" },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", XOF: " CFA", XAF: " CFA", MAD: " DH", CAD: "$CA", GNF: " FG",
};

export function FullScreenOffresPopup({ open, onClose, initialOrigin, initialDestination, initialTab }: FullScreenOffresPopupProps) {
  const navigate = useNavigate();
  const [searchOrigin, setSearchOrigin] = useState(initialOrigin || "");
  const [searchDest, setSearchDest] = useState(initialDestination || "");
  const [activeType, setActiveType] = useState(initialTab || "all");
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, isFavorite, toggleFavorite } = useFavorites();

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setSearchOrigin(initialOrigin || "");
      setSearchDest(initialDestination || "");
      setActiveType(initialTab || "all");
      fetchOffers();
    }
  }, [open, initialOrigin, initialDestination, initialTab]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [gpRes, mobRes] = await Promise.all([
        supabase
          .from("gp_offers")
          .select("id, origin_city, origin_country, destination_city, destination_country, departure_date, price_per_kg, currency, transport_type, available_capacity, total_capacity, status, gp_id")
          .eq("status", "active")
          .gte("departure_date", today)
          .gt("available_capacity", 0)
          .order("departure_date", { ascending: true })
          .limit(50),
        supabase
          .from("mobility_offers")
          .select("id, origin_city, origin_country, destination_city, destination_country, departure_date, price_per_seat, currency, available_seats, total_seats, status, mobility_profile_id, mobility_type, departure_time")
          .eq("status", "active")
          .gte("departure_date", today)
          .gt("available_seats", 0)
          .order("departure_date", { ascending: true })
          .limit(20),
      ]);

      if (gpRes.error) throw gpRes.error;

      const gpData = gpRes.data || [];
      const mobData = mobRes.data || [];

      // Enrich GP offers
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
        enrichedGp = gpData.map(o => ({ ...o, gp_profile: profileMap.get(o.gp_id), ktp: ktpMap.get(o.gp_id), subscription: subsMap.get(o.gp_id) || "free" }));
      }

      // Enrich Mobility offers
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
          gp_profile: mobProfileMap.get(o.mobility_profile_id) ? {
            business_name: mobProfileMap.get(o.mobility_profile_id)!.business_name,
            rating: mobProfileMap.get(o.mobility_profile_id)!.rating || 0,
          } : null,
          ktp: null,
          subscription: "free",
        }));
      }

      setOffers([...enrichedGp, ...enrichedMob]);
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOffers = useMemo(() => {
    let result = offers;
    if (activeType !== "all") {
      const allowed = TYPE_MAP[activeType] || [];
      result = result.filter(o => allowed.includes(o.transport_type));
    }
    if (searchOrigin) {
      result = result.filter(o => o.origin_city?.toLowerCase().includes(searchOrigin.toLowerCase()));
    }
    if (searchDest) {
      result = result.filter(o => o.destination_city?.toLowerCase().includes(searchDest.toLowerCase()));
    }
    // Sort: Premium/Pro first, then by KTP level, then trust score
    const subPriority: Record<string, number> = { pro: 2, premium: 1, free: 0 };
    const ktpPriority: Record<string, number> = { pro: 3, verified: 2, basic: 1 };
    return result.sort((a: any, b: any) => {
      const aSub = subPriority[a.subscription] || 0;
      const bSub = subPriority[b.subscription] || 0;
      if (bSub !== aSub) return bSub - aSub;
      const aP = ktpPriority[a.ktp?.ktp_level] || 0;
      const bP = ktpPriority[b.ktp?.ktp_level] || 0;
      if (bP !== aP) return bP - aP;
      return (b.ktp?.trust_score || 0) - (a.ktp?.trust_score || 0);
    });
  }, [offers, activeType, searchOrigin, searchDest]);

  const formatDate = (d: string) => {
    try { return format(new Date(d), "d MMM", { locale: fr }); } catch { return d; }
  };

  const handleOfferClick = (offerId: string) => {
    onClose();
    navigate(`/offres/${offerId}`);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="offres-popup"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Search className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-[15px]">
                {initialOrigin || initialDestination ? "Résultats" : "Toutes les offres"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {loading ? "Chargement..." : `${filteredOffers.length} offre${filteredOffers.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search inputs */}
        <div className="px-4 pt-2 pb-1 space-y-1.5 bg-card border-b border-border shrink-0">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-muted/40 rounded-lg px-2.5 py-2">
              <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <input
                type="text"
                placeholder="Départ"
                value={searchOrigin}
                onChange={e => setSearchOrigin(e.target.value)}
                className="bg-transparent text-xs text-foreground outline-none w-full placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex-1 flex items-center gap-2 bg-muted/40 rounded-lg px-2.5 py-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="Destination"
                value={searchDest}
                onChange={e => setSearchDest(e.target.value)}
                className="bg-transparent text-xs text-foreground outline-none w-full placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
            {FILTER_TABS.map(tab => {
              const isActive = activeType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveType(tab.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border"
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : filteredOffers.length > 0 ? (
            <div className="space-y-2">
              {filteredOffers.map((offer: any, i: number) => {
                const config = TRANSPORT_CONFIG[offer.transport_type] || TRANSPORT_CONFIG.routier;
                const TransportIcon = config.icon;
                return (
                  <motion.button
                    key={offer.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOfferClick(offer.id)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-3 text-left hover:border-primary/30 active:bg-muted/40 transition-all"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                      <TransportIcon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-semibold text-foreground truncate">{offer.origin_city}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                        <span className="text-[13px] font-semibold text-foreground truncate">{offer.destination_city}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                          {offer.gp_profile?.business_name || "GP"}
                        </span>
                        {offer.gp_profile?.rating && (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                            <Star className="w-2.5 h-2.5 fill-amber-500" />
                            {Number(offer.gp_profile.rating).toFixed(1)}
                          </span>
                        )}
                        {offer.ktp && (
                          <KTPBadge level={offer.ktp.ktp_level as KTPLevel} trustScore={offer.ktp.trust_score || 0} size="sm" />
                        )}
                        <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-px rounded-full">
                          {formatDate(offer.departure_date)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-base font-extrabold text-primary leading-none">
                        {offer.price_per_kg?.toLocaleString()}
                        <span className="text-[11px] font-bold">{CURRENCY_SYMBOLS[offer.currency] || offer.currency || "F"}</span>
                      </span>
                      <span className="text-[9px] text-muted-foreground block">/kg</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Aucune offre trouvée</p>
              <p className="text-xs text-muted-foreground mt-1">Essayez de modifier vos critères</p>
              {(searchOrigin || searchDest) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => { setSearchOrigin(""); setSearchDest(""); }}
                >
                  Réinitialiser la recherche
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
