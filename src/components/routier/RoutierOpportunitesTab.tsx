/**
 * RoutierOpportunitesTab — Corridor opportunities (Matching Logistique Intelligent)
 * Groups open missions by corridor and shows estimated revenue to transporters
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, MapPin, Package, Scale, Calendar,
  RefreshCw, Zap, ArrowRight, ChevronDown, ChevronUp,
  MessageCircle, Truck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getSizeFromWeight, formatWeightShort } from "@/lib/routierUtils";
import { MissionNegotiationSheet } from "./MissionNegotiationSheet";

interface RoutierOpportunitesTabProps {
  gpId: string;
}

interface CorridorOpportunity {
  corridor_key: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  mission_count: number;
  total_weight_kg: number;
  total_estimated_revenue: number;
  earliest_pickup: string;
  latest_pickup: string;
  mission_ids: string[];
}

export function RoutierOpportunitesTab({ gpId }: RoutierOpportunitesTabProps) {
  const [corridors, setCorridors] = useState<CorridorOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCorridor, setExpandedCorridor] = useState<string | null>(null);
  const [corridorMissions, setCorridorMissions] = useState<any[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [selectedMission, setSelectedMission] = useState<any | null>(null);
  const [selectedNegotiation, setSelectedNegotiation] = useState<any | null>(null);
  const [negotiationOpen, setNegotiationOpen] = useState(false);

  const loadCorridors = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase.rpc("get_corridor_opportunities");
      if (!error && data) {
        setCorridors(data as CorridorOpportunity[]);
      }
    } catch (err) {
      console.error("[Opportunités] Load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCorridors(); }, [loadCorridors]);

  const loadCorridorMissions = async (missionIds: string[]) => {
    setLoadingMissions(true);
    try {
      const { data } = await supabase
        .from("routier_missions")
        .select("*")
        .in("id", missionIds)
        .order("created_at", { ascending: false });
      setCorridorMissions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMissions(false);
    }
  };

  const toggleCorridor = (corridor: CorridorOpportunity) => {
    if (expandedCorridor === corridor.corridor_key) {
      setExpandedCorridor(null);
      setCorridorMissions([]);
    } else {
      setExpandedCorridor(corridor.corridor_key);
      loadCorridorMissions(corridor.mission_ids);
    }
  };

  const openNegotiation = async (mission: any) => {
    const { data: existing } = await supabase
      .from("mission_negotiations")
      .select("*")
      .eq("mission_id", mission.id)
      .eq("gp_id", gpId)
      .maybeSingle();
    setSelectedMission(mission);
    setSelectedNegotiation(existing || null);
    setNegotiationOpen(true);
  };

  // Fill rate indicator
  const getFillRate = (count: number) => {
    if (count >= 5) return { label: "Très rentable", color: "text-emerald-700", bg: "bg-emerald-100 dark:bg-emerald-900/30", pct: 90 };
    if (count >= 3) return { label: "Rentable", color: "text-blue-700", bg: "bg-blue-100 dark:bg-blue-900/30", pct: 70 };
    if (count >= 2) return { label: "Intéressant", color: "text-amber-700", bg: "bg-amber-100 dark:bg-amber-900/30", pct: 50 };
    return { label: "En formation", color: "text-muted-foreground", bg: "bg-muted", pct: 25 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header info */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20 p-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-bold">Matching Intelligent</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Corridors avec plusieurs colis regroupés. Plus le corridor est rempli, plus le trajet est rentable.
        </p>
      </div>

      {/* Corridor count + refresh */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {corridors.length} corridor{corridors.length !== 1 ? "s" : ""} actif{corridors.length !== 1 ? "s" : ""}
        </p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadCorridors(true)} disabled={refreshing}>
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
        </Button>
      </div>

      {corridors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Zap className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <h3 className="font-semibold mb-1 text-sm">Aucune opportunité pour le moment</h3>
            <p className="text-xs text-muted-foreground">
              Les corridors apparaîtront quand des colis seront regroupés sur un même trajet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {corridors.map((corridor, idx) => {
              const fill = getFillRate(corridor.mission_count);
              const sizeInfo = getSizeFromWeight(corridor.total_weight_kg);
              const isExpanded = expandedCorridor === corridor.corridor_key;

              return (
                <motion.div
                  key={corridor.corridor_key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card
                    className={cn(
                      "overflow-hidden cursor-pointer transition-all hover:shadow-md",
                      isExpanded && "ring-2 ring-emerald-500 shadow-lg"
                    )}
                    onClick={() => toggleCorridor(corridor)}
                  >
                    <CardContent className="p-0">
                      <div className="p-3">
                        {/* Route header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="text-sm font-bold truncate">{corridor.origin_city}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                              <span className="text-sm font-bold truncate">{corridor.destination_city}</span>
                            </div>
                          </div>

                          {/* Revenue */}
                          <div className="text-right shrink-0">
                            <p className="text-lg font-black text-emerald-600">
                              {corridor.total_estimated_revenue.toLocaleString("fr-FR")}
                              <span className="text-[10px] font-semibold ml-0.5">CFA</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">revenu estimé</p>
                          </div>
                        </div>

                        {/* Fill rate bar */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={cn("text-[9px] h-4 px-1.5 font-semibold", fill.bg, fill.color)}>
                              {fill.label}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{fill.pct}% rempli</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${fill.pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Package className="w-3 h-3" />
                              {corridor.mission_count} colis
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Scale className="w-3 h-3" />
                              {formatWeightShort(corridor.total_weight_kg)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge className={cn("text-[10px] h-5 px-2 font-bold", sizeInfo.bg, sizeInfo.color)}>
                              {sizeInfo.label}
                            </Badge>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {corridor.earliest_pickup && (
                            <span>
                              {format(new Date(corridor.earliest_pickup), "d MMM", { locale: fr })}
                              {corridor.latest_pickup && corridor.latest_pickup !== corridor.earliest_pickup && (
                                <> — {format(new Date(corridor.latest_pickup), "d MMM", { locale: fr })}</>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded: individual missions */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-2 border-t bg-muted/30 space-y-2">
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Colis sur ce corridor
                              </p>

                              {loadingMissions ? (
                                <div className="flex items-center justify-center py-6">
                                  <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                                </div>
                              ) : (
                                corridorMissions.map((m) => {
                                  const price = m.client_budget || m.estimated_price || 0;
                                  return (
                                    <div
                                      key={m.id}
                                      className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border/50"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <Package className="w-3 h-3 text-muted-foreground" />
                                          <span className="text-xs font-medium truncate">
                                            {m.freight_type} · {formatWeightShort(m.weight_kg || 0)}
                                          </span>
                                        </div>
                                        {m.merchandise_description && (
                                          <p className="text-[10px] text-muted-foreground truncate mt-0.5 ml-4">
                                            {m.merchandise_description}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-bold text-primary">
                                          {price.toLocaleString("fr-FR")} CFA
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-[10px] px-2"
                                          onClick={(e) => { e.stopPropagation(); openNegotiation(m); }}
                                        >
                                          <MessageCircle className="w-3 h-3 mr-1" />
                                          Négocier
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}

                              {/* CTA: Take entire corridor */}
                              {corridorMissions.length > 1 && (
                                <Button
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Take first mission to start negotiation for the corridor
                                    if (corridorMissions.length > 0) openNegotiation(corridorMissions[0]);
                                  }}
                                >
                                  <Truck className="w-4 h-4" />
                                  Prendre tout le corridor ({corridorMissions.length} colis)
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <MissionNegotiationSheet
        open={negotiationOpen}
        onOpenChange={setNegotiationOpen}
        mission={selectedMission}
        negotiation={selectedNegotiation}
        role="gp"
        gpId={gpId}
        onSuccess={() => loadCorridors()}
      />
    </div>
  );
}
