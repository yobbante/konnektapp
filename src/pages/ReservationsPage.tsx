import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Truck, ChevronRight, Bus, QrCode, Ticket,
  Clock, CheckCircle, XCircle, FileText, Inbox, MapPin, Calendar, Users,
  Star, Scale, Heart, Bell, AlertCircle } from
"lucide-react";
import { SmartActionBar } from "@/components/home/SmartActionBar";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { RecipientTrackingCard } from "@/components/client/RecipientTrackingCard";
import { OrderDetailSheet, getTransportIcon } from "@/components/client/OrderDetailSheet";
import { ClientMissionsView } from "@/components/routier/ClientMissionsView";
import { RateOrderDialog } from "@/components/RateOrderDialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_CONFIG: Record<string, {label: string;color: string;icon: typeof Clock;}> = {
  pending: { label: "En attente", color: "bg-amber-500/15 text-amber-600", icon: Clock },
  accepted: { label: "Accept\u00e9", color: "bg-green-500/15 text-green-600", icon: CheckCircle },
  collected: { label: "Collect\u00e9", color: "bg-blue-500/15 text-blue-600", icon: Package },
  paid_held: { label: "Paiement re\u00e7u", color: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle },
  checked_in: { label: "D\u00e9pos\u00e9", color: "bg-indigo-500/15 text-indigo-600", icon: Package },
  weight_pending_payment: { label: "Suppl\u00e9ment requis", color: "bg-orange-500/15 text-orange-600", icon: Clock },
  scheduled_departure: { label: "D\u00e9part programm\u00e9", color: "bg-violet-500/15 text-violet-600", icon: Truck },
  in_transit: { label: "En transit", color: "bg-blue-500/15 text-blue-600", icon: Truck },
  arrived_destination: { label: "Arriv\u00e9", color: "bg-teal-500/15 text-teal-600", icon: MapPin },
  delivery_pending: { label: "Livraison en cours", color: "bg-cyan-500/15 text-cyan-600", icon: Truck },
  delivered: { label: "Livr\u00e9", color: "bg-green-500/15 text-green-700", icon: CheckCircle },
  delivery_confirmed: { label: "Livr\u00e9", color: "bg-emerald-500/15 text-emerald-700", icon: CheckCircle },
  released: { label: "Termin\u00e9e", color: "bg-green-500/15 text-green-700", icon: CheckCircle },
  cancelled: { label: "Annul\u00e9e", color: "bg-destructive/15 text-destructive", icon: XCircle },
  rejected: { label: "Refus\u00e9e", color: "bg-destructive/15 text-destructive", icon: XCircle },
  expired: { label: "Expir\u00e9e", color: "bg-muted text-muted-foreground", icon: Clock },
  open: { label: "Ouverte", color: "bg-amber-500/15 text-amber-600", icon: Clock },
  has_responses: { label: "R\u00e9ponses re\u00e7ues", color: "bg-blue-500/15 text-blue-600", icon: FileText },
  closed: { label: "Ferm\u00e9e", color: "bg-muted text-muted-foreground", icon: XCircle },
  active: { label: "Actif", color: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle },
  confirmed: { label: "Confirm\u00e9", color: "bg-green-500/15 text-green-600", icon: CheckCircle },
  completed: { label: "Termin\u00e9", color: "bg-muted text-muted-foreground", icon: CheckCircle }
};

const ACTIVE_STATUSES = ['pending', 'accepted', 'collected', 'paid_held', 'checked_in', 'weight_pending_payment', 'scheduled_departure', 'in_transit', 'arrived_destination', 'delivery_pending'];
const DELIVERED_STATUSES = ['delivered', 'delivery_confirmed', 'released'];
const CANCELLED_STATUSES = ['cancelled', 'rejected', 'expired'];

// Statuses that indicate a recent important change the user should see
const NOTIFICATION_STATUSES = ['accepted', 'collected', 'in_transit', 'arrived_destination', 'delivery_pending', 'delivered', 'delivery_confirmed', 'weight_pending_payment'];

type TabId = "actives" | "colis" | "tickets" | "demandes" | "historique";

