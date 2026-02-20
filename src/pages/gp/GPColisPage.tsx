/**
 * GPColisPage — Onglet Colis V2
 * 
 * Améliorations:
 * - Actions contextuelles rapides par statut (flux collecte→livraison)
 * - Badge d'urgence sur les "À livrer"
 * - Regroupement par priorité
 * - Scan direct depuis la liste
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, ScanLine, Scale, Search, Plus, RefreshCw,
  ChevronRight, ArrowRight, Truck, Clock, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { useGPProfile } from "@/hooks/useGPProfile";
import { getOrderStatusLabel, getOrderStatusColor } from "@/lib/transportTypes";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { CreateManualParcelDialog } from "@/components/gp/CreateManualParcelDialog";
import { ManualParcelBadge } from "@/components/gp/ManualParcelBadge";
import { GPScanSheet } from "@/components/scan/GPScanSheet";
import { useToast } from "@/hooks/use-toast";
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
  { value: "all", label: "Tous" },
  { value: "pending", label: "⚡ En attente" },
  { value: "accepted", label: "À collecter" },
  { value: "collected", label: "Collecté" },
  { value: "in_transit", label: "En transit" },
  { value: "arrived", label: "🎯 Arrivé" },
  { value: "delivered", label: "✓ Livré" },
];

const STATUS_FLOW: Record<string, { next: string; label: string; urgent?: boolean }> = {
  pending: { next: "accepted", label: "Accepter", urgent: true },
  accepted: { next: "collected", label: "Collecté ✓" },
  collected: { next: "in_transit", label: "En transit" },
  in_transit: { next: "arrived", label: "Arrivé" },
  arrived: { next: "delivered", label: "Livrer", urgent: true },
};

const STATUS_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
  accepted: { icon: Package, color: "text-blue-600", bg: "bg-blue-500/10" },
  collected: { icon: Truck, color: "text-indigo-600", bg: "bg-indigo-500/10" },
  in_transit: { icon: Truck, color: "text-purple-600", bg: "bg-purple-500/10" },
  arrived: { icon: AlertTriangle, color: "text-green-600", bg: "bg-green-500/10" },
  delivered: { icon: CheckCircle2, color: "text-green-700", bg: "bg-green-500/10" },
};

export default function GPColisPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { gpProfile, loading: profileLoading, pendingCount, activeCount } = useGPProfile();
  const [colis, setColis] = useState<Colis[]>([]);
  const [manualParcels, setManualParcels] = useState<ManualParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("filter") || "all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "konnekt" | "manual">("all");
  const [showManualForm, setShowManualForm] = useState(false);
  const [scanningOrderId, setScanningOrderId] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
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

  const handleQuickStatusUpdate = async (e: React.MouseEvent, orderId: string, newStatus: string) => {
    e.stopPropagation();
    setUpdatingOrder(orderId);
    try {
      const { error } = await supabase.from("orders").update({ status: newStatus as any }).eq("id", orderId);
      if (error) throw error;
      toast({ title: "Statut mis à jour ✓" });
      loadColis(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingOrder(null);
    }
  };

  if (profileLoading || loading) return <PageLoader message="Chargement des colis..." />;
  if (!gpProfile) return null;

  type UnifiedColis = (Colis & { is_manual?: false }) | (ManualParcel & { is_manual: true });

  const allColis: UnifiedColis[] = [
    ...(sourceFilter !== "manual" ? colis.map(c => ({ ...c, is_manual: false as const })) : []),
    ...(sourceFilter !== "konnekt" ? manualParcels : []),
  ];

  const filtered = allColis.filter(c => {
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      c.order_number.toLowerCase().includes(q) ||
      c.origin_city.toLowerCase().includes(q) ||
      c.destination_city.toLowerCase().includes(q) ||
      (c.is_manual && c.client_name.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  }).sort((a, b) => {
    // Prioritize urgent statuses
    const priority = { arrived: 0, pending: 1, accepted: 2, collected: 3, in_transit: 4, delivered: 5 };
    const pa = (priority as any)[a.status] ?? 9;
    const pb = (priority as any)[b.status] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const pendingCount2 = allColis.filter(c => c.status === "pending").length;
  const arrivedCount = allColis.filter(c => c.status === "arrived").length;
  const urgentCount = pendingCount2 + arrivedCount;

  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeCount} activeTab="colis">
      <div className="px-4 py-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Mes colis</h2>
            <p className="text-xs text-muted-foreground">
              {colis.length} Konnekt · {manualParcels.length} manuels
              {urgentCount > 0 && <span className="ml-2 text-destructive font-semibold">· {urgentCount} urgents</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setShowManualForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Manuel
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadColis(true)} disabled={refreshing}>
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="N° commande, ville, client..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10 rounded-xl" />
        </div>

        {/* Source Filter */}
        <div className="flex gap-2">
          {([
            { val: "all" as const, label: "Tous" },
            { val: "konnekt" as const, label: "Konnekt" },
            { val: "manual" as const, label: "🟡 Hors plateforme" },
          ]).map(f => (
            <button key={f.val} onClick={() => setSourceFilter(f.val)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                sourceFilter === f.val ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Status Filter Pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {STATUS_FILTERS.map(f => {
            const count = f.value === "all" ? allColis.length : allColis.filter(c => c.status === f.value).length;
            const isUrgent = (f.value === "pending" || f.value === "arrived") && count > 0;
            return (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isUrgent
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}>
                {f.label}
                {count > 0 && (
                  <span className={cn("w-4 h-4 rounded-full text-[10px] flex items-center justify-center",
                    statusFilter === f.value ? "bg-primary-foreground/20" : "bg-muted-foreground/20"
                  )}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Colis List */}
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucun colis trouvé</p>
              <Button variant="link" size="sm" className="mt-1" onClick={() => setShowManualForm(true)}>
                Ajouter un colis manuel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((c, i) => {
                const isManual = c.is_manual === true;
                const flow = !isManual ? STATUS_FLOW[c.status as string] : null;
                const si = STATUS_ICONS[c.status as string] || { icon: Package, color: "text-muted-foreground", bg: "bg-muted/50" };
                const StatusIcon = si.icon;
                const isArrived = c.status === "arrived";

                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}>
                    <Card
                      className={cn(
                        "cursor-pointer active:scale-[0.99] transition-all",
                        isManual ? "border-amber-500/30" : "",
                        isArrived ? "border-green-500/40 bg-green-500/3" : "",
                        c.status === "pending" ? "border-amber-500/40 bg-amber-500/3" : ""
                      )}
                      onClick={() => !isManual && navigate(`/gp/order/${c.id}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Icon */}
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", isManual ? "bg-amber-500/10" : si.bg)}>
                            <StatusIcon className={cn("w-4 h-4", isManual ? "text-amber-500" : si.color)} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold truncate">{c.origin_city} → {c.destination_city}</p>
                              {isManual && <ManualParcelBadge />}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] text-muted-foreground font-mono">#{c.order_number.slice(-6)}</span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                <Scale className="w-3 h-3" /> {c.weight} kg
                              </span>
                              {isManual && "client_name" in c && (
                                <span className="text-[11px] text-muted-foreground">{c.client_name}</span>
                              )}
                              <span className="text-[11px] text-muted-foreground">
                                {formatDistanceToNow(new Date(c.created_at), { locale: fr, addSuffix: true })}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!isManual && flow ? (
                              <div className="flex items-center gap-1.5">
                                {c.status === "arrived" ? (
                                  // Livraison — redirect to detail for delivery code
                                  <Button size="sm"
                                    className="h-7 text-[10px] px-2 bg-green-500 hover:bg-green-600 text-white font-bold gap-1"
                                    onClick={(e) => { e.stopPropagation(); navigate(`/gp/order/${c.id}`); }}>
                                    <ArrowRight className="w-3 h-3" /> Livrer
                                  </Button>
                                ) : c.status === "pending" ? (
                                  // Accept / Refuse
                                  <>
                                    <Button size="sm" variant="outline"
                                      className="h-7 text-[10px] px-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                                      onClick={(e) => handleQuickStatusUpdate(e, c.id, "refused" as any)}
                                      disabled={updatingOrder === c.id}>
                                      ✕
                                    </Button>
                                    <Button size="sm"
                                      className="h-7 text-[10px] px-2 bg-green-500 hover:bg-green-600 text-white"
                                      onClick={(e) => handleQuickStatusUpdate(e, c.id, "accepted")}
                                      disabled={updatingOrder === c.id}>
                                      {updatingOrder === c.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : "✓ Acc."}
                                    </Button>
                                  </>
                                ) : (
                                  // Default next action
                                  <Button size="sm" variant="outline"
                                    className="h-7 text-[10px] px-2 border-primary/30 text-primary hover:bg-primary/10 gap-1"
                                    onClick={(e) => handleQuickStatusUpdate(e, c.id, flow.next)}
                                    disabled={updatingOrder === c.id}>
                                    {updatingOrder === c.id
                                      ? <RefreshCw className="w-3 h-3 animate-spin" />
                                      : <><ArrowRight className="w-3 h-3" />{flow.label}</>
                                    }
                                  </Button>
                                )}
                                {/* Scan icon */}
                                <Button variant="ghost" size="icon" className="h-8 w-8 bg-primary/8 hover:bg-primary/15"
                                  onClick={(e) => { e.stopPropagation(); setShowScanSheet(true); }}>
                                  <ScanLine className="w-4 h-4 text-primary" />
                                </Button>
                              </div>
                            ) : (
                              <Badge className={cn("text-[10px]", getOrderStatusColor(c.status as any))}>
                                {getOrderStatusLabel(c.status as any)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
