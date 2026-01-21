import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Calendar, Package, Star, Truck, Weight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur";

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
  date: string;
  price: number;
  currency?: string;
  transportType: TransportType;
  gpName: string;
  gpRating: number;
  status: "available" | "pending" | "complete";
  delay?: number;
  availableCapacity?: number;
  vehicle?: VehicleInfo | null;
}

const transportLabels: Record<TransportType, string> = {
  express: "Express",
  routier: "Routier",
  maritime: "Maritime",
  aerien: "Aérien",
  voyageur: "Voyageur",
};

export function ShipmentOfferCard({
  id,
  gpId,
  origin,
  destination,
  date,
  price,
  currency = "FCFA",
  transportType,
  gpName,
  gpRating,
  status,
  delay = 0,
  availableCapacity,
  vehicle,
}: ShipmentOfferCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="group relative p-5 rounded-2xl bg-card border border-border shadow-card hover:shadow-lg transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <Badge variant={transportType} className="text-xs">
          {transportLabels[transportType]}
        </Badge>
        <Badge variant={status}>
          {status === "available" ? "Disponible" : status === "pending" ? "En cours" : "Terminé"}
        </Badge>
      </div>

      {/* Route */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <MapPin className="w-4 h-4 text-secondary" />
            {origin}
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 text-right">
          <div className="flex items-center justify-end gap-2 text-foreground font-semibold">
            {destination}
            <MapPin className="w-4 h-4 text-accent" />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {date}
        </div>
        {availableCapacity && (
          <div className="flex items-center gap-1.5">
            <Weight className="w-4 h-4" />
            {availableCapacity} kg dispo
          </div>
        )}
      </div>

      {/* Vehicle Info */}
      {vehicle && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-2 bg-muted/50 rounded-lg">
          <Truck className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">{vehicle.name || vehicle.vehicle_type}</span>
          {vehicle.max_weight_kg && (
            <Badge variant="outline" className="text-xs ml-auto">
              Max {vehicle.max_weight_kg} kg
            </Badge>
          )}
        </div>
      )}

      {/* GP Info & Price */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Link 
          to={gpId ? `/gp/${gpId}` : "#"} 
          onClick={(e) => !gpId && e.preventDefault()}
          className={`flex items-center gap-2 ${gpId ? 'hover:opacity-80 transition-opacity' : ''}`}
        >
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-semibold text-sm">
            {gpName.charAt(0)}
          </div>
          <div>
            <p className={`text-sm font-medium text-foreground ${gpId ? 'hover:text-primary transition-colors' : ''}`}>{gpName}</p>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-secondary fill-secondary" />
              <span className="text-xs text-muted-foreground">{gpRating.toFixed(1)}</span>
            </div>
          </div>
        </Link>
        
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Prix/kg</p>
          <p className="text-lg font-bold text-foreground">
            {price.toLocaleString()} <span className="text-sm font-normal">{currency}</span>
          </p>
        </div>
      </div>

      {/* Action */}
      <Button variant="gold" className="w-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
        Réserver maintenant
      </Button>
    </motion.div>
  );
}
