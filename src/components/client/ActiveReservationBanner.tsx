import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Package, MapPin, Eye, Phone, Clock, CheckCircle, Truck, X, Navigation, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DepositAddressPopup } from "@/components/client/DepositAddressPopup";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
interface ActiveOrder {
  id: string;
  order_number: string;
  status: string;
  origin_city: string;
  destination_city: string;
  gp_id: string;
  created_at: string;
  total_price: number;
  currency: string;
}
interface GPContactInfo {
  business_name: string;
  deposit_address: string | null;
  whatsapp_phone: string | null;
  phone: string | null;
  reception_address: string | null;
  phone_secondary: string | null;
}

/**
 * RÈGLE NOTIF-01: Bande persistante obligatoire
 * 
 * Dès que le GP accepte la réservation, une bande fixe apparaît
 * en haut de l'accueil client. Visible sur: accueil, dashboard, réservation active.
 * 
 * La bande reste active jusqu'à livraison confirmée.
 */
export function ActiveReservationBanner() {
  const location = useLocation();
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [gpInfo, setGpInfo] = useState<Record<string, GPContactInfo>>({});
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null);
  useEffect(() => {
    loadActiveOrders();

    // Subscribe to realtime updates
    const channel = supabase.channel("client-active-orders").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "orders"
    }, () => loadActiveOrders()).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const loadActiveOrders = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch pre-deposit orders only (accepted status = before deposit)
      // Banner disappears once GP confirms deposit (collected/in_transit/delivered)
      const {
        data: orders,
        error
      } = await supabase.from("orders").select("id, order_number, status, origin_city, destination_city, gp_id, created_at, total_price, currency").eq("client_id", user.id).in("status", ["accepted"]).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setActiveOrders(orders || []);

      // Fetch GP info for each order
      if (orders && orders.length > 0) {
        const gpIds = [...new Set(orders.map(o => o.gp_id))];
        const {
          data: gpData
        } = await supabase.from("gp_profiles").select("id, business_name, deposit_address, whatsapp_phone, phone, reception_address, phone_secondary").in("id", gpIds);
        if (gpData) {
          const gpMap: Record<string, GPContactInfo> = {};
          gpData.forEach(gp => {
            gpMap[gp.id] = gp;
          });
          setGpInfo(gpMap);
        }
      }
    } catch (error) {
      console.error("Error loading active orders:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleViewDetails = (order: ActiveOrder) => {
    setSelectedOrder(order);
    setSheetOpen(true);
  };
  const handleWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // Get status info
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, {
      label: string;
      color: string;
      emoji: string;
    }> = {
      accepted: {
        label: "Acceptée",
        color: "bg-green-500",
        emoji: "✅"
      },
      collected: {
        label: "Collecté",
        color: "bg-blue-500",
        emoji: "📦"
      },
      in_transit: {
        label: "En transit",
        color: "bg-orange-500",
        emoji: "🚚"
      }
    };
    return statusMap[status] || {
      label: status,
      color: "bg-muted",
      emoji: "📦"
    };
  };

  // Filter visible orders (not dismissed)
  const visibleOrders = activeOrders.filter(o => !dismissed.includes(o.id));

  // Don't show on auth page
  if (location.pathname === "/auth" || loading || visibleOrders.length === 0) {
    return null;
  }

  // Show the most important order (most recent accepted)
  const primaryOrder = visibleOrders[0];
  const gp = primaryOrder ? gpInfo[primaryOrder.gp_id] : null;
  const statusInfo = primaryOrder ? getStatusInfo(primaryOrder.status) : null;

  // Determine what info is released based on status
  const isAccepted = primaryOrder?.status === "accepted" || primaryOrder?.status === "collected" || primaryOrder?.status === "in_transit";
  const isDelivered = primaryOrder?.status === "delivered";

  // Released info based on PRD rules
  const releasedInfo = {
    depositAddress: isAccepted && gp?.deposit_address,
    whatsapp: isAccepted && (gp?.whatsapp_phone || gp?.phone),
    receptionAddress: isDelivered && gp?.reception_address,
    secondaryPhone: isDelivered && gp?.phone_secondary
  };
  return <AnimatePresence>
      <motion.div initial={{
      opacity: 0,
      y: -50
    }} animate={{
      opacity: 1,
      y: 0
    }} exit={{
      opacity: 0,
      y: -50
    }} className="sticky top-0 left-0 right-0 z-40" style={{
      paddingTop: "var(--safe-top, 0px)"
    }}>
        {/* Active Order Banner */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusInfo?.color || 'bg-primary/20'}`}>
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold truncate">
                  {primaryOrder.origin_city} → {primaryOrder.destination_city}
                </span>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {statusInfo?.label || primaryOrder.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                #{primaryOrder.order_number?.slice(-6)} · {visibleOrders.length > 1 ? `+${visibleOrders.length - 1} autre(s)` : ""}
              </p>
            </div>
            {/* PRV §9: Deposit address popup */}
            {releasedInfo.depositAddress && gp?.deposit_address && (
              <DepositAddressPopup
                depositAddress={gp.deposit_address}
                phone={gp.phone}
                whatsapp={gp.whatsapp_phone}
                gpName={gp.business_name}
                isActive={primaryOrder.status === "accepted"}
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 w-8 h-8"
              onClick={() => setDismissed(prev => [...prev, primaryOrder.id])}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>;
}

/**
 * Hook to check if client has active reservations
 */
export function useClientActiveReservations() {
  const [hasActive, setHasActive] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const checkActive = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const {
        count: orderCount
      } = await supabase.from("orders").select("id", {
        count: "exact",
        head: true
      }).eq("client_id", user.id).in("status", ["accepted"]);
      setCount(orderCount || 0);
      setHasActive((orderCount || 0) > 0);
      setLoading(false);
    };
    checkActive();
  }, []);
  return {
    hasActive,
    count,
    loading
  };
}