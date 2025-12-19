import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { ConversationList } from "@/components/messaging/ConversationList";
import { ChatView } from "@/components/messaging/ChatView";

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; isGp: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_gp")
          .eq("user_id", user.id)
          .single();

        setCurrentUser({
          id: user.id,
          isGp: profile?.is_gp || false,
        });
      }
    } catch (error) {
      console.error("Error checking user:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-safe">
        <MobileHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
        <MobileNav />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background pb-safe">
        <MobileHeader />
        <div className="px-4 py-12 text-center">
          <MessageCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="font-semibold text-lg mb-2">Connectez-vous</h2>
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour accéder à vos messages
          </p>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {!selectedConversation && <MobileHeader />}

      <div className="h-[calc(100vh-8rem)]">
        {selectedConversation ? (
          <ChatView
            conversationId={selectedConversation}
            currentUserId={currentUser.id}
            userType={currentUser.isGp ? "gp" : "client"}
            onBack={() => setSelectedConversation(null)}
            contactName="Contact"
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="px-4 py-4">
              <h1 className="text-xl font-bold">Messages</h1>
              <p className="text-sm text-muted-foreground">
                Vos conversations avec {currentUser.isGp ? "les clients" : "les transporteurs"}
              </p>
            </div>
            <ConversationList
              userType={currentUser.isGp ? "gp" : "client"}
              onSelectConversation={setSelectedConversation}
              selectedId={selectedConversation || undefined}
            />
          </motion.div>
        )}
      </div>

      {!selectedConversation && <MobileNav />}
    </div>
  );
}
