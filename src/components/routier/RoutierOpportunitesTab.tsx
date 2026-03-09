/**
 * RoutierOpportunitesTab — Corridor opportunities with hub badges + smart departure countdown
 * Corporate, compact, no emojis
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Package, Scale, Calendar,
  RefreshCw, ChevronDown, ChevronUp,
  MessageCircle, Truck, ArrowRight, Clock,
  Building2, Timer
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns";
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
  is_hub_corridor: boolean;
  smart_departure_at: string | null;
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
  const [now, setNow] = useState(new Date());

  // Tick every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

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

  const getFillRate = (count: number) => {
    if (count >= 5) return { label: "Optimal", pct: 90 };
    if (count >= 3) return { label: "Rentable", pct: 70 };
    if (count >= 2) return { label: "Viable", pct: 50 };
    return { label: "En cours", pct: 25 };
  };

  const getCountdown = (departureAt: string | null) => {
    if (!departureAt) return null;
    const departure = new Date(departureAt);
    const minutesLeft = differenceInMinutes(departure, now);
    if (minutesLeft <= 0) return { label: "Départ imminent", urgent: true };
    if (minutesLeft < 60) return { label: `${minutesLeft} min`, urgent: true };
    const hours = Math.floor(minutesLeft / 60);
    const mins = minutesLeft % 60;
    return { label: `${hours}h${mins > 0 ? String(mins).padStart(2, "0") : ""}`, urgent: hours < 2 };
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
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {corridors.length} corridor{corridors.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => loadCorridors(true)} disabled={refreshing}>
          <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
        </Button>
      </div>

      {corridors.length === 0 ? (
        <div className="py-8 text-center">
          <Truck className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Aucun corridor actif</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Les regroupements apparaîtront avec les demandes</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence>
            {corridors.map((corridor, idx) => {
              const fill = getFillRate(corridor.mission_count);
              const sizeInfo = getSizeFromWeight(corridor.total_weight_kg);
              const isExpanded = expandedCorridor === corridor.corridor_key;
              const countdown = getCountdown(corridor.smart_departure_at);

              return (
                <motion.div
                  key={corridor.corridor_key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card
                    className={cn(
                      "overflow-hidden cursor-pointer transition-all",
                      isExpanded && "ring-1 ring-primary shadow-md",
                      corridor.is_hub_corridor && "border-emerald-300 dark:border-emerald-700"
                    )}
                    onClick={() => toggleCorridor(corridor)}
                  >
                    <CardContent className="p-0">
                      <div className="p-2.5">
                        {/* Hub badge + countdown row */}
                        {(corridor.is_hub_corridor || countdown) && (
                          <div className="flex items-center justify-between mb-1">
                            {corridor.is_hub_corridor && (
                              <Badge variant="outline" className="text-[8px] h-4 px-1.5 gap-0.5 border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20">
                                <Building2 className="w-2.5 h-2.5" />
                                Hub
                              </Badge>
                            )}
                            {countdown && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[8px] h-4 px-1.5 gap-0.5 ml-auto",
                                  countdown.urgent
                                    ? "border-amber-300 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20"
                                    : "border-border text-muted-foreground"
                                )}
                              >
                                <Timer className="w-2.5 h-2.5" />
                                {countdown.label}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Route + Revenue */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-xs font-bold truncate">{corridor.origin_city}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-xs font-bold truncate">{corridor.destination_city}</span>
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          </div>
                          <span className="text-sm font-black text-emerald-600 shrink-0">
                            {corridor.total_estimated_revenue.toLocaleString("fr-FR")}
                            <span className="text-[9px] font-semibold ml-0.5">CFA</span>
                          </span>
                        </div>

                        {/* Fill bar */}
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-emerald-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${fill.pct}%` }}
                              transition={{ duration: 0.6 }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground w-12 text-right">{fill.label}</span>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center gap-0.5">
                              <Package className="w-2.5 h-2.5" />
                              {corridor.mission_count}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Scale className="w-2.5 h-2.5" />
                              {formatWeightShort(corridor.total_weight_kg)}
                            </span>
                            {corridor.earliest_pickup && (
                              <span className="flex items-center gap-0.5">
                                <Calendar className="w-2.5 h-2.5" />
                                {format(new Date(corridor.earliest_pickup), "d MMM", { locale: fr })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-bold">{sizeInfo.label}</Badge>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded missions */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-2.5 pb-2.5 pt-1.5 border-t bg-muted/30 space-y-1.5">
                              {/* Smart departure info */}
                              {countdown && (
                                <div className={cn(
                                  "flex items-center gap-2 p-1.5 rounded text-[10px]",
                                  countdown.urgent
                                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  <Timer className="w-3 h-3 shrink-0" />
                                  <span>Départ dans <strong>{countdown.label}</strong> — des colis peuvent encore rejoindre ce corridor</span>
                                </div>
                              )}

                              {loadingMissions ? (
                                <div className="flex items-center justify-center py-4">
                                  <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
                                </div>
                              ) : (
                                corridorMissions.map((m) => {
                                  const price = m.client_budget || m.estimated_price || 0;
                                  return (
                                    <div
                                      key={m.id}
                                      className="flex items-center justify-between p-2 rounded bg-background border border-border/50"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <span className="text-[11px] font-medium">
                                          {m.freight_type} · {formatWeightShort(m.weight_kg || 0)}
                                        </span>
                                        {m.merchandise_description && (
                                          <p className="text-[9px] text-muted-foreground truncate">{m.merchandise_description}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[11px] font-bold text-primary">{price.toLocaleString("fr-FR")}</span>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-6 text-[9px] px-1.5"
                                          onClick={(e) => { e.stopPropagation(); openNegotiation(m); }}
                                        >
                                          <MessageCircle className="w-2.5 h-2.5 mr-0.5" />
                                          Offre
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}

                              {corridorMissions.length > 1 && (
                                <Button
                                  size="sm"
                                  className="w-full h-7 text-[11px] gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (corridorMissions.length > 0) openNegotiation(corridorMissions[0]);
                                  }}
                                >
                                  <Truck className="w-3 h-3" />
                                  Prendre le corridor ({corridorMissions.length} colis)
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
