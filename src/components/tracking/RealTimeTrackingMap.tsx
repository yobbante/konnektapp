import { motion } from "framer-motion";
import { Plane, Truck, Package, CheckCircle2 } from "lucide-react";
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

  // Checkpoints along the route
  const checkpoints = [
    { x: 10, y: 80, label: "Départ", completed: progress >= 0 },
    { x: 35, y: 55, label: "Collecté", completed: progress >= 33 },
    { x: 65, y: 35, label: "En transit", completed: progress >= 66 },
    { x: 90, y: 20, label: "Arrivée", completed: progress >= 100 },
  ];

  return (
    <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-border/50 shadow-lg">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      
      {/* Animated Background Pattern */}
      <motion.div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, hsl(var(--primary) / 0.15) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, hsl(var(--secondary) / 0.15) 0%, transparent 50%)`
        }}
        animate={{
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* SVG Map */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Decorative grid */}
        <defs>
          <pattern id="tracking-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.2"
              className="text-muted-foreground/10"
            />
          </pattern>
          <linearGradient id="route-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="progress-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#tracking-grid)" />

        {/* Route Shadow */}
        <path
          d="M 10 80 Q 30 60 50 50 Q 70 40 90 20"
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.1"
        />

        {/* Route Path (Background) */}
        <path
          d="M 10 80 Q 30 60 50 50 Q 70 40 90 20"
          fill="none"
          stroke="url(#route-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="6 4"
        />

        {/* Progress Path (Animated) */}
        <motion.path
          d="M 10 80 Q 30 60 50 50 Q 70 40 90 20"
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress / 100 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />

        {/* Checkpoint Markers */}
        {checkpoints.map((cp, index) => (
          <g key={index}>
            {/* Outer ring */}
            <motion.circle
              cx={cp.x}
              cy={cp.y}
              r="4"
              fill="none"
              stroke={cp.completed ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
              strokeWidth="1"
              opacity={cp.completed ? 0.5 : 0.2}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.15, type: "spring" }}
            />
            {/* Inner dot */}
            <motion.circle
              cx={cp.x}
              cy={cp.y}
              r="2"
              fill={cp.completed ? "hsl(var(--primary))" : "hsl(var(--muted))"}
              stroke="white"
              strokeWidth="0.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.15 + 0.1, type: "spring" }}
            />
          </g>
        ))}
      </svg>

      {/* Origin Label */}
      <motion.div 
        className="absolute left-3 bottom-4 flex items-center gap-1.5"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-primary/30 ring-offset-1 ring-offset-background" />
        <span className="text-[11px] font-medium bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-sm border border-border/50">
          {originCity}
        </span>
      </motion.div>

      {/* Destination Label */}
      <motion.div 
        className="absolute right-3 top-4 flex items-center gap-1.5"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <span className="text-[11px] font-medium bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-sm border border-border/50">
          {destinationCity}
        </span>
        <div className="w-2.5 h-2.5 bg-secondary rounded-full ring-2 ring-secondary/30 ring-offset-1 ring-offset-background" />
      </motion.div>

      {/* Moving Vehicle */}
      <motion.div
        className="absolute"
        style={{
          left: `${10 + progress * 0.8}%`,
          top: `${80 - progress * 0.6}%`,
          transform: "translate(-50%, -50%)",
        }}
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
      >
        <div className="relative">
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-secondary blur-md"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.4, 0.2, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          {/* Icon container */}
          <div className="relative w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg border-2 border-white/50">
            <TransportIcon className="w-4 h-4 text-primary-foreground" />
          </div>
          {/* Trail effect */}
          <motion.div
            className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-1 bg-gradient-to-l from-primary/60 to-transparent rounded-full"
            animate={{
              opacity: [0.8, 0.3, 0.8],
              scaleX: [1, 0.6, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </motion.div>

      {/* Status Badge */}
      <motion.div 
        className="absolute bottom-3 right-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Badge 
          variant="secondary" 
          className={`text-[10px] font-semibold shadow-md border-0 text-white ${getStatusColor(currentStatus)}`}
        >
          {currentStatus === "delivered" && <CheckCircle2 className="w-3 h-3 mr-1" />}
          {getStatusLabel(currentStatus)}
        </Badge>
      </motion.div>

      {/* Progress Bar */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </motion.div>

      {/* Progress Percentage */}
      <motion.div 
        className="absolute bottom-3 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="bg-background/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm border border-border/50">
          <span className="text-[10px] font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {progress}%
          </span>
        </div>
      </motion.div>
    </div>
  );
}