/**
 * AerienPublierPage — Publish air cargo departure with weight tiers,
 * chargeable weight logic, surcharges, and capacity management.
 * Stores into air_departures table.
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, ArrowLeft, Calendar, Weight, DollarSign, MapPin, Plus, Trash2, Calculator, TrendingUp, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SearchableCitySelect } from "@/components/gp/SearchableCitySelect";

const DEFAULT_TIERS = [
  { min_kg: 0, max_kg: 45, price_per_kg: 6000 },
  { min_kg: 45, max_kg: 100, price_per_kg: 5200 },
  { min_kg: 100, max_kg: 300, price_per_kg: 4500 },
  { min_kg: 300, max_kg: 99999, price_per_kg: 4000 },
];

const CARGO_TYPES = [
  { id: "general", label: "Général" },
  { id: "electronics", label: "Électronique" },
  { id: "textiles", label: "Textiles" },
  { id: "perishable", label: "Périssable" },
  { id: "pharmaceuticals", label: "Pharmaceutique" },
  { id: "dangerous", label: "Mat. dangereuses" },
];

export default function AerienPublierPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [useTiers, setUseTiers] = useState(true);

  const [form, setForm] = useState({
    originCity: "", originCountry: "CN",
    originAirport: "",
    destinationCity: "", destinationCountry: "SN",
    destinationAirport: "",
    departureDate: "", arrivalDate: "", cargoCutoffDate: "",
    totalCapacityKg: "", minWeightKg: "1",
    pricePerKg: "5000", currency: "FCFA",
    airline: "", flightNumber: "",
    fuelSurcharge: "0", securitySurcharge: "0",
    handlingFee: "0", documentationFee: "0",
    transitTimeDays: "",
    description: "",
  });

  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [cargoTypes, setCargoTypes] = useState(["general", "electronics", "textiles"]);

  // Simulator state
  const [simWeight, setSimWeight] = useState(80);
  const [simL, setSimL] = useState(80);
  const [simW, setSimW] = useState(60);
  const [simH, setSimH] = useState(50);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: gp } = await supabase
        .from("gp_profiles").select("*").eq("user_id", user.id)
        .in("gp_type", ["aerien", "agence"]).maybeSingle();
      if (!gp) { navigate("/transporteur/inscription"); return; }
      setGpProfile(gp);
      if (gp.base_origin_city) setForm(f => ({ ...f, originCity: gp.base_origin_city }));
      if (gp.base_destination_city) setForm(f => ({ ...f, destinationCity: gp.base_destination_city }));
      if (gp.default_currency) setForm(f => ({ ...f, currency: gp.default_currency }));
    })();
  }, []);

  // Chargeable weight simulator
  const simResult = useMemo(() => {
    const volWeight = (simL * simW * simH) / 6000;
    const chargeableWeight = Math.max(simWeight, volWeight);

    let pricePerKg = parseFloat(form.pricePerKg) || 0;
    if (useTiers && tiers.length > 0) {
      const tier = tiers.find(t => chargeableWeight >= t.min_kg && chargeableWeight < t.max_kg);
      pricePerKg = tier?.price_per_kg || tiers[tiers.length - 1].price_per_kg;
    }

    const airFreight = chargeableWeight * pricePerKg;
    const fuel = parseFloat(form.fuelSurcharge) || 0;
    const security = parseFloat(form.securitySurcharge) || 0;
    const handling = parseFloat(form.handlingFee) || 0;
    const doc = parseFloat(form.documentationFee) || 0;
    const total = airFreight + fuel + security + handling + doc;

    return { volWeight: Math.round(volWeight * 10) / 10, chargeableWeight: Math.round(chargeableWeight * 10) / 10, pricePerKg, airFreight, fuel, security, handling, doc, total };
  }, [simWeight, simL, simW, simH, form.pricePerKg, form.fuelSurcharge, form.securitySurcharge, form.handlingFee, form.documentationFee, useTiers, tiers]);

  const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    setTiers([...tiers, { min_kg: last?.max_kg || 0, max_kg: (last?.max_kg || 0) + 100, price_per_kg: (last?.price_per_kg || 5000) - 500 }]);
  };

  const removeTier = (i: number) => setTiers(tiers.filter((_, idx) => idx !== i));

  const updateTier = (i: number, field: string, val: number) => {
    setTiers(tiers.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  };

  const handleSubmit = async () => {
    if (!gpProfile) return;
    if (!form.originCity || !form.destinationCity || !form.departureDate || !form.totalCapacityKg) {
      toast({ title: "Champs requis manquants", variant: "destructive" }); return;
    }
    if (new Date(form.departureDate) <= new Date()) {
      toast({ title: "La date de départ doit être dans le futur", variant: "destructive" }); return;
    }

    setLoading(true);
    try {
      const cap = parseFloat(form.totalCapacityKg);
      const { error } = await supabase.from("air_departures" as any).insert({
        gp_id: gpProfile.id,
        origin_city: form.originCity, origin_country: form.originCountry, origin_airport: form.originAirport || null,
        destination_city: form.destinationCity, destination_country: form.destinCountry, destination_airport: form.destinationAirport || null,
        airline: form.airline || null, flight_number: form.flightNumber || null,
        departure_date: form.departureDate, arrival_date: form.arrivalDate || null,
        cargo_cutoff_date: form.cargoCutoffDate || null,
        total_capacity_kg: cap, available_capacity_kg: cap,
        min_weight_kg: parseFloat(form.minWeightKg) || 1,
        price_per_kg: parseFloat(form.pricePerKg) || 0, currency: form.currency,
        weight_tiers: useTiers ? tiers : [],
        fuel_surcharge: parseFloat(form.fuelSurcharge) || 0,
        security_surcharge: parseFloat(form.securitySurcharge) || 0,
        handling_fee: parseFloat(form.handlingFee) || 0,
        documentation_fee: parseFloat(form.documentationFee) || 0,
        cargo_types_accepted: cargoTypes,
        transit_time_days: form.transitTimeDays ? parseInt(form.transitTimeDays) : null,
        description: form.description || null,
        status: "active",
      } as any);

      if (error) throw error;
      toast({ title: "Vol cargo publié ✓", description: `${form.originCity} → ${form.destinationCity}` });
      navigate("/aerien/apercu");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-primary shadow-lg" style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}>
        <div className="px-3 py-2.5 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Plane className="w-5 h-5 text-white" />
          <h1 className="text-white font-bold text-sm">Publier un départ aérien</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 pb-24 max-w-lg mx-auto">

        {/* Route */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="text-xs font-bold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" /> Itinéraire</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Ville départ</Label>
                <SearchableCitySelect value={form.originCity} countryCode={form.originCountry}
                  onSelect={(city, cc) => setForm(f => ({ ...f, originCity: city, originCountry: cc === "XX" ? f.originCountry : cc }))} placeholder="Guangzhou" />
              </div>
              <div>
                <Label className="text-[10px]">Aéroport origine</Label>
                <Input className="h-8 text-xs" placeholder="CAN" value={form.originAirport}
                  onChange={e => setForm(f => ({ ...f, originAirport: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px]">Ville arrivée</Label>
                <SearchableCitySelect value={form.destinationCity} countryCode={form.destinationCountry}
                  onSelect={(city, cc) => setForm(f => ({ ...f, destinationCity: city, destinationCountry: cc === "XX" ? f.destinationCountry : cc }))} placeholder="Dakar" />
              </div>
              <div>
                <Label className="text-[10px]">Aéroport destination</Label>
                <Input className="h-8 text-xs" placeholder="DSS" value={form.destinationAirport}
                  onChange={e => setForm(f => ({ ...f, destinationAirport: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flight info */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="text-xs font-bold flex items-center gap-1.5"><Plane className="w-3.5 h-3.5 text-primary" /> Vol</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Compagnie</Label>
                <Input className="h-8 text-xs" placeholder="Emirates SkyCargo" value={form.airline}
                  onChange={e => setForm(f => ({ ...f, airline: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px]">N° vol</Label>
                <Input className="h-8 text-xs" placeholder="EK789" value={form.flightNumber}
                  onChange={e => setForm(f => ({ ...f, flightNumber: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">Date départ *</Label>
                <Input type="date" className="h-8 text-xs" value={form.departureDate}
                  onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px]">Date arrivée</Label>
                <Input type="date" className="h-8 text-xs" value={form.arrivalDate}
                  onChange={e => setForm(f => ({ ...f, arrivalDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px]">Cut-off cargo</Label>
                <Input type="date" className="h-8 text-xs" value={form.cargoCutoffDate}
                  onChange={e => setForm(f => ({ ...f, cargoCutoffDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-[10px]">Temps de transit (jours)</Label>
              <Input type="number" className="h-8 text-xs w-24" placeholder="3" value={form.transitTimeDays}
                onChange={e => setForm(f => ({ ...f, transitTimeDays: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        {/* Capacity */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="text-xs font-bold flex items-center gap-1.5"><Weight className="w-3.5 h-3.5 text-primary" /> Capacité</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Capacité totale (kg) *</Label>
                <Input type="number" className="h-8 text-xs" placeholder="800" value={form.totalCapacityKg}
                  onChange={e => setForm(f => ({ ...f, totalCapacityKg: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px]">Poids minimum (kg)</Label>
                <Input type="number" className="h-8 text-xs" placeholder="1" value={form.minWeightKg}
                  onChange={e => setForm(f => ({ ...f, minWeightKg: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weight tier pricing */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-primary" /> Tarification par paliers
              </h3>
              <div className="flex items-center gap-2">
                <Label className="text-[10px]">Paliers</Label>
                <Switch checked={useTiers} onCheckedChange={setUseTiers} />
              </div>
            </div>

            {!useTiers ? (
              <div>
                <Label className="text-[10px]">Prix unique / kg ({form.currency})</Label>
                <Input type="number" className="h-8 text-xs w-32" value={form.pricePerKg}
                  onChange={e => setForm(f => ({ ...f, pricePerKg: e.target.value }))} />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Info className="w-3 h-3" />
                  Plus le poids est élevé, plus le tarif au kg baisse (standard IATA)
                </div>
                {tiers.map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input type="number" className="h-7 text-[10px] w-16" value={t.min_kg}
                      onChange={e => updateTier(i, "min_kg", +e.target.value)} />
                    <span className="text-[9px] text-muted-foreground">→</span>
                    <Input type="number" className="h-7 text-[10px] w-16" value={t.max_kg === 99999 ? "" : t.max_kg}
                      placeholder="∞" onChange={e => updateTier(i, "max_kg", +e.target.value || 99999)} />
                    <span className="text-[9px] text-muted-foreground">kg</span>
                    <Input type="number" className="h-7 text-[10px] w-20 font-medium" value={t.price_per_kg}
                      onChange={e => updateTier(i, "price_per_kg", +e.target.value)} />
                    <span className="text-[9px] text-muted-foreground">/kg</span>
                    {tiers.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTier(i)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={addTier}>
                  <Plus className="w-3 h-3" /> Ajouter palier
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Surcharges */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="text-xs font-bold flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" /> Frais supplémentaires ({form.currency})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "fuelSurcharge", label: "Surcharge carburant" },
                { key: "securitySurcharge", label: "Frais sécurité" },
                { key: "handlingFee", label: "Manutention" },
                { key: "documentationFee", label: "Documentation (AWB)" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label className="text-[10px]">{label}</Label>
                  <Input type="number" className="h-8 text-xs" placeholder="0"
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cargo types */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <h3 className="text-xs font-bold">Types de cargaison acceptés</h3>
            <div className="flex flex-wrap gap-1.5">
              {CARGO_TYPES.map(ct => (
                <button key={ct.id} type="button"
                  onClick={() => setCargoTypes(prev => prev.includes(ct.id) ? prev.filter(x => x !== ct.id) : [...prev, ct.id])}
                  className={`text-[10px] px-2 py-1 rounded-md border transition-all ${
                    cargoTypes.includes(ct.id) ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50"
                  }`}>
                  {ct.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Simulator - Chargeable Weight */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Simulateur — Poids taxable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Poids (kg)</Label>
                <Input type="number" value={simWeight || ""} onChange={e => setSimWeight(+e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">L (cm)</Label>
                <Input type="number" value={simL || ""} onChange={e => setSimL(+e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">l (cm)</Label>
                <Input type="number" value={simW || ""} onChange={e => setSimW(+e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">H (cm)</Label>
                <Input type="number" value={simH || ""} onChange={e => setSimH(+e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Poids réel</span><span>{simWeight} kg</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Poids volumétrique (L×l×H / 6000)</span><span>{simResult.volWeight} kg</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Poids taxable</span>
                <Badge variant="outline" className="text-primary">{simResult.chargeableWeight} kg</Badge>
              </div>

              <Separator />

              <div className="flex justify-between text-muted-foreground">
                <span>Air freight ({simResult.chargeableWeight} kg × {fmt(simResult.pricePerKg)})</span>
                <span>{fmt(simResult.airFreight)} {form.currency}</span>
              </div>
              {simResult.fuel > 0 && <div className="flex justify-between text-muted-foreground"><span>Surcharge carburant</span><span>{fmt(simResult.fuel)}</span></div>}
              {simResult.security > 0 && <div className="flex justify-between text-muted-foreground"><span>Frais sécurité</span><span>{fmt(simResult.security)}</span></div>}
              {simResult.handling > 0 && <div className="flex justify-between text-muted-foreground"><span>Manutention</span><span>{fmt(simResult.handling)}</span></div>}
              {simResult.doc > 0 && <div className="flex justify-between text-muted-foreground"><span>Documentation</span><span>{fmt(simResult.doc)}</span></div>}

              <Separator />
              <div className="flex justify-between font-semibold text-sm pt-1">
                <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Total client</span>
                <span className="text-primary">{fmt(simResult.total)} {form.currency}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <Label className="text-[10px]">Description / conditions</Label>
            <Textarea className="text-xs min-h-[60px]" placeholder="Restrictions, conditions d'acceptation..."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </CardContent>
        </Card>

        <Button className="w-full h-10" onClick={handleSubmit} disabled={loading}>
          {loading ? "Publication..." : "Publier le vol cargo"}
        </Button>
      </div>
    </div>
  );
}
