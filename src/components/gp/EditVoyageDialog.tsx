import { useState, useEffect } from "react";
import { Plane, RefreshCw, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CurrencySelector, getCurrencySymbol } from "@/components/ui/currency-selector";

interface VoyageOffer {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  arrival_date: string | null;
  available_capacity: number;
  total_capacity: number;
  price_per_kg: number;
  currency: string;
  status: string;
  baggage_types_accepted: string[] | null;
  baggage_restrictions: string | null;
  flight_number: string | null;
  airline: string | null;
}

const BAGGAGE_TYPES = [
  { value: "valise", label: "Valise" },
  { value: "carton", label: "Carton" },
  { value: "sac", label: "Sac" },
  { value: "colis", label: "Colis" },
  { value: "electronique", label: "Électronique" },
  { value: "vetements", label: "Vêtements" },
  { value: "documents", label: "Documents" },
  { value: "alimentaire_sec", label: "Alimentaire sec" },
];

interface EditVoyageDialogProps {
  open: boolean;
  onClose: () => void;
  voyage: VoyageOffer | null;
  onSuccess: () => void;
}

export function EditVoyageDialog({ open, onClose, voyage, onSuccess }: EditVoyageDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    originCity: "",
    originCountry: "SN",
    destinationCity: "",
    destinationCountry: "FR",
    departureDate: "",
    arrivalDate: "",
    totalCapacity: "",
    availableCapacity: "",
    pricePerKg: "",
    currency: "EUR",
    flightNumber: "",
    airline: "",
    baggageTypesAccepted: [] as string[],
    restrictions: "",
    status: "active",
  });

  useEffect(() => {
    if (voyage) {
      setFormData({
        originCity: voyage.origin_city || "",
        originCountry: voyage.origin_country || "SN",
        destinationCity: voyage.destination_city || "",
        destinationCountry: voyage.destination_country || "FR",
        departureDate: voyage.departure_date ? voyage.departure_date.split('T')[0] : "",
        arrivalDate: voyage.arrival_date ? voyage.arrival_date.split('T')[0] : "",
        totalCapacity: voyage.total_capacity?.toString() || "",
        availableCapacity: voyage.available_capacity?.toString() || "",
        pricePerKg: voyage.price_per_kg?.toString() || "",
        currency: voyage.currency || "EUR",
        flightNumber: voyage.flight_number || "",
        airline: voyage.airline || "",
        baggageTypesAccepted: voyage.baggage_types_accepted || [],
        restrictions: voyage.baggage_restrictions || "",
        status: voyage.status || "active",
      });
    }
  }, [voyage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!voyage) return;
    if (!formData.originCity || !formData.destinationCity || !formData.departureDate || !formData.totalCapacity || !formData.pricePerKg) {
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
          total_capacity: parseFloat(formData.totalCapacity),
          available_capacity: parseFloat(formData.availableCapacity) || parseFloat(formData.totalCapacity),
          price_per_kg: parseFloat(formData.pricePerKg),
          currency: formData.currency,
          flight_number: formData.flightNumber || null,
          airline: formData.airline || null,
          baggage_types_accepted: formData.baggageTypesAccepted.length > 0 ? formData.baggageTypesAccepted : null,
          baggage_restrictions: formData.restrictions || null,
          status: formData.status as "active" | "paused" | "completed" | "expired",
        })
        .eq("id", voyage.id);

      if (error) throw error;

      toast({
        title: "Voyage modifie",
        description: "Les modifications ont été enregistrées",
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating voyage:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le voyage",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!voyage) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("gp_offers")
        .delete()
        .eq("id", voyage.id);

      if (error) throw error;

      toast({
        title: "Voyage supprimé",
        description: "Le voyage a été supprimé",
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error deleting voyage:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le voyage",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleBaggageType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      baggageTypesAccepted: prev.baggageTypesAccepted.includes(type)
        ? prev.baggageTypesAccepted.filter(t => t !== type)
        : [...prev.baggageTypesAccepted, type]
    }));
  };

  if (!voyage) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            Modifier le voyage
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Route */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ville départ *</Label>
              <Input 
                value={formData.originCity}
                onChange={(e) => setFormData({...formData, originCity: e.target.value})}
                placeholder="Ex: Dakar"
              />
            </div>
            <div>
              <Label>Ville arrivée *</Label>
              <Input 
                value={formData.destinationCity}
                onChange={(e) => setFormData({...formData, destinationCity: e.target.value})}
                placeholder="Ex: Paris"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date départ *</Label>
              <Input 
                type="date"
                value={formData.departureDate}
                onChange={(e) => setFormData({...formData, departureDate: e.target.value})}
              />
            </div>
            <div>
              <Label>Date arrivée</Label>
              <Input 
                type="date"
                value={formData.arrivalDate}
                onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
              />
            </div>
          </div>

          {/* Flight Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Compagnie</Label>
              <Input 
                value={formData.airline}
                onChange={(e) => setFormData({...formData, airline: e.target.value})}
                placeholder="Ex: Air France"
              />
            </div>
            <div>
              <Label>N° de vol</Label>
              <Input 
                value={formData.flightNumber}
                onChange={(e) => setFormData({...formData, flightNumber: e.target.value})}
                placeholder="Ex: AF718"
              />
            </div>
          </div>

          {/* Capacity & Price */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Capacité (kg) *</Label>
                <Input 
                  type="number"
                  value={formData.totalCapacity}
                  onChange={(e) => setFormData({...formData, totalCapacity: e.target.value})}
                  placeholder="30"
                />
              </div>
              <div>
                <Label>Disponible (kg)</Label>
                <Input 
                  type="number"
                  value={formData.availableCapacity}
                  onChange={(e) => setFormData({...formData, availableCapacity: e.target.value})}
                  placeholder="30"
                />
              </div>
            </div>
            
            {/* Price with Currency */}
            <div>
              <Label>Prix par kg *</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <CurrencySelector
                  value={formData.currency}
                  onValueChange={(value) => setFormData({...formData, currency: value})}
                />
                <Input 
                  type="number"
                  step="0.5"
                  value={formData.pricePerKg}
                  onChange={(e) => setFormData({...formData, pricePerKg: e.target.value})}
                  placeholder="8"
                />
                <div className="flex items-center text-sm text-muted-foreground">
                  {getCurrencySymbol(formData.currency)}/kg
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-4">
            <Label>Statut:</Label>
            <div className="flex gap-2">
              <Badge 
                variant={formData.status === "active" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFormData({...formData, status: "active"})}
              >
                Actif
              </Badge>
              <Badge 
                variant={formData.status === "paused" ? "secondary" : "outline"}
                className="cursor-pointer"
                onClick={() => setFormData({...formData, status: "paused"})}
              >
                Pause
              </Badge>
            </div>
          </div>

          {/* Baggage Types */}
          <div>
            <Label className="mb-2 block">Types de bagages acceptés</Label>
            <div className="flex flex-wrap gap-2">
              {BAGGAGE_TYPES.map((type) => (
                <Badge 
                  key={type.value}
                  variant={formData.baggageTypesAccepted.includes(type.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleBaggageType(type.value)}
                >
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Restrictions */}
          <div>
            <Label>Restrictions / Conditions</Label>
            <Textarea 
              value={formData.restrictions}
              onChange={(e) => setFormData({...formData, restrictions: e.target.value})}
              placeholder="Ex: Pas de liquides, pas de produits alimentaires périssables..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="icon">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce voyage ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Toutes les réservations associées seront également affectées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
