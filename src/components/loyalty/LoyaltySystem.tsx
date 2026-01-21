import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Medal, Crown, Gem, Diamond, Gift, Star, TrendingUp, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LoyaltyTier {
  id: string;
  name: string;
  min_orders: number;
  min_spent: number;
  discount_percent: number;
  badge_icon: string;
  badge_color: string;
  perks: string[];
}

interface ClientLoyalty {
  id: string;
  user_id: string;
  current_tier_id: string | null;
  total_orders: number;
  total_spent: number;
  total_points: number;
  points_redeemed: number;
  joined_at: string;
}

const tierIcons: Record<string, React.ElementType> = {
  medal: Medal,
  crown: Crown,
  gem: Gem,
  diamond: Diamond,
};

export function useClientLoyalty() {
  const [loyalty, setLoyalty] = useState<ClientLoyalty | null>(null);
  const [currentTier, setCurrentTier] = useState<LoyaltyTier | null>(null);
  const [nextTier, setNextTier] = useState<LoyaltyTier | null>(null);
  const [allTiers, setAllTiers] = useState<LoyaltyTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load all tiers
      const { data: tiers } = await supabase
        .from("loyalty_tiers")
        .select("*")
        .order("min_orders", { ascending: true });

      if (tiers) {
        setAllTiers(tiers);
      }

      // Load user loyalty
      const { data: loyaltyData, error } = await supabase
        .from("client_loyalty")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (loyaltyData) {
        setLoyalty(loyaltyData);

        // Find current tier
        const current = tiers?.find(t => t.id === loyaltyData.current_tier_id);
        setCurrentTier(current || tiers?.[0] || null);

        // Find next tier
        if (tiers && current) {
          const currentIndex = tiers.findIndex(t => t.id === current.id);
          if (currentIndex < tiers.length - 1) {
            setNextTier(tiers[currentIndex + 1]);
          }
        }
      } else if (!error || error.code === "PGRST116") {
        // No loyalty record yet, use default tier
        setCurrentTier(tiers?.[0] || null);
        setNextTier(tiers?.[1] || null);
        setLoyalty({
          id: "",
          user_id: user.id,
          current_tier_id: null,
          total_orders: 0,
          total_spent: 0,
          total_points: 0,
          points_redeemed: 0,
          joined_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error loading loyalty data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressToNextTier = () => {
    if (!loyalty || !nextTier) return 100;
    
    const ordersProgress = Math.min(100, (loyalty.total_orders / nextTier.min_orders) * 100);
    const spentProgress = Math.min(100, (loyalty.total_spent / nextTier.min_spent) * 100);
    
    return Math.min(ordersProgress, spentProgress);
  };

  return {
    loyalty,
    currentTier,
    nextTier,
    allTiers,
    loading,
    getProgressToNextTier,
    refresh: loadLoyaltyData,
  };
}

interface LoyaltyBadgeProps {
  tier: LoyaltyTier | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function LoyaltyBadge({ tier, size = "md", showLabel = true }: LoyaltyBadgeProps) {
  if (!tier) return null;

  const Icon = tierIcons[tier.badge_icon] || Medal;
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center`}
        style={{ backgroundColor: `${tier.badge_color}20`, color: tier.badge_color }}
      >
        <Icon className={size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5"} />
      </div>
      {showLabel && (
        <span 
          className="font-medium text-sm"
          style={{ color: tier.badge_color }}
        >
          {tier.name}
        </span>
      )}
    </div>
  );
}

interface LoyaltyCardProps {
  className?: string;
}

export function LoyaltyCard({ className = "" }: LoyaltyCardProps) {
  const { loyalty, currentTier, nextTier, loading, getProgressToNextTier } = useClientLoyalty();

  if (loading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardContent className="p-4">
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!loyalty || !currentTier) return null;

  const progress = getProgressToNextTier();
  const Icon = tierIcons[currentTier.badge_icon] || Medal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            Programme de fidélité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current tier */}
          <div 
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ backgroundColor: `${currentTier.badge_color}10` }}
          >
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${currentTier.badge_color}20`, color: currentTier.badge_color }}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold" style={{ color: currentTier.badge_color }}>
                Niveau {currentTier.name}
              </p>
              {currentTier.discount_percent > 0 && (
                <p className="text-sm text-muted-foreground">
                  {currentTier.discount_percent}% de réduction sur vos commandes
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-lg font-bold text-foreground">{loyalty.total_orders}</p>
              <p className="text-xs text-muted-foreground">Commandes</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-lg font-bold text-foreground">{loyalty.total_points}</p>
              <p className="text-xs text-muted-foreground">Points</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-lg font-bold text-foreground">
                {(loyalty.total_spent / 1000).toFixed(0)}k
              </p>
              <p className="text-xs text-muted-foreground">FCFA dépensés</p>
            </div>
          </div>

          {/* Progress to next tier */}
          {nextTier && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Prochain niveau: {nextTier.name}</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{loyalty.total_orders}/{nextTier.min_orders} commandes</span>
                <span>{(loyalty.total_spent / 1000).toFixed(0)}k/{(nextTier.min_spent / 1000).toFixed(0)}k FCFA</span>
              </div>
            </div>
          )}

          {/* Perks */}
          <div className="space-y-1">
            <p className="text-sm font-medium">Vos avantages :</p>
            <div className="flex flex-wrap gap-1">
              {currentTier.perks?.map((perk, i) => (
                <Badge key={i} variant="outline" className="text-xs gap-1">
                  <Check className="w-3 h-3 text-success" />
                  {perk}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface LoyaltyTiersDisplayProps {
  className?: string;
}

export function LoyaltyTiersDisplay({ className = "" }: LoyaltyTiersDisplayProps) {
  const { allTiers, currentTier, loading } = useClientLoyalty();

  if (loading || allTiers.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium">Niveaux de fidélité</h3>
      <div className="grid gap-2">
        {allTiers.map((tier, index) => {
          const Icon = tierIcons[tier.badge_icon] || Medal;
          const isCurrent = tier.id === currentTier?.id;
          const isUnlocked = currentTier && allTiers.findIndex(t => t.id === currentTier.id) >= index;

          return (
            <div
              key={tier.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isCurrent 
                  ? "border-primary bg-primary/5" 
                  : isUnlocked 
                    ? "border-border bg-muted/30" 
                    : "border-border/50 bg-muted/10 opacity-60"
              }`}
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: isUnlocked ? `${tier.badge_color}20` : 'hsl(var(--muted))',
                  color: isUnlocked ? tier.badge_color : 'hsl(var(--muted-foreground))'
                }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{tier.name}</p>
                  {isCurrent && (
                    <Badge variant="default" className="text-[10px] h-4">Actuel</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tier.min_orders}+ commandes • {(tier.min_spent / 1000).toFixed(0)}k+ FCFA
                </p>
              </div>
              {tier.discount_percent > 0 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ 
                    backgroundColor: isUnlocked ? `${tier.badge_color}20` : undefined,
                    color: isUnlocked ? tier.badge_color : undefined 
                  }}
                >
                  -{tier.discount_percent}%
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
