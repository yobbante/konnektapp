/**
 * DeliveryCodePopup — Persistent, prominent popup for delivery codes
 * 
 * Shows a full-screen overlay with the delivery code when received.
 * Cannot be accidentally dismissed — requires explicit action.
 * Works for both client (sender) and recipient.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Copy, Check, Package, Bell, X, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/AppleNotification";

interface DeliveryCodeData {
  code: string;
  orderNumber: string;
  orderId: string;
}

export function DeliveryCodePopup() {
  const [codeData, setCodeData] = useState<DeliveryCodeData | null>(null);
  const [copied, setCopied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleNotification = useCallback((payload: any) => {
    const notif = payload.new;
    if (notif.user_id !== userId) return;
    if (notif.type !== "delivery_code") return;

    // Extract code from message like "Votre code pour CMD-xxx : ABC123..."
    const codeMatch = notif.message?.match(/:\s*([A-Z0-9]{6})/i);
    const orderMatch = notif.message?.match(/(CMD-[A-Z0-9-]+|ORD-[A-Z0-9-]+)/i);
    
    if (codeMatch) {
      const data = {
        code: codeMatch[1].toUpperCase(),
        orderNumber: orderMatch?.[1] || "Commande",
        orderId: notif.related_id || "",
      };
      setCodeData(data);
      setMinimized(false);

      // Also trigger notification sound + toast
      notify.delivery("Code de livraison reçu", `Code: ${data.code} — Communiquez-le au livreur`);

      // Vibrate on mobile
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`delivery-code-popup-${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, handleNotification)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, handleNotification]);

  const handleCopy = () => {
    if (codeData) {
      navigator.clipboard.writeText(codeData.code);
      setCopied(true);
      notify.success("Code copié !");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDismiss = () => {
    setCodeData(null);
    setMinimized(false);
  };

  if (!codeData) return null;

  // Minimized floating badge
  if (minimized) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-20 right-4 z-[100]"
      >
        <motion.button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/30"
          animate={{
            scale: [1, 1.05, 1],
            boxShadow: [
              "0 10px 25px -5px rgba(16,185,129,0.3)",
              "0 10px 35px -5px rgba(16,185,129,0.5)",
              "0 10px 25px -5px rgba(16,185,129,0.3)",
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <KeyRound className="w-5 h-5" />
          <span className="font-mono font-bold tracking-wider text-lg">{codeData.code}</span>
          <Bell className="w-4 h-4 animate-bounce" />
        </motion.button>
      </motion.div>
    );
  }

  // Full-screen persistent overlay
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0.8, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 40 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="w-full max-w-sm bg-card rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 pb-8">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setMinimized(true)}
                className="text-white/70 hover:text-white transition-colors text-xs underline"
              >
                Réduire
              </button>
            </div>
            
            <motion.div
              animate={{ 
                rotate: [0, -5, 5, -5, 0],
              }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3"
            >
              <KeyRound className="w-8 h-8 text-white" />
            </motion.div>
            
            <h2 className="text-xl font-bold text-white text-center">Code de livraison</h2>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Package className="w-3.5 h-3.5 text-emerald-100" />
              <p className="text-emerald-100 text-sm">{codeData.orderNumber}</p>
            </div>
            
            {/* Pulsing indicator */}
            <motion.div
              className="absolute top-4 left-4 flex items-center gap-1.5"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="w-2 h-2 rounded-full bg-white" />
              <span className="text-[10px] text-white/80 font-medium">EN ATTENTE</span>
            </motion.div>
          </div>

          {/* Code display */}
          <div className="px-6 -mt-4">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring" }}
              className="bg-card border-2 border-emerald-200 dark:border-emerald-800 rounded-xl p-5 shadow-lg"
            >
              <motion.p 
                className="text-4xl font-mono font-black tracking-[0.3em] text-foreground text-center"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {codeData.code}
              </motion.p>
            </motion.div>
          </div>

          {/* Actions */}
          <div className="p-6 space-y-3">
            <Button
              onClick={handleCopy}
              className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white h-12"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? "Copié !" : "Copier le code"}
            </Button>
            
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start gap-2">
                <Volume2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  <strong>Communiquez ce code au transporteur</strong> pour confirmer la livraison et libérer les fonds.
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="w-full text-muted-foreground text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Fermer définitivement
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}