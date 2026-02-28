/**
 * SmartActionBar — Contextual intelligence zone
 * 
 * Dynamically prioritizes and displays the most important actions/alerts
 * based on the user's current state: pending reviews, incoming parcels,
 * price changes, unread messages, weight supplements, etc.
 * 
 * Priority system: CRITICAL > URGENT > IMPORTANT
 * No default items — only contextual actions.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Star, MessageCircle, Package, Scale, Bell, ChevronRight, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RateOrderDialog } from "@/components/RateOrderDialog";

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
  // For review actions
  reviewData?: { orderId: string; gpId: string; gpName: string };
}

interface SmartActionBarProps {
  userId?: string;
  recentOrders?: any[];
  unreadMessages?: number;
  activeOrdersCount?: number;
}

interface PendingReview {
  id: string;
  order_number: string;
  gp_id: string;
  destination_city: string;
  gp_name: string;
}

export function SmartActionBar({ userId, recentOrders = [], unreadMessages = 0, activeOrdersCount = 0 }: SmartActionBarProps) {
  const navigate = useNavigate();
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [incomingParcels, setIncomingParcels] = useState<any[]>([]);
  const [supplementOrders, setSupplementOrders] = useState<any[]>([]);
  const [priceChanges, setPriceChanges] = useState<any[]>([]);

  // Rating dialog state
  const [ratingOrder, setRatingOrder] = useState<PendingReview | null>(null);

  const fetchContextualData = useCallback(async () => {
    if (!userId) return;

    // 1. Orders delivered but not reviewed — fetch ALL with GP names
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

      // Fetch existing reviews and GP names in parallel
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
          .map(o => ({
            ...o,
            gp_name: gpNames[o.gp_id] || "Transporteur",
          }))
      );
    } else {
      setPendingReviews([]);
    }

    // 2. Parcels where user is recipient
    const { data: incoming } = await supabase
      .from("orders")
      .select("id, order_number, origin_city, status")
      .eq("recipient_user_id", userId)
      .in("status", ["in_transit", "arrived_destination", "delivery_pending"] as any[])
      .limit(3);
    setIncomingParcels(incoming || []);

    // 3. Weight supplement required
    setSupplementOrders(recentOrders.filter(o => o.status === "weight_pending_payment"));

    // 4. Price match notifications
    const { data: priceNotifs } = await (supabase
      .from("notifications")
      .select("id, title, message, related_id, created_at") as any)
      .eq("user_id", userId)
      .eq("type", "new_offer")
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(3);
    setPriceChanges(priceNotifs || []);
  }, [userId, recentOrders]);

  useEffect(() => {
    fetchContextualData();
  }, [fetchContextualData]);

  const handleReviewSuccess = useCallback(() => {
    // Remove the reviewed order from pending list
    if (ratingOrder) {
      setPendingReviews(prev => prev.filter(r => r.id !== ratingOrder.id));
      setRatingOrder(null);
    }
  }, [ratingOrder]);

  const actions = useMemo<SmartAction[]>(() => {
    const items: SmartAction[] = [];

    // ─── CRITICAL: Weight supplement required
    supplementOrders.forEach(o => {
      items.push({
        id: `supplement-${o.id}`,
        priority: "critical",
        icon: Scale,
        label: "Supplément requis",
        description: `${o.order_number} — Payez le supplément poids`,
        to: `/supplement/${o.id}`,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive/30",
        pulse: true,
      });
    });

    // ─── CRITICAL: Incoming parcels
    incomingParcels.forEach(p => {
      const statusLabel = p.status === "delivery_pending" ? "Livraison en cours" : p.status === "arrived_destination" ? "Arrivé" : "En transit";
      items.push({
        id: `incoming-${p.id}`,
        priority: "critical",
        icon: Package,
        label: "📦 Colis pour vous",
        description: `${p.order_number} depuis ${p.origin_city} · ${statusLabel}`,
        onClick: () => navigate(`/tracking?order=${p.id}`),
        color: "text-primary",
        bgColor: "bg-primary/10",
        borderColor: "border-primary/30",
        pulse: p.status === "delivery_pending",
      });
    });

    // ─── URGENT: ALL pending reviews — each GP separately
    pendingReviews.forEach(o => {
      items.push({
        id: `review-${o.id}`,
        priority: "urgent",
        icon: Star,
        label: `Notez ${o.gp_name}`,
        description: `${o.order_number} → ${o.destination_city}`,
        onClick: () => setRatingOrder(o),
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        badge: "⭐",
        reviewData: { orderId: o.id, gpId: o.gp_id, gpName: o.gp_name },
      });
    });

    // ─── IMPORTANT: Unread messages
    if (unreadMessages > 0) {
      items.push({
        id: "messages",
        priority: "important",
        icon: MessageCircle,
        label: `${unreadMessages} message${unreadMessages > 1 ? "s" : ""} non lu${unreadMessages > 1 ? "s" : ""}`,
        description: "Répondez à vos transporteurs",
        to: "/messages",
        badge: unreadMessages,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
      });
    }

    // ─── IMPORTANT: Price match notifications
    priceChanges.slice(0, 1).forEach(n => {
      items.push({
        id: `price-${n.id}`,
        priority: "important",
        icon: Bell,
        label: "Nouvelle offre !",
        description: n.message?.slice(0, 60) || "Une offre correspond à vos critères",
        to: n.related_id ? `/offres/${n.related_id}` : "/offres",
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        badge: "Nouveau",
      });
    });

    // Sort by priority
    const priorityOrder = { critical: 0, urgent: 1, important: 2 };
    return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [supplementOrders, incomingParcels, pendingReviews, unreadMessages, priceChanges, navigate]);

  if (actions.length === 0) return null;

  // Show review count header if multiple
  const reviewCount = pendingReviews.length;

  return (
    <>
      <div className="px-4 pb-3">
        {/* Review count indicator */}
        {reviewCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-2 px-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              {reviewCount} avis en attente — vos notes améliorent le score des transporteurs
            </span>
          </motion.div>
        )}

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {actions.map((action, i) => {
              const Wrapper = action.to ? Link : "button" as any;
              const wrapperProps = action.to
                ? { to: action.to }
                : { onClick: action.onClick };

              const isCriticalItem = action.priority === "critical" || action.priority === "urgent";

              return (
                <motion.div
                  key={action.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 30 }}
                >
                  <Wrapper
                    {...wrapperProps}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${action.bgColor} ${action.borderColor} ${
                      isCriticalItem ? "shadow-sm" : ""
                    } active:scale-[0.98]`}
                  >
                    {/* Icon */}
                    <div className={`relative w-10 h-10 rounded-xl ${action.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <action.icon className={`w-5 h-5 ${action.color}`} />
                      {action.pulse && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className={`text-sm font-semibold leading-tight ${isCriticalItem ? action.color : "text-foreground"}`}>
                        {action.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                        {action.description}
                      </p>
                    </div>

                    {/* Badge / Arrow */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {action.badge && typeof action.badge === "number" ? (
                        <span className="w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center">
                          {action.badge}
                        </span>
                      ) : action.badge ? (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${action.bgColor} ${action.color}`}>
                          {action.badge}
                        </span>
                      ) : null}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Wrapper>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Rating dialog — triggered from any review action */}
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
    </>
  );
}
