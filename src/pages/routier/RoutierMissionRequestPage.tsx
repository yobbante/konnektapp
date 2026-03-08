/**
 * RoutierMissionRequestPage - Simplified Cocolis-inspired client form
 * 3 steps: What + Where + When/Budget → Submit
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Package, MapPin, Truck, Scale, Box,
  Thermometer, AlertTriangle, Droplets, Shield, Clock, Check,
  Loader2, Calendar, DollarSign, ChevronRight
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SearchableCitySelect } from "@/components/gp/SearchableCitySelect";
import { getSizeFromWeight, formatWeightShort, freightTypeLabels } from "@/lib/routierUtils";

type FreightType = "colis" | "palettes" | "alimentaire" | "frigorifie" | "liquides" | "materiaux" | "btp" | "vehicules";
type Urgency = "standard" | "express" | "immediate";

const freightTypes: { id: FreightType; icon: React.ComponentType<{ className?: string }>; emoji: string; label: string }[] = [
  { id: "colis", icon: Package, emoji: "📦", label: "Colis" },
  { id: "palettes", icon: Box, emoji: "🪵", label: "Palettes" },
  { id: "alimentaire", icon: Package, emoji: "🍎", label: "Alimentaire" },
  { id: "frigorifie", icon: Thermometer, emoji: "❄️", label: "Frigorifié" },
  { id: "liquides", icon: Droplets, emoji: "🛢️", label: "Liquides" },
  { id: "materiaux", icon: Truck, emoji: "🪨", label: "Matériaux" },
  { id: "btp", icon: Truck, emoji: "🏗️", label: "BTP" },
  { id: "vehicules", icon: Truck, emoji: "🚗", label: "Véhicules" },
];

const vehicleTypes = [
  { id: "fourgon", emoji: "🚐" },
  { id: "camionnette", emoji: "🚙" },
  { id: "camion_3t", emoji: "🚚" },
  { id: "camion_10t", emoji: "🚛" },
  { id: "semi_remorque", emoji: "🚛" },
  { id: "frigo", emoji: "❄️" },
];

const constraintOptions = [
  { id: "fragile", label: "Fragile", icon: AlertTriangle },
  { id: "temperature", label: "Temp. contrôlée", icon: Thermometer },
  { id: "dangereux", label: "Dangereux", icon: AlertTriangle },
  { id: "protection", label: "Protection", icon: Shield },
];

export default function RoutierMissionRequestPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const totalSteps = 3;
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    freightType: null as FreightType | null,
    weight: "",
    weightUnit: "kg" as "kg" | "tonnes",
    vehicleType: null as string | null,
    constraints: [] as string[],
    originCity: "",
    originCountry: "SN",
    destinationCity: "",
    destinationCountry: "SN",
    deliveryToDoor: false,
    pickupDate: today,
    urgency: "standard" as Urgency,
    budget: "",
    description: "",
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const toggleConstraint = (id: string) => set("constraints", form.constraints.includes(id) ? form.constraints.filter(c => c !== id) : [...form.constraints, id]);

  const weightKg = form.weightUnit === "tonnes" ? parseFloat(form.weight || "0") * 1000 : parseFloat(form.weight || "0");
  const size = getSizeFromWeight(weightKg);

  const estimatedPrice = (() => {
    let base = 15000;
    if (weightKg > 5000) base += 50000;
    else if (weightKg > 1000) base += 20000;
    else if (weightKg > 500) base += 10000;
    const mult: Record<string, number> = { colis: 1, palettes: 1.1, alimentaire: 1.2, frigorifie: 1.5, liquides: 1.4, materiaux: 1.3, btp: 1.6, vehicules: 1.8 };
    let total = base * (mult[form.freightType || "colis"] || 1);
    if (form.urgency === "express") total *= 1.3;
    if (form.urgency === "immediate") total *= 1.6;
    return Math.round(total);
  })();

  const canProceed = (): boolean => {
    if (step === 1) return !!form.freightType && !!form.weight && parseFloat(form.weight) > 0;
    if (step === 2) return !!form.originCity && !!form.destinationCity;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { error } = await supabase.from("routier_missions").insert({
        client_id: session.user.id,
        mission_number: "MSN-TEMP",
        origin_city: form.originCity,
        origin_country: form.originCountry,
        destination_city: form.destinationCity,
        destination_country: form.destinationCountry,
        delivery_to_door: form.deliveryToDoor,
        freight_type: form.freightType || "colis",
        weight_kg: weightKg,
        merchandise_description: form.description || null,
        constraints: form.constraints,
        vehicle_type_required: form.vehicleType,
        pickup_date_start: form.pickupDate,
        pickup_date_end: form.pickupDate,
        urgency: form.urgency,
        client_budget: form.budget ? parseFloat(form.budget) : estimatedPrice,
        currency: "XOF",
        estimated_price: estimatedPrice,
      } as any);

      if (error) throw error;
      toast({ title: "Mission publiée !", description: "Les transporteurs compatibles seront notifiés." });
      navigate("/reservations");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Progress */}
      <div className="px-4 pt-2 pb-3 bg-background border-b">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => step === 1 ? navigate(-1) : setStep(s => s - 1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium">{step}/{totalSteps}</span>
          <div className="w-9" />
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${(step / totalSteps) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {/* ── Step 1: What ── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">Que transportez-vous ?</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Type de marchandise et poids</p>
              </div>

              {/* Freight type - compact grid */}
              <div className="grid grid-cols-4 gap-2">
                {freightTypes.map(t => {
                  const sel = form.freightType === t.id;
                  return (
                    <button key={t.id} onClick={() => set("freightType", t.id)}
                      className={`flex flex-col items-center p-2.5 rounded-xl border-2 transition-all ${sel ? "border-primary bg-primary/5" : "border-border"}`}>
                      <span className="text-xl mb-0.5">{t.emoji}</span>
                      <span className="text-[10px] font-medium text-center leading-tight">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Weight */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Poids total</Label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" placeholder="500" value={form.weight}
                      onChange={e => set("weight", e.target.value)} className="pl-10 h-10" />
                  </div>
                  <div className="flex rounded-lg border overflow-hidden">
                    {(["kg", "tonnes"] as const).map(u => (
                      <button key={u} onClick={() => set("weightUnit", u)}
                        className={`px-4 py-2 text-sm font-medium ${form.weightUnit === u ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {u === "kg" ? "kg" : "T"}
                      </button>
                    ))}
                  </div>
                </div>
                {weightKg > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`${size.bg} ${size.color} font-bold`}>{size.label}</Badge>
                    <span className="text-xs text-muted-foreground">{size.description} · {formatWeightShort(weightKg)}</span>
                  </div>
                )}
              </div>

              {/* Vehicle type - compact */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Véhicule souhaité</Label>
                <div className="flex gap-2 flex-wrap">
                  {vehicleTypes.map(v => (
                    <button key={v.id} onClick={() => set("vehicleType", form.vehicleType === v.id ? null : v.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm ${form.vehicleType === v.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                      <span>{v.emoji}</span>
                      <span className="text-xs font-medium">{v.id.replace(/_/g, " ")}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Constraints - pills */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Contraintes</Label>
                <div className="flex flex-wrap gap-1.5">
                  {constraintOptions.map(c => {
                    const sel = form.constraints.includes(c.id);
                    const Icon = c.icon;
                    return (
                      <button key={c.id} onClick={() => toggleConstraint(c.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs ${sel ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                        <Icon className="w-3 h-3" />{c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Description (optionnel)</Label>
                <Textarea placeholder="Détails sur votre marchandise..." value={form.description}
                  onChange={e => set("description", e.target.value)} className="h-16 text-sm" />
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Where ── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">Itinéraire</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Villes de départ et d'arrivée</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute left-4 top-3 w-2.5 h-2.5 rounded-full bg-emerald-500 z-10" />
                  <div className="pl-10">
                    <Label className="text-xs text-muted-foreground mb-1 block">Départ</Label>
                    <SearchableCitySelect value={form.originCity} onSelect={v => set("originCity", v)} placeholder="Ville de départ" countryCode={form.originCountry} />
                  </div>
                </div>

                <div className="ml-5 w-px h-4 bg-border" />

                <div className="relative">
                  <div className="absolute left-4 top-3 w-2.5 h-2.5 rounded-full bg-primary z-10" />
                  <div className="pl-10">
                    <Label className="text-xs text-muted-foreground mb-1 block">Arrivée</Label>
                    <SearchableCitySelect value={form.destinationCity} onSelect={v => set("destinationCity", v)} placeholder="Ville d'arrivée" countryCode={form.destinationCountry} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border">
                <div>
                  <p className="text-sm font-medium">Livraison à domicile</p>
                  <p className="text-[10px] text-muted-foreground">Le transporteur livre directement</p>
                </div>
                <Switch checked={form.deliveryToDoor} onCheckedChange={v => set("deliveryToDoor", v)} />
              </div>
            </motion.div>
          )}

          {/* ── Step 3: When + Budget + Review ── */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">Quand & budget</h2>
              </div>

              {/* Date */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Date de collecte</Label>
                <Input type="date" min={today} value={form.pickupDate}
                  onChange={e => set("pickupDate", e.target.value)} className="h-10" />
              </div>

              {/* Urgency */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Urgence</Label>
                <div className="flex gap-2">
                  {([
                    { id: "standard" as Urgency, label: "Standard", desc: "3-7j" },
                    { id: "express" as Urgency, label: "Express", desc: "+30%" },
                    { id: "immediate" as Urgency, label: "Urgent", desc: "+60%" },
                  ]).map(u => (
                    <button key={u.id} onClick={() => set("urgency", u.id)}
                      className={`flex-1 p-2.5 rounded-xl border-2 text-center ${form.urgency === u.id ? "border-primary bg-primary/5" : "border-border"}`}>
                      <p className="text-sm font-semibold">{u.label}</p>
                      <p className="text-[10px] text-muted-foreground">{u.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Votre budget (CFA)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="number" placeholder={`${estimatedPrice.toLocaleString()}`} value={form.budget}
                    onChange={e => set("budget", e.target.value)} className="pl-10 h-10" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Estimation : {estimatedPrice.toLocaleString()} CFA</p>
              </div>

              <Separator />

              {/* Review summary */}
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Récapitulatif</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Fret :</span> <span className="font-medium">{freightTypeLabels[form.freightType || ""]?.label || "—"}</span></div>
                  <div><span className="text-muted-foreground">Poids :</span> <span className="font-medium">{formatWeightShort(weightKg)}</span> <Badge className={`${size.bg} ${size.color} text-[9px] ml-1`}>{size.label}</Badge></div>
                  <div><span className="text-muted-foreground">De :</span> <span className="font-medium">{form.originCity || "—"}</span></div>
                  <div><span className="text-muted-foreground">À :</span> <span className="font-medium">{form.destinationCity || "—"}</span></div>
                  <div><span className="text-muted-foreground">Date :</span> <span className="font-medium">{form.pickupDate}</span></div>
                  <div><span className="text-muted-foreground">Budget :</span> <span className="font-bold text-primary">{(form.budget ? parseInt(form.budget) : estimatedPrice).toLocaleString()} CFA</span></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      <div className="px-4 py-3 border-t bg-background">
        {step < totalSteps ? (
          <Button className="w-full h-12" disabled={!canProceed()} onClick={() => setStep(s => s + 1)}>
            Continuer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button className="w-full h-12" disabled={loading} onClick={handleSubmit}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Publier la mission
          </Button>
        )}
      </div>
    </div>
  );
}
