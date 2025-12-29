import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

interface UsePermissionsReturn {
  permissions: Permission[];
  loading: boolean;
  hasPermission: (permissionName: string) => boolean;
  checkPermission: (permissionName: string) => Promise<boolean>;
  refreshPermissions: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserPermissions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      // Get user's roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (!roles || roles.length === 0) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      // Get permissions for all user roles
      const roleNames = roles.map(r => r.role);
      const { data: rolePermissions } = await supabase
        .from("role_permissions")
        .select(`
          permission_id,
          permissions:permission_id (
            id,
            name,
            description,
            category
          )
        `)
        .in("role", roleNames);

      if (rolePermissions) {
        const uniquePermissions = new Map<string, Permission>();
        rolePermissions.forEach((rp: any) => {
          if (rp.permissions) {
            uniquePermissions.set(rp.permissions.id, rp.permissions);
          }
        });
        setPermissions(Array.from(uniquePermissions.values()));
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  const hasPermission = useCallback((permissionName: string): boolean => {
    return permissions.some(p => p.name === permissionName);
  }, [permissions]);

  const checkPermission = useCallback(async (permissionName: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase.rpc("has_permission", {
        _user_id: user.id,
        _permission: permissionName,
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error("Error checking permission:", error);
      return false;
    }
  }, []);

  return {
    permissions,
    loading,
    hasPermission,
    checkPermission,
    refreshPermissions: fetchUserPermissions,
  };
}
