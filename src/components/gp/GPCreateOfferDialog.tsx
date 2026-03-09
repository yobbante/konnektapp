import { useState, useEffect } from "react";
import { Package, Lock } from "lucide-react";
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
import { transportTypes, TransportType } from "@/lib/transportTypes";
import { SearchableCitySelect } from "@/components/gp/SearchableCitySelect";

interface GPCreateOfferDialogProps {
  open: boolean;
  onClose: () => void;
  gpProfile: {
    id: string;
    gp_type: string;
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

export function GPCreateOfferDialog({ open, onClose, gpProfile, onSuccess }: GPCreateOfferDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Le type de transport est forcé par le profil GP
  const transportType = gpProfile.gp_type as TransportType;
  const currentTransportConfig = transportTypes.find(t => t.type === transportType);
  
  const [formData, setFormData] = useState({
    originCity: "",
    originCountry: "SN",
    destinationCity: "",
    destinationCountry: "CI",
    departureDate: "",
    arrivalDate: "",
    expiresAt: "",
    pricePerKg: "",
    totalCapacity: "",
    minWeight: "0.5",
    maxWeight: "",
    description: "",
    conditions: "",
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        originCity: "",
        originCountry: "SN",
        destinationCity: "",
        destinationCountry: "CI",
        departureDate: "",
        arrivalDate: "",
        expiresAt: "",
        pricePerKg: "",
        totalCapacity: "",
        minWeight: "0.5",
        maxWeight: "",
        description: "",
        conditions: "",
      });
    }
  }, [open]);

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

    // Validate departure date is in the future
    const departureDate = new Date(formData.departureDate);
    if (departureDate <= new Date()) {
      toast({
        title: "Erreur",
        description: "La date de départ doit être dans le futur",
        variant: "destructive",
      });
      return;
    }

    // Expiration: defaults to departure date (offer hidden after this date)
    const effectiveExpiresAt = formData.expiresAt || formData.departureDate;
    const expiresDate = new Date(effectiveExpiresAt);

    if (expiresDate <= new Date()) {
      toast({
        title: "Erreur",
        description: "La date de fin doit être dans le futur",
        variant: "destructive",
      });
      return;
    }

    if (expiresDate > departureDate) {
      toast({
        title: "Erreur",
        description: "La date de fin doit être avant la date de départ",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("gp_offers")
        .insert([{
          gp_id: gpProfile.id,
          transport_type: transportType, // Type forcé par le profil
          origin_city: formData.originCity,
          origin_country: formData.originCountry,
          destination_city: formData.destinationCity,
          destination_country: formData.destinationCountry,
          departure_date: formData.departureDate,
          arrival_date: formData.arrivalDate || null,
          expires_at: effectiveExpiresAt,
          price_per_kg: parseInt(formData.pricePerKg),
          total_capacity: parseFloat(formData.totalCapacity),
          available_capacity: parseFloat(formData.totalCapacity),
          min_weight: parseFloat(formData.minWeight) || 0.5,
          max_weight: formData.maxWeight ? parseFloat(formData.maxWeight) : null,
          description: formData.description || null,
          conditions: formData.conditions || null,
          status: 'active',
        });

      if (error) throw error;

      toast({
        title: "Offre créée",
        description: "Votre offre est maintenant visible sur la marketplace",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Create offer error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'offre",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const IconComponent = currentTransportConfig?.icon || Package;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-secondary" />
            Créer une nouvelle offre
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transport Type - Locked to GP profile type */}
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

          {/* Route */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Départ *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableCitySelect
                    value={formData.originCity}
                    countryCode={formData.originCountry}
                    onSelect={(city, countryCode) =>
                      setFormData((p) => ({
                        ...p,
                        originCity: city,
                        originCountry: countryCode === "XX" ? p.originCountry : countryCode,
                      }))
                    }
                    placeholder="Ville de départ"
                  />
                </div>
                <select
                  value={formData.originCountry}
                  onChange={(e) => setFormData((p) => ({ ...p, originCountry: e.target.value }))}
                  className="w-24 h-11 px-2 rounded-lg border border-input bg-background"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Arrivée *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableCitySelect
                    value={formData.destinationCity}
                    countryCode={formData.destinationCountry}
                    onSelect={(city, countryCode) =>
                      setFormData((p) => ({
                        ...p,
                        destinationCity: city,
                        destinationCountry: countryCode === "XX" ? p.destinationCountry : countryCode,
                      }))
                    }
                    placeholder="Ville d'arrivée"
                  />
                </div>
                <select
                  value={formData.destinationCountry}
                  onChange={(e) => setFormData((p) => ({ ...p, destinationCountry: e.target.value }))}
                  className="w-24 h-11 px-2 rounded-lg border border-input bg-background"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date de départ *</Label>
              <Input
                type="datetime-local"
                value={formData.departureDate}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => {
                  const next = e.target.value;
                  setFormData((p) => ({
                    ...p,
                    departureDate: next,
                    // default expiration to departure date
                    expiresAt: p.expiresAt || next,
                  }));
                }}
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
            <div className="space-y-2">
              <Label>Date de fin (annonce) *</Label>
              <Input
                type="datetime-local"
                value={formData.expiresAt}
                min={new Date().toISOString().slice(0, 16)}
                max={formData.departureDate || undefined}
                onChange={(e) => setFormData((p) => ({ ...p, expiresAt: e.target.value }))}
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
          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" variant="gold" className="flex-1" disabled={loading}>
              {loading ? "Création..." : "Créer l'offre"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
