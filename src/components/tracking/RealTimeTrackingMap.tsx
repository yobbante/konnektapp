import { motion } from "framer-motion";
import { MapPin, Truck, Navigation, Plane, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RealTimeTrackingMapProps {
  originCity: string;
  destinationCity: string;
  currentStatus: string;
  progress: number; // 0-100
  transportType?: string;
}

export function RealTimeTrackingMap({
  originCity,
  destinationCity,
  currentStatus,
  progress,
  transportType = "bagages_international",
}: RealTimeTrackingMapProps) {
  // Calculate position based on progress
  const positionX = 10 + (progress * 0.8);
  const positionY = 80 - (progress * 0.6);

  const TransportIcon = transportType === "bagages_international" ? Plane : Truck;

  return (
    <div className="relative h-64 bg-gradient-to-br from-primary/5 via-muted/50 to-accent/5 rounded-xl overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary/30" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Route Path */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="50%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--success))" />
          </linearGradient>
        </defs>
        
        {/* Static path */}
        <path 
          d="M 10 80 Q 30 60 50 50 T 90 20"
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="0.3"
          strokeDasharray="2,2"
          opacity="0.3"
        />
        
        {/* Animated progress path */}
        <motion.path 
          d="M 10 80 Q 30 60 50 50 T 90 20"
          fill="none"
          stroke="url(#routeGradient)"
          strokeWidth="0.8"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress / 100 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>

      {/* Origin Marker */}
      <motion.div 
        className="absolute bottom-16 left-6"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <MapPin className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-primary" />
        </div>
        <p className="text-xs font-medium text-center mt-1 bg-background/80 px-2 py-0.5 rounded">
          {originCity}
        </p>
      </motion.div>

      {/* Current Position (Package) */}
      <motion.div 
        className="absolute"
        style={{
          left: `${positionX}%`,
          bottom: `${positionY}%`,
        }}
        animate={{ 
          y: [0, -4, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div className="relative">
          {/* Pulse animation */}
          <motion.div 
            className="absolute inset-0 rounded-full bg-accent"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-xl relative z-10 border-2 border-background">
            <TransportIcon className="w-5 h-5 text-accent-foreground" />
          </div>
        </div>
      </motion.div>

      {/* Destination Marker */}
      <motion.div 
        className="absolute top-8 right-6"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="relative">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
            currentStatus === "delivered" ? "bg-success" : "bg-muted border-2 border-dashed border-muted-foreground"
          }`}>
            {currentStatus === "delivered" ? (
              <Package className="w-4 h-4 text-success-foreground" />
            ) : (
              <Navigation className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
        <p className="text-xs font-medium text-center mt-1 bg-background/80 px-2 py-0.5 rounded">
          {destinationCity}
        </p>
      </motion.div>

      {/* Status Badge */}
      <div className="absolute top-3 left-3">
        <Badge variant="secondary" className="gap-1 text-xs">
          <div className={`w-2 h-2 rounded-full ${
            currentStatus === "delivered" ? "bg-success" :
            currentStatus === "in_transit" ? "bg-accent animate-pulse" :
            "bg-warning"
          }`} />
          {currentStatus === "pending" && "En attente"}
          {currentStatus === "accepted" && "Accepté"}
          {currentStatus === "collected" && "Collecté"}
          {currentStatus === "in_transit" && "En transit"}
          {currentStatus === "delivered" && "Livré"}
        </Badge>
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-3 left-3 right-3">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary via-accent to-success rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-1">
          {Math.round(progress)}% du trajet effectué
        </p>
      </div>
    </div>
  );
}
