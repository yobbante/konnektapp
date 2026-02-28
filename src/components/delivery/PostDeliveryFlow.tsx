/**
 * PostDeliveryFlow — Intelligent post-delivery experience
 * Shown to Client & Recipient after GP validates delivery code.
 * 
 * Client: Celebration → Rate GP → View receipt
 * Recipient: Celebration → Confirm satisfaction → Thank sender
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Star, Package, ArrowRight, X, MessageCircle,
  ThumbsUp, ThumbsDown, MapPin, ExternalLink, Sparkles, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/components/ui/AppleNotification";
import { cn } from "@/lib/utils";

interface PostDeliveryOrder {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  weight: number;
  total_price: number;
  currency: string;
  gp_id: string;
  gp_name?: string;
  status: string;
}

interface PostDeliveryFlowProps {
  order: PostDeliveryOrder;
  role: "client" | "recipient";
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

type FlowStep = "celebration" | "rating" | "feedback" | "done";

export function PostDeliveryFlow({ order, role, onClose, onNavigate }: PostDeliveryFlowProps) {
  const [step, setStep] = useState<FlowStep>("celebration");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [satisfaction, setSatisfaction] = useState<"good" | "bad" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-advance from celebration after 2.5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setStep(role === "client" ? "rating" : "feedback");
    }, 2500);
    return () => clearTimeout(timer);
  }, [role]);

  const handleRateSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      await supabase.from("reviews").insert({
        order_id: order.id,
        gp_id: order.gp_id,
        client_id: user.id,
        rating,
        comment: comment || null,
      });

      notify.success("Merci pour votre avis !");
      setStep("done");
    } catch (e: any) {
      // If already reviewed, still proceed
      if (e.message?.includes("duplicate") || e.code === "23505") {
        notify.info("Vous avez déjà noté cette commande");
        setStep("done");
      } else {
        notify.error("Erreur lors de l'envoi");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecipientFeedback = async () => {
    setSubmitting(true);
    try {
      // Log recipient satisfaction as a notification/acknowledgement
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("notifications").insert({
          user_id: order.gp_id ? (await supabase.from("gp_profiles").select("user_id").eq("id", order.gp_id).single()).data?.user_id : user.id,
          title: satisfaction === "good" ? "Destinataire satisfait ✓" : "Destinataire insatisfait",
          message: `Le destinataire du colis ${order.order_number} ${satisfaction === "good" ? "confirme la bonne réception" : "a signalé un problème"}${comment ? ` : "${comment}"` : ""}`,
          type: "order_status",
          related_id: order.id,
          related_type: "order",
        });
      }
      notify.success("Merci pour votre retour !");
      setStep("done");
    } catch {
      notify.error("Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-md flex items-center justify-center"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-full"
      >
        <X className="w-5 h-5" />
      </Button>

      <div className="w-full max-w-sm px-6">
        <AnimatePresence mode="wait">
          {/* ── STEP 1: CELEBRATION ── */}
          {step === "celebration" && (
            <motion.div
              key="celebration"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center space-y-4"
            >
              <motion.div
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.6, times: [0, 0.6, 1] }}
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-foreground">
                  {role === "client" ? "Colis livré ! 🎉" : "Colis reçu ! 📦"}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {role === "client"
                    ? "Votre envoi a bien été remis au destinataire"
                    : "Votre colis est arrivé à destination"}
                </p>
              </motion.div>

              {/* Order summary pill */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 mx-auto"
              >
                <span className="text-sm font-medium">{order.origin_city}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{order.destination_city}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {order.weight} kg
                </Badge>
              </motion.div>

              {/* Confetti dots */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: ["#10b981", "#f59e0b", "#6366f1", "#ec4899"][i % 4],
                    left: `${20 + Math.random() * 60}%`,
                    top: `${15 + Math.random() * 30}%`,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                    y: [0, -40 - Math.random() * 60],
                  }}
                  transition={{ duration: 1.5, delay: 0.2 + i * 0.1 }}
                />
              ))}
            </motion.div>
          )}

          {/* ── STEP 2a: CLIENT RATING ── */}
          {step === "rating" && role === "client" && (
            <motion.div
              key="rating"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="space-y-5"
            >
              <div className="text-center">
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-foreground">Notez votre transporteur</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {order.gp_name || "Votre GP"} a livré votre colis
                </p>
              </div>

              {/* Star rating */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileTap={{ scale: 0.85 }}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1"
                  >
                    <Star
                      className={cn(
                        "w-10 h-10 transition-all",
                        (hoveredRating || rating) >= star
                          ? "fill-amber-400 text-amber-400 scale-110"
                          : "text-muted-foreground/30"
                      )}
                    />
                  </motion.button>
                ))}
              </div>

              {rating > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-sm font-medium text-amber-600"
                >
                  {["", "Décevant", "Moyen", "Bien", "Très bien", "Excellent !"][rating]}
                </motion.p>
              )}

              {/* Optional comment */}
              <Textarea
                placeholder="Un commentaire ? (optionnel)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none h-20 text-sm"
              />

              <div className="space-y-2">
                <Button
                  className="w-full"
                  disabled={rating === 0 || submitting}
                  onClick={handleRateSubmit}
                >
                  {submitting ? "Envoi..." : "Envoyer mon avis"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => setStep("done")}
                >
                  Passer
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2b: RECIPIENT FEEDBACK ── */}
          {step === "feedback" && role === "recipient" && (
            <motion.div
              key="feedback"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="space-y-5"
            >
              <div className="text-center">
                <Heart className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-foreground">Tout est en ordre ?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Confirmez la bonne réception de votre colis
                </p>
              </div>

              {/* Satisfaction buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSatisfaction("good")}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    satisfaction === "good"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-border bg-card hover:border-emerald-500/30"
                  )}
                >
                  <ThumbsUp className={cn("w-8 h-8", satisfaction === "good" ? "text-emerald-500" : "text-muted-foreground")} />
                  <span className={cn("text-sm font-semibold", satisfaction === "good" ? "text-emerald-600" : "text-foreground")}>
                    Tout est parfait
                  </span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSatisfaction("bad")}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    satisfaction === "bad"
                      ? "border-rose-500 bg-rose-500/10"
                      : "border-border bg-card hover:border-rose-500/30"
                  )}
                >
                  <ThumbsDown className={cn("w-8 h-8", satisfaction === "bad" ? "text-rose-500" : "text-muted-foreground")} />
                  <span className={cn("text-sm font-semibold", satisfaction === "bad" ? "text-rose-600" : "text-foreground")}>
                    Un problème
                  </span>
                </motion.button>
              </div>

              {/* Comment if issue */}
              {satisfaction === "bad" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                  <Textarea
                    placeholder="Décrivez le problème..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="resize-none h-20 text-sm"
                  />
                </motion.div>
              )}

              <div className="space-y-2">
                <Button
                  className="w-full"
                  disabled={!satisfaction || submitting}
                  onClick={handleRecipientFeedback}
                >
                  {submitting ? "Envoi..." : "Confirmer"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={onClose}
                >
                  Plus tard
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: DONE ── */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-4"
            >
              <motion.div
                className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: 1 }}
              >
                <Sparkles className="w-8 h-8 text-primary" />
              </motion.div>

              <h3 className="text-lg font-bold text-foreground">Merci ! 🙏</h3>
              <p className="text-sm text-muted-foreground">
                {role === "client"
                  ? "Votre avis aide la communauté Konnekt"
                  : "Votre retour a été transmis"}
              </p>

              <div className="space-y-2 pt-2">
                {role === "client" && onNavigate && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      onClose();
                      onNavigate(`/tracking?order=${order.id}`);
                    }}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Voir le suivi complet
                  </Button>
                )}
                <Button className="w-full" onClick={onClose}>
                  Fermer
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * Hook to detect orders freshly delivered (delivery_confirmed)
 * and trigger the PostDeliveryFlow automatically.
 */
