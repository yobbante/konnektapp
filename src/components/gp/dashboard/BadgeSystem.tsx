import { motion } from "framer-motion";
import { Shield, Clock, Scale, Crown, Award, Star, Zap, Medal, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BadgeSystemProps {
  isVerified: boolean;
  rating: number;
  totalDeliveries: number;
  totalVolume: number;
  isPremium?: boolean;
  gpType?: string;
}

interface BadgeInfo {
  id: string;
  label: string;
  description: string;
  icon: typeof Shield;
  color: string;
  bgColor: string;
  earned: boolean;
  progress?: number;
  threshold?: number;
}

function getVolumeUnit(gpType?: string): string {
  switch (gpType) {
    case 'maritime':
    case 'routier':
      return 't';
    case 'aerien':
      return 'm³';
    default:
      return 'kg';
  }
}

function getTransporterLevel(deliveries: number): { 
  level: string; 
  label: string; 
  icon: typeof Award; 
  color: string; 
  progress: number; 
  nextLevel: number;
} {
  if (deliveries >= 500) {
    return { 
      level: "elite", 
      label: "Élite", 
      icon: Crown, 
      color: "from-purple-500 to-pink-500",
      progress: 100,
      nextLevel: 500
    };
  }
  if (deliveries >= 100) {
    return { 
      level: "or", 
      label: "Or", 
      icon: Award, 
      color: "from-yellow-400 to-orange-500",
      progress: ((deliveries - 100) / 400) * 100,
      nextLevel: 500
    };
  }
  if (deliveries >= 25) {
    return { 
      level: "argent", 
      label: "Argent", 
      icon: Medal, 
      color: "from-gray-300 to-gray-400",
      progress: ((deliveries - 25) / 75) * 100,
      nextLevel: 100
    };
  }
  return { 
    level: "bronze", 
    label: "Bronze", 
    icon: Zap, 
    color: "from-amber-600 to-amber-700",
    progress: (deliveries / 25) * 100,
    nextLevel: 25
  };
}

export function BadgeSystem({ 
  isVerified, 
  rating, 
  totalDeliveries, 
  totalVolume,
  isPremium = false,
  gpType
}: BadgeSystemProps) {
  const levelInfo = getTransporterLevel(totalDeliveries);
  const LevelIcon = levelInfo.icon;
  const volumeUnit = getVolumeUnit(gpType);

  // Volume thresholds based on transport type
  const volumeThreshold = gpType === 'maritime' || gpType === 'routier' ? 100 : 1000;
  const volumeEarned = totalVolume >= volumeThreshold;

  const badges: BadgeInfo[] = [
    {
      id: "verified",
      label: "Vérifié",
      description: "Profil complet et validé",
      icon: Shield,
      color: "text-success",
      bgColor: "bg-success/10",
      earned: isVerified,
    },
    {
      id: "reliability",
      label: "Fiabilité",
      description: "Note ≥ 4.5 étoiles",
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary/10",
      earned: rating >= 4.5,
      progress: Math.min((rating / 4.5) * 100, 100),
      threshold: 4.5,
    },
    {
      id: "volume",
      label: "Volume",
      description: `${volumeThreshold}+ ${volumeUnit} transportés`,
      icon: Scale,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      earned: volumeEarned,
      progress: Math.min((totalVolume / volumeThreshold) * 100, 100),
      threshold: volumeThreshold,
    },
    {
      id: "premium",
      label: "Premium",
      description: "Partenaire de confiance Konnekt",
      icon: Crown,
      color: "text-warning",
      bgColor: "bg-warning/10",
      earned: isPremium,
    },
  ];

  const earnedBadges = badges.filter(b => b.earned);
  const pendingBadges = badges.filter(b => !b.earned);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-card"
    >
      {/* Header with Level */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground text-sm">Badges & Niveau</h3>
          <div className="flex items-center gap-1 text-warning">
            <Star className="w-4 h-4 fill-current" />
            <span className="font-semibold text-sm">{rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Level Display */}
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${levelInfo.color} flex items-center justify-center shadow-lg`}>
            <LevelIcon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-foreground">{levelInfo.label}</span>
              <Badge variant="outline" className="text-[10px]">
                {totalDeliveries} missions
              </Badge>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(levelInfo.progress, 100)}%` }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="h-full bg-primary rounded-full"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {levelInfo.level !== "elite" && (
                <span>{levelInfo.nextLevel - totalDeliveries} missions pour niveau suivant</span>
              )}
              {levelInfo.level === "elite" && <span>Niveau maximum atteint</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">Badges obtenus</p>
          <div className="flex flex-wrap gap-2">
            {earnedBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <motion.div
                  key={badge.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${badge.bgColor}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${badge.color}`} />
                  <span className={`text-xs font-medium ${badge.color}`}>{badge.label}</span>
                  <CheckCircle className={`w-3 h-3 ${badge.color}`} />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Badges */}
      {pendingBadges.length > 0 && (
        <div className="px-4 pb-4 pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">À débloquer</p>
          <div className="space-y-2">
            {pendingBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground">{badge.label}</p>
                    <p className="text-[10px] text-muted-foreground/70">{badge.description}</p>
                    {badge.progress !== undefined && (
                      <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-muted-foreground/30 rounded-full"
                          style={{ width: `${badge.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
