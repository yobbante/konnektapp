/**
 * AerienPublierPage — Publish air cargo departure
 * Reuses gp_offers with transport_type: 'aerien'
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, ArrowLeft, Calendar, Weight, DollarSign, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SearchableCitySelect } from "@/components/gp/SearchableCitySelect";

export default function AerienPublierPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [navettes, setNavettes] = useState<Array<{ origin_city: string; origin_country: string; destination_city: string; destination_country: string }>>([]);

  const [form, setForm] = useState({
    originCity: "",
    originCountry: "FR",
    destinationCity: "",
    destinationCountry: "SN",
    departureDate: "",
    arrivalDate: "",
    expiresAt: "",
    totalCapacity: "",
    pricePerKg: "",
    currency: "EUR",
    airline: "",
    flightNumber: "",
    description: "",
  });

  const isPremiumOrPro = gpProfile?.subscription === "premium" || gpProfile?.subscription === "pro";

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

      // Load navettes for subscribers
      if (gp.subscription === "premium" || gp.subscription === "pro") {
        const { data: navData } = await supabase.from("gp_navettes")
          .select("origin_city, origin_country, destination_city, destination_country")
          .eq("gp_id", gp.id).eq("is_active", true);
        setNavettes(navData || []);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!gpProfile) return;
    if (!form.originCity || !form.destinationCity || !form.departureDate || !form.totalCapacity || !form.pricePerKg) {
      toast({ title: "Champs requis manquants", variant: "destructive" });
      return;
    }

    const departureDate = new Date(form.departureDate);
    if (departureDate <= new Date()) {
      toast({ title: "Date invalide", description: "La date de départ doit être dans le futur", variant: "destructive" });
      return;
    }

    const effectiveExpiresAt = form.expiresAt || form.departureDate;
    const expiresDate = new Date(effectiveExpiresAt);

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
      const capacity = parseFloat(form.totalCapacity);
      const { error } = await supabase.from("gp_offers").insert({
        gp_id: gpProfile.id,
        transport_type: "aerien" as any,
        origin_city: form.originCity,
        origin_country: form.originCountry,
        destination_city: form.destinationCity,
        destination_country: form.destinationCountry,
        departure_date: form.departureDate,
        arrival_date: form.arrivalDate || null,
        expires_at: effectiveExpiresAt,
        total_capacity: capacity,
        available_capacity: capacity,
        price_per_kg: parseFloat(form.pricePerKg),
        currency: form.currency,
        airline: form.airline || null,
        flight_number: form.flightNumber || null,
        description: form.description || null,
        status: "active",
      });

      if (error) throw error;
      toast({ title: "Vol publié ✓", description: `${form.originCity} → ${form.destinationCity}` });
      navigate("/aerien/apercu");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary shadow-lg" style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}>
        <div className="px-3 py-2.5 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-white" />
            <h1 className="text-white font-bold text-sm">Publier un vol cargo</h1>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 pb-24 max-w-lg mx-auto">
        {/* Route */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="text-xs font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Itinéraire
            </h3>
            {/* Navette picker for subscribers */}
            {isPremiumOrPro && navettes.length > 0 && (
              <div>
                <Label className="text-[10px] mb-1">Choisir une navette</Label>
                <div className="flex flex-wrap gap-1.5">
                  {navettes.map((nav, i) => (
                    <button key={i} type="button"
                      onClick={() => setForm(f => ({ ...f, originCity: nav.origin_city, originCountry: nav.origin_country, destinationCity: nav.destination_city, destinationCountry: nav.destination_country }))}
                      className={`text-[10px] px-2 py-1 rounded-md border transition-all ${
                        form.originCity === nav.origin_city && form.destinationCity === nav.destination_city
                          ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50"
                      }`}>
                      {nav.origin_city} → {nav.destination_city}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Ville départ</Label>
                <SearchableCitySelect
                  value={form.originCity}
                  countryCode={form.originCountry}
                  onSelect={(city, countryCode) => setForm((f) => ({
                    ...f,
                    originCity: city,
                    originCountry: countryCode === "XX" ? f.originCountry : countryCode,
                  }))}
                  placeholder="Paris"
                />
              </div>
              <div>
                <Label className="text-[10px]">Pays départ</Label>
                <Input className="h-11 text-xs" value={form.originCountry} disabled />
              </div>
              <div>
                <Label className="text-[10px]">Ville arrivée</Label>
                <SearchableCitySelect
                  value={form.destinationCity}
                  countryCode={form.destinationCountry}
                  onSelect={(city, countryCode) => setForm((f) => ({
                    ...f,
                    destinationCity: city,
                    destinationCountry: countryCode === "XX" ? f.destinationCountry : countryCode,
                  }))}
                  placeholder="Dakar"
                />
              </div>
              <div>
                <Label className="text-[10px]">Pays arrivée</Label>
                <Input className="h-11 text-xs" value={form.destinationCountry} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flight */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="text-xs font-bold flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-primary" /> Vol
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Compagnie</Label>
                <Input className="h-8 text-xs" placeholder="Air France" value={form.airline}
                  onChange={e => setForm(f => ({ ...f, airline: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px]">N° vol</Label>
                <Input className="h-8 text-xs" placeholder="AF123" value={form.flightNumber}
                  onChange={e => setForm(f => ({ ...f, flightNumber: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px]">Date départ</Label>
                <Input type="date" className="h-8 text-xs" value={form.departureDate}
                  onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px]">Date arrivée</Label>
                <Input type="date" className="h-8 text-xs" value={form.arrivalDate}
                  onChange={e => setForm(f => ({ ...f, arrivalDate: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capacity & Price */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="text-xs font-bold flex items-center gap-1.5">
              <Weight className="w-3.5 h-3.5 text-primary" /> Capacité & Tarif
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Capacité totale (kg)</Label>
                <Input type="number" className="h-8 text-xs" placeholder="500" value={form.totalCapacity}
                  onChange={e => setForm(f => ({ ...f, totalCapacity: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px]">Prix / kg ({form.currency})</Label>
                <Input type="number" className="h-8 text-xs" placeholder="8" value={form.pricePerKg}
                  onChange={e => setForm(f => ({ ...f, pricePerKg: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <Label className="text-[10px]">Description / conditions</Label>
            <Textarea className="text-xs min-h-[60px]" placeholder="Conditions d'acceptation, restrictions..."
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
