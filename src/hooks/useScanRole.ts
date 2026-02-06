/**
 * useScanRole - Hook to determine user's scan capabilities
 * 
 * Returns the user's role-based scan permissions:
 * - client: read-only (view status, history)
 * - gp: deposit confirm, delivery confirm, weight modify
 * - agent_logistique: pickup, delivery, stock confirm
 * - admin: full access
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ScanRole = "client" | "gp" | "agent_logistique" | "admin" | null;

export interface ScanPermissions {
  canDeposit: boolean;
  canDeliver: boolean;
  canModifyWeight: boolean;
  canPickup: boolean;
  canViewContact: boolean;
  canViewAll: boolean;
  readOnly: boolean;
}

const ROLE_PERMISSIONS: Record<string, ScanPermissions> = {
  client: {
    canDeposit: false,
    canDeliver: false,
    canModifyWeight: false,
    canPickup: false,
    canViewContact: false,
    canViewAll: false,
    readOnly: true,
  },
  gp: {
    canDeposit: true,
    canDeliver: true,
    canModifyWeight: true,
    canPickup: false,
    canViewContact: true,
    canViewAll: false,
    readOnly: false,
  },
  agent_logistique: {
    canDeposit: false,
    canDeliver: true,
    canModifyWeight: false,
    canPickup: true,
    canViewContact: true,
    canViewAll: false,
    readOnly: false,
  },
  admin: {
    canDeposit: true,
    canDeliver: true,
    canModifyWeight: true,
    canPickup: true,
    canViewContact: true,
    canViewAll: true,
    readOnly: false,
  },
};

export function useScanRole() {
  const [scanRole, setScanRole] = useState<ScanRole>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [gpId, setGpId] = useState<string | null>(null);

  useEffect(() => {
    detectRole();
  }, []);

  const detectRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setScanRole(null);
        return;
      }
      setUserId(user.id);

      // Check roles in priority order: admin > agent > gp > client
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roleSet = new Set(roles?.map(r => r.role) || []);

      if (roleSet.has("admin")) {
        setScanRole("admin");
      } else if (roleSet.has("agent_logistique")) {
        setScanRole("agent_logistique");
      } else {
        // Check if GP
        const { data: gp } = await supabase
          .from("gp_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (gp) {
          setGpId(gp.id);
          setScanRole("gp");
        } else {
          setScanRole("client");
        }
      }
    } catch (err) {
      console.error("Error detecting scan role:", err);
      setScanRole("client");
    } finally {
      setLoading(false);
    }
  };

  const permissions: ScanPermissions = scanRole 
    ? ROLE_PERMISSIONS[scanRole] || ROLE_PERMISSIONS.client
    : ROLE_PERMISSIONS.client;

  const logScan = async (
    orderId: string,
    action: string,
    scanType: string = "qr",
    previousStatus?: string,
    newStatus?: string,
    metadata?: Record<string, any>
  ) => {
    if (!userId) return;
    
    try {
      await supabase.from("scan_logs").insert({
        order_id: orderId,
        user_id: userId,
        user_role: scanRole || "client",
        action,
        scan_type: scanType,
        previous_status: previousStatus,
        new_status: newStatus,
        metadata: metadata || {},
      });
    } catch (err) {
      console.error("Error logging scan:", err);
    }
  };

  return {
    scanRole,
    permissions,
    loading,
    userId,
    gpId,
    logScan,
  };
}
