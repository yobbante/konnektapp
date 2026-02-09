/**
 * SmartVoyageForm — Unified intelligent voyage creation form
 * 
 * Used from: Header +, Calendar date tap, Calendrier page button
 * Mobile-optimized with Drawer/Sheet pattern, safe area support
 * 
 * RULES:
 * - Route LOCKED to GP's navette fixe
 * - Price LOCKED from registration
 * - Only capacity, dates, flight info editable
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plane, Weight, Calendar, Clock, CheckCircle,
  MapPin, Info, ArrowRightLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
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
  /** Pre-selected date (from calendar tap) */
  selectedDate?: Date | null;
  onSuccess: () => void;
}

export function SmartVoyageForm({
  open,
  onClose,
  gpId,
  selectedDate,
  onSuccess,
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

  // Fetch GP locked route & pricing
  useEffect(() => {
    if (open && gpId) {
      loadGpData();
    }
  }, [open, gpId]);

  // Pre-fill date if provided and reset form
  useEffect(() => {
    if (open) {
      setForm({
        departureDate: selectedDate
          ? format(selectedDate, "yyyy-MM-dd'T'HH:mm")
          : "",
        arrivalDate: "",
        capacity: "23",
        flightNumber: "",
        airline: "",
      });
      smartDetectTripType();
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

      // Smart trip type: alternate with last offer
      if (lastOffer && profile.base_origin_city) {
        const lastWasAller = lastOffer.origin_city === profile.base_origin_city;
        setTripType(lastWasAller ? "retour" : "aller");
      }
    }
  };

  const smartDetectTripType = async () => {
    // Will be set by loadGpData
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

      toast({
        title: "✈️ Voyage créé !",
        description: `${currentRoute.origin.city} → ${currentRoute.destination.city}`,
      });
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
      <DrawerContent className="max-h-[92vh]">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-5 py-4 rounded-t-2xl">
          <DrawerTitle className="flex items-center gap-2 text-lg text-primary-foreground">
            <Plane className="w-5 h-5" />
            Nouveau voyage
          </DrawerTitle>
          {selectedDate && (
            <p className="text-sm opacity-90 mt-1">
              {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
            </p>
          )}
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto pb-safe" style={{ maxHeight: 'calc(92vh - 80px)' }}>
          {/* Route visual — LOCKED */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <span className="text-2xl">{getFlag(currentRoute.origin.country)}</span>
                  <p className="text-xs font-bold mt-1">{currentRoute.origin.city}</p>
                </div>
                <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Plane className={`w-5 h-5 text-primary ${tripType === "retour" ? "rotate-180" : ""}`} />
                </motion.div>
                <div className="text-center">
                  <span className="text-2xl">{getFlag(currentRoute.destination.country)}</span>
                  <p className="text-xs font-bold mt-1">{currentRoute.destination.city}</p>
                </div>
              </div>
              <div className="flex items-center justify-center mt-2">
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
              className="h-11 text-sm"
              onClick={() => setTripType("aller")}
            >
              <Plane className="w-4 h-4 mr-2" /> Aller
            </Button>
            <Button
              type="button"
              variant={tripType === "retour" ? "default" : "outline"}
              className="h-11 text-sm"
              onClick={() => setTripType("retour")}
            >
              <Plane className="w-4 h-4 mr-2 rotate-180" /> Retour
            </Button>
          </div>

          {/* Date departure */}
          {!selectedDate && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date de départ *
              </Label>
              <Input
                type="datetime-local"
                value={form.departureDate}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                className="h-11"
              />
            </div>
          )}

          {/* Capacity — Main input */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Weight className="w-4 h-4" /> Capacité (kg) *
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Ex: 30"
              className="h-12 text-lg"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              autoFocus
            />
          </div>

          {/* Flight info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Compagnie</Label>
              <Input
                placeholder="Air Sénégal..."
                value={form.airline}
                onChange={(e) => setForm({ ...form, airline: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">N° Vol</Label>
              <Input
                placeholder="AF123"
                value={form.flightNumber}
                onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}
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
              value={form.arrivalDate}
              min={form.departureDate}
              onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
              className="h-10"
            />
          </div>

          {/* Locked price */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4" /> Prix verrouillé
            </span>
            <span className="font-bold text-sm">
              {gpData.basePricePerKg.toLocaleString()} {currencySymbol}/kg
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-12"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !form.capacity || parseFloat(form.capacity) <= 0}
              className="flex-1 h-12"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
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
