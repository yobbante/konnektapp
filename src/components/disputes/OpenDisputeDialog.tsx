import { useState } from "react";
import { AlertTriangle, Upload, X, FileText, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface OpenDisputeDialogProps {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  children?: React.ReactNode;
}

const DISPUTE_CATEGORIES = [
  { value: "delay_unjustified", label: "Retard non justifié", description: "Le colis a été livré avec un retard significatif sans explication valable" },
  { value: "partial_loss", label: "Perte partielle", description: "Une partie de l'envoi est manquante" },
  { value: "total_loss", label: "Perte totale", description: "L'intégralité de l'envoi a été perdue" },
  { value: "deterioration", label: "Détérioration", description: "Le colis a été endommagé pendant le transport" },
  { value: "non_conformity", label: "Non-conformité", description: "Le poids, contenu ou destination ne correspondent pas à ce qui était prévu" },
  { value: "transporter_silence", label: "Silence du transporteur", description: "Le transporteur ne répond plus aux messages" },
];

export function OpenDisputeDialog({ orderId, orderNumber, orderStatus, children }: OpenDisputeDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Only allow disputes for certain statuses
  const canDispute = ["accepted", "collected", "in_transit", "delivered"].includes(orderStatus);

  if (!canDispute) return null;

  const selectedCategory = DISPUTE_CATEGORIES.find((c) => c.value === category);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${orderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        uploadedUrls.push(fileName);
      }

      setAttachments([...attachments, ...uploadedUrls]);
      toast({ title: "Fichier(s) ajouté(s)" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Erreur lors de l'upload", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!category || !description.trim()) {
      toast({ title: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }

    if (description.trim().length < 50) {
      toast({ title: "La description doit faire au moins 50 caractères", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("disputes").insert([{
        order_id: orderId,
        initiated_by: user.id,
        initiated_by_type: "client",
        category: category as any,
        description: description.trim(),
        attachments,
        deadline_response: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      }]);

      if (error) throw error;

      // Update order status to disputed
      await supabase
        .from("orders")
        .update({ status: "disputed" })
        .eq("id", orderId);

      toast({
        title: "Litige ouvert avec succès",
        description: "Notre équipe va examiner votre demande sous 72h.",
      });

      setIsOpen(false);
      setCategory("");
      setDescription("");
      setAttachments([]);
    } catch (error) {
      console.error("Error creating dispute:", error);
      toast({ title: "Erreur lors de la création du litige", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="destructive" size="sm" className="gap-2">
            <Scale className="w-4 h-4" />
            Ouvrir un litige
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Ouvrir un litige
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order reference */}
          <Card className="p-3 bg-muted/50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Commande:</span>
              <span className="font-mono font-medium">{orderNumber}</span>
            </div>
          </Card>

          {/* Warning */}
          <Card className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Important:</strong> Avant d'ouvrir un litige, nous vous recommandons de contacter
              d'abord le transporteur via la messagerie. Un litige doit être utilisé en dernier recours.
            </p>
          </Card>

          {/* Category selection */}
          <div className="space-y-2">
            <Label>Catégorie du litige *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory && (
              <p className="text-xs text-muted-foreground">{selectedCategory.description}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description détaillée * (min. 50 caractères)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème en détail: quand s'est-il produit, qu'avez-vous constaté, quelles sont vos attentes..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/50 caractères minimum
            </p>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Pièces jointes (optionnel)</Label>
            <p className="text-xs text-muted-foreground">
              Photos, factures, preuves... (max 5 fichiers)
            </p>
            
            {attachments.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {attachments.map((url, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    Fichier {index + 1}
                    <button onClick={() => removeAttachment(index)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {attachments.length < 5 && (
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <Button variant="outline" className="w-full gap-2" disabled={uploading}>
                  <Upload className="w-4 h-4" />
                  {uploading ? "Upload en cours..." : "Ajouter des fichiers"}
                </Button>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSubmit}
              disabled={loading || !category || description.length < 50}
            >
              {loading ? "Envoi en cours..." : "Ouvrir le litige"}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Notre équipe vous répondra sous 24-72h ouvrées.
            Toutes les décisions sont définitives et appliquées équitablement.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
