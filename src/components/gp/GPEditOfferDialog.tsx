import { useState, useEffect } from "react";
import { Package, Lock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { transportTypes, TransportType } from "@/lib/transportTypes";

interface GPEditOfferDialogProps {
  open: boolean;
  onClose: () => void;
  offer: {
    id: string;
    origin_city: string;
    origin_country: string;
    destination_city: string;
    destination_country: string;
    departure_date: string;
    arrival_date?: string | null;
    price_per_kg: number;
    total_capacity: number;
    available_capacity: number;
    min_weight?: number | null;
    max_weight?: number | null;
    description?: string | null;
    conditions?: string | null;
    transport_type: string;
    bookings_count?: number | null;
  };
  onSuccess: () => void;
}

const countries = [
  { code: "SN", name: "Sénégal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "ML", name: "Mali" },
  { code: "BF", name: "Burkina Faso" },
  { code: "GN", name: "Guinée" },
  { code: "FR", name: "France" },
  { code: "US", name: "États-Unis" },
  { code: "CA", name: "Canada" },
  { code: "MA", name: "Maroc" },
];

export function GPEditOfferDialog({ open, onClose, offer, onSuccess }: GPEditOfferDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const transportType = offer.transport_type as TransportType;
  const currentTransportConfig = transportTypes.find(t => t.type === transportType);
  
  const [formData, setFormData] = useState({
    originCity: offer.origin_city,
    originCountry: offer.origin_country,
    destinationCity: offer.destination_city,
    destinationCountry: offer.destination_country,
    departureDate: offer.departure_date ? offer.departure_date.slice(0, 16) : "",
    arrivalDate: offer.arrival_date ? offer.arrival_date.slice(0, 16) : "",
    pricePerKg: offer.price_per_kg.toString(),
    totalCapacity: offer.total_capacity.toString(),
    availableCapacity: offer.available_capacity.toString(),
    minWeight: offer.min_weight?.toString() || "0.5",
    maxWeight: offer.max_weight?.toString() || "",
    description: offer.description || "",
    conditions: offer.conditions || "",
  });

  // Reset form when offer changes
  useEffect(() => {
    if (open && offer) {
      setFormData({
        originCity: offer.origin_city,
        originCountry: offer.origin_country,
        destinationCity: offer.destination_city,
        destinationCountry: offer.destination_country,
        departureDate: offer.departure_date ? offer.departure_date.slice(0, 16) : "",
        arrivalDate: offer.arrival_date ? offer.arrival_date.slice(0, 16) : "",
        pricePerKg: offer.price_per_kg.toString(),
        totalCapacity: offer.total_capacity.toString(),
        availableCapacity: offer.available_capacity.toString(),
        minWeight: offer.min_weight?.toString() || "0.5",
        maxWeight: offer.max_weight?.toString() || "",
        description: offer.description || "",
        conditions: offer.conditions || "",
      });
    }
  }, [open, offer]);

  const hasBookings = (offer.bookings_count || 0) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.originCity || !formData.destinationCity || !formData.departureDate || !formData.pricePerKg || !formData.totalCapacity) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("gp_offers")
        .update({
          origin_city: formData.originCity,
          origin_country: formData.originCountry,
          destination_city: formData.destinationCity,
          destination_country: formData.destinationCountry,
          departure_date: formData.departureDate,
          arrival_date: formData.arrivalDate || null,
          price_per_kg: parseInt(formData.pricePerKg),
          total_capacity: parseFloat(formData.totalCapacity),
          available_capacity: parseFloat(formData.availableCapacity),
          min_weight: parseFloat(formData.minWeight) || 0.5,
          max_weight: formData.maxWeight ? parseFloat(formData.maxWeight) : null,
          description: formData.description || null,
          conditions: formData.conditions || null,
        })
        .eq("id", offer.id);

      if (error) throw error;

      toast({
        title: "Offre modifiée",
        description: "Votre offre a été mise à jour",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Update offer error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier l'offre",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("gp_offers")
        .delete()
        .eq("id", offer.id);

      if (error) throw error;

      toast({
        title: "Offre supprimée",
        description: "L'offre a été supprimée définitivement",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Delete offer error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'offre",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const IconComponent = currentTransportConfig?.icon || Package;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-secondary" />
            Modifier l'offre
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transport Type - Locked */}
          <div>
            <Label className="mb-3 block">Type de transport</Label>
            <div className="p-4 rounded-xl border-2 border-secondary bg-secondary/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <IconComponent className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{currentTransportConfig?.title || transportType}</p>
                <p className="text-xs text-muted-foreground">
                  Synchronisé avec votre profil transporteur
                </p>
              </div>
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Bookings warning */}
          {hasBookings && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm text-warning-foreground">
              Cette offre a {offer.bookings_count} réservation(s). Certaines modifications peuvent affecter les commandes en cours.
            </div>
          )}

          {/* Route */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ville de départ *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Dakar"
                  value={formData.originCity}
                  onChange={(e) => setFormData({ ...formData, originCity: e.target.value })}
                  className="flex-1"
                  disabled={hasBookings}
                />
                <select
                  value={formData.originCountry}
                  onChange={(e) => setFormData({ ...formData, originCountry: e.target.value })}
                  className="w-24 h-11 px-2 rounded-lg border border-input bg-background"
                  disabled={hasBookings}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ville d'arrivée *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Abidjan"
                  value={formData.destinationCity}
                  onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                  className="flex-1"
                  disabled={hasBookings}
                />
                <select
                  value={formData.destinationCountry}
                  onChange={(e) => setFormData({ ...formData, destinationCountry: e.target.value })}
                  className="w-24 h-11 px-2 rounded-lg border border-input bg-background"
                  disabled={hasBookings}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de départ *</Label>
              <Input
                type="datetime-local"
                value={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date d'arrivée estimée</Label>
              <Input
                type="datetime-local"
                value={formData.arrivalDate}
                min={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
              />
            </div>
          </div>

          {/* Pricing & Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Prix par kg (FCFA) *</Label>
              <Input
                type="number"
                placeholder="Ex: 6500"
                value={formData.pricePerKg}
                onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Capacité totale (kg) *</Label>
              <Input
                type="number"
                placeholder="Ex: 50"
                value={formData.totalCapacity}
                onChange={(e) => setFormData({ ...formData, totalCapacity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Capacité disponible (kg)</Label>
              <Input
                type="number"
                placeholder="Ex: 30"
                value={formData.availableCapacity}
                onChange={(e) => setFormData({ ...formData, availableCapacity: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Poids min/colis (kg)</Label>
              <Input
                type="number"
                placeholder="Ex: 0.5"
                value={formData.minWeight}
                onChange={(e) => setFormData({ ...formData, minWeight: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Poids max/colis (kg)</Label>
              <Input
                type="number"
                placeholder="Ex: 30"
                value={formData.maxWeight}
                onChange={(e) => setFormData({ ...formData, maxWeight: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Décrivez votre offre, les types de colis acceptés..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" variant="gold" className="flex-1" disabled={loading}>
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
            
            {/* Delete button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  type="button" 
                  variant="destructive" 
                  className="w-full"
                  disabled={hasBookings}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {hasBookings ? "Suppression impossible (réservations actives)" : "Supprimer cette offre"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer l'offre ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. L'offre sera définitivement supprimée de la marketplace.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Suppression..." : "Supprimer"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
