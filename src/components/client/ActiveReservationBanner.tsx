import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, MapPin, Eye, Phone, Clock, 
  CheckCircle, Truck, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
    const channel = supabase
      .channel("client-active-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => loadActiveOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadActiveOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch active orders (accepted, collected, in_transit)
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, order_number, status, origin_city, destination_city, gp_id, created_at, total_price, currency")
        .eq("client_id", user.id)
        .in("status", ["accepted", "collected", "in_transit"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setActiveOrders(orders || []);

      // Fetch GP info for each order
      if (orders && orders.length > 0) {
        const gpIds = [...new Set(orders.map(o => o.gp_id))];
        const { data: gpData } = await supabase
          .from("gp_profiles")
          .select("id, business_name, deposit_address, whatsapp_phone, phone, reception_address, phone_secondary")
          .in("id", gpIds);

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
    const statusMap: Record<string, { label: string; color: string; emoji: string }> = {
      accepted: { label: "Acceptée", color: "bg-green-500", emoji: "✅" },
      collected: { label: "Collecté", color: "bg-blue-500", emoji: "📦" },
      in_transit: { label: "En transit", color: "bg-orange-500", emoji: "🚚" },
    };
    return statusMap[status] || { label: status, color: "bg-muted", emoji: "📦" };
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
  const isAccepted = primaryOrder?.status === "accepted" || 
                     primaryOrder?.status === "collected" || 
                     primaryOrder?.status === "in_transit";
  const isDelivered = primaryOrder?.status === "delivered";

  // Released info based on PRD rules
  const releasedInfo = {
    depositAddress: isAccepted && gp?.deposit_address,
    whatsapp: isAccepted && (gp?.whatsapp_phone || gp?.phone),
    receptionAddress: isDelivered && gp?.reception_address,
    secondaryPhone: isDelivered && gp?.phone_secondary,
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-0 left-0 right-0 z-50"
        style={{ paddingTop: "var(--safe-top, 0px)" }}
      >
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            {/* Status icon */}
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {statusInfo?.emoji} Votre GP a accepté la réservation
              </p>
              <p className="text-xs text-white/80 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">
                  {primaryOrder.origin_city} → {primaryOrder.destination_city}
                </span>
              </p>
            </div>

            {/* Action button */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="bg-white text-green-600 hover:bg-white/90 text-xs h-8"
                  onClick={() => handleViewDetails(primaryOrder)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Voir infos
                </Button>
              </SheetTrigger>

              <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
                <SheetHeader className="pb-4 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Informations de dépôt
                  </SheetTitle>
                </SheetHeader>

                {selectedOrder && gp && (
                  <div className="py-4 space-y-4 overflow-y-auto">
                    {/* Order summary */}
                    <div className="p-3 bg-muted/50 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Numéro</span>
                        <span className="font-mono font-medium text-sm">{selectedOrder.order_number}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Trajet</span>
                        <span className="font-medium text-sm">{selectedOrder.origin_city} → {selectedOrder.destination_city}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Statut</span>
                        <Badge className={`${statusInfo?.color} text-white`}>
                          {statusInfo?.emoji} {statusInfo?.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Released GP info - Deposit */}
                    {isAccepted && (
                      <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          Coordonnées de dépôt
                        </h3>
                        
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl space-y-3">
                          {/* GP Name */}
                          <div>
                            <p className="text-xs text-muted-foreground">Transporteur</p>
                            <p className="font-semibold">{gp.business_name}</p>
                          </div>

                          {/* Deposit Address */}
                          {releasedInfo.depositAddress && (
                            <div>
                              <p className="text-xs text-muted-foreground">Adresse de dépôt</p>
                              <p className="font-medium">{gp.deposit_address}</p>
                            </div>
                          )}

                          {/* WhatsApp / Phone */}
                          {releasedInfo.whatsapp && (
                            <div className="flex gap-2">
                              <Button 
                                variant="default"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => handleWhatsApp(gp.whatsapp_phone || gp.phone || "")}
                              >
                                <Phone className="w-4 h-4 mr-2" />
                                WhatsApp GP
                              </Button>
                              <Button 
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleCall(gp.whatsapp_phone || gp.phone || "")}
                              >
                                <Phone className="w-4 h-4 mr-2" />
                                Appeler
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Reception info - Only after delivery */}
                    {isDelivered && (
                      <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2 text-blue-600">
                          <Truck className="w-4 h-4" />
                          Coordonnées de réception
                        </h3>
                        
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-3">
                          {releasedInfo.receptionAddress && (
                            <div>
                              <p className="text-xs text-muted-foreground">Adresse de réception</p>
                              <p className="font-medium">{gp.reception_address}</p>
                            </div>
                          )}
                          {releasedInfo.secondaryPhone && gp.phone_secondary && (
                            <div>
                              <p className="text-xs text-muted-foreground">Téléphone réception</p>
                              <p className="font-medium">{gp.phone_secondary}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Info note */}
                    {!isDelivered && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          L'adresse de réception sera visible après confirmation de livraison
                        </p>
                      </div>
                    )}

                    {/* View full confirmation */}
                    <Link to={`/booking/confirmation/${selectedOrder.id}`}>
                      <Button variant="outline" className="w-full mt-4">
                        <Eye className="w-4 h-4 mr-2" />
                        Voir tous les détails
                      </Button>
                    </Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            {/* Multiple orders indicator */}
            {visibleOrders.length > 1 && (
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                +{visibleOrders.length - 1}
              </Badge>
            )}
          </div>
        </div>
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
      if (!user) {
        setLoading(false);
        return;
      }

      const { count: orderCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.id)
        .in("status", ["accepted", "collected", "in_transit"]);

      setCount(orderCount || 0);
      setHasActive((orderCount || 0) > 0);
      setLoading(false);
    };

    checkActive();
  }, []);

  return { hasActive, count, loading };
}
