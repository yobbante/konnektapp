/**
 * RoutierMissionRequestPage - Client creates a mission request for routier transporters
 * Uses the new routier_missions table with full negotiation support
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Package, MapPin, Truck, Scale, Box,
  Thermometer, AlertTriangle, Droplets, Shield, Clock, Check,
  Calculator, Loader2, Calendar, Zap, DollarSign
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SearchableCountrySelect } from "@/components/gp/SearchableCountrySelect";
import { SearchableCitySelect } from "@/components/gp/SearchableCitySelect";

type FreightType = "colis" | "palettes" | "alimentaire" | "frigorifie" | "liquides" | "materiaux" | "btp" | "vehicules";
type VolumeSize = "petit" | "moyen" | "grand" | "hors_gabarit";
type Urgency = "standard" | "express" | "immediate";

const freightTypes: { id: FreightType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: "colis", label: "Colis / Cartons", icon: Package, desc: "Marchandises emballées" },
  { id: "palettes", label: "Palettes", icon: Box, desc: "Marchandises palettisées" },
  { id: "alimentaire", label: "Alimentaire", icon: Package, desc: "Produits alimentaires" },
  { id: "frigorifie", label: "Frigorifié", icon: Thermometer, desc: "Température contrôlée" },
  { id: "liquides", label: "Liquides", icon: Droplets, desc: "Citernes, cuves" },
  { id: "materiaux", label: "Matériaux / Vrac", icon: Truck, desc: "Sable, ciment, latérite" },
  { id: "btp", label: "BTP / Machines", icon: Truck, desc: "Équipement lourd" },
  { id: "vehicules", label: "Véhicules", icon: Truck, desc: "Transport automobile" },
];

const vehicleTypes = [
  { id: "moto", label: "Moto", emoji: "🏍️" },
  { id: "tricycle", label: "Tricycle", emoji: "🛺" },
  { id: "fourgon", label: "Fourgon", emoji: "🚐" },
  { id: "camionnette", label: "Camionnette", emoji: "🚙" },
  { id: "camion_3t", label: "Camion 3T", emoji: "🚚" },
  { id: "camion_10t", label: "Camion 10T", emoji: "🚛" },
  { id: "semi_remorque", label: "Semi-remorque", emoji: "🚛" },
  { id: "plateau", label: "Plateau", emoji: "🚧" },
  { id: "frigo", label: "Frigorifique", emoji: "❄️" },
  { id: "porte_conteneur", label: "Porte-conteneur", emoji: "📦" },
];

const volumeSizes: { id: VolumeSize; label: string; desc: string }[] = [
  { id: "petit", label: "Petit", desc: "< 1 m³" },
  { id: "moyen", label: "Moyen", desc: "1-5 m³" },
  { id: "grand", label: "Grand", desc: "5-20 m³" },
  { id: "hors_gabarit", label: "Hors gabarit", desc: "> 20 m³" },
];

const constraintOptions = [
  { id: "fragile", label: "Fragile", icon: AlertTriangle },
  { id: "temperature", label: "Température contrôlée", icon: Thermometer },
  { id: "dangereux", label: "Marchandise dangereuse", icon: AlertTriangle },
  { id: "protection", label: "Protection pluie/vol", icon: Shield },
];

const urgencyOptions: { id: Urgency; label: string; desc: string; badge?: string }[] = [
  { id: "standard", label: "Standard", desc: "3-7 jours" },
  { id: "express", label: "Express", desc: "24-48h", badge: "+30%" },
  { id: "immediate", label: "Immédiat", desc: "Aujourd'hui", badge: "+60%" },
];

export default function RoutierMissionRequestPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const totalSteps = 5;

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    freightType: null as FreightType | null,
    weight: "",
    weightUnit: "kg" as "kg" | "tonnes",
    volume: null as VolumeSize | null,
    constraints: [] as string[],
    vehicleType: null as string | null,
    originCity: "",
    originCountry: "SN",
    originAddress: "",
    destinationCity: "",
    destinationCountry: "SN",
    destinationAddress: "",
    deliveryToDoor: false,
    pickupDateStart: today,
    pickupDateEnd: "",
    urgency: "standard" as Urgency,
    budget: "",
    description: "",
  });

  const toggleConstraint = (id: string) => {
    setForm(prev => ({
      ...prev,
      constraints: prev.constraints.includes(id)
        ? prev.constraints.filter(c => c !== id)
        : [...prev.constraints, id],
    }));
  };

  const weightKg = form.weightUnit === "tonnes"
    ? parseFloat(form.weight || "0") * 1000
    : parseFloat(form.weight || "0");

  const estimatedPrice = (() => {
    let base = 15000;
    if (weightKg > 5000) base += 50000;
    else if (weightKg > 1000) base += 20000;
    else if (weightKg > 500) base += 10000;
    const multipliers: Record<string, number> = {
      colis: 1, palettes: 1.1, alimentaire: 1.2, frigorifie: 1.5,
      liquides: 1.4, materiaux: 1.3, btp: 1.6, vehicules: 1.8,
    };
    let total = base * (multipliers[form.freightType || "colis"] || 1);
    if (form.urgency === "express") total *= 1.3;
    if (form.urgency === "immediate") total *= 1.6;
    if (form.constraints.includes("dangereux")) total *= 1.4;
    return Math.round(total);
  })();

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!form.freightType && !!form.weight && parseFloat(form.weight) > 0;
      case 2: return !!form.originCity && !!form.destinationCity;
      case 3: return !!form.pickupDateStart;
      case 4: return true; // budget optional
      case 5: return true; // review
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const endDate = form.pickupDateEnd || form.pickupDateStart;

      const { error } = await supabase.from("routier_missions").insert({
        client_id: session.user.id,
        mission_number: "MSN-TEMP", // trigger will override
        origin_city: form.originCity,
        origin_country: form.originCountry,
        origin_address: form.originAddress || null,
        destination_city: form.destinationCity,
        destination_country: form.destinationCountry,
        destination_address: form.destinationAddress || null,
        delivery_to_door: form.deliveryToDoor,
        freight_type: form.freightType || "colis",
        weight_kg: weightKg,
        volume_estimate: form.volume,
        merchandise_description: form.description || null,
        constraints: form.constraints,
        vehicle_type_required: form.vehicleType,
        pickup_date_start: form.pickupDateStart,
        pickup_date_end: endDate,
        urgency: form.urgency,
        client_budget: form.budget ? parseFloat(form.budget) : estimatedPrice,
        currency: "XOF",
        estimated_price: estimatedPrice,
      } as any);

      if (error) throw error;

      toast({ title: "🚛 Mission publiée !", description: "Les transporteurs compatibles seront notifiés." });
      navigate("/");
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Progress */}
      <div className="px-4 pt-2 pb-4 bg-background border-b">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => step === 1 ? navigate(-1) : setStep(s => s - 1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium">Étape {step}/{totalSteps}</span>
          <div className="w-9" />
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${(step / totalSteps) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Freight */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center">
                <Package className="w-10 h-10 text-primary mx-auto mb-2" />
                <h2 className="text-xl font-bold">Décrivez votre fret</h2>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Type de fret *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {freightTypes.map(t => {
                    const Icon = t.icon;
                    const sel = form.freightType === t.id;
                    return (
                      <button key={t.id} onClick={() => setForm(p => ({ ...p, freightType: t.id }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                        <Icon className={`w-5 h-5 mb-1 ${sel ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="font-medium text-sm">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Poids total *</Label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" placeholder="500" value={form.weight}
                      onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} className="pl-10" />
                  </div>
                  <div className="flex rounded-lg border overflow-hidden">
                    {(["kg", "tonnes"] as const).map(u => (
                      <button key={u} onClick={() => setForm(p => ({ ...p, weightUnit: u }))}
                        className={`px-4 py-2 text-sm font-medium ${form.weightUnit === u ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {u === "kg" ? "kg" : "T"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Volume estimé</Label>
                <div className="flex gap-2 flex-wrap">
                  {volumeSizes.map(s => (
                    <button key={s.id} onClick={() => setForm(p => ({ ...p, volume: s.id }))}
                      className={`px-4 py-2 rounded-full border text-sm font-medium ${form.volume === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Véhicule souhaité</Label>
                <div className="grid grid-cols-2 gap-2">
                  {vehicleTypes.map(v => (
                    <button key={v.id} onClick={() => setForm(p => ({ ...p, vehicleType: v.id }))}
                      className={`p-2.5 rounded-xl border-2 text-left ${form.vehicleType === v.id ? "border-primary bg-primary/5" : "border-border"}`}>
                      <span className="text-lg mr-2">{v.emoji}</span>
                      <span className="text-sm font-medium">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Contraintes</Label>
                <div className="flex flex-wrap gap-2">
                  {constraintOptions.map(c => {
                    const Icon = c.icon;
                    const sel = form.constraints.includes(c.id);
                    return (
                      <button key={c.id} onClick={() => toggleConstraint(c.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm ${sel ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                        <Icon className="w-3.5 h-3.5" />{c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Itinerary */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center">
                <MapPin className="w-10 h-10 text-primary mx-auto mb-2" />
                <h2 className="text-xl font-bold">Itinéraire</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-1 block">Ville de départ *</Label>
                  <SearchableCitySelect value={form.originCity} onSelect={v => setForm(p => ({ ...p, originCity: v }))} placeholder="Ville de départ" countryCode={form.originCountry} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Adresse de départ</Label>
                  <Input placeholder="Adresse précise (optionnel)" value={form.originAddress}
                    onChange={e => setForm(p => ({ ...p, originAddress: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Ville d'arrivée *</Label>
                  <SearchableCitySelect value={form.destinationCity} onSelect={v => setForm(p => ({ ...p, destinationCity: v }))} placeholder="Ville d'arrivée" countryCode={form.destinationCountry} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Adresse d'arrivée</Label>
                  <Input placeholder="Adresse précise (optionnel)" value={form.destinationAddress}
                    onChange={e => setForm(p => ({ ...p, destinationAddress: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border">
                  <div>
                    <p className="text-sm font-medium">Livraison à domicile</p>
                    <p className="text-xs text-muted-foreground">Le transporteur livre à votre adresse</p>
                  </div>
                  <Switch checked={form.deliveryToDoor} onCheckedChange={v => setForm(p => ({ ...p, deliveryToDoor: v }))} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Timing & Urgency */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center">
                <Calendar className="w-10 h-10 text-primary mx-auto mb-2" />
                <h2 className="text-xl font-bold">Planning</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-1 block">Date de collecte souhaitée *</Label>
                  <Input type="date" min={today} value={form.pickupDateStart}
                    onChange={e => setForm(p => ({ ...p, pickupDateStart: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Date limite (optionnel)</Label>
                  <Input type="date" min={form.pickupDateStart} value={form.pickupDateEnd}
                    onChange={e => setForm(p => ({ ...p, pickupDateEnd: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Urgence</Label>
                <div className="space-y-2">
                  {urgencyOptions.map(u => (
                    <button key={u.id} onClick={() => setForm(p => ({ ...p, urgency: u.id }))}
                      className={`w-full p-3 rounded-xl border-2 text-left flex items-center justify-between ${form.urgency === u.id ? "border-primary bg-primary/5" : "border-border"}`}>
                      <div>
                        <p className="font-medium text-sm">{u.label}</p>
                        <p className="text-xs text-muted-foreground">{u.desc}</p>
                      </div>
                      {u.badge && <Badge variant="secondary" className="text-xs">{u.badge}</Badge>}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Budget */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center">
                <DollarSign className="w-10 h-10 text-primary mx-auto mb-2" />
                <h2 className="text-xl font-bold">Votre budget</h2>
                <p className="text-sm text-muted-foreground">Proposez un prix ou utilisez l'estimation</p>
              </div>

              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">Prix estimé par Konnekt</p>
                <p className="text-3xl font-bold text-primary">{estimatedPrice.toLocaleString()} FCFA</p>
              </div>

              <div>
                <Label className="text-sm font-medium mb-1 block">Votre proposition (FCFA)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="number" placeholder={estimatedPrice.toString()} value={form.budget}
                    onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} className="pl-10 text-lg" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Laisser vide pour utiliser le prix estimé. Les transporteurs pourront négocier.
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium mb-1 block">Description complémentaire</Label>
                <Textarea placeholder="Détails sur la marchandise, contraintes spéciales..." value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
            </motion.div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="text-center">
                <Check className="w-10 h-10 text-primary mx-auto mb-2" />
                <h2 className="text-xl font-bold">Récapitulatif</h2>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fret</span>
                    <span className="font-medium">{freightTypes.find(f => f.id === form.freightType)?.label}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Poids</span>
                    <span className="font-medium">{weightKg.toLocaleString()} kg</span>
                  </div>
                  {form.vehicleType && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Véhicule</span>
                      <span className="font-medium">{vehicleTypes.find(v => v.id === form.vehicleType)?.label}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span>{form.originCity}</span>
                    {form.originAddress && <span className="text-xs text-muted-foreground">· {form.originAddress}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>{form.destinationCity}</span>
                    {form.destinationAddress && <span className="text-xs text-muted-foreground">· {form.destinationAddress}</span>}
                  </div>
                  {form.deliveryToDoor && <Badge variant="secondary" className="text-xs">Livraison à domicile</Badge>}
                </div>

                <div className="p-4 rounded-xl border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{form.pickupDateStart}{form.pickupDateEnd ? ` → ${form.pickupDateEnd}` : ""}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Urgence</span>
                    <Badge variant={form.urgency === "immediate" ? "destructive" : form.urgency === "express" ? "default" : "secondary"}>
                      {urgencyOptions.find(u => u.id === form.urgency)?.label}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Budget proposé</span>
                    <span className="text-xl font-bold text-primary">
                      {(form.budget ? parseInt(form.budget) : estimatedPrice).toLocaleString()} FCFA
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les transporteurs pourront accepter ou contre-proposer
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Action */}
      <div className="p-4 border-t bg-background">
        {step < totalSteps ? (
          <Button className="w-full" size="lg" disabled={!canProceed()} onClick={() => setStep(s => s + 1)}>
            Continuer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button className="w-full" size="lg" disabled={loading} onClick={handleSubmit}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Publier la mission
          </Button>
        )}
      </div>
    </div>
  );
}
