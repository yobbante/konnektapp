import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoPushNotifications } from "@/hooks/useAutoPushNotifications";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

/**
 * Global notification provider that sets up push notifications
 * and in-app realtime notifications based on the current user's role
 */
export function GlobalNotificationProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userType, setUserType] = useState<"client" | "gp" | null>(null);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        checkUser();
      } else if (event === "SIGNED_OUT") {
        setUserId(null);
        setUserType(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserId(null);
        setUserType(null);
        return;
      }

      setUserId(user.id);

      // Check if user is GP
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      setUserType(gpProfile ? "gp" : "client");
    } catch (error) {
      console.error("Error checking user for notifications:", error);
    }
  };

  // Initialize auto push notifications
  useAutoPushNotifications({
    userId,
    userType,
    enabled: true,
  });

  // Initialize in-app realtime notifications (toasts + sounds)
  useRealtimeNotifications({
    userId,
  });

  return <>{children}</>;
}
