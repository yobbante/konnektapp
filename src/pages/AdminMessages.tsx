import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, ArrowLeft, Users, Shield, Plus, UserPlus, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChatView } from "@/components/messaging/ChatView";
import { useUserRole } from "@/hooks/useUserRole";
import { useDashboardTheme } from "@/hooks/useDashboardTheme";
import { AdminNewConversationDialog } from "@/components/admin/AdminNewConversationDialog";

interface Conversation {
  id: string;
  client_id: string;
  gp_id: string;
  order_id: string | null;
  last_message_at: string | null;
  client_name?: string;
  gp_name?: string;
  order_number?: string;
}

interface KonnektSignup {
  id: string;
  sender_phone: string;
  message_body: string | null;
  created_at: string;
}

export default function AdminMessages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasAdminAccess, loading: roleLoading, userId } = useUserRole();
  const theme = useDashboardTheme("admin");
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    searchParams.get("conversation")
  );
  const [selectedContactName, setSelectedContactName] = useState<string>("Conversation");
  const [loading, setLoading] = useState(true);
  const [showNewConversation, setShowNewConversation] = useState(false);

  useEffect(() => {
    if (!roleLoading && !hasAdminAccess) {
      navigate("/");
    }
  }, [roleLoading, hasAdminAccess, navigate]);

  useEffect(() => {
    if (hasAdminAccess) {
      fetchConversations();
    }
  }, [hasAdminAccess]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          orders (order_number)
        `)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Fetch client and GP names
      const conversationsWithNames = await Promise.all(
        (data || []).map(async (conv: any) => {
          // Get client name
          const { data: clientProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", conv.client_id)
            .single();

          // Get GP name
          const { data: gpProfile } = await supabase
            .from("gp_profiles")
            .select("business_name")
            .eq("id", conv.gp_id)
            .single();

          return {
            ...conv,
            client_name: clientProfile?.full_name || "Client",
            gp_name: gpProfile?.business_name || "Transporteur",
            order_number: conv.orders?.order_number
          };
        })
      );

      setConversations(conversationsWithNames);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv.id);
    setSelectedContactName(`${conv.client_name} ↔ ${conv.gp_name}`);
  };

  const handleConversationCreated = (conversationId: string, contactName: string) => {
    setSelectedConversation(conversationId);
    setSelectedContactName(contactName);
    fetchConversations();
  };

  const handleCreateConversation = async (clientId: string, gpId: string, orderId?: string) => {
    try {
      // Check if conversation exists
      let query = supabase
        .from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("gp_id", gpId);

      if (orderId) {
        query = query.eq("order_id", orderId);
      }

      const { data: existing } = await query.single();

      if (existing) {
        setSelectedConversation(existing.id);
        return existing.id;
      }

      // Create new conversation
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          client_id: clientId,
          gp_id: gpId,
          order_id: orderId || null,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchConversations();
      setSelectedConversation(data.id);
      return data.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      return null;
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!hasAdminAccess) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Admin Header with Safe Area */}
      <div 
        className={`sticky top-0 z-50 ${theme.headerBgClass} ${theme.headerTextClass} shadow-md`}
        style={{ paddingTop: 'calc(12px + var(--safe-top, 0px))' }}
      >
        <div className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
                className="text-inherit hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span className="font-semibold">Messagerie Admin</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewConversation(true)}
              className="bg-white/10 hover:bg-white/20 text-inherit"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nouvelle
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Conversation List */}
        <div className={`w-full md:w-80 border-r border-border ${selectedConversation ? "hidden md:block" : ""}`}>
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Toutes les conversations
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {conversations.length} conversation{conversations.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-180px)]">
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucune conversation</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <motion.button
                  key={conv.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full p-4 text-left border-b border-border transition-colors hover:bg-accent/50 ${
                    selectedConversation === conv.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">{conv.client_name}</p>
                        {conv.order_number && (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {conv.order_number}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        ↔ {conv.gp_name}
                      </p>
                      {conv.last_message_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(conv.last_message_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className={`flex-1 ${!selectedConversation ? "hidden md:flex" : "flex"} flex-col`}>
          {selectedConversation && userId ? (
            <ChatView
              conversationId={selectedConversation}
              currentUserId={userId}
              userType="client"
              onBack={() => setSelectedConversation(null)}
              contactName={selectedContactName}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Sélectionnez une conversation
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Dialog */}
      <AdminNewConversationDialog
        open={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}

export { AdminMessages };
