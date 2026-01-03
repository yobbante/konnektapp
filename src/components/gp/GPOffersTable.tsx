import { useState } from "react";
import { MapPin, Calendar, Eye, Edit, Trash2, MoreHorizontal, Pause, Play, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GP_TYPE_LABELS,
  OFFER_STATUS_LABELS,
  isValidOfferStatus,
  type OfferStatus,
} from "@/lib/enumMappings";

interface Offer {
  id: string;
  origin_city: string;
  destination_city: string;
  destination_country: string;
  price_per_kg: number;
  currency: string;
  departure_date: string;
  total_capacity: number;
  available_capacity: number;
  status: string;
  transport_type: string;
  views_count: number;
  bookings_count: number;
  gp_id?: string;
}

interface GPOffersTableProps {
  offers: Offer[];
  compact?: boolean;
  onRefresh?: () => void;
  gpStatus?: string;
}

const statusVariants: Record<OfferStatus, "success" | "pending" | "secondary" | "destructive"> = {
  active: "success",
  paused: "pending",
  expired: "secondary",
  completed: "secondary",
};

export function GPOffersTable({ offers, compact, onRefresh, gpStatus }: GPOffersTableProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const isNotVerified = gpStatus && gpStatus !== "verified";

  const handleStatusChange = async (offerId: string, newStatus: OfferStatus) => {
    // Validate enum before sending to database
    if (!isValidOfferStatus(newStatus)) {
      toast({
        title: "Erreur",
        description: `Statut d'offre invalide: ${newStatus}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(offerId);
    try {
      const { error } = await supabase
        .from("gp_offers")
        .update({ status: newStatus })
        .eq("id", offerId);

      if (error) throw error;

      toast({
        title: "Statut mis à jour",
        description: `L'offre est maintenant ${OFFER_STATUS_LABELS[newStatus].toLowerCase()}`,
      });

      onRefresh?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette offre ?")) return;
    
    setLoading(offerId);
    try {
      const { error } = await supabase
        .from("gp_offers")
        .delete()
        .eq("id", offerId);

      if (error) throw error;

      toast({
        title: "Offre supprimée",
      });

      onRefresh?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  if (offers.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>Aucune offre trouvée</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Trajet</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date départ</TableHead>
            <TableHead>Prix/kg</TableHead>
            {!compact && <TableHead>Capacité</TableHead>}
            <TableHead>Statut</TableHead>
            {!compact && <TableHead>Stats</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => (
            <TableRow key={offer.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="font-medium">{offer.origin_city}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{offer.destination_city}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={offer.transport_type as any}>
                  {GP_TYPE_LABELS[offer.transport_type as keyof typeof GP_TYPE_LABELS] || offer.transport_type}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {new Date(offer.departure_date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-semibold">{offer.price_per_kg.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground ml-1">{offer.currency}</span>
              </TableCell>
              {!compact && (
                <TableCell>
                  <span className="font-medium">{offer.available_capacity}</span>
                  <span className="text-muted-foreground">/{offer.total_capacity} kg</span>
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-2">
                  {(() => {
                    const validStatus = isValidOfferStatus(offer.status) ? offer.status : "active";
                    return (
                      <Badge variant={statusVariants[validStatus]}>
                        {OFFER_STATUS_LABELS[validStatus]}
                      </Badge>
                    );
                  })()}
                  {isNotVerified && (
                    <span className="flex items-center gap-1 text-xs text-warning">
                      <EyeOff className="w-3 h-3" />
                      Non visible
                    </span>
                  )}
                </div>
              </TableCell>
              {!compact && (
                <TableCell>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {offer.views_count}
                    </span>
                    <span>{offer.bookings_count} résa</span>
                  </div>
                </TableCell>
              )}
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" disabled={loading === offer.id}>
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="w-4 h-4 mr-2" />
                      Voir détails
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {offer.status === "active" ? (
                      <DropdownMenuItem onClick={() => handleStatusChange(offer.id, "paused")}>
                        <Pause className="w-4 h-4 mr-2" />
                        Mettre en pause
                      </DropdownMenuItem>
                    ) : offer.status === "paused" ? (
                      <DropdownMenuItem onClick={() => handleStatusChange(offer.id, "active")}>
                        <Play className="w-4 h-4 mr-2" />
                        Réactiver
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDelete(offer.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
