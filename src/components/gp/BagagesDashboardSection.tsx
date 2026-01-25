import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Luggage, Plane, MapPin, Package, CheckCircle, 
  XCircle, MessageCircle, Clock, Weight, ArrowRight,
  Edit, Euro, Settings, Eye, Plus, Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditVoyageDialog } from "@/components/gp/EditVoyageDialog";
import { EditPricingDialog } from "@/components/gp/EditPricingDialog";
import { RestrictionsManager } from "@/components/gp/RestrictionsManager";
import { GPOrderDetailsSheet } from "@/components/gp/GPOrderDetailsSheet";
import { MissionStatusUpdater } from "@/components/gp/MissionStatusUpdater";
import { CreateBaggageVoyageDialog } from "@/components/gp/CreateBaggageVoyageDialog";
import { CustomRequestsTab } from "@/components/gp/dashboard/CustomRequestsTab";
import { getCurrencySymbol, formatPricePerKg } from "@/components/ui/currency-selector";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

interface BagagesDashboardSectionProps {
  gpId: string;
  gpProfile: {
    id: string;
    business_name: string;
    explicit_restrictions?: string[] | null;
  };
  voyages: VoyageOffer[];
  orders: BaggageOrder[];
  onRefresh: () => void;
  onCreateVoyage: () => void;
}

export function BagagesDashboardSection({
  gpId,
  gpProfile,
  voyages,
  orders,
  onRefresh,
  onCreateVoyage,
}: BagagesDashboardSectionProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("voyages");
  const [showEditVoyage, setShowEditVoyage] = useState(false);
  const [showEditPricing, setShowEditPricing] = useState(false);
  const [showCreateVoyage, setShowCreateVoyage] = useState(false);
  const [selectedVoyage, setSelectedVoyage] = useState<VoyageOffer | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [localRestrictions, setLocalRestrictions] = useState<string[]>(gpProfile.explicit_restrictions || []);

  const pendingOrders = orders.filter(o => o.status === "pending");
  const activeOrders = orders.filter(o => ["accepted", "collected", "in_transit"].includes(o.status));
  const completedOrders = orders.filter(o => o.status === "delivered");
  const upcomingVoyages = voyages.filter(v => v.status === "active" && new Date(v.departure_date) > new Date());
  
  // Get last voyage for smart pre-fill
  const lastVoyage = voyages.length > 0 ? voyages[0] : null;

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
      onRefresh();
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
      onRefresh();
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
      onRefresh();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de marquer comme livré",
        variant: "destructive",
      });
    }
  };

  const handleRestrictionsChange = useCallback((restrictions: string[]) => {
    setLocalRestrictions(restrictions);
  }, []);
  
  const handleOpenCreateVoyage = () => {
    setShowCreateVoyage(true);
  };

  const handleViewOrderDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowOrderDetails(true);
  };

  const handleContactClient = (clientId: string, orderId?: string) => {
    navigate(`/messages?client=${clientId}${orderId ? `&order=${orderId}` : ""}`);
  };

  return (
    <div className="space-y-4">
      {/* Bagages Header Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Luggage className="w-5 h-5 text-primary" />
              <span className="font-medium">Mode Bagages International</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{upcomingVoyages.length} voyages</Badge>
              {pendingOrders.length > 0 && (
                <Badge variant="warning">{pendingOrders.length} demandes</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingOrders.length}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{activeOrders.length}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{completedOrders.length}</p>
            <p className="text-xs text-muted-foreground">Livrés</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="voyages" className="text-xs">
            <Plane className="w-3 h-3 mr-1" />
            Voyages
          </TabsTrigger>
          <TabsTrigger value="demandes" className="text-xs relative">
            <Package className="w-3 h-3 mr-1" />
            Demandes
            {pendingOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                {pendingOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="missions" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Missions
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            Perso.
          </TabsTrigger>
          <TabsTrigger value="tarifs" className="text-xs">
            <Settings className="w-3 h-3 mr-1" />
            Tarifs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voyages" className="mt-3 space-y-3">
          <Button onClick={handleOpenCreateVoyage} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau voyage
          </Button>
          
          {upcomingVoyages.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Plane className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aucun voyage planifié</p>
              </CardContent>
            </Card>
          ) : (
            upcomingVoyages.map((voyage) => (
              <VoyageCard
                key={voyage.id}
                voyage={voyage}
                onEdit={() => {
                  setSelectedVoyage(voyage);
                  setShowEditVoyage(true);
                }}
              />
            ))
          )}
        </TabsContent>

        {/* Demandes Tab */}
        <TabsContent value="demandes" className="mt-3 space-y-3">
          {pendingOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aucune demande en attente</p>
              </CardContent>
            </Card>
          ) : (
            pendingOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAccept={() => handleAcceptOrder(order.id)}
                onRefuse={() => handleRefuseOrder(order.id)}
                onContact={() => handleContactClient(order.client_id, order.id)}
                onViewDetails={() => handleViewOrderDetails(order.id)}
              />
            ))
          )}
        </TabsContent>

        {/* Missions Tab */}
        <TabsContent value="missions" className="mt-3 space-y-3">
          {activeOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aucune mission en cours</p>
              </CardContent>
            </Card>
          ) : (
            activeOrders.map((order) => (
              <ActiveMissionCard
                key={order.id}
                order={order}
                onContact={() => handleContactClient(order.client_id, order.id)}
                onViewDetails={() => handleViewOrderDetails(order.id)}
                onRefresh={onRefresh}
              />
            ))
          )}
        </TabsContent>

        {/* Custom Requests Tab - Demandes Personnalisées */}
        <TabsContent value="custom" className="mt-3">
          <CustomRequestsTab gpId={gpId} />
        </TabsContent>

        {/* Tarifs Tab */}
        <TabsContent value="tarifs" className="mt-3 space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowEditPricing(true)}
          >
            <Euro className="w-4 h-4 mr-2" />
            Gérer mes tarifs forfaitaires
          </Button>

          {/* Restrictions Manager */}
          <RestrictionsManager
            selectedRestrictions={localRestrictions}
            onChange={handleRestrictionsChange}
            gpId={gpId}
            showSaveButton={true}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Dialogs */}
      {selectedVoyage && (
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
            onRefresh();
          }}
        />
      )}

      <EditPricingDialog
        open={showEditPricing}
        onClose={() => setShowEditPricing(false)}
        gpId={gpId}
        onSuccess={() => {
          setShowEditPricing(false);
          onRefresh();
        }}
      />

      {/* Create Baggage Voyage Dialog */}
      <CreateBaggageVoyageDialog
        open={showCreateVoyage}
        onClose={() => setShowCreateVoyage(false)}
        gpId={gpId}
        lastVoyage={lastVoyage}
        onSuccess={() => {
          setShowCreateVoyage(false);
          onRefresh();
        }}
      />

      {/* Order Details Sheet */}
      {selectedOrderId && (
        <GPOrderDetailsSheet
          open={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrderId(null);
          }}
          orderId={selectedOrderId}
          onContact={(clientId) => handleContactClient(clientId, selectedOrderId)}
        />
      )}
    </div>
  );
}

