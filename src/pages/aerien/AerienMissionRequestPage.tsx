/**
 * AerienMissionRequestPage — Client creates a custom air cargo mission
 * Simplified quick mission posting for urgent/specific air shipments
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plane, ArrowLeft, Check, Loader2, Package, MapPin,
  DollarSign, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const merchandiseTypes = [
  "Documents urgents", "Électronique", "E-commerce", "Textile",
  "Pièces détachées", "Échantillons", "Pharmaceutique", "Divers"
];

export default function AerienMissionRequestPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [originCity, setOriginCity] = useState("");
  const [originCountry, setOriginCountry] = useState("France");
  const [destCity, setDestCity] = useState("");
  const [destCountry, setDestCountry] = useState("Sénégal");
  const [merchandiseType, setMerchandiseType] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [budget, setBudget] = useState("");
  const [pickupFrom, setPickupFrom] = useState("");
  const [pickupTo, setPickupTo] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [customsRequired, setCustomsRequired] = useState(false);
  const [insuranceRequired, setInsuranceRequired] = useState(false);

  const handleSubmit = async () => {
    if (!originCity || !destCity || !merchandiseType || !weight) {
      toast({ title: "Champs requis", description: "Remplissez les champs obligatoires", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { error } = await supabase.from("freight_requests").insert({
        client_id: session.user.id,
        request_number: "FRT-TEMP",
        freight_mode: "air",
        origin_city: originCity,
        origin_country: originCountry,
        destination_city: destCity,
        destination_country: destCountry,
        merchandise_type: merchandiseType.toLowerCase(),
        merchandise_description: description || null,
        weight_kg: weight ? parseFloat(weight) : null,
        dimensions_cm: dimensions || null,
        declared_value: budget ? parseFloat(budget) : null,
        pickup_date_from: pickupFrom || null,
        pickup_date_to: pickupTo || null,
        is_urgent: isUrgent,
        urgency_level: isUrgent ? "express" : "standard",
        customs_required: customsRequired,
        insurance_required: insuranceRequired,
        status: "open",
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold">Demande envoyée !</h2>
          <p className="text-sm text-muted-foreground">Les transporteurs cargo vont vous envoyer leurs propositions.</p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate("/reservations")}>Mes réservations</Button>
            <Button variant="outline" onClick={() => navigate("/")}>Accueil</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-violet-600 to-violet-500 shadow-lg" style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}>
        <div className="px-3 py-2.5 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-white" />
            <h1 className="text-white font-bold text-sm">Demande cargo aérien</h1>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Route */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-1.5 mb-1"><MapPin className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-bold">Itinéraire</span></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-[10px]">Ville d'origine *</Label><Input value={originCity} onChange={e => setOriginCity(e.target.value)} placeholder="New York" className="h-9 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Pays</Label><Input value={originCountry} onChange={e => setOriginCountry(e.target.value)} className="h-9 text-xs" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-[10px]">Ville de destination *</Label><Input value={destCity} onChange={e => setDestCity(e.target.value)} placeholder="Dakar" className="h-9 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Pays</Label><Input value={destCountry} onChange={e => setDestCountry(e.target.value)} className="h-9 text-xs" /></div>
            </div>
          </CardContent>
        </Card>

        {/* Cargo */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-1.5 mb-1"><Package className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-bold">Colis</span></div>
            <div className="flex flex-wrap gap-1.5">
              {merchandiseTypes.map(t => (
                <button key={t} onClick={() => setMerchandiseType(t)}
                  className={cn("text-[11px] px-2.5 py-1.5 rounded-lg border transition-all",
                    merchandiseType === t ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50")}>
                  {t}
                </button>
              ))}
            </div>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description détaillée..." rows={2} className="text-xs" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-[10px]">Poids (kg) *</Label><Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="20" className="h-9 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Dimensions (LxlxH)</Label><Input value={dimensions} onChange={e => setDimensions(e.target.value)} placeholder="60x40x30" className="h-9 text-xs" /></div>
            </div>
          </CardContent>
        </Card>

        {/* Budget + dates */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-1.5 mb-1"><DollarSign className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-bold">Budget & Dates</span></div>
            <div className="space-y-1"><Label className="text-[10px]">Budget proposé (FCFA)</Label><Input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="120000" className="h-9 text-xs" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-[10px]">Enlèvement dès le</Label><Input type="date" value={pickupFrom} onChange={e => setPickupFrom(e.target.value)} className="h-9 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Jusqu'au</Label><Input type="date" value={pickupTo} onChange={e => setPickupTo(e.target.value)} className="h-9 text-xs" /></div>
            </div>
          </CardContent>
        </Card>

        {/* Options */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/60 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <span className="text-xs font-semibold flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-600" /> Envoi urgent / Express</span>
            <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-xs font-semibold">Dédouanement inclus</span>
            <Switch checked={customsRequired} onCheckedChange={setCustomsRequired} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-xs font-semibold">Assurance cargo</span>
            <Switch checked={insuranceRequired} onCheckedChange={setInsuranceRequired} />
          </div>
        </div>

        <Button className="w-full h-12 bg-violet-600 hover:bg-violet-700" onClick={handleSubmit} disabled={submitting || !originCity || !destCity || !merchandiseType || !weight}>
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plane className="w-4 h-4 mr-2" />}
          Envoyer la demande
        </Button>
      </div>
    </div>
  );
}