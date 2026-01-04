import { useState } from "react";
import { AlertTriangle, MessageCircle, Send, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ORDER_STATUS, assertValidOrderStatus } from "@/lib/enumMappings";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DisputeButtonProps {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
}

const ticketTypes = [
  { value: "dispute", label: "Signaler un litige", icon: AlertTriangle, color: "text-destructive" },
  { value: "support", label: "Demander de l'aide", icon: HelpCircle, color: "text-primary" },
  { value: "complaint", label: "Faire une réclamation", icon: MessageCircle, color: "text-warning" },
];

const disputeReasons = [
  { value: "non_reception", label: "Colis non reçu" },
  { value: "colis_endommage", label: "Colis endommagé" },
  { value: "colis_manquant", label: "Contenu manquant" },
  { value: "retard_livraison", label: "Retard de livraison important" },
  { value: "mauvaise_adresse", label: "Livré à la mauvaise adresse" },
  { value: "comportement_gp", label: "Comportement inapproprié du transporteur" },
  { value: "autre", label: "Autre problème" },
];

export function DisputeButton({ orderId, orderNumber, orderStatus }: DisputeButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketType, setTicketType] = useState<string>("support");
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");

  // Afficher le bouton litige uniquement pour certains statuts
  const canDispute = ["accepted", "collected", "in_transit", "delivered"].includes(orderStatus);

  if (!canDispute) return null;

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Description requise",
        description: "Veuillez décrire votre problème",
        variant: "destructive",
      });
      return;
    }

    if (ticketType === "dispute" && !reason) {
      toast({
        title: "Motif requis",
        description: "Veuillez sélectionner un motif de litige",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      const subject = ticketType === "dispute" 
        ? `Litige - ${disputeReasons.find(r => r.value === reason)?.label || reason}`
        : ticketType === "complaint"
        ? `Réclamation - Commande ${orderNumber}`
        : `Support - Commande ${orderNumber}`;

      const { error } = await supabase
        .from("support_tickets")
        .insert([{
          user_id: user.id,
          order_id: orderId,
          type: ticketType,
          priority: ticketType === "dispute" ? "high" : "medium",
          subject,
          description: description.trim(),
          ticket_number: `TKT-${Date.now()}`, // Will be overwritten by trigger
        }]);

      if (error) throw error;

      // Si c'est un litige, mettre à jour le statut de la commande
      if (ticketType === "dispute") {
        // CRITICAL: Validate enum before DB operation
        const validStatus = assertValidOrderStatus(ORDER_STATUS.disputed);
        await supabase
          .from("orders")
          .update({ status: validStatus })
          .eq("id", orderId);
      }

      toast({
        title: "Demande envoyée",
        description: ticketType === "dispute" 
          ? "Votre litige a été enregistré. Un administrateur vous contactera sous 24h."
          : "Votre demande a été envoyée. Nous vous répondrons rapidement.",
      });

      setIsOpen(false);
      setDescription("");
      setReason("");
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la demande",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedType = ticketTypes.find(t => t.value === ticketType);
  const TypeIcon = selectedType?.icon || HelpCircle;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <HelpCircle className="w-4 h-4" />
        Aide & Support
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TypeIcon className={`w-5 h-5 ${selectedType?.color}`} />
              Support - Commande {orderNumber}
            </DialogTitle>
            <DialogDescription>
              Décrivez votre problème et nous vous aiderons rapidement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Type de demande */}
            <div className="space-y-2">
              <Label>Type de demande</Label>
              <Select value={ticketType} onValueChange={setTicketType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ticketTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={`w-4 h-4 ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Motif du litige (si type = dispute) */}
            {ticketType === "dispute" && (
              <div className="space-y-2">
                <Label>Motif du litige *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un motif" />
                  </SelectTrigger>
                  <SelectContent>
                    {disputeReasons.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label>Description du problème *</Label>
              <Textarea
                placeholder="Décrivez votre problème en détail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Avertissement litige */}
            {ticketType === "dispute" && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  En créant un litige, la commande sera mise en pause jusqu'à résolution.
                  Un administrateur examinera votre demande sous 24h.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setIsOpen(false)}
              >
                Annuler
              </Button>
              <Button
                variant={ticketType === "dispute" ? "destructive" : "default"}
                className="flex-1"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Envoi..." : (
                  <>
                    <Send className="w-4 h-4" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
