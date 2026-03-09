/**
 * SmartVoyageForm — Compact voyage creation form
 * Date-only (no time), interactive luggage counter, no emojis
 */
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plane, Calendar, Clock, CheckCircle,
  MapPin, Info, Luggage, Plus, Minus
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
import { DepartureFlyerSheet } from "@/components/gp/DepartureFlyerSheet";
import { type FlyerData } from "@/lib/generateDepartureFlyer";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { LUGGAGE_PRESETS } from "@/lib/bookingRules";

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

  interface NavetteRoute {
    id: string;
    origin_city: string;
    origin_country: string;
    destination_city: string;
    destination_country: string;
    is_primary: boolean;
  }

  const [navettes, setNavettes] = useState<NavetteRoute[]>([]);
  const [selectedNavetteIdx, setSelectedNavetteIdx] = useState(0);

  const [flyerData, setFlyerData] = useState<FlyerData | null>(null);
  const [showFlyer, setShowFlyer] = useState(false);

  const [gpData, setGpData] = useState<{
    baseOriginCity: string;
    baseOriginCountry: string;
    baseDestCity: string;
    baseDestCountry: string;
    basePricePerKg: number;
    currency: string;
    businessName: string;
    phone: string;
  } | null>(null);

  const [form, setForm] = useState({
    departureDate: "",
    arrivalDate: "",
    flightNumber: "",
    airline: "",
  });

  const [luggage, setLuggage] = useState<Record<number, number>>({ 23: 0, 15: 0, 12: 0 });

  const totalCapacity = useMemo(() =>
    Object.entries(luggage).reduce((sum, [kg, count]) => sum + Number(kg) * count, 0),
  [luggage]);

  const totalBags = useMemo(() =>
    Object.values(luggage).reduce((sum, c) => sum + c, 0),
  [luggage]);

  const adjustLuggage = (kg: number, delta: number) => {
    setLuggage(prev => ({ ...prev, [kg]: Math.max(0, (prev[kg] || 0) + delta) }));
  };

  useEffect(() => {
    if (open && gpId) loadGpData();
  }, [open, gpId]);

  // Load saved preferences from localStorage
  const PREFS_KEY = `gp_voyage_prefs_${gpId}`;

  const loadSavedPrefs = () => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  };

  const savePrefs = (luggageData: Record<number, number>, airline: string) => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ luggage: luggageData, airline }));
    } catch {}
  };

  useEffect(() => {
    if (open) {
      const minDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
      const prefs = loadSavedPrefs();
      setForm({
        departureDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : minDate,
        arrivalDate: "",
        flightNumber: "",
        airline: prefs?.airline || "",
      });
      setLuggage(prefs?.luggage && Object.values(prefs.luggage).some((v: any) => v > 0)
        ? prefs.luggage
        : { 23: 0, 15: 0, 12: 0 });
    }
  }, [open, selectedDate]);

  const loadGpData = async () => {
    const [{ data: profile }, { data: lastOffer }, { data: navData }] = await Promise.all([
      supabase
        .from("gp_profiles")
        .select("base_origin_city, base_origin_country, base_destination_city, base_destination_country, base_price_per_kg, default_currency, business_name, phone")
        .eq("id", gpId)
        .single(),
      supabase
        .from("gp_offers")
        .select("origin_city, destination_city")
        .eq("gp_id", gpId)
        .order("departure_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("gp_navettes")
        .select("id, origin_city, origin_country, destination_city, destination_country, is_primary")
        .eq("gp_id", gpId)
        .eq("is_active", true)
        .order("is_primary", { ascending: false }),
    ]);

    if (navData && navData.length > 0) {
      setNavettes(navData);
      setSelectedNavetteIdx(0);
    }

    if (profile) {
      setGpData({
        baseOriginCity: profile.base_origin_city || "",
        baseOriginCountry: profile.base_origin_country || "",
        baseDestCity: profile.base_destination_city || "",
        baseDestCountry: profile.base_destination_country || "",
        basePricePerKg: profile.base_price_per_kg || 0,
        currency: profile.default_currency || "XOF",
        businessName: profile.business_name || "",
        phone: profile.phone || "",
      });

      if (lastOffer && profile.base_origin_city) {
        const lastWasAller = lastOffer.origin_city === profile.base_origin_city;
        setTripType(lastWasAller ? "retour" : "aller");
      }
    }
  };

  if (!gpData) return null;

  // Use selected navette if available, otherwise fall back to base profile route
  const activeNavette = navettes.length > 0 ? navettes[selectedNavetteIdx] : null;
  const baseRoute = activeNavette
    ? { originCity: activeNavette.origin_city, originCountry: activeNavette.origin_country, destCity: activeNavette.destination_city, destCountry: activeNavette.destination_country }
    : { originCity: gpData.baseOriginCity, originCountry: gpData.baseOriginCountry, destCity: gpData.baseDestCity, destCountry: gpData.baseDestCountry };

  const currentRoute = tripType === "aller"
    ? {
        origin: { city: baseRoute.originCity, country: baseRoute.originCountry },
        destination: { city: baseRoute.destCity, country: baseRoute.destCountry },
      }
    : {
        origin: { city: baseRoute.destCity, country: baseRoute.destCountry },
        destination: { city: baseRoute.originCity, country: baseRoute.originCountry },
      };

  const currencySymbol = getCurrencySymbol(gpData.currency as any);
  const getFlag = (code: string) => FLAGS[code] || "";
  const minDate = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const handleSubmit = async () => {
    if (!form.departureDate || totalCapacity <= 0) {
      toast({ title: "Champs requis", description: "Date et au moins 1 bagage requis", variant: "destructive" });
      return;
    }
    if (new Date(form.departureDate) <= new Date()) {
      toast({ title: "Date invalide", description: "La date doit être dans le futur", variant: "destructive" });
      return;
    }

    // Check for existing active offer on the same date AND same route
    const { data: existing } = await supabase
      .from("gp_offers")
      .select("id")
      .eq("gp_id", gpId)
      .eq("status", "active")
      .eq("origin_city", currentRoute.origin.city)
      .eq("destination_city", currentRoute.destination.city)
      .gte("departure_date", form.departureDate + "T00:00:00")
      .lte("departure_date", form.departureDate + "T23:59:59")
      .limit(1);

    if (existing && existing.length > 0) {
      toast({ title: "Départ existant", description: "Vous avez déjà un départ sur cette route à cette date", variant: "destructive" });
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
        expires_at: new Date(form.departureDate).toISOString(),
        price_per_kg: gpData.basePricePerKg,
        currency: gpData.currency,
        total_capacity: totalCapacity,
        available_capacity: totalCapacity,
        flight_number: form.flightNumber || null,
        airline: form.airline || null,
        status: "active",
      });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Doublon", description: "Départ déjà existant à cette date", variant: "destructive" });
          return;
        }
        throw error;
      }
      toast({ title: "Voyage créé", description: `${currentRoute.origin.city} → ${currentRoute.destination.city} · ${totalCapacity} kg` });
      savePrefs(luggage, form.airline);
      
      // Generate flyer data for promo image
      const bookingUrl = "konnektapp.lovable.app";
      setFlyerData({
        originCity: currentRoute.origin.city,
        originCountry: currentRoute.origin.country,
        destinationCity: currentRoute.destination.city,
        destinationCountry: currentRoute.destination.country,
        departureDate: form.departureDate,
        pricePerKg: gpData.basePricePerKg,
        currency: getCurrencySymbol(gpData.currency as any),
        totalCapacity,
        airline: form.airline || undefined,
        flightNumber: form.flightNumber || undefined,
        businessName: gpData.businessName,
        phone: gpData.phone,
        bookingUrl,
      });
      onSuccess();
      onClose();
      // Show flyer after a brief delay so the drawer closes first
      setTimeout(() => setShowFlyer(true), 400);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Drawer open={open} onOpenChange={(o) => !loading && !o && onClose()}>
    
      <DrawerContent className="max-h-[92vh] focus:outline-none [&>div:first-child]:hidden">
        <div className="bg-primary text-primary-foreground px-4 py-3 rounded-t-2xl flex items-center gap-2">
          <div className="mx-auto w-10 h-1 rounded-full bg-primary-foreground/30 mb-2" />
        </div>
        <div className="bg-primary text-primary-foreground px-4 pb-3 -mt-1 flex items-center gap-2">
          <Plane className="w-4 h-4" />
          <h2 className="text-base font-bold">Nouveau voyage</h2>
        </div>

        <div className="px-4 py-4 space-y-4 overflow-y-auto pb-safe" style={{ maxHeight: 'calc(92vh - 56px)' }}>
          
          {/* Navette selector — only if multiple navettes */}
          {navettes.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Navette</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {navettes.map((nav, idx) => (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => { setSelectedNavetteIdx(idx); setTripType("aller"); }}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                      idx === selectedNavetteIdx 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{getFlag(nav.origin_country)}</span>
                    <span>{nav.origin_city}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Route card */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-center gap-4">
            <div className="text-center">
              <span className="text-2xl">{getFlag(currentRoute.origin.country)}</span>
              <p className="text-[11px] font-medium mt-0.5">{currentRoute.origin.city}</p>
            </div>
            <Plane className={`w-4 h-4 text-primary ${tripType === "retour" ? "rotate-180" : ""}`} />
            <div className="text-center">
              <span className="text-2xl">{getFlag(currentRoute.destination.country)}</span>
              <p className="text-[11px] font-medium mt-0.5">{currentRoute.destination.city}</p>
            </div>
          </div>

          {/* Aller / Retour */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={tripType === "aller" ? "default" : "outline"}
              className="h-10 text-xs font-semibold gap-1.5 rounded-lg"
              onClick={() => setTripType("aller")}
            >
              <Plane className="w-3.5 h-3.5" /> Aller
            </Button>
            <Button
              type="button"
              variant={tripType === "retour" ? "default" : "outline"}
              className="h-10 text-xs font-semibold gap-1.5 rounded-lg"
              onClick={() => setTripType("retour")}
            >
              <Luggage className="w-3.5 h-3.5" /> Retour
            </Button>
          </div>

          {/* Date de départ (date only) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date de départ
            </Label>
            <Input
              type="date"
              value={form.departureDate}
              min={minDate}
              onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
              className="h-10 rounded-lg border-2 border-primary/30 focus:border-primary"
            />
          </div>

          {/* Luggage counter */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Luggage className="w-3.5 h-3.5" /> Bagages
            </Label>

            <div className="space-y-1.5">
              {LUGGAGE_PRESETS.map(({ kg, label, sublabel }) => (
                <div
                  key={kg}
                  className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{sublabel}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button" variant="outline" size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => adjustLuggage(kg, -1)}
                      disabled={!luggage[kg]}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <motion.span
                      key={luggage[kg]}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="w-7 text-center text-base font-bold tabular-nums"
                    >
                      {luggage[kg] || 0}
                    </motion.span>
                    <Button
                      type="button" variant="outline" size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => adjustLuggage(kg, 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className={`flex items-center justify-between rounded-lg p-2.5 border ${
              totalCapacity > 0 ? "border-primary bg-primary/10" : "border-border bg-muted/40"
            }`}>
              <span className="text-xs text-muted-foreground">
                {totalBags} bagage{totalBags !== 1 ? "s" : ""}
              </span>
              <span className={`text-lg font-bold ${totalCapacity > 0 ? "text-primary" : "text-muted-foreground"}`}>
                {totalCapacity} kg
              </span>
            </div>
          </div>

          {/* Compagnie + Vol */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Compagnie</Label>
              <AirlineSelect
                value={form.airline}
                onChange={(v) => setForm({ ...form, airline: v })}
                placeholder="Compagnie..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">N° Vol</Label>
              <Input
                placeholder="AF123"
                value={form.flightNumber}
                onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}
                className="h-10 rounded-lg"
              />
            </div>
          </div>

          {/* Date d'arrivée */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Arrivée estimée
            </Label>
            <Input
              type="date"
              value={form.arrivalDate}
              min={form.departureDate || minDate}
              onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
              className="h-10 rounded-lg border-2 border-primary/30 focus:border-primary"
            />
          </div>

          {/* Prix verrouillé */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/60 border text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Prix verrouillé
            </span>
            <span className="font-bold">
              {gpData.basePricePerKg.toLocaleString()} {currencySymbol}/kg
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1 pb-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-11 rounded-lg text-sm font-semibold"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || totalCapacity <= 0}
              className="flex-1 h-11 rounded-lg text-sm font-semibold gap-1.5"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Créer · {totalCapacity} kg
                </>
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>

    <DepartureFlyerSheet
      open={showFlyer}
      onClose={() => setShowFlyer(false)}
      data={flyerData}
    />
    </>
  );
}
