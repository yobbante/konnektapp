// ============= ClientAppHome - Improved Centering =============

import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Truck, Shield, CreditCard, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { DynamicTagline } from "@/components/ui/DynamicTagline";

export function AppLikeHome() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGP, setIsGP] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      if (session?.user?.id) {
        const { data: gpProfile } = await supabase
          .from("gp_profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        setIsGP(!!gpProfile);
      }
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSendClick = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem("pending_booking_state", JSON.stringify({
        returnPath: "/envoyer",
        timestamp: Date.now()
      }));
      navigate("/auth");
    } else {
      navigate("/envoyer");
    }
  };

  const handleTransportClick = () => {
    if (isGP) {
      navigate("/gp/dashboard");
    } else {
      navigate("/transporteur/inscription");
    }
  };

  return (
    <div 
      className="flex flex-col bg-background overflow-hidden"
      style={{
       height: 'calc(100vh - 60px - 64px)',
       minHeight: '500px',
      }}
    >
      {/* Main Content - Centered with flex */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        
        {/* Dynamic Tagline */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }} 
          className="mb-10 w-full max-w-sm text-center"
        >
          <DynamicTagline />
        </motion.div>

        {/* Two Main CTAs */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, delay: 0.1 }} 
          className="w-full max-w-sm space-y-4 mb-10"
        >
          {/* CTA 1: Envoyer un colis */}
          <button 
            onClick={handleSendClick} 
            className="w-full flex items-center justify-between gap-4 p-5 rounded-2xl bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Package className="w-7 h-7" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-lg">Envoyer un colis</p>
                <p className="text-sm opacity-80">Trouvez un transporteur</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <span className="text-xl">→</span>
            </div>
          </button>

          {/* CTA 2: Transporter un colis */}
          <button 
            onClick={handleTransportClick} 
            className="w-full flex items-center justify-between gap-4 p-5 rounded-2xl bg-card border-2 border-border text-foreground shadow-md hover:shadow-lg hover:border-primary/50 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="w-7 h-7 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-lg">
                  {isGP ? "Mon Dashboard" : "Transporter un colis"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isGP ? "Gérer mes missions" : "Gagnez de l'argent"}
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xl text-muted-foreground">→</span>
            </div>
          </button>
        </motion.div>

        {/* Micro-Reassurance */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 0.4, delay: 0.2 }} 
          className="flex items-center justify-center gap-8"
        >
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Fiable</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <BadgeCheck className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Assuré</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Sécurisé</span>
          </div>
        </motion.div>
      </div>

      {/* Footer Link - In flow, not absolute */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.4, delay: 0.3 }} 
        className="py-4 text-center pb-safe shrink-0"
      >
        <Link to="/offres" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
          Explorer les offres disponibles <span className="text-lg">→</span>
        </Link>
      </motion.div>
    </div>
  );
}
