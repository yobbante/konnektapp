import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, Clock, MapPin, ArrowRight, Plus,
  CheckCircle, Truck, MessageSquare, User, Settings, LogOut, Search, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { ClientCustomRequests } from "@/components/client/ClientCustomRequests";

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

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState("home");

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

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    inTransitOrders: orders.filter(o => o.status === 'in_transit').length,
    deliveredOrders: orders.filter(o => o.status === 'delivered').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="warning">En attente</Badge>;
      case 'accepted': return <Badge variant="default">Accepté</Badge>;
      case 'in_transit': return <Badge variant="secondary">En transit</Badge>;
      case 'delivered': return <Badge variant="success">Livré</Badge>;
      case 'cancelled': return <Badge variant="destructive">Annulé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader title="Mon Espace" showNotifications />

      {activeTab === "home" && (
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
              <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
              <p className="text-xs text-muted-foreground">Total envois</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mobile-card"
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
              className="mobile-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-secondary" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.inTransitOrders}</p>
              <p className="text-xs text-muted-foreground">En transit</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mobile-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.deliveredOrders}</p>
              <p className="text-xs text-muted-foreground">Livrés</p>
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

          {/* Custom Requests Section */}
          <ClientCustomRequests />

          {/* Recent Orders */}
          {orders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Mes envois récents</h3>
                <button 
                  onClick={() => setActiveTab("orders")}
                  className="text-sm text-primary font-medium"
                >
                  Tout voir
                </button>
              </div>
              <div className="space-y-2">
                {orders.slice(0, 3).map((order, index) => (
                  <motion.div 
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="mobile-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{order.origin_city}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{order.destination_city}</span>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{order.order_number}</span>
                      <span className="font-semibold text-sm">{order.total_price.toLocaleString()} FCFA</span>
                    </div>
                    {order.tracking_code && (
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
            </div>
          )}

          {orders.length === 0 && (
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
          )}
        </div>
      )}

      {activeTab === "orders" && (
        <OrdersTab orders={orders} getStatusBadge={getStatusBadge} />
      )}

      {activeTab === "messages" && (
        <div className="px-4 py-4">
          <Link to="/messages">
            <Button variant="default" className="w-full">
              <MessageSquare className="w-5 h-5" />
              Ouvrir la messagerie
            </Button>
          </Link>
        </div>
      )}

      {activeTab === "profile" && (
        <ProfileTab profile={profile} onSignOut={handleSignOut} />
      )}

      <MobileNav />
    </div>
  );
}

function OrdersTab({ orders, getStatusBadge }: { orders: Order[], getStatusBadge: (status: string) => JSX.Element }) {
  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="font-semibold text-foreground">Tous mes envois</h2>
      
      {orders.length === 0 ? (
        <div className="mobile-card text-center py-8">
          <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun envoi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="mobile-card">
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
                {new Date(order.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab({ profile, onSignOut }: { profile: UserProfile | null, onSignOut: () => void }) {
  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="font-semibold text-foreground">Mon profil</h2>
      
      <div className="mobile-card">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{profile?.full_name || 'Client'}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
        </div>
        
        {profile?.phone && (
          <div className="py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Téléphone</p>
            <p className="font-medium text-foreground">{profile.phone}</p>
          </div>
        )}
      </div>

      <Button variant="destructive" className="w-full" onClick={onSignOut}>
        <LogOut className="w-5 h-5" />
        Se déconnecter
      </Button>
    </div>
  );
}
