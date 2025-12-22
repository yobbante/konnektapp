import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Scale,
  AlertTriangle,
  Clock,
  CheckCircle,
  User,
  ChevronRight,
  Filter,
  Search,
  Eye,
  FileText,
  Truck,
  Shield,
  Ban,
  AlertCircle,
  History,
  TrendingDown,
  MessageSquare,
  Calendar,
  DollarSign,
  XCircle,
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
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Dispute {
  id: string;
  dispute_number: string;
  order_id: string;
  initiated_by: string;
  initiated_by_type: string;
  category: string;
  description: string;
  attachments: string[];
  status: string;
  assigned_moderator: string | null;
  responsible_party: string | null;
  provisional_decision: string | null;
  final_decision: string | null;
  sanction_applied: string | null;
  compensation_amount: number;
  deadline_response: string | null;
  deadline_resolution: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  order?: {
    order_number: string;
    client_id: string;
    gp_id: string;
    total_price: number;
    status: string;
    origin_city: string;
    destination_city: string;
  };
  client_profile?: {
    full_name: string;
    email: string;
    phone: string;
  };
  gp_profile?: {
    business_name: string;
    phone: string;
    city: string;
  };
  gp_reputation?: {
    internal_score: number;
    reputation_status: string;
    total_disputes: number;
    disputes_lost: number;
  };
}

interface DisputeHistory {
  id: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  actor_type: string;
  notes: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  delay_unjustified: "Retard non justifié",
  partial_loss: "Perte partielle",
  total_loss: "Perte totale",
  deterioration: "Détérioration",
  non_conformity: "Non-conformité",
  transporter_silence: "Silence du transporteur",
  client_fault: "Faute du client",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  under_review: "En examen",
  awaiting_response: "Attente réponse",
  provisional_decision: "Décision provisoire",
  closed: "Clôturé",
};

const SANCTION_LABELS: Record<string, string> = {
  warning: "Avertissement",
  financial_compensation: "Compensation financière",
  full_refund: "Remboursement total",
  temporary_suspension: "Suspension temporaire",
  permanent_exclusion: "Exclusion définitive",
};

