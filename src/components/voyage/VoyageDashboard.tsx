/**
 * VoyageDashboard — Mini dashboard for occasional voyageurs
 * Shows published trips, orders management, scan, earnings
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plane, MapPin, Calendar, Luggage, ChevronRight, Plus,
  Clock, CheckCircle2, Package, DollarSign, ArrowRight,
  ScanLine, Wallet, Eye, EyeOff, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { GPScanSheet } from "@/components/scan/GPScanSheet";
import { GPProTransitionSheet } from "./GPProTransitionSheet";
import { GPMissionDetailsSheet } from "@/components/gp/GPMissionDetailsSheet";

interface VoyageDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewTrip: () => void;
}

interface Trip {
  id: string;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  available_capacity: number;
  total_capacity: number;
  price_per_kg: number;
  currency: string;
  status: string;
  bookings_count: number | null;
  views_count: number | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  weight: number;
  total_price: number;
  currency: string;
  recipient_name: string | null;
  origin_city: string;
  destination_city: string;
  created_at: string;
}

type Tab = "voyages" | "commandes" | "wallet";

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-amber-500/15 text-amber-600" },
  accepted: { label: "Accept\u00e9", color: "bg-green-500/15 text-green-600" },
  collected: { label: "Collect\u00e9", color: "bg-blue-500/15 text-blue-600" },
  checked_in: { label: "D\u00e9pos\u00e9", color: "bg-indigo-500/15 text-indigo-600" },
  in_transit: { label: "En transit", color: "bg-blue-500/15 text-blue-600" },
  arrived_destination: { label: "Arriv\u00e9", color: "bg-teal-500/15 text-teal-600" },
  delivered: { label: "Livr\u00e9", color: "bg-green-500/15 text-green-700" },
  delivery_confirmed: { label: "Confirm\u00e9", color: "bg-emerald-500/15 text-emerald-700" },
};

export function VoyageDashboard({ open, onOpenChange, onNewTrip }: VoyageDashboardProps) {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("voyages");
  const [tripFilter, setTripFilter] = useState<"active" | "past">("active");
  const [orderFilter, setOrderFilter] = useState<"active" | "done">("active");
  const [gpId, setGpId] = useState<string | null>(null);
  const [showScan, setShowScan] = useState(false);
  const [walletData, setWalletData] = useState<{ balance: number; pending: number; currency: string } | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [showProTransition, setShowProTransition] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [hasNewOrders, setHasNewOrders] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchData();
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id, default_currency")
        .eq("user_id", session.user.id)
        .eq("gp_type", "occasionnel" as any)
        .maybeSingle();

      if (!gpProfile) { setTrips([]); setOrders([]); return; }
      setGpId(gpProfile.id);

      // Fetch trips
      const { data: tripsData } = await supabase
        .from("gp_offers")
        .select("id, origin_city, destination_city, departure_date, available_capacity, total_capacity, price_per_kg, currency, status, bookings_count, views_count")
        .eq("gp_id", gpProfile.id)
        .order("departure_date", { ascending: false });
      setTrips(tripsData || []);

      // Fetch orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, order_number, status, weight, total_price, currency, recipient_name, origin_city, destination_city, created_at")
        .eq("gp_id", gpProfile.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setOrders(ordersData || []);
      
      // Auto-navigate to colis tab if there are active orders
      const activeStatuses = ["pending", "accepted", "collected", "checked_in", "in_transit", "arrived_destination", "weight_pending_payment"];
      const hasActive = (ordersData || []).some(o => activeStatuses.includes(o.status));
      if (hasActive) {
        setActiveTab("commandes");
        setHasNewOrders(true);
      }

      // Fetch wallet
      const [walletRes, escrowRes] = await Promise.all([
        supabase.from("gp_wallets").select("balance, pending_balance, currency").eq("gp_id", gpProfile.id).maybeSingle(),
        supabase.from("escrow_transactions").select("net_to_gp").eq("gp_id", gpProfile.id).eq("status", "held"),
      ]);
      const pendingEscrow = escrowRes.data?.reduce((sum: number, e: any) => sum + (e.net_to_gp || 0), 0) || 0;
      setWalletData({
        balance: walletRes.data?.balance || 0,
        pending: pendingEscrow,
        currency: gpProfile.default_currency || walletRes.data?.currency || "XOF",
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const activeTrips = trips.filter(t => t.status === "active" && t.departure_date >= today);
  const pastTrips = trips.filter(t => t.status !== "active" || t.departure_date < today);

  const ACTIVE_ORDER_STATUSES = ["pending", "accepted", "collected", "checked_in", "in_transit", "arrived_destination"];
  const DONE_ORDER_STATUSES = ["delivered", "delivery_confirmed"];
  const activeOrders = orders.filter(o => ACTIVE_ORDER_STATUSES.includes(o.status));
  const doneOrders = orders.filter(o => DONE_ORDER_STATUSES.includes(o.status));

  const totalEarnings = trips.reduce((sum, t) => {
    const booked = (t.total_capacity - t.available_capacity);
    return sum + booked * t.price_per_kg;
  }, 0);

  const formatDate = (d: string) => {
    try { return format(new Date(d), "EEE d MMM", { locale: fr }); }
    catch { return d; }
  };

  const getStatusConfig = (trip: Trip) => {
    if (trip.departure_date < today) return { label: "Termin\u00e9", color: "bg-muted text-muted-foreground", icon: CheckCircle2 };
    if (trip.status !== "active") return { label: "Inactif", color: "bg-muted text-muted-foreground", icon: Clock };
    if (trip.available_capacity <= 0) return { label: "Complet", color: "bg-green-500/10 text-green-600", icon: CheckCircle2 };
    return { label: "En ligne", color: "bg-primary/10 text-primary", icon: Sparkles };
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "EUR") return `${amount.toLocaleString("fr-FR")} \u20ac`;
    if (currency === "USD") return `${amount.toLocaleString("fr-FR")} $`;
    return `${amount.toLocaleString("fr-FR")} ${currency}`;
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Luggage className="w-4 h-4 text-white" />
                </div>
                Mes Voyages
              </div>
              <div className="flex items-center gap-1.5">
                {/* Scan button */}
                {gpId && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setShowScan(true)}
                    className="h-8 w-8 rounded-full border-primary/30"
                  >
                    <ScanLine className="w-4 h-4 text-primary" />
                  </Button>
                )}
                {/* New trip */}
                <Button
                  size="sm"
                  onClick={onNewTrip}
                  className="h-8 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nouveau
                </Button>
              </div>
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-6 pb-8 overflow-y-auto max-h-[75vh] space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Voyages", value: trips.length, icon: Plane, color: "text-primary" },
                { label: "Commandes", value: orders.length, icon: Package, color: "text-amber-500" },
                { label: "Gains", value: formatCurrency(totalEarnings, walletData?.currency || "EUR"), icon: DollarSign, color: "text-green-500" },
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                  <stat.icon className={cn("w-4 h-4 mx-auto mb-1", stat.color)} />
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Main Tabs: Voyages | Commandes | Wallet */}
            <div className="flex gap-1 p-1 bg-muted/30 rounded-xl">
              {([
                { id: "voyages" as Tab, label: "Voyages", icon: Plane, hasNotif: activeTrips.length > 0 },
                { id: "commandes" as Tab, label: `Colis (${orders.length})`, icon: Package, hasNotif: activeOrders.length > 0 },
                { id: "wallet" as Tab, label: "Finance", icon: Wallet, hasNotif: false },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); if (tab.id === "commandes") setHasNewOrders(false); }}
                  className={cn(
                    "flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 relative",
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                  {tab.hasNotif && activeTab !== tab.id && (
                    <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>
              ))}
            </div>

            {/* ═══ TAB: VOYAGES ═══ */}
            {activeTab === "voyages" && (
              <>
                {/* Sub-filter */}
                <div className="flex gap-1 p-0.5 bg-muted/20 rounded-lg">
                  {([
                    { id: "active" as const, label: `En cours (${activeTrips.length})` },
                    { id: "past" as const, label: `Pass\u00e9s (${pastTrips.length})` },
                  ]).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setTripFilter(f.id)}
                      className={cn(
                        "flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all",
                        tripFilter === f.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (tripFilter === "active" ? activeTrips : pastTrips).length === 0 ? (
                  <div className="text-center py-8">
                    <Plane className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {tripFilter === "active" ? "Aucun voyage en cours" : "Aucun voyage pass\u00e9"}
                    </p>
                    {tripFilter === "active" && (
                      <Button size="sm" onClick={onNewTrip} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                        Publier un trajet
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {(tripFilter === "active" ? activeTrips : pastTrips).map((trip) => {
                      const statusConfig = getStatusConfig(trip);
                      const StatusIcon = statusConfig.icon;
                      const bookedKg = trip.total_capacity - trip.available_capacity;
                      const fillPercent = Math.round((bookedKg / trip.total_capacity) * 100);
                      return (
                        <motion.button
                          key={trip.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => { onOpenChange(false); navigate(`/offres/${trip.id}`); }}
                          className="w-full text-left p-3.5 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <span>{trip.origin_city}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{trip.destination_city}</span>
                            </div>
                            <Badge className={cn("text-[10px] gap-1", statusConfig.color)}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(trip.departure_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {bookedKg}/{trip.total_capacity}kg
                            </span>
                            <span className="font-semibold text-foreground">
                              {trip.price_per_kg}{trip.currency === "EUR" ? "\u20ac" : trip.currency}/kg
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  fillPercent >= 80 ? "bg-green-500" : fillPercent >= 40 ? "bg-amber-500" : "bg-primary"
                                )}
                                style={{ width: `${Math.max(3, fillPercent)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium">{fillPercent}%</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ═══ TAB: COMMANDES ═══ */}
            {activeTab === "commandes" && (
              <>
                {/* Sub-filter */}
                <div className="flex gap-1 p-0.5 bg-muted/20 rounded-lg">
                  {([
                    { id: "active" as const, label: `En cours (${activeOrders.length})` },
                    { id: "done" as const, label: `Termin\u00e9s (${doneOrders.length})` },
                  ]).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setOrderFilter(f.id)}
                      className={cn(
                        "flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all",
                        orderFilter === f.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (orderFilter === "active" ? activeOrders : doneOrders).length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {orderFilter === "active" ? "Aucune commande en cours" : "Aucune commande termin\u00e9e"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(orderFilter === "active" ? activeOrders : doneOrders).map((order) => {
                      const st = ORDER_STATUS_CONFIG[order.status] || { label: order.status, color: "bg-muted text-muted-foreground" };
                      return (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => setSelectedOrderId(order.id)}
                          className="p-3 rounded-xl bg-card border border-border/50 space-y-2 cursor-pointer active:scale-[0.98] transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-muted-foreground">{order.order_number}</span>
                            <Badge className={cn("text-[10px]", st.color)}>{st.label}</Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <p className="text-foreground font-medium">{order.origin_city} → {order.destination_city}</p>
                              {order.recipient_name && <p className="text-muted-foreground">Dest: {order.recipient_name}</p>}
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <div>
                                <p className="font-semibold text-foreground">{order.weight}kg</p>
                                <p className="text-muted-foreground">{formatCurrency(order.total_price, order.currency)}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(order.created_at)}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ═══ TAB: WALLET ═══ */}
            {activeTab === "wallet" && (
              <div className="space-y-4">
                {walletData ? (
                  <>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-muted-foreground font-medium">Solde disponible</span>
                        <button onClick={() => setShowBalance(b => !b)} className="text-muted-foreground hover:text-foreground">
                          {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-2xl font-bold text-foreground tracking-tight">
                        {showBalance ? formatCurrency(walletData.balance, walletData.currency) : "\u2022\u2022\u2022\u2022\u2022\u2022"}
                      </p>
                      {walletData.pending > 0 && (
                        <div className="flex items-center gap-2 mt-3 bg-background/50 rounded-lg px-3 py-2">
                          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-xs text-muted-foreground flex-1">En attente (escrow)</span>
                          <span className="text-xs font-semibold text-foreground">
                            {showBalance ? formatCurrency(walletData.pending, walletData.currency) : "\u2022\u2022\u2022\u2022"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">Gains estim\u00e9s (voyages)</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(totalEarnings, walletData.currency)}</p>
                    </div>

                    <p className="text-[10px] text-muted-foreground text-center">
                      Les fonds sont lib\u00e9r\u00e9s apr\u00e8s confirmation de livraison
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* CTA to become pro */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowProTransition(true)}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">Devenir GP Pro</p>
                  <p className="text-[10px] text-muted-foreground">Dashboard complet, plus de clients</p>
                </div>
                <div className="flex items-center gap-1 text-primary">
                  <span className="text-[10px] font-semibold">Découvrir</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* GP Scan Sheet */}
      {gpId && (
        <GPScanSheet
          open={showScan}
          onOpenChange={setShowScan}
          gpId={gpId}
          isVerified={true}
        />
      )}

      {/* GP Pro Transition Sheet */}
      <GPProTransitionSheet
        open={showProTransition}
        onOpenChange={setShowProTransition}
        currentStats={trips.length > 0 ? {
          tripsPublished: trips.length,
          ordersCompleted: orders.filter(o => ["delivered", "delivery_confirmed"].includes(o.status)).length,
          totalEarnings: walletData?.balance || 0,
          currency: walletData?.currency || "XOF",
        } : undefined}
      />

      {/* Order Details Sheet */}
      {selectedOrderId && (
        <GPMissionDetailsSheet
          open={!!selectedOrderId}
          onClose={() => {
            setSelectedOrderId(null);
            fetchData(); // refresh after actions
          }}
          orderId={selectedOrderId}
          gpProfileId={gpId || undefined}
          gpName="Mon colis"
          onAccept={() => {
            setSelectedOrderId(null);
            fetchData();
          }}
          onRefuse={() => {
            setSelectedOrderId(null);
            fetchData();
          }}
          showActions={true}
        />
      )}
    </>
  );
}
