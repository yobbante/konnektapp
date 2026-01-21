import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRightLeft, Plane, MapPin, Weight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SearchableCountrySelect, SearchableCityInput, ALL_COUNTRIES } from "./SearchableCountrySelect";

interface SmartDepartureDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  defaultRoute?: {
    originCity: string;
    originCountry: string;
    destinationCity: string;
    destinationCountry: string;
  };
  lastDeparture?: {
    originCity: string;
    originCountry: string;
    destinationCity: string;
    destinationCountry: string;
    pricePerKg: number;
  } | null;
  defaultPricePerKg?: number;
  onAddDeparture: (data: {
    date: string;
    originCity: string;
    originCountry: string;
    destinationCity: string;
    destinationCountry: string;
    capacity: number;
    pricePerKg: number;
    type: "aller" | "retour";
  }) => Promise<void>;
}

export function SmartDepartureDialog({
  open,
  onClose,
  selectedDate,
  defaultRoute,
  lastDeparture,
  defaultPricePerKg = 8,
  onAddDeparture,
}: SmartDepartureDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isReturnTrip, setIsReturnTrip] = useState(false);
  
  const [departure, setDeparture] = useState({
    originCity: "",
    originCountry: "FR",
    destinationCity: "",
    destinationCountry: "SN",
    capacity: "",
    pricePerKg: String(defaultPricePerKg),
    type: "aller" as "aller" | "retour",
  });

  // Smart pre-fill logic - properly syncs isReturnTrip with type
  useEffect(() => {
    if (open && selectedDate) {
      let origin = { city: "", country: "FR" };
      let destination = { city: "", country: "SN" };
      let price = defaultPricePerKg;
      let tripType: "aller" | "retour" = "aller";

      // Priority 1: If last departure exists, inverse it for return trip logic
      if (lastDeparture) {
        origin = {
          city: lastDeparture.destinationCity,
          country: lastDeparture.destinationCountry,
        };
        destination = {
          city: lastDeparture.originCity,
          country: lastDeparture.originCountry,
        };
        price = lastDeparture.pricePerKg;
        tripType = "retour";
        setIsReturnTrip(true);
      }
      // Priority 2: Use default route if no last departure
      else if (defaultRoute) {
        origin = {
          city: defaultRoute.originCity,
          country: defaultRoute.originCountry,
        };
        destination = {
          city: defaultRoute.destinationCity,
          country: defaultRoute.destinationCountry,
        };
        tripType = "aller";
        setIsReturnTrip(false);
      } else {
        setIsReturnTrip(false);
      }

      setDeparture({
        originCity: origin.city,
        originCountry: origin.country,
        destinationCity: destination.city,
        destinationCountry: destination.country,
        capacity: "",
        pricePerKg: String(price),
        type: tripType,
      });
    }
  }, [open, selectedDate, defaultRoute, lastDeparture, defaultPricePerKg]);

  // Handle switch for return trip - properly toggles type
  const handleSwitchRoute = () => {
    const newType = departure.type === "aller" ? "retour" : "aller";
    setDeparture(prev => ({
      ...prev,
      originCity: prev.destinationCity,
      originCountry: prev.destinationCountry,
      destinationCity: prev.originCity,
      destinationCountry: prev.originCountry,
      type: newType,
    }));
    setIsReturnTrip(newType === "retour");
  };

  const handleSubmit = async () => {
    if (!selectedDate || !departure.originCity || !departure.destinationCity || !departure.capacity) {
      return;
    }

    setLoading(true);
    try {
      await onAddDeparture({
        date: format(selectedDate, "yyyy-MM-dd"),
        originCity: departure.originCity,
        originCountry: departure.originCountry,
        destinationCity: departure.destinationCity,
        destinationCountry: departure.destinationCountry,
        capacity: parseFloat(departure.capacity),
        pricePerKg: departure.pricePerKg ? parseFloat(departure.pricePerKg) : defaultPricePerKg,
        type: departure.type,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const getCountryFlag = (code: string) => {
    return ALL_COUNTRIES.find(c => c.code === code)?.flag || "🌍";
  };

  return (
    <Dialog open={open} onOpenChange={() => !loading && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" />
            Nouveau départ
            {selectedDate && (
              <Badge variant="secondary" className="ml-2">
                {format(selectedDate, "d MMMM yyyy", { locale: fr })}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Route Type with Switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Badge variant={isReturnTrip ? "secondary" : "default"}>
                {isReturnTrip ? "Retour" : "Aller"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {lastDeparture && "Basé sur votre dernier trajet"}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSwitchRoute}
              className="gap-1"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Inverser
            </Button>
          </div>

          {/* Origin */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-primary" />
              Départ
            </Label>
            <div className="flex gap-2">
              <SearchableCountrySelect
                value={departure.originCountry}
                onValueChange={(v) => setDeparture(prev => ({ ...prev, originCountry: v }))}
                className="w-[140px]"
              />
              <SearchableCityInput
                value={departure.originCity}
                onValueChange={(v) => setDeparture(prev => ({ ...prev, originCity: v }))}
                countryCode={departure.originCountry}
                placeholder="Ville de départ"
                className="flex-1"
              />
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-destructive" />
              Destination
            </Label>
            <div className="flex gap-2">
              <SearchableCountrySelect
                value={departure.destinationCountry}
                onValueChange={(v) => setDeparture(prev => ({ ...prev, destinationCountry: v }))}
                className="w-[140px]"
              />
              <SearchableCityInput
                value={departure.destinationCity}
                onValueChange={(v) => setDeparture(prev => ({ ...prev, destinationCity: v }))}
                countryCode={departure.destinationCountry}
                placeholder="Ville d'arrivée"
                className="flex-1"
              />
            </div>
          </div>

          {/* Capacity & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Weight className="w-3 h-3" />
                Capacité (kg) *
              </Label>
              <Input
                type="number"
                placeholder="Ex: 30"
                value={departure.capacity}
                onChange={(e) => setDeparture(prev => ({ ...prev, capacity: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Prix/kg (FCFA)</Label>
              <Input
                type="number"
                placeholder={String(defaultPricePerKg)}
                value={departure.pricePerKg}
                onChange={(e) => setDeparture(prev => ({ ...prev, pricePerKg: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Par défaut: {defaultPricePerKg} FCFA
              </p>
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !departure.originCity || !departure.destinationCity || !departure.capacity}
            className="w-full"
          >
            {loading ? "Ajout en cours..." : "Ajouter le départ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
