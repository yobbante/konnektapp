import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Search,
  Filter,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Ban,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  History,
  Scale,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";

interface TransporterReputation {
  id: string;
  gp_id: string;
  internal_score: number;
  reputation_status: string;
  total_disputes: number;
  disputes_won: number;
  disputes_lost: number;
  total_warnings: number;
  total_suspensions: number;
  last_incident_at: string | null;
  observation_reason: string | null;
  observation_started_at: string | null;
  suspended_until: string | null;
  excluded_at: string | null;
  exclusion_reason: string | null;
  created_at: string;
  gp_profile?: {
    business_name: string;
    phone: string;
    city: string;
    gp_type: string;
    total_deliveries: number;
    rating: number;
    user_id: string;
  };
}

interface ReputationIncident {
  id: string;
  incident_type: string;
  score_impact: number;
  previous_score: number;
  new_score: number;
  description: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  verified: { label: "Vérifié", color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-4 h-4" /> },
  under_observation: { label: "Sous observation", color: "bg-yellow-100 text-yellow-700", icon: <Eye className="w-4 h-4" /> },
  suspended: { label: "Suspendu", color: "bg-orange-100 text-orange-700", icon: <Clock className="w-4 h-4" /> },
  excluded: { label: "Exclu", color: "bg-red-100 text-red-700", icon: <Ban className="w-4 h-4" /> },
};

export function AdminTransporterReputation() {
  const { toast } = useToast();
  const [reputations, setReputations] = useState<TransporterReputation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRep, setSelectedRep] = useState<TransporterReputation | null>(null);
  const [incidents, setIncidents] = useState<ReputationIncident[]>([]);
  const [processing, setProcessing] = useState(false);
  
  // Action form
  const [actionType, setActionType] = useState("");
  const [actionReason, setActionReason] = useState("");

  useEffect(() => {
    fetchReputations();
  }, []);

