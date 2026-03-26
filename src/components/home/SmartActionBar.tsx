/**
 * SmartActionBar — Intelligent single-action carousel
 * Shows ONE action at a time by priority. Auto-refreshes via realtime.
 * Displays critical updates: weight supplements, deposit addresses, delivery codes, reviews, messages.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Star, MessageCircle, Package, Scale, Bell, ChevronRight, Sparkles, ChevronLeft, Heart,
  MapPin, Truck, Key
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RateOrderDialog } from "@/components/RateOrderDialog";
import { PostDeliveryFlow } from "@/components/delivery/PostDeliveryFlow";

interface SmartAction {
  id: string;
  priority: "critical" | "urgent" | "important";
  icon: React.ElementType;
  label: string;
  description: string;
  to?: string;
  onClick?: () => void;
  badge?: string | number;
  color: string;
  bgColor: string;
  borderColor: string;
  pulse?: boolean;
  reviewData?: { orderId: string; gpId: string; gpName: string };
}

interface SmartActionBarProps {
  userId?: string;
  recentOrders?: any[];
  unreadMessages?: number;
  activeOrdersCount?: number;
  pendingRecipientFeedback?: any[];
}

interface PendingReview {
  id: string;
  order_number: string;
  gp_id: string;
  destination_city: string;
  gp_name: string;
}

export function SmartActionBar({ userId, recentOrders = [], unreadMessages = 0, activeOrdersCount = 0, pendingRecipientFeedback = [] }: SmartActionBarProps) {
  const navigate = useNavigate();
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [supplementOrders, setSupplementOrders] = useState<any[]>([]);
  const [depositReleasedOrders, setDepositReleasedOrders] = useState<any[]>([]);
  const [deliveryCodeOrders, setDeliveryCodeOrders] = useState<any[]>([]);
  const [priceChanges, setPriceChanges] = useState<any[]>([]);
  const [weightChangedOrders, setWeightChangedOrders] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratingOrder, setRatingOrder] = useState<PendingReview | null>(null);
  const [feedbackOrder, setFeedbackOrder] = useState<any | null>(null);

  const fetchContextualData = useCallback(async () => {
    if (!userId) return;

    // Fetch orders needing attention
    const { data: activeOrders } = await supabase
      .from("orders")
      .select("id, order_number, gp_id, destination_city, origin_city, status, delivery_code, total_price, weight, updated_at, currency" as any)
      .eq("client_id", userId)
      .not("status", "in", '("released","cancelled")')
      .order("updated_at", { ascending: false })
      .limit(30);

    if (activeOrders) {
      const orders = activeOrders as any[];
      // Weight supplement required
      setSupplementOrders(orders.filter((o: any) => o.status === "weight_pending_payment"));

      // Deposit address released — check via notifications instead
      setDepositReleasedOrders([]);

      // Delivery codes available
      setDeliveryCodeOrders(orders.filter((o: any) => 
        o.delivery_code && o.status === "delivery_pending"
      ));

      // Weight changed (supplement) — same as supplement
      setWeightChangedOrders([]);
    }

    // Fetch pending reviews
    const { data: unreviewed } = await supabase
      .from("orders")
      .select("id, order_number, gp_id, destination_city")
      .eq("client_id", userId)
      .in("status", ["delivered", "delivery_confirmed", "released"] as any[])
      .order("updated_at", { ascending: false })
      .limit(20);

    if (unreviewed && unreviewed.length > 0) {
      const orderIds = unreviewed.map(o => o.id);
      const gpIds = [...new Set(unreviewed.map(o => o.gp_id))];
      const [reviewsRes, gpRes] = await Promise.all([
        supabase.from("reviews").select("order_id").in("order_id", orderIds),
        supabase.from("gp_profiles").select("id, business_name").in("id", gpIds),
      ]);
      const reviewedIds = new Set((reviewsRes.data || []).map(r => r.order_id));
      const gpNames: Record<string, string> = {};
      (gpRes.data || []).forEach(gp => { gpNames[gp.id] = gp.business_name; });
      setPendingReviews(
        unreviewed
          .filter(o => !reviewedIds.has(o.id))
          .map(o => ({ ...o, gp_name: gpNames[o.gp_id] || "Transporteur" }))
      );
    } else {
      setPendingReviews([]);
    }

    // Price notifications
    const { data: priceNotifs } = await (supabase
      .from("notifications")
      .select("id, title, message, related_id, created_at") as any)
      .eq("user_id", userId)
      .eq("type", "new_offer")
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(3);
    setPriceChanges(priceNotifs || []);
  }, [userId]);

  useEffect(() => { fetchContextualData(); }, [fetchContextualData]);

  // Realtime: auto-refresh on order/notification changes
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("smart-action-bar-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchContextualData())
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => fetchContextualData())
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => fetchContextualData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchContextualData]);

  const handleReviewSuccess = useCallback(() => {
    if (ratingOrder) {
      setPendingReviews(prev => prev.filter(r => r.id !== ratingOrder.id));
      setRatingOrder(null);
    }
  }, [ratingOrder]);

  const actions = useMemo<SmartAction[]>(() => {
    const items: SmartAction[] = [];

    // CRITICAL: Weight supplement required (only if amount > 0)
    supplementOrders.forEach(o => {
      const adjustAmount = o.adjustment_amount || 0;
      if (adjustAmount > 0) {
        items.push({
          id: `supplement-${o.id}`, priority: "critical", icon: Scale,
          label: "Supplément requis",
          description: `${o.order_number} — Payez ${adjustAmount.toLocaleString()} ${o.currency || "FCFA"}`,
          to: `/payer-supplement?orderId=${o.id}`,
          color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/30",
          pulse: true,
        });
      }
    });

    // CRITICAL: Delivery code available — confirm delivery
    deliveryCodeOrders.forEach(o => {
      items.push({
        id: `delivery-${o.id}`, priority: "critical", icon: Key,
        label: "Code de livraison",
        description: `${o.order_number} — Code: ${o.delivery_code}`,
        onClick: () => navigate(`/tracking?order=${o.id}`),
        color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30",
        pulse: true,
      });
    });

    // URGENT: Deposit address released
    depositReleasedOrders.forEach(o => {
      items.push({
        id: `deposit-${o.id}`, priority: "urgent", icon: MapPin,
        label: "Adresse de dépôt",
        description: `${o.order_number} — ${o.deposit_address?.slice(0, 40) || "Voir l'adresse"}`,
        onClick: () => navigate(`/tracking?order=${o.id}`),
        color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30",
      });
    });

    // URGENT: Weight changed (info)
    weightChangedOrders.forEach(o => {
      if (!supplementOrders.find(s => s.id === o.id)) {
        items.push({
          id: `weight-${o.id}`, priority: "urgent", icon: Scale,
          label: "Poids modifié",
          description: `${o.order_number} — Supplément de ${o.adjustment_amount?.toLocaleString()} FCFA`,
          to: `/payer-supplement?orderId=${o.id}`,
          color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30",
          pulse: true,
        });
      }
    });

    // URGENT: Pending reviews
    pendingReviews.forEach(o => {
      items.push({
        id: `review-${o.id}`, priority: "urgent", icon: Star,
        label: `Notez ${o.gp_name}`,
        description: `${o.order_number} → ${o.destination_city}`,
        onClick: () => setRatingOrder(o),
        color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30",
        badge: "",
        reviewData: { orderId: o.id, gpId: o.gp_id, gpName: o.gp_name },
      });
    });

    // URGENT: Pending recipient feedback
    pendingRecipientFeedback.forEach(o => {
      items.push({
        id: `feedback-${o.id}`, priority: "urgent", icon: Heart,
        label: "Confirmez la réception",
        description: `${o.order_number} · ${o.origin_city} → ${o.destination_city}`,
        onClick: () => navigate(`/confirmer-reception?orderId=${o.id}`),
        color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30",
        pulse: true,
      });
    });

    // IMPORTANT: Unread messages
    if (unreadMessages > 0) {
      items.push({
        id: "messages", priority: "important", icon: MessageCircle,
        label: `${unreadMessages} message${unreadMessages > 1 ? "s" : ""} non lu${unreadMessages > 1 ? "s" : ""}`,
        description: "Répondez à vos transporteurs",
        to: "/messages", badge: unreadMessages,
        color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30",
      });
    }

    // IMPORTANT: Price notifications
    priceChanges.slice(0, 1).forEach(n => {
      items.push({
        id: `price-${n.id}`, priority: "important", icon: Bell,
        label: "Nouvelle offre !",
        description: n.message?.slice(0, 60) || "Une offre correspond à vos critères",
        to: n.related_id ? `/offres/${n.related_id}` : "/offres",
        color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30",
        badge: "Nouveau",
      });
    });

    const priorityOrder = { critical: 0, urgent: 1, important: 2 };
    return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [supplementOrders, depositReleasedOrders, deliveryCodeOrders, weightChangedOrders, pendingReviews, pendingRecipientFeedback, unreadMessages, priceChanges, navigate]);

  // Reset index when actions change
  useEffect(() => {
    if (currentIndex >= actions.length) setCurrentIndex(0);
  }, [actions.length, currentIndex]);

  if (actions.length === 0) return null;

  const action = actions[currentIndex] || actions[0];
  const total = actions.length;
  const reviewCount = pendingReviews.length;

  const goNext = () => setCurrentIndex(i => (i + 1) % total);
  const goPrev = () => setCurrentIndex(i => (i - 1 + total) % total);

  const Wrapper = action.to ? Link : "button" as any;
  const wrapperProps = action.to ? { to: action.to } : { onClick: action.onClick };
  const isCritical = action.priority === "critical" || action.priority === "urgent";

  return (
    <>
      <div className="px-4 pb-3 overflow-hidden">
        {/* Counter + review hint */}
        {total > 1 && (
          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {reviewCount > 0 && (
                <>
                  <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 truncate">
                    {reviewCount} avis en attente
                  </span>
                </>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0">
              {currentIndex + 1}/{total}
            </span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={action.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              {/* Prev button */}
              {total > 1 && (
                <button onClick={goPrev} className="w-6 h-6 rounded-full flex items-center justify-center bg-muted/50 flex-shrink-0">
                  <ChevronLeft className="w-3 h-3 text-muted-foreground" />
                </button>
              )}

              <Wrapper
                {...wrapperProps}
                className={`flex-1 flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all min-w-0 overflow-hidden ${action.bgColor} ${action.borderColor} ${
                  isCritical ? "shadow-sm" : ""
                } active:scale-[0.98]`}
              >
                <div className={`relative w-9 h-9 rounded-xl ${action.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <action.icon className={`w-4 h-4 ${action.color}`} />
                  {action.pulse && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left overflow-hidden">
                  <p className={`text-xs font-semibold leading-tight truncate ${isCritical ? action.color : "text-foreground"}`}>
                    {action.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                    {action.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Wrapper>

              {/* Next button */}
              {total > 1 && (
                <button onClick={goNext} className="w-6 h-6 rounded-full flex items-center justify-center bg-muted/50 flex-shrink-0">
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots indicator */}
        {total > 1 && (
          <div className="flex items-center justify-center gap-1 mt-2">
            {actions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === currentIndex ? "w-4 bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {ratingOrder && (
        <RateOrderDialog
          open={!!ratingOrder}
          onOpenChange={(open) => { if (!open) setRatingOrder(null); }}
          orderId={ratingOrder.id}
          gpId={ratingOrder.gp_id}
          gpName={ratingOrder.gp_name}
          onSuccess={handleReviewSuccess}
        />
      )}

      {feedbackOrder && (
        <PostDeliveryFlow
          order={feedbackOrder}
          role="recipient"
          onClose={() => setFeedbackOrder(null)}
          onNavigate={(path) => { setFeedbackOrder(null); navigate(path); }}
        />
      )}
    </>
  );
}
