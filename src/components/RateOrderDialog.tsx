import { useState } from "react";
import { Star, Send, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

const CRITERIA = [
  { key: "criteria_punctuality", label: "Ponctualité", desc: "Respect des délais annoncés" },
  { key: "criteria_communication", label: "Communication", desc: "Réactivité et clarté des échanges" },
  { key: "criteria_packaging", label: "Emballage / Soin", desc: "Colis bien protégé et manipulé" },
  { key: "criteria_condition", label: "État du colis", desc: "Arrivé en bon état, sans dommage" },
  { key: "criteria_professionalism", label: "Professionnalisme", desc: "Comportement global du transporteur" },
] as const;

type CriteriaKey = typeof CRITERIA[number]["key"];

export function RateOrderDialog({ 
  open, onOpenChange, orderId, gpId, gpName, onSuccess 
}: RateOrderDialogProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [criteria, setCriteria] = useState<Record<CriteriaKey, boolean>>({
    criteria_punctuality: false,
    criteria_communication: false,
    criteria_packaging: false,
    criteria_condition: false,
    criteria_professionalism: false,
  });

  const toggleCriteria = (key: CriteriaKey) => {
    setCriteria(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const checkedCount = Object.values(criteria).filter(Boolean).length;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une note", variant: "destructive" });
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
          ...criteria,
        } as any);

      if (error) throw error;

      toast({ title: "Merci pour votre avis !", description: "Votre évaluation améliore le score du transporteur" });
      onSuccess();
      onOpenChange(false);
      setRating(0);
      setComment("");
      setCriteria({
        criteria_punctuality: false, criteria_communication: false,
        criteria_packaging: false, criteria_condition: false, criteria_professionalism: false,
      });
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({ title: "Erreur", description: error.message || "Impossible d'enregistrer l'avis", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Évaluer {gpName}</DialogTitle>
          <DialogDescription>
            Votre avis est essentiel pour le score de confiance du transporteur
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Star Rating */}
          <div className="text-center">
            <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wide">
              Note globale
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
              <p className="mt-1.5 text-sm font-semibold text-foreground">
                {displayRating === 1 && "Décevant"}
                {displayRating === 2 && "Passable"}
                {displayRating === 3 && "Correct"}
                {displayRating === 4 && "Très bien"}
                {displayRating === 5 && "Excellent !"}
              </p>
            )}
          </div>

          {/* Structured Criteria Checkboxes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Critères détaillés
              </Label>
              <span className="text-[10px] text-muted-foreground">{checkedCount}/5</span>
            </div>
            <div className="space-y-1.5">
              {CRITERIA.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleCriteria(c.key)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                    criteria[c.key]
                      ? "bg-primary/10 border-primary/30"
                      : "bg-card border-border hover:border-primary/20"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    criteria[c.key]
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/30"
                  }`}>
                    {criteria[c.key] && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.label}</p>
                    <p className="text-[11px] text-muted-foreground">{c.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-xs text-muted-foreground uppercase tracking-wide">
              Commentaire (optionnel)
            </Label>
            <Textarea
              id="comment"
              placeholder="Décrivez votre expérience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Plus tard
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
