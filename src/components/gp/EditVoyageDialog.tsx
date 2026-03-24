/**
 * EditVoyageDialog — Full voyage edit form matching SmartVoyageForm
 * Supports airline, flight number, luggage counter, dates, capacity
 */
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plane, RefreshCw, Trash2, Save, Calendar, Clock,
  Luggage, Plus, Minus, MapPin, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Drawer, DrawerContent
} from "@/components/ui/drawer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { CurrencySelector, getCurrencySymbol, type CurrencyCode } from "@/components/ui/currency-selector";
import { AirlineSelect } from "@/components/gp/AirlineSelect";
import { SearchableCitySelect } from "@/components/gp/SearchableCitySelect";
import { LUGGAGE_PRESETS } from "@/lib/bookingRules";

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

interface EditVoyageDialogProps {
  open: boolean;
  onClose: () => void;
  voyage: VoyageOffer | null;
  onSuccess: () => void;
}

export function EditVoyageDialog({ open, onClose, voyage, onSuccess }: EditVoyageDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [originCity, setOriginCity] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destCountry, setDestCountry] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [airline, setAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");
  const [totalCapacity, setTotalCapacity] = useState("");
  const [availableCapacity, setAvailableCapacity] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [status, setStatus] = useState("active");

  useEffect(() => {
    if (voyage && open) {
      setOriginCity(voyage.origin_city || "");
      setOriginCountry(voyage.origin_country || "");
      setDestCity(voyage.destination_city || "");
      setDestCountry(voyage.destination_country || "");
      setDepartureDate(voyage.departure_date ? voyage.departure_date.split('T')[0] : "");
      setArrivalDate(voyage.arrival_date ? voyage.arrival_date.split('T')[0] : "");
      setAirline(voyage.airline || "");
      setFlightNumber(voyage.flight_number || "");
      setPricePerKg(voyage.price_per_kg?.toString() || "");
      setCurrency((voyage.currency || "EUR") as CurrencyCode);
      setTotalCapacity(voyage.total_capacity?.toString() || "");
      setAvailableCapacity(voyage.available_capacity?.toString() || "");
      setRestrictions(voyage.baggage_restrictions || "");
      setStatus(voyage.status || "active");
    }
  }, [voyage, open]);

  const currSymbol = getCurrencySymbol(currency);
  const minDate = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!voyage) return;
    if (!originCity || !destCity || !departureDate || !pricePerKg || !totalCapacity) {
      toast({ title: "Erreur", description: "Remplissez tous les champs obligatoires", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("gp_offers")
        .update({
          origin_city: originCity,
          origin_country: originCountry,
          destination_city: destCity,
          destination_country: destCountry,
          departure_date: departureDate,
          arrival_date: arrivalDate || null,
          total_capacity: parseFloat(totalCapacity),
          available_capacity: parseFloat(availableCapacity) || parseFloat(totalCapacity),
          price_per_kg: parseFloat(pricePerKg),
          currency: currency,
          flight_number: flightNumber || null,
          airline: airline || null,
          baggage_restrictions: restrictions || null,
          status: status as any,
        })
        .eq("id", voyage.id);
      if (error) throw error;
      toast({ title: "Voyage modifié", description: "Les modifications ont été enregistrées" });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible de modifier", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!voyage) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("gp_offers").delete().eq("id", voyage.id);
      if (error) throw error;
      toast({ title: "Voyage supprimé" });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!voyage) return null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh] flex flex-col focus:outline-none [&>div:first-child]:hidden">
        <div className="bg-primary text-primary-foreground px-4 py-3 rounded-t-2xl flex items-center gap-2">
          <div className="mx-auto w-10 h-1 rounded-full bg-primary-foreground/30 mb-2" />
        </div>
        <div className="bg-primary text-primary-foreground px-4 pb-3 -mt-1 flex items-center gap-2">
          <Plane className="w-4 h-4" />
          <h2 className="text-base font-bold">Modifier le voyage</h2>
        </div>

        <div className="px-4 py-4 space-y-4 overflow-y-auto flex-1 pb-safe" style={{ maxHeight: 'calc(92vh - 56px)' }}>
          {/* Route */}
          <div className="space-y-2.5">
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" /> Ville de départ
              </Label>
              <SearchableCitySelect
                value={originCity}
                countryCode={originCountry}
                onSelect={(city, country) => { setOriginCity(city); setOriginCountry(country); }}
                placeholder="Ex: Dakar"
                className="h-10"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-500" /> Ville d'arrivée
              </Label>
              <SearchableCitySelect
                value={destCity}
                countryCode={destCountry}
                onSelect={(city, country) => { setDestCity(city); setDestCountry(country); }}
                placeholder="Ex: Paris"
                className="h-10"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date départ
              </Label>
              <Input
                type="date"
                value={departureDate}
                min={minDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Date arrivée
              </Label>
              <Input
                type="date"
                value={arrivalDate}
                min={departureDate || minDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
          </div>

          {/* Airline & Flight */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Compagnie</Label>
              <AirlineSelect
                value={airline}
                onChange={setAirline}
                placeholder="Compagnie..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">N° Vol</Label>
              <Input
                placeholder="AF123"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
          </div>

          {/* Capacity & Price */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Capacité totale (kg)</Label>
              <Input
                type="number"
                value={totalCapacity}
                onChange={(e) => setTotalCapacity(e.target.value)}
                placeholder="30"
                className="h-10 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Disponible (kg)</Label>
              <Input
                type="number"
                value={availableCapacity}
                onChange={(e) => setAvailableCapacity(e.target.value)}
                placeholder="30"
                className="h-10 rounded-lg"
              />
            </div>
          </div>

          {/* Price with Currency */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Prix par kg</Label>
            <div className="grid grid-cols-3 gap-2">
              <CurrencySelector
                value={currency}
                onValueChange={(v) => setCurrency(v as CurrencyCode)}
              />
              <Input
                type="number"
                step="0.5"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                placeholder="8"
                className="h-10 rounded-lg"
              />
              <div className="flex items-center text-sm text-muted-foreground">
                {currSymbol}/kg
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground">Statut</Label>
            <div className="flex gap-2">
              <Badge
                variant={status === "active" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setStatus("active")}
              >
                Actif
              </Badge>
              <Badge
                variant={status === "paused" ? "secondary" : "outline"}
                className="cursor-pointer"
                onClick={() => setStatus("paused")}
              >
                Pause
              </Badge>
            </div>
          </div>

          {/* Restrictions */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Restrictions</Label>
            <Textarea
              value={restrictions}
              onChange={(e) => setRestrictions(e.target.value)}
              placeholder="Ex: Pas de liquides, pas de produits alimentaires périssables..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1 pb-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="icon" className="h-11 w-11 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce voyage ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible.
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
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 h-11 rounded-lg">
              Annuler
            </Button>
            <Button onClick={() => handleSubmit()} disabled={loading} className="flex-1 h-11 rounded-lg gap-1.5">
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
