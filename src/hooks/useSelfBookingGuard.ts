/**
 * Hook to prevent GP from booking their own departure.
 * Compares the current user's GP profile ID with the departure owner GP ID.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseSelfBookingGuardProps {
  gpId: string | undefined; // The GP who owns the offer
}

export function useSelfBookingGuard({ gpId }: UseSelfBookingGuardProps) {
  const [isSelfBooking, setIsSelfBooking] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!gpId) {
        setChecking(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setChecking(false);
          return;
        }

        // Check if the current user owns a GP profile matching the offer's GP
        const { data: gpProfile } = await supabase
          .from("gp_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (gpProfile && gpProfile.id === gpId) {
          setIsSelfBooking(true);
        }
      } catch (error) {
        console.error("Error checking self-booking:", error);
      } finally {
        setChecking(false);
      }
    };

    check();
  }, [gpId]);

  return { isSelfBooking, checking };
}
