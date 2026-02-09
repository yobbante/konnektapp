/**
 * GPMessagesPage — Messagerie GP isolée
 * 
 * RÈGLES:
 * - Totalement séparée de la messagerie client
 * - Accessible uniquement depuis le Dashboard GP
 * - Affiche UNIQUEMENT les conversations où l'utilisateur est GP
 * - Les messages client n'apparaissent jamais ici
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MessageCircle, Package, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { ChatView } from "@/components/messaging/ChatView";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface GPConversation {
  id: string;
  client_id: string;
  order_id: string | null;
  last_message_at: string;
  client_name: string;
  order_number: string | null;
  order_status: string | null;
  unread_count: number;
  last_message: string | null;
}

export default function GPMessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<GPConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedContactName, setSelectedContactName] = useState("Client");
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  // Handle deep link
  useEffect(() => {
    const convId = searchParams.get("conversation");
    const contactName = searchParams.get("contact");
    if (convId) {
      setSelectedConversation(convId);
      if (contactName) setSelectedContactName(decodeURIComponent(contactName));
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      // Get GP profile
      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { navigate("/gp/inscription"); return; }
      setGpProfile(profile);

      // Get order counts
      const { data: orders } = await supabase
        .from("orders")
        .select("status")
        .eq("gp_id", profile.id);

      setPendingCount(orders?.filter(o => o.status === "pending").length || 0);
      setActiveCount(orders?.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length || 0);

      // Fetch conversations where this GP is participant (via gp_profiles.id)
      const { data: convs } = await supabase
        .from("conversations")
        .select("*")
        .eq("gp_id", profile.id)
        .order("last_message_at", { ascending: false });

      if (!convs) { setLoading(false); return; }

      // Enrich conversations
      const enriched = await Promise.all(
        convs.map(async (conv) => {
          // Client name
          const { data: clientProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", conv.client_id)
            .single();

          // Order info
          let orderNumber: string | null = null;
          let orderStatus: string | null = null;
          if (conv.order_id) {
            const { data: order } = await supabase
              .from("orders")
              .select("order_number, status")
              .eq("id", conv.order_id)
              .single();
            orderNumber = order?.order_number || null;
            orderStatus = order?.status || null;
          }

          // Last message
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Unread count (messages from client)
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("sender_type", "client")
            .is("read_at", null);

          return {
            id: conv.id,
            client_id: conv.client_id,
            order_id: conv.order_id,
            last_message_at: conv.last_message_at || conv.created_at,
            client_name: clientProfile?.full_name || "Client",
            order_number: orderNumber,
            order_status: orderStatus,
            unread_count: count || 0,
            last_message: lastMsg?.content || null,
          };
        })
      );

      setConversations(enriched);
    } catch (error) {
      console.error("Error loading GP messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: "En attente", color: "bg-yellow-500/10 text-yellow-600" },
    accepted: { label: "Acceptée", color: "bg-blue-500/10 text-blue-600" },
    collected: { label: "Collecté", color: "bg-indigo-500/10 text-indigo-600" },
    in_transit: { label: "En transit", color: "bg-purple-500/10 text-purple-600" },
    arrived: { label: "Arrivé", color: "bg-teal-500/10 text-teal-600" },
    delivered: { label: "Livré", color: "bg-green-500/10 text-green-600" },
    cancelled: { label: "Annulée", color: "bg-destructive/10 text-destructive" },
  };

  if (loading) return <PageLoader message="Chargement messagerie GP..." />;
  if (!gpProfile) return null;

  // Chat view — full screen, within GP layout feel
  if (selectedConversation) {
    return (
      <div className="min-h-screen bg-background">
        <ChatView
          conversationId={selectedConversation}
          currentUserId={gpProfile.id}
          userType="gp"
          onBack={() => setSelectedConversation(null)}
          contactName={selectedContactName}
        />
      </div>
    );
  }

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeCount}
      activeTab="messages"
    >
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Messagerie GP
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conversations liées à vos commandes
            </p>
          </div>
          {conversations.some(c => c.unread_count > 0) && (
            <Badge variant="destructive" className="text-xs">
              {conversations.reduce((sum, c) => sum + c.unread_count, 0)} non lu(s)
            </Badge>
          )}
        </div>

        {/* Conversation List */}
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune conversation GP</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les clients vous contacteront après une réservation
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv, index) => (
              <motion.button
                key={conv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => {
                  setSelectedConversation(conv.id);
                  setSelectedContactName(conv.client_name);
                }}
                className="w-full bg-card rounded-xl border border-border p-3 text-left hover:border-primary/30 transition-all active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {conv.client_name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{conv.client_name}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(conv.last_message_at), "HH:mm", { locale: fr })}
                      </span>
                    </div>

                    {/* Order context */}
                    {conv.order_number && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-mono">
                          #{conv.order_number.slice(-6)}
                        </span>
                        {conv.order_status && STATUS_LABELS[conv.order_status] && (
                          <Badge variant="secondary" className={`text-[9px] h-4 px-1.5 ${STATUS_LABELS[conv.order_status].color}`}>
                            {STATUS_LABELS[conv.order_status].label}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Last message + unread */}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {conv.last_message || "Nouvelle conversation"}
                      </p>
                      {conv.unread_count > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 text-[10px]">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </GPDashboardLayout>
  );
}
