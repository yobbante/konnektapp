import { motion } from "framer-motion";
import { Star, Shield, Award, Crown, Zap, Medal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TrustBadgeProps {
  rating: number;
  totalDeliveries: number;
  isVerified: boolean;
}

type TransporterLevel = "bronze" | "argent" | "or" | "elite";

function getTransporterLevel(deliveries: number): { level: TransporterLevel; label: string; icon: typeof Award; color: string; progress: number; nextLevel: number } {
  if (deliveries >= 500) {
    return { 
      level: "elite", 
      label: "Élite", 
      icon: Crown, 
      color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
      progress: 100,
      nextLevel: 500
    };
  }
  if (deliveries >= 100) {
    return { 
      level: "or", 
      label: "Or", 
      icon: Award, 
      color: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white",
      progress: ((deliveries - 100) / 400) * 100,
      nextLevel: 500
    };
  }
  if (deliveries >= 25) {
    return { 
      level: "argent", 
      label: "Argent", 
      icon: Medal, 
      color: "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800",
      progress: ((deliveries - 25) / 75) * 100,
      nextLevel: 100
    };
  }
  return { 
    level: "bronze", 
    label: "Bronze", 
    icon: Zap, 
    color: "bg-gradient-to-r from-amber-600 to-amber-700 text-white",
    progress: (deliveries / 25) * 100,
    nextLevel: 25
  };
}

export function TrustBadge({ rating, totalDeliveries, isVerified }: TrustBadgeProps) {
  const { level, label, icon: LevelIcon, color, progress, nextLevel } = getTransporterLevel(totalDeliveries);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card rounded-2xl p-4 border border-border/50 shadow-card"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground text-sm">Niveau de confiance</h3>
        {isVerified && (
          <Badge variant="success" className="text-[10px]">
            <Shield className="w-3 h-3 mr-1" />
            Vérifié
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Level Badge */}
        <div className={`w-14 h-14 rounded-xl ${color} flex items-center justify-center shadow-lg`}>
          <LevelIcon className="w-7 h-7" />
        </div>

        <div className="flex-1">
          {/* Level & Rating */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-foreground">{label}</span>
            <div className="flex items-center gap-1 text-warning">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-semibold text-sm">{rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-1">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>

          {/* Stats */}
          <p className="text-xs text-muted-foreground">
            {totalDeliveries} livraisons
            {level !== "elite" && (
              <span> • {nextLevel - totalDeliveries} pour niveau suivant</span>
            )}
          </p>
        </div>
      </div>

      {/* Badges */}
      {totalDeliveries >= 10 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
          {totalDeliveries >= 10 && (
            <Badge variant="outline" className="text-[10px]">
              🚀 10+ livraisons
            </Badge>
          )}
          {rating >= 4.5 && (
            <Badge variant="outline" className="text-[10px]">
              ⭐ Top rated
            </Badge>
          )}
          {isVerified && (
            <Badge variant="outline" className="text-[10px]">
              ✅ Fiable
            </Badge>
          )}
        </div>
      )}
    </motion.div>
  );
}
