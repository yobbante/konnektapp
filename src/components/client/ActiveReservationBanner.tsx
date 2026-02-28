import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Package, MapPin, Eye, Phone, Clock, CheckCircle, Truck, X, Navigation, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
 * Visible dès qu'une commande est acceptée, disparaît une fois collectée par le GP.
 * Se déplie au clic pour afficher les détails.
 */
export function ActiveReservationBanner() {
  const location = useLocation();
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [gpInfo, setGpInfo] = useState<Record<string, GPContactInfo>>({});
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadActiveOrders();
    const channel = supabase.channel("client-active-orders").on("postgres_changes", {
      event: "*", schema: "public", table: "orders"
    }, () => loadActiveOrders()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadActiveOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Show for "accepted" only — disappears once checked_in (deposit confirmed) or beyond
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, order_number, status, origin_city, destination_city, gp_id, created_at, total_price, currency")
        .eq("client_id", user.id)
        .in("status", ["accepted"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActiveOrders(orders || []);

      if (orders && orders.length > 0) {
        const gpIds = [...new Set(orders.map(o => o.gp_id))];
        const { data: gpData } = await supabase
          .from("gp_profiles")
          .select("id, business_name, deposit_address, whatsapp_phone, phone, reception_address, phone_secondary")
          .in("id", gpIds);
        if (gpData) {
          const gpMap: Record<string, GPContactInfo> = {};
          gpData.forEach(gp => { gpMap[gp.id] = gp; });
          setGpInfo(gpMap);
        }
      }
    } catch (error) {
      console.error("Error loading active orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  const visibleOrders = activeOrders.filter(o => !dismissed.includes(o.id));

  if (location.pathname === "/auth" || loading || visibleOrders.length === 0) {
    return null;
  }

  const primaryOrder = visibleOrders[0];
  const gp = primaryOrder ? gpInfo[primaryOrder.gp_id] : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="w-full z-30 border-b border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5"
      >
        {/* Collapsed banner — always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2.5 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/20">
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold truncate">
                {primaryOrder.origin_city} → {primaryOrder.destination_city}
              </span>
              <Badge variant="secondary" className="text-[10px] shrink-0 bg-green-500/15 text-green-600 dark:text-green-400">
                Acceptée
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              #{primaryOrder.order_number?.slice(-6)}
              {gp?.deposit_address && " · Adresse de dépôt disponible"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setDismissed(prev => [...prev, primaryOrder.id]); }}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted/50"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </button>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 space-y-2.5">
                {/* GP Info */}
                {gp && (
                  <div className="p-3 rounded-xl border border-border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Transporteur</p>
                    <p className="text-sm font-semibold">{gp.business_name}</p>
                    {gp.deposit_address && (
                      <div className="mt-2 flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">{gp.deposit_address}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick actions */}
                <div className="flex gap-2">
                  {gp?.whatsapp_phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9 text-xs gap-1.5"
                      onClick={() => handleWhatsApp(gp.whatsapp_phone!)}
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </Button>
                  )}
                  {gp?.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9 text-xs gap-1.5"
                      onClick={() => { window.location.href = `tel:${gp.phone}`; }}
                    >
                      <Phone className="w-3.5 h-3.5" /> Appeler
                    </Button>
                  )}
                  <Link to={`/tracking?id=${primaryOrder.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full h-9 text-xs gap-1.5">
                      <Navigation className="w-3.5 h-3.5" /> Suivre
                    </Button>
                  </Link>
                </div>

                {/* Other orders */}
                {visibleOrders.length > 1 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    +{visibleOrders.length - 1} autre(s) commande(s) en attente de dépôt
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { count: orderCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.id)
        .in("status", ["accepted"]);
      setCount(orderCount || 0);
      setHasActive((orderCount || 0) > 0);
      setLoading(false);
    };
    checkActive();
  }, []);
  return { hasActive, count, loading };
}
