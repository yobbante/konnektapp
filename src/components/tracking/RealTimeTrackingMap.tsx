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
  transportType = "bagages_international"
}: RealTimeTrackingMapProps) {
  // Calculate position based on progress
  const positionX = 10 + progress * 0.8;
  const positionY = 80 - progress * 0.6;
  const TransportIcon = transportType === "bagages_international" ? Plane : Truck;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "En attente",
      accepted: "Accepté",
      collected: "Collecté",
      in_transit: "En transit",
      delivered: "Livré",
    };
    return labels[status] || status;
  };

  return (
    <div className="relative w-full h-40 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 rounded-xl overflow-hidden border">
      {/* Background Pattern */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Decorative grid */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.3"
              className="text-muted-foreground/10"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Route Path */}
        <path
          d="M 10 80 Q 30 60 50 50 Q 70 40 90 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          className="text-primary/30"
        />

        {/* Progress Path */}
        <motion.path
          d="M 10 80 Q 30 60 50 50 Q 70 40 90 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress / 100 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
      </svg>

      {/* Origin Point */}
      <div className="absolute left-[8%] bottom-[15%] flex items-center gap-1">
        <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow" />
        <span className="text-[10px] font-medium bg-white/80 dark:bg-black/50 px-1 rounded">
          {originCity}
        </span>
      </div>

      {/* Destination Point */}
      <div className="absolute right-[8%] top-[15%] flex items-center gap-1">
        <span className="text-[10px] font-medium bg-white/80 dark:bg-black/50 px-1 rounded">
          {destinationCity}
        </span>
        <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow" />
      </div>

      {/* Moving Vehicle Icon */}
      <motion.div
        className="absolute"
        style={{
          left: `${positionX}%`,
          top: `${positionY}%`,
          transform: "translate(-50%, -50%)",
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
      >
        <div className="relative">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
            <TransportIcon className="w-4 h-4 text-primary-foreground" />
          </div>
          {/* Pulse effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/30"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </motion.div>

      {/* Status Badge */}
      <div className="absolute bottom-2 right-2">
        <Badge variant="secondary" className="text-[10px] bg-white/80 dark:bg-black/50">
          {getStatusLabel(currentStatus)}
        </Badge>
      </div>

      {/* Progress Indicator */}
      <div className="absolute bottom-2 left-2">
        <Badge variant="outline" className="text-[10px] bg-white/80 dark:bg-black/50">
          {progress}%
        </Badge>
      </div>
    </div>
  );
}
