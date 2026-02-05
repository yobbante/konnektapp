import { supabase } from "@/integrations/supabase/client";
import { getOrCreateDirectConversation } from "@/lib/autoChat";

/**
 * Opens a direct conversation with a GP transporter
 * Creates a new conversation if one doesn't exist
 * Returns the conversation ID and contact name
 */
export async function openDirectConversation(
  gpId: string,
  navigate: (path: string, options?: any) => void
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "not_authenticated" };
    }

    // Get GP name for contact display
    const { data: gpProfile } = await supabase
      .from("gp_profiles")
      .select("business_name")
      .eq("id", gpId)
      .single();

    const contactName = gpProfile?.business_name || "Transporteur";

    // Get or create conversation
    const result = await getOrCreateDirectConversation(user.id, gpId);
    
    if (result.conversationId) {
      // Navigate directly to the conversation with the GP name
      navigate(`/messages?conversation=${result.conversationId}&contact=${encodeURIComponent(contactName)}`);
      return { success: true, conversationId: result.conversationId };
    }

    return { success: false, error: result.error || "Erreur lors de la création de la conversation" };
  } catch (error: any) {
    console.error("Error opening direct conversation:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Hook-style function that can be used in components
 */
export function useDirectConversation() {
  const openConversation = async (
    gpId: string,
    navigate: (path: string, options?: any) => void,
    options?: { requireAuth?: boolean; returnPath?: string }
  ) => {
    // Check auth first
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      if (options?.requireAuth) {
        navigate("/auth", { 
          state: { returnTo: options.returnPath || `/client/transporteurs/${gpId}` } 
        });
      }
      return { success: false, error: "not_authenticated" };
    }

    return openDirectConversation(gpId, navigate);
  };

  return { openConversation };
}
