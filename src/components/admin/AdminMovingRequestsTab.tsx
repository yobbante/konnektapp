import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Truck, Home, Phone, MapPin, Calendar, Clock, Box,
  User, MessageCircle, Check, X, RefreshCw,
  AlertCircle, DollarSign, Send, FileText, Search,
  ArrowRight, History, CheckCircle2, XCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MovingRequest {
  id: string;
  request_number: string;
  client_id: string;
  shipment_type: string;
  transport_type: string | null;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  description: string | null;
  volume_estimate: string | null;
  weight_estimate: number | null;
  budget_min: number | null;
  budget_max: number | null;
  additional_services: string[] | null;
  pickup_date_from: string | null;
  pickup_date_to: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  client?: {
    full_name: string;
    phone: string;
    email: string;
    city: string | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Nouvelle", color: "bg-amber-100 text-amber-800 border-amber-300", icon: AlertCircle },
  pending: { label: "En attente", color: "bg-amber-100 text-amber-800 border-amber-300", icon: Clock },
  reviewing: { label: "En étude", color: "bg-blue-100 text-blue-800 border-blue-300", icon: FileText },
  quoted: { label: "Devis envoyé", color: "bg-purple-100 text-purple-800 border-purple-300", icon: DollarSign },
  negotiating: { label: "Négociation", color: "bg-orange-100 text-orange-800 border-orange-300", icon: MessageCircle },
  accepted: { label: "Accepté", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2 },
  scheduled: { label: "Planifié", color: "bg-indigo-100 text-indigo-800 border-indigo-300", icon: Calendar },
  in_progress: { label: "En cours", color: "bg-sky-100 text-sky-800 border-sky-300", icon: Truck },
  completed: { label: "Terminé", color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle2 },
  cancelled: { label: "Annulé", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["reviewing", "quoted", "cancelled"],
  pending: ["reviewing", "quoted", "cancelled"],
  reviewing: ["quoted", "cancelled"],
  quoted: ["negotiating", "accepted", "cancelled"],
  negotiating: ["quoted", "accepted", "cancelled"],
  accepted: ["scheduled", "cancelled"],
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const SERVICE_LABELS: Record<string, string> = {
  emballage: "Emballage",
  demontage: "Démontage meubles",
  stockage: "Stockage temporaire",
  nettoyage: "Nettoyage",
  assurance: "Assurance",
};

export function AdminMovingRequestsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<MovingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<MovingRequest | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
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
        .select("id, request_number, client_id, shipment_type, transport_type, origin_city, origin_country, destination_city, destination_country, description, volume_estimate, weight_estimate, budget_min, budget_max, additional_services, pickup_date_from, pickup_date_to, status, created_at, updated_at")
        .eq("shipment_type", "demenagement")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const clientIds = [...new Set((data || []).map(r => r.client_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email, city")
        .in("user_id", clientIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      const enrichedRequests = (data || []).map(req => ({
        ...req,
        client: profileMap.get(req.client_id),
      })) as MovingRequest[];

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
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("custom_requests")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (error) throw error;

      if (selectedRequest?.client_id) {
        const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
        await supabase.from("notifications").insert({
          user_id: selectedRequest.client_id,
          type: "moving_status",
          title: `Déménagement: ${statusLabel}`,
          message: `Votre demande ${selectedRequest.request_number} est passée au statut "${statusLabel}"`,
          related_type: "moving_request",
          related_id: requestId,
        });
      }

      toast({ title: "Statut mis à jour" });
      loadRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const sendQuote = async () => {
    if (!selectedRequest || !quotePrice) return;

    setSubmitting(true);
    try {
      const priceNum = parseInt(quotePrice.replace(/\s/g, "").replace(/,/g, ""));
      if (isNaN(priceNum) || priceNum <= 0) {
        toast({ title: "Prix invalide", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("custom_requests")
        .update({ 
          status: "quoted",
          budget_max: priceNum,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: selectedRequest.client_id,
        type: "moving_quote",
        title: "Devis de déménagement",
        message: `Votre demande ${selectedRequest.request_number} a reçu un devis de ${priceNum.toLocaleString()} FCFA. ${adminNotes ? `Note: ${adminNotes}` : ""}`,
        related_type: "moving_request",
        related_id: selectedRequest.id,
      });

      toast({ title: "Devis envoyé au client" });
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

  const stats = useMemo(() => ({
    new: requests.filter(r => ["open", "pending"].includes(r.status)).length,
    inReview: requests.filter(r => ["reviewing", "quoted", "negotiating"].includes(r.status)).length,
    confirmed: requests.filter(r => ["accepted", "scheduled"].includes(r.status)).length,
    active: requests.filter(r => r.status === "in_progress").length,
    completed: requests.filter(r => r.status === "completed").length,
    total: requests.length,
  }), [requests]);

  const filteredRequests = useMemo(() => {
    let filtered = requests;
    
    if (activeTab === "new") {
      filtered = filtered.filter(r => ["open", "pending"].includes(r.status));
    } else if (activeTab === "review") {
      filtered = filtered.filter(r => ["reviewing", "quoted", "negotiating"].includes(r.status));
    } else if (activeTab === "confirmed") {
      filtered = filtered.filter(r => ["accepted", "scheduled", "in_progress"].includes(r.status));
    } else if (activeTab === "closed") {
      filtered = filtered.filter(r => ["completed", "cancelled"].includes(r.status));
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.request_number?.toLowerCase().includes(q) ||
        r.origin_city?.toLowerCase().includes(q) ||
        r.destination_city?.toLowerCase().includes(q) ||
        r.client?.full_name?.toLowerCase().includes(q) ||
        r.client?.phone?.includes(q)
      );
    }
    
    return filtered;
  }, [requests, activeTab, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("new")}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{stats.new}</p>
              <p className="text-xs text-amber-600 font-medium">Nouvelles</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("review")}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.inReview}</p>
              <p className="text-xs text-blue-600 font-medium">En traitement</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("confirmed")}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.confirmed}</p>
              <p className="text-xs text-green-600 font-medium">Confirmés</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("confirmed")}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
              <Truck className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-sky-700">{stats.active}</p>
              <p className="text-xs text-sky-600 font-medium">En cours</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("closed")}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{stats.completed}</p>
              <p className="text-xs text-emerald-600 font-medium">Terminés</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("all")}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center">
              <Home className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
              <p className="text-xs text-slate-600 font-medium">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-5 w-full sm:w-auto">
            <TabsTrigger value="all" className="text-xs">Tout</TabsTrigger>
            <TabsTrigger value="new" className="text-xs">
              Nouvelles
              {stats.new > 0 && <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-[10px]">{stats.new}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="review" className="text-xs">Traitement</TabsTrigger>
            <TabsTrigger value="confirmed" className="text-xs">Confirmés</TabsTrigger>
            <TabsTrigger value="closed" className="text-xs">Clos</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadRequests(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Home className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-medium text-muted-foreground">
              {requests.length === 0 ? "Aucune demande de déménagement" : "Aucun résultat pour ce filtre"}
            </p>
            {searchQuery && (
              <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2">
                Effacer la recherche
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            const isUrgent = request.status === "open" || request.status === "pending";

            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <Card 
                  className={`cursor-pointer hover:shadow-lg transition-all border-l-4 ${isUrgent ? "border-l-amber-500" : "border-l-transparent"}`}
                  onClick={() => setSelectedRequest(request)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isUrgent ? "bg-amber-500/20" : "bg-primary/10"}`}>
                          <Home className={`w-5 h-5 ${isUrgent ? "text-amber-600" : "text-primary"}`} />
                        </div>
                        <div>
                          <p className="font-mono font-semibold text-sm">{request.request_number}</p>
                          <Badge className={`${statusConfig.color} border`} variant="outline">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), "d MMM yyyy", { locale: fr })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(request.created_at), "HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="font-medium truncate">{request.origin_city || "Non défini"}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">{request.destination_city || "Non défini"}</span>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {request.volume_estimate && (
                        <span className="flex items-center gap-1">
                          <Box className="w-3 h-3" />
                          {request.volume_estimate}
                        </span>
                      )}
                      {request.pickup_date_from && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(request.pickup_date_from), "d MMM", { locale: fr })}
                        </span>
                      )}
                      {request.client && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {request.client.full_name || "Client"}
                        </span>
                      )}
                    </div>

                    {request.budget_max && request.budget_max > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-sm font-bold text-green-600">
                          Devis: {request.budget_max.toLocaleString()} FCFA
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
        <SheetContent side="right" className="w-full sm:max-w-xl p-0">
          {selectedRequest && (
            <ScrollArea className="h-full">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    <span className="font-mono font-bold">{selectedRequest.request_number}</span>
                  </div>
                  <Badge className={`${STATUS_CONFIG[selectedRequest.status]?.color} border`}>
                    {STATUS_CONFIG[selectedRequest.status]?.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedRequest.origin_city || "?"}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>{selectedRequest.destination_city || "?"}</span>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Client Card */}
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-blue-600 font-medium mb-1">CLIENT</p>
                        <p className="font-bold text-lg">{selectedRequest.client?.full_name || "Non renseigné"}</p>
                        {selectedRequest.client?.phone && (
                          <a href={`tel:${selectedRequest.client.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mt-1">
                            <Phone className="w-4 h-4" />
                            {selectedRequest.client.phone}
                          </a>
                        )}
                        {selectedRequest.client?.email && (
                          <p className="text-xs text-muted-foreground mt-1">{selectedRequest.client.email}</p>
                        )}
                      </div>
                      {selectedRequest.client?.phone && (
                        <Button size="sm" variant="outline" asChild className="gap-1">
                          <a href={`https://wa.me/${selectedRequest.client.phone.replace(/[^0-9]/g, "")}`} target="_blank">
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Volume</p>
                      <p className="font-bold">{selectedRequest.volume_estimate || "Non défini"}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Date souhaitée</p>
                      <p className="font-bold">
                        {selectedRequest.pickup_date_from 
                          ? format(new Date(selectedRequest.pickup_date_from), "d MMM yyyy", { locale: fr })
                          : "Flexible"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Budget client</p>
                      <p className="font-bold">
                        {selectedRequest.budget_min 
                          ? `${selectedRequest.budget_min.toLocaleString()} FCFA`
                          : "Non défini"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Devis Konnekt</p>
                      <p className="font-bold text-green-600">
                        {selectedRequest.budget_max && selectedRequest.budget_max > 0
                          ? `${selectedRequest.budget_max.toLocaleString()} FCFA`
                          : "À définir"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Description */}
                {selectedRequest.description && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-2">DESCRIPTION</p>
                      <p className="text-sm">{selectedRequest.description}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Services */}
                {selectedRequest.additional_services && selectedRequest.additional_services.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-2">SERVICES DEMANDÉS</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.additional_services.map((service) => (
                          <Badge key={service} variant="secondary">
                            {SERVICE_LABELS[service] || service}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                {/* Quote Section */}
                {["open", "pending", "reviewing", "negotiating"].includes(selectedRequest.status) && (
                  <Card className="border-green-300 bg-green-50/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <h4 className="font-bold text-green-800">Envoyer un devis</h4>
                      </div>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Montant en FCFA"
                          className="text-lg font-bold pr-16"
                          value={quotePrice}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setQuotePrice(val ? parseInt(val).toLocaleString() : "");
                          }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">FCFA</span>
                      </div>
                      <Textarea
                        placeholder="Notes pour le client (optionnel)..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={2}
                      />
                      <Button 
                        className="w-full gap-2 bg-green-600 hover:bg-green-700"
                        onClick={sendQuote}
                        disabled={!quotePrice || submitting}
                      >
                        <Send className="w-4 h-4" />
                        {submitting ? "Envoi en cours..." : "Envoyer le devis au client"}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Status Workflow */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-primary" />
                      <h4 className="font-bold">Actions disponibles</h4>
                    </div>
                    
                    {STATUS_TRANSITIONS[selectedRequest.status]?.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {STATUS_TRANSITIONS[selectedRequest.status].map((nextStatus) => {
                          const config = STATUS_CONFIG[nextStatus];
                          const Icon = config?.icon || Check;
                          const isDestructive = nextStatus === "cancelled";
                          
                          return (
                            <Button
                              key={nextStatus}
                              size="sm"
                              variant={isDestructive ? "destructive" : "outline"}
                              className={`gap-2 justify-start ${!isDestructive ? config?.color : ""}`}
                              onClick={() => updateStatus(selectedRequest.id, nextStatus)}
                              disabled={submitting}
                            >
                              <Icon className="w-4 h-4" />
                              {config?.label || nextStatus}
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Cette demande est clôturée. Aucune action disponible.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <h4 className="font-bold">Chronologie</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Créée le {format(new Date(selectedRequest.created_at), "d MMM yyyy à HH:mm", { locale: fr })}</span>
                      </div>
                      {selectedRequest.updated_at !== selectedRequest.created_at && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span>Mise à jour le {format(new Date(selectedRequest.updated_at), "d MMM yyyy à HH:mm", { locale: fr })}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}