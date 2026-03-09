/**
 * RoutierPricingDashboard — Phase 3: Dynamic pricing + fill-rate dashboard
 * Corporate, compact, no emojis
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw,
  ArrowRight, Building2, BarChart3, Scale,
  Package, DollarSign, Activity
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatWeightShort } from "@/lib/routierUtils";

interface CorridorPricing {
  corridor_key: string;
  origin_city: string;
  destination_city: string;
  mission_count: number;
  total_weight_kg: number;
  total_revenue: number;
  avg_price_per_kg: number;
  demand_index: number;
  suggested_price_per_kg: number;
  fill_rate_pct: number;
  trend: "up" | "down" | "stable";
  is_hub_corridor: boolean;
}

export function RoutierPricingDashboard() {
  const [data, setData] = useState<CorridorPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { data: result, error } = await supabase.rpc("get_corridor_pricing");
      if (!error && result) setData(result as CorridorPricing[]);
    } catch (err) {
      console.error("[Pricing] Load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Aggregate stats
  const totalCorridors = data.length;
  const avgDemand = data.length > 0
    ? (data.reduce((s, d) => s + d.demand_index, 0) / data.length)
    : 1;
  const totalWeight = data.reduce((s, d) => s + d.total_weight_kg, 0);
  const totalRevenue = data.reduce((s, d) => s + d.total_revenue, 0);

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "up") return <TrendingUp className="w-3 h-3 text-emerald-600" />;
    if (trend === "down") return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const getDemandColor = (index: number) => {
    if (index >= 1.5) return "text-emerald-600";
    if (index >= 1.2) return "text-amber-600";
    if (index <= 0.7) return "text-red-500";
    return "text-muted-foreground";
  };

  const getDemandLabel = (index: number) => {
    if (index >= 1.5) return "Forte";
    if (index >= 1.2) return "Haute";
    if (index >= 0.8) return "Normale";
    return "Faible";
  };

  const getFillColor = (pct: number) => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-red-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tarification dynamique
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Corridors", value: totalCorridors, icon: Activity, color: "text-primary" },
          { label: "Demande", value: `x${avgDemand.toFixed(1)}`, icon: TrendingUp, color: getDemandColor(avgDemand) },
          { label: "Volume", value: formatWeightShort(totalWeight), icon: Scale, color: "text-muted-foreground" },
          { label: "Potentiel", value: `${(totalRevenue / 1000).toFixed(0)}k`, icon: DollarSign, color: "text-emerald-600" },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center py-2 rounded-md bg-muted/50 border border-border/50">
            <stat.icon className={cn("w-3 h-3 mb-0.5", stat.color)} />
            <span className={cn("font-bold text-xs leading-none", stat.color)}>{stat.value}</span>
            <span className="text-[8px] text-muted-foreground mt-0.5">{stat.label}</span>
          </div>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="py-8 text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Aucune donnée tarifaire</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Les prix dynamiques s'afficheront avec les missions actives</p>
        </div>
      ) : (
        <div className="space-y-1">
          {data.map((corridor, idx) => (
            <motion.div
              key={corridor.corridor_key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card className={cn(
                "overflow-hidden",
                corridor.is_hub_corridor && "border-emerald-300 dark:border-emerald-700"
              )}>
                <CardContent className="p-2.5 space-y-1.5">
                  {/* Route row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {corridor.is_hub_corridor && (
                        <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      )}
                      <span className="text-xs font-bold truncate">{corridor.origin_city}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-xs font-bold truncate">{corridor.destination_city}</span>
                    </div>
                    <TrendIcon trend={corridor.trend} />
                  </div>

                  {/* Fill rate bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full", getFillColor(corridor.fill_rate_pct))}
                        initial={{ width: 0 }}
                        animate={{ width: `${corridor.fill_rate_pct}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-mono w-8 text-right">{corridor.fill_rate_pct}%</span>
                  </div>

                  {/* Metrics row */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Package className="w-2.5 h-2.5" />
                        {corridor.mission_count}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Scale className="w-2.5 h-2.5" />
                        {formatWeightShort(corridor.total_weight_kg)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Demand badge */}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[8px] h-4 px-1.5 font-semibold",
                          corridor.demand_index >= 1.5 && "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
                          corridor.demand_index <= 0.7 && "border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        )}
                      >
                        {getDemandLabel(corridor.demand_index)} x{corridor.demand_index.toFixed(1)}
                      </Badge>
                      {/* Suggested price */}
                      <div className="text-right">
                        <span className="font-black text-xs text-primary">
                          {corridor.suggested_price_per_kg.toLocaleString("fr-FR")}
                        </span>
                        <span className="text-[8px] text-muted-foreground ml-0.5">CFA/kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Price comparison */}
                  {corridor.avg_price_per_kg > 0 && corridor.suggested_price_per_kg !== corridor.avg_price_per_kg && (
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <span>Moy. actuelle: {corridor.avg_price_per_kg.toLocaleString("fr-FR")} CFA/kg</span>
                      {corridor.suggested_price_per_kg > corridor.avg_price_per_kg ? (
                        <span className="text-emerald-600 font-semibold">
                          +{Math.round(((corridor.suggested_price_per_kg - corridor.avg_price_per_kg) / corridor.avg_price_per_kg) * 100)}%
                        </span>
                      ) : (
                        <span className="text-red-500 font-semibold">
                          {Math.round(((corridor.suggested_price_per_kg - corridor.avg_price_per_kg) / corridor.avg_price_per_kg) * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