const TABS: {id: TabId;label: string;icon: typeof Clock;}[] = [
{ id: "actives", label: "En cours", icon: Clock },
{ id: "colis", label: "Colis entrants", icon: Package },
{ id: "demandes", label: "Missions", icon: FileText },
{ id: "tickets", label: "Tickets", icon: Ticket },
{ id: "historique", label: "Historique", icon: CheckCircle }];


export default function ReservationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") as TabId || "actives";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [orders, setOrders] = useState<any[]>([]);
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [mobilityBookings, setMobilityBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [recipientCount, setRecipientCount] = useState(0);
  const [recentlyChangedOrders, setRecentlyChangedOrders] = useState<Set<string>>(new Set());
  const [tabNotifications, setTabNotifications] = useState<Record<TabId, number>>({ actives: 0, tickets: 0, colis: 0, demandes: 0, historique: 0 });
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [supplementOrders, setSupplementOrders] = useState<any[]>([]);
  const [ratingOrder, setRatingOrder] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [ordersRes, requestsRes, recipientRes, mobilityRes] = await Promise.all([
      supabase.
      from("orders").
      select(`
            id, origin_city, destination_city, origin_country, destination_country,
            weight, status, order_number, total_price, currency, pickup_date, created_at, updated_at,
            gp_id, price_per_kg, has_insurance, recipient_name, recipient_phone, tracking_code,
            gp_profiles(business_name, rating, gp_type, phone, whatsapp_phone, deposit_address, reception_address)
          `).
      eq("client_id", user.id).
      order("created_at", { ascending: false }),
      supabase.
      from("custom_requests").
      select("id, request_number, origin_city, destination_city, origin_country, destination_country, status, shipment_type, transport_type, weight_estimate, created_at, description").
      eq("client_id", user.id).
      order("created_at", { ascending: false }).
      limit(50),
      supabase.
      from("orders").
      select("id", { count: "exact", head: true }).
      eq("recipient_user_id", user.id).
      not("status", "in", '("cancelled","released")'),
      supabase.
      from("mobility_bookings").
      select("*, mobility_profiles:mobility_profile_id(business_name)").
      eq("client_id", user.id).
      order("created_at", { ascending: false })]
      );

      const allOrders = ordersRes.data || [];
      setOrders(allOrders);
      if (requestsRes.data) setCustomRequests(requestsRes.data);
      setRecipientCount(recipientRes.count ?? 0);
      if (mobilityRes.data) setMobilityBookings(mobilityRes.data);

      // Detect recently changed orders (updated in last 2 hours & status is notable)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const recentIds = new Set<string>();
      let activeNotifs = 0;
      let histNotifs = 0;

      allOrders.forEach((o: any) => {
        if (o.updated_at > twoHoursAgo && NOTIFICATION_STATUSES.includes(o.status)) {
          recentIds.add(o.id);
          if (ACTIVE_STATUSES.includes(o.status)) activeNotifs++;
          if (DELIVERED_STATUSES.includes(o.status)) histNotifs++;
        }
      });
      setRecentlyChangedOrders(recentIds);
      setTabNotifications((prev) => ({ ...prev, actives: activeNotifs, historique: histNotifs }));

      // Supplements
      setSupplementOrders(allOrders.filter((o: any) => o.status === "weight_pending_payment"));

      // Pending reviews
      const delivered = allOrders.filter((o: any) => DELIVERED_STATUSES.includes(o.status));
      if (delivered.length > 0) {
        const orderIds = delivered.map((o: any) => o.id);
        const gpIds = [...new Set(delivered.map((o: any) => o.gp_id))];
        const [reviewsRes, gpRes] = await Promise.all([
        supabase.from("reviews").select("order_id").in("order_id", orderIds),
        supabase.from("gp_profiles").select("id, business_name").in("id", gpIds)]
        );
        const reviewedIds = new Set((reviewsRes.data || []).map((r: any) => r.order_id));
        const gpNames: Record<string, string> = {};
        (gpRes.data || []).forEach((gp: any) => {gpNames[gp.id] = gp.business_name;});
        // Deduplicate by order id
        const seenIds = new Set<string>();
        setPendingReviews(
          delivered.
          filter((o: any) => {
            if (reviewedIds.has(o.id) || seenIds.has(o.id)) return false;
            seenIds.add(o.id);
            return true;
          }).
          map((o: any) => ({ ...o, gp_name: gpNames[o.gp_id] || "Transporteur" }))
        );
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.
    channel("reservations-rt").
    on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `client_id=eq.${userId}` }, () => loadData()).
    subscribe();
    return () => {supabase.removeChannel(channel);};
  }, [userId]);

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const historyOrders = orders.filter((o) => DELIVERED_STATUSES.includes(o.status) || CANCELLED_STATUSES.includes(o.status));

  const getOrderIcon = (order: any) => {
    if (CANCELLED_STATUSES.includes(order.status)) return XCircle;
    if (DELIVERED_STATUSES.includes(order.status)) return CheckCircle;
    return getTransportIcon(order.gp_profiles?.gp_type);
  };

  const getTabCount = (tabId: TabId) => {
    if (tabId === "actives") return activeOrders.length;
    if (tabId === "historique") return historyOrders.length;
    if (tabId === "demandes") return customRequests.length;
    if (tabId === "colis") return recipientCount;
    if (tabId === "tickets") return mobilityBookings.length;
    return 0;
  };

  const getTabNotifCount = (tabId: TabId) => tabNotifications[tabId] || 0;

  const getTypeCardStyle = (gpType?: string) => {
    // Subtle: only icon gets colored, card border stays neutral
    const styles: Record<string, {iconColor: string;iconBg: string;}> = {
      routier: { iconColor: "text-transport-routier", iconBg: "bg-transport-routier/10" },
      maritime: { iconColor: "text-transport-maritime", iconBg: "bg-transport-maritime/10" },
      aerien: { iconColor: "text-transport-aerien", iconBg: "bg-transport-aerien/10" },
      mobility: { iconColor: "text-transport-mobility", iconBg: "bg-transport-mobility/10" }
    };
    return styles[gpType || ""] || { iconColor: "text-transport-voyageur", iconBg: "bg-transport-voyageur/10" };
  };

  const renderOrderCard = (order: any, i: number) => {
    const cfg = STATUS_CONFIG[order.status] || { label: order.status, color: "bg-muted text-muted-foreground", icon: Clock };
    const Icon = getOrderIcon(order);
    const isCancelled = CANCELLED_STATUSES.includes(order.status);
    const isDelivered = DELIVERED_STATUSES.includes(order.status);
    const isRecentChange = recentlyChangedOrders.has(order.id);
    const typeStyle = getTypeCardStyle(order.gp_profiles?.gp_type);

    return (
      <motion.div
        key={order.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.03 }}
        onClick={() => setSelectedOrder(order)}
        className={`bg-card border rounded-2xl p-3.5 active:scale-[0.98] transition-all cursor-pointer relative ${
        isRecentChange ? "border-primary/40 shadow-md ring-1 ring-primary/20" : "border-border"}`
        }>
        
        {isRecentChange &&
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-pulse" />
        }
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isCancelled ? 'bg-destructive/10' :
          isDelivered ? 'bg-green-500/10' : typeStyle.iconBg}`
          }>
            <Icon className={`w-5 h-5 ${
            isCancelled ? 'text-destructive' :
            isDelivered ? 'text-green-600' : typeStyle.iconColor}`
            } />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-foreground truncate">
                {order.origin_city} → {order.destination_city}
              </p>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>

            <div className="flex items-center gap-1.5 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
                {cfg.label}
              </span>
              {isRecentChange &&
              <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  MAJ
                </span>
              }
              <span className="text-[10px] text-muted-foreground font-mono">
                #{order.order_number?.slice(-6)}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {order.weight > 0 &&
              <span className="text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                  {order.weight} kg
                </span>
              }
              {order.total_price > 0 &&
              <span className="text-[11px] font-semibold text-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                  {order.total_price.toLocaleString()} {order.currency || "FCFA"}
                </span>
              }
              {order.gp_profiles?.business_name &&
              <span className="text-[10px] text-muted-foreground">
                  {order.gp_profiles.business_name}
                </span>
              }
            </div>
          </div>
        </div>
      </motion.div>);

  };

  const renderMobilityCard = (booking: any, i: number) => {
    const status = booking.status || "active";
    const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-muted text-muted-foreground", icon: Clock };
    const isScanned = !!booking.scanned_at;

    return (
      <motion.div
        key={booking.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.03 }}
        className="bg-card border border-border rounded-2xl overflow-hidden">
        
        {/* Top colored strip */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
        
        <div className="p-3.5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Bus className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              {/* Route */}
              <p className="text-sm font-bold text-foreground truncate">
                {booking.origin_city} → {booking.destination_city}
              </p>

              {/* Status */}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
                  {isScanned ? "Scanne" : cfg.label}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {booking.booking_number}
                </span>
              </div>

              {/* Details */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(booking.departure_date), "d MMM", { locale: fr })}
                </span>
                <span className="text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                  {booking.departure_time?.slice(0, 5)}
                </span>
                <span className="text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {booking.passenger_count} {booking.passenger_count > 1 ? "passagers" : "passager"}
                </span>
              </div>

              {/* Price + transporteur */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-bold text-emerald-600">
                  {booking.total_price?.toLocaleString()} {booking.currency || "XOF"}
                </span>
                {booking.mobility_profiles?.business_name &&
                <span className="text-[10px] text-muted-foreground truncate max-w-[45%]">
                    {booking.mobility_profiles.business_name}
                  </span>
                }
              </div>
            </div>
          </div>

          {/* QR Ticket Button */}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 text-xs h-9 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
              onClick={() => navigate(`/mobility/ticket?id=${booking.id}`)}>
              
              <QrCode className="w-3.5 h-3.5" />
              Voir mon ticket QR
            </Button>
            {booking.boarding_code &&
            <div className="flex items-center gap-1 px-3 bg-muted/50 rounded-lg">
                <Ticket className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] font-mono font-bold text-foreground">{booking.boarding_code}</span>
              </div>
            }
          </div>
        </div>
      </motion.div>);

  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <AppHeader title="Mes réservations" showBack />

      {/* Tabs */}
      <div className="px-3 pt-3 pb-2 border-b border-border/50">
        <div className="grid grid-cols-5 gap-0.5 bg-muted/50 rounded-xl p-0.5">
          {TABS.map((tab) => {
            const isActiveTab = activeTab === tab.id;
            const count = getTabCount(tab.id);
            const notifCount = getTabNotifCount(tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 rounded-lg text-[9px] font-semibold transition-all leading-tight text-center ${
                isActiveTab ?
                "bg-card text-foreground shadow-sm" :
                "text-muted-foreground"}`
                }>
                
                <tab.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate w-full">{tab.label}</span>
                <span className={`text-[8px] min-w-[14px] text-center px-0.5 py-0 rounded-full font-bold leading-none ${
                isActiveTab ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`
                }>
                    {count}
                  </span>
                {notifCount > 0 && !isActiveTab &&
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary animate-pulse" />
                }
              </button>);

          })}
        </div>
      </div>

      {/* Smart Action Bar — visible across all tabs */}
      {userId &&
      <SmartActionBar
        userId={userId}
        recentOrders={orders}
        activeOrdersCount={activeOrders.length}
        unreadMessages={0} />

      }

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
        
        {/* Tab: Tickets Mobilité */}
        {activeTab === "tickets" &&
        <div className="px-4 pt-3 space-y-3">
            {loading ?
          <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div> :
          mobilityBookings.length === 0 ?
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Ticket className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-foreground">Aucun ticket de transport</p>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-[250px]">
                  Réservez une place sur une navette pour obtenir votre ticket QR ici
                </p>
                <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => navigate("/")}>
              
                  <Bus className="w-3.5 h-3.5" />
                  Explorer les trajets
                </Button>
              </div> :

          mobilityBookings.map((bk, i) => renderMobilityCard(bk, i))
          }
          </div>
        }

        {/* Tab: Colis pour vous */}
        {activeTab === "colis" && userId &&
        <RecipientTrackingCard userId={userId} listMode />
        }

        {/* Tab: Demandes personnalisées */}
        {activeTab === "demandes" &&
        <div className="px-4 pt-3 space-y-4">
            <ClientMissionsView />

            {loading ?
          <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div> :
          customRequests.length > 0 &&
          <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Demandes personnalisées ({customRequests.length})
                </h3>
                {customRequests.map((req, i) => {
              const cfg = STATUS_CONFIG[req.status] || { label: req.status, color: "bg-muted text-muted-foreground", icon: Clock };
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/quote-confirmation?requestId=${req.id}`)}
                  className="bg-card border border-border rounded-2xl p-3.5 active:scale-[0.98] transition-transform cursor-pointer">
                  
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-foreground truncate">
                              {req.origin_city} → {req.destination_city}
                            </p>
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              #{req.request_number?.slice(-6)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {req.shipment_type &&
                        <span className="text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded capitalize">
                                {req.shipment_type}
                              </span>
                        }
                            {req.weight_estimate &&
                        <span className="text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                {req.weight_estimate} kg
                              </span>
                        }
                            {req.transport_type &&
                        <span className="text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded capitalize">
                                {req.transport_type}
                              </span>
                        }
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {format(new Date(req.created_at), "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    </motion.div>);

            })}
              </div>
          }

            {!loading && customRequests.length === 0 &&
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <FileText className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold text-foreground">Aucune demande</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vos demandes GP et fret apparaîtront ici
                </p>
              </div>
          }
          </div>
        }

        {/* Tab: En cours */}
        {activeTab === "actives" &&
        <>
            {/* Pending actions: supplements, reviews */}
            {!loading && (supplementOrders.length > 0 || pendingReviews.length > 0) &&
          <div className="px-4 pt-3 space-y-2">
                {supplementOrders.map((o) =>
            <button
              key={`supp-${o.id}`}
              onClick={() => navigate(`/supplement/${o.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-destructive/30 bg-destructive/5 active:scale-[0.98] transition-all">
              
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <Scale className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-destructive">Supplement requis</p>
                      <p className="text-[11px] text-muted-foreground">{o.order_number} - Payez le supplement poids</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
            )}
                {pendingReviews.slice(0, 2).map((o) => (
                  <button
                    key={`rev-${o.id}`}
                    onClick={() => {
                      setRatingOrder(o);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 active:scale-[0.98] transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-amber-600">Notez votre transporteur</p>
                      <p className="text-[11px] text-muted-foreground">{o.order_number} - {o.origin_city} → {o.destination_city}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
          }


            {loading ?
          <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div> :
          activeOrders.length === 0 ?
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm font-bold text-foreground">Aucune reservation en cours</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Vos envois actifs apparaitront ici
                </p>
              </div> :

          <div className="px-4 pt-3 space-y-2.5">
                {activeOrders.map((order, i) => renderOrderCard(order, i))}
              </div>
          }
          </>
        }

        {/* Tab: Historique (livrées + annulées) */}
        {activeTab === "historique" &&
        <>
            {loading ?
          <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div> :
          historyOrders.length === 0 ?
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold text-foreground">Aucun historique</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Vos commandes livrées et annulées apparaîtront ici
                </p>
              </div> :

          <div className="px-4 pt-3 space-y-2.5">
                {historyOrders.map((order, i) => renderOrderCard(order, i))}
              </div>
          }
          </>
        }
      </div>

      <MobileNav />

      <OrderDetailSheet
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)} />
      
      {ratingOrder &&
      <RateOrderDialog
        open={!!ratingOrder}
        onOpenChange={(open) => {if (!open) setRatingOrder(null);}}
        orderId={ratingOrder.id}
        gpId={ratingOrder.gp_id}
        gpName={ratingOrder.gp_name}
        onSuccess={() => {
          setPendingReviews((prev) => prev.filter((r) => r.id !== ratingOrder.id));
          setRatingOrder(null);
        }} />

      }
    </div>);

}