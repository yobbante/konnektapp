/**
 * TransporteurRegistration - Page d'inscription transporteur
 * 
 * Parcours interactif mobile-first en 4 étapes :
 * 1. Type de transport (GP Bagages, Routier, etc.)
 * 2. Informations personnelles
 * 3. Documents et vérification
 * 4. Confirmation
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plane, Truck, Ship, Package, User, Phone, MapPin, 
  ChevronRight, ChevronLeft, Check, ArrowRight, Building,
  FileText, Camera, Shield, Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { toast } from "@/hooks/use-toast";
import { MiniLoader } from "@/components/ui/MiniLoader";

interface TransportType {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  route: string;
  color: string;
}

const transportTypes: TransportType[] = [
  {
    id: "bagages",
    label: "GP Bagages",
    description: "Transport de bagages et colis par avion",
    icon: Plane,
    route: "/gp/bagages/inscription",
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "routier",
    label: "Transport Routier",
    description: "Livraison locale et nationale par véhicule",
    icon: Truck,
    route: "/routier/inscription",
    color: "from-amber-500 to-amber-600",
  },
  {
    id: "maritime",
    label: "Transport Maritime",
    description: "Fret maritime et conteneurs",
    icon: Ship,
    route: "/gp/inscription",
    color: "from-cyan-500 to-cyan-600",
  },
  {
    id: "express",
    label: "Coursier Express",
    description: "Livraison rapide en ville",
    icon: Package,
    route: "/gp/inscription",
    color: "from-green-500 to-green-600",
  },
];

export default function TransporteurRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [existingGP, setExistingGP] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        sessionStorage.setItem("pending_booking_state", JSON.stringify({
          returnPath: "/transporteur/inscription",
          timestamp: Date.now()
        }));
        navigate("/auth");
        return;
      }

      setIsAuthenticated(true);

      // Check if user already has a GP profile
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id, gp_type")
        .eq("user_id", user.id)
        .maybeSingle();

      if (gpProfile) {
        setExistingGP(true);
        toast({
          title: "Profil existant",
          description: "Vous avez déjà un profil transporteur.",
        });
        navigate("/gp/demandes");
        return;
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectType = (type: TransportType) => {
    setSelectedType(type.id);
    // Small delay for visual feedback
    setTimeout(() => {
      navigate(type.route);
    }, 200);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MiniLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />
      
      <main 
        className="px-4 pb-24"
        style={{ paddingTop: 'calc(70px + env(safe-area-inset-top, 0px))' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          {/* Header Section */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <Truck className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Devenir Transporteur
            </h1>
            <p className="text-muted-foreground text-sm">
              Choisissez votre type de transport pour commencer
            </p>
          </div>

          {/* Benefits Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4 mb-6"
          >
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              Avantages partenaires
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-xs">
                <Check className="w-4 h-4 text-success" />
                <span>Revenus flexibles</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Check className="w-4 h-4 text-success" />
                <span>Clients qualifiés</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Check className="w-4 h-4 text-success" />
                <span>Paiement sécurisé</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Check className="w-4 h-4 text-success" />
                <span>Support dédié</span>
              </div>
            </div>
          </motion.div>

          {/* Transport Type Selection */}
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
            Type de transport
          </h2>
          
          <div className="space-y-3">
            {transportTypes.map((type, index) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              
              return (
                <motion.button
                  key={type.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  onClick={() => handleSelectType(type)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                    isSelected 
                      ? "border-primary bg-primary/5 scale-[0.98]" 
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-0.5">
                      {type.label}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {type.description}
                    </p>
                  </div>
                  <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isSelected ? "text-primary" : "text-muted-foreground"
                  }`} />
                </motion.button>
              );
            })}
          </div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-6 mt-8 py-4"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-4 h-4 text-success" />
              <span>Vérifié</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="w-4 h-4 text-primary" />
              <span>Assuré</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="w-4 h-4 text-warning" />
              <span>Fiable</span>
            </div>
          </motion.div>

          {/* Footer info */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            En vous inscrivant, vous acceptez nos{" "}
            <button 
              onClick={() => navigate("/documents-legaux")}
              className="text-primary hover:underline"
            >
              conditions d'utilisation
            </button>
          </p>
        </motion.div>
      </main>

      <MobileNav />
    </div>
  );
}
