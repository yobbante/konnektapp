import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TypingUser {
  user_id: string;
  user_type: string;
  is_typing: boolean;
}

export function useTypingIndicator(
  conversationId: string,
  currentUserId: string,
  userType: "client" | "gp"
) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Update typing status with debounce
  const setTyping = useCallback(async (isTyping: boolean) => {
    const now = Date.now();
    
    // Debounce: only send if more than 500ms since last update
    if (isTyping && now - lastTypingRef.current < 500) {
      return;
    }
    lastTypingRef.current = now;

    try {
      const { error } = await supabase
        .from("typing_indicators")
        .upsert({
          conversation_id: conversationId,
          user_id: currentUserId,
          user_type: userType,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "conversation_id,user_id",
        });

      if (error) {
        console.error("Error updating typing indicator:", error);
      }
    } catch (error) {
      console.error("Error in setTyping:", error);
    }
  }, [conversationId, currentUserId, userType]);

  // Handle input change - start typing with auto-stop
  const handleTypingStart = useCallback(() => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to true
    setTyping(true);

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  // Stop typing when message is sent
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
  }, [setTyping]);

  // Subscribe to typing indicators
  useEffect(() => {
    // Initial fetch
    const fetchTypingIndicators = async () => {
      const { data } = await supabase
        .from("typing_indicators")
        .select("user_id, user_type, is_typing")
        .eq("conversation_id", conversationId)
        .neq("user_id", currentUserId);

      if (data) {
        setTypingUsers(data);
        setIsOtherTyping(data.some(u => u.is_typing));
      }
    };

    fetchTypingIndicators();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as TypingUser).user_id !== currentUserId) {
            const newTyping = payload.new as TypingUser;
            setTypingUsers(prev => {
              const existing = prev.findIndex(u => u.user_id === newTyping.user_id);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = newTyping;
                return updated;
              }
              return [...prev, newTyping];
            });
            setIsOtherTyping(newTyping.is_typing);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Clear typing when leaving
      stopTyping();
    };
  }, [conversationId, currentUserId, stopTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isOtherTyping,
    typingUsers,
    handleTypingStart,
    stopTyping,
  };
}
