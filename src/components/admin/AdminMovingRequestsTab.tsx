import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Truck, Home, Phone, MapPin, Calendar, Clock, Package, 
  User, MessageCircle, ChevronDown, Check, X, RefreshCw,
  AlertCircle, DollarSign, Send, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MovingRequest {
  id: string;
  request_number: string;
  client_id: string;
  housing_type: string;
  origin_address: string;
  origin_city: string;
  destination_address: string;
  destination_city: string;
  moving_date: string;
  flexible_date: boolean;
  inventory: any;
  additional_services: string[];
  notes: string | null;
  status: string;
  estimated_price: number | null;
  final_price: number | null;
  admin_notes: string | null;
  created_at: string;
  client?: {
    full_name: string;
    phone: string;
    email: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-800", icon: Clock },
  reviewing: { label: "En cours d'étude", color: "bg-blue-100 text-blue-800", icon: FileText },
  quoted: { label: "Devis envoyé", color: "bg-purple-100 text-purple-800", icon: DollarSign },
  negotiating: { label: "Négociation", color: "bg-orange-100 text-orange-800", icon: MessageCircle },
  accepted: { label: "Accepté", color: "bg-green-100 text-green-800", icon: Check },
  scheduled: { label: "Planifié", color: "bg-indigo-100 text-indigo-800", icon: Calendar },
  in_progress: { label: "En cours", color: "bg-primary/20 text-primary", icon: Truck },
  completed: { label: "Terminé", color: "bg-success/10 text-success", icon: Check },
  cancelled: { label: "Annulé", color: "bg-destructive/10 text-destructive", icon: X },
};

const HOUSING_LABELS: Record<string, string> = {
  studio: "Studio",
  f2: "F2 / T2",
  f3: "F3 / T3",
  f4: "F4 / T4",
  villa: "Villa",
  bureau: "Bureau / Local",
};

export function AdminMovingRequestsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<MovingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<MovingRequest | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("custom_requests")
        .select("*")
        .eq("transport_type", "interne")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch client profiles
      const clientIds = [...new Set((data || []).map(r => r.client_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email")
        .in("user_id", clientIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      const enrichedRequests = (data || []).map(req => ({
        ...req,
        request_number: req.request_number || `MV-${req.id.slice(0, 6).toUpperCase()}`,
        housing_type: req.volume_estimate || "studio",
        origin_address: req.description || "",
        origin_city: req.origin_city,
        destination_address: "",
        destination_city: req.destination_city,
        moving_date: req.pickup_date_from || req.created_at,
        flexible_date: !!req.pickup_date_to,
        inventory: {},
        additional_services: req.additional_services || [],
        notes: req.description,
        estimated_price: req.budget_min,
        final_price: req.budget_max,
        admin_notes: null,
        client: profileMap.get(req.client_id),
      }));

      setRequests(enrichedRequests);
    } catch (error) {
      console.error("Error loading moving requests:", error);
      toast({ title: "Erreur de chargement", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("custom_requests")
        .update({ status: newStatus })
        .eq("id", requestId);

      if (error) throw error;

      toast({ title: "✅ Statut mis à jour" });
      loadRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const sendQuote = async () => {
    if (!selectedRequest || !quotePrice) return;

    setSubmitting(true);
    try {
      const priceNum = parseInt(quotePrice.replace(/\s/g, ""));

      const { error } = await supabase
        .from("custom_requests")
        .update({ 
          status: "quoted",
          budget_max: priceNum,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // Notify client
      await supabase.from("notifications").insert({
        user_id: selectedRequest.client_id,
        type: "moving_quote",
        title: "💰 Devis de déménagement",
        message: `Votre demande de déménagement a reçu un devis: ${priceNum.toLocaleString()} FCFA`,
        related_type: "moving_request",
        related_id: selectedRequest.id,
      });

      toast({ title: "✅ Devis envoyé au client" });
      setQuotePrice("");
      setAdminNotes("");
      loadRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error("Error sending quote:", error);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Stats
  const stats = {
    pending: requests.filter(r => r.status === "pending").length,
    quoted: requests.filter(r => r.status === "quoted").length,
    accepted: requests.filter(r => r.status === "accepted").length,
    inProgress: requests.filter(r => ["scheduled", "in_progress"].includes(r.status)).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
              <p className="text-xs text-amber-600">En attente</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-purple-700">{stats.quoted}</p>
              <p className="text-xs text-purple-600">Devis envoyés</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.accepted}</p>
              <p className="text-xs text-green-600">Acceptés</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
              <p className="text-xs text-blue-600">En cours</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Demandes de déménagement</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => loadRequests(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Home className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-medium text-muted-foreground">Aucune demande de déménagement</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedRequest(request)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-mono font-semibold text-sm">{request.request_number}</p>
                          <Badge className={statusConfig.color} variant="secondary">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), "d MMM HH:mm", { locale: fr })}
                      </p>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="font-medium">{request.origin_city}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{request.destination_city}</span>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Home className="w-3 h-3" />
                        {HOUSING_LABELS[request.housing_type] || request.housing_type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(request.moving_date), "d MMM", { locale: fr })}
                      </span>
                      {request.client && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {request.client.full_name}
                        </span>
                      )}
                    </div>

                    {request.final_price && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-sm font-bold text-primary">
                          Devis: {request.final_price.toLocaleString()} FCFA
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Details Sheet */}
      <Sheet open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selectedRequest && (
            <>
              <SheetHeader className="pb-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-600" />
                  {selectedRequest.request_number}
                </SheetTitle>
              </SheetHeader>

              <div className="py-4 space-y-4">
                {/* Status */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Statut</p>
                  <Badge className={STATUS_CONFIG[selectedRequest.status]?.color || ""}>
                    {STATUS_CONFIG[selectedRequest.status]?.label || selectedRequest.status}
                  </Badge>
                </div>

                {/* Client Info */}
                {selectedRequest.client && (
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Client
                      </h4>
                      <p className="font-medium">{selectedRequest.client.full_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {selectedRequest.client.phone}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Route */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold text-sm">Trajet</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-green-600">Départ</p>
                        <p className="font-medium">{selectedRequest.origin_city}</p>
                        {selectedRequest.origin_address && (
                          <p className="text-sm text-muted-foreground">{selectedRequest.origin_address}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-blue-600">Arrivée</p>
                        <p className="font-medium">{selectedRequest.destination_city}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Details */}
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold text-sm">Détails</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium">{HOUSING_LABELS[selectedRequest.housing_type] || selectedRequest.housing_type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date souhaitée</p>
                        <p className="font-medium">
                          {format(new Date(selectedRequest.moving_date), "d MMMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    {selectedRequest.notes && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        {selectedRequest.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quote Section for pending requests */}
                {selectedRequest.status === "pending" && (
                  <Card className="border-primary/30">
                    <CardContent className="p-4 space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        Envoyer un devis
                      </h4>
                      <Input
                        type="text"
                        placeholder="Prix en FCFA"
                        value={quotePrice}
                        onChange={(e) => setQuotePrice(e.target.value)}
                      />
                      <Textarea
                        placeholder="Notes (optionnel)"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={2}
                      />
                      <Button 
                        className="w-full gap-2"
                        onClick={sendQuote}
                        disabled={!quotePrice || submitting}
                      >
                        <Send className="w-4 h-4" />
                        {submitting ? "Envoi..." : "Envoyer le devis"}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Status Actions */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Changer le statut</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.status === "quoted" && (
                      <Button size="sm" onClick={() => updateStatus(selectedRequest.id, "negotiating")}>
                        Négociation
                      </Button>
                    )}
                    {["quoted", "negotiating"].includes(selectedRequest.status) && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(selectedRequest.id, "accepted")}>
                        <Check className="w-4 h-4 mr-1" />
                        Accepté
                      </Button>
                    )}
                    {selectedRequest.status === "accepted" && (
                      <Button size="sm" onClick={() => updateStatus(selectedRequest.id, "scheduled")}>
                        <Calendar className="w-4 h-4 mr-1" />
                        Planifier
                      </Button>
                    )}
                    {selectedRequest.status === "scheduled" && (
                      <Button size="sm" onClick={() => updateStatus(selectedRequest.id, "in_progress")}>
                        <Truck className="w-4 h-4 mr-1" />
                        Démarrer
                      </Button>
                    )}
                    {selectedRequest.status === "in_progress" && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus(selectedRequest.id, "completed")}>
                        <Check className="w-4 h-4 mr-1" />
                        Terminé
                      </Button>
                    )}
                    {!["completed", "cancelled"].includes(selectedRequest.status) && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => updateStatus(selectedRequest.id, "cancelled")}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Annuler
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
