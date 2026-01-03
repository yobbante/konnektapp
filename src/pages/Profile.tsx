import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  User, Mail, Phone, MapPin, Camera, Edit2, Save, X, Home,
  Package, CheckCircle, Clock, Truck, LogOut, Shield,
  Bell, ChevronRight, AlertCircle, Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RateOrderDialog } from "@/components/RateOrderDialog";
import { ORDER_STATUS_LABELS, isValidOrderStatus } from "@/lib/enumMappings";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  country_code: string | null;
  city: string | null;
  address: string | null;
  is_gp: boolean | null;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  status: string;
  total_price: number;
  created_at: string;
  gp_id: string;
  tracking_code: string | null;
  has_review?: boolean;
  gp_name?: string;
}

interface OrderStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
}

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isGP, isAuthenticated, loading: roleLoading } = useUserRole();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats>({ total: 0, pending: 0, inTransit: 0, delivered: 0 });
  const [activeTab, setActiveTab] = useState<"profile" | "orders">("profile");
  
  // Rating dialog state
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    city: "",
    address: "",
  });

  useEffect(() => {
    if (!roleLoading && !isAuthenticated) {
      navigate("/auth");
      return;
    }
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated, roleLoading]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

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

      // Load orders with GP names
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, order_number, origin_city, destination_city, status, total_price, created_at, gp_id, tracking_code")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersData && ordersData.length > 0) {
        // Get GP names
        const gpIds = [...new Set(ordersData.map(o => o.gp_id))];
        const { data: gpProfiles } = await supabase
          .from("public_gp_profiles")
          .select("id, business_name")
          .in("id", gpIds);

        // Get existing reviews
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
        setOrderStats({
          total: ordersData.length,
          pending: ordersData.filter(o => o.status === 'pending').length,
          inTransit: ordersData.filter(o => o.status === 'in_transit' || o.status === 'accepted').length,
          delivered: ordersData.filter(o => o.status === 'delivered').length,
        });
      }

    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompletion = (): number => {
    if (!profile) return 0;
    
    const fields = [
      profile.full_name,
      profile.email,
      profile.phone,
      profile.city,
      profile.address,
      profile.avatar_url,
    ];
    
    const completed = fields.filter(field => field && String(field).trim() !== "").length;
    return Math.round((completed / fields.length) * 100);
  };

  const getCompletionTips = (): string[] => {
    if (!profile) return [];
    const tips: string[] = [];
    if (!profile.full_name) tips.push("Ajoutez votre nom complet");
    if (!profile.phone) tips.push("Ajoutez votre téléphone");
    if (!profile.city) tips.push("Indiquez votre ville");
    if (!profile.address) tips.push("Ajoutez votre adresse");
    if (!profile.avatar_url) tips.push("Ajoutez une photo de profil");
    return tips;
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
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées",
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    const variantMap: Record<string, "warning" | "default" | "secondary" | "success" | "destructive" | "outline"> = {
      pending: "warning",
      accepted: "default",
      collected: "secondary",
      in_transit: "secondary",
      delivered: "success",
      cancelled: "destructive",
      disputed: "destructive",
    };
    
    if (isValidOrderStatus(status)) {
      return <Badge variant={variantMap[status] || "outline"}>{ORDER_STATUS_LABELS[status]}</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const completion = calculateProfileCompletion();
  const tips = getCompletionTips();
  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <MobileHeader title="Mon Espace" />

      {/* Tab Navigation */}
      <div className="px-4 pt-4">
        <div className="flex rounded-xl bg-muted p-1">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "profile" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground"
            }`}
          >
            <User className="w-4 h-4" />
            Mon profil
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "orders" 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground"
            }`}
          >
            <Package className="w-4 h-4" />
            Mes envois
            {orderStats.total > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                {orderStats.total}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === "profile" && (
        <div className="px-4 py-4 space-y-4">
          {/* Profile Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mobile-card relative overflow-hidden"
          >
            {/* Badges */}
            <div className="absolute top-3 right-3 flex gap-2">
              {isAdmin && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Admin
                </Badge>
              )}
              {isGP && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  GP
                </Badge>
              )}
            </div>

            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/20">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
                <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
                  <Camera className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <h2 className="font-bold text-xl text-foreground truncate">
                  {profile?.full_name || 'Utilisateur'}
                </h2>
                <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Membre depuis {memberSince}</p>
              </div>
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
              {tips.length > 0 && (
                <div className="mt-3 space-y-1">
                  {tips.slice(0, 2).map((tip, i) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-warning" />
                      {tip}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-4 gap-2"
          >
            <div className="mobile-card text-center py-3">
              <Package className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{orderStats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="mobile-card text-center py-3">
              <Clock className="w-5 h-5 text-warning mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{orderStats.pending}</p>
              <p className="text-[10px] text-muted-foreground">Attente</p>
            </div>
            <div className="mobile-card text-center py-3">
              <Truck className="w-5 h-5 text-secondary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{orderStats.inTransit}</p>
              <p className="text-[10px] text-muted-foreground">Transit</p>
            </div>
            <div className="mobile-card text-center py-3">
              <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{orderStats.delivered}</p>
              <p className="text-[10px] text-muted-foreground">Livrés</p>
            </div>
          </motion.div>

          {/* Edit Profile Section */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Informations personnelles</CardTitle>
                  {!editing ? (
                    <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                      <Edit2 className="w-4 h-4" />
                      Modifier
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                      <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4" />
                        {saving ? "..." : "Sauver"}
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
                        <Input 
                          className="pl-10"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          placeholder="Votre nom complet"
                        />
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
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {profile?.email}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Téléphone</Label>
                    {editing ? (
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          className="pl-10"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+221 77 123 45 67"
                        />
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
                        <Input 
                          className="pl-10"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="Dakar"
                        />
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
                        <Input 
                          className="pl-10"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Votre adresse complète"
                        />
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
          </motion.div>

          {/* Quick Access Links */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <h3 className="font-semibold text-foreground px-1">Accès rapide</h3>
            
            <Link to="/messages">
              <div className="mobile-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Messages</p>
                    <p className="text-xs text-muted-foreground">Conversations avec les GP</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>

            {isGP && (
              <Link to="/gp/dashboard">
                <div className="mobile-card flex items-center justify-between border-l-4 border-l-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Espace GP</p>
                      <p className="text-xs text-muted-foreground">Gérer vos missions</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            )}

            {isAdmin && (
              <Link to="/admin">
                <div className="mobile-card flex items-center justify-between border-l-4 border-l-destructive">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Administration</p>
                      <p className="text-xs text-muted-foreground">Dashboard admin</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            )}
          </motion.div>

          {/* Sign Out */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
              Se déconnecter
            </Button>
          </motion.div>
        </div>
      )}

      {activeTab === "orders" && (
        <div className="px-4 py-4 space-y-4">
          {/* Order Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Badge variant="default" className="cursor-pointer whitespace-nowrap">Tous ({orderStats.total})</Badge>
            <Badge variant="warning" className="cursor-pointer whitespace-nowrap">En attente ({orderStats.pending})</Badge>
            <Badge variant="secondary" className="cursor-pointer whitespace-nowrap">En transit ({orderStats.inTransit})</Badge>
            <Badge variant="success" className="cursor-pointer whitespace-nowrap">Livrés ({orderStats.delivered})</Badge>
          </div>

          {orders.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mobile-card text-center py-10"
            >
              <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Aucun envoi</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Vous n'avez pas encore effectué d'envoi
              </p>
              <Link to="/offres">
                <Button>Voir les offres</Button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {orders.map((order, index) => (
                <motion.div
                  key={order.id}
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
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium text-sm">{order.destination_city}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-2">
                    <Link to={`/gp/${order.gp_id}`} className="text-primary hover:underline text-xs">
                      {order.gp_name}
                    </Link>
                    <span className="font-bold">{order.total_price.toLocaleString()} FCFA</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    
                    <div className="flex gap-2">
                      {order.tracking_code && (
                        <Link to={`/tracking?code=${order.tracking_code}`}>
                          <Button variant="ghost" size="sm">
                            Suivre
                          </Button>
                        </Link>
                      )}
                      
                      {order.status === 'delivered' && !order.has_review && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setRatingOrder(order)}
                          className="text-warning border-warning/30"
                        >
                          <Star className="w-4 h-4" />
                          Noter
                        </Button>
                      )}
                      
                      {order.has_review && (
                        <Badge variant="outline" className="text-success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Noté
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rating Dialog */}
      {ratingOrder && (
        <RateOrderDialog
          open={!!ratingOrder}
          onOpenChange={(open) => !open && setRatingOrder(null)}
          orderId={ratingOrder.id}
          gpId={ratingOrder.gp_id}
          gpName={ratingOrder.gp_name || "Transporteur"}
          onSuccess={loadProfile}
        />
      )}

      <MobileNav />
    </div>
  );
}
