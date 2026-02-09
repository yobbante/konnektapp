import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Package, MapPin, Weight, Calendar, Clock,
  Send, Check, X, ChevronRight, Filter, AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { GPQuoteResponseForm } from "@/components/gp/GPQuoteResponseForm";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomRequest {
  id: string;
  request_number: string;
  client_id: string;
  shipment_type: string;
  description: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  weight_estimate: number | null;
  volume_estimate: string | null;
  transport_type: string | null;
  pickup_date_from: string | null;
  pickup_date_to: string | null;
  budget_min: number | null;
  budget_max: number | null;
  is_urgent: boolean;
  is_fragile: boolean;
  additional_services: string[] | null;
  status: string;
  created_at: string;
  expires_at: string | null;
  my_response?: {
    id: string;
    price_proposed: number;
    status: string;
  };
}

interface CustomRequestsTabProps {
  gpId: string;
  gpType?: string;
  onBack?: () => void;
}

export function CustomRequestsTab({ gpId, gpType = "bagages_international", onBack }: CustomRequestsTabProps) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "responded">("all");
  const [selectedRequest, setSelectedRequest] = useState<CustomRequest | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);

  // Transport type compatibility — server-side style filter
  const compatibleTypes: Record<string, string[]> = {
    bagages_international: ["GP", "gp", "bagages_international", "aerien"],
    routier: ["routier", "Routier", "maritime", "Maritime"],
    aerien: ["aerien", "Aerien", "GP", "gp"],
    maritime: ["maritime", "Maritime", "routier", "Routier"],
  };
  const allowedTypes = compatibleTypes[gpType] || [gpType];

  useEffect(() => {
    fetchRequests();
  }, [gpId, gpType]);

  const fetchRequests = async () => {
    try {
      // Fetch open requests
      const { data: requestsData, error: reqError } = await supabase
        .from("custom_requests")
        .select("*")
        .in("status", ["open", "has_responses"])
        .order("created_at", { ascending: false });

      if (reqError) throw reqError;

      // PRV §10: Role-based filter — GP only sees compatible transport types
      const filteredData = (requestsData || []).filter((req) => {
        // No transport type = visible to all
        if (!req.transport_type) return true;
        // Filter by compatibility
        if (!allowedTypes.includes(req.transport_type)) return false;
        // Vehicle requests blocked for GP bagages
        if (gpType === "bagages_international" && req.shipment_type === "vehicle") return false;
        if (gpType === "bagages_international" && req.shipment_type === "moving") return false;
        return true;
      });

      // Fetch my responses
      const { data: myResponses, error: respError } = await supabase
        .from("custom_request_responses")
        .select("id, request_id, price_proposed, status")
        .eq("gp_id", gpId);

      if (respError) throw respError;

      // Merge data
      const requestsWithResponses = filteredData.map((req) => {
        const myResponse = myResponses?.find((r) => r.request_id === req.id);
        return {
          ...req,
          my_response: myResponse ? {
            id: myResponse.id,
            price_proposed: myResponse.price_proposed,
            status: myResponse.status,
          } : undefined,
        };
      });

      setRequests(requestsWithResponses);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openResponseDialog = (request: CustomRequest) => {
    setSelectedRequest(request);
    setResponseDialogOpen(true);
  };

  const handleQuoteSuccess = () => {
    fetchRequests();
    toast({
      title: "✅ Offre envoyée",
      description: "Votre proposition a été envoyée au client",
    });
  };

  const filteredRequests = requests.filter((req) => {
    if (filter === "open") return !req.my_response;
    if (filter === "responded") return !!req.my_response;
    return true;
  });

  const getShipmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      parcel: "Colis",
      moving: "Déménagement",
      goods: "Marchandises",
      vehicle: "Véhicule",
      bagages_international: "Bagages International",
      other: "Autre",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{requests.length}</div>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-primary">
            {requests.filter(r => !r.my_response).length}
          </div>
          <p className="text-xs text-muted-foreground">À répondre</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-green-600">
            {requests.filter(r => r.my_response).length}
          </div>
          <p className="text-xs text-muted-foreground">Répondues</p>
        </Card>
      </div>

      {/* Filter */}
      <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
        <SelectTrigger className="w-full">
          <Filter className="w-4 h-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les demandes</SelectItem>
          <SelectItem value="open">À répondre</SelectItem>
          <SelectItem value="responded">Mes offres envoyées</SelectItem>
        </SelectContent>
      </Select>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucune demande trouvée</p>
            <p className="text-sm text-muted-foreground mt-1">
              Les demandes personnalisées des clients apparaîtront ici
            </p>
          </Card>
        ) : (
          filteredRequests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{getShipmentTypeLabel(request.shipment_type)}</Badge>
                    {request.is_urgent && (
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Urgent
                      </Badge>
                    )}
                    {request.is_fragile && (
                      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Fragile
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {request.request_number}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm mb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{request.origin_city}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{request.destination_city}</span>
                </div>

                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {request.description}
                </p>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                  {request.weight_estimate && (
                    <div className="flex items-center gap-1">
                      <Weight className="w-3 h-3" />
                      <span>~{request.weight_estimate} kg</span>
                    </div>
                  )}
                  {request.pickup_date_from && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(new Date(request.pickup_date_from), "d MMM", { locale: fr })}
                        {request.pickup_date_to && ` - ${format(new Date(request.pickup_date_to), "d MMM", { locale: fr })}`}
                      </span>
                    </div>
                  )}
                </div>

                {request.budget_min && request.budget_max && (
                  <div className="text-sm mb-3">
                    <span className="text-muted-foreground">Budget:</span>{" "}
                    <span className="font-semibold">
                      {request.budget_min.toLocaleString()} - {request.budget_max.toLocaleString()} FCFA
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{format(new Date(request.created_at), "d MMM yyyy", { locale: fr })}</span>
                  </div>

                  {request.my_response ? (
                    <div className="flex items-center gap-2">
                      <Badge className={
                        request.my_response.status === "accepted" 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : request.my_response.status === "rejected"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }>
                        {request.my_response.status === "accepted" && <Check className="w-3 h-3 mr-1" />}
                        {request.my_response.status === "rejected" && <X className="w-3 h-3 mr-1" />}
                        {request.my_response.price_proposed.toLocaleString()} FCFA
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {request.my_response.status === "pending" ? "En attente" 
                          : request.my_response.status === "accepted" ? "Acceptée" 
                          : "Refusée"}
                      </span>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => openResponseDialog(request)}>
                      <Send className="w-4 h-4 mr-2" />
                      Proposer une offre
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Response Dialog */}
      {selectedRequest && (
        <GPQuoteResponseForm
          request={selectedRequest}
          gpId={gpId}
          open={responseDialogOpen}
          onOpenChange={setResponseDialogOpen}
          onSuccess={handleQuoteSuccess}
        />
      )}
    </div>
  );
}
