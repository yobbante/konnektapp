import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  CheckCircle, Package, MapPin, Calendar, ArrowRight, 
  User, Clock, Bell, Home, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";

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
  is_urgent: boolean;
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
              Récapitulatif de votre demande
            </h3>

            <div className="space-y-3">
              {/* Route */}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{request.origin_city}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{request.destination_city}</span>
              </div>

              {/* Type */}
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{request.shipment_type}</span>
                {request.is_urgent && (
                  <Badge variant="warning" className="ml-auto">Urgent</Badge>
                )}
              </div>

              {/* Weight if specified */}
              {request.weight_estimate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Poids estimé: {request.weight_estimate} kg</span>
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
