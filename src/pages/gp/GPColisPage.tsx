/**
 * GPColisPage — "Colis" tab
 * 
 * V1 TERRAIN: All packages for this GP
 * - Sortable by status, client name, order number
 * - Quick scan icon per line
 * - Filter from URL params
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, ScanLine, Scale, Search, Filter,
  ChevronRight, RefreshCw
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
import { cn } from "@/lib/utils";

interface Colis {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  weight: number;
  status: string;
  client_id: string;
  total_price: number;
  currency: string;
  created_at: string;
  description: string | null;
}

const STATUS_FILTERS = [
  { value: "all", label: "Tous" },
  { value: "pending", label: "En attente" },
  { value: "accepted", label: "À collecter" },
  { value: "collected", label: "Collecté" },
  { value: "in_transit", label: "En transit" },
  { value: "arrived", label: "Arrivé" },
  { value: "delivered", label: "Livré" },
];

export default function GPColisPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { gpProfile, loading: profileLoading, pendingCount, activeCount } = useGPProfile();
  const [colis, setColis] = useState<Colis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("filter") || "all");

  useEffect(() => {
    if (gpProfile) loadColis();
  }, [gpProfile]);

  const loadColis = async (refresh = false) => {
    if (!gpProfile) return;
    if (refresh) setRefreshing(true);
    
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, origin_city, destination_city, weight, status, client_id, total_price, currency, created_at, description")
        .eq("gp_id", gpProfile.id)
        .not("status", "eq", "cancelled")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setColis(data || []);
    } catch (error) {
      console.error("Error loading colis:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (profileLoading || loading) return <PageLoader message="Chargement des colis..." />;
  if (!gpProfile) return null;

  // Filter and search
  const filtered = colis.filter(c => {
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      c.order_number.toLowerCase().includes(q) ||
      c.origin_city.toLowerCase().includes(q) ||
      c.destination_city.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeCount}
      activeTab="colis"
    >
      <div className="px-4 py-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Mes colis</h2>
            <p className="text-xs text-muted-foreground">{filtered.length} colis</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadColis(true)} disabled={refreshing}>
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par n° commande, ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {STATUS_FILTERS.map((f) => {
            const count = f.value === "all" ? colis.length : colis.filter(c => c.status === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {f.label}
                {count > 0 && (
                  <span className={cn(
                    "w-4 h-4 rounded-full text-[10px] flex items-center justify-center",
                    statusFilter === f.value
                      ? "bg-primary-foreground/20"
                      : "bg-muted-foreground/20"
                  )}>
                    {count}
                  </span>
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
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card 
                    className="cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
                    onClick={() => navigate(`/gp/order/${c.id}`)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Status Dot */}
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                          c.status === "accepted" ? "bg-amber-500/10" :
                          c.status === "collected" || c.status === "in_transit" ? "bg-blue-500/10" :
                          c.status === "arrived" ? "bg-purple-500/10" :
                          c.status === "delivered" ? "bg-green-500/10" :
                          "bg-muted/50"
                        )}>
                          <Package className={cn(
                            "w-5 h-5",
                            c.status === "accepted" ? "text-amber-500" :
                            c.status === "collected" || c.status === "in_transit" ? "text-blue-500" :
                            c.status === "arrived" ? "text-purple-500" :
                            c.status === "delivered" ? "text-green-500" :
                            "text-muted-foreground"
                          )} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">
                              {c.origin_city} → {c.destination_city}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground font-mono">
                              #{c.order_number.slice(-6)}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Scale className="w-3 h-3" /> {c.weight} kg
                            </span>
                          </div>
                        </div>

                        {/* Status + Action */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={cn("text-[10px]", getOrderStatusColor(c.status as any))}>
                            {getOrderStatusLabel(c.status as any)}
                          </Badge>
                          {["accepted", "collected", "in_transit", "arrived"].includes(c.status) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 bg-primary/10 hover:bg-primary/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate("/gp/scan");
                              }}
                            >
                              <ScanLine className="w-4 h-4 text-primary" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </GPDashboardLayout>
  );
}
