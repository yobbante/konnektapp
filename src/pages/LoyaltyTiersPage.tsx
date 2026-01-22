import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Medal, Crown, Gem, Diamond, Gift, Star,
  TrendingUp, Check, ChevronRight, Sparkles, Calculator,
  Target, Zap, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useClientLoyalty, LoyaltyBadge } from "@/components/loyalty/LoyaltySystem";

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

const tierIcons: Record<string, React.ElementType> = {
  medal: Medal,
  crown: Crown,
  gem: Gem,
  diamond: Diamond,
};

export default function LoyaltyTiersPage() {
  const { loyalty, currentTier, nextTier, allTiers, loading, getProgressToNextTier } = useClientLoyalty();
  
  // Calculator state
  const [simulatedOrders, setSimulatedOrders] = useState(0);
  const [simulatedSpent, setSimulatedSpent] = useState(0);

  useEffect(() => {
    if (loyalty) {
      setSimulatedOrders(loyalty.total_orders);
      setSimulatedSpent(loyalty.total_spent);
    }
  }, [loyalty]);

  // Calculate which tier would be reached with simulated values
  const getSimulatedTier = () => {
    if (!allTiers.length) return null;
    
    let achievedTier = allTiers[0];
    for (const tier of allTiers) {
      if (simulatedOrders >= tier.min_orders && simulatedSpent >= tier.min_spent) {
        achievedTier = tier;
      } else {
        break;
      }
    }
    return achievedTier;
  };

  const simulatedTier = getSimulatedTier();
  const progress = getProgressToNextTier();

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-safe">
        <MobileHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      <div className="px-4 py-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/client/dashboard" className="w-10 h-10 flex items-center justify-center rounded-full bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Programme de fidélité</h1>
            <p className="text-sm text-muted-foreground">Niveaux & avantages</p>
          </div>
        </div>

        {/* Current Status Card */}
        {loyalty && currentTier && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${currentTier.badge_color}20`, color: currentTier.badge_color }}
                  >
                    {(() => {
                      const Icon = tierIcons[currentTier.badge_icon] || Medal;
                      return <Icon className="w-7 h-7" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg" style={{ color: currentTier.badge_color }}>
                      Niveau {currentTier.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Membre depuis {new Date(loyalty.joined_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  {currentTier.discount_percent > 0 && (
                    <Badge variant="default" className="text-lg font-bold">
                      -{currentTier.discount_percent}%
                    </Badge>
                  )}
                </div>

                {/* Progress */}
                {nextTier && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        Vers {nextTier.name}
                      </span>
                      <span className="font-semibold">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="p-2 bg-background/50 rounded-lg text-center">
                        <p className="font-semibold text-foreground">{loyalty.total_orders} / {nextTier.min_orders}</p>
                        <p>Commandes</p>
                      </div>
                      <div className="p-2 bg-background/50 rounded-lg text-center">
                        <p className="font-semibold text-foreground">{(loyalty.total_spent / 1000).toFixed(0)}k / {(nextTier.min_spent / 1000).toFixed(0)}k</p>
                        <p>FCFA dépensés</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* All Tiers */}
        <div className="mb-8">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Tous les niveaux
          </h2>
          
          <div className="space-y-3">
            {allTiers.map((tier, index) => {
              const Icon = tierIcons[tier.badge_icon] || Medal;
              const isCurrentTier = currentTier?.id === tier.id;
              const isAchieved = loyalty ? loyalty.total_orders >= tier.min_orders && loyalty.total_spent >= tier.min_spent : false;
              
              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`transition-all ${isCurrentTier ? 'ring-2 ring-primary' : ''} ${isAchieved ? 'bg-card' : 'bg-muted/30'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div 
                          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isAchieved ? '' : 'grayscale opacity-50'
                          }`}
                          style={{ backgroundColor: `${tier.badge_color}20`, color: tier.badge_color }}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold" style={{ color: isAchieved ? tier.badge_color : 'inherit' }}>
                              {tier.name}
                            </p>
                            {isCurrentTier && (
                              <Badge variant="default" className="text-xs">Actuel</Badge>
                            )}
                            {isAchieved && !isCurrentTier && (
                              <Check className="w-4 h-4 text-success" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                            <span>{tier.min_orders}+ commandes</span>
                            <span>•</span>
                            <span>{(tier.min_spent / 1000).toFixed(0)}k+ FCFA</span>
                            {tier.discount_percent > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-primary font-medium">-{tier.discount_percent}%</span>
                              </>
                            )}
                          </div>
                          
                          {/* Perks */}
                          <div className="flex flex-wrap gap-1">
                            {tier.perks?.slice(0, 3).map((perk, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {perk}
                              </Badge>
                            ))}
                            {tier.perks && tier.perks.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{tier.perks.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Progression Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Simulateur de progression
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Simulez votre progression en ajustant vos statistiques
              </p>

              {/* Orders Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">Nombre de commandes</Label>
                  <span className="text-sm font-semibold">{simulatedOrders}</span>
                </div>
                <Slider
                  value={[simulatedOrders]}
                  onValueChange={([v]) => setSimulatedOrders(v)}
                  max={100}
                  step={1}
                  className="py-2"
                />
              </div>

              {/* Spent Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">Montant dépensé (FCFA)</Label>
                  <span className="text-sm font-semibold">{(simulatedSpent / 1000).toFixed(0)}k</span>
                </div>
                <Slider
                  value={[simulatedSpent]}
                  onValueChange={([v]) => setSimulatedSpent(v)}
                  max={5000000}
                  step={50000}
                  className="py-2"
                />
              </div>

              {/* Result */}
              {simulatedTier && (
                <div 
                  className="p-4 rounded-xl text-center"
                  style={{ backgroundColor: `${simulatedTier.badge_color}10` }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {(() => {
                      const Icon = tierIcons[simulatedTier.badge_icon] || Medal;
                      return (
                        <Icon 
                          className="w-8 h-8"
                          style={{ color: simulatedTier.badge_color }}
                        />
                      );
                    })()}
                    <span 
                      className="font-bold text-xl"
                      style={{ color: simulatedTier.badge_color }}
                    >
                      {simulatedTier.name}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {simulatedTier.discount_percent > 0 
                      ? `Réduction de ${simulatedTier.discount_percent}% sur vos commandes`
                      : "Niveau de base"
                    }
                  </p>
                  {currentTier && simulatedTier.id !== currentTier.id && (
                    <Badge 
                      className="mt-2"
                      variant={allTiers.findIndex(t => t.id === simulatedTier.id) > allTiers.findIndex(t => t.id === currentTier.id) ? "default" : "secondary"}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      {allTiers.findIndex(t => t.id === simulatedTier.id) > allTiers.findIndex(t => t.id === currentTier.id)
                        ? "Niveau supérieur !"
                        : "Niveau actuel plus élevé"
                      }
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Benefits Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <Card className="bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-warning" />
                Comment ça marche ?
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Passez des commandes</strong> et accumulez des points automatiquement (1 FCFA = 1 point)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Montez de niveau</strong> en atteignant les seuils de commandes et de dépenses
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Profitez des réductions</strong> automatiques sur toutes vos commandes !
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <MobileNav />
    </div>
  );
}
