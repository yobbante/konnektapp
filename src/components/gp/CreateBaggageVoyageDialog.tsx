/**
 * CreateBaggageVoyageDialog — Dashboard departure creation
 * 
 * RULES:
 * - Fetches GP's locked route & pricing from DB
 * - Route is NOT editable (navette fixe)
 * - Price is NOT editable (locked at registration)
 * - Only capacity, dates, flight info are editable
 */
import { useState, useEffect } from "react";
import { Plane, Weight, Calendar, Clock, CheckCircle, MapPin, Info } from "lucide-react";
import { motion } from "framer-motion";
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
import { getCurrencySymbol } from "@/components/ui/currency-selector";

const FLAGS: Record<string, string> = {
  FR: "🇫🇷", SN: "🇸🇳", CI: "🇨🇮", CM: "🇨🇲", ML: "🇲🇱", US: "🇺🇸", CA: "🇨🇦",
  AE: "🇦🇪", GB: "🇬🇧", BE: "🇧🇪", MA: "🇲🇦", TN: "🇹🇳", GA: "🇬🇦", CG: "🇨🇬",
  DE: "🇩🇪", ES: "🇪🇸", IT: "🇮🇹", CH: "🇨🇭", NL: "🇳🇱", GN: "🇬🇳",
};

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
  const [tripType, setTripType] = useState<"aller" | "retour">("aller");
  
  // GP locked data (fetched from DB)
  const [gpData, setGpData] = useState<{
    baseOriginCity: string;
    baseOriginCountry: string;
    baseDestCity: string;
    baseDestCountry: string;
    basePricePerKg: number;
    currency: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    departureDate: "",
    arrivalDate: "",
    expiresAt: "",
    totalCapacity: "23",
    flightNumber: "",
    airline: "",
  });

  // Fetch GP's locked route & pricing
  useEffect(() => {
    if (open && gpId) {
      loadGpData();
    }
  }, [open, gpId]);

  const loadGpData = async () => {
    const { data } = await supabase
      .from("gp_profiles")
      .select("base_origin_city, base_origin_country, base_destination_city, base_destination_country, base_price_per_kg, default_currency")
      .eq("id", gpId)
      .single();

    if (data) {
      setGpData({
        baseOriginCity: data.base_origin_city || "",
        baseOriginCountry: data.base_origin_country || "",
        baseDestCity: data.base_destination_city || "",
        baseDestCountry: data.base_destination_country || "",
        basePricePerKg: data.base_price_per_kg || 0,
        currency: data.default_currency || "XOF",
      });
    }
  };

  // Smart pre-fill trip type from last voyage
  useEffect(() => {
    if (open && lastVoyage && gpData) {
      const lastWasAller = lastVoyage.origin_city === gpData.baseOriginCity;
      setTripType(lastWasAller ? "retour" : "aller");
    } else if (open) {
      setTripType("aller");
    }
    setFormData({ departureDate: "", arrivalDate: "", expiresAt: "", totalCapacity: "23", flightNumber: "", airline: "" });
  }, [open, lastVoyage, gpData]);

  if (!gpData) return null;

  const currentRoute = tripType === "aller"
    ? { origin: { city: gpData.baseOriginCity, country: gpData.baseOriginCountry }, destination: { city: gpData.baseDestCity, country: gpData.baseDestCountry } }
    : { origin: { city: gpData.baseDestCity, country: gpData.baseDestCountry }, destination: { city: gpData.baseOriginCity, country: gpData.baseOriginCountry } };

  const currencySymbol = getCurrencySymbol(gpData.currency as any);
  const getFlag = (code: string) => FLAGS[code] || "🌍";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.departureDate || !formData.totalCapacity) {
      toast({ title: "Champs requis", description: "Date et capacité sont obligatoires", variant: "destructive" });
      return;
    }

    if (new Date(formData.departureDate) <= new Date()) {
      toast({ title: "Date invalide", description: "La date doit être dans le futur", variant: "destructive" });
      return;
    }

    // Expiration: defaults to departure date (offer hidden after this date)
    const effectiveExpiresAt = formData.expiresAt || formData.departureDate;
    const expiresDate = new Date(effectiveExpiresAt);
    const departureDate = new Date(formData.departureDate);

    if (expiresDate <= new Date()) {
      toast({ title: "Date invalide", description: "La date de fin doit être dans le futur", variant: "destructive" });
      return;
    }

    if (expiresDate > departureDate) {
      toast({ title: "Date invalide", description: "La date de fin doit être avant le départ", variant: "destructive" });
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
        departure_date: formData.departureDate,
        arrival_date: formData.arrivalDate || null,
        expires_at: effectiveExpiresAt,
        price_per_kg: gpData.basePricePerKg,
        currency: gpData.currency,
        total_capacity: parseFloat(formData.totalCapacity),
        available_capacity: parseFloat(formData.totalCapacity),
        flight_number: formData.flightNumber || null,
        airline: formData.airline || null,
        status: "active",
      });

      if (error) throw error;

      toast({
        title: "Voyage cree",
        description: `${currentRoute.origin.city} → ${currentRoute.destination.city}`,
      });
      onSuccess();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible de créer le voyage", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-5">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Plane className="w-5 h-5" />
            Nouveau voyage
          </DialogTitle>
          <p className="text-sm opacity-90 mt-1">
            {currentRoute.origin.city} → {currentRoute.destination.city}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Locked route visual */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <span className="text-3xl">{getFlag(currentRoute.origin.country)}</span>
                  <p className="text-sm font-bold mt-1">{currentRoute.origin.city}</p>
                </div>
                <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Plane className={`w-6 h-6 text-primary ${tripType === "retour" ? "rotate-180" : ""}`} />
                </motion.div>
                <div className="text-center">
                  <span className="text-3xl">{getFlag(currentRoute.destination.country)}</span>
                  <p className="text-sm font-bold mt-1">{currentRoute.destination.city}</p>
                </div>
              </div>
              <div className="flex items-center justify-center mt-2">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <MapPin className="w-3 h-3" /> Navette verrouillée
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Trip type */}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={tripType === "aller" ? "default" : "outline"} className="h-12" onClick={() => setTripType("aller")}>
              <Plane className="w-4 h-4 mr-2" /> Aller
            </Button>
            <Button type="button" variant={tripType === "retour" ? "default" : "outline"} className="h-12" onClick={() => setTripType("retour")}>
              <Plane className="w-4 h-4 mr-2 rotate-180" /> Retour
            </Button>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Départ *</Label>
              <Input
                type="datetime-local"
                value={formData.departureDate}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => {
                  const next = e.target.value;
                  setFormData((p) => ({
                    ...p,
                    departureDate: next,
                    expiresAt: p.expiresAt || next,
                  }));
                }}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Arrivée</Label>
              <Input
                type="datetime-local"
                value={formData.arrivalDate}
                min={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Fin annonce *</Label>
              <Input
                type="datetime-local"
                value={formData.expiresAt}
                min={new Date().toISOString().slice(0, 16)}
                max={formData.departureDate || undefined}
                onChange={(e) => setFormData((p) => ({ ...p, expiresAt: e.target.value }))}
                className="h-10"
              />
            </div>
          </div>

          {/* Flight info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Compagnie</Label>
              <Input placeholder="Air Sénégal..." value={formData.airline} onChange={(e) => setFormData({ ...formData, airline: e.target.value })} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">N° Vol</Label>
              <Input placeholder="AF123" value={formData.flightNumber} onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })} className="h-10" />
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2"><Weight className="w-4 h-4" /> Capacité (kg) *</Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Ex: 30"
              className="h-12 text-lg"
              value={formData.totalCapacity}
              onChange={(e) => setFormData({ ...formData, totalCapacity: e.target.value })}
            />
          </div>

          {/* Locked price info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4" /> Prix verrouillé
            </span>
            <span className="font-bold text-sm">{gpData.basePricePerKg.toLocaleString()} {currencySymbol}/kg</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12">
              Annuler
            </Button>
            <Button type="submit" className="flex-1 h-12" disabled={loading}>
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <><CheckCircle className="w-5 h-5 mr-2" /> Créer</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
