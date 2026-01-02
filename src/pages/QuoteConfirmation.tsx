import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  CheckCircle, Package, MapPin, Calendar, ArrowRight, 
  User, Clock, Bell, Home, FileText, Scale, Banknote,
  AlertTriangle, Sparkles, Truck, Ship, Plane, Briefcase
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RequestDetails {
  id: string;
  request_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  shipment_type: string;
  description: string;
  weight_estimate: number | null;
  volume_estimate: string | null;
  budget_min: number | null;
  budget_max: number | null;
  is_urgent: boolean;
  is_fragile: boolean;
  pickup_date_from: string | null;
  pickup_date_to: string | null;
  additional_services: string[] | null;
  transport_type: string | null;
  created_at: string;
  status: string;
}

export default function QuoteConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestId = searchParams.get("id");
  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (requestId) {
      loadRequest();
    } else {
      navigate("/client/profile");
    }
  }, [requestId]);

  const loadRequest = async () => {
    try {
      const { data, error } = await supabase
        .from("custom_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (error) throw error;
      setRequest(data);
    } catch (error) {
      console.error("Error loading request:", error);
      navigate("/client/profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!request) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      <div className="px-4 py-6">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Demande envoyée !
          </h1>
          <p className="text-muted-foreground">
            Votre demande de devis a été transmise à nos transporteurs partenaires
          </p>
        </motion.div>

        {/* Request Number */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4 mb-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Numéro de demande</span>
              </div>
              <span className="font-mono font-bold text-primary">{request.request_number}</span>
            </div>
          </Card>
        </motion.div>

        {/* Request Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-4 mb-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Votre devis personnalisé
            </h3>

            <div className="space-y-3">
              {/* Route */}
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="font-semibold">{request.origin_city}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{request.destination_city}</span>
              </div>

              {/* Type and urgency */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{request.shipment_type}</Badge>
                {request.transport_type && (
                  <Badge variant="outline">
                    {request.transport_type === "routier" && <Truck className="w-3 h-3 mr-1" />}
                    {request.transport_type === "maritime" && <Ship className="w-3 h-3 mr-1" />}
                    {request.transport_type === "aerien" && <Plane className="w-3 h-3 mr-1" />}
                    {request.transport_type === "voyageur" && <Briefcase className="w-3 h-3 mr-1" />}
                    {request.transport_type}
                  </Badge>
                )}
                {request.is_urgent && (
                  <Badge variant="warning">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Urgent
                  </Badge>
                )}
                {request.is_fragile && (
                  <Badge variant="outline">Fragile</Badge>
                )}
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3">
                {request.weight_estimate && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Scale className="w-3 h-3" />
                      <span className="text-xs">Poids estimé</span>
                    </div>
                    <p className="font-semibold">{request.weight_estimate} kg</p>
                  </div>
                )}
                {request.volume_estimate && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Package className="w-3 h-3" />
                      <span className="text-xs">Volume</span>
                    </div>
                    <p className="font-semibold">{request.volume_estimate}</p>
                  </div>
                )}
                {(request.budget_min || request.budget_max) && (
                  <div className="p-3 bg-muted/50 rounded-lg col-span-2">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Banknote className="w-3 h-3" />
                      <span className="text-xs">Budget</span>
                    </div>
                    <p className="font-semibold text-primary">
                      {request.budget_min?.toLocaleString() || "—"} - {request.budget_max?.toLocaleString() || "—"} FCFA
                    </p>
                  </div>
                )}
              </div>

              {/* Dates */}
              {(request.pickup_date_from || request.pickup_date_to) && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {request.pickup_date_from && format(new Date(request.pickup_date_from), "d MMM", { locale: fr })}
                    {request.pickup_date_from && request.pickup_date_to && " - "}
                    {request.pickup_date_to && format(new Date(request.pickup_date_to), "d MMM yyyy", { locale: fr })}
                  </span>
                </div>
              )}

              {/* Additional Services */}
              {request.additional_services && request.additional_services.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Services additionnels
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {request.additional_services.map((service, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{service}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">{request.description}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-4 mb-6 bg-muted/50">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Prochaines étapes
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <p className="text-muted-foreground">
                  Les transporteurs éligibles reçoivent votre demande et vous envoient leurs offres
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <p className="text-muted-foreground">
                  Vous comparez les offres et choisissez celle qui vous convient
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <p className="text-muted-foreground">
                  Vous confirmez et planifiez l'enlèvement de votre colis
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Notification Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl mb-6"
        >
          <Bell className="w-5 h-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            Vous serez notifié dès qu'un transporteur répond à votre demande
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-3"
        >
          <Link to="/client/profile">
            <Button className="w-full" size="lg">
              <User className="w-5 h-5" />
              Voir ma demande dans mon profil
            </Button>
          </Link>

          <Link to="/">
            <Button variant="outline" className="w-full" size="lg">
              <Home className="w-5 h-5" />
              Retour à l'accueil
            </Button>
          </Link>
        </motion.div>
      </div>

      <MobileNav />
    </div>
  );
}
