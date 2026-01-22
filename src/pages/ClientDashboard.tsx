import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, Clock, MapPin, ArrowRight, Plus,
  CheckCircle, Truck, User, LogOut, Search, FileText,
  Heart, History, Send, Star, Edit2, Save, X, Mail, Phone,
  Home, Camera, Settings, AlertCircle, HelpCircle, Scale, Gift
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { ClientCustomRequests } from "@/components/client/ClientCustomRequests";
import { CancelOrderButton } from "@/components/client/CancelOrderButton";
import { DisputeButton } from "@/components/support/DisputeButton";
import { RateOrderDialog } from "@/components/RateOrderDialog";
import { PageLoader } from "@/components/ui/PageLoader";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ORDER_STATUS_LABELS, isValidOrderStatus } from "@/lib/enumMappings";
import { useFavorites } from "@/hooks/useFavorites";
import { getTransportIcon, getTransportLabel } from "@/lib/transportTypes";
import { TrustLevelBadge, calculateTrustLevel } from "@/components/ui/trust-level-badge";
import { LoyaltyCard, useLoyaltyNotifications } from "@/components/loyalty/LoyaltySystem";
import { useLoyaltyPushNotifications } from "@/hooks/useLoyaltyPushNotifications";

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
  has_review?: boolean;
  gp_name?: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  address: string | null;
  created_at: string;
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
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favoriteOffers, setFavoriteOffers] = useState<FavoriteOffer[]>([]);
  const [activeMainTab, setActiveMainTab] = useState("ongoing");
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    city: "",
    address: "",
  });
  
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding("client");
  const { favorites } = useFavorites();
  
  // Enable loyalty push notifications
  useLoyaltyPushNotifications({ userId: profile?.user_id || null, enabled: true });

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

      const profileWithEmail = {
        ...profileData,
        email: user.email,
      } as UserProfile;

      setProfile(profileWithEmail);
      setFormData({
        full_name: profileData?.full_name || "",
        phone: profileData?.phone || "",
        city: profileData?.city || "",
        address: profileData?.address || "",
      });

      // Load orders with GP names and reviews
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersData && ordersData.length > 0) {
        const gpIds = [...new Set(ordersData.map(o => o.gp_id))];
        const { data: gpProfiles } = await supabase
          .from("public_gp_profiles")
          .select("id, business_name")
          .in("id", gpIds);

        const { data: reviews } = await supabase
          .from("reviews")
          .select("order_id")
          .in("order_id", ordersData.map(o => o.id));

        const reviewedOrderIds = new Set(reviews?.map(r => r.order_id) || []);

        const ordersWithDetails = ordersData.map(order => ({
          ...order,
          gp_name: gpProfiles?.find(gp => gp.id === order.gp_id)?.business_name || "Transporteur",
          has_review: reviewedOrderIds.has(order.id),
        }));

        setOrders(ordersWithDetails);
      }

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

  const calculateProfileCompletion = (): number => {
    if (!profile) return 0;
    const fields = [profile.full_name, profile.email, profile.phone, profile.city, profile.address, profile.avatar_url];
    const completed = fields.filter(field => field && String(field).trim() !== "").length;
    return Math.round((completed / fields.length) * 100);
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          city: formData.city,
          address: formData.address,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        full_name: formData.full_name,
        phone: formData.phone,
        city: formData.city,
        address: formData.address,
      });
      setEditing(false);
      toast({ title: "Profil mis à jour" });
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setSaving(false);
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

  const completion = calculateProfileCompletion();
  const trustLevel = calculateTrustLevel({ profileCompletion: completion });
  const memberSince = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) 
    : '';

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

      <OnboardingDialog
        open={showOnboarding}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
        role="client"
        userName={profile?.full_name || undefined}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-card relative overflow-hidden"
        >
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/20">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                <Camera className="w-3 h-3 text-primary-foreground" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-bold text-lg text-foreground truncate">
                  {profile?.full_name || 'Client'}
                </h2>
                <TrustLevelBadge level={trustLevel} size="sm" />
              </div>
              <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
              <p className="text-xs text-muted-foreground">Membre depuis {memberSince}</p>
            </div>

            <Button variant="ghost" size="icon-sm" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>

          {/* Profile Completion */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Profil complété</span>
              <span className={`text-sm font-bold ${completion === 100 ? 'text-success' : 'text-primary'}`}>
                {completion}%
              </span>
            </div>
            <Progress value={completion} className="h-2" />
            {completion < 100 && (
              <Button 
                variant="link" 
                size="sm" 
                className="p-0 h-auto mt-2 text-xs"
                onClick={() => setActiveMainTab("profile")}
              >
                <AlertCircle className="w-3 h-3 mr-1 text-warning" />
                Compléter mon profil
              </Button>
            )}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mobile-card p-3 text-center">
            <Package className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.totalOrders}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mobile-card p-3 text-center">
            <Clock className="w-5 h-5 text-warning mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.pendingOrders}</p>
            <p className="text-[10px] text-muted-foreground">Attente</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mobile-card p-3 text-center">
            <Truck className="w-5 h-5 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.inTransitOrders}</p>
            <p className="text-[10px] text-muted-foreground">Transit</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mobile-card p-3 text-center">
            <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.deliveredOrders}</p>
            <p className="text-[10px] text-muted-foreground">Livrés</p>
          </motion.div>
        </div>

        {/* Loyalty Card */}
        <Link to="/loyalty" className="block">
          <LoyaltyCard className="mb-2 hover:shadow-md transition-shadow cursor-pointer" />
        </Link>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          <Link to="/demande">
            <Button variant="default" size="lg" className="w-full flex-col h-auto py-3">
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-xs">Nouveau</span>
            </Button>
          </Link>
          <Link to="/demande-personnalisee">
            <Button variant="outline" size="lg" className="w-full flex-col h-auto py-3">
              <FileText className="w-5 h-5 mb-1" />
              <span className="text-xs">Demande</span>
            </Button>
          </Link>
          <Link to="/favorites/transporters">
            <Button variant="outline" size="lg" className="w-full flex-col h-auto py-3">
              <Heart className="w-5 h-5 mb-1" />
              <span className="text-xs">Favoris</span>
            </Button>
          </Link>
          <Link to="/offres">
            <Button variant="outline" size="lg" className="w-full flex-col h-auto py-3">
              <Search className="w-5 h-5 mb-1" />
              <span className="text-xs">Offres</span>
            </Button>
          </Link>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="ongoing" className="gap-1 text-xs">
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Envois</span>
              {ongoingOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{ongoingOrders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-1 text-xs">
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Favoris</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-1 text-xs">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
          </TabsList>

          {/* En cours Tab */}
          <TabsContent value="ongoing" className="mt-4 space-y-3">
            {ongoingOrders.length === 0 ? (
              <div className="mobile-card text-center py-8">
                <Truck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Aucun envoi en cours</p>
                <Link to="/demande"><Button variant="default">Envoyer un colis</Button></Link>
              </div>
            ) : (
              ongoingOrders.map((order, index) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  index={index}
                  getStatusBadge={getStatusBadge}
                  onCancelled={checkAuthAndLoadData}
                  onRate={setRatingOrder}
                />
              ))
            )}
            <ClientCustomRequests />
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
                  onRate={setRatingOrder}
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
                  <Button variant="default"><Search className="w-4 h-4 mr-2" />Parcourir les offres</Button>
                </Link>
              </div>
            ) : (
              <>
                {favoriteOffers.map((offer, index) => (
                  <FavoriteOfferCard key={offer.id} offer={offer} index={index} />
                ))}
                {favorites.size > 5 && (
                  <Link to="/favorites">
                    <Button variant="outline" className="w-full">Voir tous les favoris ({favorites.size})</Button>
                  </Link>
                )}
              </>
            )}
          </TabsContent>

          {/* Profil Tab */}
          <TabsContent value="profile" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Informations personnelles</CardTitle>
                  {!editing ? (
                    <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                      <Edit2 className="w-4 h-4 mr-1" />Modifier
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="w-4 h-4" /></Button>
                      <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4 mr-1" />{saving ? "..." : "Sauver"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Nom complet</Label>
                    {editing ? (
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-10" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                      </div>
                    ) : (
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {profile?.full_name || <span className="text-muted-foreground italic">Non renseigné</span>}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />{profile?.email}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Téléphone</Label>
                    {editing ? (
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-10" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                    ) : (
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {profile?.phone || <span className="text-muted-foreground italic">Non renseigné</span>}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Ville</Label>
                    {editing ? (
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-10" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                      </div>
                    ) : (
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {profile?.city || <span className="text-muted-foreground italic">Non renseigné</span>}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-muted-foreground">Adresse</Label>
                    {editing ? (
                      <div className="relative">
                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-10" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                      </div>
                    ) : (
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <Home className="w-4 h-4 text-muted-foreground" />
                        {profile?.address || <span className="text-muted-foreground italic">Non renseigné</span>}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="space-y-2">
              <Link to="/settings">
                <div className="mobile-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Settings className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span className="font-medium">Paramètres</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rating Dialog */}
      {ratingOrder && (
        <RateOrderDialog
          open={!!ratingOrder}
          onOpenChange={(open) => !open && setRatingOrder(null)}
          orderId={ratingOrder.id}
          gpId={ratingOrder.gp_id}
          gpName={ratingOrder.gp_name || "Transporteur"}
          onSuccess={checkAuthAndLoadData}
        />
      )}

      <MobileNav />
    </div>
  );
}

function OrderCard({ 
  order, 
  index, 
  getStatusBadge,
  onCancelled,
  onRate,
}: { 
  order: Order; 
  index: number; 
  getStatusBadge: (status: string) => JSX.Element;
  onCancelled?: () => void;
  onRate?: (order: Order) => void;
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
      {order.gp_name && (
        <p className="text-xs text-muted-foreground mb-2">
          <Truck className="w-3 h-3 inline mr-1" />{order.gp_name}
        </p>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{order.weight} kg</span>
        <span className="font-bold">{order.total_price.toLocaleString()} FCFA</span>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleDateString('fr-FR')}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {order.tracking_code && (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/tracking?code=${order.tracking_code}`)}>
              Suivre<ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {order.status === "pending" && onCancelled && (
            <CancelOrderButton orderId={order.id} orderStatus={order.status} onCancelled={onCancelled} />
          )}
          {order.status === "delivered" && !order.has_review && onRate && (
            <Button variant="outline" size="sm" onClick={() => onRate(order)} className="text-warning border-warning/30">
              <Star className="w-4 h-4 mr-1" />Noter
            </Button>
          )}
          {order.has_review && (
            <Badge variant="outline" className="text-success"><CheckCircle className="w-3 h-3 mr-1" />Noté</Badge>
          )}
          {/* Dispute/Support Button */}
          <DisputeButton orderId={order.id} orderNumber={order.order_number} orderStatus={order.status} />
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
        <span className="text-xs text-muted-foreground">
          {new Date(offer.departure_date).toLocaleDateString('fr-FR')}
        </span>
        <span className="font-bold text-primary">{offer.price_per_kg} {offer.currency}/kg</span>
      </div>
    </motion.div>
  );
}
