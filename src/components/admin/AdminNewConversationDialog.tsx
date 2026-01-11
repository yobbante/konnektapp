import { useState, useEffect } from "react";
import { Search, User, Truck, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminNewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string, contactName: string) => void;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

interface GPProfile {
  id: string;
  user_id: string;
  business_name: string;
  gp_type: string;
  status: string;
  city: string;
  phone: string;
}

export function AdminNewConversationDialog({ 
  open, 
  onClose, 
  onConversationCreated 
}: AdminNewConversationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [transporters, setTransporters] = useState<GPProfile[]>([]);
  const [activeTab, setActiveTab] = useState("clients");

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles (clients)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch all GP profiles (transporters)
      const { data: gpsData, error: gpsError } = await supabase
        .from("gp_profiles")
        .select("*")
        .order("business_name", { ascending: true });

      if (gpsError) throw gpsError;

      // Filter out profiles that are GPs (they have gp_profiles)
      const gpUserIds = new Set((gpsData || []).map(gp => gp.user_id));
      const clientProfiles = (profilesData || []).filter(p => !gpUserIds.has(p.user_id));

      setClients(clientProfiles);
      setTransporters(gpsData || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async (
    userId: string, 
    gpId: string | null, 
    contactName: string,
    isTransporter: boolean
  ) => {
    setCreating(true);
    try {
      // Get admin's user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // For admin conversations, we need to create a special conversation
      // If the target is a transporter, use their gp_id as gp_id
      // If the target is a client, we need a different approach
      
      let conversationData: any = {
        client_id: isTransporter ? user.id : userId,
        gp_id: isTransporter ? gpId : null,
      };

      if (!isTransporter) {
        // For client conversations, we need to find or create a conversation
        // where admin is technically acting as a "GP" for messaging purposes
        // Get admin's GP profile if exists, or use a system GP
        const { data: adminGpProfile } = await supabase
          .from("gp_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (adminGpProfile) {
          conversationData.gp_id = adminGpProfile.id;
          conversationData.client_id = userId;
        } else {
          // Admin doesn't have a GP profile, we'll create conversation differently
          // For now, skip this and show an error
          toast({
            title: "Info",
            description: "Pour contacter un client, utilisez le bouton 'Contacter' depuis les détails de commande.",
            variant: "default",
          });
          setCreating(false);
          return;
        }
      }

      // Check if conversation already exists
      let query = supabase
        .from("conversations")
        .select("id")
        .eq("client_id", conversationData.client_id)
        .eq("gp_id", conversationData.gp_id);

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        onConversationCreated(existing.id, contactName);
        onClose();
        return;
      }

      // Create new conversation
      const { data, error } = await supabase
        .from("conversations")
        .insert(conversationData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Conversation créée",
        description: `Nouvelle conversation avec ${contactName}`,
      });

      onConversationCreated(data.id, contactName);
      onClose();
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la conversation",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone?.includes(searchQuery)
  );

  const filteredTransporters = transporters.filter(gp =>
    gp.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gp.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gp.phone?.includes(searchQuery)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Nouvelle conversation
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clients" className="gap-2">
              <User className="w-4 h-4" />
              Clients ({filteredClients.length})
            </TabsTrigger>
            <TabsTrigger value="transporters" className="gap-2">
              <Truck className="w-4 h-4" />
              Transporteurs ({filteredTransporters.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 max-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <>
                <TabsContent value="clients" className="mt-0 space-y-2">
                  {filteredClients.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun client trouvé
                    </p>
                  ) : (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleStartConversation(
                          client.user_id,
                          null,
                          client.full_name || client.email || "Client",
                          false
                        )}
                        disabled={creating}
                        className="w-full p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {client.full_name || "Sans nom"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {client.email}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="transporters" className="mt-0 space-y-2">
                  {filteredTransporters.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun transporteur trouvé
                    </p>
                  ) : (
                    filteredTransporters.map((gp) => (
                      <button
                        key={gp.id}
                        onClick={() => handleStartConversation(
                          gp.user_id,
                          gp.id,
                          gp.business_name,
                          true
                        )}
                        disabled={creating}
                        className="w-full p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                          <Truck className="w-5 h-5 text-secondary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{gp.business_name}</p>
                            <Badge 
                              variant={gp.status === "verified" ? "success" : "warning"}
                              className="text-xs"
                            >
                              {gp.status === "verified" ? "Vérifié" : "En attente"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {gp.city} • {gp.gp_type}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
