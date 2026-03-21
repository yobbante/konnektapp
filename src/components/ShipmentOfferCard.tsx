import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ArrowRight, MapPin, Calendar, Package, Star, Truck, Weight, 
  Clock, Zap, Ship, Plane, Briefcase, Building2, ChevronRight,
  Heart, Scale, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur" | "bagages_international" | "occasionnel";

// Badge is shown separately instead of modifying gpName

interface VehicleInfo {
  name?: string;
  vehicle_type?: string;
  max_weight_kg?: number;
  max_volume_m3?: number;
}

interface ShipmentOfferCardProps {
  id: string;
  gpId?: string;
  origin: string;
  destination: string;
  originCountry?: string;
  destinationCountry?: string;
  date: string;
  arrivalDate?: string;
  price: number;
  currency?: string;
  transportType: TransportType;
  gpName: string;
  gpRating: number;
  status: "available" | "pending" | "complete";
  delay?: number;
  availableCapacity?: number;
  vehicle?: VehicleInfo | null;
  isVerified?: boolean;
}

const transportConfig: Record<TransportType, { icon: any; label: string; color: string; gradient: string }> = {
  express: { icon: Zap, label: "Express", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", gradient: "from-orange-500 to-amber-500" },
  routier: { icon: Truck, label: "Routier", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", gradient: "from-blue-500 to-cyan-500" },
  maritime: { icon: Ship, label: "Maritime", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20", gradient: "from-cyan-500 to-teal-500" },
  aerien: { icon: Plane, label: "Aérien", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", gradient: "from-purple-500 to-pink-500" },
  voyageur: { icon: Briefcase, label: "GP", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", gradient: "from-emerald-500 to-green-500" },
  bagages_international: { icon: Plane, label: "GP via Bagages", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", gradient: "from-indigo-500 to-violet-500" },
  occasionnel: { icon: Plane, label: "GP Occasionnel", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", gradient: "from-amber-500 to-orange-500" },
};

export function ShipmentOfferCard({
  id,
  gpId,
  origin,
  destination,
  originCountry,
  destinationCountry,
  date,
  arrivalDate,
  price,
  currency = "FCFA",
  transportType,
  gpName,
  gpRating,
  status,
  delay = 0,
  availableCapacity,
  vehicle,
  isVerified,
}: ShipmentOfferCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const config = transportConfig[transportType] || transportConfig.voyageur;
  const TypeIcon = config.icon;
  const currencySymbol = getCurrencySymbol(currency);
  
  const formattedDate = (() => {
    try {
      return format(new Date(date), "EEE d MMM", { locale: fr });
    } catch {
      return date;
    }
  })();

  const formattedArrival = arrivalDate ? (() => {
    try {
      return format(new Date(arrivalDate), "d MMM", { locale: fr });
    } catch {
      return null;
    }
  })() : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative"
    >
      <Link to={`/offres/${id}`}>
        <div className={cn(
          "relative rounded-2xl bg-card overflow-hidden",
          "border border-border/50 hover:border-primary/30",
          "shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500"
        )}>
          {/* Decorative gradient top bar */}
          <div className={cn(
            "h-1.5 w-full bg-gradient-to-r",
            config.gradient
          )} />

          {/* Content */}
          <div className="p-4 sm:p-5">
            {/* Top Row: Type Badge & Capacity */}
            <div className="flex items-center justify-between mb-4">
              <Badge className={cn("gap-1.5 text-xs font-semibold border", config.color)}>
                <TypeIcon className="w-3.5 h-3.5" />
                {config.label}
              </Badge>
              <div className="flex items-center gap-2">
                {availableCapacity && (
                  <Badge variant="outline" className="text-xs bg-background/50 backdrop-blur-sm">
                    <Scale className="w-3 h-3 mr-1 text-primary" />
                    {availableCapacity}kg
                  </Badge>
                )}
              </div>
            </div>

            {/* Route Visualization - Enhanced */}
            <div className="relative mb-4">
              <div className="flex items-center justify-between">
                {/* Origin */}
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30" />
                      <motion.div 
                        className="absolute inset-0 w-4 h-4 rounded-full bg-primary/30"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-base">{origin}</p>
                      {originCountry && (
                        <p className="text-xs text-muted-foreground">{originCountry}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Connection line */}
                <div className="flex-shrink-0 flex flex-col items-center mx-3 py-2">
                  <div className="flex items-center gap-1">
                    <motion.div 
                      className="flex items-center"
                      animate={{ x: isHovered ? [0, 4, 0] : 0 }}
                      transition={{ duration: 0.8, repeat: isHovered ? Infinity : 0 }}
                    >
                      <div className="w-10 h-[2px] bg-gradient-to-r from-primary/60 via-primary to-accent/60 rounded-full" />
                      <Plane className="w-4 h-4 text-primary -mx-1" />
                      <div className="w-10 h-[2px] bg-gradient-to-r from-accent/60 via-accent to-accent rounded-full" />
                    </motion.div>
                  </div>
                </div>
                
                {/* Destination */}
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2.5">
                    <div>
                      <p className="font-bold text-foreground text-base">{destination}</p>
                      {destinationCountry && (
                        <p className="text-xs text-muted-foreground">{destinationCountry}</p>
                      )}
                    </div>
                    <div className="relative">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-accent to-accent/60 shadow-lg shadow-accent/30" />
                      <motion.div 
                        className="absolute inset-0 w-4 h-4 rounded-full bg-accent/30"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Info Row - More prominent */}
            <div className="flex items-center justify-between gap-2 mb-4 p-3 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 rounded-xl border border-border/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Départ</p>
                  <p className="font-semibold text-sm capitalize">{formattedDate}</p>
                </div>
              </div>
              {formattedArrival && (
                <>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Arrivée</p>
                      <p className="font-semibold text-sm">{formattedArrival}</p>
                    </div>
                  </div>
                </>
              )}
              {status === "available" && (
                <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs ml-auto">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Dispo
                </Badge>
              )}
            </div>

            {/* Vehicle Info */}
            {vehicle && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 p-2.5 bg-muted/20 rounded-lg border border-border/30">
                <Truck className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">{vehicle.name || vehicle.vehicle_type}</span>
                {vehicle.max_weight_kg && (
                  <span className="ml-auto text-muted-foreground">Max {vehicle.max_weight_kg}kg</span>
                )}
              </div>
            )}

            {/* Bottom Row: GP Info & Price */}
            <div className="flex items-center justify-between pt-3 border-t border-border/30">
              <Link 
                to={gpId ? `/client/transporteurs/${gpId}` : "#"} 
                onClick={(e) => {
                  e.stopPropagation();
                  if (!gpId) e.preventDefault();
                }}
                className="flex items-center gap-2.5 group/gp hover:bg-muted/50 rounded-lg p-1 -m-1 transition-colors"
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white",
                  "bg-gradient-to-br", config.gradient,
                  "shadow-lg"
                )}>
                  {gpName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground group-hover/gp:text-primary transition-colors">
                      {gpName}
                    </p>
                    {isVerified && (
                      <svg className="w-4 h-4 text-primary fill-current" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {transportType === "occasionnel" && (
                      <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-600 border-amber-500/30 gap-0.5 font-medium">
                        🧳 Occasionnel
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-medium text-muted-foreground">{gpRating.toFixed(1)}</span>
                  </div>
                </div>
              </Link>
              
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">à partir de</p>
                <p className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {price.toLocaleString()}
                  <span className="text-sm font-semibold text-muted-foreground ml-0.5">{currencySymbol}/kg</span>
                </p>
              </div>
            </div>
          </div>

          {/* Hover overlay with CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent pointer-events-none flex items-end justify-center pb-6"
          >
            <Button variant="default" size="lg" className="shadow-xl pointer-events-auto">
              Voir les détails
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}
