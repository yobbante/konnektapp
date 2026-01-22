import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ArrowRight, MapPin, Calendar, Package, Star, Truck, Weight, 
  Clock, Zap, Ship, Plane, Briefcase, Building2, ChevronRight,
  Heart, Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur" | "bagages_international";

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

const transportConfig: Record<TransportType, { icon: any; label: string; color: string }> = {
  express: { icon: Zap, label: "Express", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  routier: { icon: Truck, label: "Routier", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  maritime: { icon: Ship, label: "Maritime", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  aerien: { icon: Plane, label: "Aérien", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  voyageur: { icon: Briefcase, label: "GP", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  bagages_international: { icon: Plane, label: "Bagages Int.", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
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
      return format(new Date(date), "d MMM", { locale: fr });
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
      whileHover={{ y: -4, scale: 1.01 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative"
    >
      <Link to={`/offres/${id}`}>
        <div className={cn(
          "relative p-4 sm:p-5 rounded-2xl bg-card border border-border",
          "shadow-sm hover:shadow-xl transition-all duration-300",
          "overflow-hidden"
        )}>
          {/* Gradient accent on hover */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />

          {/* Top Row: Type Badge & Status */}
          <div className="relative flex items-center justify-between mb-3">
            <Badge className={cn("gap-1.5 text-xs font-medium border", config.color)}>
              <TypeIcon className="w-3 h-3" />
              {config.label}
            </Badge>
            <div className="flex items-center gap-2">
              {availableCapacity && (
                <Badge variant="outline" className="text-xs bg-muted/50">
                  <Weight className="w-3 h-3 mr-1" />
                  {availableCapacity}kg
                </Badge>
              )}
              <Badge 
                variant={status === "available" ? "default" : status === "pending" ? "secondary" : "outline"}
                className="text-xs"
              >
                {status === "available" ? "Dispo" : status === "pending" ? "En cours" : "Terminé"}
              </Badge>
            </div>
          </div>

          {/* Route Visualization */}
          <div className="relative flex items-center gap-2 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/20" />
                <span className="font-semibold text-foreground truncate">{origin}</span>
              </div>
              {originCountry && (
                <p className="text-xs text-muted-foreground ml-4.5 mt-0.5">{originCountry}</p>
              )}
            </div>
            
            <div className="flex-shrink-0 flex items-center gap-1 px-2">
              <div className="w-8 h-px bg-gradient-to-r from-primary/50 to-accent/50" />
              <motion.div
                animate={{ x: isHovered ? 4 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.div>
              <div className="w-8 h-px bg-gradient-to-r from-accent/50 to-accent" />
            </div>
            
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="font-semibold text-foreground truncate">{destination}</span>
                <div className="w-2.5 h-2.5 rounded-full bg-accent ring-4 ring-accent/20" />
              </div>
              {destinationCountry && (
                <p className="text-xs text-muted-foreground mr-4.5 mt-0.5">{destinationCountry}</p>
              )}
            </div>
          </div>

          {/* Date & Time Info */}
          <div className="flex items-center gap-3 mb-4 p-2.5 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-1.5 text-sm">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">{formattedDate}</span>
            </div>
            {formattedArrival && (
              <>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  <span>{formattedArrival}</span>
                </div>
              </>
            )}
          </div>

          {/* Vehicle Info */}
          {vehicle && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 p-2 bg-muted/20 rounded-lg border border-border/50">
              <Truck className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-foreground">{vehicle.name || vehicle.vehicle_type}</span>
              {vehicle.max_weight_kg && (
                <span className="ml-auto text-muted-foreground">Max {vehicle.max_weight_kg}kg</span>
              )}
            </div>
          )}

          {/* Bottom Row: GP Info & Price */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <Link 
              to={gpId ? `/client/transporteurs/${gpId}` : "#"} 
              onClick={(e) => {
                e.stopPropagation();
                if (!gpId) e.preventDefault();
              }}
              className="flex items-center gap-2 group/gp"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-semibold text-sm text-primary">
                {gpName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-foreground group-hover/gp:text-primary transition-colors">
                    {gpName}
                  </p>
                  {isVerified && (
                    <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span className="text-xs text-muted-foreground">{gpRating.toFixed(1)}</span>
                </div>
              </div>
            </Link>
            
            <div className="text-right">
              <p className="text-xs text-muted-foreground">à partir de</p>
              <p className="text-lg font-bold text-primary">
                {price.toLocaleString()}
                <span className="text-sm font-normal ml-0.5">{currencySymbol}/kg</span>
              </p>
            </div>
          </div>

          {/* Hover CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
            className="absolute inset-x-4 bottom-4"
          >
            <Button variant="default" className="w-full shadow-lg">
              Voir les détails
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}
