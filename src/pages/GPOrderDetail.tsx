import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Package, MapPin, Calendar, Clock, User,
  Phone, MessageCircle, CheckCircle, Truck, AlertTriangle,
  FileText, Scale, Zap, Shield, Copy,
  ChevronDown, ChevronUp, QrCode, Wallet, ReceiptText,
  Navigation, Milestone, Plane, TrendingDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  orderStatusConfig,
  OrderStatus,
  getOrderStatusLabel,
  getNextOrderStatus
} from "@/lib/transportTypes";
import { assertValidOrderStatus } from "@/lib/enumMappings";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { getRegressiveInfo } from "@/lib/gpPricingEngine";

interface OrderDetail {
  id: string;
  order_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  weight: number;
  total_price: number;
  price_per_kg: number;
  currency: string;
  status: OrderStatus;
  logistics_status: string;
  description: string | null;
  dimensions: string | null;
  tracking_code: string | null;
  created_at: string;
  pickup_date: string | null;
  delivery_date: string | null;
  actual_delivery_date: string | null;
  declared_value: number | null;
  has_insurance: boolean | null;
  insurance_amount: number | null;
  client_id: string;
  offer_id: string | null;
  commission_amount: number;
  content_nature: string[] | null;
}

interface OrderLogistics {
  merchandise_type: string;
  merchandise_description: string | null;
  estimated_weight: number;
  estimated_volume: string | null;
  declared_value: number | null;
  is_fragile: boolean;
  is_urgent: boolean;
  special_conditions: string | null;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  pickup_time_slot: string | null;
}

interface OrderLogisticsOptions {
  pickup_enabled: boolean;
  pickup_address: string | null;
  pickup_contact_name: string | null;
  pickup_phone: string | null;
  pickup_status: string | null;
  delivery_enabled: boolean;
  delivery_address: string | null;
  delivery_contact_name: string | null;
  delivery_phone: string | null;
  delivery_status: string | null;
  logistics_status: string | null;
  gp_arrived_at: string | null;
}

interface EscrowTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  released_at: string | null;
}

interface StatusHistoryEntry {
  id: string;
  status: string;
  created_at: string;
  notes: string | null;
  changed_by_type: string;
}

