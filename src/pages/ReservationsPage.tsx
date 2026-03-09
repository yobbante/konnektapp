import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package, Truck, ChevronRight,
  Clock, CheckCircle, XCircle, FileText, Inbox
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { RecipientTrackingCard } from "@/components/client/RecipientTrackingCard";
import { OrderDetailSheet, getTransportIcon } from "@/components/client/OrderDetailSheet";
import { ClientMissionsView } from "@/components/routier/ClientMissionsView";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-amber-500/20 text-amber-600" },
  accepted: { label: "Accepté", color: "bg-green-500/20 text-green-600" },
  collected: { label: "Collecté", color: "bg-blue-500/20 text-blue-600" },
  paid_held: { label: "Paiement reçu", color: "bg-emerald-500/20 text-emerald-600" },
  checked_in: { label: "Déposé", color: "bg-indigo-500/20 text-indigo-600" },
  weight_pending_payment: { label: "Supplément requis", color: "bg-orange-500/20 text-orange-600" },
  scheduled_departure: { label: "Départ programmé", color: "bg-violet-500/20 text-violet-600" },
  in_transit: { label: "En transit", color: "bg-blue-500/20 text-blue-600" },
  arrived_destination: { label: "Arrivé", color: "bg-teal-500/20 text-teal-600" },
  delivery_pending: { label: "Livraison en cours", color: "bg-cyan-500/20 text-cyan-600" },
  delivered: { label: "Livré", color: "bg-green-500/20 text-green-700" },
  delivery_confirmed: { label: "Livré", color: "bg-emerald-500/20 text-emerald-700" },
  cancelled: { label: "Annulée", color: "bg-destructive/20 text-destructive" },
  rejected: { label: "Refusée", color: "bg-destructive/20 text-destructive" },
  expired: { label: "Expirée", color: "bg-muted text-muted-foreground" },
  // Custom request statuses
  open: { label: "Ouverte", color: "bg-amber-500/20 text-amber-600" },
  has_responses: { label: "Réponses reçues", color: "bg-blue-500/20 text-blue-600" },
  closed: { label: "Fermée", color: "bg-muted text-muted-foreground" },
};

const ACTIVE_STATUSES = ['pending', 'accepted', 'collected', 'paid_held', 'checked_in', 'weight_pending_payment', 'scheduled_departure', 'in_transit', 'arrived_destination', 'delivery_pending'];
const DELIVERED_STATUSES = ['delivered', 'delivery_confirmed', 'released'];
const CANCELLED_STATUSES = ['cancelled', 'rejected', 'expired'];

type TabId = "actives" | "annulees" | "livrees" | "colis" | "demandes";

const TABS: { id: TabId; label: string; icon: typeof Clock }[] = [
  { id: "actives", label: "Actives", icon: Clock },
  { id: "colis", label: "Colis pour vous", icon: Package },
  { id: "demandes", label: "Demandes", icon: FileText },
  { id: "livrees", label: "Livrées", icon: CheckCircle },
  { id: "annulees", label: "Annulées", icon: XCircle },
];

