/**
 * PublicTracking - Page publique de suivi simplifié (ScanTrack™)
 * 
 * Accessible quand un QR est scanné hors-app (appareil photo natif).
 * Utilise la fonction get_public_tracking pour accès anon sécurisé.
 * Affiche des infos limitées + bloc marketing Konnekt.
 * Aucune donnée sensible (pas de nom client, GP, poids, paiement).
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, Truck, CheckCircle, Clock, 
  Shield, QrCode, Globe, ArrowRight, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PublicOrder {
  order_number: string;
  status: string;
  origin_country: string;
  destination_country: string;
  origin_city: string;
  destination_city: string;
  delivery_date: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Créé", icon: Clock, color: "text-amber-500" },
  accepted: { label: "Accepté", icon: CheckCircle, color: "text-blue-500" },
  collected: { label: "Collecté", icon: Package, color: "text-indigo-500" },
  in_transit: { label: "En transit", icon: Truck, color: "text-purple-500" },
  arrived: { label: "Arrivé", icon: Package, color: "text-orange-500" },
  delivered: { label: "Livré", icon: CheckCircle, color: "text-green-500" },
  cancelled: { label: "Annulé", icon: Clock, color: "text-destructive" },
};

export default function PublicTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (orderId) loadOrder(orderId);
  }, [orderId]);

  const loadOrder = async (id: string) => {
    try {
      // Use secure RPC function for anon-safe access
      const { data, error } = await supabase.rpc("get_public_tracking", {
        p_order_identifier: id,
      });

      if (error || !data) {
        setNotFound(true);
        return;
      }

      setOrder(data as unknown as PublicOrder);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = order ? STATUS_MAP[order.status] || STATUS_MAP.pending : null;
  const StatusIcon = statusInfo?.icon || Clock;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-6 text-center">
        <Package className="w-16 h-16 text-slate-400 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Colis non trouvé</h1>
        <p className="text-slate-400 mb-6">Ce code ne correspond à aucun envoi.</p>
        <Button onClick={() => navigate("/")} className="bg-white text-slate-900 hover:bg-white/90">
          Découvrir Konnekt
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="p-4 flex items-center justify-center border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <QrCode className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">KONNEKT</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white/5 border-white/10 backdrop-blur">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <motion.div 
                  className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-white/10"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <StatusIcon className={`w-8 h-8 ${statusInfo?.color}`} />
                </motion.div>
                <Badge className="bg-white/10 text-white border-white/20 mb-2">
                  {statusInfo?.label}
                </Badge>
                <p className="text-white/50 text-xs font-mono mt-1">
                  {order.order_number}
                </p>
              </div>

              {/* Route */}
              <div className="relative flex items-center gap-3 p-4 bg-white/5 rounded-xl">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                  <div className="w-0.5 h-8 bg-gradient-to-b from-blue-400 to-green-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-white font-medium text-sm">{order.origin_city}</p>
                    <p className="text-white/40 text-xs">{order.origin_country}</p>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{order.destination_city}</p>
                    <p className="text-white/40 text-xs">{order.destination_country}</p>
                  </div>
                </div>
                {order.delivery_date && (
                  <div className="text-right">
                    <p className="text-white/40 text-xs">Livraison</p>
                    <p className="text-white text-sm font-medium">
                      {format(new Date(order.delivery_date), "d MMM", { locale: fr })}
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Steps */}
              <div className="flex justify-between mt-6 px-2">
                {["pending", "collected", "in_transit", "delivered"].map((step) => {
                  const steps = ["pending", "accepted", "collected", "in_transit", "arrived", "delivered"];
                  const currentIdx = steps.indexOf(order.status);
                  const stepIdx = steps.indexOf(step);
                  const isActive = stepIdx <= currentIdx;
                  return (
                    <div key={step} className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${isActive ? "bg-green-400" : "bg-white/20"}`} />
                      <p className={`text-[10px] mt-1 ${isActive ? "text-white/80" : "text-white/30"}`}>
                        {step === "pending" ? "Créé" : step === "collected" ? "Collecté" : step === "in_transit" ? "Transit" : "Livré"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA suivi complet */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button 
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white gap-2"
            onClick={() => navigate(`/tracking?code=${order.order_number}`)}
          >
            Voir le suivi complet
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Marketing Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="text-center">
            <p className="text-white/60 text-sm leading-relaxed">
              Ce colis est suivi via <strong className="text-white">Konnekt</strong> — la plateforme qui connecte 
              clients et voyageurs pour l'envoi de colis sécurisé.
            </p>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Shield, label: "Paiement sécurisé", sub: "Escrow protégé" },
              { icon: QrCode, label: "Scan intelligent", sub: "Traçabilité totale" },
              { icon: Globe, label: "Réseau international", sub: "Multi-destinations" },
              { icon: Sparkles, label: "Suivi temps réel", sub: "Notifications live" },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                <badge.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-white text-xs font-medium">{badge.label}</p>
                  <p className="text-white/40 text-[10px]">{badge.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="space-y-2">
            <Button 
              className="w-full bg-white text-slate-900 hover:bg-white/90 gap-2"
              onClick={() => navigate("/envoyer")}
            >
              <Package className="w-4 h-4" />
              Envoyer un colis
            </Button>
            <Button 
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 gap-2"
              onClick={() => navigate("/gp")}
            >
              <Truck className="w-4 h-4" />
              Devenir GP et gagner de l'argent
            </Button>
            <Button 
              variant="ghost"
              className="w-full text-white/60 hover:text-white hover:bg-white/5"
              onClick={() => navigate("/auth")}
            >
              Créer un compte gratuitement
            </Button>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} Konnekt · ScanTrack™ · ScanReach™
          </p>
        </div>
      </div>
    </div>
  );
}
