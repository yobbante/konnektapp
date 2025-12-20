import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserRoleState {
  isAdmin: boolean;
  isGP: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  userId: string | null;
}

export function useUserRole() {
  const [state, setState] = useState<UserRoleState>({
    isAdmin: false,
    isGP: false,
    isAuthenticated: false,
    loading: true,
    userId: null,
  });

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setState({
            isAdmin: false,
            isGP: false,
            isAuthenticated: false,
            loading: false,
            userId: null,
          });
          return;
        }

        // Check admin role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        // Check if user is GP
        const { data: profileData } = await supabase
          .from("profiles")
          .select("is_gp")
          .eq("user_id", user.id)
          .maybeSingle();

        setState({
          isAdmin: !!roleData,
          isGP: profileData?.is_gp || false,
          isAuthenticated: true,
          loading: false,
          userId: user.id,
        });
      } catch (error) {
        console.error("Error checking user role:", error);
        setState({
          isAdmin: false,
          isGP: false,
          isAuthenticated: false,
          loading: false,
          userId: null,
        });
      }
    };

    checkUserRole();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
