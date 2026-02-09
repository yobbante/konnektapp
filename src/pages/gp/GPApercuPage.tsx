/**
 * GPApercuPage — "Aujourd'hui" default screen
 * 
 * V1 TERRAIN: 4 status cards + Custom requests preview + Upcoming departures
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package, Plane, MapPin, Send,
  AlertTriangle, Clock, ChevronRight, Sparkles,
  Calendar, RefreshCw, MessageSquare, Scale
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { SmartVoyageForm } from "@/components/gp/SmartVoyageForm";
import { useGPProfile } from "@/hooks/useGPProfile";
import { format, isAfter, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface StatusCounts {
  toCollect: number;
  inTransit: number;
  arrived: number;
  toDeliver: number;
}

interface CustomRequestPreview {
  id: string;
  origin_city: string;
  destination_city: string;
  weight_estimate: number | null;
  description: string;
  created_at: string;
  shipment_type: string;
}

export default function GPApercuPage() {
  const navigate = useNavigate();
  const { gpProfile, loading: profileLoading, pendingCount, activeCount } = useGPProfile();
  const [counts, setCounts] = useState<StatusCounts>({ toCollect: 0, inTransit: 0, arrived: 0, toDeliver: 0 });
  const [customRequests, setCustomRequests] = useState(0);
  const [customRequestPreviews, setCustomRequestPreviews] = useState<CustomRequestPreview[]>([]);
  const [weightAlerts, setWeightAlerts] = useState(0);
  const [upcomingDepartures, setUpcomingDepartures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showVoyageForm, setShowVoyageForm] = useState(false);

  useEffect(() => {
    if (gpProfile) loadData();
  }, [gpProfile]);

  const loadData = async (refresh = false) => {
    if (!gpProfile) return;
    if (refresh) setRefreshing(true);
    
    try {
      const [ordersRes, offersRes, customReqRes, customReqPreviews] = await Promise.all([
        supabase.from("orders").select("status").eq("gp_id", gpProfile.id),
        supabase.from("gp_offers").select("id, departure_date, origin_city, destination_city, available_capacity, flight_number")
          .eq("gp_id", gpProfile.id).eq("status", "active")
          .order("departure_date", { ascending: true }).limit(3),
        supabase.from("custom_request_responses").select("id").eq("gp_id", gpProfile.id).eq("status", "pending"),
        supabase.from("custom_requests")
          .select("id, origin_city, destination_city, weight_estimate, description, created_at, shipment_type")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      const orders = ordersRes.data || [];
      const statusList = orders.map(o => o.status as string);
      setCounts({
        toCollect: statusList.filter(s => s === "accepted").length,
        inTransit: statusList.filter(s => ["collected", "in_transit"].includes(s)).length,
        arrived: statusList.filter(s => s === "arrived").length,
        toDeliver: statusList.filter(s => s === "arrived").length,
      });
      
      setCustomRequests(customReqRes.data?.length || 0);
      setCustomRequestPreviews(customReqPreviews.data || []);
      setWeightAlerts(statusList.filter(s => s === "pending_client_validation").length);
      setUpcomingDepartures(
        (offersRes.data || []).filter(o => isAfter(new Date(o.departure_date), startOfDay(new Date())))
      );
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (profileLoading || loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  const isPending = gpProfile.status === "pending";

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeCount}
      activeTab="aujourdhui"
      onNewVoyage={() => setShowVoyageForm(true)}
    >
      <div className="px-4 py-4 space-y-4">
        {/* ─── Pending Account Alert ─── */}
        {isPending && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-sm">Compte en attente</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Konnekt vérifie votre profil. Les fonctions terrain seront débloquées après validation.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── REFRESH ─── */}
        {!isPending && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Aujourd'hui</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        )}

        {/* ─── 4 STATUS CARDS ─── */}
        {!isPending && (
          <div className="grid grid-cols-2 gap-3">
            <StatusCard icon={Package} label="À collecter" count={counts.toCollect} color="amber" onClick={() => navigate("/gp/colis?filter=accepted")} />
            <StatusCard icon={Plane} label="En transit" count={counts.inTransit} color="blue" onClick={() => navigate("/gp/colis?filter=in_transit")} />
            <StatusCard icon={MapPin} label="Arrivés" count={counts.arrived} color="purple" onClick={() => navigate("/gp/colis?filter=arrived")} />
            <StatusCard icon={Send} label="À remettre" count={counts.toDeliver} color="green" onClick={() => navigate("/gp/distribution")} />
          </div>
        )}

        {/* ─── ALERTS ─── */}
        {!isPending && (weightAlerts > 0 || pendingCount > 0 || customRequests > 0) && (
          <div className="space-y-2">
            {weightAlerts > 0 && (
              <AlertBanner icon={AlertTriangle} iconColor="text-red-500" bgColor="bg-red-500/10 border-red-500/30"
                title={`${weightAlerts} poids modifié${weightAlerts > 1 ? "s" : ""} — validation client`}
                subtitle="Action requise"
                onClick={() => navigate("/gp/colis?filter=pending_client_validation")}
              />
            )}
            {pendingCount > 0 && (
              <AlertBanner icon={Package} iconColor="text-amber-500" bgColor="bg-amber-500/10 border-amber-500/30"
                title={`${pendingCount} demande${pendingCount > 1 ? "s" : ""} en attente`}
                subtitle="Répondez rapidement"
                onClick={() => navigate("/gp/demandes")}
              />
            )}
          </div>
        )}

        {/* ─── CUSTOM REQUESTS PREVIEW ─── */}
        {!isPending && customRequestPreviews.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Demandes personnalisées
              </h3>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/gp/demandes-personnalisees")}>
                Voir tout
              </Button>
            </div>
            {customRequestPreviews.map(req => (
              <motion.button
                key={req.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/gp/demandes-personnalisees")}
                className="w-full p-3 rounded-xl border bg-blue-500/5 border-blue-500/20 flex items-center gap-3 text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {req.origin_city} → {req.destination_city}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {req.weight_estimate ? `${req.weight_estimate} kg · ` : ""}{req.description?.slice(0, 40)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        )}

        {/* ─── UPCOMING DEPARTURES ─── */}
        {!isPending && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Prochains départs
              </h3>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/gp/calendrier")}>
                Voir tout
              </Button>
            </div>
            {upcomingDepartures.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun départ planifié</p>
                  <Button variant="link" size="sm" className="mt-1" onClick={() => setShowVoyageForm(true)}>
                    Ajouter un voyage
                  </Button>
                </CardContent>
              </Card>
            ) : (
              upcomingDepartures.map((dep) => (
                <Card key={dep.id} className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]" onClick={() => navigate("/gp/calendrier")}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Plane className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {dep.origin_city} → {dep.destination_city}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(dep.departure_date), "EEE d MMM", { locale: fr })}
                        {dep.flight_number && ` · ${dep.flight_number}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {dep.available_capacity} kg
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Smart Voyage Form */}
      {gpProfile && (
        <SmartVoyageForm
          open={showVoyageForm}
          onClose={() => setShowVoyageForm(false)}
          gpId={gpProfile.id}
          onSuccess={() => { setShowVoyageForm(false); loadData(); }}
        />
      )}
    </GPDashboardLayout>
  );
}

/* ─── Status Card ─── */
function StatusCard({ icon: Icon, label, count, color, onClick }: {
  icon: any; label: string; count: number; color: string; onClick: () => void;
}) {
  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    amber: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/20" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-500/20" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", ring: "ring-purple-500/20" },
    green: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", ring: "ring-green-500/20" },
  };
  const c = colorMap[color];

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn("p-4 rounded-2xl text-left transition-all", c.bg, "ring-1", c.ring, count > 0 ? "shadow-sm" : "")}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-5 h-5", c.text)} />
        <span className={cn("text-xs font-medium", c.text)}>{label}</span>
      </div>
      <p className={cn("text-3xl font-bold", c.text)}>{count}</p>
    </motion.button>
  );
}

/* ─── Alert Banner ─── */
function AlertBanner({ icon: Icon, iconColor, bgColor, title, subtitle, onClick }: {
  icon: any; iconColor: string; bgColor: string; title: string; subtitle: string; onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn("w-full p-3 rounded-xl border flex items-center gap-3 text-left", bgColor)}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0", iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </motion.button>
  );
}