interface ClientProfile {
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

const merchandiseLabels: Record<string, string> = {
  electronics: "Électronique",
  clothing: "Vêtements & Textiles",
  food: "Produits alimentaires",
  documents: "Documents",
  cosmetics: "Cosmétiques",
  household: "Articles ménagers",
  auto_parts: "Pièces auto",
  other: "Autre",
  alimentaire: "Alimentaire",
  vetements: "Vêtements",
  tissus: "Tissus",
  autres: "Autres",
};

const STATUS_PROGRESS: Record<string, number> = {
  pending: 5, accepted: 20, paid_held: 30, checked_in: 35,
  collected: 40, scheduled_departure: 50, in_transit: 60,
  arrived_destination: 75, delivery_pending: 85,
  delivery_confirmed: 100, delivered: 100, released: 100,
  cancelled: 0, disputed: 0,
};

const STATUS_ICONS: Record<string, any> = {
  pending: Clock, accepted: CheckCircle, collected: Package,
  in_transit: Truck, delivered: CheckCircle,
  cancelled: AlertTriangle, disputed: AlertTriangle,
};

export default function GPOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [logistics, setLogistics] = useState<OrderLogistics | null>(null);
  const [logisticsOptions, setLogisticsOptions] = useState<OrderLogisticsOptions | null>(null);
  const [escrow, setEscrow] = useState<EscrowTransaction | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);
  
  const currencyConversion = useCurrencyConversion({ gpCurrency: order?.currency || "XOF" });

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    if (!orderId) { navigate("/gp/demandes"); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: gpProfile } = await supabase.from("gp_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!gpProfile) { navigate("/gp/demandes"); return; }
      const { data: orderData, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).eq("gp_id", gpProfile.id).single();
      if (orderError || !orderData) { toast({ title: "Commande non trouvée", variant: "destructive" }); navigate("/gp/demandes"); return; }
      setOrder(orderData as OrderDetail);
      const [logisticsRes, logOptRes, escrowRes, historyRes, clientRes] = await Promise.all([
        supabase.from("order_logistics").select("*").eq("order_id", orderId).maybeSingle(),
        supabase.from("order_logistics_options").select("*").eq("order_id", orderId).maybeSingle(),
        supabase.from("escrow_transactions").select("*").eq("order_id", orderId).maybeSingle(),
        supabase.from("order_status_history").select("id, status, created_at, notes, changed_by_type").eq("order_id", orderId).order("created_at", { ascending: false }).limit(10),
        supabase.from("profiles").select("full_name, phone, email").eq("user_id", orderData.client_id).maybeSingle(),
      ]);
      setLogistics(logisticsRes.data);
      setLogisticsOptions(logOptRes.data);
      setEscrow(escrowRes.data);
      setStatusHistory(historyRes.data || []);
      setClient(clientRes.data);
    } catch (error) {
      console.error("Error loading order:", error);
      toast({ title: "Erreur de chargement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    setUpdating(true);
    try {
      const validStatus = assertValidOrderStatus(newStatus);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const updates: Record<string, any> = { 
        status: validStatus,
        ...(validStatus === "delivered" ? { actual_delivery_date: new Date().toISOString() } : {})
      };
      if (validStatus === "delivered" && logisticsOptions?.delivery_enabled) {
        await supabase.from("order_logistics_options").update({ gp_arrived_at: new Date().toISOString(), logistics_status: "awaiting_admin_delivery" }).eq("order_id", order.id);
      }
      const { error } = await supabase.from("orders").update(updates).eq("id", order.id);
      if (error) throw error;
      await supabase.from("order_status_history").insert({ order_id: order.id, status: newStatus, changed_by: user.id, changed_by_type: "gp" });
      await supabase.from("notifications").insert({ user_id: order.client_id, type: "order_update", title: `${order.order_number}`, message: `Statut mis à jour: ${getOrderStatusLabel(newStatus)}`, related_type: "order", related_id: order.id });
      toast({ title: "Statut mis a jour", description: `Commande marquée comme "${getOrderStatusLabel(newStatus)}"` });
      loadOrderDetails();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !", description: text });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center safe-area-inset">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Chargement…</p>
        </motion.div>
      </div>
    );
  }

  if (!order) return null;

  const { nextStatus, nextLabel } = getNextOrderStatus(order.status);
  const statusConfig = orderStatusConfig[order.status];
  const progress = STATUS_PROGRESS[order.status] || 0;
  const hasInternalLogistics = logisticsOptions?.pickup_enabled || logisticsOptions?.delivery_enabled;
  const isBlockedByLogistics = order.status === "in_transit" && logisticsOptions?.delivery_enabled && order.logistics_status === "awaiting_admin_delivery";
  const currencySymbol = getCurrencySymbol(order.currency);
  const { formatDual, fromFCFA, isFCFA } = currencyConversion;
  const transportPrice = (order.weight || 0) * (order.price_per_kg || 0);
  
  // Parse flat-rate items from order (DB stores "price", not "unit_price")
  const flatRateItems: { name: string; label: string; quantity: number; price: number }[] = 
    Array.isArray((order as any).flat_rate_items) ? (order as any).flat_rate_items : [];
  const flatRateTotal = flatRateItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
  
  // GP revenue = transport + flat-rate items
  // Commission is on (transport + flat-rate)
  const commissionAmount = order.commission_amount || 0;
  const gpRevenue = transportPrice + flatRateTotal;
  const gpEarnings = gpRevenue - commissionAmount;
  const insuranceAmount = order.has_insurance ? (order.insurance_amount || 0) : 0;
  const logisticsPriceFCFA = logisticsOptions ?
    ((logisticsOptions.pickup_enabled ? (logisticsOptions as any).pickup_price || 0 : 0) +
     (logisticsOptions.delivery_enabled ? (logisticsOptions as any).delivery_price || 0 : 0)) : 0;
  const logisticsPrice = isFCFA ? logisticsPriceFCFA : Math.round(fromFCFA(logisticsPriceFCFA) * 100) / 100;

  const dualFormat = (amount: number) => {
    if (isFCFA) return `${amount.toLocaleString('fr-FR')} FCFA`;
    return formatDual(amount);
  };

  // Regressive pricing info
  const regressiveInfo = getRegressiveInfo(order.weight, order.price_per_kg);

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* ─── Fixed Header ─── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 -ml-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold font-mono truncate">{order.order_number}</h1>
                <button onClick={() => copyToClipboard(order.order_number)} className="text-muted-foreground hover:text-foreground">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}</p>
            </div>
            <Badge variant={statusConfig?.color as any || "secondary"} className="text-[11px] shrink-0">
              {getOrderStatusLabel(order.status)}
            </Badge>
          </div>

          {order.status !== "cancelled" && order.status !== "disputed" && (
            <div className="mt-2.5">
              <Progress value={progress} className="h-1" />
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>Réservé</span><span>Transit</span><span>Livré</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Scrollable Content ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>

        {/* Route Card — compact */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1.5">
                    <Plane className="w-4 h-4 text-primary -rotate-45" />
                  </div>
                  <p className="font-semibold text-sm">{order.origin_city}</p>
                  <p className="text-[10px] text-muted-foreground">{order.origin_country}</p>
                </div>
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <Navigation className="w-3.5 h-3.5 text-muted-foreground rotate-90" />
                  <div className="w-12 h-0.5 bg-gradient-to-r from-primary to-primary/40 rounded-full" />
                  {order.delivery_date && <p className="text-[9px] text-muted-foreground mt-0.5">{format(new Date(order.delivery_date), "d MMM", { locale: fr })}</p>}
                </div>
                <div className="flex-1 text-center">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-semibold text-sm">{order.destination_city}</p>
                  <p className="text-[10px] text-muted-foreground">{order.destination_country}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats — 3 chips */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-2">
          <div className="bg-card border rounded-xl p-3 text-center">
            <Scale className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-base font-bold">{order.weight}<span className="text-xs font-normal text-muted-foreground ml-0.5">kg</span></p>
          </div>
          <div className="bg-card border rounded-xl p-3 text-center">
            <Wallet className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-base font-bold">{gpEarnings.toLocaleString()}<span className="text-xs font-normal text-muted-foreground ml-0.5">{currencySymbol}</span></p>
            <p className="text-[9px] text-muted-foreground">Gains nets</p>
          </div>
          <div className="bg-card border rounded-xl p-3 text-center">
            <Shield className={`w-4 h-4 mx-auto mb-1 ${order.has_insurance ? "text-primary" : "text-muted-foreground"}`} />
            <p className={`text-base font-bold ${order.has_insurance ? "" : "text-muted-foreground"}`}>{order.has_insurance ? "Oui" : "Non"}</p>
            <p className="text-[9px] text-muted-foreground">Assuré</p>
          </div>
        </motion.div>

        {/* Regressive pricing indicator */}
        {regressiveInfo.savingsPercent > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/15 rounded-lg text-xs">
              <TrendingDown className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground">Tarif régressif appliqué : <span className="font-medium text-foreground">-{regressiveInfo.savingsPercent}%</span> ({regressiveInfo.tierLabel})</span>
            </div>
          </motion.div>
        )}
        {order.weight < 1 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/15 rounded-lg text-xs">
              <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-muted-foreground">Forfait petit colis appliqué : <span className="font-medium text-foreground">{dualFormat(Math.round(order.price_per_kg * 1.5))}</span> min.</span>
            </div>
          </motion.div>
        )}

        {/* Client Contact — compact */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{client?.full_name || "Client"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{client?.email}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {client?.phone && (
                    <a href={`tel:${client.phone}`}>
                      <Button variant="outline" size="icon" className="h-9 w-9"><Phone className="w-4 h-4" /></Button>
                    </a>
                  )}
                  <Button variant="default" size="icon" className="h-9 w-9" onClick={() => navigate("/messages")}>
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Logistics alert */}
        {isBlockedByLogistics && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Logistique dernier km active</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">L'admin Konnekt effectuera la livraison finale.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Internal Logistics */}
        {hasInternalLogistics && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-1.5 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <Truck className="w-3.5 h-3.5" /> Konnekt Logistique
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {logisticsOptions?.pickup_enabled && (
                  <div className="p-2.5 bg-muted/50 rounded-lg space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium">Enlevement</span>
                      <Badge variant="outline" className="text-[9px] h-5">{logisticsOptions.pickup_status || "pending"}</Badge>
                    </div>
                    <p className="text-xs">{logisticsOptions.pickup_address}</p>
                    <p className="text-[10px] text-muted-foreground">{logisticsOptions.pickup_contact_name} • {logisticsOptions.pickup_phone}</p>
                  </div>
                )}
                {logisticsOptions?.delivery_enabled && (
                  <div className="p-2.5 bg-muted/50 rounded-lg space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium">Livraison dernier km</span>
                      <Badge variant="outline" className="text-[9px] h-5">{logisticsOptions.delivery_status || "pending"}</Badge>
                    </div>
                    <p className="text-xs">{logisticsOptions.delivery_address}</p>
                    <p className="text-[10px] text-muted-foreground">{logisticsOptions.delivery_contact_name} • {logisticsOptions.delivery_phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Merchandise */}
        {(order.content_nature?.length || logistics || order.description) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader className="pb-1.5 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Contenu</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {order.content_nature && order.content_nature.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {order.content_nature.map((nature, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{merchandiseLabels[nature] || nature}</Badge>
                    ))}
                  </div>
                )}
                {logistics && (
                  <div className="flex flex-wrap gap-1.5">
                    {logistics.is_fragile && <Badge variant="destructive" className="gap-1 text-[10px]"><AlertTriangle className="w-2.5 h-2.5" />Fragile</Badge>}
                    {logistics.is_urgent && <Badge className="bg-amber-500 gap-1 text-[10px]"><Zap className="w-2.5 h-2.5" />Urgent</Badge>}
                  </div>
                )}
                {order.description && <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">{order.description}</p>}
                {logistics?.special_conditions && (
                  <div className="p-2 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <p className="text-[10px] font-medium text-destructive">⚠️ {logistics.special_conditions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Financial — Collapsible */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Collapsible open={showFinancials} onOpenChange={setShowFinancials}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-2 pt-3 px-3 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs flex items-center gap-1.5"><ReceiptText className="w-3.5 h-3.5" />Finances</CardTitle>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-primary">{dualFormat(gpEarnings)}</span>
                      {showFinancials ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="space-y-2 text-sm">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Vos revenus</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Transport ({order.weight} kg x {order.price_per_kg})</span>
                      <span className="font-medium">{dualFormat(transportPrice)}</span>
                    </div>
                    {flatRateItems.filter(i => i.quantity > 0).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.label} x{item.quantity}</span>
                        <span className="font-medium">{dualFormat(item.quantity * item.unit_price)}</span>
                      </div>
                    ))}
                    {flatRateTotal > 0 && (
                      <div className="flex justify-between text-xs font-medium border-t border-border/30 pt-1">
                        <span className="text-muted-foreground">Sous-total GP</span>
                        <span>{dualFormat(gpRevenue)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-destructive">
                      <span>Commission Konnekt</span>
                      <span>-{dualFormat(commissionAmount)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground/70 pl-2">
                      <span>dont TVA 18% (incluse)</span>
                      <span>{dualFormat(Math.round(commissionAmount * 18 / 118))}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-semibold text-sm">Gains nets</span>
                      <span className="font-bold text-sm text-primary">{dualFormat(gpEarnings)}</span>
                    </div>

                    {/* Client Invoice */}
                    <div className="mt-3 p-2.5 bg-muted/30 rounded-lg space-y-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Facture client</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Transport</span>
                        <span>{dualFormat(transportPrice)}</span>
                      </div>
                      {flatRateItems.filter(i => i.quantity > 0).map((item, idx) => (
                        <div key={`inv-${idx}`} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{item.label} x{item.quantity}</span>
                          <span>{dualFormat(item.quantity * item.unit_price)}</span>
                        </div>
                      ))}
                      {insuranceAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Assurance (Konnekt)</span>
                          <span>{dualFormat(insuranceAmount)}</span>
                        </div>
                      )}
                      {logisticsPrice > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Logistique (Konnekt)</span>
                          <span>{dualFormat(logisticsPrice)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-xs font-medium">
                        <span>Total</span>
                        <span>{dualFormat(order.total_price)}</span>
                      </div>
                    </div>
                    
                    {escrow && (
                      <div className="mt-2 flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                        <span className="text-[11px] text-muted-foreground">Paiement</span>
                        <Badge variant={escrow.status === "released" ? "default" : "secondary"} className="text-[10px]">
                          {escrow.status === "held" && "Sequestre"}
                          {escrow.status === "released" && "Libere"}
                          {escrow.status === "pending" && "En attente"}
                        </Badge>
                      </div>
                    )}
                    {escrow?.released_at && <p className="text-[10px] text-muted-foreground">Libéré le {format(new Date(escrow.released_at), "d MMM yyyy", { locale: fr })}</p>}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>

        {/* Timeline — Collapsible */}
        {statusHistory.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Collapsible open={showTimeline} onOpenChange={setShowTimeline}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 pt-3 px-3 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs flex items-center gap-1.5"><Milestone className="w-3.5 h-3.5" />Historique ({statusHistory.length})</CardTitle>
                      {showTimeline ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-3 pb-3 pt-0">
                    <div className="space-y-2.5">
                      {statusHistory.map((entry, i) => {
                        const Icon = STATUS_ICONS[entry.status] || Clock;
                        return (
                          <div key={entry.id} className="flex items-start gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{getOrderStatusLabel(entry.status as OrderStatus)}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(entry.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                                <span className="ml-1">• {entry.changed_by_type === "gp" ? "Vous" : entry.changed_by_type}</span>
                              </p>
                              {entry.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{entry.notes}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </motion.div>
        )}

        {/* Scan guidance — GP must scan to progress */}
        {order.status !== "delivered" && order.status !== "cancelled" && order.status !== "disputed" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-4 text-center space-y-2">
                <QrCode className="w-8 h-8 mx-auto text-primary/60" />
                <p className="text-xs font-medium text-foreground">
                  {order.status === "pending" || order.status === "accepted"
                    ? "Scannez le QR du client pour confirmer le dépôt"
                    : order.status === "arrived_destination"
                    ? "Scannez pour lancer la livraison"
                    : "Le statut évolue automatiquement via le scan"}
                </p>
                <Button variant="default" size="sm" className="gap-2" onClick={() => navigate("/gp/scan")}>
                  <QrCode className="w-4 h-4" /> Ouvrir le scanner
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {order.tracking_code && (
          <Card>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Code de suivi</p>
                <p className="font-mono font-bold text-sm">{order.tracking_code}</p>
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => copyToClipboard(order.tracking_code!)}>
                <Copy className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Delivered state */}
        {order.status === "delivered" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium text-primary text-sm">Mission terminée ✓</span>
              {escrow?.status === "released" && <Badge variant="outline" className="text-[10px] border-primary text-primary">Fonds libérés</Badge>}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
