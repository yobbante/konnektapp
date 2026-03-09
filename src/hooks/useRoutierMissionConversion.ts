/**
 * useRoutierMissionConversion - Converts accepted mission to order + escrow
 * Bridges routier_missions → orders → escrow_transactions
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useRoutierMissionConversion() {
  const { toast } = useToast();
  const [converting, setConverting] = useState(false);

  const convertMissionToOrder = async (
    missionId: string,
    gpId: string,
    agreedPrice: number
  ): Promise<string | null> => {
    setConverting(true);
    try {
      // Call the DB function to atomically create order from mission
      const { data, error } = await supabase.rpc("convert_mission_to_order", {
        p_mission_id: missionId,
        p_gp_id: gpId,
        p_agreed_price: agreedPrice,
      });

      if (error) throw error;

      const orderId = data as string;

      // Lock escrow for the agreed price
      try {
        await supabase.functions.invoke("lock-escrow", {
          body: { order_id: orderId, mission_id: missionId },
        });
      } catch (escrowErr) {
        console.warn("[Routier] Escrow lock failed (non-blocking):", escrowErr);
      }

      toast({
        title: "Mission convertie en commande",
        description: "Le paiement est sécurisé. Le transport peut commencer.",
      });

      return orderId;
    } catch (err: any) {
      console.error("[Routier] Conversion failed:", err);
      toast({
        title: "Erreur de conversion",
        description: err.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setConverting(false);
    }
  };

  return { convertMissionToOrder, converting };
}
