import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Copy, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeliveryCodeData {
  code: string;
  orderNumber: string;
  orderId: string;
}

export function DeliveryCodePopup() {
  const [codeData, setCodeData] = useState<DeliveryCodeData | null>(null);
  const [copied, setCopied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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
    const orderMatch = notif.message?.match(/(CMD-[A-Z0-9-]+)/i);
    
    if (codeMatch) {
      setCodeData({
        code: codeMatch[1].toUpperCase(),
        orderNumber: orderMatch?.[1] || "Commande",
        orderId: notif.related_id || "",
      });
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
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={!!codeData} onOpenChange={(open) => !open && setCodeData(null)}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <AnimatePresence>
          {codeData && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              {/* Header */}
              <div className="w-full bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 pb-8">
                <motion.div
                  initial={{ y: -10 }}
                  animate={{ y: 0 }}
                  className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3"
                >
                  <KeyRound className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-xl font-bold text-white">Code de livraison</h2>
                <p className="text-emerald-100 text-sm mt-1">
                  <Package className="w-3.5 h-3.5 inline mr-1" />
                  {codeData.orderNumber}
                </p>
              </div>

              {/* Code display */}
              <div className="px-6 -mt-4 w-full">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: "spring" }}
                  className="bg-card border-2 border-emerald-200 dark:border-emerald-800 rounded-xl p-5 shadow-lg"
                >
                  <p className="text-4xl font-mono font-black tracking-[0.3em] text-foreground">
                    {codeData.code}
                  </p>
                </motion.div>
              </div>

              {/* Actions */}
              <div className="p-6 w-full space-y-3">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copié !" : "Copier le code"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Communiquez ce code au transporteur pour confirmer la livraison.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
