import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUnreadCount(0);
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Count unread messages in conversations where user is a participant
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .or(`client_id.eq.${user.id},gp_id.eq.${user.id}`);

      if (!conversations || conversations.length === 0) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const conversationIds = conversations.map(c => c.id);
      
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id)
        .is("read_at", null);

      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Error fetching unread messages:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUnreadCount();
    });

    return () => subscription.unsubscribe();
  }, [fetchUnreadCount]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`unread-messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          // If message is from someone else, increment count
          if (payload.new.sender_id !== userId) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          // If read_at was set and message was not from current user, decrease count
          if (payload.new.read_at && !payload.old.read_at && payload.new.sender_id !== userId) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { unreadCount, loading, refetch: fetchUnreadCount };
}
