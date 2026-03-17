import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, User, Clock, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Conversation {
  id: string;
  gp_id: string;
  client_id: string;
  order_id: string | null;
  last_message_at: string;
  gp_name?: string;
  client_name?: string;
  gp_selfie_url?: string | null;
  order_number?: string | null;
  order_status?: string | null;
  unread_count?: number;
  last_message?: string;
  expiresIn?: string | null;
}

interface ConversationListProps {
  userType: "client" | "gp";
  onSelectConversation: (conversationId: string, contactName: string) => void;
  selectedId?: string;
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-500",
  accepted: "bg-blue-500",
  collected: "bg-indigo-500",
  paid_held: "bg-emerald-500",
  checked_in: "bg-indigo-500",
  in_transit: "bg-violet-500",
  delivered: "bg-green-500",
  delivery_confirmed: "bg-green-600",
  cancelled: "bg-red-500",
};

export function ConversationList({ userType, onSelectConversation, selectedId }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
    const channel = supabase
      .channel('conversations-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      let query = supabase
        .from("conversations")
        .select("*, orders:order_id(status, order_number, updated_at)")
        .order("last_message_at", { ascending: false });

      if (userType === "client") {
        query = query.eq("client_id", user.id);
      } else {
        const { data: gpProfile } = await supabase
          .from("gp_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (gpProfile) {
          query = query.eq("gp_id", gpProfile.id);
        } else {
          setConversations([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Check disputes
      const orderIds = (data || []).map((c: any) => c.order_id).filter(Boolean);
      let disputeOrderIds = new Set<string>();
      if (orderIds.length > 0) {
        const { data: disputes } = await supabase
          .from("disputes")
          .select("order_id")
          .in("order_id", orderIds)
          .neq("status", "closed");
        if (disputes) disputeOrderIds = new Set(disputes.map((d: any) => d.order_id));
      }

      const now = Date.now();
      const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000;
      const DELIVERED_STATUSES = ['delivered', 'delivery_confirmed', 'released'];

      const activeConversations = (data || []).filter((conv: any) => {
        const orderStatus = conv.orders?.status;
        const orderUpdatedAt = conv.orders?.updated_at;
        if (orderStatus === 'cancelled') return false;
        if (orderStatus && DELIVERED_STATUSES.includes(orderStatus) && orderUpdatedAt) {
          if (disputeOrderIds.has(conv.order_id)) return true;
          if (now - new Date(orderUpdatedAt).getTime() > SEVENTY_TWO_HOURS) return false;
        }
        return true;
      });

      const enrichedConversations = await Promise.all(
        activeConversations.map(async (conv: any) => {
          const { data: gpProfile } = await supabase
            .from("gp_profiles")
            .select("business_name, selfie_url")
            .eq("id", conv.gp_id)
            .single();

          const { data: clientProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", conv.client_id)
            .single();

          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, sender_id, read_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", user.id)
            .is("read_at", null);

          let expiresIn: string | null = null;
          const orderStatus = conv.orders?.status;
          const orderUpdatedAt = conv.orders?.updated_at;
          if (orderStatus && DELIVERED_STATUSES.includes(orderStatus) && orderUpdatedAt && !disputeOrderIds.has(conv.order_id)) {
            const remaining = SEVENTY_TWO_HOURS - (now - new Date(orderUpdatedAt).getTime());
            if (remaining > 0) expiresIn = `${Math.ceil(remaining / (60 * 60 * 1000))}h`;
          }

          return {
            ...conv,
            gp_name: gpProfile?.business_name || "Transporteur",
            gp_selfie_url: gpProfile?.selfie_url || null,
            client_name: clientProfile?.full_name || "Client",
            order_number: conv.orders?.order_number || null,
            order_status: conv.orders?.status || null,
            last_message: lastMsg?.content,
            unread_count: count || 0,
            expiresIn,
          };
        })
      );

      setConversations(enrichedConversations);
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
        <p className="text-xs text-muted-foreground mt-1">
          {userType === "client" 
            ? "Réservez un transport pour démarrer une conversation" 
            : "Vos clients vous contacteront après une réservation"}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conv, index) => {
        const contactName = userType === "client" ? conv.gp_name : conv.client_name;
        const hasUnread = (conv.unread_count || 0) > 0;
        const statusDot = conv.order_status ? STATUS_DOT[conv.order_status] : null;
        
        return (
          <motion.button
            key={conv.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={() => onSelectConversation(conv.id, contactName || "Contact")}
            className={`w-full p-3 text-left transition-colors ${
              selectedId === conv.id ? "bg-primary/5" : hasUnread ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar with selfie or initials */}
              <div className="relative flex-shrink-0">
                {conv.gp_selfie_url && userType === "client" ? (
                  <img 
                    src={conv.gp_selfie_url} 
                    alt={contactName || ""} 
                    className="w-11 h-11 rounded-full object-cover border-2 border-background shadow-sm"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary text-sm">
                      {(contactName || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Status dot */}
                {statusDot && (
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${statusDot} border-2 border-background`} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Row 1: Name + order number + time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <p className={`text-sm truncate ${hasUnread ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                      {contactName}
                    </p>
                    {conv.order_number && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md flex-shrink-0 font-mono">
                        {conv.order_number}
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] flex-shrink-0 ${hasUnread ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: fr })}
                  </span>
                </div>

                {/* Row 2: Last message + badges */}
                <div className="flex items-center justify-between mt-0.5 gap-2">
                  <p className={`text-xs truncate flex-1 ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {conv.last_message || "Nouvelle conversation"}
                  </p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {conv.expiresIn && (
                      <span className="text-[9px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {conv.expiresIn}
                      </span>
                    )}
                    {hasUnread && (
                      <Badge variant="default" className="h-5 min-w-5 text-[10px] px-1.5">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
      
      {/* Info banner */}
      <div className="p-3 bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          Les conversations sont archivées 72h après la livraison. Signalez un litige pour conserver l'historique.
        </p>
      </div>
    </div>
  );
}