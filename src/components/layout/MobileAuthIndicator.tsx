import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileAuthIndicatorProps {
  isAuthenticated: boolean;
}

/**
 * Indicateur visuel de connexion pour la navigation mobile
 * Affiche un CTA d'inscription/connexion pour les visiteurs non connectés
 * Masqué sur /auth et quand l'utilisateur est connecté
 */
export function MobileAuthIndicator({ isAuthenticated }: MobileAuthIndicatorProps) {
  const location = useLocation();
  
  // Hide everywhere EXCEPT homepage when not authenticated
  // Only show on "/" for non-authenticated users
  if (isAuthenticated || location.pathname !== "/") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="fixed bottom-[72px] left-4 right-4 z-40 md:hidden"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-3 shadow-lg border border-primary/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-primary-foreground">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Rejoignez-nous</p>
                <p className="text-xs opacity-80">Créez un compte gratuit</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/auth?mode=login">
                <Button size="sm" variant="secondary" className="gap-1 text-xs">
                  <LogIn className="w-3 h-3" />
                  Connexion
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm" className="bg-white text-primary hover:bg-white/90 gap-1 text-xs">
                  <UserPlus className="w-3 h-3" />
                  Inscription
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
