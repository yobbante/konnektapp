import { CheckCircle, XCircle, Eye, MapPin, Truck, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { transportTypes } from "@/lib/transportTypes";

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  city: string;
  phone: string;
  status: string;
  created_at: string;
  user_email?: string;
}

interface AdminPendingGPsProps {
  gps: GPProfile[];
  onVerify: (gpId: string) => void;
  onReject: (gpId: string) => void;
  onViewDetails: (gpId: string) => void;
}

export function AdminPendingGPs({ gps, onVerify, onReject, onViewDetails }: AdminPendingGPsProps) {
  const pendingGPs = gps.filter((g: GPProfile) => g.status === "pending");
  
  const getTransportLabel = (type: string) => {
    return transportTypes.find(t => t.type === type)?.title || type;
  };

  if (pendingGPs.length === 0) {
    return (
      <div className="mobile-card">
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Tout est à jour</h3>
          <p className="text-sm text-muted-foreground">
            Aucun transporteur en attente de validation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Transporteurs en attente</h3>
        <span className="text-sm text-muted-foreground">{pendingGPs.length} en attente</span>
      </div>
      
      <div className="space-y-4">
        {pendingGPs.slice(0, 5).map((gp) => (
          <div 
            key={gp.id} 
            className="p-3 bg-muted/30 rounded-lg border border-border"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium">{gp.business_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>{gp.city}</span>
                  <span>•</span>
                  <Truck className="w-3 h-3" />
                  <span>{getTransportLabel(gp.gp_type)}</span>
                </div>
                {/* Email display */}
                {gp.user_email && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Mail className="w-3 h-3" />
                    <span className="truncate max-w-[180px]">{gp.user_email}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {format(new Date(gp.created_at), "d MMM", { locale: fr })}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-3">
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1"
                onClick={() => onViewDetails(gp.id)}
              >
                <Eye className="w-3 h-3 mr-1" />
                Détails
              </Button>
              <Button 
                size="sm" 
                variant="default"
                className="flex-1"
                onClick={() => onVerify(gp.id)}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Valider
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => onReject(gp.id)}
              >
                <XCircle className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {pendingGPs.length > 5 && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          +{pendingGPs.length - 5} autres en attente
        </p>
      )}
    </div>
  );
}
