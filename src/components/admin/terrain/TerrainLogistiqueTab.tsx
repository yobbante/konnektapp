/**
 * Terrain Logistique Tab — GP & internal logistics overview.
 */
import { useState, useEffect } from "react";
import { Truck, Users, MapPin, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { TerrainOrder } from "@/pages/AdminTerrainDashboard";
import { AddLivreurByEmail } from "@/components/admin/AddLivreurByEmail";

interface Props {
  orders: TerrainOrder[];
  onRefresh: () => void;
}

interface GPActive {
  id: string;
  business_name: string;
  city: string;
  status: string;
  activeOrders: number;
}

interface AgentInfo {
  user_id: string;
  full_name: string | null;
  missionsCount: number;
}

export function TerrainLogistiqueTab({ orders, onRefresh }: Props) {
  const [activeGPs, setActiveGPs] = useState<GPActive[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [orders]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get GPs with active orders today
      const gpIds = [...new Set(orders.filter(o => o.gp_id).map(o => o.gp_id!))];
      
      if (gpIds.length > 0) {
        const { data: gps } = await supabase
          .from("gp_profiles")
          .select("id, business_name, city, status")
          .in("id", gpIds);
        
        const gpList = (gps || []).map(gp => ({
          ...gp,
          activeOrders: orders.filter(o => o.gp_id === gp.id && !["delivered", "cancelled"].includes(o.status)).length,
        })).filter(gp => gp.activeOrders > 0);
        
        setActiveGPs(gpList);
      }

      // Get agent logistique users
      const { data: agentRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "agent_logistique");

      if (agentRoles && agentRoles.length > 0) {
        const userIds = agentRoles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        // Count missions per agent
        const { data: logistics } = await supabase
          .from("order_logistics_options")
          .select("id")
          .or("pickup_enabled.eq.true,delivery_enabled.eq.true")
          .not("logistics_status", "eq", "completed");

        const agentList = (profiles || []).map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          missionsCount: logistics?.length || 0, // Simplified — all missions shared
        }));
        setAgents(agentList);
      }
    } catch (err) {
      console.error("Error loading logistique data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="gps" className="space-y-3">
      <TabsList className="grid grid-cols-2 w-full">
        <TabsTrigger value="gps" className="text-xs gap-1">
          <Truck className="w-3 h-3" />
          GP actifs ({activeGPs.length})
        </TabsTrigger>
        <TabsTrigger value="agents" className="text-xs gap-1">
          <Users className="w-3 h-3" />
          Agents ({agents.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="gps" className="space-y-2">
        {activeGPs.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Aucun GP actif</CardContent></Card>
        ) : (
          activeGPs.map(gp => (
            <Card
              key={gp.id}
              className="cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate(`/admin/gp/${gp.id}`)}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{gp.business_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {gp.city}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-[10px]">
                    <Package className="w-3 h-3 mr-1" />
                    {gp.activeOrders} colis
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="agents" className="space-y-3">
        <AddLivreurByEmail />
        {agents.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Aucun agent configuré</CardContent></Card>
        ) : (
          agents.map(agent => (
            <Card key={agent.user_id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{agent.full_name || "Agent"}</p>
                    <p className="text-xs text-muted-foreground">Dakar · Logistique interne</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {agent.missionsCount} missions
                </Badge>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
