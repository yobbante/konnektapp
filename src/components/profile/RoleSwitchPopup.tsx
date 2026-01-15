import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Truck, ArrowRight, X, Repeat, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useActiveRole } from "@/hooks/useActiveRole";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Constant floating popup for multi-role users to switch between Client, Transporteur, and Admin modes
 * Centered at the bottom of the screen
 */
export function RoleSwitchPopup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeRole, isGP, isClient, userId } = useActiveRole();
  const { isAdmin } = useUserRole();
  const [hasGPProfile, setHasGPProfile] = useState(false);
  const [gpBusinessName, setGPBusinessName] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  // Routes where popup should be hidden
  const hiddenRoutes = ["/auth", "/gp/inscription", "/install"];
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

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed z-50"
          style={{
            bottom: 'calc(90px + var(--safe-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {/* Collapsed Button - Mobile optimized */}
          {!isExpanded && (
            <motion.button
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-full shadow-xl hover:shadow-2xl transition-all text-sm"
            >
              <Repeat className="w-4 h-4" />
              <span className="font-medium">
                {getSwitchLabel()}
              </span>
            </motion.button>
          )}

          {/* Expanded Popup - Mobile optimized */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                style={{ width: 'min(calc(100vw - 32px), 280px)' }}
              >
                {/* Header */}
                <div className="px-3 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">Changer de mode</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsExpanded(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Current Mode Indicator */}
                <div className="px-3 py-1.5 bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    Mode actuel:{" "}
                    <span className="font-semibold text-foreground">
                      {getCurrentModeLabel()}
                    </span>
                  </p>
                </div>

                {/* Switch Options - Compact for mobile */}
                <div className="p-2 space-y-1.5">
                  {/* Client Mode */}
                  <button
                    onClick={handleSwitchToClient}
                    disabled={isInClientMode}
                    className={`w-full flex items-center gap-2 p-2.5 rounded-xl transition-all ${
                      isInClientMode
                        ? "bg-primary/10 border-2 border-primary/30 cursor-default"
                        : "bg-muted/50 hover:bg-muted border border-transparent hover:border-border active:scale-[0.98]"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isInClientMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">Client</p>
                      <p className="text-[10px] text-muted-foreground">Envoyez vos colis</p>
                    </div>
                    {isInClientMode ? (
                      <span className="text-[10px] font-medium text-primary">Actif</span>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Transporteur Mode - Only show if user has GP profile */}
                  {hasGPProfile && (
                    <button
                      onClick={handleSwitchToTransporteur}
                      disabled={isInTransporteurMode}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-xl transition-all ${
                        isInTransporteurMode
                          ? "bg-secondary/10 border-2 border-secondary/30 cursor-default"
                          : "bg-muted/50 hover:bg-muted border border-transparent hover:border-border active:scale-[0.98]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isInTransporteurMode ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-sm">Transporteur</p>
                        <p className="text-[10px] text-muted-foreground truncate">{gpBusinessName}</p>
                      </div>
                      {isInTransporteurMode ? (
                        <span className="text-[10px] font-medium text-secondary">Actif</span>
                      ) : (
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  )}

                  {/* Admin Mode - Only show if user is admin */}
                  {isAdmin && (
                    <button
                      onClick={handleSwitchToAdmin}
                      disabled={isInAdminMode}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-xl transition-all ${
                        isInAdminMode
                          ? "bg-destructive/10 border-2 border-destructive/30 cursor-default"
                          : "bg-muted/50 hover:bg-muted border border-transparent hover:border-border active:scale-[0.98]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isInAdminMode ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">Admin</p>
                        <p className="text-[10px] text-muted-foreground">Gestion plateforme</p>
                      </div>
                      {isInAdminMode ? (
                        <span className="text-[10px] font-medium text-destructive">Actif</span>
                      ) : (
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
