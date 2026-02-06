/**
 * AgentDashboard - Dashboard for Agent Logistique Yobbanté
 * 
 * Scan-centric interface for delivery agents:
 * - Universal scanner with agent permissions
 * - Today's missions list
 * - Scan history
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ScanLine, Package, Truck, CheckCircle, Clock,
  MapPin, Phone, RefreshCw, History
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  address: string | null;
  city: string | null;
}

interface ScanLog {
  id: string;
  action: string;
  scan_type: string;
  created_at: string;
  order_id: string;
}

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState("scan");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanLog[]>([]);

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
      loadMissions();
      loadHistory(user.id);
    } catch {
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const loadMissions = async () => {
    try {
      const { data } = await supabase
        .from("order_logistics_options")
        .select(`
          id, order_id, 
          pickup_enabled, pickup_status, pickup_contact_name, pickup_phone, pickup_address, pickup_city,
          delivery_enabled, delivery_status, delivery_contact_name, delivery_phone, delivery_address, delivery_city,
          logistics_status,
          order:orders(order_number)
        `)
        .or("pickup_enabled.eq.true,delivery_enabled.eq.true")
        .not("logistics_status", "eq", "completed")
        .order("created_at", { ascending: false });

      if (!data) return;

      const missionList: Mission[] = [];
      for (const item of data) {
        const orderNum = (item.order as any)?.order_number || "N/A";
        if (item.pickup_enabled && item.pickup_status !== "handed_to_gp") {
          missionList.push({
            id: item.id,
            order_id: item.order_id,
            order_number: orderNum,
            type: "pickup",
            status: item.pickup_status || "pending",
            contact_name: item.pickup_contact_name,
            phone: item.pickup_phone,
            address: item.pickup_address,
            city: item.pickup_city,
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
            address: item.delivery_address,
            city: item.delivery_city,
          });
        }
      }
      setMissions(missionList);
    } catch (err) {
      console.error("Error loading missions:", err);
    }
  };

  const loadHistory = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("scan_logs")
        .select("id, action, scan_type, created_at, order_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      setScanHistory(data || []);
    } catch (err) {
      console.error("Error loading history:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <MobileHeader />

      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Agent Yobbanté</h1>
            <p className="text-xs text-muted-foreground">Scan & Livraison</p>
          </div>
          <Badge className="gap-1 bg-amber-100 text-amber-800">
            <Package className="w-3 h-3" />
            {missions.length} mission(s)
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="scan" className="gap-1">
              <ScanLine className="w-3 h-3" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="missions" className="gap-1 relative">
              <Truck className="w-3 h-3" />
              Missions
              {missions.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] bg-primary">
                  {missions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <History className="w-3 h-3" />
              Historique
            </TabsTrigger>
          </TabsList>

          {/* Scanner Tab */}
          <TabsContent value="scan" className="mt-4">
            <UniversalScanner onComplete={() => {
              loadMissions();
            }} />
          </TabsContent>

          {/* Missions Tab */}
          <TabsContent value="missions" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Missions du jour</h3>
              <Button variant="ghost" size="sm" onClick={loadMissions}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Actualiser
              </Button>
            </div>

            {missions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Aucune mission en attente</p>
                </CardContent>
              </Card>
            ) : (
              missions.map((mission) => (
                <Card key={`${mission.id}-${mission.type}`} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={mission.type === "pickup" ? "default" : "secondary"} className="text-xs">
                            {mission.type === "pickup" ? "Enlèvement" : "Livraison"}
                          </Badge>
                          <span className="text-xs font-mono text-muted-foreground">
                            {mission.order_number}
                          </span>
                        </div>
                        {mission.contact_name && (
                          <p className="text-sm font-medium truncate">{mission.contact_name}</p>
                        )}
                        {mission.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {mission.address}
                          </p>
                        )}
                      </div>
                      {mission.phone && (
                        <Button 
                          size="icon" variant="ghost" className="h-8 w-8"
                          onClick={() => window.open(`tel:${mission.phone}`, "_self")}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            {scanHistory.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Aucun scan effectué</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {scanHistory.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="text-xs text-muted-foreground">via {log.scan_type}</p>
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
      </div>

      <MobileNav />
    </div>
  );
}
