/**
 * RoutierNegotiationsPage — View all ongoing negotiations for the transporter
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Clock, DollarSign, ArrowRight, RefreshCw, CheckCircle2, X, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  counter_proposed: { label: "En attente", color: "bg-amber-100 text-amber-800" },
  accepted: { label: "Acceptée", color: "bg-green-100 text-green-800" },
  rejected: { label: "Refusée", color: "bg-red-100 text-red-800" },
};

export default function RoutierNegotiationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [missions, setMissions] = useState<Record<string, any>>({});

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data: gp } = await supabase
      .from("gp_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (!gp) { navigate("/transporteur/inscription"); return; }
    setGpProfile(gp);

    // Load negotiations for this GP
    const { data: negs } = await supabase
      .from("mission_negotiations")
      .select("*")
      .eq("gp_id", gp.id)
      .order("created_at", { ascending: false });

    setNegotiations(negs || []);

    // Load related missions
    if (negs && negs.length > 0) {
      const missionIds = [...new Set(negs.map(n => n.mission_id))];
      const { data: missionData } = await supabase
        .from("routier_missions")
        .select("*")
        .in("id", missionIds);
      
      const missionsMap: Record<string, any> = {};
      missionData?.forEach(m => { missionsMap[m.id] = m; });
      setMissions(missionsMap);
    }

    setLoading(false);
    setRefreshing(false);
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime
  useEffect(() => {
    if (!gpProfile) return;
    const channel = supabase
      .channel("routier-negotiations-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "mission_negotiations" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gpProfile, loadData]);

  const handleAcceptClientCounter = async (neg: any) => {
    try {
      await supabase.from("mission_negotiations").update({
        status: "accepted",
        agreed_price: neg.client_final_price,
        gp_responded_at: new Date().toISOString(),
      }).eq("id", neg.id);

      await supabase.from("routier_missions").update({
        status: "accepted",
        matched_gp_id: gpProfile.id,
        accepted_negotiation_id: neg.id,
      } as any).eq("id", neg.mission_id);

      try {
        await supabase.rpc("convert_mission_to_order", {
          p_mission_id: neg.mission_id,
          p_gp_id: gpProfile.id,
          p_agreed_price: neg.client_final_price,
        });
      } catch (e) { console.warn("Conversion:", e); }

      toast({ title: "✅ Accord conclu !" });
      loadData(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const defaultGp = gpProfile || { id: "", business_name: "Routier", gp_type: "routier", status: "pending" };

  if (loading) {
    return <RoutierDashboardLayout gpProfile={defaultGp}><TransportPageLoader /></RoutierDashboardLayout>;
  }

  const pending = negotiations.filter(n => n.status === "counter_proposed");
  const others = negotiations.filter(n => n.status !== "counter_proposed");

  return (
    <RoutierDashboardLayout gpProfile={defaultGp}>
      <div className="px-3 py-3 pb-24 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-sm font-bold">Négociations</h1>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>

        {negotiations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucune négociation en cours</p>
              <p className="text-xs text-muted-foreground mt-0.5">Proposez-vous sur des missions disponibles</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/routier/demandes")}>
                Voir les missions
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Pending - needs response */}
            {pending.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> En attente de réponse ({pending.length})
                </p>
                {pending.map(neg => {
                  const mission = missions[neg.mission_id];
                  const needsGPResponse = neg.client_final_price && !neg.agreed_price;
                  
                  return (
                    <Card key={neg.id} className="border-amber-200 bg-amber-50/50">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-amber-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">
                              {mission?.origin_city || "—"} → {mission?.destination_city || "—"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(neg.created_at), { locale: fr, addSuffix: true })}
                              </span>
                              {mission?.weight_kg && (
                                <Badge variant="outline" className="text-[8px] h-3.5">{mission.weight_kg} kg</Badge>
                              )}
                            </div>
                            
                            {/* Price summary */}
                            <div className="mt-2 space-y-1 text-xs">
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span>Votre offre</span>
                                <span className="font-medium">{neg.gp_counter_price?.toLocaleString()} CFA</span>
                              </div>
                              {neg.client_final_price && (
                                <div className="flex items-center justify-between text-blue-700">
                                  <span>Réponse client</span>
                                  <span className="font-bold">{neg.client_final_price?.toLocaleString()} CFA</span>
                                </div>
                              )}
                            </div>

                            {needsGPResponse && (
                              <div className="flex gap-2 mt-2">
                                <Button size="sm" className="h-7 text-xs flex-1" onClick={() => handleAcceptClientCounter(neg)}>
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Accepter
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/routier/detail-mission/${neg.mission_id}`)}>
                                  Détails
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Other negotiations */}
            {others.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Historique</p>
                {others.map(neg => {
                  const mission = missions[neg.mission_id];
                  const statusInfo = STATUS_LABELS[neg.status] || { label: neg.status, color: "bg-muted text-muted-foreground" };
                  
                  return (
                    <Card key={neg.id} className="cursor-pointer active:scale-[0.99]" onClick={() => navigate(`/routier/detail-mission/${neg.mission_id}`)}>
                      <CardContent className="p-2.5 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">
                            {mission?.origin_city || "—"} → {mission?.destination_city || "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {neg.agreed_price ? `${neg.agreed_price.toLocaleString()} CFA` : `${neg.gp_counter_price?.toLocaleString()} CFA proposé`}
                          </p>
                        </div>
                        <Badge className={cn("text-[9px] h-4", statusInfo.color)}>{statusInfo.label}</Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </RoutierDashboardLayout>
  );
}
