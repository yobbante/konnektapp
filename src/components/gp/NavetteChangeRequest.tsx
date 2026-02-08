import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Send, Clock, CheckCircle, XCircle, AlertTriangle, Route } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SearchableCountrySelect, SearchableCityInput } from "./SearchableCountrySelect";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface NavetteChangeRequestProps {
  gpId: string;
  currentRoute: {
    originCity: string;
    originCountry: string;
    destinationCity: string;
    destinationCountry: string;
  };
  onRequestSubmitted?: () => void;
}

interface ChangeRequest {
  id: string;
  status: string;
  new_origin_city: string;
  new_origin_country: string;
  new_destination_city: string;
  new_destination_country: string;
  justification: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export function NavetteChangeRequest({ gpId, currentRoute, onRequestSubmitted }: NavetteChangeRequestProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingRequests, setExistingRequests] = useState<ChangeRequest[]>([]);
  const [newRoute, setNewRoute] = useState({
    originCity: "",
    originCountry: "SN",
    destinationCity: "",
    destinationCountry: "FR",
  });
  const [justification, setJustification] = useState("");

  useEffect(() => {
    loadRequests();
  }, [gpId]);

  const loadRequests = async () => {
    const { data } = await supabase
      .from("gp_navette_change_requests")
      .select("*")
      .eq("gp_id", gpId)
      .order("created_at", { ascending: false })
      .limit(5);
    
    setExistingRequests((data as ChangeRequest[]) || []);
  };

  const hasPendingRequest = existingRequests.some(r => r.status === "pending");

  const handleSubmit = async () => {
    if (!newRoute.originCity || !newRoute.destinationCity) {
      toast({
        title: "Champs requis",
        description: "Veuillez renseigner les villes de départ et d'arrivée",
        variant: "destructive",
      });
      return;
    }

    if (
      newRoute.originCity === currentRoute.originCity &&
      newRoute.destinationCity === currentRoute.destinationCity
    ) {
      toast({
        title: "Trajet identique",
        description: "Le nouveau trajet est identique à votre navette actuelle",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("gp_navette_change_requests")
        .insert({
          gp_id: gpId,
          old_origin_city: currentRoute.originCity,
          old_origin_country: currentRoute.originCountry,
          old_destination_city: currentRoute.destinationCity,
          old_destination_country: currentRoute.destinationCountry,
          new_origin_city: newRoute.originCity,
          new_origin_country: newRoute.originCountry,
          new_destination_city: newRoute.destinationCity,
          new_destination_country: newRoute.destinationCountry,
          justification: justification || null,
        });

      if (error) throw error;

      toast({
        title: "Demande envoyée",
        description: "Votre demande de changement de navette sera examinée par l'admin",
      });

      setShowForm(false);
      setNewRoute({ originCity: "", originCountry: "SN", destinationCity: "", destinationCountry: "FR" });
      setJustification("");
      loadRequests();
      onRequestSubmitted?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la demande",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: "text-amber-500", label: "En attente" },
    approved: { icon: CheckCircle, color: "text-green-500", label: "Approuvée" },
    rejected: { icon: XCircle, color: "text-red-500", label: "Refusée" },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Changement de navette</CardTitle>
          </div>
          {!hasPendingRequest && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? "Annuler" : "Demander"}
            </Button>
          )}
        </div>
        <CardDescription>
          Votre navette actuelle : {currentRoute.originCity} ↔ {currentRoute.destinationCity}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pending request warning */}
        {hasPendingRequest && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Demande en cours d'examen</p>
              <p className="text-xs text-muted-foreground">
                Vous ne pouvez pas soumettre une nouvelle demande tant que la précédente est en attente
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <AnimatePresence>
          {showForm && !hasPendingRequest && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4 overflow-hidden"
            >
              <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                <div className="space-y-2">
                  <Label>Nouvelle ville de départ</Label>
                  <div className="flex gap-2">
                    <SearchableCountrySelect
                      value={newRoute.originCountry}
                      onValueChange={(v) => setNewRoute(p => ({ ...p, originCountry: v }))}
                      className="w-[130px]"
                    />
                    <SearchableCityInput
                      value={newRoute.originCity}
                      onValueChange={(v) => setNewRoute(p => ({ ...p, originCity: v }))}
                      countryCode={newRoute.originCountry}
                      placeholder="Ville"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nouvelle ville d'arrivée</Label>
                  <div className="flex gap-2">
                    <SearchableCountrySelect
                      value={newRoute.destinationCountry}
                      onValueChange={(v) => setNewRoute(p => ({ ...p, destinationCountry: v }))}
                      className="w-[130px]"
                    />
                    <SearchableCityInput
                      value={newRoute.destinationCity}
                      onValueChange={(v) => setNewRoute(p => ({ ...p, destinationCity: v }))}
                      countryCode={newRoute.destinationCountry}
                      placeholder="Ville"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Justification (optionnel)</Label>
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Pourquoi souhaitez-vous changer de navette ?"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading || !newRoute.originCity || !newRoute.destinationCity}
                  className="w-full"
                >
                  {loading ? "Envoi..." : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer la demande
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Previous requests */}
        {existingRequests.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Historique des demandes</p>
            {existingRequests.map((req) => {
              const config = statusConfig[req.status] || statusConfig.pending;
              const Icon = config.icon;
              
              return (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <div>
                      <p className="text-sm">
                        {req.new_origin_city} → {req.new_destination_city}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(req.created_at), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={req.status === "approved" ? "default" : req.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
