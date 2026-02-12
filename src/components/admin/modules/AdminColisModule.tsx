/**
 * Admin Colis Module — Unified parcel view
 * Filters: Tous, Konnekt, Hors plateforme, En transit, Arrivés, Livrés, En litige
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Filter, Search, ExternalLink, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface ColisOrder {
  id: string;
  order_number: string;
  status: string;
  origin_city: string;
  destination_city: string;
  weight: number;
  total_price: number;
  commission_amount: number;
  created_at: string;
  gp_name?: string;
  client_name?: string;
  insurance_amount?: number;
  is_manual?: boolean;
}

interface ManualParcel {
  id: string;
  order_number: string;
  status: string;
  origin_city: string;
  destination_city: string;
  weight: number;
  amount_paid: number;
  commission_amount: number;
  created_at: string;
  client_name: string;
}

interface Props {
  orders: ColisOrder[];
  manualParcels: ManualParcel[];
  searchQuery: string;
}

type ColisFilter = "tous" | "konnekt" | "hors_plateforme" | "in_transit" | "arrived" | "delivered" | "litige";

const FILTERS: { id: ColisFilter; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "konnekt", label: "Konnekt" },
  { id: "hors_plateforme", label: "Hors plateforme" },
  { id: "in_transit", label: "En transit" },
  { id: "arrived", label: "Arrivés" },
  { id: "delivered", label: "Livrés" },
  { id: "litige", label: "En litige" },
];

const statusLabels: Record<string, { label: string; variant: string }> = {
  pending: { label: "En attente", variant: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  accepted: { label: "Accepté", variant: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  collected: { label: "Collecté", variant: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300" },
  in_transit: { label: "En transit", variant: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300" },
  arrived: { label: "Arrivé", variant: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  delivered: { label: "Livré", variant: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  cancelled: { label: "Annulé", variant: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

export function AdminColisModule({ orders, manualParcels, searchQuery }: Props) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ColisFilter>("tous");
  const [localSearch, setLocalSearch] = useState("");

  const search = searchQuery || localSearch;

  // Unify orders and manual parcels
  const allColis = useMemo(() => {
    const konnekt = orders.map(o => ({
      ...o,
      type: "konnekt" as const,
      amount: o.total_price,
      commission: o.commission_amount,
      insurance: o.insurance_amount || 0,
    }));
    const manual = manualParcels.map(m => ({
      id: m.id,
      order_number: m.order_number,
      status: m.status,
      origin_city: m.origin_city,
      destination_city: m.destination_city,
      weight: m.weight,
      amount: m.amount_paid,
      commission: m.commission_amount,
      insurance: 0,
      created_at: m.created_at,
      gp_name: undefined,
      client_name: m.client_name,
      type: "manual" as const,
    }));
    return [...konnekt, ...manual].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, manualParcels]);

  const filtered = useMemo(() => {
    let result = allColis;

    // Filter by type
    if (filter === "konnekt") result = result.filter(c => c.type === "konnekt");
    else if (filter === "hors_plateforme") result = result.filter(c => c.type === "manual");
    else if (filter === "in_transit") result = result.filter(c => c.status === "in_transit");
    else if (filter === "arrived") result = result.filter(c => c.status === "arrived");
    else if (filter === "delivered") result = result.filter(c => c.status === "delivered");
    else if (filter === "litige") result = result.filter(c => c.status === "disputed" || c.status === "weight_disputed");

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.order_number?.toLowerCase().includes(q) ||
        c.origin_city?.toLowerCase().includes(q) ||
        c.destination_city?.toLowerCase().includes(q) ||
        c.gp_name?.toLowerCase().includes(q) ||
        c.client_name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allColis, filter, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-500" />
          Colis
          <Badge variant="secondary" className="text-xs">{allColis.length}</Badge>
        </h2>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher colis..."
          className="pl-9 h-9"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun colis trouvé</p>
          </div>
        ) : (
          filtered.slice(0, 50).map(colis => {
            const statusInfo = statusLabels[colis.status] || { label: colis.status, variant: "bg-gray-100 text-gray-800" };
            return (
              <button
                key={colis.id}
                onClick={() => colis.type === "konnekt" ? navigate(`/admin/order/${colis.id}`) : undefined}
                className="w-full text-left p-3 rounded-xl border bg-card hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{colis.order_number}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusInfo.variant}`}>
                      {statusInfo.label}
                    </span>
                    {colis.type === "manual" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                        Hors plateforme
                      </span>
                    )}
                  </div>
                  {colis.type === "konnekt" && (
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{colis.origin_city} → {colis.destination_city}</span>
                  <span>{colis.weight} kg</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-muted-foreground">{colis.gp_name || colis.client_name || "—"}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{colis.amount?.toLocaleString()} FCFA</span>
                    <span className="text-muted-foreground">Com: {colis.commission?.toLocaleString()}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}