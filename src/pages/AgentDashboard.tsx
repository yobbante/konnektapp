/**
 * AgentDashboard — Livreur Konnekt Dashboard
 * 
 * Scan-centric, mobile-first interface for logistics agents.
 * Strict role isolation: only agent_logistique or admin can access.
 * 
 * Structure:
 * - Quick stats header (pickups, deliveries, alerts)
 * - Central SCAN button (primary action)
 * - Missions tabs: Enlèvements / Livraisons / Historique
 * - Contact actions (call, WhatsApp, Maps)
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ScanLine, Package, Truck, CheckCircle, Clock, XCircle,
  MapPin, Phone, RefreshCw, History, ArrowRight, AlertTriangle,
  Navigation, MessageSquare, Shield, User
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UniversalScanner } from "@/components/scan/UniversalScanner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Mission {
  id: string;
  order_id: string;
  order_number: string;
  type: "pickup" | "delivery";
  status: string;
  contact_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  weight: number | null;
  gp_name: string | null;
  instructions: string | null;
}

interface ScanLog {
  id: string;
  action: string;
  scan_type: string;
  created_at: string;
  order_id: string;
  new_status: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  collected: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  handed_to_gp: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  picked_from_gp: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  in_transit: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  scheduled: "Programmé",
  collected: "Collecté",
  handed_to_gp: "Remis au GP",
  picked_from_gp: "Récupéré GP",
  in_transit: "En route",
  delivered: "Livré",
};

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState("missions");
  const [showScanner, setShowScanner] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAccess = roles?.some(r => 
        r.role === "agent_logistique" || r.role === "admin"
      );

      if (!hasAccess) {
        toast({ title: "Accès refusé", description: "Rôle agent logistique requis", variant: "destructive" });
        navigate("/");
        return;
      }

      setAuthorized(true);
      await Promise.all([loadMissions(), loadHistory(user.id)]);
    } catch {
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const loadMissions = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("order_logistics_options")
        .select(`
          id, order_id, 
          pickup_enabled, pickup_status, pickup_contact_name, pickup_phone, pickup_whatsapp, pickup_address, pickup_city,
          delivery_enabled, delivery_status, delivery_contact_name, delivery_phone, delivery_whatsapp, delivery_address, delivery_city, delivery_instructions,
          logistics_status,
          order:orders(order_number, weight, gp_profiles:gp_id(business_name))
        `)
        .or("pickup_enabled.eq.true,delivery_enabled.eq.true")
        .not("logistics_status", "eq", "completed")
        .order("created_at", { ascending: false });

      if (!data) return;

      const missionList: Mission[] = [];
      for (const item of data) {
        const order = item.order as any;
        const orderNum = order?.order_number || "N/A";
        const gpName = order?.gp_profiles?.business_name || null;
        const weight = order?.weight || null;

        if (item.pickup_enabled && !["handed_to_gp", "completed"].includes(item.pickup_status || "")) {
          missionList.push({
            id: item.id,
            order_id: item.order_id,
            order_number: orderNum,
            type: "pickup",
            status: item.pickup_status || "pending",
            contact_name: item.pickup_contact_name,
            phone: item.pickup_phone,
            whatsapp: item.pickup_whatsapp,
            address: item.pickup_address,
            city: item.pickup_city,
            weight,
            gp_name: gpName,
            instructions: null,
          });
        }
        if (item.delivery_enabled && item.delivery_status !== "delivered") {
          missionList.push({
            id: item.id,
            order_id: item.order_id,
            order_number: orderNum,
            type: "delivery",
            status: item.delivery_status || "pending",
            contact_name: item.delivery_contact_name,
            phone: item.delivery_phone,
            whatsapp: item.delivery_whatsapp,
            address: item.delivery_address,
            city: item.delivery_city,
            weight,
            gp_name: gpName,
            instructions: item.delivery_instructions,
          });
        }
      }
      setMissions(missionList);
    } catch (err) {
      console.error("Error loading missions:", err);
    }
  }, []);

  const loadHistory = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("scan_logs")
        .select("id, action, scan_type, created_at, order_id, new_status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      setScanHistory(data || []);
    } catch (err) {
      console.error("Error loading history:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    await Promise.all([loadMissions(), user ? loadHistory(user.id) : Promise.resolve()]);
    setRefreshing(false);
  };

  const pickups = missions.filter(m => m.type === "pickup");
  const deliveries = missions.filter(m => m.type === "delivery");
  const urgentCount = missions.filter(m => m.status === "pending").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Chargement agent...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Agent Header — Clean & Professional */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg"
        style={{ paddingTop: 'calc(12px + var(--safe-top, 0px))' }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Truck className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight">Livreur Konnekt</h1>
                <p className="text-[11px] text-white/60">Dakar · Logistique Interne</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="bg-white/10 hover:bg-white/20 text-white w-8 h-8"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <StatPill icon={Package} label="Enlèvements" value={pickups.length} color="amber" />
          <StatPill icon={Truck} label="Livraisons" value={deliveries.length} color="blue" />
          {urgentCount > 0 && (
            <StatPill icon={AlertTriangle} label="Urgent" value={urgentCount} color="red" />
          )}
          <StatPill icon={CheckCircle} label="Scans" value={scanHistory.length} color="green" />
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* SCAN — Central Action Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowScanner(!showScanner)}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg flex items-center justify-center gap-3 font-bold text-lg"
        >
          <ScanLine className="w-6 h-6" />
          {showScanner ? "Fermer le scanner" : "SCANNER UN QR CODE"}
        </motion.button>

        {/* Scanner Zone */}
        <AnimatePresence>
          {showScanner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <UniversalScanner onComplete={() => {
                setShowScanner(false);
                handleRefresh();
              }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Urgent Alerts */}
        {urgentCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{urgentCount} mission{urgentCount > 1 ? "s" : ""} en attente</p>
              <p className="text-xs text-muted-foreground">À traiter dès que possible</p>
            </div>
          </motion.div>
        )}

        {/* Missions Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="missions" className="gap-1 text-xs">
              <Package className="w-3 h-3" />
              Enlèvements
              {pickups.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                  {pickups.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="gap-1 text-xs">
              <Truck className="w-3 h-3" />
              Livraisons
              {deliveries.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                  {deliveries.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs">
              <History className="w-3 h-3" />
              Historique
            </TabsTrigger>
          </TabsList>

          {/* Pickups Tab */}
          <TabsContent value="missions" className="mt-4 space-y-3">
            {pickups.length === 0 ? (
              <EmptyState icon={CheckCircle} message="Aucun enlèvement en attente" />
            ) : (
              pickups.map((mission) => (
                <MissionCard key={`${mission.id}-pickup`} mission={mission} />
              ))
            )}
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries" className="mt-4 space-y-3">
            {deliveries.length === 0 ? (
              <EmptyState icon={CheckCircle} message="Aucune livraison en attente" />
            ) : (
              deliveries.map((mission) => (
                <MissionCard key={`${mission.id}-delivery`} mission={mission} />
              ))
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            {scanHistory.length === 0 ? (
              <EmptyState icon={History} message="Aucun scan effectué" />
            ) : (
              <div className="space-y-2">
                {scanHistory.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ScanLine className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{log.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.new_status ? `→ ${STATUS_LABELS[log.new_status] || log.new_status}` : `via ${log.scan_type}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "d/MM HH:mm", { locale: fr })}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Security Footer */}
        <div className="mt-8 p-3 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>Zone autorisée : Dakar · Toute action est journalisée</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function StatPill({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    amber: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    red: "bg-red-500/20 text-red-300 border-red-500/30",
    green: "bg-green-500/20 text-green-300 border-green-500/30",
  };

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap ${colorMap[color]}`}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <Icon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">{message}</p>
      </CardContent>
    </Card>
  );
}

function MissionCard({ mission }: { mission: Mission }) {
  const isPickup = mission.type === "pickup";
  const statusClass = STATUS_COLORS[mission.status] || STATUS_COLORS.pending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="hover:shadow-md transition-all border-l-4 border-l-primary/50">
        <CardContent className="p-3 space-y-2">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={`text-[10px] ${statusClass}`}>
                {isPickup ? "Enlèvement" : "Livraison"}
              </Badge>
              <span className="font-mono text-xs font-bold text-muted-foreground">
                {mission.order_number}
              </span>
            </div>
            <Badge variant="outline" className={`text-[10px] ${statusClass}`}>
              {STATUS_LABELS[mission.status] || mission.status}
            </Badge>
          </div>

          {/* Contact & Address */}
          <div className="space-y-1">
            {mission.contact_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">{mission.contact_name}</span>
              </div>
            )}
            {mission.address && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{mission.address}, {mission.city || "Dakar"}</span>
              </div>
            )}
            {mission.gp_name && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="w-3.5 h-3.5 flex-shrink-0" />
                <span>GP : {mission.gp_name}</span>
              </div>
            )}
            {mission.weight && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{mission.weight} kg</span>
              </div>
            )}
            {mission.instructions && (
              <div className="text-xs text-muted-foreground italic mt-1 p-2 bg-muted/30 rounded-lg">
                {mission.instructions}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {mission.phone && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-8"
                onClick={() => window.open(`tel:${mission.phone}`, "_self")}
              >
                <Phone className="w-3 h-3 mr-1" />
                Appeler
              </Button>
            )}
            {mission.whatsapp && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-8"
                onClick={() => window.open(`https://wa.me/${mission.whatsapp?.replace(/\D/g, "")}`, "_blank")}
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                WhatsApp
              </Button>
            )}
            {mission.address && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8"
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(mission.address + ", " + (mission.city || "Dakar"))}`, "_blank")}
              >
                <Navigation className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
