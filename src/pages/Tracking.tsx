import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  Search, Package, MapPin, Clock, CheckCircle, 
  AlertCircle, Truck, MessageCircle, Phone, Map as MapIcon,
  ArrowLeft, Calendar, Navigation
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  gp_profile?: {
    business_name: string;
  };
}

const STATUS_STEPS = [
  { status: "pending", label: "Commande créée", icon: Package },
  { status: "accepted", label: "Acceptée par le transporteur", icon: CheckCircle },
  { status: "collected", label: "Colis récupéré", icon: Package },
  { status: "in_transit", label: "En transit", icon: Truck },
  { status: "delivered", label: "Livré", icon: CheckCircle },
];

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

  useEffect(() => {
    if (initialCode) {
      handleSearch();
    }
  }, [initialCode]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!trackingCode.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      // Search by tracking_code or order_number
      const { data, error } = await supabase
        .from("orders")
        .select(`
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
          gp_id
        `)
        .or(`tracking_code.eq.${trackingCode},order_number.eq.${trackingCode}`)
        .single();

      if (error || !data) {
        setOrder(null);
        return;
      }

      // Fetch GP profile
      const { data: gpData } = await supabase
        .from("public_gp_profiles")
        .select("business_name")
        .eq("id", data.gp_id)
        .single();

      setOrder({
        ...data,
        gp_profile: gpData || undefined,
      });
    } catch (error) {
      console.error("Error searching order:", error);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const currentStatusIndex = order ? getStatusIndex(order.status) : 0;
  const progress = order ? ((currentStatusIndex + 1) / STATUS_STEPS.length) * 100 : 0;

  // Build tracking steps from order status
  const trackingSteps: TrackingStep[] = STATUS_STEPS.map((step, index) => ({
    status: step.label,
    date: index <= currentStatusIndex 
      ? (index === 0 && order?.pickup_date 
          ? format(new Date(order.pickup_date), "d MMM, HH:mm", { locale: fr })
          : index === STATUS_STEPS.length - 1 && order?.actual_delivery_date
            ? format(new Date(order.actual_delivery_date), "d MMM, HH:mm", { locale: fr })
            : "—")
      : "—",
    location: index === 0 ? order?.origin_city || "" 
      : index === STATUS_STEPS.length - 1 ? order?.destination_city || ""
      : "En route",
    completed: index < currentStatusIndex,
    current: index === currentStatusIndex,
  }));

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      <div className="px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Navigation className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">Suivez votre colis</h1>
          <p className="text-sm text-muted-foreground">
            Entrez votre numéro de suivi ou commande
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSearch}
          className="mb-6"
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ex: CMD-20241225-abc12345"
                className="pl-10 h-11 bg-muted/50"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
              />
            </div>
            <Button type="submit" variant="default" className="h-11 px-5" disabled={loading}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
        </motion.form>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : order ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary Card */}
            <div className="mobile-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge 
                    variant={order.status === "delivered" ? "success" : order.status === "cancelled" ? "destructive" : "default"}
                    className="mb-2"
                  >
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
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Livraison estimée</p>
                  <p className="font-semibold text-sm">
                    {order.delivery_date 
                      ? format(new Date(order.delivery_date), "d MMM yyyy", { locale: fr })
                      : "À confirmer"}
                  </p>
                </div>
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 mb-4 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">{order.origin_city}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="font-medium">{order.destination_city}</span>
                <MapPin className="w-4 h-4 text-accent" />
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="absolute inset-y-0 left-0 bg-primary rounded-full"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {currentStatusIndex + 1}/{STATUS_STEPS.length} étapes
              </p>
            </div>

            {/* Interactive Map Placeholder */}
            <div className="mobile-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Suivi en direct</h3>
                <Badge variant="secondary" className="gap-1">
                  <MapIcon className="w-3 h-3" />
                  Carte
                </Badge>
              </div>
              <div className="relative h-48 bg-muted/50 rounded-xl overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
                <div className="relative text-center">
                  <MapIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Carte interactive
                  </p>
                  <p className="text-xs text-muted-foreground">
                    (Bientôt disponible)
                  </p>
                </div>
                {/* Simulated route dots */}
                <div className="absolute top-8 left-8 w-3 h-3 rounded-full bg-primary animate-pulse" />
                <div className="absolute top-16 left-24 w-2 h-2 rounded-full bg-primary/60" />
                <div className="absolute top-20 right-24 w-2 h-2 rounded-full bg-primary/40" />
                <div className="absolute bottom-12 right-12 w-3 h-3 rounded-full bg-accent" />
              </div>
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
                  return (
                    <div key={index} className="relative flex gap-3">
                      {/* Line */}
                      {index < trackingSteps.length - 1 && (
                        <div 
                          className={`absolute left-[11px] top-6 w-0.5 h-full ${
                            step.completed || step.current ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      )}
                      
                      {/* Icon */}
                      <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        step.current
                          ? "bg-primary text-primary-foreground animate-pulse"
                          : step.completed
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <StepIcon className="w-3 h-3" />
                      </div>

                      {/* Content */}
                      <div className={`pb-4 ${!step.completed && !step.current ? "opacity-50" : ""}`}>
                        <p className={`text-sm font-medium ${step.current ? "text-primary" : ""}`}>
                          {step.status}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{step.date}</span>
                          {step.location && (
                            <>
                              <span>•</span>
                              <span>{step.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => navigate("/support")}>
                <AlertCircle className="w-4 h-4 mr-2" />
                Signaler un problème
              </Button>
              <Button variant="default" className="flex-1 h-11" onClick={() => navigate("/messages")}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Contacter
              </Button>
            </div>
          </motion.div>
        ) : searched ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mobile-card text-center py-8"
          >
            <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">
              Aucune commande trouvée
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Vérifiez le numéro de suivi et réessayez
            </p>
            <Button variant="outline" onClick={() => { setSearched(false); setTrackingCode(""); }}>
              Nouvelle recherche
            </Button>
          </motion.div>
        ) : (
          /* Info Box */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mobile-card text-center"
          >
            <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">
              Où trouver mon numéro ?
            </h3>
            <p className="text-sm text-muted-foreground">
              Dans votre email de confirmation ou dans "Mes envois" sur votre tableau de bord
            </p>
          </motion.div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
