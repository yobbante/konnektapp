import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserRoleState {
  isAdmin: boolean;
  isModerator: boolean;
  hasAdminAccess: boolean;
  isGP: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  loading: boolean;
  userId: string | null;
}

export function useUserRole() {
  const [state, setState] = useState<UserRoleState>({
    isAdmin: false,
    isModerator: false,
    hasAdminAccess: false,
    isGP: false,
    isAuthenticated: false,
    isProfileComplete: false,
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
            isModerator: false,
            hasAdminAccess: false,
            isGP: false,
            isAuthenticated: false,
            isProfileComplete: false,
            loading: false,
            userId: null,
          });
          return;
        }

        // Check user roles (admin and/or moderator)
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const roles = rolesData?.map(r => r.role) || [];
        const isAdmin = roles.includes("admin");
        const isModerator = roles.includes("moderator");

        // Check if user is GP
        const { data: profileData } = await supabase
          .from("profiles")
          .select("is_gp, full_name, email, phone, city")
          .eq("user_id", user.id)
          .maybeSingle();

        // Check profile completeness
        const isProfileComplete = !!(
          profileData?.full_name &&
          profileData?.email &&
          profileData?.phone &&
          profileData?.city
        );

        setState({
          isAdmin,
          isModerator,
          hasAdminAccess: isAdmin || isModerator,
          isGP: profileData?.is_gp || false,
          isAuthenticated: true,
          isProfileComplete,
          loading: false,
          userId: user.id,
        });
      } catch (error) {
        console.error("Error checking user role:", error);
        setState({
          isAdmin: false,
          isModerator: false,
          hasAdminAccess: false,
          isGP: false,
          isAuthenticated: false,
          isProfileComplete: false,
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
