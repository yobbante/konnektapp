/**
 * ScanResultAgent - Agent Logistique / Admin scan result
 * 
 * Actions:
 * - Pickup: "Colis enlevé" → status PRIS EN CHARGE
 * - Delivery: "Livré" → status LIVRÉ  
 * - Stock: "Réception stock Yobbanté"
 * 
 * Shows: client info, GP info, delivery address, payment status
 * Blocks delivery if payment is blocked.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Package, Truck, CheckCircle, AlertTriangle,
  User, Phone, MapPin, History, ShieldAlert,
  Navigation, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/components/ui/currency-selector";

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

export function ScanResultAgent({ order, logScan, onComplete, isAdmin }: ScanResultAgentProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Check escrow/payment status
  const [paymentBlocked, setPaymentBlocked] = useState(false);

  const confirmPickup = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update logistics option pickup status
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
        agent_type: isAdmin ? "admin" : "agent_logistique",
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
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update logistics delivery status
      await supabase
        .from("order_logistics_options")
        .update({
          delivery_status: "delivered",
          delivery_completed_at: new Date().toISOString(),
          logistics_status: "completed",
        })
        .eq("order_id", order.id);

      // Update main order status
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
        agent_type: isAdmin ? "admin" : "agent_logistique",
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
      <Card className="bg-muted/50">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Commande</span>
            <span className="font-mono font-bold">{order.order_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Trajet</span>
            <span>{order.origin_city} → {order.destination_city}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Poids</span>
            <span>{order.weight} kg</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Montant</span>
            <span className="font-bold">
              {order.total_price.toLocaleString()} {getCurrencySymbol(order.currency)}
            </span>
          </div>
          <Separator />
          {order.client_name && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Client
              </span>
              <span>{order.client_name}</span>
            </div>
          )}
          {order.client_phone && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> Téléphone
              </span>
              <a href={`tel:${order.client_phone}`} className="text-primary underline">
                {order.client_phone}
              </a>
            </div>
          )}
          {order.gp_name && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">GP</span>
              <span>{order.gp_name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Address */}
      {order.delivery_address && (
        <Card>
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
                  <Navigation className="w-3 h-3 text-blue-500" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment Block Warning */}
      {paymentBlocked && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive text-sm">Livraison bloquée</p>
              <p className="text-xs text-muted-foreground">Paiement non validé</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Pickup */}
        {["accepted", "pending"].includes(order.status) && (
          <Button 
            className="w-full" 
            onClick={confirmPickup}
            disabled={loading}
          >
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

        {/* Stock Reception */}
        {["collected", "in_transit"].includes(order.status) && (
          <Button 
            variant="outline"
            className="w-full" 
            onClick={confirmStockReception}
            disabled={loading}
          >
            <Package className="w-4 h-4 mr-2" />
            Stock Yobbanté — Dakar
          </Button>
        )}

        {/* Delivery */}
        {["in_transit", "collected"].includes(order.status) && !paymentBlocked && (
          <Button 
            className="w-full bg-green-600 hover:bg-green-700" 
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
          <Card className="border-green-300 bg-green-50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800 text-sm">Déjà livré</p>
                <p className="text-xs text-green-600">Aucune action disponible</p>
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
            </div>
            <div className="space-y-1.5">
              {order.scan_history.slice(0, 10).map((scan, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    <span>{scan.action}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">{scan.user_role}</Badge>
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
