import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, Wallet, Plus, ChevronRight, Star, 
  TrendingUp, Clock, MapPin, ArrowRight, LogOut,
  AlertTriangle, CheckCircle, Truck, ChevronDown, ChevronUp,
  ArrowLeft, BarChart3, User, ShieldAlert, EyeOff, Bell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useToast } from "@/hooks/use-toast";
import { useDashboardTheme } from "@/hooks/useDashboardTheme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { GPMobileNav } from "@/components/layout/MobileNav";
import { GPCreateOfferDialog } from "@/components/gp/GPCreateOfferDialog";
import { GPDropdownMenu } from "@/components/gp/GPDropdownMenu";
import { KPICards } from "@/components/gp/dashboard/KPICards";
import { QuickActions } from "@/components/gp/dashboard/QuickActions";
import { BadgeSystem } from "@/components/gp/dashboard/BadgeSystem";
import { ProfileCompletionGauge } from "@/components/gp/dashboard/ProfileCompletionGauge";
import { RecentHistory } from "@/components/gp/dashboard/RecentHistory";
import { SmartNotifications } from "@/components/gp/dashboard/SmartNotifications";
import { ActiveOrderBar } from "@/components/gp/dashboard/ActiveOrderBar";
import { GPStatsCharts } from "@/components/gp/dashboard/GPStatsCharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  OrderStatus, 
  orderStatusConfig, 
  getOrderStatusLabel, 
  getOrderStatusColor,
  getNextOrderStatus 
} from "@/lib/transportTypes";
import { assertValidOrderStatus } from "@/lib/enumMappings";

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
  subscription: string;
  rating: number;
  total_deliveries: number;
  zones_covered?: string[];
  phone?: string;
  id_document_url?: string;
  business_registration_url?: string;
  transport_license_url?: string;
}

interface WalletData {
  balance: number;
  pending_balance: number;
  total_earned: number;
  currency: string;
}

