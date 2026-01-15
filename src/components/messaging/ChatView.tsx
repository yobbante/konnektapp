import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Phone, MoreVertical, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { TypingIndicator } from "./TypingIndicator";
import { MiniLoader } from "@/components/ui/MiniLoader";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
  userType: "client" | "gp";
  onBack: () => void;
  contactName?: string;
}

export function ChatView({ conversationId, currentUserId, userType, onBack, contactName }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { notify } = useNotificationSound();
  
  const { isOtherTyping, handleTypingStart, stopTyping } = useTypingIndicator(
    conversationId,
    currentUserId,
    userType
  );

  useEffect(() => {
    fetchMessages();
    markMessagesAsRead();
    
    // Subscribe to realtime messages
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          scrollToBottom();
          // Mark new messages as read if from other user and play sound
          if ((payload.new as Message).sender_id !== currentUserId) {
            markMessageAsRead((payload.new as Message).id);
            notify({ sound: true, vibrate: [100] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUserId)
        .is("read_at", null);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("id", messageId);
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    stopTyping(); // Stop typing indicator when sending
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        sender_type: userType,
        content: newMessage.trim(),
      });

      if (error) throw error;

      // Update conversation's last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ height: '100dvh' }}>
      {/* Header - Compact for mobile */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border bg-background flex-shrink-0 sticky top-0 z-10" style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}>
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="font-semibold text-primary text-sm">
            {contactName?.charAt(0) || "?"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{contactName || "Contact"}</p>
          <p className="text-xs text-muted-foreground">En ligne</p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Phone className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages - Maximized view area for mobile */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ minHeight: 0 }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <MiniLoader size="md" showText text="Chargement..." />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Commencez la conversation !
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.sender_id === currentUserId;
            const showTime =
              index === 0 ||
              new Date(msg.created_at).getTime() -
                new Date(messages[index - 1].created_at).getTime() >
                300000;

            return (
              <div key={msg.id}>
                {showTime && (
                  <p className="text-[10px] text-center text-muted-foreground mb-2">
                    {format(new Date(msg.created_at), "d MMM, HH:mm", { locale: fr })}
                  </p>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isOwn ? "justify-end" : ""}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    {/* Read indicator for own messages */}
                    {isOwn && (
                      <div className="flex justify-end mt-0.5">
                        {msg.read_at ? (
                          <CheckCheck className="w-3 h-3 text-primary-foreground/70" />
                        ) : (
                          <Check className="w-3 h-3 text-primary-foreground/50" />
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicator */}
        <AnimatePresence>
          {isOtherTyping && (
            <TypingIndicator contactName={contactName} />
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Mobile optimized with larger touch target */}
      <form 
        onSubmit={sendMessage} 
        className="p-3 border-t border-border bg-background flex-shrink-0"
        style={{ paddingBottom: 'calc(12px + var(--safe-bottom, 0px))' }}
      >
        <div className="flex gap-2 items-end">
          <Input
            placeholder="Votre message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTypingStart();
            }}
            className="flex-1 min-h-[44px] text-base"
            autoComplete="off"
            autoCorrect="on"
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || sending} 
            className="h-11 w-11 p-0 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
