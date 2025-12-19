import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Conversation {
  id: string;
  gp_id: string;
  client_id: string;
  last_message_at: string;
  gp_name?: string;
  client_name?: string;
  unread_count?: number;
  last_message?: string;
}

interface ConversationListProps {
  userType: "client" | "gp";
  onSelectConversation: (conversationId: string) => void;
  selectedId?: string;
}

export function ConversationList({ userType, onSelectConversation, selectedId }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-muted rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center">
        <MessageCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Aucune conversation</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conv, index) => (
        <motion.button
          key={conv.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelectConversation(conv.id)}
          className={`w-full p-4 text-left transition-colors ${
            selectedId === conv.id ? "bg-primary/5" : "hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm truncate">
                  {userType === "client" ? conv.gp_name || "Transporteur" : conv.client_name || "Client"}
                </p>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(conv.last_message_at), "HH:mm", { locale: fr })}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-muted-foreground truncate">
                  {conv.last_message || "Nouvelle conversation"}
                </p>
                {conv.unread_count && conv.unread_count > 0 && (
                  <Badge variant="default" className="h-5 min-w-5 text-xs">
                    {conv.unread_count}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
