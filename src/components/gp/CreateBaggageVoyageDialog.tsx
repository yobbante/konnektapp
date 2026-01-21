import { useState, useEffect } from "react";
import { Plane, ArrowRight, Calendar, Weight, DollarSign, Luggage, ToggleLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableCountrySelect, CITIES_BY_COUNTRY, ALL_COUNTRIES } from "@/components/gp/SearchableCountrySelect";
import { CurrencySelector, getCurrencySymbol } from "@/components/ui/currency-selector";

interface CreateBaggageVoyageDialogProps {
  open: boolean;
  onClose: () => void;
  gpId: string;
  lastVoyage?: {
    origin_city: string;
    origin_country: string;
    destination_city: string;
    destination_country: string;
    price_per_kg: number;
    currency?: string;
  } | null;
  onSuccess: () => void;
}

export function CreateBaggageVoyageDialog({ 
  open, 
  onClose, 
  gpId,
  lastVoyage,
  onSuccess 
}: CreateBaggageVoyageDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isReturnTrip, setIsReturnTrip] = useState(false);
  
  const [formData, setFormData] = useState({
    originCountry: "SN",
    originCity: "",
    destinationCountry: "FR",
    destinationCity: "",
    departureDate: "",
    arrivalDate: "",
    pricePerKg: "",
    currency: "EUR",
    totalCapacity: "23",
    flightNumber: "",
    airline: "",
  });

  // Smart pre-fill from last voyage
  useEffect(() => {
    if (open && lastVoyage) {
      // Inverse the route for return trip
      setFormData({
        originCountry: lastVoyage.destination_country,
        originCity: lastVoyage.destination_city,
        destinationCountry: lastVoyage.origin_country,
        destinationCity: lastVoyage.origin_city,
        departureDate: "",
        arrivalDate: "",
        pricePerKg: String(lastVoyage.price_per_kg),
        currency: lastVoyage.currency || "EUR",
        totalCapacity: "23",
        flightNumber: "",
        airline: "",
      });
      setIsReturnTrip(true);
    } else if (open) {
      // Reset to defaults
      setFormData({
        originCountry: "SN",
        originCity: "",
        destinationCountry: "FR",
        destinationCity: "",
        departureDate: "",
        arrivalDate: "",
        pricePerKg: "8",
        currency: "EUR",
        totalCapacity: "23",
        flightNumber: "",
        airline: "",
      });
      setIsReturnTrip(false);
    }
  }, [open, lastVoyage]);

  // Toggle trip type (aller/retour)
  const handleToggleTripType = () => {
    setFormData(prev => ({
      ...prev,
      originCountry: prev.destinationCountry,
      originCity: prev.destinationCity,
      destinationCountry: prev.originCountry,
      destinationCity: prev.originCity,
    }));
    setIsReturnTrip(!isReturnTrip);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.originCity || !formData.destinationCity || !formData.departureDate || !formData.pricePerKg) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const departureDate = new Date(formData.departureDate);
    if (departureDate <= new Date()) {
      toast({
        title: "Date invalide",
        description: "La date de départ doit être dans le futur",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("gp_offers")
        .insert({
          gp_id: gpId,
          transport_type: "bagages_international",
          origin_city: formData.originCity,
          origin_country: formData.originCountry,
          destination_city: formData.destinationCity,
          destination_country: formData.destinationCountry,
          departure_date: formData.departureDate,
          arrival_date: formData.arrivalDate || null,
          price_per_kg: parseInt(formData.pricePerKg),
          currency: formData.currency,
          total_capacity: parseFloat(formData.totalCapacity),
          available_capacity: parseFloat(formData.totalCapacity),
          flight_number: formData.flightNumber || null,
          airline: formData.airline || null,
          status: 'active',
        });

      if (error) throw error;

      toast({
        title: "✈️ Voyage créé !",
        description: `${formData.originCity} → ${formData.destinationCity}`,
      });

      onSuccess();
    } catch (error: any) {
      console.error("Create voyage error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le voyage",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const originCities = CITIES_BY_COUNTRY[formData.originCountry] || [];
  const destinationCities = CITIES_BY_COUNTRY[formData.destinationCountry] || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" />
            Nouveau voyage international
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Trip Type Toggle */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant={isReturnTrip ? "secondary" : "outline"}
              className="rounded-full px-6"
              onClick={handleToggleTripType}
            >
              <ToggleLeft className="w-4 h-4 mr-2" />
              {isReturnTrip ? "Retour" : "Aller"} - Inverser trajet
            </Button>
          </div>

          {/* Route Card */}
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-4 space-y-4">
              {/* Origin */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Départ
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <SearchableCountrySelect
                    value={formData.originCountry}
                    onValueChange={(value) => setFormData({ ...formData, originCountry: value, originCity: "" })}
                    placeholder="Pays"
                  />
                  <select
                    value={formData.originCity}
                    onChange={(e) => setFormData({ ...formData, originCity: e.target.value })}
                    className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Ville *</option>
                    {originCities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
              </div>

              {/* Destination */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Arrivée
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <SearchableCountrySelect
                    value={formData.destinationCountry}
                    onValueChange={(value) => setFormData({ ...formData, destinationCountry: value, destinationCity: "" })}
                    placeholder="Pays"
                  />
                  <select
                    value={formData.destinationCity}
                    onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                    className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Ville *</option>
                    {destinationCities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flight Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm">
                <Calendar className="w-3 h-3" />
                Date départ *
              </Label>
              <Input
                type="datetime-local"
                value={formData.departureDate}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm">
                <Calendar className="w-3 h-3" />
                Date arrivée
              </Label>
              <Input
                type="datetime-local"
                value={formData.arrivalDate}
                min={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
              />
            </div>
          </div>

          {/* Airline Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Compagnie aérienne</Label>
              <Input
                placeholder="Air Sénégal, Air France..."
                value={formData.airline}
                onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">N° Vol</Label>
              <Input
                placeholder="AF123"
                value={formData.flightNumber}
                onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
              />
            </div>
          </div>

          {/* Pricing with Currency */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1 text-sm">
              <DollarSign className="w-3 h-3" />
              Tarification *
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <CurrencySelector
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              />
              <Input
                type="number"
                placeholder="8"
                value={formData.pricePerKg}
                onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
              />
              <div className="flex items-center text-sm text-muted-foreground">
                {getCurrencySymbol(formData.currency)}/kg
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-sm">
              <Weight className="w-3 h-3" />
              Capacité (kg) *
            </Label>
            <Input
              type="number"
              placeholder="23"
              value={formData.totalCapacity}
              onChange={(e) => setFormData({ ...formData, totalCapacity: e.target.value })}
            />
          </div>

          {/* Summary */}
          {formData.originCity && formData.destinationCity && (
            <Card className="bg-muted/50">
              <CardContent className="py-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Luggage className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {formData.originCity} → {formData.destinationCity}
                    </span>
                  </div>
                  <Badge variant={isReturnTrip ? "secondary" : "default"}>
                    {isReturnTrip ? "Retour" : "Aller"}
                  </Badge>
                </div>
                {formData.pricePerKg && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.pricePerKg} {getCurrencySymbol(formData.currency)}/kg • {formData.totalCapacity || 23}kg dispo
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plane className="w-4 h-4 mr-2" />
                  Créer le voyage
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
