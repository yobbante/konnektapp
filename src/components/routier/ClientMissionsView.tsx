/**
 * ClientMissionsView - Client sees their routier missions + negotiations
 * Shows mission status, active negotiations, and accepted missions
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Clock, MapPin, Package, Scale, MessageCircle,
  Check, X, RefreshCw, ChevronRight, Zap
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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "En recherche", color: "bg-amber-500/10 text-amber-700", icon: Clock },
  matching: { label: "Matching...", color: "bg-blue-500/10 text-blue-700", icon: Zap },
  negotiating: { label: "En négociation", color: "bg-purple-500/10 text-purple-700", icon: MessageCircle },
  accepted: { label: "Acceptée", color: "bg-green-500/10 text-green-700", icon: Check },
  in_progress: { label: "En cours", color: "bg-blue-500/10 text-blue-700", icon: Truck },
  completed: { label: "Terminée", color: "bg-green-500/10 text-green-700", icon: Check },
  cancelled: { label: "Annulée", color: "bg-destructive/10 text-destructive", icon: X },
  expired: { label: "Expirée", color: "bg-muted text-muted-foreground", icon: Clock },
};

export function ClientMissionsView() {
  const { toast } = useToast();
  const [missions, setMissions] = useState<any[]>([]);
  const [negotiations, setNegotiations] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<any | null>(null);
  const [selectedNegotiation, setSelectedNegotiation] = useState<any | null>(null);
  const [negotiationOpen, setNegotiationOpen] = useState(false);

  const loadMissions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("routier_missions")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setMissions(data || []);

      // Load negotiations for each mission
      if (data && data.length > 0) {
        const missionIds = data.map(m => m.id);
        const { data: negs } = await supabase
          .from("mission_negotiations")
          .select("*")
          .in("mission_id", missionIds)
          .order("created_at", { ascending: false });

        if (negs) {
          const grouped: Record<string, any[]> = {};
          negs.forEach(n => {
            if (!grouped[n.mission_id]) grouped[n.mission_id] = [];
            grouped[n.mission_id].push(n);
          });
          setNegotiations(grouped);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMissions(); }, [loadMissions]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("client-missions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "routier_missions" }, () => loadMissions())
      .on("postgres_changes", { event: "*", schema: "public", table: "mission_negotiations" }, () => loadMissions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMissions]);

  const openNegotiation = (mission: any, negotiation: any) => {
    setSelectedMission(mission);
    setSelectedNegotiation(negotiation);
    setNegotiationOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Truck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Aucune mission routier</h3>
          <p className="text-sm text-muted-foreground">
            Demandez une mission pour trouver un transporteur.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        🚛 Missions routier ({missions.length})
      </h3>

      <AnimatePresence>
        {missions.map(m => {
          const config = statusConfig[m.status] || statusConfig.open;
          const StatusIcon = config.icon;
          const missionNegs = negotiations[m.id] || [];
          const pendingNeg = missionNegs.find(n => n.status === "counter_proposed" && n.gp_counter_price && !n.client_responded_at);

          return (
            <motion.div key={m.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={cn(
                "overflow-hidden transition-all",
                pendingNeg && "ring-2 ring-primary shadow-md"
              )}>
                <CardContent className="p-4">
                  {/* Route */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="font-semibold text-sm">{m.origin_city}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-semibold text-sm">{m.destination_city}</span>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs gap-1", config.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(m.created_at), "d MMM", { locale: fr })}
                      </span>
                    </div>
                    <span className="font-bold text-sm">
                      {(m.client_budget || m.estimated_price)?.toLocaleString()} {m.currency}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Scale className="w-3 h-3" />{m.weight_kg} kg</span>
                    <span className="flex items-center gap-1"><Package className="w-3 h-3" />{m.freight_type}</span>
                    {m.vehicle_type_required && <span>🚚 {m.vehicle_type_required}</span>}
                  </div>

                  {/* Negotiations */}
                  {missionNegs.length > 0 && (
                    <div className="space-y-2 mb-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        {missionNegs.length} proposition{missionNegs.length > 1 ? "s" : ""}
                      </p>
                      {missionNegs.slice(0, 3).map(neg => (
                        <button
                          key={neg.id}
                          onClick={() => openNegotiation(m, neg)}
                          className={cn(
                            "w-full p-2.5 rounded-lg border text-left text-sm transition-all",
                            neg.status === "accepted" ? "border-green-500 bg-green-500/5" :
                            neg.status === "counter_proposed" && !neg.client_responded_at ? "border-primary bg-primary/5 animate-pulse" :
                            "border-border"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {neg.gp_counter_price?.toLocaleString() || neg.initial_client_price?.toLocaleString()} {m.currency}
                            </span>
                            <Badge variant={neg.status === "accepted" ? "default" : "secondary"} className="text-[10px]">
                              {neg.status === "accepted" ? "✓ Accepté" :
                               neg.status === "counter_proposed" && !neg.client_responded_at ? "À répondre" :
                               neg.status === "rejected" ? "Refusé" : "En cours"}
                            </Badge>
                          </div>
                          {neg.gp_message && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">"{neg.gp_message}"</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Pending action indicator */}
                  {pendingNeg && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => openNegotiation(m, pendingNeg)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Répondre à la contre-proposition
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <MissionNegotiationSheet
        open={negotiationOpen}
        onOpenChange={setNegotiationOpen}
        mission={selectedMission}
        negotiation={selectedNegotiation}
        role="client"
        onSuccess={() => loadMissions()}
      />
    </div>
  );
}
