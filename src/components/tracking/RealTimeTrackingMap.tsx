import { motion } from "framer-motion";
import { Plane, Truck, CheckCircle2 } from "lucide-react";
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-500",
      accepted: "bg-blue-500",
      collected: "bg-indigo-500",
      in_transit: "bg-primary",
      delivered: "bg-green-500",
    };
    return colors[status] || "bg-muted";
  };

  return (
    <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-border/50 shadow-lg">
      {/* Map Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80')`,
        }}
      />
      
      {/* Dark overlay for better contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
      
      {/* Animated scan line effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent"
        animate={{
          y: ['-100%', '200%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ height: '50%' }}
      />

      {/* Route line overlay */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="route-line-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" />
          </linearGradient>
        </defs>
        
        {/* Dotted route path */}
        <path
          d="M 15 75 Q 35 55 50 50 Q 65 45 85 25"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.4"
        />
        
        {/* Animated progress line */}
        <motion.path
          d="M 15 75 Q 35 55 50 50 Q 65 45 85 25"
          fill="none"
          stroke="url(#route-line-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress / 100 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>

      {/* Origin marker */}
      <motion.div 
        className="absolute left-[12%] bottom-[20%] flex items-center gap-2"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative">
          <div className="w-4 h-4 bg-primary rounded-full ring-4 ring-primary/30 shadow-lg" />
          <motion.div
            className="absolute inset-0 rounded-full bg-primary"
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <span className="text-xs font-semibold text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md shadow">
          {originCity}
        </span>
      </motion.div>

      {/* Destination marker */}
      <motion.div 
        className="absolute right-[12%] top-[18%] flex items-center gap-2"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span className="text-xs font-semibold text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md shadow">
          {destinationCity}
        </span>
        <div className="relative">
          <div className="w-4 h-4 bg-secondary rounded-full ring-4 ring-secondary/30 shadow-lg" />
          <motion.div
            className="absolute inset-0 rounded-full bg-secondary"
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
        </div>
      </motion.div>

      {/* Moving vehicle */}
      <motion.div
        className="absolute z-10"
        style={{
          left: `${15 + progress * 0.7}%`,
          top: `${75 - progress * 0.5}%`,
          transform: "translate(-50%, -50%)",
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
      >
        <div className="relative">
          {/* Glow */}
          <motion.div
            className="absolute inset-0 rounded-full bg-white blur-md"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          {/* Icon */}
          <div className="relative w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-xl border-2 border-white/80">
            <TransportIcon className="w-5 h-5 text-white" />
          </div>
        </div>
      </motion.div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          {/* Status */}
          <Badge 
            className={`text-[11px] font-semibold border-0 text-white shadow ${getStatusColor(currentStatus)}`}
          >
            {currentStatus === "delivered" && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {getStatusLabel(currentStatus)}
          </Badge>
          
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-bold text-white">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}