import { MapPin, ArrowRight, Info, Eye, FileText, Home as HomeIcon, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-amber-500/20 text-amber-600" },
  accepted: { label: "Accepté", color: "bg-green-500/20 text-green-600" },
  open: { label: "Ouverte", color: "bg-amber-500/20 text-amber-600" },
  responded: { label: "Réponses reçues", color: "bg-purple-500/20 text-purple-600" },
  reviewing: { label: "En étude", color: "bg-blue-500/20 text-blue-600" },
  quoted: { label: "Devis reçu", color: "bg-purple-500/20 text-purple-600" },
  negotiating: { label: "Négociation", color: "bg-orange-500/20 text-orange-600" },
  scheduled: { label: "Planifié", color: "bg-indigo-500/20 text-indigo-600" },
  in_progress: { label: "En cours", color: "bg-blue-500/20 text-blue-600" },
};

interface RequestDetailsPopupProps {
  open: boolean;
  onClose: () => void;
  type: 'custom' | 'moving';
  item: any;
  navigate: (path: string) => void;
}

export function RequestDetailsPopup({ open, onClose, type, item, navigate }: RequestDetailsPopupProps) {
  if (!item) return null;
  const isMoving = type === 'moving';
  const statusConfig = STATUS_CONFIG[item.status] || { label: item.status, color: "bg-muted text-muted-foreground" };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isMoving ? (
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <HomeIcon className="w-4 h-4 text-amber-600" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-purple-600" />
              </div>
            )}
            {isMoving ? "Demande de déménagement" : "Demande personnalisée"}
          </DialogTitle>
          <DialogDescription>
            {item.request_number || `#${item.id?.slice(0, 8)}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-500" />
              <span className="font-medium">{item.origin_city}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.destination_city}</span>
              <MapPin className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Statut</span>
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </div>
          {isMoving ? (
            <>
              {item.volume_estimate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Volume estimé</span>
                  <span className="font-medium">{item.volume_estimate}</span>
                </div>
              )}
              <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium">Service géré par Konnekt</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Notre équipe vous contactera pour un devis personnalisé.</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {item.weight_estimate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Poids estimé</span>
                  <span className="font-medium">{item.weight_estimate} kg</span>
                </div>
              )}
              {item.shipment_type && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{item.shipment_type}</span>
                </div>
              )}
              <div className="p-3 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-purple-600 mt-0.5" />
                  <div className="text-sm text-purple-800 dark:text-purple-200">
                    <p className="font-medium">En attente d'offres</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Les transporteurs peuvent proposer leurs offres.</p>
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Créée le</span>
            <span>
              {item.created_at && new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Fermer</Button>
          <Button className="flex-1" onClick={() => { onClose(); navigate("/historique"); }}>
            <Eye className="w-4 h-4 mr-2" />
            Voir l'historique
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
