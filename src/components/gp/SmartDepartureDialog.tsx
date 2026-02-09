/**
 * SmartDepartureDialog — Unified departure creation dialog
 * 
 * RULES:
 * - Route is LOCKED to GP's base navette (aller/retour only)
 * - Price is LOCKED from registration (no manual edit)
 * - Only capacity, dates, and flight info are editable
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowRightLeft, Plane, Weight, Calendar, 
  Clock, MapPin, Info, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getCurrencySymbol } from "@/components/ui/currency-selector";

// Country flags
const FLAGS: Record<string, string> = {
  FR: "🇫🇷", SN: "🇸🇳", CI: "🇨🇮", CM: "🇨🇲", ML: "🇲🇱", US: "🇺🇸", CA: "🇨🇦",
  AE: "🇦🇪", GB: "🇬🇧", BE: "🇧🇪", MA: "🇲🇦", TN: "🇹🇳", GA: "🇬🇦", CG: "🇨🇬",
  DE: "🇩🇪", ES: "🇪🇸", IT: "🇮🇹", CH: "🇨🇭", NL: "🇳🇱", GN: "🇬🇳",
};

export interface SmartDepartureData {
  date: string;
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
  capacity: number;
  pricePerKg: number;
  type: "aller" | "retour";
  flightNumber?: string;
  airline?: string;
  arrivalDate?: string;
}

interface SmartDepartureDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  gpRoute: {
    originCity: string;
    originCountry: string;
    destinationCity: string;
    destinationCountry: string;
  };
  gpPricing: {
    basePricePerKg: number;
    currency: string;
  };
  lastDeparture?: {
    type: "aller" | "retour";
  } | null;
  onAddDeparture: (data: SmartDepartureData) => Promise<void>;
}

export function SmartDepartureDialog({
  open,
  onClose,
  selectedDate,
  gpRoute,
  gpPricing,
  lastDeparture,
  onAddDeparture,
}: SmartDepartureDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tripType, setTripType] = useState<"aller" | "retour">("aller");
  const [capacity, setCapacity] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [airline, setAirline] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");

  // Smart pre-fill: alternate aller/retour
  useEffect(() => {
    if (open) {
      const nextType = lastDeparture?.type === "aller" ? "retour" : "aller";
      setTripType(nextType);
      setCapacity("");
      setFlightNumber("");
      setAirline("");
      setArrivalDate("");
    }
  }, [open, lastDeparture]);

  // Compute actual route based on trip type
  const currentRoute = tripType === "aller" 
    ? {
        origin: { city: gpRoute.originCity, country: gpRoute.originCountry },
        destination: { city: gpRoute.destinationCity, country: gpRoute.destinationCountry },
      }
    : {
        origin: { city: gpRoute.destinationCity, country: gpRoute.destinationCountry },
        destination: { city: gpRoute.originCity, country: gpRoute.originCountry },
      };

  const currencySymbol = getCurrencySymbol(gpPricing.currency as any);
  const getFlag = (code: string) => FLAGS[code] || "🌍";

  const handleSubmit = async () => {
    if (!selectedDate || !capacity || parseFloat(capacity) <= 0) return;

    setLoading(true);
    try {
      await onAddDeparture({
        date: format(selectedDate, "yyyy-MM-dd"),
        originCity: currentRoute.origin.city,
        originCountry: currentRoute.origin.country,
        destinationCity: currentRoute.destination.city,
        destinationCountry: currentRoute.destination.country,
        capacity: parseFloat(capacity),
        pricePerKg: gpPricing.basePricePerKg,
        type: tripType,
        flightNumber: flightNumber || undefined,
        airline: airline || undefined,
        arrivalDate: arrivalDate || undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => !loading && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Colored header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-5">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Plane className="w-5 h-5" />
            Nouveau départ
          </DialogTitle>
          {selectedDate && (
            <p className="text-sm opacity-90 mt-1">
              {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
            </p>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Route visual — LOCKED */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <span className="text-3xl">{getFlag(currentRoute.origin.country)}</span>
                  <p className="text-sm font-bold mt-1">{currentRoute.origin.city}</p>
                </div>
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Plane className={`w-6 h-6 text-primary ${tripType === "retour" ? "rotate-180" : ""}`} />
                </motion.div>
                <div className="text-center">
                  <span className="text-3xl">{getFlag(currentRoute.destination.country)}</span>
                  <p className="text-sm font-bold mt-1">{currentRoute.destination.city}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <MapPin className="w-3 h-3" /> Navette verrouillée
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Trip type selector */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={tripType === "aller" ? "default" : "outline"}
              className="h-12 text-sm"
              onClick={() => setTripType("aller")}
            >
              <Plane className="w-4 h-4 mr-2" />
              Aller
            </Button>
            <Button
              type="button"
              variant={tripType === "retour" ? "default" : "outline"}
              className="h-12 text-sm"
              onClick={() => setTripType("retour")}
            >
              <Plane className="w-4 h-4 mr-2 rotate-180" />
              Retour
            </Button>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Weight className="w-4 h-4" />
              Capacité disponible (kg) *
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Ex: 30"
              className="h-12 text-lg"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              autoFocus
            />
          </div>

          {/* Flight details (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Compagnie</Label>
              <Input
                placeholder="Air France..."
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">N° Vol</Label>
              <Input
                placeholder="AF123"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                className="h-10"
              />
            </div>
          </div>

          {/* Arrival date */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Date d'arrivée estimée
            </Label>
            <Input
              type="datetime-local"
              value={arrivalDate}
              min={selectedDate ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") : undefined}
              onChange={(e) => setArrivalDate(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Price info — READ ONLY */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4" />
              Prix appliqué
            </div>
            <span className="font-bold text-sm">
              {gpPricing.basePricePerKg.toLocaleString()} {currencySymbol}/kg
            </span>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !capacity || parseFloat(capacity) <= 0}
            className="w-full h-12 text-base"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Ajouter le départ
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
