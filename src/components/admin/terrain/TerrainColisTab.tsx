/**
 * Terrain Colis Tab — Operational parcel list with quick filters.
 */
import { useState } from "react";
import { Package, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { TerrainOrder } from "@/pages/AdminTerrainDashboard";

interface Props {
  orders: TerrainOrder[];
  onRefresh: () => void;
}

const QUICK_FILTERS = [
  { id: "all", label: "Tous" },
  { id: "pending", label: "À collecter" },
  { id: "in_transit", label: "En transit" },
  { id: "arrived", label: "Arrivés" },
  { id: "blocked", label: "Anomalies" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  accepted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  collected: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  in_transit: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  arrived: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  accepted: "Accepté",
  collected: "Collecté",
  in_transit: "Transit",
  arrived: "Arrivé",
  delivered: "Livré",
};

export function TerrainColisTab({ orders, onRefresh }: Props) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = orders.filter(o => {
    if (o.status === "cancelled" || o.status === "delivered") return false;

    const matchesSearch = !search || 
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.origin_city?.toLowerCase().includes(search.toLowerCase()) ||
      o.destination_city?.toLowerCase().includes(search.toLowerCase()) ||
      o.gp_name?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    switch (filter) {
      case "pending": return o.status === "pending" || o.status === "accepted";
      case "in_transit": return o.status === "in_transit" || o.status === "collected";
      case "arrived": return o.status === "arrived";
      case "blocked": return o.logistics_status === "weight_disputed" || o.logistics_status === "awaiting_client_validation";
      default: return true;
    }
  });

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Référence, ville, GP..."
          className="pl-10 rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {QUICK_FILTERS.map(f => (
          <Button
            key={f.id}
            variant={filter === f.id ? "default" : "outline"}
            size="sm"
            className="rounded-full text-xs whitespace-nowrap"
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">{filtered.length} colis</p>

      {/* Order List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun colis trouvé</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(order => (
            <Card
              key={order.id}
              className="cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate(`/admin/order/${order.id}`)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-bold">{order.order_number}</span>
                  <Badge className={`text-[10px] ${STATUS_COLORS[order.status] || ""}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{order.origin_city} → {order.destination_city}</span>
                  <span>{order.weight ? `${order.weight} kg` : ""}</span>
                </div>
                {order.gp_name && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">GP: {order.gp_name}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
