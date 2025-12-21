import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, Wallet, Plus, ChevronRight, Star, 
  TrendingUp, Clock, MapPin, ArrowRight, LogOut,
  AlertTriangle, CheckCircle, Truck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { GPMobileNav } from "@/components/layout/MobileNav";
import { GPCreateOfferDialog } from "@/components/gp/GPCreateOfferDialog";
import { KPICards } from "@/components/gp/dashboard/KPICards";
import { QuickActions } from "@/components/gp/dashboard/QuickActions";
import { BadgeSystem } from "@/components/gp/dashboard/BadgeSystem";
import { ProfileCompletionGauge } from "@/components/gp/dashboard/ProfileCompletionGauge";
import { RecentHistory } from "@/components/gp/dashboard/RecentHistory";
import { SmartNotifications } from "@/components/gp/dashboard/SmartNotifications";
import { 
  OrderStatus, 
  orderStatusConfig, 
  getOrderStatusLabel, 
  getOrderStatusColor,
  getNextOrderStatus 
} from "@/lib/transportTypes";

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
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

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

      const { data: offersData } = await supabase
        .from("gp_offers")
        .select("*")
        .eq("gp_id", profile.id)
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

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader title={gpProfile.business_name} showNotifications />

      {/* Rappel pour les missions en cours */}
      {pendingUpdateOrders.length > 0 && activeTab === "overview" && (
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
          onViewProfile={() => navigate("/gp/profile")}
        />
      )}

      {activeTab === "offers" && (
        <OffersTab 
          offers={offers}
          onCreateOffer={() => setShowCreateOffer(true)}
          onRefresh={checkAuthAndLoadData}
        />
      )}

      {activeTab === "orders" && (
        <OrdersTab 
          orders={orders}
          gpProfileId={gpProfile.id}
          onRefresh={checkAuthAndLoadData}
        />
      )}

      {activeTab === "wallet" && (
        <WalletTab wallet={wallet} />
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

// Modern Overview Tab Component with new design
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
  onViewProfile
}: any) {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Smart Notifications */}
      <SmartNotifications 
        pendingMissions={pendingOrders}
        lastPayment={wallet?.total_earned > 0 ? { amount: wallet.balance, date: "Récemment" } : undefined}
        highDemandZone={gpProfile.zones_covered?.[0]}
      />

      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Bienvenue, {gpProfile.business_name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Tableau de bord transporteur</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onSignOut}>
          <LogOut className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Profile Completion Gauge */}
      <ProfileCompletionGauge 
        profile={gpProfile}
        onCompleteProfile={onViewProfile}
      />

      {/* KPI Cards Grid */}
      <KPICards stats={kpiStats} gpType={gpProfile.gp_type} />

      {/* Quick Actions */}
      <QuickActions 
        onUpdateProfile={onViewProfile}
        onViewMissions={onViewOrders}
        onViewHistory={onViewOrders}
        onViewStats={onViewWallet}
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

      {/* Recent History */}
      <RecentHistory 
        orders={orders}
        onViewAll={onViewOrders}
      />

      {/* Create Offer CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button variant="default" size="lg" className="w-full" onClick={onCreateOffer}>
          <Plus className="w-5 h-5" />
          Nouvelle offre de transport
        </Button>
      </motion.div>
    </div>
  );
}

// Legacy Overview Tab Component (kept for reference)
function OverviewTab({ gpProfile, stats, wallet, offers, orders, onCreateOffer, onSignOut, onViewOrders }: any) {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Profile Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mobile-card"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-foreground">{gpProfile.business_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={gpProfile.status === 'verified' ? 'success' : 'pending'}>
                {gpProfile.status === 'verified' ? 'Vérifié' : 'En attente'}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3 text-warning fill-warning" />
                {gpProfile.rating?.toFixed(1) || '0.0'}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onSignOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mobile-card"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.activeOffers}</p>
          <p className="text-xs text-muted-foreground">Offres actives</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mobile-card cursor-pointer hover:shadow-md transition-shadow"
          onClick={onViewOrders}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-warning" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.pendingOrders}</p>
          <p className="text-xs text-muted-foreground">En attente</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mobile-card cursor-pointer hover:shadow-md transition-shadow"
          onClick={onViewOrders}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Truck className="w-4 h-4 text-secondary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.inProgressOrders}</p>
          <p className="text-xs text-muted-foreground">En cours</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mobile-card"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-success" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.balance.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">FCFA dispo.</p>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <Button variant="default" size="lg" className="w-full" onClick={onCreateOffer}>
        <Plus className="w-5 h-5" />
        Nouvelle offre
      </Button>

      {/* Recent Orders */}
      {orders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Missions récentes</h3>
            <Button variant="ghost" size="sm" onClick={onViewOrders}>
              Voir tout
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 3).map((order: any) => (
              <div key={order.id} className="mobile-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{order.origin_city}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{order.destination_city}</span>
                  </div>
                  <Badge variant={getOrderStatusColor(order.status) as any}>
                    {getOrderStatusLabel(order.status)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{order.order_number}</span>
                  <span className="font-semibold text-sm">{order.total_price} FCFA</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Offers Tab Component  
function OffersTab({ offers, onCreateOffer, onRefresh }: any) {
  return (
    <div className="px-4 py-4 space-y-4">
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
          <p className="text-muted-foreground mb-4">Aucune offre</p>
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
                  {offer.status}
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
function OrdersTab({ orders, gpProfileId, onRefresh }: { orders: any[]; gpProfileId: string; onRefresh: () => void }) {
  const { toast } = useToast();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Mettre à jour le statut de la commande
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: newStatus,
          ...(newStatus === 'delivered' ? { actual_delivery_date: new Date().toISOString() } : {})
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
    const { nextStatus, label } = getNextOrderStatus(status);
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
        {nextStatus && label && (
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
                {label}
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
function WalletTab({ wallet }: { wallet: WalletData | null }) {
  return (
    <div className="px-4 py-4 space-y-4">
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