/**
 * MaritimePublierPage — Publish maritime departures
 * 
 * Supports: Groupage LCL, Conteneur FCL, Véhicule, Devis libre
 * Uses gp_offers with transport_type = 'maritime'
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Ship, ArrowLeft, Calendar, MapPin, DollarSign, Package, Anchor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

type MaritimeType = "lcl" | "fcl" | "vehicle" | "bulk";

const maritimeTypes: { value: MaritimeType; label: string; icon: string; desc: string }[] = [
  { value: "lcl", label: "Groupage LCL", icon: "📦", desc: "Réservation au m³" },
  { value: "fcl", label: "Conteneur FCL", icon: "🏗️", desc: "20ft / 40ft dédié" },
  { value: "vehicle", label: "Véhicule", icon: "🚗", desc: "RoRo ou conteneur" },
  { value: "bulk", label: "Vrac / Divers", icon: "📋", desc: "Marchandise diverse" },
];

const containerTypes = ["20ft Standard", "40ft Standard", "40ft High Cube", "20ft Reefer", "40ft Reefer", "Flat Rack", "Open Top"];

export default function MaritimePublierPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [navettes, setNavettes] = useState<Array<{ origin_city: string; origin_country: string; destination_city: string; destination_country: string }>>([]);

  const [maritimeType, setMaritimeType] = useState<MaritimeType>("lcl");
  const [portDepart, setPortDepart] = useState("");
  const [portArrivee, setPortArrivee] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [capacityM3, setCapacityM3] = useState("");
  const [pricePerM3, setPricePerM3] = useState("");
  const [containerType, setContainerType] = useState("20ft Standard");
  const [currency, setCurrency] = useState("EUR");
  const [description, setDescription] = useState("");

  const isPremiumOrPro = gpProfile?.subscription === "premium" || gpProfile?.subscription === "pro";

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: gp } = await supabase
        .from("gp_profiles").select("*").eq("user_id", user.id).eq("gp_type", "maritime").maybeSingle();
      if (!gp) { navigate("/transporteur/inscription"); return; }
      setGpProfile(gp);
      setCurrency(gp.default_currency || "EUR");

      if (gp.subscription === "premium" || gp.subscription === "pro") {
        const { data: navData } = await supabase.from("gp_navettes")
          .select("origin_city, origin_country, destination_city, destination_country")
          .eq("gp_id", gp.id).eq("is_active", true);
        setNavettes(navData || []);
      }
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async () => {
    if (!portDepart || !portArrivee || !departureDate || !capacityM3 || !pricePerM3) {
      toast({ title: "Champs requis", description: "Remplissez tous les champs obligatoires", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const capacity = parseFloat(capacityM3);
      const price = parseFloat(pricePerM3);

      const desc = `[${maritimeType.toUpperCase()}] ${containerType ? containerType + " · " : ""}${description}`.trim();

      const { error } = await supabase.from("gp_offers").insert({
        gp_id: gpProfile.id,
        transport_type: "maritime" as any,
        origin_city: portDepart,
        origin_country: "France",
        destination_city: portArrivee,
        destination_country: "Sénégal",
        departure_date: departureDate,
        arrival_date: arrivalDate || null,
        total_capacity: capacity,
        available_capacity: capacity,
        price_per_kg: price, // reused field — represents price per m³ for maritime
        currency,
        description: desc,
        status: "active" as any,
      });

      if (error) throw error;

      toast({ title: "🚢 Départ publié !", description: `${portDepart} → ${portArrivee}` });
      navigate("/maritime/apercu");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <TransportPageLoader message="Chargement..." vehicle="truck" />;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-primary to-primary/90 shadow-lg" style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}>
        <div className="px-3 py-2.5 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-white" />
            <h1 className="text-white font-bold text-sm">Publier un départ maritime</h1>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">

        {/* Maritime Type */}
        <div className="space-y-2">
          <Label className="text-xs font-bold">Type d'expédition</Label>
          <div className="grid grid-cols-2 gap-2">
            {maritimeTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setMaritimeType(t.value)}
                className={`p-3 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                  maritimeType === t.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                }`}
              >
                <span className="text-lg">{t.icon}</span>
                <p className="text-xs font-semibold mt-1">{t.label}</p>
                <p className="text-[9px] text-muted-foreground">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Container type (FCL only) */}
        {maritimeType === "fcl" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Type de conteneur</Label>
            <Select value={containerType} onValueChange={setContainerType}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {containerTypes.map((ct) => (
                  <SelectItem key={ct} value={ct} className="text-xs">{ct}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Ports */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1"><MapPin className="w-3 h-3" /> Port départ</Label>
            <Input value={portDepart} onChange={e => setPortDepart(e.target.value)} placeholder="Marseille" className="h-9 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1"><Anchor className="w-3 h-3" /> Port arrivée</Label>
            <Input value={portArrivee} onChange={e => setPortArrivee(e.target.value)} placeholder="Dakar" className="h-9 text-xs" />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1"><Calendar className="w-3 h-3" /> Date départ</Label>
            <Input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1"><Calendar className="w-3 h-3" /> Arrivée estimée</Label>
            <Input type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>

        {/* Capacity & Price */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1"><Package className="w-3 h-3" /> Capacité (m³)</Label>
            <Input type="number" value={capacityM3} onChange={e => setCapacityM3(e.target.value)} placeholder="33" className="h-9 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1"><DollarSign className="w-3 h-3" /> Prix / m³ ({currency})</Label>
            <Input type="number" value={pricePerM3} onChange={e => setPricePerM3(e.target.value)} placeholder="150" className="h-9 text-xs" />
          </div>
        </div>

        {/* Currency */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Devise</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["EUR", "USD", "XOF", "GBP", "MAD", "AED"].map((c) => (
                <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Notes / conditions</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails, restrictions, services inclus..." className="text-xs min-h-[60px]" />
        </div>

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-11 text-sm font-bold gap-2">
          {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Ship className="w-4 h-4" />}
          Publier le départ
        </Button>
      </div>
    </div>
  );
}
