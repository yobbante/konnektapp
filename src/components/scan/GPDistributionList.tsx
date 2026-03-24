/**
 * GPDistributionList — Interactive distribution list for GP
 * Shows all accepted/active parcels grouped by delivery status
 * "Livrer" button triggers delivery code flow directly from distribution list
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, ChevronDown, Loader2, Inbox, Truck,
  MapPin, Clock, CheckCircle, Send, Phone, KeyRound, ShieldCheck
} from "lucide-react";
import QRCodeDisplay from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DistributionItem {
  id: string;
  order_number: string;
  status: string;
  weight: number;
  origin_city: string;
  destination_city: string;
  client_name: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  total_price: number;
  currency: string;
  delivery_code: string | null;
}

interface GPDistributionListProps {
  gpId: string;
}

type FilterKey = "pending" | "active" | "arrived" | "delivered";

const FILTERS: { key: FilterKey; label: string; icon: React.ComponentType<{ className?: string }>; statuses: string[] }[] = [
  { key: "pending", label: "En attente", icon: Clock, statuses: ["pending", "accepted"] },
  { key: "active", label: "En cours", icon: Truck, statuses: ["collected", "checked_in", "paid_held", "weight_pending_payment", "scheduled_departure", "in_transit"] },
  { key: "arrived", label: "Arrivé", icon: MapPin, statuses: ["arrived_destination", "delivery_pending"] },
  { key: "delivered", label: "Livré", icon: CheckCircle, statuses: ["delivery_confirmed", "delivered", "released"] },
];

const DELIVERY_ELIGIBLE_STATUSES = ["checked_in", "collected", "scheduled_departure", "in_transit", "arrived_destination", "delivery_pending"];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "text-amber-400 bg-amber-500/15" },
  accepted: { label: "Accepté", color: "text-blue-400 bg-blue-500/15" },
  collected: { label: "Collecté", color: "text-sky-400 bg-sky-500/15" },
  checked_in: { label: "Enregistré", color: "text-primary bg-primary/15" },
  paid_held: { label: "Paiement reçu", color: "text-emerald-400 bg-emerald-500/15" },
  weight_pending_payment: { label: "Supplément", color: "text-red-400 bg-red-500/15" },
  scheduled_departure: { label: "Départ programmé", color: "text-sky-400 bg-sky-500/15" },
  in_transit: { label: "En transit", color: "text-purple-400 bg-purple-500/15" },
  arrived_destination: { label: "Arrivé", color: "text-indigo-400 bg-indigo-500/15" },
  delivery_pending: { label: "Code envoyé", color: "text-amber-400 bg-amber-500/15" },
  delivery_confirmed: { label: "Livré", color: "text-emerald-400 bg-emerald-500/15" },
  delivered: { label: "Livré", color: "text-emerald-400 bg-emerald-500/15" },
  released: { label: "Terminé", color: "text-emerald-400 bg-emerald-500/15" },
};

export function GPDistributionList({ gpId }: GPDistributionListProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<DistributionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveryState, setDeliveryState] = useState<Record<string, { phase: "idle" | "sending" | "code"; code: string; executing: boolean }>>({});

  useEffect(() => {
    loadOrders();
  }, [gpId]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, weight, origin_city, destination_city, client_id, total_price, currency, recipient_name, recipient_phone, delivery_code")
        .eq("gp_id", gpId)
        .not("status", "in", "(cancelled)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const clientIds = [...new Set(data.map(o => o.client_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", clientIds);

        const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        setOrders(data.map(o => ({
          ...o,
          client_name: nameMap.get(o.client_id) || null,
        })));
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Load distribution orders error:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getDeliveryState = (orderId: string) => {
    return deliveryState[orderId] || { phase: "idle", code: "", executing: false };
  };

  const setOrderDeliveryState = (orderId: string, patch: Partial<{ phase: "idle" | "sending" | "code"; code: string; executing: boolean }>) => {
    setDeliveryState(prev => ({
      ...prev,
      [orderId]: { ...getDeliveryState(orderId), ...patch },
    }));
  };

  const handleInitiateDelivery = async (orderId: string) => {
    setOrderDeliveryState(orderId, { phase: "sending", executing: true });
    try {
      const { data, error } = await supabase.functions.invoke("scan-engine", {
        body: { action: "prepare_delivery", order_id: orderId },
      });
      if (error) throw error;
      setOrderDeliveryState(orderId, { phase: "code", executing: false });
      toast({ title: "Code envoyé", description: "Le code de livraison a été envoyé au client et au destinataire." });
      loadOrders();
    } catch (err: any) {
      console.error("Initiate delivery error:", err);
      toast({ title: "Erreur", description: err.message || "Impossible d'initier la livraison", variant: "destructive" });
      setOrderDeliveryState(orderId, { phase: "idle", executing: false });
    }
  };

  const handleConfirmDelivery = async (orderId: string) => {
    const state = getDeliveryState(orderId);
    if (state.code.length < 4) return;
    setOrderDeliveryState(orderId, { executing: true });
    try {
      const { data, error } = await supabase.functions.invoke("scan-engine", {
        body: { action: "confirm_delivery", order_id: orderId, data: { delivery_code: state.code } },
      });
      if (error) throw error;
      toast({ title: "Livraison confirmée", description: "Le colis a été livré avec succès !" });
      setOrderDeliveryState(orderId, { phase: "idle", code: "", executing: false });
      loadOrders();
    } catch (err: any) {
      console.error("Confirm delivery error:", err);
      toast({ title: "Code incorrect", description: err.message || "Le code est invalide. Réessayez.", variant: "destructive" });
      setOrderDeliveryState(orderId, { executing: false });
    }
  };

  const filteredOrders = orders.filter(o => {
    const filter = FILTERS.find(f => f.key === activeFilter);
    return filter?.statuses.includes(o.status);
  });

  const filterCounts = FILTERS.map(f => ({
    ...f,
    count: orders.filter(o => f.statuses.includes(o.status)).length,
  }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        <span className="text-xs font-medium text-white/35">Chargement des colis...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="grid grid-cols-4 gap-1.5">
        {filterCounts.map(f => {
          const Icon = f.icon;
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-center",
                isActive
                  ? "bg-amber-500/15 border-amber-400/30 text-amber-400"
                  : "bg-white/[0.03] border-white/[0.06] text-white/35 hover:text-white/60"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold">{f.label}</span>
              <Badge className={cn(
                "text-[9px] h-4 px-1.5",
                isActive ? "bg-amber-500/25 text-amber-400 border-amber-400/30" : "bg-white/[0.05] text-white/30 border-white/[0.08]"
              )}>
                {f.count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Inbox className="w-7 h-7 text-amber-400" />
          </div>
          <p className="text-sm font-medium text-white/60">Aucun colis dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-xs text-white/30">
            {filteredOrders.length} colis · Appuyez pour les détails
          </p>

          {filteredOrders.map(order => {
            const isExpanded = expandedId === order.id;
            const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: "text-white/50 bg-white/5" };
            const canDeliver = DELIVERY_ELIGIBLE_STATUSES.includes(order.status);
            const isDeliveryPending = order.status === "delivery_pending";
            const ds = getDeliveryState(order.id);

            return (
              <motion.div
                key={order.id}
                layout
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full p-3.5 flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white/90 truncate">
                        {order.origin_city} → {order.destination_city}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono text-white/35">{order.order_number}</span>
                      <span className="text-[11px] text-white/35">{order.weight} kg</span>
                      {order.client_name && (
                        <span className="text-[11px] text-white/35">· {order.client_name}</span>
                      )}
                    </div>
                  </div>
                  <span className={cn("text-[9px] font-bold px-2 py-1 rounded-full", statusInfo.color)}>
                    {statusInfo.label}
                  </span>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-white/35" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 space-y-3">
                        <div className="h-px w-full bg-white/[0.05]" />

                        {/* Financial info */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-white/[0.03] p-2.5">
                            <p className="text-[9px] text-white/30 uppercase">Montant</p>
                            <p className="text-sm font-bold text-white/90">{order.total_price?.toLocaleString()} {order.currency}</p>
                          </div>
                          <div className="rounded-xl bg-white/[0.03] p-2.5">
                            <p className="text-[9px] text-white/30 uppercase">Destinataire</p>
                            <p className="text-sm font-semibold text-white/90 truncate">
                              {order.recipient_name || order.client_name || "—"}
                            </p>
                          </div>
                        </div>

                        {/* Recipient phone */}
                        {order.recipient_phone && (
                          <a
                            href={`tel:${order.recipient_phone}`}
                            className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-400/20 rounded-xl px-3 py-2"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {order.recipient_phone}
                          </a>
                        )}

                        {/* QR Code */}
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-[10px] text-white/30">QR du colis</p>
                          <div className="bg-white rounded-xl p-3">
                            <QRCodeDisplay value={order.order_number} size={120} />
                          </div>
                        </div>

                        {/* Delivery code flow — inline */}
                        {(canDeliver || isDeliveryPending) && (
                          <div className="rounded-xl border-2 border-emerald-400/20 bg-emerald-500/5 p-3 space-y-2.5">
                            {(ds.phase === "idle" && !isDeliveryPending) ? (
                              <>
                                <p className="text-xs text-white/50">Envoyez le code au client pour confirmer la remise</p>
                                <Button
                                  className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold"
                                  onClick={() => handleInitiateDelivery(order.id)}
                                  disabled={ds.executing}
                                >
                                  {ds.executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1.5" /> Envoyer le code</>}
                                </Button>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <KeyRound className="w-4 h-4 text-emerald-400" />
                                  <p className="text-xs font-semibold text-emerald-400">Saisir le code du client</p>
                                </div>
                                <Input
                                  value={ds.code}
                                  onChange={(e) => setOrderDeliveryState(order.id, { code: e.target.value.toUpperCase() })}
                                  placeholder="Ex: A3F29B"
                                  className="font-mono text-center text-lg tracking-[0.3em] h-12 border-2 border-emerald-400/30 bg-emerald-500/5"
                                  maxLength={6}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 text-xs border-white/10"
                                    onClick={() => setOrderDeliveryState(order.id, { phase: "idle", code: "" })}
                                    disabled={ds.executing}
                                  >
                                    Retour
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-9 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold"
                                    onClick={() => handleConfirmDelivery(order.id)}
                                    disabled={ds.executing || ds.code.length < 4}
                                  >
                                    {ds.executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ShieldCheck className="w-3.5 h-3.5 mr-1" /> Valider</>}
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <button
                          onClick={() => navigate(`/gp/order/${order.id}`)}
                          className="w-full py-2.5 rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-400 text-xs font-semibold"
                        >
                          Détails
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}