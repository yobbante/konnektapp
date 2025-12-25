import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FileText, MapPin, ArrowRight, Clock, CheckCircle, 
  MessageSquare, Package, Plus, RefreshCw, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CustomRequest {
  id: string;
  request_number: string;
  shipment_type: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  description: string;
  status: string;
  created_at: string;
  budget_min: number | null;
  budget_max: number | null;
  weight_estimate: number | null;
}

interface RequestResponse {
  id: string;
  price_proposed: number;
  currency: string;
  message: string | null;
  status: string;
  estimated_delivery_days: number | null;
  created_at: string;
  gp_id: string;
}

export function ClientCustomRequests() {
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [responses, setResponses] = useState<Record<string, RequestResponse[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CustomRequest | null>(null);

  useEffect(() => {
    loadRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('custom-requests-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'custom_request_responses' },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: requestsData } = await supabase
        .from("custom_requests")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      setRequests(requestsData || []);

      // Load responses for each request
      if (requestsData?.length) {
        const requestIds = requestsData.map(r => r.id);
        const { data: responsesData } = await supabase
          .from("custom_request_responses")
          .select("*")
          .in("request_id", requestIds);

        const groupedResponses: Record<string, RequestResponse[]> = {};
        responsesData?.forEach(response => {
          if (!groupedResponses[response.request_id]) {
            groupedResponses[response.request_id] = [];
          }
          groupedResponses[response.request_id].push(response);
        });
        setResponses(groupedResponses);
      }
    } catch (error) {
      console.error("Error loading requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, responseCount: number) => {
    if (responseCount > 0 && status === 'open') {
      return <Badge variant="success">{responseCount} offre{responseCount > 1 ? 's' : ''}</Badge>;
    }
    switch (status) {
      case 'open': return <Badge variant="warning">En attente</Badge>;
      case 'has_responses': return <Badge variant="success">Offres reçues</Badge>;
      case 'accepted': return <Badge variant="default">Acceptée</Badge>;
      case 'closed': return <Badge variant="secondary">Fermée</Badge>;
      case 'expired': return <Badge variant="destructive">Expirée</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getShipmentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      colis: "Colis",
      marchandise: "Marchandise",
      demenagement: "Déménagement",
      vehicule: "Véhicule",
      autre: "Autre",
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Mes demandes personnalisées</h3>
        <Link to="/demande-personnalisee">
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4" />
            Nouvelle
          </Button>
        </Link>
      </div>

      {requests.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-card text-center py-8"
        >
          <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">Aucune demande personnalisée</p>
          <Link to="/demande-personnalisee">
            <Button variant="default">Créer une demande</Button>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {requests.map((request, index) => {
            const requestResponses = responses[request.id] || [];
            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="mobile-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="text-xs font-mono text-muted-foreground">{request.request_number}</span>
                  </div>
                  {getStatusBadge(request.status, requestResponses.length)}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{request.origin_city}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium text-sm">{request.destination_city}</span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {getShipmentTypeLabel(request.shipment_type)}
                  </Badge>
                  {request.weight_estimate && (
                    <span className="text-xs text-muted-foreground">{request.weight_estimate} kg</span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {request.description}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(request.created_at).toLocaleDateString('fr-FR')}
                  </span>
                  
                  {requestResponses.length > 0 ? (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Eye className="w-4 h-4" />
                      Voir {requestResponses.length} offre{requestResponses.length > 1 ? 's' : ''}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">En attente d'offres...</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Responses Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Offres reçues</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium">{selectedRequest.origin_city}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="font-medium">{selectedRequest.destination_city}</span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedRequest.description}</p>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {(responses[selectedRequest.id] || []).map((response) => (
                  <div key={response.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={response.status === 'pending' ? 'warning' : 'default'}>
                        {response.status === 'pending' ? 'En attente' : response.status}
                      </Badge>
                      <span className="font-bold text-primary">
                        {response.price_proposed.toLocaleString()} {response.currency}
                      </span>
                    </div>
                    
                    {response.estimated_delivery_days && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Livraison estimée: {response.estimated_delivery_days} jours
                      </p>
                    )}
                    
                    {response.message && (
                      <p className="text-sm text-muted-foreground mb-3">{response.message}</p>
                    )}

                    <div className="flex gap-2">
                      <Button variant="default" size="sm" className="flex-1">
                        <CheckCircle className="w-4 h-4" />
                        Accepter
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {(responses[selectedRequest.id] || []).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune offre reçue pour le moment
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
