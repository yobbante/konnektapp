import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Plane, Ship, Truck, Luggage, Star } from "lucide-react";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", XOF: " CFA", XAF: " CFA", MAD: " DH", CAD: "$CA", GNF: " FG",
};

interface HomeOfferCardProps {
  offer: any;
  index: number;
}

const getOfferIcon = (type: string) => {
  if (type === "maritime") return Ship;
  if (type === "routier") return Truck;
  if (type === "aerien") return Plane;
  return Luggage;
};

export function HomeOfferCard({ offer, index }: HomeOfferCardProps) {
  const departDate = offer.departure_date ? new Date(offer.departure_date) : null;
  const OfferIcon = getOfferIcon(offer.transport_type);
  const currencySymbol = CURRENCY_SYMBOLS[offer.currency] || offer.currency || "F";

  return (
    <Link to={`/offres/${offer.id}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02, duration: 0.15 }}
        whileTap={{ scale: 0.98 }}
        className="bg-card border border-border rounded-xl px-2.5 py-2 flex items-center gap-2 hover:border-primary/30 active:bg-muted/40 transition-all"
      >
        {/* Icon */}
        <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
          <OfferIcon className="w-3.5 h-3.5 text-primary" />
        </div>

        {/* Center: route + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-foreground truncate">{offer.origin_city}</span>
            <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/50 flex-shrink-0" />
            <span className="text-xs font-semibold text-foreground truncate">{offer.destination_city}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[9px] text-muted-foreground truncate max-w-[70px]">
              {offer.gp_profiles?.business_name || "GP"}
            </span>
            {offer.gp_profiles?.rating > 0 && (
              <span className="flex items-center gap-px text-[9px] text-amber-600">
                <Star className="w-2 h-2 fill-amber-500" />
                {offer.gp_profiles.rating.toFixed(1)}
              </span>
            )}
            {departDate && (
              <span className="text-[8px] text-muted-foreground bg-muted/50 px-1 py-px rounded-full">
                {departDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {offer.available_capacity > 0 && (
              <span className="text-[8px] text-primary/80 font-medium">
                {offer.available_capacity}kg
              </span>
            )}
          </div>
        </div>

        {/* Price - always visible */}
        <div className="flex-shrink-0 bg-primary/8 rounded-lg px-2 py-1 text-center">
          <span className="text-[13px] font-extrabold text-primary leading-none whitespace-nowrap">
            {offer.price_per_kg?.toLocaleString()}
          </span>
          <span className="text-[8px] text-primary/70 block leading-tight font-semibold">
            {currencySymbol.trim()}/kg
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
