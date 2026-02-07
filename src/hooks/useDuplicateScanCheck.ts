/**
 * useDuplicateScanCheck - Prevents the same QR from triggering the same action twice
 * 
 * PRV Rule: "Un QR ne peut pas déclencher deux fois la même action"
 * Uses the can_perform_scan_action DB function for server-side validation.
 */
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useDuplicateScanCheck() {
  const { toast } = useToast();

  const canPerformAction = async (
    orderId: string,
    action: string,
    userRole: string
  ): Promise<boolean> => {
    // View actions are always allowed
    if (action === "view") return true;

    try {
      const { data, error } = await supabase.rpc("can_perform_scan_action", {
        p_order_id: orderId,
        p_action: action,
        p_user_role: userRole,
      });

      if (error) {
        console.error("Duplicate check error:", error);
        return true; // Allow on error to not block operations
      }

      if (!data) {
        toast({
          title: "⚠️ Action déjà effectuée",
          description: "Ce scan a déjà déclenché cette action. Un QR ne peut pas déclencher deux fois la même action.",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (err) {
      console.error("Duplicate check failed:", err);
      return true;
    }
  };

  return { canPerformAction };
}
