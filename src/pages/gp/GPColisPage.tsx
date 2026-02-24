/**
 * GPColisPage — Onglet Colis V3
 * 
 * UI/UX amélioré:
 * - Compteurs visuels en haut (mini dashboard)
 * - Filtres simplifiés et épurés
 * - Cartes plus lisibles avec prix affiché
 * - Actions claires et visibles
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, ScanLine, Search, Plus, RefreshCw,
  ArrowRight, Truck, Clock, CheckCircle2, MapPin,
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

const STATUS_FILTERS = [
  { value: "all", label: "Tous", icon: Package },
  { value: "pending", label: "En attente", icon: Clock },
  { value: "active", label: "En cours", icon: Truck },
  { value: "arrived", label: "Arrivé", icon: MapPin },
  { value: "delivered", label: "Livré", icon: CheckCircle2 },
];

// Badge styles distincts par statut
const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  accepted: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  collected: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  in_transit: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  arrived: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  delivered: "bg-green-600/15 text-green-700 dark:text-green-400 border-green-600/30",
  refused: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const ACTIVE_STATUSES = ["accepted", "collected", "in_transit", "checked_in", "scheduled_departure"];

export default function GPColisPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const { gpProfile, loading: profileLoading, pendingCount, activeCount } = useGPProfile();
  const [colis, setColis] = useState<Colis[]>([]);
  const [manualParcels, setManualParcels] = useState<ManualParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("filter") || "all");
  
  const [showManualForm, setShowManualForm] = useState(false);
  const [showScanSheet, setShowScanSheet] = useState(false);

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

  // No manual status buttons — scan-first workflow

  if (profileLoading || loading) return <PageLoader message="Chargement des colis..." />;
  if (!gpProfile) return null;

  type UnifiedColis = (Colis & { is_manual?: false }) | (ManualParcel & { is_manual: true });

  const allColis: UnifiedColis[] = [
    ...colis.map(c => ({ ...c, is_manual: false as const })),
    ...manualParcels,
  ];

  const filtered = allColis.filter(c => {
    const matchesStatus = statusFilter === "all"
      || (statusFilter === "active" ? ACTIVE_STATUSES.includes(c.status) : c.status === statusFilter);
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      c.order_number.toLowerCase().includes(q) ||
      c.origin_city.toLowerCase().includes(q) ||
      c.destination_city.toLowerCase().includes(q) ||
      (c.is_manual && c.client_name.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  }).sort((a, b) => {
    const priority: Record<string, number> = { arrived: 0, pending: 1, accepted: 2, collected: 3, in_transit: 4, delivered: 5 };
    const pa = priority[a.status] ?? 9;
    const pb = priority[b.status] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const counts = {
    all: allColis.length,
    pending: allColis.filter(c => c.status === "pending").length,
    active: allColis.filter(c => ACTIVE_STATUSES.includes(c.status)).length,
    arrived: allColis.filter(c => c.status === "arrived").length,
    delivered: allColis.filter(c => c.status === "delivered").length,
  };

  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeCount} activeTab="colis">
      <div className="px-4 pt-3 pb-6 space-y-4">

        {/* Header compact */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Mes colis</h2>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-xl" onClick={() => setShowScanSheet(true)}>
              <ScanLine className="w-3.5 h-3.5" /> Scan
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 rounded-xl" onClick={() => setShowManualForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Manuel
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadColis(true)} disabled={refreshing}>
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Filter bar — tappable counters */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {[
            { value: "all", label: "Tous", count: counts.all },
            { value: "pending", label: "Attente", count: counts.pending },
            { value: "active", label: "En cours", count: counts.active },
            { value: "arrived", label: "Arrivé", count: counts.arrived },
            { value: "delivered", label: "Livré", count: counts.delivered },
          ].map((f) => {
            const isActive = statusFilter === f.value;
            return (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                )}>
                {f.label}
                <span className={cn(
                  "min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center px-1 font-bold",
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/10 text-muted-foreground"
                )}>{f.count}</span>
              </button>
            );
          })}
        </div>

        {/* Colis List */}
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Aucun colis trouvé</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Modifiez vos filtres ou ajoutez un colis</p>
            <Button variant="outline" size="sm" className="mt-4 rounded-xl text-xs" onClick={() => setShowManualForm(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter un colis manuel
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((c, i) => {
                const isManual = c.is_manual === true;
                const price = isManual ? (c as ManualParcel).amount_paid : (c as Colis).total_price;
                const currency = c.currency || "XOF";
                const badgeStyle = STATUS_BADGE_STYLES[c.status] || "bg-muted text-muted-foreground border-border";

                return (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <div
                      className="bg-card rounded-xl border border-border/50 p-3 cursor-pointer active:scale-[0.99] transition-all"
                      onClick={() => !isManual && navigate(`/gp/order/${c.id}`)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-semibold truncate">{c.origin_city}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-semibold truncate">{c.destination_city}</span>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 border shrink-0", badgeStyle)}>
                          {getOrderStatusLabel(c.status as any)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-mono">#{c.order_number.slice(-6)}</span>
                          <span>•</span>
                          <span>{c.weight} kg</span>
                          {isManual && "client_name" in c && (
                            <><span>•</span><span>{c.client_name}</span></>
                          )}
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(c.created_at), { locale: fr, addSuffix: true })}</span>
                        </div>
                        <span className="text-xs font-bold text-foreground whitespace-nowrap">
                          {price?.toLocaleString()} {currency}
                        </span>
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
