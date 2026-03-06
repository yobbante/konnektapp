/**
 * RoutierMessagesPage — Messagerie Routier isolée
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageCircle, Search, Send, ArrowLeft, User, CheckCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Conversation {
  id: string;
  client_id: string;
  gp_id: string;
  last_message_at: string | null;
  client_name?: string;
  last_message?: string;
}

interface Msg {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export default function RoutierMessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(searchParams.get("conversation"));
  const [messages, setMessages] = useState<Msg[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    setUserId(user.id);
    const { data: gp } = await supabase
      .from("gp_profiles").select("*").eq("user_id", user.id).eq("gp_type", "routier").maybeSingle();
    if (!gp) { navigate("/routier/inscription"); return; }
    setGpProfile(gp);
    await loadConversations(gp.id);
    setLoading(false);
  };

  const loadConversations = async (gpId: string) => {
    const { data: convs } = await supabase
      .from("conversations").select("*").eq("gp_id", gpId)
      .order("last_message_at", { ascending: false });
    if (!convs) return;

    const enriched: Conversation[] = [];
    for (const conv of convs) {
      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("user_id", conv.client_id).maybeSingle();
      const { data: lastMsg } = await supabase
        .from("messages").select("content").eq("conversation_id", conv.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      enriched.push({ ...conv, client_name: profile?.full_name || "Client", last_message: lastMsg?.content || "" });
    }
    setConversations(enriched);
  };

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from("messages").select("*").eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((data as Msg[]) || []);
    
    if (userId) {
      await supabase.from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", userId)
        .is("read_at", null);
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [userId]);

  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation);
  }, [selectedConversation, loadMessages]);

  useEffect(() => {
    if (!selectedConversation) return;
    const channel = supabase
      .channel(`routier-msgs-${selectedConversation}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConversation}` },
        () => loadMessages(selectedConversation))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation, loadMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || !userId) return;
    setSending(true);
    try {
      await supabase.from("messages").insert({
        conversation_id: selectedConversation,
        sender_id: userId,
        sender_type: "gp",
        content: newMessage.trim(),
      });
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", selectedConversation);
      setNewMessage("");
      await loadMessages(selectedConversation);
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  if (loading) return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  if (!gpProfile) return null;

  const filteredConversations = conversations.filter(c =>
    !searchQuery || c.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedConv = conversations.find(c => c.id === selectedConversation);

  if (selectedConversation && selectedConv) {
    return (
      <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={0} activeOrdersCount={0}>
        <div className="flex flex-col h-[calc(100vh-140px)]">
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedConversation(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{selectedConv.client_name}</p>
              <p className="text-[10px] text-muted-foreground">Client</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Démarrez la conversation</p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.sender_id === userId;
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] px-3 py-2 rounded-2xl text-sm",
                      isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                    )}>
                      <p>{msg.content}</p>
                      <div className={cn("flex items-center gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
                        <span className={cn("text-[9px]", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                          {formatDistanceToNow(new Date(msg.created_at), { locale: fr, addSuffix: true })}
                        </span>
                        {isMe && <CheckCheck className={cn("w-3 h-3", msg.read_at ? "text-primary-foreground/80" : "text-primary-foreground/40")} />}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-3 border-t bg-card">
            <div className="flex gap-2">
              <Input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                placeholder="Écrire un message..." className="flex-1"
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()} />
              <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </RoutierDashboardLayout>
    );
  }

  return (
    <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={0} activeOrdersCount={0}>
      <div className="px-4 py-4 space-y-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" /> Messages
          </h2>
          <p className="text-xs text-muted-foreground">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher un client..." className="pl-9" />
        </div>

        {filteredConversations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <MessageCircle className="w-16 h-16 text-muted-foreground/15 mx-auto mb-4" />
              <h3 className="font-semibold mb-1">Aucune conversation</h3>
              <p className="text-sm text-muted-foreground">Les messages de vos clients apparaîtront ici</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map(conv => (
              <motion.div key={conv.id} whileTap={{ scale: 0.98 }} onClick={() => setSelectedConversation(conv.id)}>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold truncate">{conv.client_name}</p>
                          {conv.last_message_at && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(conv.last_message_at), { locale: fr, addSuffix: true })}
                            </span>
                          )}
                        </div>
                        {conv.last_message && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </RoutierDashboardLayout>
  );
}