export function usePostDeliveryDetection(userId: string | undefined) {
  const [deliveredOrder, setDeliveredOrder] = useState<PostDeliveryOrder | null>(null);
  const [role, setRole] = useState<"client" | "recipient">("client");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const checkDelivered = async () => {
      // Check dismissed in sessionStorage
      const dismissedIds = JSON.parse(sessionStorage.getItem("kkt_delivery_dismissed") || "[]");
      const dismissedSet = new Set<string>(dismissedIds);
      setDismissed(dismissedSet);

      // Check as client
      const { data: clientOrders } = await supabase
        .from("orders")
        .select("id, order_number, origin_city, destination_city, weight, total_price, currency, gp_id, status")
        .eq("client_id", userId)
        .eq("status", "delivery_confirmed")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (clientOrders && clientOrders.length > 0 && !dismissedSet.has(clientOrders[0].id)) {
        const o = clientOrders[0];
        // Get GP name
        const { data: gp } = await supabase.from("gp_profiles").select("business_name").eq("id", o.gp_id).single();
        setDeliveredOrder({ ...o, gp_name: gp?.business_name });
        setRole("client");
        return;
      }

      // Check as recipient
      const { data: recipientOrders } = await supabase
        .from("orders")
        .select("id, order_number, origin_city, destination_city, weight, total_price, currency, gp_id, status")
        .eq("recipient_user_id", userId)
        .eq("status", "delivery_confirmed")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (recipientOrders && recipientOrders.length > 0 && !dismissedSet.has(recipientOrders[0].id)) {
        const o = recipientOrders[0];
        const { data: gp } = await supabase.from("gp_profiles").select("business_name").eq("id", o.gp_id).single();
        setDeliveredOrder({ ...o, gp_name: gp?.business_name });
        setRole("recipient");
      }
    };

    checkDelivered();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("post-delivery-detection")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `status=eq.delivery_confirmed`,
      }, (payload) => {
        const o = payload.new as any;
        if (o.client_id === userId || o.recipient_user_id === userId) {
          checkDelivered();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const dismiss = (orderId: string) => {
    const newDismissed = [...Array.from(dismissed), orderId];
    sessionStorage.setItem("kkt_delivery_dismissed", JSON.stringify(newDismissed));
    setDismissed(new Set(newDismissed));
    setDeliveredOrder(null);
  };

  return { deliveredOrder, role, dismiss };
}
