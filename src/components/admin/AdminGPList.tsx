import { useState } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle, XCircle, MoreHorizontal, Eye, Star, 
  Phone, MapPin, Calendar, Truck, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { transportTypes } from "@/lib/transportTypes";

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  city: string;
  phone: string;
  whatsapp?: string;
  status: string;
  created_at: string;
  verified_at?: string;
  total_deliveries: number;
  rating: number;
  total_reviews: number;
  zones_covered?: string[];
  international_destinations?: string[];
  description?: string;
}

interface AdminGPListProps {
  gps: GPProfile[];
  onUpdateStatus: (gpId: string, status: "verified" | "suspended" | "rejected", reason?: string) => void;
  onViewDetails: (gpId: string) => void;
  filter: "all" | "pending" | "verified" | "suspended";
}

export function AdminGPList({ gps, onUpdateStatus, onViewDetails, filter }: AdminGPListProps) {
  const [selectedGP, setSelectedGP] = useState<GPProfile | null>(null);
  const [actionType, setActionType] = useState<"suspend" | "reject" | null>(null);
  const [reason, setReason] = useState("");

  const filteredGPs = filter === "all" 
    ? gps 
    : gps.filter(gp => gp.status === filter);

  const handleAction = () => {
    if (selectedGP && actionType) {
      onUpdateStatus(selectedGP.id, actionType === "suspend" ? "suspended" : "rejected", reason);
      setSelectedGP(null);
      setActionType(null);
      setReason("");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="success">Vérifié</Badge>;
      case "pending":
        return <Badge variant="default">En attente</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspendu</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTransportLabel = (type: string) => {
    return transportTypes.find(t => t.type === type)?.title || type;
  };

  return (
    <>
      <div className="space-y-3">
        {filteredGPs.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Aucun transporteur trouvé
          </p>
        )}

        {filteredGPs.map((gp, index) => (
          <motion.div
            key={gp.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="mobile-card"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold">{gp.business_name}</p>
                  {getStatusBadge(gp.status)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{gp.city}</span>
                  <span>•</span>
                  <Truck className="w-3 h-3" />
                  <span>{getTransportLabel(gp.gp_type)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-lg font-bold">{gp.total_deliveries}</p>
                <p className="text-xs text-muted-foreground">Livraisons</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 text-warning fill-warning" />
                  <p className="text-lg font-bold">{gp.rating?.toFixed(1) || "0"}</p>
                </div>
                <p className="text-xs text-muted-foreground">{gp.total_reviews || 0} avis</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(gp.created_at), "d MMM yy", { locale: fr })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm mb-3">
              <Phone className="w-3 h-3 text-muted-foreground" />
              <span>{gp.phone}</span>
              {gp.whatsapp && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-success">WhatsApp</span>
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onViewDetails(gp.id)}
              >
                <Eye className="w-4 h-4 mr-1" />
                Voir profil
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {gp.status !== "verified" && (
                    <DropdownMenuItem onClick={() => onUpdateStatus(gp.id, "verified")}>
                      <CheckCircle className="w-4 h-4 mr-2 text-success" /> 
                      Valider
                    </DropdownMenuItem>
                  )}
                  {gp.status !== "suspended" && (
                    <DropdownMenuItem 
                      onClick={() => {
                        setSelectedGP(gp);
                        setActionType("suspend");
                      }}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2 text-warning" /> 
                      Suspendre
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => {
                      setSelectedGP(gp);
                      setActionType("reject");
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> 
                    Rejeter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "suspend" ? "Suspendre" : "Rejeter"} {selectedGP?.business_name}
            </DialogTitle>
            <DialogDescription>
              {actionType === "suspend" 
                ? "Le transporteur ne pourra plus recevoir de nouvelles commandes."
                : "Le transporteur sera définitivement rejeté de la plateforme."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Raison (optionnel)</label>
              <Textarea 
                placeholder="Expliquez la raison de cette action..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionType(null); setReason(""); }}>
              Annuler
            </Button>
            <Button 
              variant={actionType === "reject" ? "destructive" : "default"}
              onClick={handleAction}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
