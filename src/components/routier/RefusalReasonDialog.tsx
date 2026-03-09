import { useState } from "react";
import { X, AlertTriangle, DollarSign, Route, Truck, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * RefusalReasonDialog - Motifs de refus structurés V1.1
 * 
 * Les données de refus nourrissent le moteur d'ajustement interne
 * pour améliorer le pricing futur sans négociation visible.
 */

export type RefusalReason = 
  | "price_insufficient" 
  | "route_not_profitable" 
  | "difficult_road" 
  | "vehicle_not_adapted" 
  | "not_available" 
  | "other";

interface RefusalReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: RefusalReason, notes?: string) => void;
  orderId: string;
}

const refusalReasons: { id: RefusalReason; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "price_insufficient", label: "Prix insuffisant", icon: DollarSign },
  { id: "route_not_profitable", label: "Trajet non rentable", icon: Route },
  { id: "difficult_road", label: "Route difficile", icon: AlertTriangle },
  { id: "vehicle_not_adapted", label: "Véhicule non adapté", icon: Truck },
  { id: "not_available", label: "Pas disponible sur ce créneau", icon: Clock },
  { id: "other", label: "Autre raison", icon: X },
];

export function RefusalReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  orderId,
}: RefusalReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState<RefusalReason | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedReason) return;
    
    setLoading(true);
    try {
      await onConfirm(selectedReason, notes || undefined);
      // Reset state
      setSelectedReason(null);
      setNotes("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Refuser cette demande
          </DialogTitle>
          <DialogDescription>
            Indiquez la raison pour aider à améliorer les futures propositions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason selection */}
          <div className="grid grid-cols-1 gap-2">
            {refusalReasons.map((reason) => {
              const Icon = reason.icon;
              const isSelected = selectedReason === reason.id;
              
              return (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                    ${isSelected 
                      ? 'border-destructive bg-destructive/5' 
                      : 'border-border hover:border-destructive/50'
                    }
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${isSelected ? 'bg-destructive/10' : 'bg-muted'}
                  `}>
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-destructive' : 'text-muted-foreground'}`} />
                  </div>
                  <span className={`font-medium ${isSelected ? 'text-destructive' : ''}`}>
                    {reason.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Optional notes */}
          {selectedReason && (
            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">
                Précisions (optionnel)
              </label>
              <Textarea
                placeholder="Ex: Retour à vide, péages trop élevés..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={!selectedReason || loading}
            onClick={handleConfirm}
          >
            {loading ? "Envoi..." : "Confirmer le refus"}
          </Button>
        </div>

        {/* Info text */}
        <p className="text-xs text-muted-foreground text-center">
          Ces donnees sont anonymisees et servent a ameliorer le calcul des prix.
        </p>
      </DialogContent>
    </Dialog>
  );
}
