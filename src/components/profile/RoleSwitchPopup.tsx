import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Truck, ArrowRight, X, Repeat, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useActiveRole } from "@/hooks/useActiveRole";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Modern floating popup for multi-role users to switch between Client, Transporteur, and Admin modes
 * Centered at the bottom of the screen - optimized for mobile
 */
export function RoleSwitchPopup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeRole, isGP, isClient, userId } = useActiveRole();
  const { isAdmin } = useUserRole();
  const [hasGPProfile, setHasGPProfile] = useState(false);
  const [gpBusinessName, setGPBusinessName] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Routes where popup should be hidden
  // Masquer sur les pages auth, inscription, et AUSSI dans le dashboard transporteur
  const hiddenRoutes = ["/auth", "/gp/inscription", "/install", "/gp/dashboard", "/gp/", "/transporter"];
  const shouldHide = hiddenRoutes.some(route => location.pathname.startsWith(route));

  useEffect(() => {
    if (userId) {
      checkGPStatus();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const checkGPStatus = async () => {
    try {
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, status")
        .eq("user_id", userId)
        .maybeSingle();

      if (gpProfile) {
        setHasGPProfile(true);
        setGPBusinessName(gpProfile.business_name);
      } else {
        setHasGPProfile(false);
      }
    } catch (error) {
      console.error("Error checking GP status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToClient = () => {
    setIsExpanded(false);
    navigate("/profile");
  };

  const handleSwitchToTransporteur = () => {
    setIsExpanded(false);
    navigate("/gp/dashboard");
  };

  const handleSwitchToAdmin = () => {
    setIsExpanded(false);
    navigate("/admin");
  };

  // Don't render if:
  // - Loading
  // - User is not authenticated
  // - User doesn't have GP profile AND is not admin (single role client)
  // - On hidden routes
  if (loading || !userId || (!hasGPProfile && !isAdmin) || shouldHide) {
    return null;
  }

  // Determine current mode based on route
  const isInTransporteurMode = location.pathname.startsWith("/gp") || location.pathname.startsWith("/transporter");
  const isInAdminMode = location.pathname.startsWith("/admin");
  const isInClientMode = !isInTransporteurMode && !isInAdminMode;

  // Get current mode label
  const getCurrentModeLabel = () => {
    if (isInAdminMode) return "Admin";
    if (isInTransporteurMode) return "Transporteur";
    return "Client";
  };

  // Get the switch label - what user can switch TO
  const getSwitchLabel = () => {
    if (isInAdminMode) return "Client";
    if (isInTransporteurMode) return "Client";
    return hasGPProfile ? "Transporteur" : "Admin";
  };

  // Get icon and color for current role
  const getRoleIcon = () => {
    if (isInAdminMode) return <Shield className="w-4 h-4" />;
    if (isInTransporteurMode) return <Truck className="w-4 h-4" />;
    return <User className="w-4 h-4" />;
  };

  const getRoleColor = () => {
    if (isInAdminMode) return "bg-gradient-to-r from-red-500 to-pink-500";
    if (isInTransporteurMode) return "bg-gradient-to-r from-orange-500 to-amber-500";
    return "bg-gradient-to-r from-primary to-teal-400";
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className="fixed z-50 left-4"
        style={{
          bottom: 'calc(100px + var(--safe-bottom, 0px))',
        }}
      >
        {/* Collapsed Pill Button - Modern glass design */}
        {!isExpanded && (
          <motion.button
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(true)}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-full shadow-2xl transition-all text-white ${getRoleColor()}`}
            style={{
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {getRoleIcon()}
            <span className="font-semibold text-sm tracking-wide">
              {getCurrentModeLabel()}
            </span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"
            >
              <Repeat className="w-3 h-3" />
            </motion.div>
          </motion.button>
        )}

        {/* Expanded Modal - Clean modern card */}
        <AnimatePresence>
          {isExpanded && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm -z-10"
                onClick={() => setIsExpanded(false)}
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
                style={{ 
                  width: 'min(calc(100vw - 32px), 300px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
              >
                {/* Header with gradient */}
                <div className={`px-4 py-3 ${getRoleColor()} text-white flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Repeat className="w-5 h-5" />
                    <span className="font-bold text-base">Changer de mode</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={() => setIsExpanded(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Role Options */}
                <div className="p-3 space-y-2">
                  {/* Client Mode */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSwitchToClient}
                    disabled={isInClientMode}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all ${
                      isInClientMode
                        ? "bg-gradient-to-r from-primary/15 to-teal-400/10 border-2 border-primary/40"
                        : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isInClientMode 
                        ? "bg-gradient-to-br from-primary to-teal-400 text-white" 
                        : "bg-muted-foreground/10 text-muted-foreground"
                    }`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">Client</p>
                      <p className="text-xs text-muted-foreground">Envoyez vos colis</p>
                    </div>
                    {isInClientMode ? (
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">Actif</span>
                    ) : (
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </motion.button>

                  {/* Transporteur Mode */}
                  {hasGPProfile && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSwitchToTransporteur}
                      disabled={isInTransporteurMode}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all ${
                        isInTransporteurMode
                          ? "bg-gradient-to-r from-orange-500/15 to-amber-400/10 border-2 border-orange-400/40"
                          : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isInTransporteurMode 
                          ? "bg-gradient-to-br from-orange-500 to-amber-400 text-white" 
                          : "bg-muted-foreground/10 text-muted-foreground"
                      }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold">Transporteur</p>
                        <p className="text-xs text-muted-foreground truncate">{gpBusinessName}</p>
                      </div>
                      {isInTransporteurMode ? (
                        <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-full">Actif</span>
                      ) : (
                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </motion.button>
                  )}

                  {/* Admin Mode */}
                  {isAdmin && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSwitchToAdmin}
                      disabled={isInAdminMode}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all ${
                        isInAdminMode
                          ? "bg-gradient-to-r from-red-500/15 to-pink-400/10 border-2 border-red-400/40"
                          : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isInAdminMode 
                          ? "bg-gradient-to-br from-red-500 to-pink-500 text-white" 
                          : "bg-muted-foreground/10 text-muted-foreground"
                      }`}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold">Admin</p>
                        <p className="text-xs text-muted-foreground">Gestion plateforme</p>
                      </div>
                      {isInAdminMode ? (
                        <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full">Actif</span>
                      ) : (
                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
