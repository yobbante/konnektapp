/**
 * Admin GP Module — GP Management
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, Star, TrendingUp, AlertTriangle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GPData {
  id: string;
  business_name: string;
  city: string;
  country_code: string;
  status: string;
  rating: number;
  total_deliveries: number;
  commission_rate?: number;
  ktp_level?: string;
  wallet_balance?: number;
  manual_ratio?: number;
  kyc_level?: number;
  created_at: string;
}

interface Props {
  gps: GPData[];
  searchQuery: string;
  onUpdateStatus: (gpId: string, status: string) => void;
}

type GPFilter = "all" | "starter" | "pending" | "verified" | "premium" | "suspended";

export function AdminGPModule({ gps, searchQuery, onUpdateStatus }: Props) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<GPFilter>("all");
  const [localSearch, setLocalSearch] = useState("");

  const search = searchQuery || localSearch;

  const filtered = useMemo(() => {
    let result = gps;
    if (filter !== "all") result = result.filter(g => g.status === filter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(g =>
        g.business_name?.toLowerCase().includes(q) ||
        g.city?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [gps, filter, search]);

  const filters: { id: GPFilter; label: string; count: number }[] = [
    { id: "all", label: "Tous", count: gps.length },
    { id: "verified", label: "Vérifiés", count: gps.filter(g => g.status === "verified").length },
    { id: "starter", label: "Starter", count: gps.filter(g => g.status === "starter").length },
    { id: "pending", label: "En attente", count: gps.filter(g => g.status === "pending").length },
    { id: "suspended", label: "Suspendus", count: gps.filter(g => g.status === "suspended").length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-500" />
          Transporteurs GP
          <Badge variant="secondary" className="text-xs">{gps.length}</Badge>
        </h2>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher GP..."
          className="pl-9 h-9"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>

      {/* GP List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun GP trouvé</p>
          </div>
        ) : (
          filtered.slice(0, 50).map(gp => (
            <div
              key={gp.id}
              className="p-3 rounded-xl border bg-card hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{gp.business_name}</span>
                  <StatusBadge status={gp.status} />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/admin/gp/${gp.id}`)}
                  className="h-7 text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Détails
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-muted-foreground">
                <span>{gp.city}, {gp.country_code}</span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500" />
                  {gp.rating?.toFixed(1) || "—"}
                </span>
                <span>{gp.total_deliveries || 0} livraisons</span>
                <span>Com: {gp.commission_rate || 5}%</span>
              </div>
              {gp.kyc_level !== undefined && (
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-muted-foreground">KYC: Niveau {gp.kyc_level}</span>
                  {gp.ktp_level && <span className="text-muted-foreground">KTP: {gp.ktp_level}</span>}
                  {(gp.manual_ratio || 0) > 20 && (
                    <span className="flex items-center gap-1 text-orange-600">
                      <AlertTriangle className="w-3 h-3" />
                      Manuel: {gp.manual_ratio}%
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    verified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    starter: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    premium: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300",
    suspended: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  const labels: Record<string, string> = {
    verified: "Vérifié",
    starter: "Starter",
    pending: "En attente",
    premium: "Premium",
    suspended: "Suspendu",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full ${variants[status] || variants.pending}`}>
      {labels[status] || status}
    </span>
  );
}