/**
 * MaritimePublierPage — Publish maritime departures (LCL/FCL/Vehicle/Bulk)
 * Uses maritime_departures table with all specialized fields
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Ship, ArrowLeft, Calendar, MapPin, DollarSign, Package, Anchor, Clock, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { Badge } from "@/components/ui/badge";

type MaritimeType = "lcl" | "fcl" | "vehicle" | "bulk";

const maritimeTypes: { value: MaritimeType; label: string; icon: string; desc: string }[] = [
  { value: "lcl", label: "Groupage LCL", icon: "📦", desc: "Consolidation au m³" },
  { value: "fcl", label: "Conteneur FCL", icon: "🏗️", desc: "20ft / 40ft dédié" },
  { value: "vehicle", label: "Véhicule", icon: "🚗", desc: "RoRo ou conteneur" },
  { value: "bulk", label: "Vrac / Divers", icon: "📋", desc: "Marchandise diverse" },
];

const containerTypes = ["20ft Standard", "40ft Standard", "40ft High Cube", "20ft Reefer", "40ft Reefer", "Flat Rack", "Open Top"];

const cargoTypeOptions = ["Effets personnels", "Électronique", "Textile", "Pièces auto", "Alimentaire", "Matériaux construction", "Machines", "Divers"];

export default function MaritimePublierPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [navettes, setNavettes] = useState<Array<{ origin_city: string; origin_country: string; destination_city: string; destination_country: string }>>([]);

  const [maritimeType, setMaritimeType] = useState<MaritimeType>("lcl");
  const [portDepart, setPortDepart] = useState("");
  const [originCountry, setOriginCountry] = useState("Chine");
  const [portArrivee, setPortArrivee] = useState("");
  const [destCountry, setDestCountry] = useState("Sénégal");
  const [departureDate, setDepartureDate] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [cutoffDate, setCutoffDate] = useState("");
  const [capacityM3, setCapacityM3] = useState("");
  const [minVolumeM3, setMinVolumeM3] = useState("1");
  const [pricePerM3, setPricePerM3] = useState("");
  const [priceTotal, setPriceTotal] = useState("");
  const [containerType, setContainerType] = useState("20ft Standard");
  const [transitDays, setTransitDays] = useState("");
  const [currency, setCurrency] = useState("XOF");
  const [selectedCargoTypes, setSelectedCargoTypes] = useState<string[]>([]);
  const [conditions, setConditions] = useState("");
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
      setCurrency(gp.default_currency || "XOF");

      if (gp.subscription === "premium" || gp.subscription === "pro") {
        const { data: navData } = await supabase.from("gp_navettes")
          .select("origin_city, origin_country, destination_city, destination_country")
          .eq("gp_id", gp.id).eq("is_active", true);
        setNavettes(navData || []);
      }
      setLoading(false);
    })();
  }, []);

  const toggleCargoType = (ct: string) => {
    setSelectedCargoTypes(prev =>
      prev.includes(ct) ? prev.filter(c => c !== ct) : [...prev, ct]
    );
  };

  const handleSubmit = async () => {
    if (!portDepart || !portArrivee || !departureDate || !capacityM3) {
      toast({ title: "Champs requis", description: "Remplissez tous les champs obligatoires", variant: "destructive" });
      return;
    }

    if (maritimeType === "lcl" && !pricePerM3) {
      toast({ title: "Prix requis", description: "Indiquez le prix par m³", variant: "destructive" });
      return;
    }

    if (maritimeType === "fcl" && !priceTotal) {
      toast({ title: "Prix requis", description: "Indiquez le prix du conteneur", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const capacity = parseFloat(capacityM3);

      const { error } = await supabase.from("maritime_departures").insert([{
        gp_id: gpProfile.id,
        maritime_type: maritimeType,
        origin_port: portDepart,
        origin_country: originCountry,
        destination_port: portArrivee,
        destination_country: destCountry,
        departure_date: departureDate,
        arrival_date: arrivalDate || null,
        cargo_cutoff_date: cutoffDate || null,
        total_capacity_m3: capacity,
        available_capacity_m3: capacity,
        min_volume_m3: parseFloat(minVolumeM3) || 1,
        price_per_m3: maritimeType === "lcl" ? parseFloat(pricePerM3) : 0,
        price_total: maritimeType === "fcl" ? parseFloat(priceTotal) : 0,
        currency,
        container_type: maritimeType === "fcl" ? containerType : null,
        transit_days: transitDays ? parseInt(transitDays) : null,
        cargo_types_accepted: selectedCargoTypes,
        conditions: conditions || null,
        description: description || null,
        status: "active",
      }]);

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
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-primary-foreground" />
            <h1 className="text-primary-foreground font-bold text-sm">Publier un départ maritime</h1>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">

        {/* Maritime Type Selector */}
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

        {/* Navette picker for subscribers */}
        {isPremiumOrPro && navettes.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Choisir une ligne</Label>
            <div className="flex flex-wrap gap-1.5">
              {navettes.map((nav, i) => (
                <button key={i} type="button"
                  onClick={() => { setPortDepart(nav.origin_city); setPortArrivee(nav.destination_city); }}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
                    portDepart === nav.origin_city && portArrivee === nav.destination_city
                      ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50"
                  }`}>
                  {nav.origin_city} → {nav.destination_city}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ports + Countries */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold">Itinéraire</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Port d'origine</Label>
                <Input value={portDepart} onChange={e => setPortDepart(e.target.value)} placeholder="Shenzhen" className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Pays</Label>
                <Input value={originCountry} onChange={e => setOriginCountry(e.target.value)} placeholder="Chine" className="h-9 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Port de destination</Label>
                <Input value={portArrivee} onChange={e => setPortArrivee(e.target.value)} placeholder="Dakar" className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Pays</Label>
                <Input value={destCountry} onChange={e => setDestCountry(e.target.value)} placeholder="Sénégal" className="h-9 text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold">Dates</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Départ navire *</Label>
                <Input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-500" /> Cut-off cargo
                </Label>
                <Input type="date" value={cutoffDate} onChange={e => setCutoffDate(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Arrivée estimée</Label>
                <Input type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> Transit (jours)
                </Label>
                <Input type="number" value={transitDays} onChange={e => setTransitDays(e.target.value)} placeholder="28" className="h-9 text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capacity & Price */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold">Capacité & Tarif</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Capacité totale (m³) *</Label>
                <Input type="number" value={capacityM3} onChange={e => setCapacityM3(e.target.value)} placeholder="33" className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Volume minimum (m³)</Label>
                <Input type="number" value={minVolumeM3} onChange={e => setMinVolumeM3(e.target.value)} placeholder="1" className="h-9 text-xs" />
              </div>
            </div>

            {/* LCL pricing */}
            {(maritimeType === "lcl" || maritimeType === "vehicle" || maritimeType === "bulk") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Prix / m³ *</Label>
                  <Input type="number" value={pricePerM3} onChange={e => setPricePerM3(e.target.value)} placeholder="95000" className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Devise</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["XOF", "EUR", "USD", "GBP", "MAD", "AED", "CNY"].map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* FCL pricing */}
            {maritimeType === "fcl" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Prix conteneur *</Label>
                  <Input type="number" value={priceTotal} onChange={e => setPriceTotal(e.target.value)} placeholder="3400000" className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Devise</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["XOF", "EUR", "USD", "GBP", "MAD", "AED", "CNY"].map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Simulator preview */}
            {capacityM3 && (maritimeType === "lcl" ? pricePerM3 : priceTotal) && (
              <div className="bg-muted/50 rounded-lg p-2.5 border border-border/50">
                <div className="flex items-center gap-1 mb-1">
                  <Info className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-bold text-primary">Aperçu</span>
                </div>
                {maritimeType === "lcl" ? (
                  <p className="text-[11px] text-foreground">
                    {parseFloat(capacityM3)} m³ disponibles à <strong>{parseInt(pricePerM3).toLocaleString()} {currency}/m³</strong>
                    <br />
                    <span className="text-muted-foreground">Revenu max : {(parseFloat(capacityM3) * parseFloat(pricePerM3)).toLocaleString()} {currency}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-foreground">
                    Conteneur {containerType} — <strong>{parseInt(priceTotal).toLocaleString()} {currency}</strong>
                    <br />
                    <span className="text-muted-foreground">{parseFloat(capacityM3)} m³ de capacité</span>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cargo types */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Types de cargaison acceptés</Label>
          <div className="flex flex-wrap gap-1.5">
            {cargoTypeOptions.map((ct) => (
              <button
                key={ct}
                type="button"
                onClick={() => toggleCargoType(ct)}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                  selectedCargoTypes.includes(ct)
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:border-primary/30 text-muted-foreground"
                }`}
              >
                {ct}
              </button>
            ))}
          </div>
        </div>

        {/* Conditions / Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Conditions & notes</Label>
          <Textarea value={conditions} onChange={e => setConditions(e.target.value)} placeholder="Restrictions, services inclus, douane, assurance..." className="text-xs min-h-[60px]" />
        </div>

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-11 text-sm font-bold gap-2">
          {submitting ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Ship className="w-4 h-4" />}
          Publier le départ
        </Button>
      </div>
    </div>
  );
}
