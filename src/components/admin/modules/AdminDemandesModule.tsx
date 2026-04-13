/**
 * Admin Demandes Module — Custom requests, freight requests, routier missions
 */
import { useState, useEffect, useMemo } from "react";
import { FileText, Search, Truck, Ship, Plane, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

type DemandeTab = "custom" | "freight" | "routier";

export function AdminDemandesModule() {
  const [activeTab, setActiveTab] = useState<DemandeTab>("custom");
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [freightRequests, setFreightRequests] = useState<any[]>([]);
  const [routierMissions, setRoutierMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [customRes, freightRes, routierRes] = await Promise.all([
      supabase.from("custom_requests").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("freight_requests").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("routier_missions").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setCustomRequests(customRes.data || []);
    setFreightRequests(freightRes.data || []);
    setRoutierMissions(routierRes.data || []);
    setLoading(false);
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      has_responses: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
      accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
      in_progress: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      negotiating: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const filterBySearch = (items: any[]) => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      i.request_number?.toLowerCase().includes(q) ||
      i.mission_number?.toLowerCase().includes(q) ||
      i.origin_city?.toLowerCase().includes(q) ||
      i.destination_city?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      i.merchandise_description?.toLowerCase().includes(q)
    );
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const openCustom = customRequests.filter(r => r.status === "open" || r.status === "has_responses").length;
  const openFreight = freightRequests.filter(r => r.status === "open" || r.status === "has_responses").length;
  const openRoutier = routierMissions.filter(r => r.status === "open" || r.status === "pending" || r.status === "negotiating").length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <FileText className="w-5 h-5 text-purple-500" />
        Demandes & Missions
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border bg-card">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Package className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-muted-foreground">Demandes GP</span>
          </div>
          <p className="text-xl font-bold">{customRequests.length}</p>
          {openCustom > 0 && <p className="text-[10px] text-blue-600">{openCustom} ouvertes</p>}
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Ship className="w-3 h-3 text-teal-500" />
            <span className="text-xs text-muted-foreground">Fret</span>
          </div>
          <p className="text-xl font-bold">{freightRequests.length}</p>
          {openFreight > 0 && <p className="text-[10px] text-teal-600">{openFreight} ouvertes</p>}
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Truck className="w-3 h-3 text-orange-500" />
            <span className="text-xs text-muted-foreground">Missions routier</span>
          </div>
          <p className="text-xl font-bold">{routierMissions.length}</p>
          {openRoutier > 0 && <p className="text-[10px] text-orange-600">{openRoutier} en cours</p>}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher demandes..."
          className="pl-9 h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DemandeTab)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="custom">GP ({customRequests.length})</TabsTrigger>
          <TabsTrigger value="freight">Fret ({freightRequests.length})</TabsTrigger>
          <TabsTrigger value="routier">Routier ({routierMissions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="custom" className="space-y-2 mt-3">
          {filterBySearch(customRequests).slice(0, 30).map(req => (
            <div key={req.id} className="p-3 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">{req.request_number}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor(req.status)}`}>{req.status}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString("fr")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{req.origin_city} → {req.destination_city}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{req.description}</p>
              {req.budget_max && <p className="text-xs font-medium mt-1">Budget: {req.budget_min?.toLocaleString()} - {req.budget_max?.toLocaleString()} FCFA</p>}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="freight" className="space-y-2 mt-3">
          {filterBySearch(freightRequests).slice(0, 30).map(req => (
            <div key={req.id} className="p-3 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">{req.request_number}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor(req.status)}`}>{req.status}</span>
                  <Badge variant="outline" className="text-[10px]">{req.freight_mode}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{req.origin_city} → {req.destination_city}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {req.weight_kg && <span>{req.weight_kg} kg</span>}
                {req.declared_value && <span>Valeur: {req.declared_value?.toLocaleString()} FCFA</span>}
                {req.is_vehicle && <span className="text-orange-600">Véhicule</span>}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="routier" className="space-y-2 mt-3">
          {filterBySearch(routierMissions).slice(0, 30).map(mission => (
            <div key={mission.id} className="p-3 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">{mission.mission_number}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor(mission.status)}`}>{mission.status}</span>
                  <Badge variant="outline" className="text-[10px]">{mission.freight_type}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{mission.origin_city} → {mission.destination_city}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{mission.weight_kg} kg</span>
                {mission.client_budget && <span>Budget: {mission.client_budget?.toLocaleString()} FCFA</span>}
                {mission.urgency && <span className="text-amber-600">⚡ {mission.urgency}</span>}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
