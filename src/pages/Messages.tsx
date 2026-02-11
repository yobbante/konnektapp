import { useState, useEffect } from "react";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { MessageCircle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { ConversationList } from "@/components/messaging/ConversationList";
import { ChatView } from "@/components/messaging/ChatView";
import { Button } from "@/components/ui/button";
import { AdminNewConversationDialog } from "@/components/admin/AdminNewConversationDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { findConversationForOrder } from "@/lib/autoChat";

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedContactName, setSelectedContactName] = useState<string>("Contact");
  const [currentUser, setCurrentUser] = useState<{ id: string; isGp: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const { hasAdminAccess } = useUserRole();

  useEffect(() => {
    checkUser();
  }, []);

  // Handle deep link to specific conversation or order
  useEffect(() => {
    const handleDeepLink = async () => {
      const conversationId = searchParams.get("conversation");
      const orderId = searchParams.get("order");
      const contactName = searchParams.get("contact");
      
      if (conversationId) {
        setSelectedConversation(conversationId);
        // Use provided contact name or try to fetch it
        if (contactName) {
          setSelectedContactName(decodeURIComponent(contactName));
        } else {
          // Fetch contact name from conversation
          const { data: conv } = await supabase
            .from("conversations")
            .select("gp_id, gp_profiles!inner(business_name)")
            .eq("id", conversationId)
            .single();
          
          if (conv?.gp_profiles) {
            setSelectedContactName((conv.gp_profiles as any).business_name || "Contact");
          }
        }
      } else if (orderId) {
        // Find conversation for this order
        const convId = await findConversationForOrder(orderId);
        if (convId) {
          setSelectedConversation(convId);
        }
      }
    };
    
    if (currentUser) {
      handleDeepLink();
    }
  }, [searchParams, currentUser]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // For client messages page, always set as client role
        // GP messaging is handled separately at /gp/messages
        setCurrentUser({
          id: user.id,
          isGp: false, // Always client context in /messages
        });
      }
    } catch (error) {
      console.error("Error checking user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conversationId: string, contactName: string) => {
    setSelectedConversation(conversationId);
    setSelectedContactName(contactName);
  };

  const handleConversationCreated = (conversationId: string, contactName: string) => {
    setSelectedConversation(conversationId);
    setSelectedContactName(contactName);
    setShowNewConversation(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-safe">
        <MobileHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <MiniLoader size="lg" showText text="Chargement..." />
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
    <div className="min-h-screen bg-background pb-safe flex flex-col">
      {!selectedConversation && <MobileHeader />}

      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConversation ? (
          <ChatView
            conversationId={selectedConversation}
            currentUserId={currentUser.id}
            userType={currentUser.isGp ? "gp" : "client"}
            onBack={() => setSelectedConversation(null)}
            contactName={selectedContactName}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-4 py-4 flex-shrink-0 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">Messages</h1>
                <p className="text-sm text-muted-foreground">
                  Vos conversations avec {currentUser.isGp ? "les clients" : "les transporteurs"}
                </p>
              </div>
              {hasAdminAccess && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setShowNewConversation(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nouveau
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                userType={currentUser.isGp ? "gp" : "client"}
                onSelectConversation={handleSelectConversation}
                selectedId={selectedConversation || undefined}
              />
            </div>
          </motion.div>
        )}
      </div>

      {!selectedConversation && <MobileNav />}

      {/* Admin New Conversation Dialog */}
      <AdminNewConversationDialog
        open={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}