import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, Package, MapPin, Clock, CheckCircle, AlertCircle, Truck, MessageCircle, Phone, Map as MapIcon, Calendar, Navigation, Box, RefreshCw } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ReportProblemDialog } from "@/components/tracking/ReportProblemDialog";
import { RealTimeTrackingMap } from "@/components/tracking/RealTimeTrackingMap";
interface TrackingStep {
  status: string;
  date: string;
  location: string;
  completed: boolean;
  current?: boolean;
}
interface OrderDetails {
  id: string;
  order_number: string;
  tracking_code: string | null;
  status: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  pickup_date: string | null;
  delivery_date: string | null;
  actual_delivery_date: string | null;
  weight?: number;
  total_price?: number;
  gp_profile?: {
    business_name: string;
    phone?: string;
  };
  status_history?: Array<{
    status: string;
    created_at: string;
  }>;
}
const STATUS_STEPS = [{
  status: "pending",
  label: "Commande créée",
  icon: Package,
  color: "bg-warning"
}, {
  status: "accepted",
  label: "Acceptée par le transporteur",
  icon: CheckCircle,
  color: "bg-primary"
}, {
  status: "collected",
  label: "Colis récupéré",
  icon: Box,
  color: "bg-secondary"
}, {
  status: "in_transit",
  label: "En transit",
  icon: Truck,
  color: "bg-accent"
}, {
  status: "delivered",
  label: "Livré",
  icon: CheckCircle,
  color: "bg-success"
}];
const getStatusIndex = (status: string) => {
  const index = STATUS_STEPS.findIndex(s => s.status === status);
  return index >= 0 ? index : 0;
};
export default function TrackingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = searchParams.get("code") || "";
  const [trackingCode, setTrackingCode] = useState(initialCode);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  useEffect(() => {
    if (initialCode) {
      handleSearch();
    }
  }, [initialCode]);

  // Realtime subscription for order updates
  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase.channel(`tracking-${order.id}`).on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "orders",
      filter: `id=eq.${order.id}`
    }, payload => {
      const updatedOrder = payload.new as any;
      setOrder(prev => prev ? {
        ...prev,
        ...updatedOrder
      } : null);
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!trackingCode.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      // Search by tracking_code or order_number
      const {
        data,
        error
      } = await supabase.from("orders").select(`
          id,
          order_number,
          tracking_code,
          status,
          origin_city,
          origin_country,
          destination_city,
          destination_country,
          pickup_date,
          delivery_date,
          actual_delivery_date,
          weight,
          total_price,
          gp_id
        `).or(`tracking_code.eq.${trackingCode},order_number.eq.${trackingCode}`).single();
      if (error || !data) {
        setOrder(null);
        return;
      }

      // Fetch GP profile
      const {
        data: gpData
      } = await supabase.from("public_gp_profiles").select("business_name").eq("id", data.gp_id).single();

      // Fetch status history
      const {
        data: historyData
      } = await supabase.from("order_status_history").select("status, created_at").eq("order_id", data.id).order("created_at", {
        ascending: true
      });
      setOrder({
        ...data,
        gp_profile: gpData || undefined,
        status_history: historyData || []
      });
    } catch (error) {
      console.error("Error searching order:", error);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };
  const handleRefresh = async () => {
    if (!order) return;
    setIsRefreshing(true);
    await handleSearch();
    setIsRefreshing(false);
  };
  const currentStatusIndex = order ? getStatusIndex(order.status) : 0;
  const progress = order ? (currentStatusIndex + 1) / STATUS_STEPS.length * 100 : 0;

  // Build tracking steps from order status history
  const trackingSteps: TrackingStep[] = STATUS_STEPS.map((step, index) => {
    const historyEntry = order?.status_history?.find(h => h.status === step.status);
    return {
      status: step.label,
      date: historyEntry ? format(new Date(historyEntry.created_at), "d MMM, HH:mm", {
        locale: fr
      }) : index <= currentStatusIndex && index === 0 && order?.pickup_date ? format(new Date(order.pickup_date), "d MMM, HH:mm", {
        locale: fr
      }) : index === STATUS_STEPS.length - 1 && order?.actual_delivery_date ? format(new Date(order.actual_delivery_date), "d MMM, HH:mm", {
        locale: fr
      }) : "—",
      location: index === 0 ? order?.origin_city || "" : index === STATUS_STEPS.length - 1 ? order?.destination_city || "" : "En route",
      completed: index < currentStatusIndex,
      current: index === currentStatusIndex
    };
  });
  return <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      <div className="px-4 py-6">
        {/* Header */}
        <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Navigation className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">Suivez votre colis</h1>
          <p className="text-sm text-muted-foreground">
            Entrez votre numéro de suivi ou commande
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.form initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.1
      }} onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Ex: CMD-20241225-abc12345" className="pl-10 h-11 bg-muted/50" value={trackingCode} onChange={e => setTrackingCode(e.target.value)} />
            </div>
            <Button type="submit" variant="default" className="h-11 px-5" disabled={loading}>
              {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </motion.form>

        {/* Results */}
        {loading ? <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div> : order ? <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} className="space-y-4">
            {/* Summary Card */}
            <div className="mobile-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge variant={order.status === "delivered" ? "success" : order.status === "cancelled" ? "destructive" : "default"} className="mb-2">
                    {order.status === "pending" && "En attente"}
                    {order.status === "accepted" && "Acceptée"}
                    {order.status === "collected" && "Collecté"}
                    {order.status === "in_transit" && "En transit"}
                    {order.status === "delivered" && "Livré"}
                    {order.status === "cancelled" && "Annulée"}
                    {order.status === "disputed" && "Litige"}
                  </Badge>
                  <h2 className="font-bold text-lg text-foreground">
                    {order.tracking_code || order.order_number}
                  </h2>
                </div>
                <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="h-9 w-9">
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Route Visual */}
              <div className="relative flex items-center gap-2 mb-4 py-3 px-4 bg-muted/50 rounded-xl">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <div className="w-0.5 h-8 bg-gradient-to-b from-primary to-accent" />
                  <div className="w-3 h-3 rounded-full bg-accent" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="font-medium text-sm">{order.origin_city}</p>
                    <p className="text-xs text-muted-foreground">{order.origin_country}</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{order.destination_city}</p>
                    <p className="text-xs text-muted-foreground">{order.destination_country}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Livraison estimée</p>
                  <p className="font-semibold text-sm">
                    {order.delivery_date ? format(new Date(order.delivery_date), "d MMM yyyy", {
                  locale: fr
                }) : "À confirmer"}
                  </p>
                </div>
              </div>

              {/* Progress Steps - Enhanced Visual */}
              <div className="relative mb-4">
                <div className="flex justify-between items-center relative z-10">
                  {STATUS_STEPS.map((step, index) => {
                const isCompleted = index < currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const StepIcon = step.icon;
                return <div key={step.status} className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCurrent ? `${step.color} text-white shadow-lg scale-110 animate-pulse` : isCompleted ? "bg-success text-white" : "bg-muted text-muted-foreground"}`}>
                          <StepIcon className="w-5 h-5" />
                        </div>
                        <p className={`text-[10px] mt-1 text-center max-w-[50px] ${isCurrent ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {step.status === "pending" && "Créée"}
                          {step.status === "accepted" && "Acceptée"}
                          {step.status === "collected" && "Collecté"}
                          {step.status === "in_transit" && "Transit"}
                          {step.status === "delivered" && "Livré"}
                        </p>
                      </div>;
              })}
                </div>
                {/* Progress Bar */}
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted -z-0">
                  <motion.div initial={{
                width: 0
              }} animate={{
                width: `${progress}%`
              }} transition={{
                duration: 0.5,
                delay: 0.2
              }} className="h-full bg-success rounded-full" />
                </div>
              </div>

              {/* Order details */}
              {(order.weight || order.total_price) && <div className="flex items-center justify-between text-sm pt-3 border-t border-border">
                  {order.weight && <span className="text-muted-foreground">Poids: {order.weight} kg</span>}
                  {order.total_price && <span className="font-bold">{order.total_price.toLocaleString()} FCFA</span>}
                </div>}
            </div>

            {/* GP Info */}
            <div className="mobile-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{order.gp_profile?.business_name || "Transporteur"}</p>
                    <p className="text-xs text-muted-foreground">Transporteur vérifié</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigate("/messages")}>
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="mobile-card">
              <h3 className="font-semibold text-sm mb-4">Historique du suivi</h3>
              
              <div className="space-y-0">
                {trackingSteps.map((step, index) => {
              const StepIcon = STATUS_STEPS[index]?.icon || Package;
              const stepColor = STATUS_STEPS[index]?.color || "bg-muted";
              return <div key={index} className="relative flex gap-3">
                      {/* Line */}
                      {index < trackingSteps.length - 1 && <div className={`absolute left-[11px] top-6 w-0.5 h-full ${step.completed || step.current ? "bg-success" : "bg-muted"}`} />}
                      
                      {/* Icon */}
                      <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${step.current ? `${stepColor} text-white animate-pulse` : step.completed ? "bg-success text-white" : "bg-muted text-muted-foreground"}`}>
                        <StepIcon className="w-3 h-3" />
                      </div>

                      {/* Content */}
                      <div className={`pb-4 ${!step.completed && !step.current ? "opacity-50" : ""}`}>
                        <p className={`text-sm font-medium ${step.current ? "text-primary" : ""}`}>
                          {step.status}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{step.date}</span>
                          {step.location && <>
                              <span>•</span>
                              <span>{step.location}</span>
                            </>}
                        </div>
                      </div>
                    </div>;
            })}
              </div>
            </div>

            {/* Real-Time Interactive Map - Moved to bottom */}
            <div className="mobile-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Localisation</h3>
                <Badge variant="secondary" className="gap-1">
                  <MapIcon className="w-3 h-3" />
                  Temps réel
                </Badge>
              </div>
              <RealTimeTrackingMap originCity={order.origin_city} destinationCity={order.destination_city} currentStatus={order.status} progress={progress} transportType="bagages_international" />
            </div>

            {/* Actions */}
            <div className="items-center justify-start gap-[8px] flex flex-col">
              <ReportProblemDialog orderId={order.id} orderNumber={order.tracking_code || order.order_number}>
                <Button variant="outline" className="flex-1 h-11">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Signaler un problème
                </Button>
              </ReportProblemDialog>
              <Button variant="default" className="flex-1 h-11" onClick={() => navigate("/messages")}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Contacter
              </Button>
            </div>
          </motion.div> : searched ? <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} className="mobile-card text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">
              Aucune commande trouvée
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Vérifiez le numéro de suivi et réessayez
            </p>
            <Button variant="outline" onClick={() => {
          setSearched(false);
          setTrackingCode("");
        }}>
              Nouvelle recherche
            </Button>
          </motion.div> : (/* Info Box */
      <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.2
      }} className="mobile-card text-center">
            <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">
              Où trouver mon numéro ?
            </h3>
            <p className="text-sm text-muted-foreground">
              Dans votre email de confirmation ou dans "Mes envois" sur votre tableau de bord
            </p>
          </motion.div>)}
      </div>

      <MobileNav />
    </div>;
}