import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface RedirectResult {
  success: boolean;
  destination: string;
  role: string | null;
}

export function useSmartRedirect() {
  const navigate = useNavigate();

  const detectUserRoleAndRedirect = useCallback(async (userId: string): Promise<RedirectResult> => {
    try {
      // 1. Vérifier si l'utilisateur est admin ou moderator
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

      // 2. Vérifier si l'utilisateur est un GP (transporteur)
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id, status")
        .eq("user_id", userId)
        .maybeSingle();

      if (gpProfile) {
        navigate("/gp/profil");
        return { 
          success: true, 
          destination: "/gp/profil", 
          role: "transporteur" 
        };
      }

      // 3. Sinon, c'est un client standard - TOUJOURS rediriger vers le profil
      navigate("/client/profile");
      return { 
        success: true, 
        destination: "/client/profile", 
        role: "client" 
      };

    } catch (error) {
      console.error("Error detecting user role:", error);
      // Fallback vers la page d'accueil en cas d'erreur
      navigate("/");
      return { 
        success: false, 
        destination: "/", 
        role: null 
      };
    }
  }, [navigate]);

  return { detectUserRoleAndRedirect };
}
