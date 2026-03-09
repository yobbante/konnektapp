import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Plane, Ship, Car, Luggage, Star, Truck } from "lucide-react";

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

const getTransportLabel = (type: string) => {
  if (type === "maritime") return "Maritime";
  if (type === "routier") return "Routier";
  if (type === "aerien") return "Aérien";
  if (type === "bagages_international" || type === "navette" || type === "bagages_accompagnes") return "GP via Bagages";
  return "GP";
};

export function HomeOfferCard({ offer, index }: HomeOfferCardProps) {
  const departDate = offer.departure_date ? new Date(offer.departure_date) : null;
  const OfferIcon = getOfferIcon(offer.transport_type);
  const currencySymbol = CURRENCY_SYMBOLS[offer.currency] || offer.currency || "F";

  return (
    <Link to={`/offres/${offer.id}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.025, duration: 0.2 }}
        whileTap={{ scale: 0.97 }}
        className="bg-card border border-border rounded-xl p-3 hover:border-primary/30 active:bg-muted/40 transition-all"
      >
        {/* Row 1: Route + Price */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
              <OfferIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[13px] font-semibold text-foreground truncate">{offer.origin_city}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                <span className="text-[13px] font-semibold text-foreground truncate">{offer.destination_city}</span>
              </div>
              <span className="text-[10px] text-muted-foreground truncate block">
                {offer.gp_profiles?.business_name || "GP"}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0 pl-2">
            <span className="text-sm font-extrabold text-primary leading-none tracking-tight whitespace-nowrap">
              {offer.price_per_kg?.toLocaleString()}<span className="text-[10px] font-bold">{currencySymbol}</span>
            </span>
            <span className="text-[9px] text-muted-foreground block leading-tight">/kg</span>
          </div>
        </div>

        {/* Row 2: Metadata badges */}
        <div className="flex items-center gap-1.5 mt-1.5 pl-10 flex-wrap">
          {offer.gp_profiles?.rating > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
              <Star className="w-2.5 h-2.5 fill-amber-500" />
              {offer.gp_profiles.rating.toFixed(1)}
            </span>
          )}
          {departDate && (
            <span className="text-[9px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
              {departDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {offer.available_capacity > 0 && (
            <span className="text-[9px] text-primary bg-primary/8 px-1.5 py-0.5 rounded-full font-medium">
              {offer.available_capacity}kg
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
