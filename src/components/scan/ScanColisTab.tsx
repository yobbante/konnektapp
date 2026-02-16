/**
 * ScanColisTab — Shared "Mes Colis" tab with REAL data
 * 
 * Used by both ClientScanSheet and GPScanSheet (Layer 2)
 * and by ClientScanPage. Loads real orders from DB.
 * 
 * Features:
 * - Real-time order list from DB
 * - Expandable QR per order  
 * - Role-aware actions (track/confirm for client, manage/details for GP)
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, ChevronDown, Loader2, Inbox } from "lucide-react";
import QRCodeDisplay from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ScanAccent } from "./ScanHeart";

interface ColisItem {
  id: string;
  order_number: string;
  status: string;
  weight: number;
  origin_city: string;
  destination_city: string;
  client_name?: string | null;
}

interface ScanColisTabProps {
  role: "client" | "gp";
  accent?: ScanAccent;
  darkMode?: boolean;
  userId?: string | null;
  gpId?: string | null;
  onClose?: () => void;
  className?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "text-amber-400 bg-amber-500/15" },
  accepted: { label: "Accepté", color: "text-blue-400 bg-blue-500/15" },
  collected: { label: "Collecté", color: "text-sky-400 bg-sky-500/15" },
  in_transit: { label: "En transit", color: "text-purple-400 bg-purple-500/15" },
  arrived: { label: "Arrivé", color: "text-indigo-400 bg-indigo-500/15" },
  delivered: { label: "Livré", color: "text-emerald-400 bg-emerald-500/15" },
  cancelled: { label: "Annulé", color: "text-red-400 bg-red-500/15" },
};

export function ScanColisTab({ role, accent = "emerald", darkMode = true, userId, gpId, onClose, className }: ScanColisTabProps) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ColisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [userId, gpId]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select("id, order_number, status, weight, origin_city, destination_city, client_id")
        .in("status", ["pending", "accepted", "collected", "in_transit"] as any[])
        .order("created_at", { ascending: false })
        .limit(20);

      if (role === "client" && userId) {
        query = query.eq("client_id", userId);
      } else if (role === "gp" && gpId) {
        query = query.eq("gp_id", gpId);
      } else {
        setOrders([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;

      // For GP role, load client names
      if (role === "gp" && data && data.length > 0) {
        const clientIds = [...new Set(data.map(o => o.client_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", clientIds);

        const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        setOrders(data.map(o => ({ ...o, client_name: nameMap.get(o.client_id) || null })));
      } else {
        setOrders(data || []);
      }
    } catch (err) {
      console.error("Load orders error:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const accentColor = accent === "amber" ? "amber" : accent === "emerald" ? "emerald" : "blue";
  const iconBg = `bg-${accentColor}-500/10`;
  const iconText = `text-${accentColor}-400`;
  const textMain = darkMode ? "text-white/90" : "text-foreground";
  const textSub = darkMode ? "text-white/35" : "text-muted-foreground";
  const cardBg = darkMode ? "bg-white/[0.03] border-white/[0.06]" : "bg-card border-border";

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 gap-3", className)}>
        <Loader2 className={cn("w-6 h-6 animate-spin", iconText)} />
        <span className={cn("text-xs font-medium", textSub)}>Chargement des colis...</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 gap-3", className)}>
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", iconBg)}>
          <Inbox className={cn("w-7 h-7", iconText)} />
        </div>
        <p className={cn("text-sm font-medium", textMain)}>Aucun colis actif</p>
        <p className={cn("text-xs", textSub)}>
          {role === "client" ? "Réservez un envoi pour commencer" : "Publiez une offre pour recevoir des colis"}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <p className={cn("text-xs mb-1", textSub)}>
        {orders.length} colis actif{orders.length > 1 ? "s" : ""} — Appuyez pour le QR
      </p>

      {orders.map((order) => {
        const isExpanded = expandedId === order.id;
        const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "text-white/50 bg-white/5" };

        return (
          <motion.div
            key={order.id}
            layout
            className={cn("rounded-2xl border overflow-hidden", cardBg)}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : order.id)}
              className="w-full p-3.5 flex items-center gap-3 text-left"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
                <Package className={cn("w-5 h-5", iconText)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-semibold truncate", textMain)}>
                    {order.origin_city} → {order.destination_city}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn("text-[11px] font-mono", textSub)}>{order.order_number}</span>
                  <span className={cn("text-[11px]", textSub)}>{order.weight} kg</span>
                  {role === "gp" && order.client_name && (
                    <span className={cn("text-[11px]", textSub)}>· {order.client_name}</span>
                  )}
                </div>
              </div>
              <span className={cn("text-[9px] font-bold px-2 py-1 rounded-full", statusInfo.color)}>
                {statusInfo.label}
              </span>
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className={cn("w-4 h-4", textSub)} />
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
                  <div className="px-4 pb-4 pt-1 flex flex-col items-center gap-3">
                    <div className={cn("h-px w-full", darkMode ? "bg-white/[0.05]" : "bg-border")} />
                    <p className={cn("text-[10px] font-medium", textSub)}>
                      {role === "client" ? "QR à présenter au GP pour scan rapide" : "QR du colis — scan par le client"}
                    </p>
                    <div className="bg-white rounded-xl p-3">
                      <QRCodeDisplay value={order.order_number} size={140} />
                    </div>
                    <p className={cn("text-[10px] font-mono", textSub)}>{order.order_number}</p>
                    <div className="flex gap-2 w-full">
                      {role === "client" ? (
                        <>
                          <button
                            onClick={() => { onClose?.(); navigate(`/tracking?code=${order.order_number}`); }}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl text-xs font-semibold border",
                              accent === "emerald" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-400" : "border-primary/20 bg-primary/10 text-primary"
                            )}
                          >
                            Suivre
                          </button>
                          <button
                            onClick={() => { onClose?.(); navigate("/confirm-reception"); }}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl text-xs font-semibold border",
                              darkMode ? "border-white/[0.08] bg-white/[0.04] text-white/60" : "border-border bg-muted text-muted-foreground"
                            )}
                          >
                            Confirmer
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { onClose?.(); navigate("/gp/en-cours"); }}
                            className="flex-1 py-2.5 rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-400 text-xs font-semibold"
                          >
                            Gérer
                          </button>
                          <button
                            onClick={() => { onClose?.(); navigate(`/gp/order/${order.id}`); }}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl text-xs font-semibold border",
                              darkMode ? "border-white/[0.08] bg-white/[0.04] text-white/60" : "border-border bg-muted text-muted-foreground"
                            )}
                          >
                            Détails
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}