/**
 * SmartVoyageForm — Redesigned voyage creation form
 * Matches the mobile-first teal design with locked route card
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plane, Weight, Calendar, Clock, CheckCircle,
  MapPin, Info, Luggage
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { AirlineSelect } from "@/components/gp/AirlineSelect";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const FLAGS: Record<string, string> = {
  FR: "🇫🇷", SN: "🇸🇳", CI: "🇨🇮", CM: "🇨🇲", ML: "🇲🇱", US: "🇺🇸", CA: "🇨🇦",
  AE: "🇦🇪", GB: "🇬🇧", BE: "🇧🇪", MA: "🇲🇦", TN: "🇹🇳", GA: "🇬🇦", CG: "🇨🇬",
  DE: "🇩🇪", ES: "🇪🇸", IT: "🇮🇹", CH: "🇨🇭", NL: "🇳🇱", GN: "🇬🇳",
};

interface SmartVoyageFormProps {
  open: boolean;
  onClose: () => void;
  gpId: string;
  selectedDate?: Date | null;
  onSuccess: () => void;
}

export function SmartVoyageForm({
  open, onClose, gpId, selectedDate, onSuccess,
}: SmartVoyageFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tripType, setTripType] = useState<"aller" | "retour">("aller");

  const [gpData, setGpData] = useState<{
    baseOriginCity: string;
    baseOriginCountry: string;
    baseDestCity: string;
    baseDestCountry: string;
    basePricePerKg: number;
    currency: string;
  } | null>(null);

  const [form, setForm] = useState({
    departureDate: "",
    arrivalDate: "",
    capacity: "23",
    flightNumber: "",
    airline: "",
  });

  useEffect(() => {
    if (open && gpId) loadGpData();
  }, [open, gpId]);

  useEffect(() => {
    if (open) {
      setForm({
        departureDate: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") : "",
        arrivalDate: "",
        capacity: "23",
        flightNumber: "",
        airline: "",
      });
    }
  }, [open, selectedDate]);

  const loadGpData = async () => {
    const [{ data: profile }, { data: lastOffer }] = await Promise.all([
      supabase
        .from("gp_profiles")
        .select("base_origin_city, base_origin_country, base_destination_city, base_destination_country, base_price_per_kg, default_currency")
        .eq("id", gpId)
        .single(),
      supabase
        .from("gp_offers")
        .select("origin_city, destination_city")
        .eq("gp_id", gpId)
        .order("departure_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (profile) {
      setGpData({
        baseOriginCity: profile.base_origin_city || "",
        baseOriginCountry: profile.base_origin_country || "",
        baseDestCity: profile.base_destination_city || "",
        baseDestCountry: profile.base_destination_country || "",
        basePricePerKg: profile.base_price_per_kg || 0,
        currency: profile.default_currency || "XOF",
      });

      if (lastOffer && profile.base_origin_city) {
        const lastWasAller = lastOffer.origin_city === profile.base_origin_city;
        setTripType(lastWasAller ? "retour" : "aller");
      }
    }
  };

  if (!gpData) return null;

  const currentRoute = tripType === "aller"
    ? {
        origin: { city: gpData.baseOriginCity, country: gpData.baseOriginCountry },
        destination: { city: gpData.baseDestCity, country: gpData.baseDestCountry },
      }
    : {
        origin: { city: gpData.baseDestCity, country: gpData.baseDestCountry },
        destination: { city: gpData.baseOriginCity, country: gpData.baseOriginCountry },
      };

  const currencySymbol = getCurrencySymbol(gpData.currency as any);
  const getFlag = (code: string) => FLAGS[code] || "🌍";

  const handleSubmit = async () => {
    if (!form.departureDate || !form.capacity || parseFloat(form.capacity) <= 0) {
      toast({ title: "Champs requis", description: "Date et capacité obligatoires", variant: "destructive" });
      return;
    }
    if (new Date(form.departureDate) <= new Date()) {
      toast({ title: "Date invalide", description: "La date doit être dans le futur", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("gp_offers").insert({
        gp_id: gpId,
        transport_type: "bagages_international",
        origin_city: currentRoute.origin.city,
        origin_country: currentRoute.origin.country,
        destination_city: currentRoute.destination.city,
        destination_country: currentRoute.destination.country,
        departure_date: form.departureDate,
        arrival_date: form.arrivalDate || null,
        price_per_kg: gpData.basePricePerKg,
        currency: gpData.currency,
        total_capacity: parseFloat(form.capacity),
        available_capacity: parseFloat(form.capacity),
        flight_number: form.flightNumber || null,
        airline: form.airline || null,
        status: "active",
      });
      if (error) throw error;
      toast({ title: "✈️ Voyage créé !", description: `${currentRoute.origin.city} → ${currentRoute.destination.city}` });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible de créer", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !loading && !o && onClose()}>
      <DrawerContent className="max-h-[95vh] focus:outline-none">
        {/* Teal header */}
        <div className="bg-primary text-primary-foreground px-5 py-4 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <Plane className="w-5 h-5" />
            <h2 className="text-lg font-bold">Nouveau voyage</h2>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5 overflow-y-auto pb-safe" style={{ maxHeight: 'calc(95vh - 72px)' }}>
          {/* Route card — locked */}
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-center gap-5">
              <div className="text-center">
                <span className="text-3xl">{getFlag(currentRoute.origin.country)}</span>
                <p className="text-xs font-medium mt-1">{currentRoute.origin.city}</p>
              </div>
              <motion.div animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
                <Plane className={`w-5 h-5 text-primary ${tripType === "retour" ? "rotate-180" : ""}`} />
              </motion.div>
              <div className="text-center">
                <span className="text-3xl">{getFlag(currentRoute.destination.country)}</span>
                <p className="text-xs font-medium mt-1">{currentRoute.destination.city}</p>
              </div>
            </div>
            <div className="flex justify-center mt-2.5">
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[11px] gap-1 px-3 py-1">
                <MapPin className="w-3 h-3" /> Navette verrouillée
              </Badge>
            </div>
          </div>

          {/* Aller / Retour toggle */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={tripType === "aller" ? "default" : "outline"}
              className={`h-12 text-sm font-semibold gap-2 rounded-xl ${tripType === "aller" ? "" : "border-2"}`}
              onClick={() => setTripType("aller")}
            >
              <Plane className="w-4 h-4" /> Aller
            </Button>
            <Button
              type="button"
              variant={tripType === "retour" ? "default" : "outline"}
              className={`h-12 text-sm font-semibold gap-2 rounded-xl ${tripType === "retour" ? "" : "border-2"}`}
              onClick={() => setTripType("retour")}
            >
              <Luggage className="w-4 h-4" /> Retour
            </Button>
          </div>

          {/* Date de départ */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-4 h-4" /> Date de départ *
            </Label>
            <Input
              type="datetime-local"
              value={form.departureDate}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
              className="h-12 rounded-xl border-2 border-primary/30 focus:border-primary"
            />
          </div>

          {/* Capacité */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Luggage className="w-4 h-4" /> Capacité (kg) *
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="23"
              className="h-12 text-lg rounded-xl border-2 border-primary/30 focus:border-primary"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </div>

          {/* Compagnie + N° Vol */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Compagnie</Label>
              <AirlineSelect
                value={form.airline}
                onChange={(v) => setForm({ ...form, airline: v })}
                placeholder="Compagnie..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">N° Vol</Label>
              <Input
                placeholder="AF123"
                value={form.flightNumber}
                onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Date d'arrivée estimée */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Date d'arrivée estimée
            </Label>
            <Input
              type="datetime-local"
              value={form.arrivalDate}
              min={form.departureDate}
              onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
              className="h-12 rounded-xl border-2 border-primary/30 focus:border-primary"
            />
          </div>

          {/* Prix verrouillé */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/60 border">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4" /> Prix verrouillé
            </span>
            <span className="font-bold text-sm">
              {gpData.basePricePerKg.toLocaleString()} {currencySymbol}/kg
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-12 rounded-xl border-2 text-sm font-semibold"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !form.capacity || parseFloat(form.capacity) <= 0}
              className="flex-1 h-12 rounded-xl text-sm font-semibold gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Créer le voyage
                </>
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
