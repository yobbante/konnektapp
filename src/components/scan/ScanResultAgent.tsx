/**
 * ScanResultAgent - Agent Logistique / Admin scan result (ScanFlow™)
 * 
 * Actions:
 * - Pickup: "Colis enlevé" → PRIS EN CHARGE
 * - Delivery: "Livré" → LIVRÉ CONFIRMÉ
 * - Stock: "Réception stock Yobbanté"
 * 
 * Includes ScanTrust™ duplicate prevention + payment block check.
 * Uses ScanStatusBadge and semantic tokens.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Package, Truck, CheckCircle, AlertTriangle,
  User, Phone, MapPin, History, ShieldAlert,
  Navigation, Copy, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { useDuplicateScanCheck } from "@/hooks/useDuplicateScanCheck";
import { ScanStatusBadge } from "./ScanStatusBadge";

interface ScanResultAgentProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    weight: number;
    total_price: number;
    currency: string;
    origin_city: string;
    destination_city: string;
    client_name?: string | null;
    client_phone?: string | null;
    client_id: string;
    gp_id: string;
    gp_name?: string | null;
    delivery_address?: string | null;
    scan_history?: Array<{ action: string; user_role: string; created_at: string }>;
  };
  logScan: (orderId: string, action: string, scanType?: string, prevStatus?: string, newStatus?: string, meta?: Record<string, any>) => Promise<void>;
  onComplete: () => void;
  isAdmin?: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  view: "Consulté",
  deposit_confirm: "Dépôt confirmé",
  delivery_confirm: "Livré",
  weight_modify: "Poids modifié",
  pickup_confirm: "Enlèvement",
  stock_confirm: "Stock",
};

export function ScanResultAgent({ order, logScan, onComplete, isAdmin }: ScanResultAgentProps) {
  const { toast } = useToast();
  const { canPerformAction } = useDuplicateScanCheck();
  const [loading, setLoading] = useState(false);
  const [paymentBlocked, setPaymentBlocked] = useState(false);

  useEffect(() => {
    checkPaymentStatus();
  }, [order.id]);

  const checkPaymentStatus = async () => {
    try {
      const { data } = await supabase
        .from("escrow_transactions")
        .select("status")
        .eq("order_id", order.id)
        .maybeSingle();
      
      if (data && data.status !== "held" && data.status !== "completed") {
        setPaymentBlocked(true);
      }
    } catch {
      // No escrow = no block
    }
  };

  const agentRole = isAdmin ? "admin" : "agent_logistique";

  const confirmPickup = async () => {
    const allowed = await canPerformAction(order.id, "pickup_confirm", agentRole);
    if (!allowed) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase
        .from("order_logistics_options")
        .update({ 
          pickup_status: "collected",
          pickup_collected_at: new Date().toISOString(),
        })
        .eq("order_id", order.id);

      if (user) {
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          status: order.status as any,
          changed_by: user.id,
          changed_by_type: isAdmin ? "admin" : "agent",
          notes: "📦 Colis enlevé par agent Yobbanté",
        });
      }

      await supabase.from("notifications").insert({
        user_id: order.client_id,
        type: "logistics_update",
        title: "📦 Colis enlevé",
        message: `Votre colis ${order.order_number} a été enlevé par un agent Yobbanté`,
        related_type: "order",
        related_id: order.id,
      });

      await logScan(order.id, "pickup_confirm", "qr", order.status, order.status, {
        agent_type: agentRole,
      });

      toast({ title: "✅ Enlèvement confirmé" });
      onComplete();
    } catch (err) {
      console.error("Pickup error:", err);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelivery = async () => {
    const allowed = await canPerformAction(order.id, "delivery_confirm", agentRole);
    if (!allowed) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase
        .from("order_logistics_options")
        .update({
          delivery_status: "delivered",
          delivery_completed_at: new Date().toISOString(),
          logistics_status: "completed",
        })
        .eq("order_id", order.id);

      await supabase
        .from("orders")
        .update({
          status: "delivered",
          actual_delivery_date: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (user) {
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          status: "delivered",
          changed_by: user.id,
          changed_by_type: isAdmin ? "admin" : "agent",
          notes: "🎉 Livré par agent Yobbanté — LIVRÉ CONFIRMÉ",
        });
      }

      await supabase.from("notifications").insert({
        user_id: order.client_id,
        type: "order_update",
        title: "🎉 Colis livré !",
        message: `Votre colis ${order.order_number} a été livré avec succès`,
        related_type: "order",
        related_id: order.id,
      });

      await logScan(order.id, "delivery_confirm", "qr", order.status, "delivered", {
        agent_type: agentRole,
      });

      toast({ title: "🎉 Livraison confirmée" });
      onComplete();
    } catch (err) {
      console.error("Delivery error:", err);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const confirmStockReception = async () => {
    const allowed = await canPerformAction(order.id, "stock_confirm", agentRole);
    if (!allowed) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          status: order.status as any,
          changed_by: user.id,
          changed_by_type: isAdmin ? "admin" : "agent",
          notes: "📋 Réception stock Yobbanté — Dakar",
        });
      }

      await logScan(order.id, "stock_confirm", "qr", order.status, order.status, {
        location: "stock_yobbante_dakar",
      });

      toast({ title: "✅ Réception stock confirmée" });
      onComplete();
    } catch (err) {
      console.error("Stock error:", err);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !" });
  };

  const openMaps = (address: string) => {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-4 space-y-4"
    >
      {/* Order Info */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-warning via-primary to-success" />
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-sm">{order.order_number}</span>
            <ScanStatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{order.origin_city}</span>
            <ArrowRight className="w-3 h-3" />
            <span>{order.destination_city}</span>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Poids</p>
              <p className="font-semibold">{order.weight} kg</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Montant</p>
              <p className="font-bold">{order.total_price.toLocaleString()} {getCurrencySymbol(order.currency)}</p>
            </div>
          </div>
          {(order.client_name || order.gp_name) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                {order.client_name && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span>{order.client_name}</span>
                  </div>
                )}
                {order.client_phone && (
                  <a href={`tel:${order.client_phone}`} className="flex items-center gap-1.5 text-sm text-primary">
                    <Phone className="w-3 h-3" />
                    {order.client_phone}
                  </a>
                )}
              </div>
              {order.gp_name && (
                <p className="text-xs text-muted-foreground">GP: {order.gp_name}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delivery Address */}
      {order.delivery_address && (
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Adresse de livraison</span>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => copyToClipboard(order.delivery_address!)}>
                  <Copy className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => openMaps(order.delivery_address!)}>
                  <Navigation className="w-3 h-3 text-primary" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment Block Warning */}
      {paymentBlocked && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive text-sm">Livraison bloquée — paiement non validé</p>
              <p className="text-xs text-muted-foreground">Contactez l'admin pour débloquer</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {["accepted", "pending"].includes(order.status) && (
          <Button className="w-full h-12" onClick={confirmPickup} disabled={loading}>
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Colis enlevé
              </>
            )}
          </Button>
        )}

        {["collected", "in_transit"].includes(order.status) && (
          <Button variant="outline" className="w-full h-11" onClick={confirmStockReception} disabled={loading}>
            <Package className="w-4 h-4 mr-2" />
            Stock Yobbanté — Dakar
          </Button>
        )}

        {["in_transit", "collected"].includes(order.status) && !paymentBlocked && (
          <Button 
            className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground" 
            onClick={confirmDelivery} 
            disabled={loading}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Livré au destinataire
              </>
            )}
          </Button>
        )}

        {order.status === "delivered" && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-success" />
              <div>
                <p className="font-medium text-success text-sm">Déjà livré</p>
                <p className="text-xs text-muted-foreground">Aucune action disponible</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Scan History */}
      {order.scan_history && order.scan_history.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Historique scans</h4>
              <Badge variant="outline" className="text-[10px] ml-auto">{order.scan_history.length}</Badge>
            </div>
            <div className="space-y-1.5">
              {order.scan_history.slice(0, 10).map((scan, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    <span className="font-medium">{ACTION_LABELS[scan.action] || scan.action}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">{scan.user_role}</Badge>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(scan.created_at).toLocaleString("fr-FR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
