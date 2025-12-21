import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  MessageSquare, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  User,
  ChevronRight,
  Filter,
  Search,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  user_id: string;
  order_id: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  user_profile?: {
    full_name: string;
    email: string;
    phone: string;
  };
  order?: {
    order_number: string;
  };
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

export function AdminSupportTickets() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "support" | "dispute" | "complaint">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [resolution, setResolution] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(`
          *,
          order:orders(order_number)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const ticketsWithProfiles = await Promise.all(
        (data || []).map(async (ticket) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, phone")
            .eq("user_id", ticket.user_id)
            .single();
          
          return {
            ...ticket,
            user_profile: profile || undefined,
          };
        })
      );

      setTickets(ticketsWithProfiles);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const openTicketDetails = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setResolution(ticket.resolution || "");
    await fetchMessages(ticket.id);
  };

  const sendAdminMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || sending) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("support_messages").insert({
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        sender_type: "admin",
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
      await fetchMessages(selectedTicket.id);
      toast({ title: "Message envoyé" });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const updateTicketStatus = async (status: string) => {
    if (!selectedTicket) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updateData: Record<string, any> = { status };

      if (status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
        updateData.resolution = resolution;
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", selectedTicket.id);

      if (error) throw error;

      toast({ title: `Ticket ${status === "resolved" ? "résolu" : "mis à jour"}` });
      setSelectedTicket(null);
      await fetchTickets();
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = filter === "all" || ticket.status === filter;
    const matchesType = typeFilter === "all" || ticket.type === typeFilter;
    const matchesSearch = 
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesType && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <Clock className="w-4 h-4" />;
      case "in_progress": return <MessageSquare className="w-4 h-4" />;
      case "resolved": return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-yellow-100 text-yellow-700";
      case "in_progress": return "bg-blue-100 text-blue-700";
      case "resolved": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "dispute": return "bg-red-100 text-red-700";
      case "complaint": return "bg-orange-100 text-orange-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "low": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
    disputes: tickets.filter(t => t.type === "dispute").length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-20 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">Total tickets</p>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-yellow-600">{stats.open}</div>
          <p className="text-xs text-muted-foreground">Ouverts</p>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          <p className="text-xs text-muted-foreground">En cours</p>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          <p className="text-xs text-muted-foreground">Résolus</p>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-red-600">{stats.disputes}</div>
          <p className="text-xs text-muted-foreground">Litiges</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[140px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="open">Ouverts</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="resolved">Résolus</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="support">Support</SelectItem>
            <SelectItem value="dispute">Litiges</SelectItem>
            <SelectItem value="complaint">Plaintes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun ticket trouvé</p>
          </Card>
        ) : (
          filteredTickets.map((ticket, index) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openTicketDetails(ticket)}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    ticket.type === "dispute" ? "bg-red-100" : "bg-primary/10"
                  }`}>
                    {ticket.type === "dispute" ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        {ticket.ticket_number}
                      </span>
                      <Badge className={getTypeColor(ticket.type)}>
                        {ticket.type === "dispute" ? "Litige" : ticket.type === "complaint" ? "Plainte" : "Support"}
                      </Badge>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority === "high" ? "Urgent" : ticket.priority === "medium" ? "Moyen" : "Faible"}
                      </Badge>
                      <Badge className={getStatusColor(ticket.status)}>
                        {getStatusIcon(ticket.status)}
                        <span className="ml-1">
                          {ticket.status === "open" ? "Ouvert" : ticket.status === "in_progress" ? "En cours" : "Résolu"}
                        </span>
                      </Badge>
                    </div>
                    <p className="font-medium truncate">{ticket.subject}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{ticket.user_profile?.full_name || "Utilisateur"}</span>
                      <span>•</span>
                      <span>{format(new Date(ticket.created_at), "d MMM yyyy HH:mm", { locale: fr })}</span>
                      {ticket.order && (
                        <>
                          <span>•</span>
                          <span>Commande: {ticket.order.order_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTicket?.type === "dispute" ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : (
                <MessageSquare className="w-5 h-5 text-primary" />
              )}
              {selectedTicket?.ticket_number}
            </DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {/* Ticket Info */}
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getTypeColor(selectedTicket.type)}>
                      {selectedTicket.type === "dispute" ? "Litige" : selectedTicket.type === "complaint" ? "Plainte" : "Support"}
                    </Badge>
                    <Badge className={getPriorityColor(selectedTicket.priority)}>
                      Priorité: {selectedTicket.priority}
                    </Badge>
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {selectedTicket.status === "open" ? "Ouvert" : selectedTicket.status === "in_progress" ? "En cours" : "Résolu"}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="font-semibold">{selectedTicket.subject}</p>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTicket.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Utilisateur</p>
                      <p className="font-medium">{selectedTicket.user_profile?.full_name || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{selectedTicket.user_profile?.email}</p>
                      <p className="text-xs text-muted-foreground">{selectedTicket.user_profile?.phone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date de création</p>
                      <p className="font-medium">
                        {format(new Date(selectedTicket.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  {selectedTicket.order && (
                    <div>
                      <p className="text-muted-foreground text-sm">Commande associée</p>
                      <p className="font-mono">{selectedTicket.order.order_number}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Messages */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3">Historique des échanges</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun message
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`p-3 rounded-lg ${
                          msg.sender_type === "admin" 
                            ? "bg-primary/10 ml-4" 
                            : "bg-muted mr-4"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {msg.sender_type === "admin" ? "Admin" : "Utilisateur"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), "d MMM HH:mm", { locale: fr })}
                          </span>
                        </div>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* New Message */}
                {selectedTicket.status !== "resolved" && (
                  <div className="mt-4 flex gap-2">
                    <Textarea
                      placeholder="Répondre au ticket..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <Button onClick={sendAdminMessage} disabled={sending || !newMessage.trim()}>
                      Envoyer
                    </Button>
                  </div>
                )}
              </Card>

              {/* Actions */}
              {selectedTicket.status !== "resolved" && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Actions</h4>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Résolution / Notes de clôture..."
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                    />
                    <div className="flex gap-2 flex-wrap">
                      {selectedTicket.status === "open" && (
                        <Button 
                          variant="outline"
                          onClick={() => updateTicketStatus("in_progress")}
                        >
                          Prendre en charge
                        </Button>
                      )}
                      <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateTicketStatus("resolved")}
                        disabled={!resolution.trim()}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Marquer comme résolu
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {selectedTicket.status === "resolved" && selectedTicket.resolution && (
                <Card className="p-4 bg-green-50 border-green-200">
                  <h4 className="font-semibold text-green-700 mb-2">Résolution</h4>
                  <p className="text-sm">{selectedTicket.resolution}</p>
                  {selectedTicket.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Résolu le {format(new Date(selectedTicket.resolved_at), "d MMM yyyy HH:mm", { locale: fr })}
                    </p>
                  )}
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