export default function GPDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const theme = useDashboardTheme("partner");
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { notify } = useNotificationSound();

  // Check if profile is pending validation
  const isPendingValidation = gpProfile?.status === "pending";
  const isRejected = gpProfile?.status === "rejected";
  const isSuspended = gpProfile?.status === "suspended";

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  // Realtime subscription for new orders
  useEffect(() => {
    if (!gpProfile?.id) return;

    const channel = supabase
      .channel('gp-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `gp_id=eq.${gpProfile.id}`
        },
        (payload) => {
          const newOrder = payload.new;
          setOrders(prev => [newOrder, ...prev]);
          
          // Notify GP of new order
          notify({ sound: true, vibrate: [200, 100, 200] });
          toast({
            title: "🚀 Nouvelle mission !",
            description: `${newOrder.origin_city} → ${newOrder.destination_city}`,
            duration: 10000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `gp_id=eq.${gpProfile.id}`
        },
        (payload) => {
          const updatedOrder = payload.new;
          setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gpProfile?.id, notify, toast]);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        toast({
          title: "Accès refusé",
          description: "Vous devez être un GP inscrit",
          variant: "destructive",
        });
        navigate("/gp/inscription");
        return;
      }

      setGpProfile(profile);

      const { data: walletData } = await supabase
        .from("gp_wallets")
        .select("*")
        .eq("gp_id", profile.id)
        .maybeSingle();

      setWallet(walletData);

      // Filtrer uniquement les offres actives et valides
      const { data: offersData } = await supabase
        .from("gp_offers")
        .select("*")
        .eq("gp_id", profile.id)
        .eq("status", "active")
        .gte("departure_date", new Date().toISOString())
        .order("created_at", { ascending: false });

      setOffers(offersData || []);

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("gp_id", profile.id)
        .order("created_at", { ascending: false });

      setOrders(ordersData || []);

    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleBackToOverview = () => {
    setActiveTab("overview");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!gpProfile) return null;

  // Calculate stats
  const pendingUpdateOrders = orders.filter(o => 
    ['accepted', 'collected', 'in_transit'].includes(o.status)
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);
  const weekOrders = orders.filter(o => new Date(o.created_at) >= weekStart);

  // Calculate new KPI stats
  const uniqueClients = [...new Set(orders.map(o => o.client_id))];
  
  const kpiStats = {
    missionsInProgress: pendingUpdateOrders.length,
    missionsCompleted: orders.filter(o => o.status === 'delivered').length,
    totalVolume: orders.reduce((sum, o) => sum + (o.weight || 0), 0),
    totalRevenue: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total_price || 0), 0),
    activeClients: uniqueClients.length,
  };

  const stats = {
    activeOffers: offers.filter(o => o.status === 'active').length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    inProgressOrders: pendingUpdateOrders.length,
    deliveredOrders: orders.filter(o => o.status === 'delivered').length,
    balance: wallet?.balance || 0,
  };

  // Get the most recent active order for the bar
  const activeOrder = orders.find(o => 
    ['accepted', 'collected', 'in_transit'].includes(o.status)
  );

  return (
    <div className="min-h-screen pb-safe bg-background">
      {/* Role-specific Fixed Header with Dropdown - NO Global Header */}
      <div className={`sticky top-0 z-50 ${theme.headerBgClass} ${theme.headerTextClass} py-3 px-4 shadow-md`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{gpProfile.business_name}</h1>
              <p className="text-sm opacity-80">Tableau de bord partenaire</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications button - disabled badge */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative bg-white/10 hover:bg-white/20 text-inherit"
              onClick={() => navigate("/alerts")}
            >
              <Bell className="w-5 h-5" />
            </Button>
            <GPDropdownMenu 
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onCreateOffer={() => setShowCreateOffer(true)}
            />
          </div>
        </div>
      </div>
      {/* MobileHeader removed for GP Dashboard */}

      {/* Pending Validation Banner */}
      {isPendingValidation && (
        <div className="px-4 pt-4">
          <Card className="border-warning/50 bg-warning/10">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-warning flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">Compte en attente de validation</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Votre compte est en cours d'examen par notre équipe. Certaines fonctionnalités sont limitées.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Vous pouvez compléter votre profil et ajouter vos documents en attendant.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rejected/Suspended Banner */}
      {(isRejected || isSuspended) && (
        <div className="px-4 pt-4">
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-destructive flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    {isRejected ? "Compte refusé" : "Compte suspendu"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isRejected 
                      ? "Votre demande a été refusée. Contactez le support pour plus d'informations."
                      : "Votre compte a été suspendu. Contactez le support pour résoudre cette situation."
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Order Bar - Fixed at top */}
      {activeOrder && !isPendingValidation && (
        <ActiveOrderBar order={activeOrder} onRefresh={checkAuthAndLoadData} />
      )}

      {/* Rappel pour les missions en cours */}
      {pendingUpdateOrders.length > 0 && activeTab === "overview" && !isPendingValidation && (
        <div className="px-4 pt-4">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-warning/10 border border-warning/30"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">
                  {pendingUpdateOrders.length} mission{pendingUpdateOrders.length > 1 ? 's' : ''} en attente de mise à jour
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Mettez à jour le statut de vos livraisons pour finaliser les missions
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setActiveTab("orders")}
                >
                  Voir les missions
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === "overview" && (
        <ModernOverviewTab 
          gpProfile={gpProfile}
          kpiStats={kpiStats}
          stats={stats}
          wallet={wallet}
          offers={offers}
          orders={orders}
          pendingOrders={stats.pendingOrders}
          onCreateOffer={() => setShowCreateOffer(true)}
          onSignOut={handleSignOut}
          onViewOrders={() => setActiveTab("orders")}
          onViewWallet={() => setActiveTab("wallet")}
          onViewProfile={() => navigate("/transporter/profile")}
          onRefresh={checkAuthAndLoadData}
        />
      )}

      {activeTab === "offers" && (
        <OffersTab 
          offers={offers}
          onCreateOffer={() => setShowCreateOffer(true)}
          onRefresh={checkAuthAndLoadData}
          onBack={handleBackToOverview}
        />
      )}

      {activeTab === "orders" && (
        <OrdersTab 
          orders={orders}
          gpProfileId={gpProfile.id}
          onRefresh={checkAuthAndLoadData}
          onBack={handleBackToOverview}
        />
      )}

      {activeTab === "wallet" && (
        <WalletTab wallet={wallet} onBack={handleBackToOverview} />
      )}

      {activeTab === "stats" && (
        <StatsTab orders={orders} onBack={handleBackToOverview} />
      )}

      {activeTab === "profile" && (
        <div className="px-4 py-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToOverview} 
            className="-ml-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
          <Button 
            variant="default" 
            className="w-full"
            onClick={() => navigate("/transporter/profile")}
          >
            <User className="w-4 h-4 mr-2" />
            Voir mon profil complet
          </Button>
        </div>
      )}

      <GPMobileNav activeTab={activeTab} onTabChange={setActiveTab} />

      <GPCreateOfferDialog
        open={showCreateOffer}
        onClose={() => setShowCreateOffer(false)}
        gpProfile={gpProfile}
        onSuccess={() => {
          setShowCreateOffer(false);
          checkAuthAndLoadData();
        }}
      />
    </div>
  );
}

// Modern Overview Tab Component with new design - REORGANIZED
function ModernOverviewTab({ 
  gpProfile, 
  kpiStats, 
  stats, 
  wallet, 
  offers, 
  orders, 
  pendingOrders,
  onCreateOffer, 
  onSignOut, 
  onViewOrders,
  onViewWallet,
  onViewProfile,
  onRefresh,
}: any) {
  const navigate = useNavigate();
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Profile Header - Compact */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Bienvenue, {gpProfile.business_name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Tableau de bord Transporteur</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onSignOut}>
          <LogOut className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* PRIORITY 1: Create Offer CTA - EN HAUT */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Button variant="default" size="lg" className="w-full" onClick={onCreateOffer}>
          <Plus className="w-5 h-5" />
          Nouvelle offre de transport
        </Button>
      </motion.div>

      {/* PRIORITY 2: Recent History - EN HAUT */}
      <RecentHistory 
        orders={orders}
        onViewAll={onViewOrders}
        onRefresh={onRefresh}
      />

      {/* Smart Notifications */}
      <SmartNotifications 
        pendingMissions={pendingOrders}
        lastPayment={wallet?.total_earned > 0 ? { amount: wallet.balance, date: "Récemment" } : undefined}
        highDemandZone={gpProfile.zones_covered?.[0]}
      />

      {/* KPI Cards Grid - Compact */}
      <KPICards stats={kpiStats} gpType={gpProfile.gp_type} />

      {/* Quick Actions - More Discrete */}
      <Collapsible open={showMoreOptions} onOpenChange={setShowMoreOptions}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            <span>Plus d'options</span>
            {showMoreOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          {/* Quick Actions */}
          <QuickActions 
            onUpdateProfile={onViewProfile}
            onViewMissions={onViewOrders}
            onViewHistory={onViewOrders}
            onViewStats={onViewWallet}
          />

          {/* Profile Completion Gauge */}
          <ProfileCompletionGauge 
            profile={gpProfile}
            onCompleteProfile={onViewProfile}
          />

          {/* Badge System */}
          <BadgeSystem 
            isVerified={gpProfile.status === 'verified'}
            rating={gpProfile.rating || 0}
            totalDeliveries={gpProfile.total_deliveries || 0}
            totalVolume={kpiStats.totalVolume}
            isPremium={gpProfile.subscription === 'premium'}
            gpType={gpProfile.gp_type}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Offers Tab Component  
function OffersTab({ offers, onCreateOffer, onRefresh, onBack }: any) {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Retour
      </Button>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Mes offres</h2>
        <Button variant="default" size="sm" onClick={onCreateOffer}>
          <Plus className="w-4 h-4" />
          Nouvelle
        </Button>
      </div>

      {offers.length === 0 ? (
        <div className="mobile-card text-center py-8">
          <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">Aucune offre active</p>
          <Button variant="default" onClick={onCreateOffer}>Créer une offre</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((offer: any) => (
            <div key={offer.id} className="mobile-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{offer.origin_city}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium text-sm">{offer.destination_city}</span>
                </div>
                <Badge variant={offer.status === 'active' ? 'success' : 'pending'}>
                  {offer.status === 'active' ? 'Active' : offer.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {new Date(offer.departure_date).toLocaleDateString('fr-FR')}
                </span>
                <span className="font-bold text-primary">{offer.price_per_kg} FCFA/kg</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {offer.available_capacity}/{offer.total_capacity} kg dispo
                </span>
                <span className="text-xs text-muted-foreground">
                  {offer.bookings_count || 0} réservations
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Orders Tab Component with full workflow
function OrdersTab({ orders, gpProfileId, onRefresh, onBack }: { orders: any[]; gpProfileId: string; onRefresh: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      // CRITICAL: Validate enum before DB operation
      const validStatus = assertValidOrderStatus(newStatus);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Mettre à jour le statut de la commande
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: validStatus,
          ...(validStatus === 'delivered' ? { actual_delivery_date: new Date().toISOString() } : {})
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Ajouter l'entrée dans l'historique
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: orderId,
          status: newStatus,
          changed_by: user.id,
          changed_by_type: "gp",
        });

      if (historyError) console.error("History error:", historyError);

      toast({ 
        title: "Statut mis à jour",
        description: `Mission marquée comme "${getOrderStatusLabel(newStatus)}"`,
      });
      onRefresh();
    } catch (error: any) {
      console.error("Update error:", error);
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible de mettre à jour",
        variant: "destructive" 
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Grouper les commandes par statut
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const inProgressOrders = orders.filter(o => ['accepted', 'collected', 'in_transit'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled', 'disputed'].includes(o.status));

  const OrderCard = ({ order }: { order: any }) => {
    const status = order.status as OrderStatus;
    const { nextStatus, nextLabel } = getNextOrderStatus(status);
    const isUpdating = updatingOrderId === order.id;

    return (
      <div className="mobile-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground">{order.order_number}</span>
          <Badge variant={getOrderStatusColor(status) as any}>
            {getOrderStatusLabel(status)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{order.origin_city}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium text-sm">{order.destination_city}</span>
        </div>
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-muted-foreground">{order.weight} kg</span>
          <span className="font-bold">{order.total_price?.toLocaleString()} FCFA</span>
        </div>

        {/* Workflow buttons */}
        {nextStatus && nextLabel && (
          <Button 
            variant={nextStatus === 'delivered' ? 'success' : nextStatus === 'accepted' ? 'success' : 'secondary'}
            size="sm" 
            className="w-full"
            disabled={isUpdating}
            onClick={() => updateOrderStatus(order.id, nextStatus)}
          >
            {isUpdating ? (
              <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <>
                {nextStatus === 'accepted' && <CheckCircle className="w-4 h-4" />}
                {nextStatus === 'collected' && <Package className="w-4 h-4" />}
                {nextStatus === 'in_transit' && <Truck className="w-4 h-4" />}
                {nextStatus === 'delivered' && <CheckCircle className="w-4 h-4" />}
                {nextLabel}
              </>
            )}
          </Button>
        )}

        {status === 'delivered' && (
          <div className="flex items-center justify-center gap-2 text-success text-sm">
            <CheckCircle className="w-4 h-4" />
            Mission terminée
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Retour
      </Button>

      <h2 className="font-semibold text-foreground">Mes missions</h2>

      {orders.length === 0 ? (
        <div className="mobile-card text-center py-8">
          <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">Aucune mission</p>
        </div>
      ) : (
        <>
          {/* Nouvelles demandes */}
          {pendingOrders.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Nouvelles demandes ({pendingOrders.length})
              </h3>
              <div className="space-y-3">
                {pendingOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}

          {/* Missions en cours */}
          {inProgressOrders.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                En cours ({inProgressOrders.length})
              </h3>
              <div className="space-y-3">
                {inProgressOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}

          {/* Missions terminées */}
          {completedOrders.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Terminées ({completedOrders.length})
              </h3>
              <div className="space-y-3">
                {completedOrders.slice(0, 5).map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Wallet Tab Component
function WalletTab({ wallet, onBack }: { wallet: WalletData | null; onBack: () => void }) {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Retour
      </Button>

      <h2 className="font-semibold text-foreground">Mon Wallet</h2>

      {/* Balance Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary rounded-2xl p-5 text-primary-foreground"
      >
        <p className="text-primary-foreground/80 text-sm mb-1">Solde disponible</p>
        <p className="text-3xl font-bold">{(wallet?.balance || 0).toLocaleString()} FCFA</p>
        
        {(wallet?.pending_balance || 0) > 0 && (
          <div className="mt-3 pt-3 border-t border-primary-foreground/20">
            <p className="text-primary-foreground/70 text-xs">En attente</p>
            <p className="font-semibold">{wallet?.pending_balance.toLocaleString()} FCFA</p>
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="mobile-card">
          <p className="text-xs text-muted-foreground mb-1">Total gagné</p>
          <p className="text-lg font-bold text-success">{(wallet?.total_earned || 0).toLocaleString()} FCFA</p>
        </div>
        <div className="mobile-card">
          <p className="text-xs text-muted-foreground mb-1">En attente</p>
          <p className="text-lg font-bold text-warning">{(wallet?.pending_balance || 0).toLocaleString()} FCFA</p>
        </div>
      </div>

      {/* Withdraw Button */}
      <Button variant="gold" size="lg" className="w-full">
        <Wallet className="w-5 h-5" />
        Retirer des fonds
      </Button>
    </div>
  );
}

// Stats Tab Component
function StatsTab({ orders, onBack }: { orders: any[]; onBack: () => void }) {
  return (
    <div className="px-4 py-4 space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Retour
      </Button>

      <h2 className="font-semibold text-foreground">Statistiques</h2>

      <GPStatsCharts orders={orders} gpType="transporteur" />
    </div>
  );
}
