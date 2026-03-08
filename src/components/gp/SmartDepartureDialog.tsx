/**
 * SmartDepartureDialog — Unified departure creation dialog
 * 
 * RULES:
 * - Route is LOCKED to GP's base navette (aller/retour only)
 * - Price is LOCKED from registration (no manual edit)
 * - Only capacity, dates, and flight info are editable
 * - Premium/Pro: departure TIME field + advantage badges
 */
import { useState, useEffect } from "react";
import { 
  Plane, CheckCircle, Crown, Rocket, Clock
} from "lucide-react";
import { AirlineSelect } from "@/components/gp/AirlineSelect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { getCutoffAdvantageLabel } from "@/lib/bookingRules";

const FLAGS: Record<string, string> = {
  FR: "🇫🇷", SN: "🇸🇳", CI: "🇨🇮", CM: "🇨🇲", ML: "🇲🇱", US: "🇺🇸", CA: "🇨🇦",
  AE: "🇦🇪", GB: "🇬🇧", BE: "🇧🇪", MA: "🇲🇦", TN: "🇹🇳", GA: "🇬🇦", CG: "🇨🇬",
  DE: "🇩🇪", ES: "🇪🇸", IT: "🇮🇹", CH: "🇨🇭", NL: "🇳🇱", GN: "🇬🇳",
};

export interface SmartDepartureData {
  date: string;
  departureTime?: string;
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
  gpSubscription?: string;
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
  gpSubscription,
  lastDeparture,
  onAddDeparture,
}: SmartDepartureDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tripType, setTripType] = useState<"aller" | "retour">("aller");
  const [capacity, setCapacity] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [airline, setAirline] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");

  const isPremiumOrPro = gpSubscription === "premium" || gpSubscription === "pro";
  const cutoffAdvantage = getCutoffAdvantageLabel(gpSubscription);

  useEffect(() => {
    if (open) {
      const nextType = lastDeparture?.type === "aller" ? "retour" : "aller";
      setTripType(nextType);
      setCapacity("");
      setDepartureTime("");
      setFlightNumber("");
      setAirline("");
      setArrivalDate("");
    }
  }, [open, lastDeparture]);

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
        departureTime: departureTime || undefined,
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
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plane className="w-4 h-4" />
            Nouveau départ
            {selectedDate && (
              <span className="text-xs opacity-80 ml-auto">
                {format(selectedDate, "d MMM yyyy", { locale: fr })}
              </span>
            )}
          </DialogTitle>
        </div>

        <div className="p-4 space-y-3">
          {/* Premium advantage badge */}
          {isPremiumOrPro && cutoffAdvantage && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              {gpSubscription === "pro" ? (
                <Rocket className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <Crown className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="text-xs font-medium text-amber-700">{cutoffAdvantage}</span>
              <Badge className="ml-auto bg-amber-500 text-white border-none text-[10px] px-1.5 py-0">
                {gpSubscription === "pro" ? "Pro" : "Premium"}
              </Badge>
            </div>
          )}

          {/* Route inline compact */}
          <div className="flex items-center justify-center gap-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-xl">{getFlag(currentRoute.origin.country)}</span>
            <span className="text-xs font-bold">{currentRoute.origin.city}</span>
            <Plane className={`w-4 h-4 text-primary ${tripType === "retour" ? "rotate-180" : ""}`} />
            <span className="text-xs font-bold">{currentRoute.destination.city}</span>
            <span className="text-xl">{getFlag(currentRoute.destination.country)}</span>
          </div>

          {/* Trip type + capacity */}
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant={tripType === "aller" ? "default" : "outline"} className="h-9 text-xs" onClick={() => setTripType("aller")}>
              <Plane className="w-3 h-3 mr-1" /> Aller
            </Button>
            <Button type="button" variant={tripType === "retour" ? "default" : "outline"} className="h-9 text-xs" onClick={() => setTripType("retour")}>
              <Plane className="w-3 h-3 mr-1 rotate-180" /> Retour
            </Button>
            <div>
              <Label className="text-[10px] text-muted-foreground">Capacité (kg)</Label>
              <Input type="number" inputMode="decimal" step="0.5" placeholder="Ex: 61" className="h-9 text-sm" value={capacity} onChange={(e) => setCapacity(e.target.value)} autoFocus />
            </div>
          </div>

          {/* Departure time — Premium/Pro only */}
          {isPremiumOrPro && (
            <div>
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Heure de départ
                <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 border-amber-500/40 text-amber-600">
                  {gpSubscription === "pro" ? "Pro" : "Premium"}
                </Badge>
              </Label>
              <Input 
                type="time" 
                value={departureTime} 
                onChange={(e) => setDepartureTime(e.target.value)} 
                className="h-9 text-sm" 
                placeholder="HH:MM"
              />
            </div>
          )}

          {/* Flight details */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Compagnie</Label>
              <AirlineSelect value={airline} onChange={setAirline} placeholder="Compagnie..." />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">N° Vol</Label>
              <Input placeholder="AF123" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* Arrival date + price */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Arrivée estimée</Label>
              <Input type="datetime-local" value={arrivalDate} min={selectedDate ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") : undefined} onChange={(e) => setArrivalDate(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="flex items-end">
              <div className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/50 border h-9">
                <span className="text-[10px] text-muted-foreground">Prix</span>
                <span className="font-bold text-xs">{gpPricing.basePricePerKg.toLocaleString()} {currencySymbol}/kg</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={loading || !capacity || parseFloat(capacity) <= 0} className="w-full h-10 text-sm">
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <><CheckCircle className="w-4 h-4 mr-1.5" /> Ajouter le départ</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
