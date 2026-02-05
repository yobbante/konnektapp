import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, Eye, CheckCircle, XCircle, ChevronDown, 
  Scale, Calendar, RefreshCw, Sparkles 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { GPQuickStats } from "@/components/gp/dashboard/GPQuickStats";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { sendAcceptanceNotification } from "@/lib/autoChat";

interface Order {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  weight: number;
  description: string | null;
  status: string;
  client_id: string;
  created_at: string;
  total_price: number;
  currency: string;
  pickup_date: string | null;
}

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
}

/**
 * GPDemandesPage V2 - Page des nouvelles demandes améliorée
 * 
 * Features:
 * - Quick stats en haut
 * - Cartes interactives expansibles
 * - Animations fluides
 * - Actions rapides
 */
export default function GPDemandesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [completedThisMonth, setCompletedThisMonth] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        navigate("/gp/inscription");
        return;
      }

      setGpProfile(profile);

      // Load all orders for stats
      const { data: allOrders } = await supabase
        .from("orders")
        .select("status, created_at")
        .eq("gp_id", profile.id);

      const pending = allOrders?.filter(o => o.status === "pending") || [];
      const active = allOrders?.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)) || [];
      
      // Count completed this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const completed = allOrders?.filter(o => 
        o.status === "delivered" && 
        new Date(o.created_at) >= startOfMonth
      ) || [];

      // Load pending orders with full details
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("gp_id", profile.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      
      setPendingOrders(orders || []);
      setActiveOrdersCount(active.length);
      setCompletedThisMonth(completed.length);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAccept = async (orderId: string, order?: Order) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "accepted" })
        .eq("id", orderId);

      if (error) throw error;

      // Send automated message with GP contact info
      if (gpProfile && order) {
        // Get full GP profile with contact details
        const { data: fullGpProfile } = await supabase
          .from("gp_profiles")
          .select("id, business_name, deposit_address, reception_address, phone, whatsapp_phone")
          .eq("id", gpProfile.id)
          .single();

        if (fullGpProfile) {
          await sendAcceptanceNotification(
            order.client_id,
            fullGpProfile.id,
            orderId,
            {
              orderNumber: order.order_number,
              originCity: order.origin_city,
              destinationCity: order.destination_city,
              gpName: fullGpProfile.business_name,
              depositAddress: fullGpProfile.deposit_address,
              phone: fullGpProfile.phone,
              whatsapp: fullGpProfile.whatsapp_phone,
              receptionAddress: fullGpProfile.reception_address,
            }
          );
        }
      }

      toast({
        title: "✅ Demande acceptée",
        description: "Le client sera notifié. RDV dans 'En cours'",
      });
      setExpandedId(null);
      loadData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'accepter la demande",
        variant: "destructive",
      });
    }
  };

  const handleRefuse = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Demande refusée",
        description: "Le client sera notifié",
      });
      setExpandedId(null);
      loadData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de refuser la demande",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <PageLoader message="Chargement des demandes..." />;
  }

  if (!gpProfile) return null;

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingOrders.length}
      activeOrdersCount={activeOrdersCount}
      activeTab="demandes"
    >
      <div className="px-4 py-4 space-y-4">
        {/* Quick Stats */}
        <GPQuickStats 
          pendingCount={pendingOrders.length}
          activeCount={activeOrdersCount}
          completedThisMonth={completedThisMonth}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Nouvelles demandes</h2>
            <p className="text-xs text-muted-foreground">
              Répondez rapidement pour maintenir votre score
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* Orders List */}
        {pendingOrders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Tout est à jour !</p>
              <p className="text-sm mt-1">Aucune demande en attente</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => navigate("/gp/calendrier")}
              >
                Gérer mes voyages
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {pendingOrders.map((order) => {
                const isExpanded = expandedId === order.id;
                
                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card 
                      className={cn(
                        "overflow-hidden cursor-pointer transition-all",
                        isExpanded && "ring-2 ring-primary shadow-lg"
                      )}
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    >
                      <CardContent className="p-0">
                        {/* Main Row */}
                        <div className="p-4">
                          {/* Route */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                              <span className="font-semibold text-sm truncate">
                                {order.origin_city}
                              </span>
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                              <div className="h-0.5 w-full bg-gradient-to-r from-green-500 to-primary rounded-full" />
                            </div>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <span className="font-semibold text-sm truncate">
                                {order.destination_city}
                              </span>
                              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                            </div>
                          </div>

                          {/* Quick Info */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Scale className="w-3.5 h-3.5" />
                                {order.weight} kg
                              </span>
                              <span className="font-mono text-xs">
                                #{order.order_number.slice(-6)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary">
                                {order.total_price.toLocaleString()} {getCurrencySymbol(order.currency)}
                              </span>
                              <ChevronDown 
                                className={cn(
                                  "w-5 h-5 text-muted-foreground transition-transform",
                                  isExpanded && "rotate-180"
                                )} 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-2 border-t bg-muted/30 space-y-4">
                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Reçu:</span>
                                    <span className="font-medium">
                                      {format(new Date(order.created_at), "d MMM HH:mm", { locale: fr })}
                                    </span>
                                  </div>
                                  {order.pickup_date && (
                                    <div className="flex items-center gap-2">
                                      <Package className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">Dépôt:</span>
                                      <span className="font-medium">
                                        {format(new Date(order.pickup_date), "d MMM", { locale: fr })}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Description */}
                                {order.description && (
                                  <div className="p-3 bg-background rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                      {order.description}
                                    </p>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                  <Button
                                    variant="outline"
                                    className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRefuse(order.id);
                                    }}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Refuser
                                  </Button>
                                  <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAccept(order.id, order);
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Accepter
                                  </Button>
                                </div>

                                {/* View Details Link */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full text-muted-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/gp/order/${order.id}`);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Voir tous les détails
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </GPDashboardLayout>
  );
}
