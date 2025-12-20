import { useState } from "react";
import { Star, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  gpId: string;
  gpName: string;
  onSuccess: () => void;
}

export function RateOrderDialog({ 
  open, 
  onOpenChange, 
  orderId, 
  gpId, 
  gpName,
  onSuccess 
}: RateOrderDialogProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une note",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("reviews")
        .insert({
          order_id: orderId,
          client_id: user.id,
          gp_id: gpId,
          rating,
          comment: comment.trim() || null,
        });

      if (error) throw error;

      toast({
        title: "Merci pour votre avis !",
        description: "Votre évaluation a été enregistrée",
      });

      onSuccess();
      onOpenChange(false);
      setRating(0);
      setComment("");
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer l'avis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Évaluer la livraison</DialogTitle>
          <DialogDescription>
            Comment s'est passée votre expérience avec {gpName} ?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="text-center">
            <Label className="text-sm text-muted-foreground mb-3 block">
              Votre note
            </Label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star 
                    className={`w-10 h-10 transition-colors ${
                      star <= displayRating 
                        ? "text-warning fill-warning" 
                        : "text-muted-foreground/30"
                    }`} 
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <p className="mt-2 text-sm font-medium text-foreground">
                {displayRating === 1 && "Décevant"}
                {displayRating === 2 && "Passable"}
                {displayRating === 3 && "Correct"}
                {displayRating === 4 && "Très bien"}
                {displayRating === 5 && "Excellent !"}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Commentaire (optionnel)</Label>
            <Textarea
              id="comment"
              placeholder="Décrivez votre expérience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={loading || rating === 0}>
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Envoyer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