export function AdminDisputeArbitration() {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [history, setHistory] = useState<DisputeHistory[]>([]);
  const [processing, setProcessing] = useState(false);
  
  // Decision form state
  const [newStatus, setNewStatus] = useState("");
  const [responsibleParty, setResponsibleParty] = useState("");
  const [sanctionType, setSanctionType] = useState("");
  const [compensationAmount, setCompensationAmount] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const { data, error } = await supabase
        .from("disputes")
        .select(`
          *,
          order:orders(
            order_number,
            client_id,
            gp_id,
            total_price,
            status,
            origin_city,
            destination_city
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch related profiles and reputation
      const disputesWithProfiles = await Promise.all(
        (data || []).map(async (dispute) => {
          let client_profile, gp_profile, gp_reputation;

          if (dispute.order?.client_id) {
            const { data: clientData } = await supabase
              .from("profiles")
              .select("full_name, email, phone")
              .eq("user_id", dispute.order.client_id)
              .single();
            client_profile = clientData;
          }

          if (dispute.order?.gp_id) {
            const { data: gpData } = await supabase
              .from("gp_profiles")
              .select("business_name, phone, city")
              .eq("id", dispute.order.gp_id)
              .single();
            gp_profile = gpData;

            const { data: repData } = await supabase
              .from("transporter_reputation")
              .select("internal_score, reputation_status, total_disputes, disputes_lost")
              .eq("gp_id", dispute.order.gp_id)
              .single();
            gp_reputation = repData;
          }

          return {
            ...dispute,
            client_profile,
            gp_profile,
            gp_reputation,
          };
        })
      );

      setDisputes(disputesWithProfiles);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      toast({ title: "Erreur lors du chargement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (disputeId: string) => {
    try {
      const { data, error } = await supabase
        .from("dispute_history")
        .select("*")
        .eq("dispute_id", disputeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const openDisputeDetails = async (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setNewStatus(dispute.status);
    setResponsibleParty(dispute.responsible_party || "");
    setSanctionType(dispute.sanction_applied || "");
    setCompensationAmount(dispute.compensation_amount?.toString() || "0");
    setDecisionNotes("");
    await fetchHistory(dispute.id);
  };

  const handleUpdateDispute = async () => {
    if (!selectedDispute || processing) return;

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updateData: Record<string, any> = {
        status: newStatus,
        responsible_party: responsibleParty || null,
        sanction_applied: sanctionType || null,
        compensation_amount: parseInt(compensationAmount) || 0,
      };

      // Set deadlines based on status
      if (newStatus === "under_review" && !selectedDispute.deadline_response) {
        updateData.deadline_response = addDays(new Date(), 3).toISOString();
      }

      if (newStatus === "provisional_decision") {
        updateData.provisional_decision = decisionNotes;
        updateData.deadline_resolution = addDays(new Date(), 7).toISOString();
      }

      if (newStatus === "closed") {
        updateData.final_decision = decisionNotes;
        updateData.closed_at = new Date().toISOString();

        // Apply sanction if needed
        if (sanctionType && responsibleParty === "transporter" && selectedDispute.order?.gp_id) {
          const { data: gpProfile } = await supabase
            .from("gp_profiles")
            .select("user_id")
            .eq("id", selectedDispute.order.gp_id)
            .single();

          if (gpProfile) {
            await supabase.from("sanctions").insert({
              target_user_id: gpProfile.user_id,
              target_type: "transporter",
              sanction_type: sanctionType as any,
              reason: decisionNotes,
              applied_by: user.id,
              is_permanent: sanctionType === "permanent_exclusion",
              ends_at: sanctionType === "temporary_suspension" 
                ? addDays(new Date(), 30).toISOString() 
                : null,
            });
          }
        }
      }

      const { error } = await supabase
        .from("disputes")
        .update(updateData)
        .eq("id", selectedDispute.id);

      if (error) throw error;

      // Add to history
      await supabase.from("dispute_history").insert({
        dispute_id: selectedDispute.id,
        action: "decision_update",
        old_status: selectedDispute.status as any,
        new_status: newStatus as any,
        actor_id: user.id,
        actor_type: "admin",
        notes: decisionNotes,
      });

      toast({ title: "Litige mis à jour avec succès" });
      setSelectedDispute(null);
      await fetchDisputes();
    } catch (error) {
      console.error("Error updating dispute:", error);
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const filteredDisputes = disputes.filter((dispute) => {
    const matchesStatus = statusFilter === "all" || dispute.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || dispute.category === categoryFilter;
    const matchesSearch =
      dispute.dispute_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.order?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.client_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.gp_profile?.business_name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "under_review": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "awaiting_response": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "provisional_decision": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "closed": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "total_loss": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "partial_loss": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "deterioration": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "delay_unjustified": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getReputationColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const stats = {
    total: disputes.length,
    open: disputes.filter((d) => d.status === "open").length,
    underReview: disputes.filter((d) => d.status === "under_review").length,
    awaiting: disputes.filter((d) => d.status === "awaiting_response").length,
    provisional: disputes.filter((d) => d.status === "provisional_decision").length,
    closed: disputes.filter((d) => d.status === "closed").length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-24 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-muted-foreground" />
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
          <p className="text-xs text-muted-foreground">Total litiges</p>
        </Card>
        <Card className="p-3 border-yellow-200 dark:border-yellow-800">
          <div className="text-2xl font-bold text-yellow-600">{stats.open}</div>
          <p className="text-xs text-muted-foreground">Ouverts</p>
        </Card>
        <Card className="p-3 border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-600">{stats.underReview}</div>
          <p className="text-xs text-muted-foreground">En examen</p>
        </Card>
        <Card className="p-3 border-orange-200 dark:border-orange-800">
          <div className="text-2xl font-bold text-orange-600">{stats.awaiting}</div>
          <p className="text-xs text-muted-foreground">Attente</p>
        </Card>
        <Card className="p-3 border-purple-200 dark:border-purple-800">
          <div className="text-2xl font-bold text-purple-600">{stats.provisional}</div>
          <p className="text-xs text-muted-foreground">Provisoire</p>
        </Card>
        <Card className="p-3 border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600">{stats.closed}</div>
          <p className="text-xs text-muted-foreground">Clôturés</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher litige, commande, client..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="open">Ouverts</SelectItem>
            <SelectItem value="under_review">En examen</SelectItem>
            <SelectItem value="awaiting_response">Attente réponse</SelectItem>
            <SelectItem value="provisional_decision">Décision provisoire</SelectItem>
            <SelectItem value="closed">Clôturés</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Disputes List */}
      <div className="space-y-3">
        {filteredDisputes.length === 0 ? (
          <Card className="p-8 text-center">
            <Scale className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun litige trouvé</p>
          </Card>
        ) : (
          filteredDisputes.map((dispute, index) => (
            <motion.div
              key={dispute.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card
                className="p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4"
                style={{
                  borderLeftColor: dispute.status === "open" ? "#eab308" :
                    dispute.status === "closed" ? "#22c55e" : "#3b82f6"
                }}
                onClick={() => openDisputeDetails(dispute)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        {dispute.dispute_number}
                      </span>
                      <Badge className={getCategoryColor(dispute.category)}>
                        {CATEGORY_LABELS[dispute.category] || dispute.category}
                      </Badge>
                      <Badge className={getStatusColor(dispute.status)}>
                        {STATUS_LABELS[dispute.status] || dispute.status}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm line-clamp-1">{dispute.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {dispute.client_profile?.full_name || "Client"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {dispute.gp_profile?.business_name || "Transporteur"}
                      </span>
                      {dispute.gp_reputation && (
                        <span className={`flex items-center gap-1 font-medium ${getReputationColor(dispute.gp_reputation.internal_score)}`}>
                          <Shield className="w-3 h-3" />
                          Score: {dispute.gp_reputation.internal_score}/100
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(dispute.created_at), "d MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Dispute Detail Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Arbitrage - {selectedDispute?.dispute_number}
            </DialogTitle>
          </DialogHeader>

          {selectedDispute && (
            <Tabs defaultValue="details" className="flex-1">
              <TabsList className="px-6">
                <TabsTrigger value="details">Détails</TabsTrigger>
                <TabsTrigger value="parties">Parties</TabsTrigger>
                <TabsTrigger value="decision">Décision</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[60vh]">
                <TabsContent value="details" className="p-6 pt-4 space-y-4">
                  {/* Status and Category */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getCategoryColor(selectedDispute.category)}>
                      {CATEGORY_LABELS[selectedDispute.category]}
                    </Badge>
                    <Badge className={getStatusColor(selectedDispute.status)}>
                      {STATUS_LABELS[selectedDispute.status]}
                    </Badge>
                    {selectedDispute.sanction_applied && (
                      <Badge variant="destructive">
                        Sanction: {SANCTION_LABELS[selectedDispute.sanction_applied]}
                      </Badge>
                    )}
                  </div>

                  {/* Order Info */}
                  {selectedDispute.order && (
                    <Card className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Commande associée
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Numéro</p>
                          <p className="font-mono">{selectedDispute.order.order_number}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Montant</p>
                          <p className="font-medium">{selectedDispute.order.total_price?.toLocaleString()} FCFA</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Trajet</p>
                          <p>{selectedDispute.order.origin_city} → {selectedDispute.order.destination_city}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Statut commande</p>
                          <p className="capitalize">{selectedDispute.order.status}</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Description */}
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2">Description du litige</h4>
                    <p className="text-sm text-muted-foreground">{selectedDispute.description}</p>
                    {selectedDispute.attachments?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-2">Pièces jointes:</p>
                        <div className="flex gap-2 flex-wrap">
                          {selectedDispute.attachments.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary underline"
                            >
                              Pièce {i + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Deadlines */}
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Délais
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Création</p>
                        <p>{format(new Date(selectedDispute.created_at), "d MMM yyyy HH:mm", { locale: fr })}</p>
                      </div>
                      {selectedDispute.deadline_response && (
                        <div>
                          <p className="text-muted-foreground">Délai réponse</p>
                          <p className={new Date(selectedDispute.deadline_response) < new Date() ? "text-red-600" : ""}>
                            {format(new Date(selectedDispute.deadline_response), "d MMM yyyy HH:mm", { locale: fr })}
                          </p>
                        </div>
                      )}
                      {selectedDispute.deadline_resolution && (
                        <div>
                          <p className="text-muted-foreground">Délai résolution</p>
                          <p className={new Date(selectedDispute.deadline_resolution) < new Date() ? "text-red-600" : ""}>
                            {format(new Date(selectedDispute.deadline_resolution), "d MMM yyyy HH:mm", { locale: fr })}
                          </p>
                        </div>
                      )}
                      {selectedDispute.closed_at && (
                        <div>
                          <p className="text-muted-foreground">Clôturé le</p>
                          <p>{format(new Date(selectedDispute.closed_at), "d MMM yyyy HH:mm", { locale: fr })}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="parties" className="p-6 pt-4 space-y-4">
                  {/* Client Info */}
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Client (Initiateur)
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Nom</p>
                        <p className="font-medium">{selectedDispute.client_profile?.full_name || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p>{selectedDispute.client_profile?.email || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Téléphone</p>
                        <p>{selectedDispute.client_profile?.phone || "N/A"}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Transporter Info */}
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Transporteur
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Entreprise</p>
                        <p className="font-medium">{selectedDispute.gp_profile?.business_name || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Téléphone</p>
                        <p>{selectedDispute.gp_profile?.phone || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ville</p>
                        <p>{selectedDispute.gp_profile?.city || "N/A"}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Reputation */}
                  {selectedDispute.gp_reputation && (
                    <Card className="p-4 border-2" style={{
                      borderColor: selectedDispute.gp_reputation.internal_score < 50 ? "#ef4444" : 
                        selectedDispute.gp_reputation.internal_score < 70 ? "#f59e0b" : "#22c55e"
                    }}>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Réputation Transporteur
                      </h4>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Score interne</p>
                          <p className={`text-2xl font-bold ${getReputationColor(selectedDispute.gp_reputation.internal_score)}`}>
                            {selectedDispute.gp_reputation.internal_score}/100
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Statut</p>
                          <Badge className={
                            selectedDispute.gp_reputation.reputation_status === "verified" ? "bg-green-100 text-green-700" :
                            selectedDispute.gp_reputation.reputation_status === "under_observation" ? "bg-yellow-100 text-yellow-700" :
                            selectedDispute.gp_reputation.reputation_status === "suspended" ? "bg-orange-100 text-orange-700" :
                            "bg-red-100 text-red-700"
                          }>
                            {selectedDispute.gp_reputation.reputation_status === "verified" ? "Vérifié" :
                             selectedDispute.gp_reputation.reputation_status === "under_observation" ? "Sous observation" :
                             selectedDispute.gp_reputation.reputation_status === "suspended" ? "Suspendu" : "Exclu"}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total litiges</p>
                          <p className="text-xl font-bold">{selectedDispute.gp_reputation.total_disputes}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Litiges perdus</p>
                          <p className="text-xl font-bold text-red-600">{selectedDispute.gp_reputation.disputes_lost}</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="decision" className="p-6 pt-4 space-y-4">
                  {selectedDispute.status === "closed" ? (
                    <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-green-700 dark:text-green-400">Litige clôturé</h4>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Responsable</p>
                          <p className="font-medium capitalize">{selectedDispute.responsible_party || "Non déterminé"}</p>
                        </div>
                        {selectedDispute.sanction_applied && (
                          <div>
                            <p className="text-muted-foreground">Sanction appliquée</p>
                            <Badge variant="destructive">{SANCTION_LABELS[selectedDispute.sanction_applied]}</Badge>
                          </div>
                        )}
                        {selectedDispute.compensation_amount > 0 && (
                          <div>
                            <p className="text-muted-foreground">Compensation</p>
                            <p className="font-medium">{selectedDispute.compensation_amount.toLocaleString()} FCFA</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">Décision finale</p>
                          <p>{selectedDispute.final_decision}</p>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <>
                      <Card className="p-4">
                        <h4 className="font-semibold mb-4">Prendre une décision</h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Nouveau statut</label>
                              <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="under_review">En examen</SelectItem>
                                  <SelectItem value="awaiting_response">Attente réponse</SelectItem>
                                  <SelectItem value="provisional_decision">Décision provisoire</SelectItem>
                                  <SelectItem value="closed">Clôturer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Partie responsable</label>
                              <Select value={responsibleParty} onValueChange={setResponsibleParty}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="undetermined">Non déterminé</SelectItem>
                                  <SelectItem value="client">Client</SelectItem>
                                  <SelectItem value="transporter">Transporteur</SelectItem>
                                  <SelectItem value="platform">Plateforme</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {responsibleParty === "transporter" && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">Sanction</label>
                                <Select value={sanctionType} onValueChange={setSanctionType}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une sanction..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="warning">Avertissement</SelectItem>
                                    <SelectItem value="financial_compensation">Compensation financière</SelectItem>
                                    <SelectItem value="full_refund">Remboursement total</SelectItem>
                                    <SelectItem value="temporary_suspension">Suspension temporaire</SelectItem>
                                    <SelectItem value="permanent_exclusion">Exclusion définitive</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {(sanctionType === "financial_compensation" || sanctionType === "full_refund") && (
                                <div>
                                  <label className="text-sm font-medium mb-2 block">Montant compensation (FCFA)</label>
                                  <Input
                                    type="number"
                                    value={compensationAmount}
                                    onChange={(e) => setCompensationAmount(e.target.value)}
                                    placeholder="0"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <div>
                            <label className="text-sm font-medium mb-2 block">Notes de décision</label>
                            <Textarea
                              value={decisionNotes}
                              onChange={(e) => setDecisionNotes(e.target.value)}
                              placeholder="Expliquez votre décision..."
                              rows={4}
                            />
                          </div>

                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setSelectedDispute(null)}>
                              Annuler
                            </Button>
                            <Button onClick={handleUpdateDispute} disabled={processing}>
                              {processing ? "Enregistrement..." : "Enregistrer la décision"}
                            </Button>
                          </div>
                        </div>
                      </Card>

                      {selectedDispute.provisional_decision && (
                        <Card className="p-4 bg-purple-50 dark:bg-purple-900/20">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Décision provisoire
                          </h4>
                          <p className="text-sm">{selectedDispute.provisional_decision}</p>
                        </Card>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="history" className="p-6 pt-4">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Historique des actions
                    </h4>
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Aucun historique</p>
                    ) : (
                      <div className="space-y-3">
                        {history.map((entry) => (
                          <div key={entry.id} className="flex gap-3 text-sm border-b pb-3 last:border-0">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                              {entry.action === "status_change" ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <MessageSquare className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {entry.actor_type}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {format(new Date(entry.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                                </span>
                              </div>
                              {entry.old_status && entry.new_status && (
                                <p className="mt-1">
                                  Statut: <span className="line-through">{STATUS_LABELS[entry.old_status]}</span>
                                  {" → "}
                                  <span className="font-medium">{STATUS_LABELS[entry.new_status]}</span>
                                </p>
                              )}
                              {entry.notes && (
                                <p className="text-muted-foreground mt-1">{entry.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
