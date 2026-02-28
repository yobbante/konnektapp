import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Plane, Ship, Car, Luggage, Star } from "lucide-react";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", XOF: " CFA", XAF: " CFA", MAD: " DH", CAD: "$CA", GNF: " FG",
};

interface HomeOfferCardProps {
  offer: any;
  index: number;
}

const getOfferIcon = (type: string) => {
  if (type === "maritime") return Ship;
  if (type === "routier") return Car;
  if (type === "aerien") return Plane;
  return Luggage;
};

export function HomeOfferCard({ offer, index }: HomeOfferCardProps) {
  const departDate = offer.departure_date ? new Date(offer.departure_date) : null;
  const OfferIcon = getOfferIcon(offer.transport_type);

  return (
    <Link to={`/offres/${offer.id}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        whileTap={{ scale: 0.98 }}
        className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 hover:border-primary/30 transition-all"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <OfferIcon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-sm font-bold text-foreground truncate">{offer.origin_city}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-bold text-foreground truncate">{offer.destination_city}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground truncate max-w-[90px]">
              {offer.gp_profiles?.business_name || "GP"}
            </span>
            {offer.gp_profiles?.rating && (
              <span className="flex items-center gap-0.5 text-[11px] text-amber-500">
                <Star className="w-2.5 h-2.5 fill-amber-500" />
                {offer.gp_profiles.rating.toFixed(1)}
              </span>
            )}
            {departDate && (
              <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                {departDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {offer.available_capacity > 0 && (
              <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full font-medium">
                {offer.available_capacity} kg
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0 pl-1">
          <span className="text-lg font-extrabold text-primary leading-none">
            {offer.price_per_kg?.toLocaleString()}{CURRENCY_SYMBOLS[offer.currency] || offer.currency || "F"}
          </span>
          <span className="text-[10px] text-muted-foreground block leading-tight">/kg</span>
        </div>
      </motion.div>
    </Link>
  );
}
