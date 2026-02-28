/**
 * RoutierMissionsTab - GP views open missions + negotiation
 * Replaces the static "pending orders" view for mission-type routiers
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Scale, Clock, MapPin, Truck, RefreshCw, Zap,
  ChevronDown, DollarSign, MessageCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MissionNegotiationSheet } from "./MissionNegotiationSheet";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface RoutierMissionsTabProps {
  gpId: string;
}

const vehicleEmojis: Record<string, string> = {
  moto: "🏍️", tricycle: "🛺", fourgon: "🚐", camionnette: "🚙",
  camion_3t: "🚚", camion_10t: "🚛", semi_remorque: "🚛",
  plateau: "🚧", frigo: "❄️", porte_conteneur: "📦",
};

const urgencyLabels: Record<string, { label: string; color: string }> = {
  standard: { label: "Standard", color: "bg-muted text-muted-foreground" },
  express: { label: "Express", color: "bg-amber-500/10 text-amber-700" },
  immediate: { label: "Immédiat", color: "bg-destructive/10 text-destructive" },
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

  const loadMissions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("routier_missions")
        .select("*")
        .in("status", ["open", "matching", "negotiating"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error) setMissions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadMissions(); }, [loadMissions]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("routier-missions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "routier_missions" }, () => loadMissions())
      .on("postgres_changes", { event: "*", schema: "public", table: "mission_negotiations" }, () => loadMissions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMissions]);

  const openNegotiation = async (mission: any) => {
    // Check for existing negotiation from this GP
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">🚛 Missions disponibles</h2>
          <p className="text-xs text-muted-foreground">{missions.length} mission{missions.length !== 1 ? "s" : ""} ouverte{missions.length !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => loadMissions(true)} disabled={refreshing}>
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      {missions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Zap className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Aucune mission disponible</h3>
            <p className="text-sm text-muted-foreground">Les nouvelles missions apparaîtront ici automatiquement.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {missions.map(m => {
              const isExpanded = expandedId === m.id;
              const urgency = urgencyLabels[m.urgency] || urgencyLabels.standard;
              const vEmoji = vehicleEmojis[m.vehicle_type_required] || "🚚";

              return (
                <motion.div key={m.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}>
                  <Card className={cn("overflow-hidden cursor-pointer transition-all", isExpanded && "ring-2 ring-primary shadow-lg")}
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}>
                    <CardContent className="p-0">
                      <div className="p-4">
                        {/* Route */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-200" />
                            <span className="font-semibold truncate">{m.origin_city}</span>
                          </div>
                          <div className="flex-1 h-0.5 bg-gradient-to-r from-green-500 to-primary rounded-full" />
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="font-semibold truncate">{m.destination_city}</span>
                            <div className="w-3 h-3 rounded-full bg-primary ring-2 ring-primary/30" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="gap-1">
                              <span>{vEmoji}</span>
                              {m.vehicle_type_required || "Auto"}
                            </Badge>
                            <Badge className={cn("text-xs", urgency.color)}>{urgency.label}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">{(m.client_budget || m.estimated_price)?.toLocaleString()} {m.currency}</span>
                            <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 pb-4 pt-2 border-t bg-muted/30 space-y-3">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Scale className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Poids:</span>
                                  <span className="font-medium">{m.weight_kg} kg</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Fret:</span>
                                  <span className="font-medium">{m.freight_type}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Collecte:</span>
                                  <span className="font-medium">
                                    {format(new Date(m.pickup_date_start), "d MMM", { locale: fr })}
                                  </span>
                                </div>
                              </div>

                              {m.merchandise_description && (
                                <div className="p-3 bg-background rounded-lg text-sm text-muted-foreground">
                                  {m.merchandise_description}
                                </div>
                              )}

                              {m.constraints && m.constraints.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {m.constraints.map((c: string) => (
                                    <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                                  ))}
                                </div>
                              )}

                              <div className="flex gap-2 pt-2">
                                <Button className="flex-1" onClick={(e) => { e.stopPropagation(); openNegotiation(m); }}>
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Répondre / Négocier
                                </Button>
                              </div>
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