export default function ReservationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "actives";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [orders, setOrders] = useState<any[]>([]);
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [ordersRes, requestsRes] = await Promise.all([
        supabase
          .from("orders")
          .select(`
            id, origin_city, destination_city, origin_country, destination_country,
            weight, status, order_number, total_price, currency, pickup_date, created_at,
            gp_id, price_per_kg, has_insurance, recipient_name, recipient_phone, tracking_code,
            gp_profiles(business_name, rating, gp_type, phone, whatsapp_phone, deposit_address, reception_address)
          `)
          .eq("client_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("custom_requests")
          .select("id, request_number, origin_city, destination_city, origin_country, destination_country, status, shipment_type, transport_type, weight_estimate, created_at, description")
          .eq("client_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (requestsRes.data) setCustomRequests(requestsRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "actives") return ACTIVE_STATUSES.includes(o.status);
    if (activeTab === "livrees") return DELIVERED_STATUSES.includes(o.status);
    if (activeTab === "annulees") return CANCELLED_STATUSES.includes(o.status);
    return false;
  });

  const getOrderIcon = (order: any) => {
    if (CANCELLED_STATUSES.includes(order.status)) return XCircle;
    if (DELIVERED_STATUSES.includes(order.status)) return CheckCircle;
    return getTransportIcon(order.gp_profiles?.gp_type);
  };

  const getTabCount = (tabId: TabId) => {
    if (tabId === "actives") return orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length;
    if (tabId === "livrees") return orders.filter(o => DELIVERED_STATUSES.includes(o.status)).length;
    if (tabId === "annulees") return orders.filter(o => CANCELLED_STATUSES.includes(o.status)).length;
    if (tabId === "demandes") return customRequests.length;
    if (tabId === "colis") return 0; // count handled internally by RecipientTrackingCard
    return 0;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <AppHeader title="Mes réservations" showBack />

      {/* Tabs - scrollable */}
      <div className="px-4 pt-3 pb-2 border-b border-border/50">
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = getTabCount(tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Tab: Colis pour vous */}
        {activeTab === "colis" && userId && (
          <RecipientTrackingCard userId={userId} listMode />
        )}

        {/* Tab: Demandes personnalisées */}
        {activeTab === "demandes" && (
          <div className="px-4 pt-3 space-y-4">
            {/* Routier Missions with full negotiation */}
            <ClientMissionsView />

            {/* Custom requests (GP/Fret) */}
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : customRequests.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Demandes personnalisees ({customRequests.length})
                </h3>
                {customRequests.map((req, i) => {
                  const cfg = STATUS_CONFIG[req.status] || { label: req.status, color: "bg-muted text-muted-foreground" };
                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => navigate(`/quote-confirmation?requestId=${req.id}`)}
                      className="bg-card border border-border rounded-xl p-3 active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-foreground truncate">
                              {req.origin_city} → {req.destination_city}
                            </p>
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              #{req.request_number?.slice(-6)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                            {req.shipment_type && <span className="capitalize">{req.shipment_type}</span>}
                            {req.weight_estimate && <span>{req.weight_estimate} kg</span>}
                            {req.transport_type && <span className="capitalize">{req.transport_type}</span>}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(req.created_at), "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Empty state when no missions AND no custom requests */}
            {!loading && customRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <FileText className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">Aucune demande personnalisée</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vos demandes GP et fret apparaîtront ici
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Orders (actives, livrees, annulees) */}
        {(activeTab === "actives" || activeTab === "livrees" || activeTab === "annulees") && (
          <>
            {/* Colis pour vous reminder on actives tab */}
            {activeTab === "actives" && userId && (
              <div className="pt-2">
                <RecipientTrackingCard userId={userId} />
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  {activeTab === "actives" && <Package className="w-7 h-7 text-muted-foreground" />}
                  {activeTab === "livrees" && <CheckCircle className="w-7 h-7 text-muted-foreground" />}
                  {activeTab === "annulees" && <XCircle className="w-7 h-7 text-muted-foreground" />}
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {activeTab === "actives" && "Aucune réservation active"}
                  {activeTab === "livrees" && "Aucune livraison effectuée"}
                  {activeTab === "annulees" && "Aucune réservation annulée"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeTab === "actives" && "Vos envois en cours apparaîtront ici"}
                  {activeTab === "livrees" && "Vos colis livrés s'afficheront ici"}
                  {activeTab === "annulees" && "Les réservations annulées seront listées ici"}
                </p>
              </div>
            ) : (
              <div className="px-4 pt-3 space-y-2">
                {filteredOrders.map((order, i) => {
                  const cfg = STATUS_CONFIG[order.status] || { label: order.status, color: "bg-muted text-muted-foreground" };
                  const Icon = getOrderIcon(order);

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedOrder(order)}
                      className="bg-card border border-border rounded-xl p-3 active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          CANCELLED_STATUSES.includes(order.status) ? 'bg-destructive/10' :
                          DELIVERED_STATUSES.includes(order.status) ? 'bg-green-500/10' : 'bg-primary/10'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            CANCELLED_STATUSES.includes(order.status) ? 'text-destructive' :
                            DELIVERED_STATUSES.includes(order.status) ? 'text-green-600' : 'text-primary'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-foreground truncate">
                              {order.origin_city} → {order.destination_city}
                            </p>
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              #{order.order_number?.slice(-6)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                            {order.weight && <span>{order.weight} kg</span>}
                            {order.total_price && (
                              <span className="font-medium text-foreground">
                                {order.total_price.toLocaleString()} {order.currency || "FCFA"}
                              </span>
                            )}
                            {order.gp_profiles?.business_name && (
                              <span className="truncate">· {order.gp_profiles.business_name}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(order.created_at), "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <MobileNav />
      <OrderDetailSheet
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
