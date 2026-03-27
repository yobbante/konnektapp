import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useAudioCall } from "@/hooks/useAudioCall";
import { TypingIndicator } from "./TypingIndicator";
import { SmartClientResponses } from "./SmartClientResponses";
import { SmartGPResponses } from "./SmartGPResponses";
import { ChatHeader } from "./ChatHeader";
import { MessageContent } from "./MessageContent";
import { AudioCallUI } from "./AudioCallUI";
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
  orderId?: string;
}

export function ChatView({ conversationId, currentUserId, userType, onBack, contactName }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [templatesExpanded, setTemplatesExpanded] = useState(false);
  const [isGpVerified, setIsGpVerified] = useState(false);
  const [gpId, setGpId] = useState<string | null>(null);
  const [gpPhone, setGpPhone] = useState<string | null>(null);
  const [gpSelfieUrl, setGpSelfieUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [bottomOffset, setBottomOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { notify } = useNotificationSound();
  
  const { isOtherTyping, handleTypingStart, stopTyping } = useTypingIndicator(
    conversationId,
    currentUserId,
    userType
  );

  const {
    callStatus,
    callDuration,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  } = useAudioCall({ currentUserId, conversationId });

  // ── Keyboard-aware layout using visualViewport ──
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onViewportResize = () => {
      const viewportHeight = vv.height + vv.offsetTop;
      const keyboardHeight = Math.max(0, window.innerHeight - viewportHeight);
      // Only apply offset if keyboard is meaningfully open (>100px)
      setBottomOffset(keyboardHeight > 100 ? keyboardHeight : 0);
      
      // Scroll to bottom when keyboard opens
      if (keyboardHeight > 100) {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
        });
      }
    };

    onViewportResize();

    vv.addEventListener("resize", onViewportResize);
    vv.addEventListener("scroll", onViewportResize);
    
    return () => {
      vv.removeEventListener("resize", onViewportResize);
      vv.removeEventListener("scroll", onViewportResize);
    };
  }, []);

  useEffect(() => {
    loadConversationData();
    fetchMessages();
    markMessagesAsRead();
    
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
          if ((payload.new as Message).sender_id !== currentUserId) {
            markMessageAsRead((payload.new as Message).id);
            notify({ sound: true, vibrate: [100] });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === (payload.new as Message).id
                ? { ...msg, read_at: (payload.new as Message).read_at }
                : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const loadConversationData = async () => {
    try {
      const { data: conv } = await supabase
        .from("conversations")
        .select("gp_id, order_id")
        .eq("id", conversationId)
        .single();

      if (conv?.gp_id) {
        setGpId(conv.gp_id);
        const { data: gpProfile } = await supabase
          .from("gp_profiles")
          .select("verified_at, phone, selfie_url")
          .eq("id", conv.gp_id)
          .single();

        setIsGpVerified(!!gpProfile?.verified_at);
        setGpPhone(gpProfile?.phone || null);
        setGpSelfieUrl(gpProfile?.selfie_url || null);
      }
      
      if (conv?.order_id) {
        setOrderId(conv.order_id);
      }
    } catch (error) {
      console.error("Error loading conversation data:", error);
    }
  };

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

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }, 100);
  }, []);

  const handleSelectTemplate = (content: string) => {
    setNewMessage(content);
    setTemplatesExpanded(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    stopTyping();
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        sender_type: userType,
        content: newMessage.trim(),
      });

      if (error) throw error;

      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      setNewMessage("");
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (templatesExpanded && e.target === messagesContainerRef.current) {
      setTemplatesExpanded(false);
    }
  };

  const getCalleeId = async () => {
    const { data: conv } = await supabase
      .from("conversations")
      .select("client_id, gp_profiles!inner(user_id)")
      .eq("id", conversationId)
      .single();
    
    if (!conv) return;
    const gpUserId = (conv.gp_profiles as any)?.user_id;
    const calleeId = currentUserId === conv.client_id ? gpUserId : conv.client_id;
    if (calleeId) startCall(calleeId);
  };

  const isKeyboardOpen = bottomOffset > 100;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 flex flex-col bg-background"
      style={{
        // When keyboard is open, shrink the container to visual viewport
        height: isKeyboardOpen ? `${window.innerHeight - bottomOffset}px` : '100dvh',
        paddingBottom: 0,
      }}
    >
      {/* Audio Call UI Overlay */}
      <AudioCallUI
        callStatus={callStatus}
        callDuration={callDuration}
        contactName={contactName || "Contact"}
        incomingCall={incomingCall}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEnd={endCall}
      />

      {/* Fixed Header - always visible at top, compact when keyboard open */}
      <div className="flex-shrink-0 z-50">
        <ChatHeader
          conversationId={conversationId}
          contactName={contactName || "Contact"}
          contactId={gpId || ""}
          isGpVerified={isGpVerified}
          onBack={onBack}
          gpPhone={gpPhone}
          gpSelfieUrl={gpSelfieUrl}
          onAudioCall={getCalleeId}
          isKeyboardOpen={isKeyboardOpen}
        />
      </div>

      {/* Messages - scrollable area fills space between header and input */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-2 space-y-2" 
        style={{ 
          minHeight: 0,
          WebkitOverflowScrolling: 'touch',
        }}
        onClick={handleContainerClick}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <MiniLoader size="md" showText text="Chargement..." />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Commencez la conversation !
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Utilisez les messages rapides pour communiquer efficacement
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
                    className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <MessageContent 
                      content={msg.content} 
                      orderId={orderId || undefined}
                      isOwn={isOwn}
                    />
                    {isOwn && (
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-[9px] text-primary-foreground/50">
                          {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                        </span>
                        {msg.read_at ? (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/40" />
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })
        )}
        
        <AnimatePresence>
          {isOtherTyping && (
            <TypingIndicator contactName={contactName} />
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Smart responses - collapsible, above input */}
      <div className="flex-shrink-0">
        {userType === "client" ? (
          <SmartClientResponses
            conversationId={conversationId}
            currentUserId={currentUserId}
            onSelectMessage={handleSelectTemplate}
            isExpanded={templatesExpanded}
            onToggleExpand={() => setTemplatesExpanded(!templatesExpanded)}
          />
        ) : (
          <SmartGPResponses
            conversationId={conversationId}
            currentUserId={currentUserId}
            onSelectMessage={handleSelectTemplate}
            isExpanded={templatesExpanded}
            onToggleExpand={() => setTemplatesExpanded(!templatesExpanded)}
          />
        )}
      </div>

      {/* Input - fixed at bottom, above keyboard */}
      <form 
        onSubmit={sendMessage} 
        className="flex-shrink-0 p-3 border-t border-border bg-background"
        style={{ 
          paddingBottom: isKeyboardOpen ? '8px' : 'calc(8px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex gap-2 items-end">
          <Input
            ref={inputRef}
            placeholder="Votre message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTypingStart();
            }}
            onFocus={scrollToBottom}
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
