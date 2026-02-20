import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Package, MapPin, Calendar, Clock, User, 
  Phone, MessageCircle, CheckCircle, Truck, AlertTriangle,
  FileText, Scale, Zap, Shield, Copy, ExternalLink, 
  ChevronDown, ChevronUp, QrCode, Wallet, ReceiptText,
  MapPinned, Navigation, Milestone, Timer, Plane
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

// Status progress mapping
const STATUS_PROGRESS: Record<string, number> = {
  pending: 0,
  accepted: 20,
  collected: 40,
  in_transit: 60,
  delivered: 100,
  cancelled: 0,
  disputed: 0,
};

// Status timeline icons
const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  accepted: CheckCircle,
  collected: Package,
  in_transit: Truck,
  delivered: CheckCircle,
  cancelled: AlertTriangle,
  disputed: AlertTriangle,
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
  
  // UI State
  const [showTimeline, setShowTimeline] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);
  
  // Currency hook (must be before any early returns)
  const currencyConversion = useCurrencyConversion({ gpCurrency: order?.currency || "XOF" });

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    if (!orderId) {
      navigate("/gp/demandes");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get GP profile
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!gpProfile) {
        navigate("/gp/demandes");
        return;
      }

      // Get order with more fields
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("gp_id", gpProfile.id)
        .single();

      if (orderError || !orderData) {
        toast({ title: "Commande non trouvée", variant: "destructive" });
        navigate("/gp/demandes");
        return;
      }

      setOrder(orderData as OrderDetail);

      // Parallel data fetching
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

      // If delivered and has delivery logistics, update logistics_status
      if (validStatus === "delivered" && logisticsOptions?.delivery_enabled) {
        await supabase
          .from("order_logistics_options")
          .update({ gp_arrived_at: new Date().toISOString(), logistics_status: "awaiting_admin_delivery" })
          .eq("order_id", order.id);
      }

      const { error } = await supabase.from("orders").update(updates).eq("id", order.id);
      if (error) throw error;

      await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: newStatus,
        changed_by: user.id,
        changed_by_type: "gp",
      });

      await supabase.from("notifications").insert({
        user_id: order.client_id,
        type: "order_update",
        title: `📦 ${order.order_number}`,
        message: `Statut mis à jour: ${getOrderStatusLabel(newStatus)}`,
        related_type: "order",
        related_id: order.id,
      });

      toast({ title: "✅ Statut mis à jour", description: `Commande marquée comme "${getOrderStatusLabel(newStatus)}"` });
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Chargement de la mission...</p>
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
  const transportPrice = order.weight * order.price_per_kg;
  const gpEarnings = transportPrice - order.commission_amount;
  const insuranceAmount = order.has_insurance ? (order.insurance_amount || 0) : 0;
  // Logistics prices are stored in FCFA — convert to GP currency for display
  const logisticsPriceFCFA = logisticsOptions ? 
    ((logisticsOptions.pickup_enabled ? (logisticsOptions as any).pickup_price || 0 : 0) + 
     (logisticsOptions.delivery_enabled ? (logisticsOptions as any).delivery_price || 0 : 0)) : 0;
  const logisticsPrice = isFCFA ? logisticsPriceFCFA : Math.round(fromFCFA(logisticsPriceFCFA) * 100) / 100;

  // Helper: format amount in GP currency + (≈ FCFA)
  const dualFormat = (amount: number) => {
    if (isFCFA) return `${amount.toLocaleString('fr-FR')} FCFA`;
    return formatDual(amount);
  };

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header with gradient */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-4 px-4 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-inherit hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-mono">{order.order_number}</h1>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-inherit hover:bg-white/10" onClick={() => copyToClipboard(order.order_number)}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-xs opacity-80">{formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}</p>
          </div>
          <Badge variant={statusConfig?.color as any || "secondary"} className="text-xs shrink-0">{getOrderStatusLabel(order.status)}</Badge>
        </div>
        
        {order.status !== "cancelled" && order.status !== "disputed" && (
          <div className="mt-3">
            <Progress value={progress} className="h-1.5" />
            <div className="flex justify-between mt-1 text-[10px] opacity-70">
              <span>Réservé</span>
              <span>En transit</span>
              <span>Livré</span>
            </div>
          </div>
        )}
      </motion.div>

      <div className="px-4 py-4 space-y-4">
        {/* Quick Stats Row */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-3 text-center">
              <Scale className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold">{order.weight} kg</p>
              <p className="text-[10px] text-muted-foreground">Poids</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
            <CardContent className="p-3 text-center">
              <Wallet className="w-4 h-4 text-success mx-auto mb-1" />
              <p className="text-lg font-bold">{gpEarnings.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Gains {currencySymbol}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
            <CardContent className="p-3 text-center">
              {order.has_insurance ? (
                <>
                  <Shield className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-amber-600">Oui</p>
                  <p className="text-[10px] text-muted-foreground">Assuré</p>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold text-muted-foreground">Non</p>
                  <p className="text-[10px] text-muted-foreground">Assuré</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Primary Action Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {isBlockedByLogistics && (
                <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Logistique dernier km active</p>
                    <p className="text-xs text-amber-600">L'admin Konnekt effectuera la livraison finale.</p>
                  </div>
                </div>
              )}

              <div className="p-4">
                {nextStatus && nextLabel && !isBlockedByLogistics && (
                  <Button variant="default" size="lg" className="w-full h-14 text-base" disabled={updating} onClick={() => updateOrderStatus(nextStatus)}>
                    {updating ? (
                      <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                      <>
                        {nextStatus === "accepted" && <CheckCircle className="w-5 h-5 mr-2" />}
                        {nextStatus === "collected" && <Package className="w-5 h-5 mr-2" />}
                        {nextStatus === "in_transit" && <Truck className="w-5 h-5 mr-2" />}
                        {nextStatus === "delivered" && <CheckCircle className="w-5 h-5 mr-2" />}
                        {nextLabel}
                      </>
                    )}
                  </Button>
                )}

                {order.status === "delivered" && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-success" />
                    </div>
                    <span className="font-medium text-success">Mission terminée avec succès</span>
                    {escrow?.status === "released" && <Badge variant="outline" className="text-success border-success">Fonds libérés</Badge>}
                  </div>
                )}

                {order.status === "pending" && <p className="text-xs text-muted-foreground text-center mt-2">⏳ En attente de votre acceptation</p>}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Route Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Plane className="w-5 h-5 text-primary -rotate-45" />
                  </div>
                  <p className="font-bold">{order.origin_city}</p>
                  <p className="text-xs text-muted-foreground">{order.origin_country}</p>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <Navigation className="w-4 h-4 text-muted-foreground rotate-90" />
                  <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-success" />
                  {order.delivery_date && <p className="text-[10px] text-muted-foreground">{format(new Date(order.delivery_date), "d MMM", { locale: fr })}</p>}
                </div>

                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
                    <MapPin className="w-5 h-5 text-success" />
                  </div>
                  <p className="font-bold">{order.destination_city}</p>
                  <p className="text-xs text-muted-foreground">{order.destination_country}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Client Contact */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{client?.full_name || "Client"}</p>
                    <p className="text-xs text-muted-foreground">{client?.email || "Email non disponible"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {client?.phone && (
                    <a href={`tel:${client.phone}`}>
                      <Button variant="outline" size="icon" className="h-10 w-10"><Phone className="w-4 h-4" /></Button>
                    </a>
                  )}
                  <Button variant="default" size="icon" className="h-10 w-10" onClick={() => navigate("/messages")}>
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Internal Logistics Section */}
        {hasInternalLogistics && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Truck className="w-4 h-4" />
                  Konnekt Logistique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {logisticsOptions?.pickup_enabled && (
                  <div className="p-3 bg-background rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">📦 Enlèvement</span>
                      <Badge variant="outline" className="text-[10px]">{logisticsOptions.pickup_status || "pending"}</Badge>
                    </div>
                    <p className="text-sm">{logisticsOptions.pickup_address}</p>
                    <p className="text-xs text-muted-foreground">{logisticsOptions.pickup_contact_name} • {logisticsOptions.pickup_phone}</p>
                  </div>
                )}
                {logisticsOptions?.delivery_enabled && (
                  <div className="p-3 bg-background rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">🎯 Livraison dernier km</span>
                      <Badge variant="outline" className="text-[10px]">{logisticsOptions.delivery_status || "pending"}</Badge>
                    </div>
                    <p className="text-sm">{logisticsOptions.delivery_address}</p>
                    <p className="text-xs text-muted-foreground">{logisticsOptions.delivery_contact_name} • {logisticsOptions.delivery_phone}</p>
                    {logisticsOptions.logistics_status === "awaiting_admin_delivery" && <Badge className="bg-blue-500 text-[10px] mt-1">Admin prêt à récupérer</Badge>}
                  </div>
                )}
                <p className="text-[10px] text-amber-600 dark:text-amber-400">⚠️ Vous ne gérez pas la livraison finale — Konnekt s'en charge.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Merchandise Details */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Contenu du colis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.content_nature && order.content_nature.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {order.content_nature.map((nature, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{merchandiseLabels[nature] || nature}</Badge>
                  ))}
                </div>
              )}

              {logistics && (
                <div className="flex flex-wrap gap-2">
                  {logistics.is_fragile && <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Fragile</Badge>}
                  {logistics.is_urgent && <Badge className="bg-amber-500 gap-1"><Zap className="w-3 h-3" />Urgent</Badge>}
                </div>
              )}

              {order.description && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{order.description}</p>
                </div>
              )}

              {logistics?.special_conditions && (
                <div className="p-3 bg-warning/10 rounded-lg border border-warning/30">
                  <p className="text-xs font-medium text-warning">⚠️ Conditions spéciales</p>
                  <p className="text-sm mt-1">{logistics.special_conditions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Financial Details - Collapsible */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Collapsible open={showFinancials} onOpenChange={setShowFinancials}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><ReceiptText className="w-4 h-4" />Détails financiers</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">{gpEarnings.toLocaleString()} {currencySymbol}</span>
                      {showFinancials ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    {/* GP Revenue Section */}
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vos revenus</p>
                    <div className="flex justify-between"><span className="text-muted-foreground">Transport ({order.weight} kg × {order.price_per_kg})</span><span>{dualFormat(transportPrice)}</span></div>
                    <div className="flex justify-between text-destructive"><span>Commission Konnekt</span><span>-{dualFormat(order.commission_amount)}</span></div>
                    <Separator />
                    <div className="flex justify-between text-lg"><span className="font-bold">Vos gains nets</span><span className="font-bold text-success">{dualFormat(gpEarnings)}</span></div>

                    {/* Client total breakdown */}
                    <div className="mt-4 p-3 bg-muted/30 rounded-lg space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Facture client</p>
                      <div className="flex justify-between"><span className="text-muted-foreground">Transport</span><span>{dualFormat(transportPrice)}</span></div>
                      {insuranceAmount > 0 && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Assurance Konnekt</span><span>{dualFormat(insuranceAmount)}</span></div>
                      )}
                      {logisticsPrice > 0 && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Logistique interne</span><span>{dualFormat(logisticsPrice)}</span></div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-medium"><span>Total payé</span><span>{dualFormat(order.total_price)}</span></div>
                    </div>
                    
                    {escrow && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Statut paiement</span>
                          <Badge variant={escrow.status === "released" ? "default" : "secondary"}>
                            {escrow.status === "held" && "🔒 En séquestre"}
                            {escrow.status === "released" && "✅ Libéré"}
                            {escrow.status === "pending" && "⏳ En attente"}
                          </Badge>
                        </div>
                        {escrow.released_at && <p className="text-xs text-muted-foreground mt-1">Libéré le {format(new Date(escrow.released_at), "d MMM yyyy", { locale: fr })}</p>}
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>

        {/* Status Timeline - Collapsible */}
        {statusHistory.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Collapsible open={showTimeline} onOpenChange={setShowTimeline}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2"><Milestone className="w-4 h-4" />Historique ({statusHistory.length})</CardTitle>
                      {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {statusHistory.map((entry, i) => {
                        const Icon = STATUS_ICONS[entry.status] || Clock;
                        return (
                          <div key={entry.id} className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{getOrderStatusLabel(entry.status as OrderStatus)}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(entry.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                                <span className="ml-1">• Par {entry.changed_by_type === "gp" ? "vous" : entry.changed_by_type}</span>
                              </p>
                              {entry.notes && <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>}
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

        {/* QR Code Button */}
        {order.status === "accepted" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/gp/scan")}>
              <QrCode className="w-4 h-4" />
              Scanner le QR code de dépôt
            </Button>
          </motion.div>
        )}

        {/* Tracking Code */}
        {order.tracking_code && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Code de suivi</p>
                  <p className="font-mono font-bold text-lg">{order.tracking_code}</p>
                </div>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(order.tracking_code!)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}