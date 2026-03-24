/**
 * AdminNavetteApprovals — Admin panel for reviewing GP navette change requests
 * Displays pending requests with old/new routes, allows approve/reject with notes
 */
import { useState, useEffect } from "react";
import { 
  Route, CheckCircle, XCircle, Clock, MapPin, 
  ArrowRight, MessageSquare, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface NavetteRequest {
  id: string;
  gp_id: string;
  old_origin_city: string;
  old_origin_country: string;
  old_destination_city: string;
  old_destination_country: string;
  new_origin_city: string;
  new_origin_country: string;
  new_destination_city: string;
  new_destination_country: string;
  justification: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  gp_profile?: {
    business_name: string;
    phone: string;
  };
}

export function AdminNavetteApprovals() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<NavetteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("gp_navette_change_requests")
        .select(`*, gp_profile:gp_profiles!gp_navette_change_requests_gp_id_fkey(business_name, phone)`)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setRequests((data || []).map((r: any) => ({
        ...r,
        gp_profile: r.gp_profile,
      })));
    } catch (err) {
      console.error("Error loading navette requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (requestId: string, decision: "approved" | "rejected") => {
    setProcessing(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const request = requests.find(r => r.id === requestId);
      
      const { error } = await supabase
        .from("gp_navette_change_requests")
        .update({
          status: decision,
          admin_notes: adminNotes[requestId] || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // If approved, update GP profile with new route
      if (decision === "approved" && request) {
        await supabase
          .from("gp_profiles")
          .update({
            base_origin_city: request.new_origin_city,
            base_origin_country: request.new_origin_country,
            base_destination_city: request.new_destination_city,
            base_destination_country: request.new_destination_country,
            navette_locked_at: new Date().toISOString(),
          })
          .eq("id", request.gp_id);
      }

      toast({ title: decision === "approved" ? "Navette approuvée" : "❌ Navette refusée" });
      loadRequests();
    } catch (err) {
      console.error("Error processing request:", err);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            Demandes de changement de navette
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pendingRequests.length} en attente · {processedRequests.length} traitées
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadRequests}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Actualiser
        </Button>
      </div>

      {pendingRequests.length === 0 && processedRequests.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Route className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune demande de changement</p>
          </CardContent>
        </Card>
      )}

      {/* Pending Requests */}
      {pendingRequests.map(req => (
        <Card key={req.id} className="border-amber-300 bg-amber-50/30 dark:bg-amber-950/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-white text-[10px]">
                  <Clock className="w-3 h-3 mr-1" />
                  En attente
                </Badge>
                <span className="font-bold text-sm">{req.gp_profile?.business_name || "GP"}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(req.created_at), "d MMM yyyy", { locale: fr })}
              </span>
            </div>

            {/* Route Change Visualization */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
                <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span className="line-through text-muted-foreground">
                  {req.old_origin_city} ({req.old_origin_country}) → {req.old_destination_city} ({req.old_destination_country})
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
                <ArrowRight className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <span className="font-medium">
                  {req.new_origin_city} ({req.new_origin_country}) → {req.new_destination_city} ({req.new_destination_country})
                </span>
              </div>
            </div>

            {req.justification && (
              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded-lg">
                <MessageSquare className="w-3 h-3 inline mr-1" />
                {req.justification}
              </div>
            )}

            {/* Admin Notes */}
            <Textarea
              placeholder="Notes admin (optionnel)..."
              value={adminNotes[req.id] || ""}
              onChange={(e) => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
              className="text-sm h-16"
            />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => handleDecision(req.id, "approved")}
                disabled={processing === req.id}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approuver
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleDecision(req.id, "rejected")}
                disabled={processing === req.id}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Refuser
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Historique</h4>
          {processedRequests.slice(0, 5).map(req => (
            <Card key={req.id} className="opacity-75">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={req.status === "approved" ? "default" : "destructive"} className="text-[10px]">
                    {req.status === "approved" ? "Approuvé" : "Refusé"}
                  </Badge>
                  <span className="text-sm font-medium">{req.gp_profile?.business_name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {req.new_origin_city} → {req.new_destination_city}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
