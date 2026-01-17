import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, Clock, MapPin, ArrowRight, Plus,
  CheckCircle, Truck, MessageSquare, User, LogOut, Search, FileText,
  Heart, History, Send, Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { ClientCustomRequests } from "@/components/client/ClientCustomRequests";
import { CancelOrderButton } from "@/components/client/CancelOrderButton";
import { PageLoader } from "@/components/ui/PageLoader";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ORDER_STATUS_LABELS, isValidOrderStatus } from "@/lib/enumMappings";
import { useFavorites } from "@/hooks/useFavorites";
import { getTransportIcon, getTransportLabel } from "@/lib/transportTypes";

interface Order {
  id: string;
  order_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  weight: number;
  total_price: number;
  status: string;
  tracking_code: string | null;
  created_at: string;
  gp_id: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

interface FavoriteOffer {
  id: string;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  price_per_kg: number;
  currency: string;
  transport_type: string;
  available_capacity: number;
  gp_profiles?: {
    business_name: string;
    rating: number | null;
  };
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favoriteOffers, setFavoriteOffers] = useState<FavoriteOffer[]>([]);
  const [activeMainTab, setActiveMainTab] = useState("ongoing");
  
  const { showOnboarding, completeOnboarding, skipOnboarding, resetOnboarding } = useOnboarding("client");
  const { favorites } = useFavorites();

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    if (favorites.size > 0) {
      fetchFavoriteOffers();
    } else {
      setFavoriteOffers([]);
    }
  }, [favorites]);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is a GP - redirect to GP dashboard
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (gpProfile) {
        navigate("/gp/dashboard");
        return;
      }

      // Load user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile(profileData);

      // Load orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", user.id)
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

  const fetchFavoriteOffers = async () => {
    if (favorites.size === 0) return;
    
    try {
      const { data, error } = await supabase
        .from("gp_offers")
        .select(`
          id, origin_city, destination_city, departure_date, 
          price_per_kg, currency, transport_type, available_capacity,
          gp_profiles:gp_id (business_name, rating)
        `)
        .in("id", Array.from(favorites))
        .limit(5);

      if (!error && data) {
        setFavoriteOffers(data);
      }
    } catch (error) {
      console.error("Error fetching favorite offers:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return <PageLoader message="Chargement de votre espace..." />;
  }

  const ongoingOrders = orders.filter(o => 
    ["pending", "accepted", "collected", "in_transit"].includes(o.status)
  );
  const completedOrders = orders.filter(o => 
    ["delivered", "cancelled", "disputed"].includes(o.status)
  );

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    inTransitOrders: orders.filter(o => o.status === 'in_transit').length,
    deliveredOrders: orders.filter(o => o.status === 'delivered').length,
  };

  const getStatusBadge = (status: string) => {
    const validStatus = isValidOrderStatus(status) ? status : "pending";
    const label = ORDER_STATUS_LABELS[validStatus];
    
    const variantMap: Record<string, "warning" | "default" | "secondary" | "success" | "destructive" | "outline"> = {
      pending: "warning",
      accepted: "default",
      collected: "secondary",
      in_transit: "secondary",
      delivered: "success",
      cancelled: "destructive",
      disputed: "destructive",
    };
    
    return <Badge variant={variantMap[validStatus] || "outline"}>{label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader title="Mon Espace" showNotifications />

      {/* Onboarding Dialog */}
      <OnboardingDialog
        open={showOnboarding}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
        role="client"
        userName={profile?.full_name || undefined}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Welcome Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Bienvenue,</p>
              <h2 className="font-semibold text-foreground text-lg">
                {profile?.full_name || 'Client'}
              </h2>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mobile-card p-3 text-center"
          >
            <Package className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.totalOrders}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mobile-card p-3 text-center"
          >
            <Clock className="w-5 h-5 text-warning mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.pendingOrders}</p>
            <p className="text-[10px] text-muted-foreground">En attente</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mobile-card p-3 text-center"
          >
            <Truck className="w-5 h-5 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.inTransitOrders}</p>
            <p className="text-[10px] text-muted-foreground">Transit</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mobile-card p-3 text-center"
          >
            <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.deliveredOrders}</p>
            <p className="text-[10px] text-muted-foreground">Livrés</p>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Link to="/demande">
            <Button variant="default" size="lg" className="w-full flex-col h-auto py-3">
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-xs">Nouveau colis</span>
            </Button>
          </Link>
          <Link to="/demande-personnalisee">
            <Button variant="outline" size="lg" className="w-full flex-col h-auto py-3">
              <FileText className="w-5 h-5 mb-1" />
              <span className="text-xs">Demande</span>
            </Button>
          </Link>
          <Link to="/offres">
            <Button variant="outline" size="lg" className="w-full flex-col h-auto py-3">
              <Search className="w-5 h-5 mb-1" />
              <span className="text-xs">Offres</span>
            </Button>
          </Link>
        </div>

        {/* Main Tabs: En cours, Historique, Favoris */}
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="ongoing" className="gap-1.5">
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">En cours</span>
              {ongoingOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {ongoingOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-1.5">
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Favoris</span>
              {favorites.size > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {favorites.size}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* En cours Tab */}
          <TabsContent value="ongoing" className="mt-4 space-y-3">
            {ongoingOrders.length === 0 ? (
              <div className="mobile-card text-center py-8">
                <Truck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Aucun envoi en cours</p>
                <Link to="/demande">
                  <Button variant="default">Envoyer un colis</Button>
                </Link>
              </div>
            ) : (
              ongoingOrders.map((order, index) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  index={index}
                  getStatusBadge={getStatusBadge}
                  onCancelled={checkAuthAndLoadData}
                />
              ))
            )}
          </TabsContent>

          {/* Historique Tab */}
          <TabsContent value="history" className="mt-4 space-y-3">
            {completedOrders.length === 0 ? (
              <div className="mobile-card text-center py-8">
                <History className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">Aucun historique</p>
              </div>
            ) : (
              completedOrders.map((order, index) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  index={index}
                  getStatusBadge={getStatusBadge}
                />
              ))
            )}
          </TabsContent>

          {/* Favoris Tab */}
          <TabsContent value="favorites" className="mt-4 space-y-3">
            {favoriteOffers.length === 0 ? (
              <div className="mobile-card text-center py-8">
                <Heart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Aucun favori sauvegardé</p>
                <Link to="/offres">
                  <Button variant="default">
                    <Search className="w-4 h-4 mr-2" />
                    Parcourir les offres
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {favoriteOffers.map((offer, index) => (
                  <FavoriteOfferCard key={offer.id} offer={offer} index={index} />
                ))}
                {favorites.size > 5 && (
                  <Link to="/favorites">
                    <Button variant="outline" className="w-full">
                      Voir tous les favoris ({favorites.size})
                    </Button>
                  </Link>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Custom Requests Section */}
        <ClientCustomRequests />
      </div>

      <MobileNav />
    </div>
  );
}

function OrderCard({ 
  order, 
  index, 
  getStatusBadge,
  onCancelled 
}: { 
  order: Order; 
  index: number; 
  getStatusBadge: (status: string) => JSX.Element;
  onCancelled?: () => void;
}) {
  const navigate = useNavigate();
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="mobile-card"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-muted-foreground">{order.order_number}</span>
        {getStatusBadge(order.status)}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">{order.origin_city}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span className="font-medium text-sm">{order.destination_city}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{order.weight} kg</span>
        <span className="font-bold">{order.total_price.toLocaleString()} FCFA</span>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleDateString('fr-FR')}
        </p>
        <div className="flex items-center gap-2">
          {order.tracking_code && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/tracking?code=${order.tracking_code}`)}
            >
              Suivre
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {order.status === "pending" && onCancelled && (
            <CancelOrderButton 
              orderId={order.id} 
              orderStatus={order.status}
              onCancelled={onCancelled}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function FavoriteOfferCard({ offer, index }: { offer: FavoriteOffer; index: number }) {
  const navigate = useNavigate();
  const TransportIcon = getTransportIcon(offer.transport_type);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="mobile-card cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => navigate(`/offres/${offer.id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <Badge variant={offer.transport_type as any} className="text-xs">
          <TransportIcon className="w-3 h-3 mr-1" />
          {getTransportLabel(offer.transport_type)}
        </Badge>
        <Heart className="w-4 h-4 text-destructive fill-destructive" />
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">{offer.origin_city}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span className="font-medium text-sm">{offer.destination_city}</span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{new Date(offer.departure_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          <span>•</span>
          <span>{offer.available_capacity} kg</span>
        </div>
        <span className="font-bold text-primary">
          {offer.price_per_kg.toLocaleString()} {offer.currency}/kg
        </span>
      </div>
      
      {offer.gp_profiles && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
            {offer.gp_profiles.business_name?.charAt(0) || 'G'}
          </div>
          <span className="text-xs text-muted-foreground">{offer.gp_profiles.business_name}</span>
          {offer.gp_profiles.rating && (
            <div className="flex items-center gap-1 ml-auto">
              <Star className="w-3 h-3 text-secondary fill-secondary" />
              <span className="text-xs">{offer.gp_profiles.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
