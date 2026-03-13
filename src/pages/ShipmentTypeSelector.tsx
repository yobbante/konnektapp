import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Truck, Plane, Ship, ArrowRight, Package } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

/**
 * ShipmentTypeSelector - Point d'entrée universel "Envoyer un colis"
 * 
 * Règles PRV:
 * - Plein écran, non scrollable
 * - 1 décision = 1 choix
 * - Chaque type redirige vers un parcours distinct
 * - Mobile-first, app-like
 */

interface TransportOption {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  description: string;
  path: string;
  available: boolean;
  color: string;
}

const transportOptions: TransportOption[] = [
  {
    id: "gp-bagages",
    icon: Briefcase,
    title: "GP via bagages",
    subtitle: "Voyageur",
    description: "Colis transporté dans les bagages d'un voyageur",
    path: "/offres",
    available: true,
    color: "bg-transport-voyageur/10 text-transport-voyageur border-transport-voyageur/30",
  },
  {
    id: "routier",
    icon: Truck,
    title: "Transport routier",
    subtitle: "Marketplace",
    description: "Comparez les transporteurs et leurs prix",
    path: "/routier/recherche",
    available: true,
    color: "bg-transport-routier/10 text-transport-routier border-transport-routier/30",
  },
  {
    id: "aerien",
    icon: Plane,
    title: "Transport aérien",
    subtitle: "Cargo & Express",
    description: "Fret aérien, cargo indépendant, shipping partner",
    path: "/aerien/apercu",
    available: true,
    color: "bg-transport-aerien/10 text-transport-aerien border-transport-aerien/30",
  },
  {
    id: "maritime",
    icon: Ship,
    title: "Transport maritime",
    subtitle: "Gros volumes",
    description: "Conteneur, groupage, véhicule maritime",
    path: "/maritime/demande",
    available: true,
    color: "bg-transport-maritime/10 text-transport-maritime border-transport-maritime/30",
  },
];

export default function ShipmentTypeSelector() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  const handleSelect = (option: TransportOption) => {
    if (!option.available) {
      return; // Coming soon
    }

    if (!isAuthenticated) {
      sessionStorage.setItem("pending_booking_state", JSON.stringify({
        returnPath: option.path,
        timestamp: Date.now(),
      }));
      navigate("/auth");
    } else {
      navigate(option.path);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <AppHeader />

      {/* Main Content - Full height, no scroll, centered */}
      <div 
        className="flex-1 flex flex-col px-4 overflow-hidden"
        style={{
          height: 'calc(100vh - 60px - 80px - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
          maxHeight: 'calc(100vh - 60px - 80px - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-4 flex-shrink-0"
        >
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">
            Quel type d'envoi ?
          </h1>
          <p className="text-sm text-muted-foreground">
            Choisissez le mode de transport adapté
          </p>
        </motion.div>

        {/* Transport Options - Grid */}
        <div className="flex-1 flex flex-col justify-center gap-3 py-4 overflow-hidden">
          {transportOptions.map((option, index) => {
            const Icon = option.icon;
            const isAvailable = option.available;

            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                onClick={() => handleSelect(option)}
                disabled={!isAvailable}
                className={`
                  relative w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left
                  transition-all duration-200 active:scale-[0.98]
                  ${isAvailable 
                    ? `${option.color} hover:shadow-md cursor-pointer` 
                    : 'bg-muted/30 border-muted text-muted-foreground cursor-not-allowed opacity-60'
                  }
                `}
              >
                {/* Icon */}
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                  ${isAvailable ? option.color : 'bg-muted'}
                `}>
                  <Icon className={`w-6 h-6 ${isAvailable ? '' : 'text-muted-foreground'}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className={`font-semibold ${isAvailable ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {option.title}
                    </h3>
                    {!isAvailable && (
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                        Bientôt
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {option.description}
                  </p>
                </div>

                {/* Arrow */}
                {isAvailable && (
                  <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Bottom hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="pb-4 text-center flex-shrink-0"
        >
          <p className="text-xs text-muted-foreground">
            💡 Chaque mode a ses propres tarifs et délais
          </p>
        </motion.div>
      </div>

      {/* Always show bottom nav */}
      <MobileNav />
    </div>
  );
}