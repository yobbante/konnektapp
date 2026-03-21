import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Plane, Ship, Truck, Luggage, Star, Bus, Calendar, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", XOF: " CFA", XAF: " CFA", MAD: " DH", CAD: "$CA", GNF: " FG",
};

interface HomeOfferCardProps {
  offer: any;
  index: number;
  modeLabel?: string;
  subscriptionBadge?: string;
}

const TYPE_ICON: Record<string, { icon: typeof Plane; color: string; bg: string; gradient: string }> = {
  aerien: { icon: Plane, color: "text-transport-aerien", bg: "bg-transport-aerien/10", gradient: "from-transport-aerien to-transport-aerien/60" },
  maritime: { icon: Ship, color: "text-transport-maritime", bg: "bg-transport-maritime/10", gradient: "from-transport-maritime to-transport-maritime/60" },
  routier: { icon: Truck, color: "text-transport-routier", bg: "bg-transport-routier/10", gradient: "from-transport-routier to-transport-routier/60" },
  mobility: { icon: Bus, color: "text-transport-mobility", bg: "bg-transport-mobility/10", gradient: "from-transport-mobility to-transport-mobility/60" },
};

const getTypeIcon = (type: string) => {
  if (TYPE_ICON[type]) return TYPE_ICON[type];
  return { icon: Luggage, color: "text-transport-voyageur", bg: "bg-transport-voyageur/10", gradient: "from-transport-voyageur to-transport-voyageur/60" };
};

