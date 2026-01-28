import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

type VehicleType = "plane" | "truck" | "ship" | "car" | "package";

interface TransportLoaderProps {
  message?: string;
  vehicle?: VehicleType;
  autoRotate?: boolean;
  size?: "sm" | "md" | "lg";
}

// SVG Icons for vehicles
const PlaneIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>
);

const TruckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
    <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
  </svg>
);

const ShipIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
    <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
    <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
    <path d="M12 10V5"/>
  </svg>
);

const CarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
    <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/>
    <path d="M5 17H3v-6l2-5h12l2 5v6h-2M5 17h10"/>
    <path d="M9 5v6M15 5v6"/>
  </svg>
);

const PackageIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
    <path d="m12.89 1.45 8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4a2 2 0 0 1-1.1-1.8V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z"/>
    <path d="M2.32 6.16 12 11l9.68-4.84M12 22.76V11"/>
  </svg>
);

const vehicles: VehicleType[] = ["plane", "truck", "ship", "car", "package"];

const vehicleConfig: Record<VehicleType, { icon: typeof PlaneIcon; color: string; label: string }> = {
  plane: { icon: PlaneIcon, color: "text-blue-500", label: "Transport aérien..." },
  truck: { icon: TruckIcon, color: "text-orange-500", label: "Transport routier..." },
  ship: { icon: ShipIcon, color: "text-cyan-500", label: "Transport maritime..." },
  car: { icon: CarIcon, color: "text-green-500", label: "Livraison express..." },
  package: { icon: PackageIcon, color: "text-primary", label: "Préparation..." },
};

const sizeConfig = {
  sm: { container: "w-12 h-12", icon: "w-6 h-6", text: "text-xs" },
  md: { container: "w-20 h-20", icon: "w-10 h-10", text: "text-sm" },
  lg: { container: "w-28 h-28", icon: "w-14 h-14", text: "text-base" },
};

export function TransportLoader({ 
  message, 
  vehicle, 
  autoRotate = true,
  size = "md" 
}: TransportLoaderProps) {
  const [currentVehicle, setCurrentVehicle] = useState<VehicleType>(vehicle || "package");

  useEffect(() => {
    if (autoRotate && !vehicle) {
      const interval = setInterval(() => {
        setCurrentVehicle((prev) => {
          const currentIndex = vehicles.indexOf(prev);
          return vehicles[(currentIndex + 1) % vehicles.length];
        });
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [autoRotate, vehicle]);

  const config = vehicleConfig[currentVehicle];
  const sizes = sizeConfig[size];
  const VehicleIcon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Animated Vehicle Container */}
      <div className="relative">
        {/* Background Ring */}
        <motion.div
          className={`${sizes.container} rounded-full border-4 border-muted`}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Vehicle Icon */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentVehicle}
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 180, opacity: 0 }}
            transition={{ duration: 0.4, ease: "backOut" }}
            className={`absolute inset-0 flex items-center justify-center ${config.color}`}
          >
            <VehicleIcon className={sizes.icon} />
          </motion.div>
        </AnimatePresence>

        {/* Floating Dots */}
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-secondary"
          animate={{ y: [-2, 2, -2], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-primary"
          animate={{ y: [2, -2, 2], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      </div>

      {/* Loading Text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={message || config.label}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className={`${sizes.text} text-muted-foreground font-medium`}
        >
          {message || config.label}
        </motion.p>
      </AnimatePresence>

      {/* Progress Bar */}
      <motion.div
        className="w-24 h-1 bg-muted rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-secondary to-primary rounded-full"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}

// Full page loader variant
export function TransportPageLoader({ message, vehicle }: TransportLoaderProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <TransportLoader message={message} vehicle={vehicle} size="lg" />
    </div>
  );
}

// Button/inline loader variant
export function TransportButtonLoader({ vehicle = "package" }: { vehicle?: VehicleType }) {
  return (
    <TransportLoader vehicle={vehicle} autoRotate={false} size="sm" />
  );
}
