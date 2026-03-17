import { useState, useEffect } from "react";
import { ArrowLeft, Phone, MoreVertical, Shield, Package, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface OrderInfo {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  status: string;
  weight: number;
  total_price: number;
  currency: string;
}

interface ChatHeaderProps {
  conversationId: string;
  contactName: string;
  contactId: string;
  isGpVerified?: boolean;
  onBack: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-amber-500" },
  accepted: { label: "Acceptée", color: "bg-blue-500" },
  collected: { label: "Collectée", color: "bg-indigo-500" },
  in_transit: { label: "En transit", color: "bg-violet-500" },
  delivered: { label: "Livrée", color: "bg-emerald-500" },
  cancelled: { label: "Annulée", color: "bg-red-500" },
};

export function ChatHeader({ 
  conversationId, 
  contactName, 
  contactId,
  isGpVerified = false,
  onBack 
}: ChatHeaderProps) {
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderInfo();
  }, [conversationId]);

  const loadOrderInfo = async () => {
    try {
      // Get conversation to find order_id
      const { data: conv } = await supabase
        .from("conversations")
        .select("order_id")
        .eq("id", conversationId)
        .single();

      if (conv?.order_id) {
        const { data: order } = await supabase
          .from("orders")
          .select("id, order_number, origin_city, destination_city, status, weight, total_price, currency")
          .eq("id", conv.order_id)
          .single();

        if (order) {
          setOrderInfo(order);
        }
      }
    } catch (error) {
      console.error("Error loading order info:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = orderInfo?.status ? STATUS_LABELS[orderInfo.status] : null;

  return (
    <div className="border-b border-border bg-background flex-shrink-0 fixed top-0 left-0 right-0 z-50">
      {/* Main header */}
      <div 
        className="flex items-center gap-3 px-3 py-2.5" 
        style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}
      >
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative">
          <span className="font-semibold text-primary text-sm">
            {contactName?.charAt(0) || "?"}
          </span>
          {isGpVerified && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center border-2 border-background">
              <Shield className="w-2.5 h-2.5 text-primary-foreground" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm truncate">{contactName || "Contact"}</p>
            {isGpVerified && (
              <Badge variant="secondary" className="h-4 text-[10px] px-1.5 bg-primary/10 text-primary flex-shrink-0">
                Vérifié
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">En ligne</p>
        </div>
        
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Phone className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Order summary banner */}
      {orderInfo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t border-border"
        >
          <button
            onClick={() => setShowOrderDetails(!showOrderDetails)}
            className="w-full px-4 py-2 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">{orderInfo.order_number}</span>
              {statusInfo && (
                <Badge variant="secondary" className={`${statusInfo.color} text-white text-[10px] h-4`}>
                  {statusInfo.label}
                </Badge>
              )}
            </div>
            {showOrderDetails ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          <AnimatePresence>
            {showOrderDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-3 bg-muted/20 border-t border-border space-y-2"
              >
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{orderInfo.origin_city}</span>
                  <span className="text-muted-foreground">→</span>
                  <span>{orderInfo.destination_city}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{orderInfo.weight} kg</span>
                  <span>•</span>
                  <span className="font-medium text-foreground">
                    {orderInfo.total_price.toLocaleString()} {orderInfo.currency}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