// Voyage Card Component
function VoyageCard({ voyage, onEdit }: { voyage: VoyageOffer; onEdit: () => void }) {
  const departureDate = new Date(voyage.departure_date);
  const isUpcoming = departureDate > new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-card border shadow-sm"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium">{voyage.origin_city}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium">{voyage.destination_city}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="w-3 h-3" />
        </Button>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1">
            <Plane className="w-3 h-3" />
            {format(departureDate, "d MMM", { locale: fr })}
          </span>
          <span className="flex items-center gap-1">
            <Weight className="w-3 h-3" />
            {voyage.available_capacity}/{voyage.total_capacity} kg
          </span>
        </div>
        <Badge variant={voyage.status === "active" ? "success" : "secondary"}>
          {formatPricePerKg(voyage.price_per_kg, voyage.currency || "EUR")}
        </Badge>
      </div>
    </motion.div>
  );
}

// Order Card Component  
function OrderCard({ 
  order, 
  onAccept, 
  onRefuse, 
  onContact,
  onViewDetails,
}: { 
  order: BaggageOrder; 
  onAccept: () => void; 
  onRefuse: () => void; 
  onContact: () => void;
  onViewDetails: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onViewDetails}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Badge variant="warning">{order.order_number}</Badge>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
              <Eye className="w-3 h-3" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {format(new Date(order.created_at), "d MMM HH:mm", { locale: fr })}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{order.origin_city}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium text-sm">{order.destination_city}</span>
        </div>
        
        <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground">
          <span>{order.weight} kg</span>
          <span className="font-semibold text-foreground">{order.total_price} {order.currency}</span>
        </div>
        
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" className="flex-1" onClick={onAccept}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepter
          </Button>
          <Button size="sm" variant="outline" onClick={onContact}>
            <MessageCircle className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onRefuse}>
            <XCircle className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Active Mission Card with status management
function ActiveMissionCard({ 
  order, 
  onContact,
  onViewDetails,
  onRefresh,
}: { 
  order: BaggageOrder; 
  onContact: () => void;
  onViewDetails: () => void;
  onRefresh: () => void;
}) {
  const statusLabels: Record<string, string> = {
    accepted: "Acceptée",
    collected: "Collectée",
    in_transit: "En transit",
  };

  return (
    <Card className="border-primary/20 cursor-pointer hover:shadow-md transition-shadow" onClick={onViewDetails}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="default">{order.order_number}</Badge>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{statusLabels[order.status] || order.status}</Badge>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
              <Eye className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{order.origin_city}</span>
          <ArrowRight className="w-3 h-3" />
          <span className="font-medium text-sm">{order.destination_city}</span>
        </div>

        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="text-muted-foreground">{order.weight} kg</span>
          <span className="font-semibold">{order.total_price} {order.currency}</span>
        </div>
        
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <MissionStatusUpdater
            orderId={order.id}
            currentStatus={order.status}
            onStatusUpdated={onRefresh}
          />
          <Button size="sm" variant="outline" onClick={onContact}>
            <MessageCircle className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
