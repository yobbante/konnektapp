import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, Wallet, BarChart3, Plus, ArrowUpRight, ArrowDownRight,
  TrendingUp, Clock, CheckCircle, AlertCircle, Eye, Edit, Trash2,
  MapPin, Calendar, Star, ChevronRight, Bell, Settings, LogOut,
  Zap, Truck, Ship, Plane, Briefcase, Users, DollarSign
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GPDashboardHeader } from "@/components/gp/GPDashboardHeader";
import { GPStatsCards } from "@/components/gp/GPStatsCards";
import { GPOffersTable } from "@/components/gp/GPOffersTable";
import { GPOrdersTable } from "@/components/gp/GPOrdersTable";
import { GPWalletCard } from "@/components/gp/GPWalletCard";
import { GPCreateOfferDialog } from "@/components/gp/GPCreateOfferDialog";

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
  subscription: string;
  rating: number;
  total_deliveries: number;
}

interface Wallet {
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
  const [wallet, setWallet] = useState<Wallet | null>(null);
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

      // Fetch GP profile
      const { data: profile, error: profileError } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        toast({
          title: "Accès refusé",
          description: "Vous devez être un GP inscrit pour accéder à ce dashboard",
          variant: "destructive",
        });
        navigate("/gp/inscription");
        return;
      }

      setGpProfile(profile);

      // Fetch wallet
      const { data: walletData } = await supabase
        .from("gp_wallets")
        .select("*")
        .eq("gp_id", profile.id)
        .maybeSingle();

      setWallet(walletData);

      // Fetch offers
      const { data: offersData } = await supabase
        .from("gp_offers")
        .select("*")
        .eq("gp_id", profile.id)
        .order("created_at", { ascending: false });

      setOffers(offersData || []);

      // Fetch orders
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
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-secondary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!gpProfile) {
    return null;
  }

  const stats = {
    totalOffers: offers.length,
    activeOffers: offers.filter(o => o.status === 'active').length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    inTransitOrders: orders.filter(o => o.status === 'in_transit').length,
    completedOrders: orders.filter(o => o.status === 'delivered').length,
    revenue: wallet?.total_earned || 0,
    balance: wallet?.balance || 0,
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <GPDashboardHeader 
        gpProfile={gpProfile} 
        onSignOut={handleSignOut}
      />

      <main className="container py-8">
        {/* Welcome & Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                Bienvenue, {gpProfile.business_name}
              </h1>
              <div className="flex items-center gap-3">
                <Badge variant={gpProfile.status === 'verified' ? 'success' : 'pending'}>
                  {gpProfile.status === 'verified' ? 'Vérifié' : 'En attente'}
                </Badge>
                <Badge variant={gpProfile.subscription === 'premium' ? 'gold' : 'secondary'}>
                  {gpProfile.subscription === 'premium' ? '⭐ Premium' : 'Gratuit'}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 text-secondary fill-secondary" />
                  {gpProfile.rating?.toFixed(1) || '0.0'}
                </div>
              </div>
            </div>
            <Button variant="gold" onClick={() => setShowCreateOffer(true)}>
              <Plus className="w-4 h-4" />
              Nouvelle offre
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <GPStatsCards stats={stats} />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="offers">Mes offres</TabsTrigger>
            <TabsTrigger value="orders">Commandes</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Orders */}
              <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-foreground">Commandes récentes</h3>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("orders")}>
                    Voir tout
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                {orders.length > 0 ? (
                  <GPOrdersTable orders={orders.slice(0, 5)} compact />
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune commande pour le moment</p>
                  </div>
                )}
              </div>

              {/* Wallet Summary */}
              <GPWalletCard wallet={wallet} compact />
            </div>

            {/* Active Offers */}
            <div className="mt-6 bg-card rounded-2xl border border-border p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-foreground">Offres actives</h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("offers")}>
                  Voir tout
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              {offers.filter(o => o.status === 'active').length > 0 ? (
                <GPOffersTable offers={offers.filter(o => o.status === 'active').slice(0, 3)} compact />
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune offre active</p>
                  <Button variant="gold" size="sm" className="mt-4" onClick={() => setShowCreateOffer(true)}>
                    <Plus className="w-4 h-4" />
                    Créer une offre
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg text-foreground">Mes offres de transport</h3>
                <Button variant="gold" onClick={() => setShowCreateOffer(true)}>
                  <Plus className="w-4 h-4" />
                  Nouvelle offre
                </Button>
              </div>
              <GPOffersTable 
                offers={offers} 
                onRefresh={checkAuthAndLoadData}
              />
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg text-foreground">Historique des commandes</h3>
              </div>
              <GPOrdersTable 
                orders={orders}
                onRefresh={checkAuthAndLoadData}
              />
            </div>
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet">
            <GPWalletCard wallet={wallet} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Offer Dialog */}
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
