import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Luggage, Plane, MapPin, Calendar, Package, 
  CheckCircle, XCircle, MessageCircle, Plus,
  ArrowRight, Clock, Weight, AlertTriangle, User,
  LogOut, Bell, ChevronRight, RefreshCw, Euro, Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDashboardTheme } from "@/hooks/useDashboardTheme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoader } from "@/components/ui/PageLoader";
import { EditVoyageDialog } from "@/components/gp/EditVoyageDialog";
import { EditPricingDialog } from "@/components/gp/EditPricingDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
  rating: number;
  total_deliveries: number;
  phone?: string;
  subscription?: string;
}

interface VoyageOffer {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  arrival_date: string | null;
  available_capacity: number;
  total_capacity: number;
  price_per_kg: number;
  currency: string;
  status: string;
  baggage_types_accepted: string[] | null;
  baggage_restrictions: string | null;
  flight_number: string | null;
  airline: string | null;
}

interface BaggageOrder {
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

// Types de bagages acceptés
const BAGGAGE_TYPES = [
  { value: "valise", label: "Valise" },
  { value: "carton", label: "Carton" },
  { value: "sac", label: "Sac" },
  { value: "colis", label: "Colis" },
  { value: "electronique", label: "Électronique" },
  { value: "vetements", label: "Vêtements" },
  { value: "documents", label: "Documents" },
  { value: "alimentaire_sec", label: "Alimentaire sec" },
];

// Destinations populaires diaspora
const POPULAR_DESTINATIONS = [
  { city: "Paris", country: "FR" },
  { city: "Abidjan", country: "CI" },
  { city: "Dakar", country: "SN" },
  { city: "Dubaï", country: "AE" },
  { city: "Montréal", country: "CA" },
  { city: "New York", country: "US" },
  { city: "Casablanca", country: "MA" },
  { city: "Douala", country: "CM" },
];

export default function GPBagagesInternationalDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const theme = useDashboardTheme("partner");
  
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [voyages, setVoyages] = useState<VoyageOffer[]>([]);
  const [orders, setOrders] = useState<BaggageOrder[]>([]);
  const [activeTab, setActiveTab] = useState("voyages");
  const [showCreateVoyage, setShowCreateVoyage] = useState(false);
  const [showEditVoyage, setShowEditVoyage] = useState(false);
  const [showEditPricing, setShowEditPricing] = useState(false);
  const [selectedVoyage, setSelectedVoyage] = useState<VoyageOffer | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile, error } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("gp_type", "bagages_international")
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        toast({
          title: "Accès refusé",
          description: "Vous devez être inscrit en tant que GP Bagages International",
          variant: "destructive",
        });
        navigate("/gp/inscription");
        return;
      }

      setGpProfile(profile);

      // Load voyages (offers)
      const { data: offersData } = await supabase
        .from("gp_offers")
        .select("*")
        .eq("gp_id", profile.id)
        .order("departure_date", { ascending: true });

      setVoyages(offersData || []);

      // Load orders (baggage requests)
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("gp_id", profile.id)
        .order("created_at", { ascending: false });

      setOrders(ordersData || []);

    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "accepted" })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "✅ Bagage accepté",
        description: "Le client sera notifié de votre acceptation",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'accepter le bagage",
        variant: "destructive",
      });
    }
  };

  const handleRefuseOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Bagage refusé",
        description: "Le client sera notifié",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de refuser le bagage",
        variant: "destructive",
      });
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: "delivered",
          actual_delivery_date: new Date().toISOString()
        })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "🎉 Bagage livré !",
        description: "Mission terminée avec succès",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de marquer comme livré",
        variant: "destructive",
      });
    }
  };

  const handleContactClient = async (clientId: string, orderId: string) => {
    // Navigate to messages with client context
    navigate(`/messages?client=${clientId}&order=${orderId}`);
  };

  // GP Bagages - No loader, direct content display
  if (!gpProfile && !loading) return null;

  const pendingOrders = orders.filter(o => o.status === "pending");
  const activeOrders = orders.filter(o => ["accepted", "collected", "in_transit"].includes(o.status));
  const completedOrders = orders.filter(o => o.status === "delivered");
  const upcomingVoyages = voyages.filter(v => v.status === "active" && new Date(v.departure_date) > new Date());

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header */}
      <div className={`sticky top-0 z-50 ${theme.headerBgClass} ${theme.headerTextClass} py-4 px-4 shadow-lg`} style={{ paddingTop: 'calc(16px + var(--safe-top, 0px))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Luggage className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{gpProfile.business_name}</h1>
              <p className="text-sm opacity-80 flex items-center gap-1">
                <Plane className="w-3 h-3" />
                GP Via Bagages International
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="bg-white/10 hover:bg-white/20 text-inherit">
              <Bell className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-white/10 hover:bg-white/20 text-inherit"
              onClick={() => supabase.auth.signOut().then(() => navigate("/"))}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{pendingOrders.length}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{activeOrders.length}</p>
              <p className="text-xs text-muted-foreground">En cours</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{completedOrders.length}</p>
              <p className="text-xs text-muted-foreground">Livrés</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending Orders Alert */}
      {pendingOrders.length > 0 && (
        <div className="px-4 mb-4">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {pendingOrders.length} demande{pendingOrders.length > 1 ? "s" : ""} en attente
                </p>
                <p className="text-sm text-muted-foreground">
                  Répondez rapidement pour maintenir votre réputation
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("demandes")}>
                Voir
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="voyages" className="text-xs">
              <Plane className="w-4 h-4 mr-1" />
              Voyages
            </TabsTrigger>
            <TabsTrigger value="demandes" className="text-xs relative">
              <Package className="w-4 h-4 mr-1" />
              Demandes
              {pendingOrders.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-amber-500">
                  {pendingOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="missions" className="text-xs">
              <CheckCircle className="w-4 h-4 mr-1" />
              Missions
            </TabsTrigger>
            <TabsTrigger value="tarifs" className="text-xs">
              <Euro className="w-4 h-4 mr-1" />
              Tarifs
            </TabsTrigger>
          </TabsList>

          {/* Voyages Tab */}
          <TabsContent value="voyages" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mes Voyages</h2>
              <Button size="sm" onClick={() => setShowCreateVoyage(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Nouveau
              </Button>
            </div>

            {upcomingVoyages.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Plane className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">Aucun voyage à venir</p>
                  <Button onClick={() => setShowCreateVoyage(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Publier un voyage
                  </Button>
                </CardContent>
              </Card>
            ) : (
              upcomingVoyages.map((voyage) => (
                <VoyageCard 
                  key={voyage.id} 
                  voyage={voyage} 
                  onRefresh={loadData}
                  onEdit={() => {
                    setSelectedVoyage(voyage);
                    setShowEditVoyage(true);
                  }}
                />
              ))
            )}
          </TabsContent>

          {/* Demandes Tab */}
          <TabsContent value="demandes" className="space-y-4">
            <h2 className="text-lg font-semibold">Demandes de Bagages</h2>

            {pendingOrders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Aucune demande en attente</p>
                </CardContent>
              </Card>
            ) : (
              pendingOrders.map((order) => (
                <BaggageRequestCard 
                  key={order.id} 
                  order={order}
                  onAccept={() => handleAcceptOrder(order.id)}
                  onRefuse={() => handleRefuseOrder(order.id)}
                  onContact={() => handleContactClient(order.client_id, order.id)}
                />
              ))
            )}
          </TabsContent>

          {/* Missions Tab */}
          <TabsContent value="missions" className="space-y-4">
            <h2 className="text-lg font-semibold">Missions en Cours</h2>

            {activeOrders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Aucune mission active</p>
                </CardContent>
              </Card>
            ) : (
              activeOrders.map((order) => (
                <ActiveMissionCard 
                  key={order.id} 
                  order={order}
                  onMarkDelivered={() => handleMarkDelivered(order.id)}
                  onContact={() => handleContactClient(order.client_id, order.id)}
                />
              ))
            )}

            {completedOrders.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-muted-foreground mt-6">
                  Historique ({completedOrders.length})
                </h3>
                {completedOrders.slice(0, 5).map((order) => (
                  <CompletedMissionCard key={order.id} order={order} />
                ))}
              </>
            )}
          </TabsContent>

          {/* Tarifs Tab */}
          <TabsContent value="tarifs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mes Tarifs</h2>
              <Button size="sm" onClick={() => setShowEditPricing(true)}>
                <Edit className="w-4 h-4 mr-1" />
                Modifier
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Prix au kilo</p>
                      <p className="text-sm text-muted-foreground">Défini par voyage</p>
                    </div>
                    <p className="text-xl font-bold text-primary">Variable</p>
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Tarifs forfaitaires</p>
                    <p className="text-sm text-muted-foreground">
                      Cliquez sur "Modifier" pour configurer vos tarifs forfaitaires par objet.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Voyage Dialog */}
      <CreateVoyageDialog 
        open={showCreateVoyage} 
        onClose={() => setShowCreateVoyage(false)}
        gpId={gpProfile.id}
        subscription={gpProfile.subscription}
        onSuccess={() => {
          setShowCreateVoyage(false);
          loadData();
        }}
      />

      {/* Edit Voyage Dialog */}
      <EditVoyageDialog 
        open={showEditVoyage} 
        onClose={() => {
          setShowEditVoyage(false);
          setSelectedVoyage(null);
        }}
        voyage={selectedVoyage}
        onSuccess={() => {
          setShowEditVoyage(false);
          setSelectedVoyage(null);
          loadData();
        }}
      />

      {/* Edit Pricing Dialog */}
      <EditPricingDialog 
        open={showEditPricing} 
        onClose={() => setShowEditPricing(false)}
        gpId={gpProfile.id}
        onSuccess={() => {
          setShowEditPricing(false);
          loadData();
        }}
      />
    </div>
  );
}

// Voyage Card Component
function VoyageCard({ voyage, onRefresh, onEdit }: { voyage: VoyageOffer; onRefresh: () => void; onEdit: () => void }) {
  const remainingCapacity = voyage.available_capacity;
  const capacityPercent = (remainingCapacity / voyage.total_capacity) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={onEdit}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plane className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">
                  {voyage.origin_city} → {voyage.destination_city}
                </p>
                <p className="text-xs text-muted-foreground">
                  {voyage.airline && `${voyage.airline} `}
                  {voyage.flight_number && `• Vol ${voyage.flight_number}`}
                </p>
              </div>
            </div>
            <Badge variant={voyage.status === "active" ? "default" : "secondary"}>
              {voyage.status === "active" ? "Actif" : "Inactif"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{format(new Date(voyage.departure_date), "dd MMM", { locale: fr })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Weight className="w-4 h-4 text-muted-foreground" />
              <span>{remainingCapacity} kg</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-primary">
              {voyage.price_per_kg} {voyage.currency}/kg
            </div>
          </div>

          {/* Capacity Bar */}
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {remainingCapacity} kg disponibles sur {voyage.total_capacity} kg
          </p>

          {voyage.baggage_types_accepted && voyage.baggage_types_accepted.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {voyage.baggage_types_accepted.slice(0, 4).map((type) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {BAGGAGE_TYPES.find(t => t.value === type)?.label || type}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Baggage Request Card Component
function BaggageRequestCard({ 
  order, 
  onAccept, 
  onRefuse, 
  onContact 
}: { 
  order: BaggageOrder; 
  onAccept: () => void; 
  onRefuse: () => void;
  onContact: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold">{order.order_number}</p>
              <p className="text-sm text-muted-foreground">
                {order.origin_city} → {order.destination_city}
              </p>
            </div>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              En attente
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div className="flex items-center gap-2">
              <Weight className="w-4 h-4 text-muted-foreground" />
              <span>{order.weight} kg</span>
            </div>
            <div className="flex items-center gap-2 font-semibold">
              {order.total_price.toLocaleString()} {order.currency}
            </div>
          </div>

          {order.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {order.description}
            </p>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 border-red-500/30 text-red-600 hover:bg-red-500/10"
              onClick={onRefuse}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Refuser
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onContact}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              className="flex-1"
              onClick={onAccept}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Accepter
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Active Mission Card Component
function ActiveMissionCard({ 
  order, 
  onMarkDelivered, 
  onContact 
}: { 
  order: BaggageOrder; 
  onMarkDelivered: () => void;
  onContact: () => void;
}) {
  const statusLabels: Record<string, string> = {
    accepted: "Accepté",
    collected: "Collecté",
    in_transit: "En transit",
  };

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold">{order.order_number}</p>
            <p className="text-sm text-muted-foreground">
              {order.origin_city} → {order.destination_city}
            </p>
          </div>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            {statusLabels[order.status] || order.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="flex items-center gap-2">
            <Weight className="w-4 h-4 text-muted-foreground" />
            <span>{order.weight} kg</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{format(new Date(order.created_at), "dd/MM", { locale: fr })}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onContact}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Contacter
          </Button>
          <Button 
            size="sm" 
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={onMarkDelivered}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Marquer livré
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Completed Mission Card Component
function CompletedMissionCard({ order }: { order: BaggageOrder }) {
  return (
    <Card className="opacity-80">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {order.origin_city} → {order.destination_city}
              </p>
              <p className="text-xs text-muted-foreground">{order.weight} kg</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-green-600">
            +{order.total_price.toLocaleString()} {order.currency}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Create Voyage Dialog
function CreateVoyageDialog({ 
  open, 
  onClose, 
  gpId, 
  subscription,
  onSuccess 
}: { 
  open: boolean; 
  onClose: () => void;
  gpId: string;
  subscription?: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [navettes, setNavettes] = useState<Array<{ origin_city: string; origin_country: string; destination_city: string; destination_country: string }>>([]);
  const isPremiumOrPro = subscription === "premium" || subscription === "pro";
  const [formData, setFormData] = useState({
    originCity: "",
    originCountry: "SN",
    destinationCity: "",
    destinationCountry: "FR",
    departureDate: "",
    arrivalDate: "",
    totalCapacity: "",
    pricePerKg: "",
    flightNumber: "",
    airline: "",
    baggageTypesAccepted: [] as string[],
    restrictions: "",
  });

  // Load navettes for subscribers
  useEffect(() => {
    if (open && isPremiumOrPro && gpId) {
      supabase.from("gp_navettes").select("origin_city, origin_country, destination_city, destination_country")
        .eq("gp_id", gpId).eq("is_active", true)
        .then(({ data }) => setNavettes(data || []));
    }
  }, [open, gpId, isPremiumOrPro]);

  const selectNavette = (nav: typeof navettes[0]) => {
    setFormData(prev => ({
      ...prev,
      originCity: nav.origin_city,
      originCountry: nav.origin_country,
      destinationCity: nav.destination_city,
      destinationCountry: nav.destination_country,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.originCity || !formData.destinationCity || !formData.departureDate || !formData.totalCapacity || !formData.pricePerKg) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("gp_offers")
        .insert({
          gp_id: gpId,
          origin_city: formData.originCity,
          origin_country: formData.originCountry,
          destination_city: formData.destinationCity,
          destination_country: formData.destinationCountry,
          departure_date: formData.departureDate,
          arrival_date: formData.arrivalDate || null,
          total_capacity: parseFloat(formData.totalCapacity),
          available_capacity: parseFloat(formData.totalCapacity),
          price_per_kg: parseFloat(formData.pricePerKg),
          currency: "EUR",
          transport_type: "bagages_international",
          flight_number: formData.flightNumber || null,
          airline: formData.airline || null,
          baggage_types_accepted: formData.baggageTypesAccepted.length > 0 ? formData.baggageTypesAccepted : null,
          baggage_restrictions: formData.restrictions || null,
          status: "active",
        });

      if (error) throw error;

      toast({
        title: "✈️ Voyage publié !",
        description: "Votre voyage est maintenant visible par les expéditeurs",
      });
      onSuccess();
    } catch (error: any) {
      console.error("Error creating voyage:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le voyage",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleBaggageType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      baggageTypesAccepted: prev.baggageTypesAccepted.includes(type)
        ? prev.baggageTypesAccepted.filter(t => t !== type)
        : [...prev.baggageTypesAccepted, type]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            Publier un voyage
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Navette picker for subscribers */}
          {isPremiumOrPro && navettes.length > 0 && (
            <div>
              <Label className="text-xs mb-1.5 block">Choisir une navette</Label>
              <div className="flex flex-wrap gap-1.5">
                {navettes.map((nav, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectNavette(nav)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                      formData.originCity === nav.origin_city && formData.destinationCity === nav.destination_city
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {nav.origin_city} → {nav.destination_city}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Route */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ville départ *</Label>
              <Input 
                value={formData.originCity}
                onChange={(e) => setFormData({...formData, originCity: e.target.value})}
                placeholder="Ex: Dakar"
              />
            </div>
            <div>
              <Label>Ville arrivée *</Label>
              <Input 
                value={formData.destinationCity}
                onChange={(e) => setFormData({...formData, destinationCity: e.target.value})}
                placeholder="Ex: Paris"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date départ *</Label>
              <Input 
                type="date"
                value={formData.departureDate}
                onChange={(e) => setFormData({...formData, departureDate: e.target.value})}
              />
            </div>
            <div>
              <Label>Date arrivée</Label>
              <Input 
                type="date"
                value={formData.arrivalDate}
                onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
              />
            </div>
          </div>

          {/* Flight Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Compagnie</Label>
              <Input 
                value={formData.airline}
                onChange={(e) => setFormData({...formData, airline: e.target.value})}
                placeholder="Ex: Air France"
              />
            </div>
            <div>
              <Label>N° de vol</Label>
              <Input 
                value={formData.flightNumber}
                onChange={(e) => setFormData({...formData, flightNumber: e.target.value})}
                placeholder="Ex: AF718"
              />
            </div>
          </div>

          {/* Capacity & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Capacité (kg) *</Label>
              <Input 
                type="number"
                value={formData.totalCapacity}
                onChange={(e) => setFormData({...formData, totalCapacity: e.target.value})}
                placeholder="Ex: 30"
              />
            </div>
            <div>
              <Label>Prix/kg (€) *</Label>
              <Input 
                type="number"
                step="0.5"
                value={formData.pricePerKg}
                onChange={(e) => setFormData({...formData, pricePerKg: e.target.value})}
                placeholder="Ex: 8"
              />
            </div>
          </div>

          {/* Baggage Types */}
          <div>
            <Label className="mb-2 block">Types de bagages acceptés</Label>
            <div className="flex flex-wrap gap-2">
              {BAGGAGE_TYPES.map((type) => (
                <Badge 
                  key={type.value}
                  variant={formData.baggageTypesAccepted.includes(type.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleBaggageType(type.value)}
                >
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Restrictions */}
          <div>
            <Label>Restrictions / Conditions</Label>
            <Textarea 
              value={formData.restrictions}
              onChange={(e) => setFormData({...formData, restrictions: e.target.value})}
              placeholder="Ex: Pas de liquides, pas de produits alimentaires périssables..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Publier
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
