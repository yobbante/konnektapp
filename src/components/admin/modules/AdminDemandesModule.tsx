/**
 * Admin Demandes Module — Custom requests only (GP_ONLY mode)
 */
import { useState, useEffect, useMemo } from "react";
import { FileText, Search, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export function AdminDemandesModule() {
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data } = await supabase
      .from("custom_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setCustomRequests(data || []);
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
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const filtered = useMemo(() => {
    if (!search) return customRequests;
    const q = search.toLowerCase();
    return customRequests.filter(i =>
      i.request_number?.toLowerCase().includes(q) ||
      i.origin_city?.toLowerCase().includes(q) ||
      i.destination_city?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q)
    );
  }, [customRequests, search]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const openCount = customRequests.filter(r => r.status === "open" || r.status === "has_responses").length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <FileText className="w-5 h-5 text-purple-500" />
        Demandes clients
      </h2>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border bg-card">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Package className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-muted-foreground">Total demandes</span>
          </div>
          <p className="text-xl font-bold">{customRequests.length}</p>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Package className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Ouvertes</span>
          </div>
          <p className="text-xl font-bold text-blue-600">{openCount}</p>
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

      {/* List */}
      <div className="space-y-2">
        {filtered.slice(0, 30).map(req => (
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
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Aucune demande trouvée</p>
        )}
      </div>
    </div>
  );
}
