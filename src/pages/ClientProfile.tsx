import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  User, Mail, Phone, MapPin, Camera, Save, ArrowLeft,
  Package, Clock, CheckCircle, Truck, ArrowRight, LogOut, Settings, Edit2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { SwitchToTransporteurButton } from "@/components/profile/SwitchToTransporteurButton";

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
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  avatar_url: string | null;
}

export default function ClientProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    city: "",
    address: "",
  });

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
      if (profileData) {
        setFormData({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          city: profileData.city || "",
          address: profileData.address || "",
        });
      }

      // Load orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      setOrders(ordersData || []);

    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({ ...profile, ...formData });
      setIsEditing(false);
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
    switch (status) {
      case 'pending': return <Badge variant="warning">En attente</Badge>;
      case 'accepted': return <Badge variant="default">Accepté</Badge>;
      case 'collected': return <Badge variant="secondary">Collecté</Badge>;
      case 'in_transit': return <Badge variant="secondary">En transit</Badge>;
      case 'delivered': return <Badge variant="success">Livré</Badge>;
      case 'cancelled': return <Badge variant="destructive">Annulé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => ['pending', 'accepted'].includes(o.status)).length,
    inTransitOrders: orders.filter(o => ['collected', 'in_transit'].includes(o.status)).length,
    deliveredOrders: orders.filter(o => o.status === 'delivered').length,
    totalSpent: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total_price, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader title="Mon Profil" showNotifications />

      <div className="px-4 py-4 space-y-4">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-card"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="font-semibold text-lg text-foreground">
                  {profile?.full_name || 'Client'}
                </h2>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon-sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>

          {isEditing ? (
            <div className="space-y-4 pt-4 border-t border-border">
              <div>
                <Label className="text-xs text-muted-foreground">Nom complet</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Téléphone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ville</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Adresse</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsEditing(false)}
                >
                  Annuler
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-4 border-t border-border">
              {profile?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile?.city && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.city}</span>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mobile-card"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
            <p className="text-xs text-muted-foreground">Total envois</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mobile-card"
          >
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mb-2">
              <CheckCircle className="w-4 h-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.deliveredOrders}</p>
            <p className="text-xs text-muted-foreground">Livrés</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mobile-card"
          >
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center mb-2">
              <Truck className="w-4 h-4 text-warning" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.inTransitOrders}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mobile-card"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center mb-2">
              <Package className="w-4 h-4 text-secondary" />
            </div>
            <p className="text-lg font-bold text-foreground">{stats.totalSpent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">FCFA dépensés</p>
          </motion.div>
        </div>

        {/* Orders History */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">Historique des envois</h3>
          
          {orders.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mobile-card text-center py-8"
            >
              <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Aucun envoi pour le moment</p>
              <Link to="/demande">
                <Button variant="default">Envoyer un colis</Button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {orders.map((order, index) => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
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
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(order.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  {order.tracking_code && ['in_transit', 'collected'].includes(order.status) && (
                    <Link to={`/tracking?code=${order.tracking_code}`}>
                      <Button variant="ghost" size="sm" className="w-full mt-2">
                        Suivre le colis
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-4">
          <Link to="/favorites">
            <Button variant="outline" className="w-full justify-start">
              <Package className="w-4 h-4" />
              Mes favoris
            </Button>
          </Link>
          <Link to="/saved-searches">
            <Button variant="outline" className="w-full justify-start">
              <Settings className="w-4 h-4" />
              Recherches sauvegardées
            </Button>
          </Link>
        </div>

        {/* Switch to Transporteur - Airbnb style */}
        <SwitchToTransporteurButton className="pt-4" />

        {/* Sign Out */}
        <div className="pt-4">
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </Button>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
