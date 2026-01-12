import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActiveRole = "client" | "transporteur" | "admin" | "super_admin" | null;

interface ActiveRoleState {
  activeRole: ActiveRole;
  isLoading: boolean;
  userId: string | null;
  isGP: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isClient: boolean;
  gpProfileId: string | null;
  setActiveRole: (role: ActiveRole) => void;
  refreshRole: () => Promise<void>;
}

export function useActiveRole(): ActiveRoleState {
  const [activeRole, setActiveRoleState] = useState<ActiveRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [gpProfileId, setGpProfileId] = useState<string | null>(null);

  const determineRole = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setActiveRoleState(null);
        setUserId(null);
        setGpProfileId(null);
        return;
      }

      setUserId(user.id);

      // Check for admin/moderator roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = rolesData?.map(r => r.role) || [];
      const isAdmin = roles.includes("admin");
      const isModerator = roles.includes("moderator");

      if (isAdmin) {
        setActiveRoleState("super_admin");
        return;
      }

      if (isModerator) {
        setActiveRoleState("admin");
        return;
      }

      // Check if user is a transporter (GP)
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (gpProfile) {
        setGpProfileId(gpProfile.id);
        setActiveRoleState("transporteur");
        return;
      }

      // Default to client
      setActiveRoleState("client");
    } catch (error) {
      console.error("Error determining role:", error);
      setActiveRoleState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    determineRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      determineRole();
    });

    return () => subscription.unsubscribe();
  }, [determineRole]);

  const setActiveRole = useCallback((role: ActiveRole) => {
    setActiveRoleState(role);
  }, []);

  return {
    activeRole,
    isLoading,
    userId,
    isGP: activeRole === "transporteur",
    isAdmin: activeRole === "admin" || activeRole === "super_admin",
    isModerator: activeRole === "admin",
    isClient: activeRole === "client",
    gpProfileId,
    setActiveRole,
    refreshRole: determineRole,
  };
}
