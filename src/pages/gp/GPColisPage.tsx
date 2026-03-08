/**
 * GPColisPage — Onglet Colis V4 (simplifié)
 * 
 * Philosophie: Le GP voit ses colis regroupés en 3 états clairs.
 * Pas de surcharge visuelle. Scan-first workflow.
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, ScanLine, Search, Plus, RefreshCw,
  ArrowRight, Clock, Truck, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { useGPProfile } from "@/hooks/useGPProfile";
import { getOrderStatusLabel } from "@/lib/transportTypes";
import { CreateManualParcelDialog } from "@/components/gp/CreateManualParcelDialog";
import { ManualParcelBadge } from "@/components/gp/ManualParcelBadge";
import { GPScanSheet } from "@/components/scan/GPScanSheet";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ManualParcel {
  id: string; order_number: string; origin_city: string; destination_city: string;
  weight: number; status: string; client_name: string; amount_paid: number;
  currency: string; created_at: string; notes: string | null; is_manual: true;
}

interface Colis {
  id: string; order_number: string; origin_city: string; destination_city: string;
  weight: number; status: string; client_id: string; total_price: number;
  currency: string; created_at: string; description: string | null;
}

// 3 groupes clairs pour le GP
const PENDING_STATUSES = ["pending"];
const ACTIVE_STATUSES = ["accepted", "collected", "in_transit", "checked_in", "scheduled_departure", "arrived", "arrived_destination"];
const DONE_STATUSES = ["delivered", "delivery_confirmed", "delivery_pending", "released"];

type FilterKey = "all" | "pending" | "active" | "done";

const FILTERS: { value: FilterKey; label: string; icon: typeof Package; dot: string }[] = [
  { value: "all", label: "Tous", icon: Package, dot: "bg-muted-foreground" },
  { value: "pending", label: "À traiter", icon: Clock, dot: "bg-amber-500" },
  { value: "active", label: "En route", icon: Truck, dot: "bg-blue-500" },
  { value: "done", label: "Terminés", icon: CheckCircle2, dot: "bg-emerald-500" },
];

function getStatusGroup(status: string): FilterKey {
  if (PENDING_STATUSES.includes(status)) return "pending";
  if (ACTIVE_STATUSES.includes(status)) return "active";
  if (DONE_STATUSES.includes(status)) return "done";
  return "all";
}

// Couleur de la barre latérale par groupe
const GROUP_BORDER: Record<string, string> = {
  pending: "border-l-amber-500",
  active: "border-l-blue-500",
  done: "border-l-emerald-500",
};

export default function GPColisPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const { gpProfile, loading: profileLoading, pendingCount, activeCount } = useGPProfile();
  const [colis, setColis] = useState<Colis[]>([]);
  const [manualParcels, setManualParcels] = useState<ManualParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>((searchParams.get("filter") as FilterKey) || "all");
  const [showManualForm, setShowManualForm] = useState(false);
  const [showScanSheet, setShowScanSheet] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (gpProfile) loadColis();
  }, [gpProfile]);

  const loadColis = async (refresh = false) => {
    if (!gpProfile) return;
    if (refresh) setRefreshing(true);
    try {
      const [ordersRes, manualsRes] = await Promise.all([
        supabase.from("orders")
          .select("id, order_number, origin_city, destination_city, weight, status, client_id, total_price, currency, created_at, description")
          .eq("gp_id", gpProfile.id).not("status", "eq", "cancelled")
          .order("created_at", { ascending: false }),
        supabase.from("manual_parcels")
          .select("id, order_number, origin_city, destination_city, weight, status, client_name, amount_paid, currency, created_at, notes, is_manual")
          .eq("gp_id", gpProfile.id).order("created_at", { ascending: false }),
      ]);
      setColis(ordersRes.data || []);
      setManualParcels((manualsRes.data as ManualParcel[]) || []);
    } catch (error) {
      console.error("Error loading colis:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (profileLoading || loading) return <PageLoader message="Chargement des colis..." />;
  if (!gpProfile) return null;

  type UnifiedColis = (Colis & { is_manual?: false }) | (ManualParcel & { is_manual: true });

  const allColis: UnifiedColis[] = [
    ...colis.map(c => ({ ...c, is_manual: false as const })),
    ...manualParcels,
  ];

  // Counts
  const counts: Record<FilterKey, number> = {
    all: allColis.length,
    pending: allColis.filter(c => PENDING_STATUSES.includes(c.status)).length,
    active: allColis.filter(c => ACTIVE_STATUSES.includes(c.status)).length,
    done: allColis.filter(c => DONE_STATUSES.includes(c.status)).length,
  };

  // Filter + search
  const filtered = allColis.filter(c => {
    const group = getStatusGroup(c.status);
    const matchesFilter = filter === "all" || group === filter;
    if (!matchesFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.order_number.toLowerCase().includes(q)
      || c.origin_city.toLowerCase().includes(q)
      || c.destination_city.toLowerCase().includes(q)
      || (c.is_manual && c.client_name.toLowerCase().includes(q));
  }).sort((a, b) => {
    // Pending first, then active, then done
    const groupOrder: Record<string, number> = { pending: 0, active: 1, done: 2 };
    const ga = groupOrder[getStatusGroup(a.status)] ?? 9;
    const gb = groupOrder[getStatusGroup(b.status)] ?? 9;
    if (ga !== gb) return ga - gb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeCount} activeTab="colis">
      <div className="px-4 pt-3 pb-6 space-y-3">

        {/* Header — titre + actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Colis</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setShowSearch(s => !s)}>
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => loadColis(true)} disabled={refreshing}>
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg" onClick={() => setShowManualForm(true)}>
              <Plus className="w-3.5 h-3.5" />
              Manuel
            </Button>
          </div>
        </div>

        {/* ── RÉSUMÉ RAPIDE ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "pending" as FilterKey, label: "À traiter", count: counts.pending, icon: Clock, bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20", dot: "bg-amber-500" },
            { key: "active" as FilterKey, label: "En route", count: counts.active, icon: Truck, bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/20", dot: "bg-blue-500" },
            { key: "done" as FilterKey, label: "Terminés", count: counts.done, icon: CheckCircle2, bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20", dot: "bg-emerald-500" },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(f => f === s.key ? "all" : s.key)}
              className={cn(
                "relative rounded-xl border p-2.5 text-center transition-all active:scale-[0.97]",
                filter === s.key ? cn(s.bg, s.border, "shadow-sm") : "bg-card border-border/40 hover:border-border"
              )}
            >
              <div className={cn("text-2xl font-bold tabular-nums", filter === s.key ? s.text : "text-foreground")}>
                {s.count}
              </div>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
                <span className="text-[10px] font-medium text-muted-foreground">{s.label}</span>
              </div>
              {s.key === "pending" && s.count > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Search (collapsible) */}
        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="N° colis, ville, client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 rounded-lg bg-muted/40 border-border/50 text-sm"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter chip — affiche le filtre actif */}
        {filter !== "all" && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 cursor-pointer" onClick={() => setFilter("all")}>
              {FILTERS.find(f => f.value === filter)?.label} · {counts[filter]}
              <span className="ml-1 text-muted-foreground">✕</span>
            </Badge>
          </div>
        )}

        {/* Liste des colis */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {filter === "all" ? "Aucun colis" : `Aucun colis ${FILTERS.find(f => f.value === filter)?.label.toLowerCase()}`}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {filter === "pending" ? "Les nouvelles commandes apparaîtront ici" : "Scannez un colis pour commencer"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence>
              {filtered.map((c, i) => {
                const isManual = c.is_manual === true;
                const price = isManual ? (c as ManualParcel).amount_paid : (c as Colis).total_price;
                const currency = c.currency || "XOF";
                const group = getStatusGroup(c.status);
                const borderColor = GROUP_BORDER[group] || "border-l-border";

                const statusColors: Record<string, string> = {
                  pending: "bg-amber-500/15 text-amber-700 border-amber-500/20",
                  active: "bg-blue-500/15 text-blue-700 border-blue-500/20",
                  done: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
                };

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.15) }}
                  >
                    <div
                      className={cn(
                        "bg-card rounded-lg border border-border/40 border-l-[3px] p-3 cursor-pointer active:scale-[0.99] transition-all",
                        borderColor,
                        group === "done" && "opacity-60"
                      )}
                      onClick={() => !isManual && navigate(`/gp/order/${c.id}`)}
                    >
                      {/* Ligne 1 : route + prix */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[13px] font-semibold truncate">{c.origin_city}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-[13px] font-semibold truncate">{c.destination_city}</span>
                        </div>
                        <span className="text-xs font-bold text-foreground whitespace-nowrap">
                          {price?.toLocaleString()} <span className="text-muted-foreground font-normal">{currency}</span>
                        </span>
                      </div>

                      {/* Ligne 2 : meta + statut coloré */}
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="font-mono">#{c.order_number.slice(-6)}</span>
                          <span>·</span>
                          <span>{c.weight} kg</span>
                          {isManual && "client_name" in c && (
                            <><span>·</span><span className="truncate max-w-[60px]">{c.client_name}</span></>
                          )}
                          <span>·</span>
                          <span>{formatDistanceToNow(new Date(c.created_at), { locale: fr, addSuffix: true })}</span>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-[9px] px-1.5 py-0 h-4 font-semibold",
                          statusColors[group] || "bg-muted/60 text-muted-foreground"
                        )}>
                          {getOrderStatusLabel(c.status as any)}
                        </Badge>
                      </div>

                      {isManual && (
                        <div className="mt-1.5">
                          <ManualParcelBadge />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {gpProfile && (
        <CreateManualParcelDialog open={showManualForm} onClose={() => setShowManualForm(false)}
          gpId={gpProfile.id} gpCurrency={gpProfile.default_currency || "XOF"} onSuccess={() => loadColis(true)} />
      )}

      <GPScanSheet open={showScanSheet} onOpenChange={setShowScanSheet} gpId={gpProfile.id}
        isVerified={gpProfile.status === "verified" || gpProfile.status === "premium" || gpProfile.status === "starter"} />
    </GPDashboardLayout>
  );
}
