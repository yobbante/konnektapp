/**
 * HeaderRoleSwitch - Subtle role switcher integrated in header
 * 
 * Shows current role as a small badge that expands on tap
 * to reveal role switching options
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Truck, Shield, ChevronDown, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

export function HeaderRoleSwitch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, userId, isAuthenticated } = useUserRole();
  const [hasGPProfile, setHasGPProfile] = useState(false);
  const [gpBusinessName, setGPBusinessName] = useState("");
  const [gpType, setGPType] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Routes where switch should be hidden
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
        .select("id, business_name, status, gp_type")
        .eq("user_id", userId)
        .maybeSingle();

      if (gpProfile) {
        setHasGPProfile(true);
        setGPBusinessName(gpProfile.business_name);
      }
    } catch (error) {
      console.error("Error checking GP status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = (role: "client" | "gp" | "admin") => {
    setIsExpanded(false);
    switch (role) {
      case "client":
        navigate("/client/dashboard");
        break;
      case "gp":
        navigate("/gp/dashboard");
        break;
      case "admin":
        navigate("/admin");
        break;
    }
  };

  // Don't render if not authenticated, loading, single-role user, or on hidden routes
  if (loading || !isAuthenticated || (!hasGPProfile && !isAdmin) || shouldHide) {
    return null;
  }

  // Determine current mode
  const isInGPMode = location.pathname.startsWith("/gp") || location.pathname.startsWith("/transporter");
  const isInAdminMode = location.pathname.startsWith("/admin");
  const isInClientMode = !isInGPMode && !isInAdminMode;

  // Get current role info
  const getCurrentRole = () => {
    if (isInAdminMode) return { icon: Shield, label: "Admin", color: "bg-red-500/10 text-red-600 border-red-200" };
    if (isInGPMode) return { icon: Truck, label: "GP", color: "bg-amber-500/10 text-amber-600 border-amber-200" };
    return { icon: User, label: "Client", color: "bg-primary/10 text-primary border-primary/20" };
  };

  const currentRole = getCurrentRole();
  const CurrentIcon = currentRole.icon;

  return (
    <div className="relative">
      {/* Compact Role Badge */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all ${currentRole.color}`}
      >
        <CurrentIcon className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">{currentRole.label}</span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3 h-3 opacity-60" />
        </motion.div>
      </motion.button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsExpanded(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
            >
              <div className="p-1.5 space-y-0.5">
                {/* Client Option */}
                <button
                  onClick={() => handleSwitch("client")}
                  disabled={isInClientMode}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all ${
                    isInClientMode 
                      ? "bg-primary/10 cursor-default" 
                      : "hover:bg-muted active:scale-[0.98]"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isInClientMode ? "bg-primary text-white" : "bg-muted"
                  }`}>
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-semibold">Client</p>
                  </div>
                  {isInClientMode ? (
                    <span className="text-[10px] font-bold text-primary">Actif</span>
                  ) : (
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>

                {/* GP Option */}
                {hasGPProfile && (
                  <button
                    onClick={() => handleSwitch("gp")}
                    disabled={isInGPMode}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all ${
                      isInGPMode 
                        ? "bg-amber-500/10 cursor-default" 
                        : "hover:bg-muted active:scale-[0.98]"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isInGPMode ? "bg-amber-500 text-white" : "bg-muted"
                    }`}>
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-xs font-semibold truncate">{gpBusinessName || "Transporteur"}</p>
                    </div>
                    {isInGPMode ? (
                      <span className="text-[10px] font-bold text-amber-600">Actif</span>
                    ) : (
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                )}

                {/* Admin Option */}
                {isAdmin && (
                  <button
                    onClick={() => handleSwitch("admin")}
                    disabled={isInAdminMode}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all ${
                      isInAdminMode 
                        ? "bg-red-500/10 cursor-default" 
                        : "hover:bg-muted active:scale-[0.98]"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isInAdminMode ? "bg-red-500 text-white" : "bg-muted"
                    }`}>
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-xs font-semibold">Admin</p>
                    </div>
                    {isInAdminMode ? (
                      <span className="text-[10px] font-bold text-red-600">Actif</span>
                    ) : (
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
