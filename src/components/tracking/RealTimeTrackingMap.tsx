import { motion } from "framer-motion";
import { Plane, Truck, CheckCircle2, MapPin } from "lucide-react";
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
      arrived: "Arrivé",
      delivered: "Livré"
    };
    return labels[status] || status;
  };
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "from-amber-500 to-amber-600",
      accepted: "from-blue-500 to-blue-600",
      collected: "from-indigo-500 to-indigo-600",
      in_transit: "from-primary to-blue-600",
      arrived: "from-purple-500 to-purple-600",
      delivered: "from-green-500 to-green-600"
    };
    return colors[status] || "from-muted to-muted";
  };

  const getBgColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-500",
      accepted: "bg-blue-500",
      collected: "bg-indigo-500",
      in_transit: "bg-primary",
      arrived: "bg-purple-500",
      delivered: "bg-green-500"
    };
    return colors[status] || "bg-muted";
  };

  // Checkpoints along the route
  const checkpoints = [
    { position: 0, label: "Départ", threshold: 0 },
    { position: 33, label: "Collecté", threshold: 25 },
    { position: 66, label: "En transit", threshold: 50 },
    { position: 100, label: "Arrivée", threshold: 90 },
  ];

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
      {/* Map background with gradient overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="relative p-6">
        {/* Cities Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold text-sm text-foreground">{originCity}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{destinationCity}</span>
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
        </div>

        {/* Route with checkpoints */}
        <div className="relative h-16 mb-6">
          {/* Base track */}
          <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 bg-muted/50 rounded-full" />
          
          {/* Progress track */}
          <motion.div 
            className={`absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r ${getStatusColor(currentStatus)}`}
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          {/* Checkpoints */}
          {checkpoints.map((cp, index) => {
            const isActive = progress >= cp.threshold;
            return (
              <div
                key={index}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${cp.position}%` }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: isActive ? 1 : 0.8 }}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isActive 
                      ? `${getBgColor(currentStatus)} border-white shadow-lg` 
                      : "bg-muted border-muted-foreground/30"
                  }`}
                >
                  {isActive && cp.position === 100 && (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  )}
                </motion.div>
                <span className={`absolute top-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap ${
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                }`}>
                  {cp.label}
                </span>
              </div>
            );
          })}

          {/* Moving vehicle icon */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${Math.min(progress, 95)}%` }}
            animate={{ 
              y: [-8, -12, -8],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className={`relative p-2 rounded-full bg-gradient-to-br ${getStatusColor(currentStatus)} shadow-lg`}>
              <TransportIcon className="w-4 h-4 text-white" />
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 rounded-full bg-white/30"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </motion.div>
        </div>

        {/* Status and Progress */}
        <div className="flex items-center justify-between">
          <Badge className={`bg-gradient-to-r ${getStatusColor(currentStatus)} text-white border-0`}>
            {getStatusLabel(currentStatus)}
          </Badge>
          
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Progress bar at bottom */}
        <div className="mt-4 h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${getStatusColor(currentStatus)}`}
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
