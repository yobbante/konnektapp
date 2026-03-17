import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Plane, Ship, Truck, Luggage, Star, Bus } from "lucide-react";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", XOF: " CFA", XAF: " CFA", MAD: " DH", CAD: "$CA", GNF: " FG",
};

interface HomeOfferCardProps {
  offer: any;
  index: number;
  modeLabel?: string;
  subscriptionBadge?: string;
}

const TYPE_STYLE: Record<string, { icon: typeof Plane; color: string; bg: string }> = {
  aerien: { icon: Plane, color: "text-transport-aerien", bg: "bg-transport-aerien/10" },
  maritime: { icon: Ship, color: "text-transport-maritime", bg: "bg-transport-maritime/10" },
  routier: { icon: Truck, color: "text-transport-routier", bg: "bg-transport-routier/10" },
  mobility: { icon: Bus, color: "text-transport-mobility", bg: "bg-transport-mobility/10" },
};

const getTypeStyle = (type: string) => {
  if (TYPE_STYLE[type]) return TYPE_STYLE[type];
  // GP/bagages types
  return { icon: Luggage, color: "text-transport-voyageur", bg: "bg-transport-voyageur/10" };
};

const TYPE_BORDER: Record<string, string> = {
  aerien: "border-transport-aerien/25",
  maritime: "border-transport-maritime/25",
  routier: "border-transport-routier/25",
  mobility: "border-transport-mobility/25",
};

export function HomeOfferCard({ offer, index, modeLabel, subscriptionBadge }: HomeOfferCardProps) {
  const departDate = offer.departure_date ? new Date(offer.departure_date) : null;
  const style = getTypeStyle(offer.transport_type);
  const OfferIcon = style.icon;
  const currencySymbol = CURRENCY_SYMBOLS[offer.currency] || offer.currency || "F";
  const isMobility = offer.transport_type === "mobility";
  const isRoutier = offer.transport_type === "routier";
  const linkTo = `/offres/${offer.id}`;
  const borderClass = TYPE_BORDER[offer.transport_type] || "border-transport-voyageur/25";

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
        className={`bg-card border ${borderClass} rounded-xl px-2.5 py-2 flex items-center gap-2 hover:border-primary/30 active:bg-muted/40 transition-all`}
      >
        {/* Icon - colored by type */}
        <div className={`w-7 h-7 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
          <OfferIcon className={`w-3.5 h-3.5 ${style.color}`} />
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
              <span className={`text-[10px] font-semibold ${style.color} ${style.bg} px-1.5 py-0.5 rounded`}>
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
                <span className={`text-[8px] ${style.color} ${style.bg} px-1.5 py-px rounded-full font-medium`}>
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

        {/* Price only - no Réserver button */}
        <div className="flex-shrink-0">
          <div className={`${style.bg} rounded-lg px-2 py-1 text-center`}>
            {isRoutier ? (
              <>
                <span className={`text-[8px] ${style.color}/70 block leading-tight font-semibold`}>À partir de</span>
                <span className={`text-[13px] font-extrabold ${style.color} leading-none whitespace-nowrap`}>
                  {routierMinPrice > 0 ? routierMinPrice.toLocaleString() : "—"}
                </span>
                <span className={`text-[8px] ${style.color}/70 block leading-tight font-semibold`}>FCFA</span>
              </>
            ) : (
              <>
                <span className={`text-[13px] font-extrabold ${style.color} leading-none whitespace-nowrap`}>
                  {offer.price_per_kg?.toLocaleString()}
                </span>
                <span className={`text-[8px] ${style.color}/70 block leading-tight font-semibold`}>
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