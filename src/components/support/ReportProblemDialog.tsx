import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
}

const PROBLEM_TYPES = [
  { value: "delay", label: "Retard de livraison" },
  { value: "lost", label: "Colis perdu" },
  { value: "damaged", label: "Colis endommagé" },
  { value: "wrong_address", label: "Mauvaise adresse" },
  { value: "communication", label: "Problème de communication" },
  { value: "other", label: "Autre" },
];

export function ReportProblemDialog({ 
  open, 
  onOpenChange, 
  orderId, 
  orderNumber 
}: ReportProblemDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [problemType, setProblemType] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!problemType || !description.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Connexion requise",
          description: "Veuillez vous connecter pour signaler un problème",
          variant: "destructive",
        });
        return;
      }

      // Create support ticket
      const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
      
      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          order_id: orderId,
          ticket_number: ticketNumber,
          type: problemType,
          subject: `Problème: ${PROBLEM_TYPES.find(p => p.value === problemType)?.label || problemType}`,
          description: description,
          priority: "medium",
          status: "open",
        });

      if (error) throw error;

      toast({
        title: "Signalement envoyé",
        description: `Ticket ${ticketNumber} créé. Notre équipe vous contactera rapidement.`,
      });

      setProblemType("");
      setDescription("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le signalement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Signaler un problème
          </DialogTitle>
          <DialogDescription>
            Commande: {orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type de problème</Label>
            <Select value={problemType} onValueChange={setProblemType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le type de problème" />
              </SelectTrigger>
              <SelectContent>
                {PROBLEM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description du problème</Label>
            <Textarea
              placeholder="Décrivez le problème en détail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              "Envoyer le signalement"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
