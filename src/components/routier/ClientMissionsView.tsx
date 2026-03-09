/**
 * ClientMissionsView - Client sees their routier missions as compact linear cards
 * Click to open full detail sheet with negotiations
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Clock, MapPin, Package, Scale, MessageCircle,
  Check, X, RefreshCw, ChevronRight, Zap, ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MissionNegotiationSheet } from "./MissionNegotiationSheet";
import { MissionDetailSheet } from "./MissionDetailSheet";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "En recherche", color: "bg-amber-500/10 text-amber-700", icon: Clock },
  matching: { label: "Matching", color: "bg-blue-500/10 text-blue-700", icon: Zap },
  negotiating: { label: "En negociation", color: "bg-purple-500/10 text-purple-700", icon: MessageCircle },
  accepted: { label: "Acceptee", color: "bg-green-500/10 text-green-700", icon: Check },
  in_progress: { label: "En cours", color: "bg-blue-500/10 text-blue-700", icon: Truck },
  completed: { label: "Terminee", color: "bg-green-500/10 text-green-700", icon: Check },
  cancelled: { label: "Annulee", color: "bg-destructive/10 text-destructive", icon: X },
  expired: { label: "Expiree", color: "bg-muted text-muted-foreground", icon: Clock },
};

export function ClientMissionsView() {
  const { toast } = useToast();
  const [missions, setMissions] = useState<any[]>([]);
  const [negotiations, setNegotiations] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<any | null>(null);
  const [selectedNegotiation, setSelectedNegotiation] = useState<any | null>(null);
  const [negotiationOpen, setNegotiationOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMission, setDetailMission] = useState<any | null>(null);

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

  useEffect(() => {
    const channel = supabase
      .channel("client-missions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "routier_missions" }, () => loadMissions())
      .on("postgres_changes", { event: "*", schema: "public", table: "mission_negotiations" }, () => loadMissions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMissions]);

  const openDetail = (mission: any) => {
    setDetailMission(mission);
    setDetailOpen(true);
  };

  const openNegotiation = (mission: any, negotiation: any) => {
    setSelectedMission(mission);
    setSelectedNegotiation(negotiation);
    setNegotiationOpen(true);
  };

  const isExpiredMission = (m: any) => {
    if (m.status === "expired" || m.status === "cancelled") return true;
    const negs = negotiations[m.id] || [];
    return negs.length > 0 && negs.every(n => n.status === "rejected" || n.status === "expired");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
          <Truck className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">Aucune mission routier</p>
        <p className="text-xs text-muted-foreground mt-1">
          Demandez une mission pour trouver un transporteur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Truck className="w-3.5 h-3.5" />
        Missions routier ({missions.length})
      </h3>

      <div className="space-y-1.5">
        <AnimatePresence>
          {missions.map((m, i) => {
            const config = statusConfig[m.status] || statusConfig.open;
            const StatusIcon = config.icon;
            const missionNegs = negotiations[m.id] || [];
            const pendingCount = missionNegs.filter(n => n.status === "counter_proposed" && n.gp_counter_price && !n.client_responded_at).length;
            const expired = isExpiredMission(m);

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => openDetail(m)}
                className={cn(
                  "bg-card border border-border rounded-lg p-3 active:scale-[0.98] transition-all cursor-pointer",
                  expired && "opacity-50 grayscale",
                  pendingCount > 0 && !expired && "border-primary/40"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                    expired ? "bg-muted" : "bg-primary/10"
                  )}>
                    <Truck className={cn("w-4 h-4", expired ? "text-muted-foreground" : "text-primary")} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {m.origin_city} <ArrowRight className="w-3 h-3 inline text-muted-foreground mx-0.5" /> {m.destination_city}
                      </p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={cn("text-[10px] gap-0.5 px-1.5 py-0", config.color)} variant="secondary">
                        <StatusIcon className="w-2.5 h-2.5" />
                        {config.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(m.created_at), "d MMM", { locale: fr })}
                      </span>
                      {missionNegs.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {missionNegs.length} offre{missionNegs.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{m.weight_kg} kg</span>
                        <span className="capitalize">{m.freight_type}</span>
                      </div>
                      <span className={cn("text-xs font-bold", expired ? "text-muted-foreground" : "text-foreground")}>
                        {(m.client_budget || m.estimated_price)?.toLocaleString()} {m.currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pending action indicator */}
                {pendingCount > 0 && !expired && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-primary">
                    <MessageCircle className="w-3 h-3" />
                    {pendingCount} contre-proposition{pendingCount > 1 ? "s" : ""} en attente
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Detail sheet */}
      <MissionDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        mission={detailMission}
        negotiations={detailMission ? (negotiations[detailMission.id] || []) : []}
        onOpenNegotiation={(neg) => {
          setDetailOpen(false);
          setTimeout(() => openNegotiation(detailMission, neg), 200);
        }}
        onRefresh={loadMissions}
      />

      {/* Negotiation sheet */}
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
