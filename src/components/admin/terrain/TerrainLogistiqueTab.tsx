/**
 * Terrain Logistique Tab — GP & internal logistics overview.
 * Includes Beta Konnekt validation sub-tab.
 */
import { useState, useEffect } from "react";
import { Truck, Users, MapPin, Package, Sparkles, CheckCircle2, Phone, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { TerrainOrder } from "@/pages/AdminTerrainDashboard";
import { AddLivreurByEmail } from "@/components/admin/AddLivreurByEmail";

interface Props {
  orders: TerrainOrder[];
  onRefresh: () => void;
  defaultSubTab?: string;
}

interface GPActive {
  id: string;
  business_name: string;
  city: string;
  status: string;
  activeOrders: number;
  beta_source?: string | null;
}

interface BetaGP {
  id: string;
  business_name: string;
  city: string;
  phone: string;
  whatsapp: string | null;
  status: string;
  created_at: string;
}

interface AgentInfo {
  user_id: string;
  full_name: string | null;
  missionsCount: number;
}

const KONNEKT_BOT = "221789269756";

function buildActivationWaUrl(gp: BetaGP) {
  const phone = (gp.whatsapp || gp.phone || "").replace(/\D/g, "");
  if (!phone) return null;
  const firstName = (gp.business_name || "").split(" ")[0] || "";
  const refCode = gp.id.slice(0, 4).toUpperCase();
  const text =
    `Salam ${firstName},\n\n` +
    `Votre compte Konnekt est activé.\n\n` +
    `Connectez-vous : https://usekonnekt.com/konnekt/gp\n` +
    `Téléphone : ${gp.phone}\n` +
    `Code : ${refCode}\n\n` +
    `Bot WhatsApp : +${KONNEKT_BOT}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function TerrainLogistiqueTab({ orders, onRefresh, defaultSubTab }: Props) {
  const [activeGPs, setActiveGPs] = useState<GPActive[]>([]);
  const [betaGPs, setBetaGPs] = useState<BetaGP[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [orders]);

  const loadData = async () => {
    setLoading(true);
    try {
      const gpIds = [...new Set(orders.filter(o => o.gp_id).map(o => o.gp_id!))];

      if (gpIds.length > 0) {
        const { data: gps } = await supabase
          .from("gp_profiles")
          .select("id, business_name, city, status, beta_source")
          .in("id", gpIds);

        const gpList = (gps || []).map((gp: any) => ({
          ...gp,
          activeOrders: orders.filter(o => o.gp_id === gp.id && !["delivered", "cancelled"].includes(o.status)).length,
        })).filter(gp => gp.activeOrders > 0);

        setActiveGPs(gpList);
      } else {
        setActiveGPs([]);
      }

      // Pending Beta Konnekt GPs awaiting validation
      const { data: betaPending } = await supabase
        .from("gp_profiles")
        .select("id, business_name, city, phone, whatsapp, status, created_at")
        .eq("beta_source", "konnekt_beta")
        .neq("status", "verified")
        .order("created_at", { ascending: false });
      setBetaGPs((betaPending as any) || []);

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

        const { data: logistics } = await supabase
          .from("order_logistics_options")
          .select("id")
          .or("pickup_enabled.eq.true,delivery_enabled.eq.true")
          .not("logistics_status", "eq", "completed");

        const agentList = (profiles || []).map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          missionsCount: logistics?.length || 0,
        }));
        setAgents(agentList);
      }
    } catch (err) {
      console.error("Error loading logistique data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateBeta = async (gp: BetaGP) => {
    setValidatingId(gp.id);
    try {
      const { error } = await supabase
        .from("gp_profiles")
        .update({ status: "verified", verified_at: new Date().toISOString() })
        .eq("id", gp.id);
      if (error) throw error;

      const waUrl = buildActivationWaUrl(gp);
      if (waUrl) window.open(waUrl, "_blank", "noopener");

      toast({
        title: "GP activé",
        description: "Identifiants prêts à envoyer via WhatsApp.",
      });
      await loadData();
      onRefresh();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Activation impossible",
        variant: "destructive",
      });
    } finally {
      setValidatingId(null);
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
    <Tabs defaultValue={defaultSubTab || "gps"} className="space-y-3">
      <TabsList className="grid grid-cols-3 w-full">
        <TabsTrigger value="gps" className="text-xs gap-1">
          <Truck className="w-3 h-3" />
          GP ({activeGPs.length})
        </TabsTrigger>
        <TabsTrigger value="beta" className="text-xs gap-1 relative">
          <Sparkles className="w-3 h-3" />
          Beta ({betaGPs.length})
          {betaGPs.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
          )}
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
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm">{gp.business_name}</p>
                      {gp.beta_source === "konnekt_beta" && (
                        <Badge className="bg-amber-400 text-slate-900 border-0 text-[9px] h-4 px-1.5 font-bold">
                          BETA
                        </Badge>
                      )}
                    </div>
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

      <TabsContent value="beta" className="space-y-2">
        {betaGPs.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
            Aucune demande beta Konnekt en attente
          </CardContent></Card>
        ) : (
          betaGPs.map(gp => {
            const refCode = gp.id.slice(0, 4).toUpperCase();
            const isValidating = validatingId === gp.id;
            return (
              <Card key={gp.id} className="border-amber-400/40 bg-amber-50/30 dark:bg-amber-950/10">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-amber-400/20 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-sm truncate">{gp.business_name}</p>
                          <Badge className="bg-amber-400 text-slate-900 border-0 text-[9px] h-4 px-1.5 font-bold">
                            BETA
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {gp.city}</span>
                          <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" /> {gp.phone}</span>
                          <span className="text-[10px]">Code: {refCode}</span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/admin/gp/${gp.id}`)}>
                          Voir profil
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleValidateBeta(gp)}
                          disabled={isValidating}
                          className="text-emerald-600 focus:text-emerald-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Valider beta Konnekt
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-2 h-8 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold"
                    onClick={() => handleValidateBeta(gp)}
                    disabled={isValidating}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    {isValidating ? "Activation..." : "Valider beta Konnekt"}
                  </Button>
                </CardContent>
              </Card>
            );
          })
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
