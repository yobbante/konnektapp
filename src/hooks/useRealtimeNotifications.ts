import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useNotificationSound } from "./useNotificationSound";

interface UseRealtimeNotificationsProps {
  userId: string | null;
  onNewNotification?: (notification: any) => void;
  onNewMessage?: (message: any) => void;
}

export function useRealtimeNotifications({
  userId,
  onNewNotification,
  onNewMessage,
}: UseRealtimeNotificationsProps) {
  const { playSound } = useNotificationSound();
  const processedNotifications = useRef<Set<string>>(new Set());
  const processedMessages = useRef<Set<string>>(new Set());

  const handleNewNotification = useCallback((payload: any) => {
    const notification = payload.new;
    
    // Avoid duplicates
    if (processedNotifications.current.has(notification.id)) return;
    processedNotifications.current.add(notification.id);

    // Only show if for current user
    if (notification.user_id !== userId) return;

    console.log("New notification received:", notification);
    
    // Play sound
    playSound();

    // Show toast
    toast({
      title: notification.title,
      description: notification.message,
    });

    onNewNotification?.(notification);
  }, [userId, onNewNotification, playSound]);

  const handleNewMessage = useCallback((payload: any) => {
    const message = payload.new;
    
    // Avoid duplicates
    if (processedMessages.current.has(message.id)) return;
    processedMessages.current.add(message.id);

    // Don't notify for own messages
    if (message.sender_id === userId) return;

    console.log("New message received:", message);
    
    // Play sound
    playSound();

    // Show toast
    toast({
      title: "Nouveau message",
      description: message.content.substring(0, 50) + (message.content.length > 50 ? "..." : ""),
    });

    onNewMessage?.(message);
  }, [userId, onNewMessage, playSound]);

  useEffect(() => {
    if (!userId) return;

    console.log("Setting up realtime subscriptions for user:", userId);

    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        handleNewNotification
      )
      .subscribe((status) => {
        console.log("Notifications channel status:", status);
      });

    // Subscribe to messages (need to check conversations the user is part of)
    const messagesChannel = supabase
      .channel(`messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        handleNewMessage
      )
      .subscribe((status) => {
        console.log("Messages channel status:", status);
      });

    return () => {
      console.log("Cleaning up realtime subscriptions");
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [userId, handleNewNotification, handleNewMessage]);

  return {
    // Expose methods if needed
  };
}