export function HomeOfferCard({ offer, index, modeLabel, subscriptionBadge }: HomeOfferCardProps) {
  const departDate = offer.departure_date ? new Date(offer.departure_date) : null;
  const typeIcon = getTypeIcon(offer.transport_type);
  const OfferIcon = typeIcon.icon;
  const currencySymbol = CURRENCY_SYMBOLS[offer.currency] || offer.currency || "F";
  const isMobility = offer.transport_type === "mobility";
  const isRoutier = offer.transport_type === "routier";
  const isOccasionnel = offer.transport_type === "occasionnel";
  const linkTo = `/offres/${offer.id}`;

  const routierMinPrice = isRoutier
    ? Math.min(...[offer.price_s, offer.price_m, offer.price_l, offer.price_xl].filter((p: number) => p && p > 0)) || (offer.price_per_kg > 0 ? offer.price_per_kg * 25 : 0)
    : 0;

  const gpName = offer.gp_profiles?.business_name || "Transporteur";

  return (
    <Link to={linkTo} className="block">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
        whileTap={{ scale: 0.98 }}
        className="bg-card border border-border/60 rounded-2xl overflow-hidden hover:border-primary/30 active:bg-muted/30 transition-all shadow-sm"
      >
        {/* Gradient accent bar */}
        <div className={cn("h-1 w-full bg-gradient-to-r", typeIcon.gradient)} />

        <div className="px-3 py-2.5">
          {/* Route */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", typeIcon.bg)}>
                <OfferIcon className={cn("w-4 h-4", typeIcon.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-foreground truncate">{offer.origin_city}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                  <span className="text-sm font-bold text-foreground truncate">{offer.destination_city}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-muted-foreground truncate">{gpName}</span>
                  {offer.gp_profiles?.rating > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                      <Star className="w-2.5 h-2.5 fill-amber-500" />
                      {offer.gp_profiles.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Price */}
            <div className="flex-shrink-0 ml-2">
              <div className="bg-primary/8 rounded-xl px-2.5 py-1.5 text-center min-w-[60px]">
                {isRoutier ? (
                  <>
                    <span className="text-[8px] text-primary/70 block leading-tight font-semibold">À partir de</span>
                    <span className="text-sm font-extrabold text-primary leading-none whitespace-nowrap">
                      {routierMinPrice > 0 ? routierMinPrice.toLocaleString() : "—"}
                    </span>
                    <span className="text-[8px] text-primary/70 block leading-tight font-semibold">FCFA</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-extrabold text-primary leading-none whitespace-nowrap">
                      {offer.price_per_kg?.toLocaleString()}
                    </span>
                    <span className="text-[8px] text-primary/70 block leading-tight font-semibold">
                      {isMobility ? `${currencySymbol.trim()}/siège` : `${currencySymbol.trim()}/kg`}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Info chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {departDate && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                <Calendar className="w-2.5 h-2.5" />
                {departDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {offer.available_capacity > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-full">
                <Scale className="w-2.5 h-2.5" />
                {offer.available_capacity}{isMobility ? " places" : "kg"}
              </span>
            )}
            {isOccasionnel && (
              <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-600 border-amber-500/30 gap-0.5">
                🧳 Occasionnel
              </Badge>
            )}
            {subscriptionBadge && (
              <Badge className={cn(
                "text-[9px] px-1.5 py-0",
                subscriptionBadge === "pro" ? "bg-amber-500/15 text-amber-600 border-amber-500/30" : "bg-violet-500/15 text-violet-600 border-violet-500/30"
              )}>
                {subscriptionBadge === "pro" ? "PRO" : "PREMIUM"}
              </Badge>
            )}
            {modeLabel && !isOccasionnel && (
              <span className="text-[9px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full font-medium">
                {modeLabel}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
const TYPE_ICON: Record<string, { icon: typeof Plane; color: string; bg: string }> = {
  aerien: { icon: Plane, color: "text-transport-aerien", bg: "bg-transport-aerien/10" },
  maritime: { icon: Ship, color: "text-transport-maritime", bg: "bg-transport-maritime/10" },
  routier: { icon: Truck, color: "text-transport-routier", bg: "bg-transport-routier/10" },
  mobility: { icon: Bus, color: "text-transport-mobility", bg: "bg-transport-mobility/10" },
};

const getTypeIcon = (type: string) => {
  if (TYPE_ICON[type]) return TYPE_ICON[type];
  return { icon: Luggage, color: "text-transport-voyageur", bg: "bg-transport-voyageur/10" };
};

export function HomeOfferCard({ offer, index, modeLabel, subscriptionBadge }: HomeOfferCardProps) {
  const departDate = offer.departure_date ? new Date(offer.departure_date) : null;
  const typeIcon = getTypeIcon(offer.transport_type);
  const OfferIcon = typeIcon.icon;
  const currencySymbol = CURRENCY_SYMBOLS[offer.currency] || offer.currency || "F";
  const isMobility = offer.transport_type === "mobility";
  const isRoutier = offer.transport_type === "routier";
  const linkTo = `/offres/${offer.id}`;

  const routierMinPrice = isRoutier
    ? Math.min(...[offer.price_s, offer.price_m, offer.price_l, offer.price_xl].filter((p: number) => p && p > 0)) || (offer.price_per_kg > 0 ? offer.price_per_kg * 25 : 0)
    : 0;

  return (
    <Link to={linkTo} className="block">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02, duration: 0.15 }}
        whileTap={{ scale: 0.98 }}
        className="bg-card border border-border rounded-xl px-2.5 py-2 flex items-center gap-2 hover:border-primary/30 active:bg-muted/40 transition-all"
      >
        {/* Icon - colored by type */}
        <div className={`w-7 h-7 rounded-lg ${typeIcon.bg} flex items-center justify-center flex-shrink-0`}>
          <OfferIcon className={`w-3.5 h-3.5 ${typeIcon.color}`} />
        </div>

        {/* Center */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-foreground truncate">{offer.origin_city}</span>
            <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/50 flex-shrink-0" />
            <span className="text-xs font-semibold text-foreground truncate">{offer.destination_city}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {departDate && (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {departDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {offer.gp_profiles?.rating > 0 && (
              <span className="flex items-center gap-px text-[9px] text-amber-600">
                <Star className="w-2.5 h-2.5 fill-amber-500" />
                {offer.gp_profiles.rating.toFixed(1)}
              </span>
            )}
            {offer.available_capacity > 0 && (
              <span className="text-[9px] text-muted-foreground font-medium">
                {offer.available_capacity}{isMobility ? " places" : "kg"} dispo
              </span>
            )}
          </div>
          {(modeLabel || subscriptionBadge) && (
            <div className="flex items-center gap-1 mt-0.5">
              {modeLabel && (
                <span className="text-[8px] text-muted-foreground bg-muted/60 px-1.5 py-px rounded-full font-medium">
                  {modeLabel}
                </span>
              )}
              {subscriptionBadge && (
                <span className={`text-[8px] font-bold px-1.5 py-px rounded-full ${subscriptionBadge === "pro" ? "bg-amber-500/15 text-amber-600" : "bg-violet-500/15 text-violet-600"}`}>
                  {subscriptionBadge === "pro" ? "PRO" : "PREMIUM"}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex-shrink-0">
          <div className="bg-primary/8 rounded-lg px-2 py-1 text-center">
            {isRoutier ? (
              <>
                <span className="text-[8px] text-primary/70 block leading-tight font-semibold">À partir de</span>
                <span className="text-[13px] font-extrabold text-primary leading-none whitespace-nowrap">
                  {routierMinPrice > 0 ? routierMinPrice.toLocaleString() : "—"}
                </span>
                <span className="text-[8px] text-primary/70 block leading-tight font-semibold">FCFA</span>
              </>
            ) : (
              <>
                <span className="text-[13px] font-extrabold text-primary leading-none whitespace-nowrap">
                  {offer.price_per_kg?.toLocaleString()}
                </span>
                <span className="text-[8px] text-primary/70 block leading-tight font-semibold">
                  {isMobility ? `${currencySymbol.trim()}/siège` : `${currencySymbol.trim()}/kg`}
                </span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}