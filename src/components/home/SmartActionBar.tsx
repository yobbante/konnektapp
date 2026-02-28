/**
 * SmartActionBar — Contextual intelligence zone
 * 
 * Dynamically prioritizes and displays the most important actions/alerts
 * based on the user's current state: pending reviews, incoming parcels,
 * price changes, unread messages, weight supplements, etc.
 * 
 * Priority system: CRITICAL > URGENT > IMPORTANT > DEFAULT
 */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Star, MessageCircle, Package, AlertTriangle, Truck, ArrowRight,
  CreditCard, Scale, Bell, Gift, ChevronRight, Sparkles, Clock,
  Send, Heart, History, ShieldAlert, MapPin
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SmartAction {
  id: string;
  priority: "critical" | "urgent" | "important" | "default";
  icon: React.ElementType;
  label: string;
  description: string;
  to?: string;
  onClick?: () => void;
  badge?: string | number;
  color: string; // tailwind token classes
  bgColor: string;
  borderColor: string;
  pulse?: boolean;
  orderId?: string;
}

interface SmartActionBarProps {
  userId?: string;
  recentOrders?: any[];
  unreadMessages?: number;
  activeOrdersCount?: number;
}

export function SmartActionBar({ userId, recentOrders = [], unreadMessages = 0, activeOrdersCount = 0 }: SmartActionBarProps) {
  const navigate = useNavigate();
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [incomingParcels, setIncomingParcels] = useState<any[]>([]);
  const [supplementOrders, setSupplementOrders] = useState<any[]>([]);
  const [priceChanges, setPriceChanges] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    fetchContextualData();
  }, [userId, recentOrders]);

  const fetchContextualData = async () => {
    if (!userId) return;

    // 1. Orders delivered but not reviewed
    const { data: unreviewed } = await supabase
      .from("orders")
      .select("id, order_number, gp_id, destination_city")
      .eq("client_id", userId)
      .in("status", ["delivered", "delivery_confirmed", "released"] as any[])
      .order("updated_at", { ascending: false })
      .limit(5);

    if (unreviewed && unreviewed.length > 0) {
      // Check which ones already have reviews
      const orderIds = unreviewed.map(o => o.id);
      const { data: existingReviews } = await supabase
        .from("reviews")
        .select("order_id")
        .in("order_id", orderIds);
      const reviewedIds = new Set((existingReviews || []).map(r => r.order_id));
      setPendingReviews(unreviewed.filter(o => !reviewedIds.has(o.id)));
    }

    // 2. Parcels where user is recipient (incoming)
    const { data: incoming } = await supabase
      .from("orders")
      .select("id, order_number, origin_city, status")
      .eq("recipient_user_id", userId)
      .in("status", ["in_transit", "arrived_destination", "delivery_pending"] as any[])
      .limit(3);
    setIncomingParcels(incoming || []);

    // 3. Weight supplement required
    const supplements = recentOrders.filter(o => o.status === "weight_pending_payment");
    setSupplementOrders(supplements);

    // 4. Price changes on favorited offers (check recent notifications)
    const { data: priceNotifs } = await (supabase
      .from("notifications")
      .select("id, title, message, related_id, created_at") as any)
      .eq("user_id", userId)
      .eq("type", "new_offer")
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(3);
    setPriceChanges(priceNotifs || []);
  };

  const actions = useMemo<SmartAction[]>(() => {
    const items: SmartAction[] = [];

    // ─── CRITICAL: Weight supplement required (blocking)
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
        orderId: o.id,
      });
    });

    // ─── CRITICAL: Incoming parcels for you
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

    // ─── URGENT: Pending reviews
    pendingReviews.slice(0, 2).forEach(o => {
      items.push({
        id: `review-${o.id}`,
        priority: "urgent",
        icon: Star,
        label: "Donnez votre avis",
        description: `${o.order_number} vers ${o.destination_city}`,
        onClick: () => navigate(`/historique`),
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        badge: "⭐",
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

    // ─── DEFAULT: Always-present quick actions (only show if < 2 contextual items)
    if (items.length < 2) {
      items.push({
        id: "send",
        priority: "default",
        icon: Send,
        label: "Envoyer un colis",
        description: "Réservez un transport",
        to: "/envoyer",
        color: "text-primary",
        bgColor: "bg-primary/10",
        borderColor: "border-primary/20",
      });
    }

    if (items.length < 3 && activeOrdersCount > 0) {
      items.push({
        id: "active",
        priority: "default",
        icon: Truck,
        label: `${activeOrdersCount} envoi${activeOrdersCount > 1 ? "s" : ""} actif${activeOrdersCount > 1 ? "s" : ""}`,
        description: "Suivez vos colis",
        to: "/historique",
        badge: activeOrdersCount,
        color: "text-foreground",
        bgColor: "bg-muted/60",
        borderColor: "border-border",
      });
    }

    if (items.length < 3) {
      items.push({
        id: "favorites",
        priority: "default",
        icon: Heart,
        label: "Favoris",
        description: "Vos transporteurs préférés",
        to: "/favoris",
        color: "text-foreground",
        bgColor: "bg-muted/60",
        borderColor: "border-border",
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, urgent: 1, important: 2, default: 3 };
    return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 4);
  }, [supplementOrders, incomingParcels, pendingReviews, unreadMessages, priceChanges, activeOrdersCount, navigate]);

  const hasCritical = actions.some(a => a.priority === "critical" || a.priority === "urgent");

  return (
    <div className="px-4 pb-3">
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
  );
}
