/**
 * MovingConfirmation - Page de confirmation déménagement
 * 
 * Affiche après soumission d'une demande de déménagement
 * - Confirmation visuelle
 * - Récapitulatif
 * - Prochaines étapes (équipe Yobbanté)
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  CheckCircle, Truck, Calendar, MapPin, Phone, Clock,
  ArrowRight, Home, MessageCircle, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { MiniLoader } from "@/components/ui/MiniLoader";

interface MovingRequest {
  id: string;
  request_number: string;
  origin_city: string;
  destination_city: string;
  pickup_date_from: string;
  description: string;
  budget_min: number;
  budget_max: number;
  additional_services: string[];
  status: string;
}

export default function MovingConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("id");
  const priceEstimate = searchParams.get("price");
  
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<MovingRequest | null>(null);

  useEffect(() => {
    if (requestId) {
      loadRequest();
    } else {
      setLoading(false);
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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MiniLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-success/5 to-background pb-safe">
      <MobileHeader />
      
      <main 
        className="px-4 pb-24"
        style={{ paddingTop: 'calc(70px + env(safe-area-inset-top, 0px))' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          {/* Success Animation */}
          <div className="text-center mb-8 pt-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.4 }}
                className="w-16 h-16 rounded-full bg-success flex items-center justify-center"
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </motion.div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold text-foreground mb-2"
            >
              Demande envoyée !
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground"
            >
              L'équipe Konnekt va traiter votre demande
            </motion.p>
          </div>

          {/* Request Summary */}
          {request && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-card rounded-2xl border border-border p-4 mb-4"
            >
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Déménagement #{request.request_number}</p>
                  <p className="text-xs text-muted-foreground">En attente de traitement</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{request.origin_city}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{request.destination_city}</span>
                  </div>
                </div>

                {request.pickup_date_from && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(request.pickup_date_from).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}

                {priceEstimate && (
                  <div className="bg-success/10 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-sm font-medium">Estimation</span>
                    <span className="text-lg font-bold text-success">
                      ~{parseInt(priceEstimate).toLocaleString()} FCFA
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* What's Next */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4 mb-6"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Prochaines étapes
            </h3>
            <div className="space-y-3">
              {[
                { icon: Phone, text: "Notre équipe vous contacte sous 2h pour confirmer les détails" },
                { icon: FileText, text: "Vous recevez un devis définitif personnalisé" },
                { icon: Truck, text: "Confirmation du créneau et mise en place du déménagement" },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Yobbanté Team Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-amber-500/10 rounded-2xl p-4 mb-6 border border-amber-200/50"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  Service Konnekt Premium
                </h4>
                <p className="text-sm text-amber-600/80 dark:text-amber-300/80">
                  Notre équipe de déménagement professionnelle s'occupe de tout : 
                  emballage, transport, déballage. Vous n'avez rien à faire !
                </p>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="space-y-3"
          >
            <Button className="w-full" onClick={() => navigate("/")}>
              <Home className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/historique")}>
              Voir mes demandes
            </Button>
          </motion.div>
        </motion.div>
      </main>

      <MobileNav />
    </div>
  );
}
