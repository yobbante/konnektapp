import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface RedirectResult {
  success: boolean;
  destination: string;
  role: string | null;
}

/**
 * useSmartRedirect V1 - Redirections intelligentes
 * 
 * Règles:
 * 1. Vérifie d'abord le pending_booking_state pour retour post-login
 * 2. Admin/Moderator → /admin
 * 3. GP (transporteur) → /gp/dashboard
 * 4. Client standard → /client/dashboard (PAS /, car connecté = dashboard)
 */
export function useSmartRedirect() {
  const navigate = useNavigate();

  /**
   * Save current location for return after login
   */
  const saveCurrentLocation = useCallback(() => {
    const currentPath = window.location.pathname + window.location.search;
    // Don't save auth page itself
    if (currentPath !== "/auth" && currentPath !== "/") {
      sessionStorage.setItem("pending_booking_state", JSON.stringify({
        returnPath: currentPath,
        timestamp: Date.now()
      }));
    }
  }, []);

  /**
   * Check for pending booking state and return the path if valid
   */
  const getPendingReturnPath = useCallback((): string | null => {
    const stored = sessionStorage.getItem("pending_booking_state");
    if (!stored) return null;

    try {
      const state = JSON.parse(stored);
      // Only use if less than 30 minutes old
      if (Date.now() - state.timestamp < 30 * 60 * 1000 && state.returnPath) {
        sessionStorage.removeItem("pending_booking_state");
        // Only return path for /envoyer or /offres routes - otherwise redirect to home
        if (state.returnPath.startsWith("/envoyer") || state.returnPath.startsWith("/offres")) {
          return state.returnPath;
        }
        return null; // Redirect to home for all other paths
      }
    } catch {
      // Invalid state
    }
    sessionStorage.removeItem("pending_booking_state");
    return null;
  }, []);

  const detectUserRoleAndRedirect = useCallback(async (userId: string): Promise<RedirectResult> => {
    try {
      // 1. Check for pending booking/action first (retour exact post-login)
      const pendingPath = getPendingReturnPath();
      if (pendingPath) {
        navigate(pendingPath);
        return {
          success: true,
          destination: pendingPath,
          role: "pending_action",
        };
      }

      // 2. Vérifier si l'utilisateur est admin ou moderator
      const { data: adminAccess } = await supabase.rpc("has_admin_access", {
        _user_id: userId,
      });

      if (adminAccess) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["admin", "moderator"])
          .limit(1)
          .maybeSingle();

        navigate("/admin");
        return { 
          success: true, 
          destination: "/admin", 
          role: roleData?.role || "admin" 
        };
      }

      // 3. Vérifier si l'utilisateur est un GP (transporteur) - check gp_type
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id, status, gp_type")
        .eq("user_id", userId)
        .maybeSingle();

      if (gpProfile) {
        // Route based on gp_type
        const isRoutier = gpProfile.gp_type === "routier";
        const destination = isRoutier ? "/routier/demandes" : "/gp/demandes";
        navigate(destination);
        return { 
          success: true, 
          destination, 
          role: "transporteur" 
        };
      }

      // 4. Client standard → Accueil (car pas de pending action = login depuis header)
      navigate("/");
      return { 
        success: true, 
        destination: "/", 
        role: "client" 
      };

    } catch (error) {
      console.error("Error detecting user role:", error);
      // Fallback vers accueil en cas d'erreur
      navigate("/");
      return { 
        success: false, 
        destination: "/", 
        role: null 
      };
    }
  }, [navigate, getPendingReturnPath]);

  /**
   * Redirect to GP registration only if user is NOT already a GP
   * Prevents duplicate transporter creation
   */
  const redirectToGPRegistration = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (gpProfile) {
        // Already a GP - redirect to demandes page instead
        navigate("/gp/demandes");
        return false;
      }

      // Not a GP - allow registration
      return true;
    } catch (error) {
      console.error("Error checking GP status:", error);
      return true;
    }
  }, [navigate]);

  return { 
    detectUserRoleAndRedirect, 
    redirectToGPRegistration,
    getPendingReturnPath,
    saveCurrentLocation
  };
}

/**
 * Hook to enforce role-based dashboard access
 * Routier NEVER sees GP dashboard
 */
export function useEnforceDashboardRole(expectedType: "gp" | "routier") {
  const navigate = useNavigate();

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("gp_type")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!gpProfile) return;

      // Enforce strict routing
      if (expectedType === "gp" && gpProfile.gp_type === "routier") {
        navigate("/routier/demandes", { replace: true });
      } else if (expectedType === "routier" && gpProfile.gp_type !== "routier") {
        navigate("/gp/demandes", { replace: true });
      }
    };

    checkRole();
  }, [expectedType, navigate]);
}
