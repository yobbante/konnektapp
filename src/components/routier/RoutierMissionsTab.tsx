/**
 * RoutierMissionsTab - Cocolis-style mission marketplace
 * Cards: route + price + size badge + freight type + urgency
 * Mini-map collapsible at top
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Scale, Clock, MapPin, Truck, RefreshCw, Zap,
  ChevronDown, DollarSign, MessageCircle, Map as MapIcon, ChevronUp,
  Calendar, ArrowRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MissionNegotiationSheet } from "./MissionNegotiationSheet";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getSizeFromWeight, formatWeightShort, freightTypeLabels } from "@/lib/routierUtils";

interface RoutierMissionsTabProps {
  gpId: string;
}

const urgencyConfig: Record<string, { label: string; color: string; bg: string }> = {
  standard: { label: "Standard", color: "text-muted-foreground", bg: "bg-muted" },
  express: { label: "Express", color: "text-amber-700", bg: "bg-amber-100 dark:bg-amber-900/30" },
  immediate: { label: "Urgent", color: "text-red-700", bg: "bg-red-100 dark:bg-red-900/30" },
};

export function RoutierMissionsTab({ gpId }: RoutierMissionsTabProps) {
  const { toast } = useToast();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMission, setSelectedMission] = useState<any | null>(null);
  const [selectedNegotiation, setSelectedNegotiation] = useState<any | null>(null);
  const [negotiationOpen, setNegotiationOpen] = useState(false);
  const [searchOrigin, setSearchOrigin] = useState("");
  const [searchDest, setSearchDest] = useState("");
  const [showMap, setShowMap] = useState(false);

  const loadMissions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("routier_missions")
        .select("*")
        .in("status", ["open", "matching", "negotiating"])
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error) setMissions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadMissions(); }, [loadMissions]);

  useEffect(() => {
    const channel = supabase
      .channel("routier-missions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "routier_missions" }, () => loadMissions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMissions]);

  const filteredMissions = missions.filter(m => {
    if (searchOrigin && !m.origin_city?.toLowerCase().includes(searchOrigin.toLowerCase())) return false;
    if (searchDest && !m.destination_city?.toLowerCase().includes(searchDest.toLowerCase())) return false;
    return true;
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search bar - Cocolis style */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" />
            <Input
              placeholder="Ville de départ"
              value={searchOrigin}
              onChange={e => setSearchOrigin(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary" />
            <Input
              placeholder="Ville d'arrivée"
              value={searchDest}
              onChange={e => setSearchDest(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Mini-map toggle */}
      <button
        onClick={() => setShowMap(!showMap)}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MapIcon className="w-3.5 h-3.5" />
        {showMap ? "Masquer la carte" : "Voir sur la carte"}
        {showMap ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 200, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="rounded-xl overflow-hidden border border-border"
          >
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=-18,4,16,22&layer=mapnik`}
              className="w-full h-[200px] border-0"
              loading="lazy"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filteredMissions.length} mission{filteredMissions.length !== 1 ? "s" : ""} disponible{filteredMissions.length !== 1 ? "s" : ""}
        </p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadMissions(true)} disabled={refreshing}>
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Missions list - Cocolis style */}
      {filteredMissions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Zap className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <h3 className="font-semibold mb-1 text-sm">Aucune mission disponible</h3>
            <p className="text-xs text-muted-foreground">
              {searchOrigin || searchDest ? "Modifiez vos critères de recherche" : "Les nouvelles missions apparaîtront ici"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredMissions.map((m, idx) => {
              const size = getSizeFromWeight(m.weight_kg || 0);
              const freight = freightTypeLabels[m.freight_type] || { label: m.freight_type, emoji: "📦" };
              const urgency = urgencyConfig[m.urgency] || urgencyConfig.standard;
              const isExpanded = expandedId === m.id;
              const price = m.client_budget || m.estimated_price || 0;

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card
                    className={cn(
                      "overflow-hidden cursor-pointer transition-all hover:shadow-md",
                      isExpanded && "ring-2 ring-primary shadow-lg"
                    )}
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  >
                    <CardContent className="p-0">
                      <div className="p-3">
                        {/* Top row: route + price */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            {/* Route */}
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <span className="text-sm font-semibold truncate">{m.origin_city}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                              <span className="text-sm font-semibold truncate">{m.destination_city}</span>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-primary">{price.toLocaleString("fr-FR")} <span className="text-xs">{m.currency || "CFA"}</span></p>
                          </div>
                        </div>

                        {/* Bottom row: date + badges */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {m.pickup_date_start ? (
                              <span>
                                {format(new Date(m.pickup_date_start), "d MMM", { locale: fr })}
                                {m.pickup_date_end && m.pickup_date_end !== m.pickup_date_start && (
                                  <> — {format(new Date(m.pickup_date_end), "d MMM", { locale: fr })}</>
                                )}
                              </span>
                            ) : (
                              <span>{formatDistanceToNow(new Date(m.created_at), { locale: fr, addSuffix: true })}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Freight emoji */}
                            <span className="text-sm" title={freight.label}>{freight.emoji}</span>

                            {/* Urgency badge */}
                            {m.urgency !== "standard" && (
                              <Badge className={cn("text-[9px] h-4 px-1.5 font-semibold", urgency.bg, urgency.color)}>
                                {urgency.label}
                              </Badge>
                            )}

                            {/* Size badge - Cocolis style */}
                            <Badge className={cn("text-[10px] h-5 px-2 font-bold", size.bg, size.color)}>
                              {size.label}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-2 border-t bg-muted/30 space-y-3">
                              <div className="grid grid-cols-3 gap-2">
                                <div className="text-center p-2 rounded-lg bg-background">
                                  <Scale className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
                                  <p className="text-xs font-bold">{formatWeightShort(m.weight_kg || 0)}</p>
                                  <p className="text-[9px] text-muted-foreground">Poids</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-background">
                                  <Package className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
                                  <p className="text-xs font-bold">{freight.label}</p>
                                  <p className="text-[9px] text-muted-foreground">Type</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-background">
                                  <Truck className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
                                  <p className="text-xs font-bold">{m.vehicle_type_required?.replace(/_/g, " ") || "Auto"}</p>
                                  <p className="text-[9px] text-muted-foreground">Véhicule</p>
                                </div>
                              </div>

                              {m.merchandise_description && (
                                <div className="p-2.5 bg-background rounded-lg text-xs text-muted-foreground">
                                  {m.merchandise_description}
                                </div>
                              )}

                              {m.constraints && m.constraints.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {m.constraints.map((c: string) => (
                                    <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                                  ))}
                                </div>
                              )}

                              {m.delivery_to_door && (
                                <Badge variant="secondary" className="text-[10px]">🏠 Livraison à domicile</Badge>
                              )}

                              <Button className="w-full" onClick={(e) => { e.stopPropagation(); openNegotiation(m); }}>
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Proposer un prix
                              </Button>
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
        onSuccess={() => loadMissions()}
      />
    </div>
  );
}