  const fetchReputations = async () => {
    try {
      const { data, error } = await supabase
        .from("transporter_reputation")
        .select("*")
        .order("internal_score", { ascending: true });

      if (error) throw error;

      // Fetch GP profiles
      const repsWithProfiles = await Promise.all(
        (data || []).map(async (rep) => {
          const { data: gpData } = await supabase
            .from("gp_profiles")
            .select("business_name, phone, city, gp_type, total_deliveries, rating, user_id")
            .eq("id", rep.gp_id)
            .single();

          return { ...rep, gp_profile: gpData };
        })
      );

      setReputations(repsWithProfiles);
    } catch (error) {
      console.error("Error fetching reputations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidents = async (gpId: string) => {
    try {
      const { data, error } = await supabase
        .from("reputation_incidents")
        .select("*")
        .eq("gp_id", gpId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error("Error fetching incidents:", error);
    }
  };

  const openDetails = async (rep: TransporterReputation) => {
    setSelectedRep(rep);
    setActionType("");
    setActionReason("");
    await fetchIncidents(rep.gp_id);
  };

  const handleAction = async () => {
    if (!selectedRep || !actionType || !actionReason.trim() || processing) return;

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      let updateData: Record<string, any> = {};
      let scoreImpact = 0;

      switch (actionType) {
        case "warning":
          scoreImpact = -10;
          updateData = {
            internal_score: Math.max(0, selectedRep.internal_score + scoreImpact),
            total_warnings: selectedRep.total_warnings + 1,
            last_incident_at: new Date().toISOString(),
          };
          break;
        case "observation":
          updateData = {
            reputation_status: "under_observation",
            observation_reason: actionReason,
            observation_started_at: new Date().toISOString(),
          };
          break;
        case "suspend":
          scoreImpact = -25;
          updateData = {
            reputation_status: "suspended",
            internal_score: Math.max(0, selectedRep.internal_score + scoreImpact),
            total_suspensions: selectedRep.total_suspensions + 1,
            suspended_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            last_incident_at: new Date().toISOString(),
          };
          break;
        case "exclude":
          updateData = {
            reputation_status: "excluded",
            internal_score: 0,
            excluded_at: new Date().toISOString(),
            exclusion_reason: actionReason,
          };
          break;
        case "restore":
          updateData = {
            reputation_status: "verified",
            observation_reason: null,
            observation_started_at: null,
            suspended_until: null,
          };
          break;
        case "boost":
          scoreImpact = 10;
          updateData = {
            internal_score: Math.min(100, selectedRep.internal_score + scoreImpact),
          };
          break;
      }

      const { error } = await supabase
        .from("transporter_reputation")
        .update(updateData)
        .eq("id", selectedRep.id);

      if (error) throw error;

      // Log incident if score changed
      if (scoreImpact !== 0) {
        await supabase.from("reputation_incidents").insert({
          gp_id: selectedRep.gp_id,
          incident_type: actionType,
          score_impact: scoreImpact,
          previous_score: selectedRep.internal_score,
          new_score: Math.max(0, Math.min(100, selectedRep.internal_score + scoreImpact)),
          description: actionReason,
        });
      }

      // Create sanction record if applicable
      if (["warning", "suspend", "exclude"].includes(actionType) && selectedRep.gp_profile) {
        const sanctionMap: Record<string, string> = {
          warning: "warning",
          suspend: "temporary_suspension",
          exclude: "permanent_exclusion",
        };

        await supabase.from("sanctions").insert({
          target_user_id: selectedRep.gp_profile.user_id,
          target_type: "transporter",
          sanction_type: sanctionMap[actionType] as any,
          reason: actionReason,
          applied_by: user.id,
          is_permanent: actionType === "exclude",
          ends_at: actionType === "suspend" 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        });
      }

      toast({ title: "Action appliquée avec succès" });
      setSelectedRep(null);
      await fetchReputations();
    } catch (error) {
      console.error("Error applying action:", error);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const filteredReps = reputations.filter((rep) => {
    const matchesStatus = statusFilter === "all" || rep.reputation_status === statusFilter;
    const matchesSearch = rep.gp_profile?.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.gp_profile?.city?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const stats = {
    total: reputations.length,
    verified: reputations.filter((r) => r.reputation_status === "verified").length,
    observation: reputations.filter((r) => r.reputation_status === "under_observation").length,
    suspended: reputations.filter((r) => r.reputation_status === "suspended").length,
    excluded: reputations.filter((r) => r.reputation_status === "excluded").length,
    lowScore: reputations.filter((r) => r.internal_score < 50).length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-20 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
        <Card className="p-3 border-green-200">
          <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          <p className="text-xs text-muted-foreground">Vérifiés</p>
        </Card>
        <Card className="p-3 border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">{stats.observation}</div>
          <p className="text-xs text-muted-foreground">Observation</p>
        </Card>
        <Card className="p-3 border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{stats.suspended}</div>
          <p className="text-xs text-muted-foreground">Suspendus</p>
        </Card>
        <Card className="p-3 border-red-200">
          <div className="text-2xl font-bold text-red-600">{stats.excluded}</div>
          <p className="text-xs text-muted-foreground">Exclus</p>
        </Card>
        <Card className="p-3 border-red-200">
          <div className="flex items-center gap-1">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="text-2xl font-bold text-red-600">{stats.lowScore}</span>
          </div>
          <p className="text-xs text-muted-foreground">Score {"<"} 50</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher transporteur..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="verified">Vérifiés</SelectItem>
            <SelectItem value="under_observation">Sous observation</SelectItem>
            <SelectItem value="suspended">Suspendus</SelectItem>
            <SelectItem value="excluded">Exclus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredReps.length === 0 ? (
          <Card className="p-8 text-center">
            <Shield className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun transporteur trouvé</p>
          </Card>
        ) : (
          filteredReps.map((rep, index) => {
            const statusConfig = STATUS_CONFIG[rep.reputation_status] || STATUS_CONFIG.verified;
            return (
              <motion.div
                key={rep.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openDetails(rep)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-center">
                      <div className={`text-2xl font-bold ${getScoreColor(rep.internal_score)}`}>
                        {rep.internal_score}
                      </div>
                      <p className="text-xs text-muted-foreground">/100</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{rep.gp_profile?.business_name || "N/A"}</span>
                        <Badge className={statusConfig.color}>
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.label}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{rep.gp_profile?.city}</span>
                        <span>{rep.gp_profile?.total_deliveries || 0} livraisons</span>
                        <span>{rep.total_disputes} litiges ({rep.disputes_lost} perdus)</span>
                        <span>{rep.total_warnings} avertissements</span>
                      </div>
                      <div className="mt-2 w-full max-w-xs">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${getScoreBarColor(rep.internal_score)}`}
                            style={{ width: `${rep.internal_score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRep} onOpenChange={() => setSelectedRep(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {selectedRep?.gp_profile?.business_name}
            </DialogTitle>
          </DialogHeader>

          {selectedRep && (
            <div className="space-y-4">
              {/* Score */}
              <Card className="p-4">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(selectedRep.internal_score)}`}>
                      {selectedRep.internal_score}
                    </div>
                    <p className="text-sm text-muted-foreground">Score interne</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getScoreBarColor(selectedRep.internal_score)}`}
                        style={{ width: `${selectedRep.internal_score}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <Card className="p-3 text-center">
                  <div className="text-xl font-bold">{selectedRep.total_disputes}</div>
                  <p className="text-xs text-muted-foreground">Litiges</p>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-xl font-bold text-green-600">{selectedRep.disputes_won}</div>
                  <p className="text-xs text-muted-foreground">Gagnés</p>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-xl font-bold text-red-600">{selectedRep.disputes_lost}</div>
                  <p className="text-xs text-muted-foreground">Perdus</p>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-xl font-bold text-orange-600">{selectedRep.total_warnings}</div>
                  <p className="text-xs text-muted-foreground">Avertissements</p>
                </Card>
              </div>

              {/* Status Info */}
              {selectedRep.reputation_status !== "verified" && (
                <Card className="p-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Statut actuel: {STATUS_CONFIG[selectedRep.reputation_status]?.label}
                  </h4>
                  {selectedRep.observation_reason && (
                    <p className="text-sm">Raison: {selectedRep.observation_reason}</p>
                  )}
                  {selectedRep.suspended_until && (
                    <p className="text-sm">
                      Suspendu jusqu'au: {format(new Date(selectedRep.suspended_until), "d MMM yyyy", { locale: fr })}
                    </p>
                  )}
                  {selectedRep.exclusion_reason && (
                    <p className="text-sm">Raison d'exclusion: {selectedRep.exclusion_reason}</p>
                  )}
                </Card>
              )}

              {/* Actions */}
              {selectedRep.reputation_status !== "excluded" && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Actions administratives</h4>
                  <div className="space-y-3">
                    <Select value={actionType} onValueChange={setActionType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une action..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warning">Avertissement (-10 pts)</SelectItem>
                        <SelectItem value="observation">Mettre sous observation</SelectItem>
                        <SelectItem value="suspend">Suspendre 30 jours (-25 pts)</SelectItem>
                        <SelectItem value="exclude">Exclure définitivement</SelectItem>
                        {selectedRep.reputation_status !== "verified" && (
                          <SelectItem value="restore">Restaurer statut vérifié</SelectItem>
                        )}
                        <SelectItem value="boost">Bonus réputation (+10 pts)</SelectItem>
                      </SelectContent>
                    </Select>

                    {actionType && (
                      <>
                        <Textarea
                          value={actionReason}
                          onChange={(e) => setActionReason(e.target.value)}
                          placeholder="Raison de cette action..."
                          rows={3}
                        />
                        <Button
                          onClick={handleAction}
                          disabled={processing || !actionReason.trim()}
                          variant={actionType === "exclude" ? "destructive" : "default"}
                          className="w-full"
                        >
                          {processing ? "Application..." : "Appliquer l'action"}
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              )}

              {/* Incidents History */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Historique des incidents
                </h4>
                {incidents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun incident</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {incidents.map((incident) => (
                      <div key={incident.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          incident.score_impact > 0 ? "bg-green-100" : "bg-red-100"
                        }`}>
                          {incident.score_impact > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="capitalize font-medium">{incident.incident_type}</span>
                            <Badge variant={incident.score_impact > 0 ? "default" : "destructive"}>
                              {incident.score_impact > 0 ? "+" : ""}{incident.score_impact} pts
                            </Badge>
                            <span className="text-muted-foreground">
                              {incident.previous_score} → {incident.new_score}
                            </span>
                          </div>
                          {incident.description && (
                            <p className="text-muted-foreground text-xs mt-1">{incident.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(incident.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
