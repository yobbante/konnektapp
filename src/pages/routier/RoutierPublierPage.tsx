/**
 * RoutierPublierPage — Publish a route with size-based pricing
 * Transporter sets prices per S/M/L/XL directly on the offer
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Route, Calendar, MapPin, Truck, ChevronLeft, Check, Car,
  Clock, DollarSign, TrendingUp, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getAllSizeCategories, formatPriceFCFA } from "@/lib/routierUtils";

const sizes = getAllSizeCategories();

export default function RoutierPublierPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  // Saved pricing defaults
  const [defaultPricing, setDefaultPricing] = useState<{ price_s: number; price_m: number; price_l: number; price_xl: number } | null>(null);
  // Recommended prices
  const [recommended, setRecommended] = useState<{ s: number; m: number; l: number; xl: number } | null>(null);

  const [form, setForm] = useState({
    originCity: "",
    destinationCity: "",
    departureDate: "",
    arrivalDate: "",
    capacity: "",
    vehicleId: "",
    conditions: "",
    priceS: "",
    priceM: "",
    priceL: "",
    priceXL: "",
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: gp } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("gp_type", "routier")
        .maybeSingle();

      if (!gp) { navigate("/routier/inscription"); return; }
      setGpProfile(gp);

      setForm(f => ({
        ...f,
        originCity: gp.base_origin_city || "",
        destinationCity: gp.base_destination_city || "",
      }));

      // Load vehicles and saved pricing in parallel
      const [vehiclesRes, ordersRes, pricingRes] = await Promise.all([
        supabase.from("vehicles").select("id, name, vehicle_type, max_weight_kg, is_active").eq("gp_id", gp.id).eq("is_active", true),
        supabase.from("orders").select("status").eq("gp_id", gp.id),
        supabase.from("routier_gp_pricing").select("price_s, price_m, price_l, price_xl").eq("gp_id", gp.id).maybeSingle(),
      ]);

      setVehicles(vehiclesRes.data || []);
      setPendingCount(ordersRes.data?.filter(o => o.status === "pending").length || 0);
      setActiveCount(ordersRes.data?.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length || 0);

      if (pricingRes.data) {
        setDefaultPricing(pricingRes.data as any);
        setForm(f => ({
          ...f,
          priceS: String(pricingRes.data!.price_s || ""),
          priceM: String(pricingRes.data!.price_m || ""),
          priceL: String(pricingRes.data!.price_l || ""),
          priceXL: String(pricingRes.data!.price_xl || ""),
        }));
      }

      // Load recommended prices
      if (gp.base_origin_city && gp.base_destination_city) {
        const { data: rec } = await supabase.rpc("get_routier_recommended_prices", {
          p_origin_city: gp.base_origin_city,
          p_destination_city: gp.base_destination_city,
        });
        if (rec && rec.length > 0 && rec[0].sample_count > 0) {
          setRecommended({
            s: rec[0].recommended_price_s,
            m: rec[0].recommended_price_m,
            l: rec[0].recommended_price_l,
            xl: rec[0].recommended_price_xl,
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Re-load recommended when route changes
  useEffect(() => {
    if (!form.originCity || !form.destinationCity) return;
    (async () => {
      const { data: rec } = await supabase.rpc("get_routier_recommended_prices", {
        p_origin_city: form.originCity,
        p_destination_city: form.destinationCity,
      });
      if (rec && rec.length > 0 && rec[0].sample_count > 0) {
        setRecommended({
          s: rec[0].recommended_price_s,
          m: rec[0].recommended_price_m,
          l: rec[0].recommended_price_l,
          xl: rec[0].recommended_price_xl,
        });
      } else {
        setRecommended(null);
      }
    })();
  }, [form.originCity, form.destinationCity]);

  const handlePublish = async () => {
    const pS = parseInt(form.priceS) || 0;
    const pM = parseInt(form.priceM) || 0;
    const pL = parseInt(form.priceL) || 0;
    const pXL = parseInt(form.priceXL) || 0;

    if (!form.originCity || !form.destinationCity || !form.departureDate) {
      toast({ title: "Champs requis", description: "Remplissez les champs obligatoires", variant: "destructive" });
      return;
    }
    if (pS <= 0 || pM <= 0 || pL <= 0 || pXL <= 0) {
      toast({ title: "Prix requis", description: "Définissez un prix pour chaque taille de colis", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("gp_offers").insert({
        gp_id: gpProfile.id,
        origin_city: form.originCity,
        origin_country: gpProfile.base_origin_country || gpProfile.country_code || "SN",
        destination_city: form.destinationCity,
        destination_country: gpProfile.base_destination_country || gpProfile.country_code || "SN",
        departure_date: form.departureDate,
        arrival_date: form.arrivalDate || null,
        total_capacity: parseFloat(form.capacity) || 1000,
        available_capacity: parseFloat(form.capacity) || 1000,
        price_per_kg: pS, // fallback for legacy compatibility (smallest price)
        price_s: pS,
        price_m: pM,
        price_l: pL,
        price_xl: pXL,
        currency: gpProfile.default_currency || "XOF",
        transport_type: "routier" as any,
        vehicle_id: form.vehicleId || null,
        conditions: form.conditions || null,
        status: "active" as any,
      });

      if (error) throw error;

      toast({ title: "Ligne publiée !", description: `${form.originCity} → ${form.destinationCity}` });
      navigate("/routier/apercu");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);
  const priceParsed = [parseInt(form.priceS) || 0, parseInt(form.priceM) || 0, parseInt(form.priceL) || 0, parseInt(form.priceXL) || 0];
  const recArr = recommended ? [recommended.s, recommended.m, recommended.l, recommended.xl] : null;
  const priceFields: ("priceS" | "priceM" | "priceL" | "priceXL")[] = ["priceS", "priceM", "priceL", "priceXL"];
  const minPrice = priceParsed.filter(p => p > 0).length > 0 ? Math.min(...priceParsed.filter(p => p > 0)) : 0;

  return (
    <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeCount}>
      <div className="px-4 py-3 space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/routier/apercu")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Publier une ligne</h1>
            <p className="text-xs text-muted-foreground">Définissez votre trajet et vos prix</p>
          </div>
        </div>

        {/* Route Card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Route className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">Trajet</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Ville départ</Label>
                <Input className="h-9" placeholder="Ex: Dakar" value={form.originCity}
                  onChange={e => setForm(f => ({ ...f, originCity: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Ville arrivée</Label>
                <Input className="h-9" placeholder="Ex: Thiès" value={form.destinationCity}
                  onChange={e => setForm(f => ({ ...f, destinationCity: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle */}
        {vehicles.length > 0 && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">Véhicule</span>
              </div>
              <Select value={form.vehicleId} onValueChange={v => {
                setForm(f => ({ ...f, vehicleId: v }));
                const vh = vehicles.find(x => x.id === v);
                if (vh?.max_weight_kg) setForm(f => ({ ...f, capacity: String(vh.max_weight_kg) }));
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5" />
                        {v.name} · {v.vehicle_type?.replace(/_/g, " ")} · {v.max_weight_kg}kg
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Dates */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Date départ *
                </Label>
                <Input type="date" className="h-9" value={form.departureDate}
                  onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Date arrivée
                </Label>
                <Input type="date" className="h-9" value={form.arrivalDate}
                  onChange={e => setForm(f => ({ ...f, arrivalDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Conditions (optionnel)</Label>
              <Input className="h-9" placeholder="Ex: Pas de liquides..." value={form.conditions}
                onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        {/* ── SIZE-BASED PRICING ── */}
        <Card className="border-primary/20">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">Prix par taille de colis *</span>
            </div>

            {sizes.map((size, i) => (
              <div key={size.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge className={`${size.bg} ${size.color} border-0 text-[10px] font-bold px-1.5 py-0`}>
                      {size.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{size.description}</span>
                  </div>
                  {recArr && recArr[i] > 0 && (
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {formatPriceFCFA(recArr[i])}
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  placeholder={recArr && recArr[i] > 0 ? String(recArr[i]) : "0"}
                  value={form[priceFields[i]] || ""}
                  onChange={e => setForm(f => ({ ...f, [priceFields[i]]: e.target.value }))}
                />
              </div>
            ))}

            {/* Quick fill from defaults */}
            {defaultPricing && (defaultPricing.price_s > 0) && !form.priceS && (
              <Button variant="outline" size="sm" className="w-full text-xs h-7"
                onClick={() => setForm(f => ({
                  ...f,
                  priceS: String(defaultPricing!.price_s),
                  priceM: String(defaultPricing!.price_m),
                  priceL: String(defaultPricing!.price_l),
                  priceXL: String(defaultPricing!.price_xl),
                }))}>
                Utiliser mes tarifs par défaut
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-muted">
          <CardContent className="p-3 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Le prix recommandé Konnekt est affiché au client comme référence. Vous êtes libre de fixer vos propres tarifs. 
              La commission Konnekt est appliquée automatiquement.
            </p>
          </CardContent>
        </Card>

        {/* Summary */}
        {form.originCity && form.destinationCity && form.departureDate && minPrice > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-2">Récapitulatif</p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                    {form.originCity} → {form.destinationCity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {form.departureDate && format(new Date(form.departureDate), "d MMM yyyy", { locale: fr })}
                  </span>
                </div>
                <p className="text-sm font-bold text-primary mt-2">
                  À partir de {formatPriceFCFA(minPrice)}
                </p>
                <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                  {sizes.map((s, i) => priceParsed[i] > 0 && (
                    <span key={s.label}>{s.label}: {priceParsed[i].toLocaleString()}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Publish button */}
        <Button
          className="w-full h-12 text-base font-bold gap-2"
          onClick={handlePublish}
          disabled={saving || !form.originCity || !form.destinationCity || !form.departureDate}
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5" />
              Publier la ligne
            </>
          )}
        </Button>
      </div>
    </RoutierDashboardLayout>
  );
}
