/**
 * MaritimeMissionsTab - Mission marketplace for maritime transitaires
 * Shows freight_requests with freight_mode='maritime' or 'sea'
 * Cards: route + volume + maritime type + budget + urgency
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ship, Scale, Clock, MapPin, RefreshCw, Zap,
  ChevronDown, DollarSign, MessageCircle, ChevronUp,
  Calendar, ArrowRight, Anchor, Container, Package
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MaritimeNegotiationSheet } from "./MaritimeNegotiationSheet";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MaritimeMissionsTabProps {
  gpId: string;
}

const maritimeTypeConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  lcl: { label: "Groupage LCL", icon: "📦", color: "text-blue-700", bg: "bg-blue-100 dark:bg-blue-900/30" },
  fcl: { label: "Conteneur FCL", icon: "🏗️", color: "text-indigo-700", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  roro: { label: "RoRo Véhicule", icon: "🚗", color: "text-emerald-700", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  bulk: { label: "Vrac", icon: "📋", color: "text-amber-700", bg: "bg-amber-100 dark:bg-amber-900/30" },
};

const urgencyConfig: Record<string, { label: string; color: string; bg: string }> = {
  standard: { label: "Standard", color: "text-muted-foreground", bg: "bg-muted" },
  normal: { label: "Standard", color: "text-muted-foreground", bg: "bg-muted" },
  urgent: { label: "Urgent", color: "text-red-700", bg: "bg-red-100 dark:bg-red-900/30" },
  express: { label: "Express", color: "text-amber-700", bg: "bg-amber-100 dark:bg-amber-900/30" },
};

export function MaritimeMissionsTab({ gpId }: MaritimeMissionsTabProps) {
  const { toast } = useToast();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMission, setSelectedMission] = useState<any | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [negotiationOpen, setNegotiationOpen] = useState(false);
  const [searchOrigin, setSearchOrigin] = useState("");
  const [searchDest, setSearchDest] = useState("");

  const loadMissions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("freight_requests")
        .select("*")
        .in("freight_mode", ["maritime", "sea"])
        .in("status", ["open", "has_responses", "pending"])
        .order("created_at", { ascending: false })
        .limit(50);

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
      .channel("maritime-missions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "freight_requests" }, () => loadMissions())
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
      .from("freight_proposals")
      .select("*")
      .eq("request_id", mission.id)
      .eq("provider_gp_id", gpId)
      .maybeSingle();

    setSelectedMission(mission);
    setSelectedProposal(existing || null);
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
      {/* Search bar */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Anchor className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" />
            <Input
              placeholder="Port d'origine"
              value={searchOrigin}
              onChange={e => setSearchOrigin(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 relative">
            <Anchor className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary" />
            <Input
              placeholder="Port d'arrivée"
              value={searchDest}
              onChange={e => setSearchDest(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filteredMissions.length} demande{filteredMissions.length !== 1 ? "s" : ""} maritime{filteredMissions.length !== 1 ? "s" : ""}
        </p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadMissions(true)} disabled={refreshing}>
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Missions list */}
      {filteredMissions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Ship className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <h3 className="font-semibold mb-1 text-sm">Aucune demande maritime</h3>
            <p className="text-xs text-muted-foreground">
              {searchOrigin || searchDest ? "Modifiez vos critères de recherche" : "Les nouvelles demandes apparaîtront ici"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredMissions.map((m, idx) => {
              const mType = maritimeTypeConfig[m.merchandise_type] || maritimeTypeConfig.lcl;
              const urgency = urgencyConfig[m.urgency_level] || urgencyConfig.standard;
              const isExpanded = expandedId === m.id;
              const budget = m.declared_value || 0;

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
                        {/* Top: route + budget */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <span className="text-sm font-semibold truncate">
                                {m.origin_port_or_airport || m.origin_city}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                              <span className="text-sm font-semibold truncate">
                                {m.destination_port_or_airport || m.destination_city}
                              </span>
                            </div>
                          </div>
                          {budget > 0 && (
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold text-primary">
                                {budget.toLocaleString("fr-FR")} <span className="text-xs">{m.currency || "XOF"}</span>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Bottom: date + badges */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {m.pickup_date_from ? (
                              <span>{format(new Date(m.pickup_date_from), "d MMM", { locale: fr })}</span>
                            ) : (
                              <span>{formatDistanceToNow(new Date(m.created_at), { locale: fr, addSuffix: true })}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge className={cn("text-[9px] h-4 px-1.5 font-semibold", mType.bg, mType.color)}>
                              {mType.label}
                            </Badge>
                            {m.urgency_level && m.urgency_level !== "standard" && m.urgency_level !== "normal" && (
                              <Badge className={cn("text-[9px] h-4 px-1.5 font-semibold", urgency.bg, urgency.color)}>
                                {urgency.label}
                              </Badge>
                            )}
                            {m.volume_m3 && (
                              <Badge variant="outline" className="text-[10px] h-5 px-2 font-bold">
                                {m.volume_m3} m³
                              </Badge>
                            )}
                            {m.weight_kg && (
                              <Badge variant="outline" className="text-[10px] h-5 px-2 font-bold">
                                {m.weight_kg} kg
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded */}
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
                                  <Package className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
                                  <p className="text-xs font-bold">{m.volume_m3 || "—"} m³</p>
                                  <p className="text-[9px] text-muted-foreground">Volume</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-background">
                                  <Scale className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
                                  <p className="text-xs font-bold">{m.weight_kg || "—"} kg</p>
                                  <p className="text-[9px] text-muted-foreground">Poids</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-background">
                                  <Ship className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
                                  <p className="text-xs font-bold">{mType.label}</p>
                                  <p className="text-[9px] text-muted-foreground">Type</p>
                                </div>
                              </div>

                              {m.merchandise_description && (
                                <div className="p-2.5 bg-background rounded-lg text-xs text-muted-foreground">
                                  {m.merchandise_description}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1.5">
                                {m.customs_required && <Badge variant="secondary" className="text-[10px]">Dédouanement</Badge>}
                                {m.insurance_required && <Badge variant="secondary" className="text-[10px]">Assurance</Badge>}
                                {m.is_fragile && <Badge variant="secondary" className="text-[10px]">Fragile</Badge>}
                                {m.is_vehicle && <Badge variant="secondary" className="text-[10px]">Véhicule</Badge>}
                              </div>

                              {m.is_vehicle && (
                                <div className="p-2.5 bg-background rounded-lg text-xs space-y-1">
                                  {m.vehicle_make && <p><span className="text-muted-foreground">Marque:</span> {m.vehicle_make} {m.vehicle_model}</p>}
                                  {m.vehicle_year && <p><span className="text-muted-foreground">Année:</span> {m.vehicle_year}</p>}
                                  <p><span className="text-muted-foreground">État:</span> {m.vehicle_running ? "Roulant" : "Non roulant"}</p>
                                </div>
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

      <MaritimeNegotiationSheet
        open={negotiationOpen}
        onOpenChange={setNegotiationOpen}
        request={selectedMission}
        proposal={selectedProposal}
        gpId={gpId}
        onSuccess={() => loadMissions()}
      />
    </div>
  );
}
