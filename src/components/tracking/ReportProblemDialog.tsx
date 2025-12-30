import { useState } from "react";
import { AlertTriangle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportProblemDialogProps {
  orderId: string;
  orderNumber: string;
  children?: React.ReactNode;
}

const ISSUE_TYPES = [
  { value: "delay", label: "Retard de livraison" },
  { value: "damage", label: "Colis endommagé" },
  { value: "lost", label: "Colis perdu" },
  { value: "wrong_delivery", label: "Mauvaise adresse de livraison" },
  { value: "communication", label: "Problème de communication" },
  { value: "other", label: "Autre problème" },
];

export function ReportProblemDialog({ orderId, orderNumber, children }: ReportProblemDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!issueType || !description.trim()) {
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
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("tracking_issues").insert({
        order_id: orderId,
        user_id: user.id,
        issue_type: issueType,
        description: description.trim(),
      });

      if (error) throw error;

      toast({
        title: "Signalement envoyé",
        description: "Notre équipe va traiter votre demande rapidement",
      });

      setOpen(false);
      setIssueType("");
      setDescription("");
    } catch (error: any) {
      console.error("Error reporting issue:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le signalement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Signaler un problème
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Signaler un problème
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Commande</p>
            <p className="font-medium">{orderNumber}</p>
          </div>

          <div className="space-y-2">
            <Label>Type de problème</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le type de problème" />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((type) => (
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
              placeholder="Décrivez votre problème en détail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
