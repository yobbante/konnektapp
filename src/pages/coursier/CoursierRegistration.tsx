/**
 * CoursierRegistration — Inscription coursier express local
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Package, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle, Bike } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

const STEPS = ["Identité", "Zone", "Véhicule", "Confirmation"];
const VEHICLE_TYPES = [
  { value: "moto", label: "🏍️ Moto" },
  { value: "velo", label: "🚲 Vélo" },
  { value: "scooter", label: "🛵 Scooter" },
  { value: "voiture", label: "🚗 Voiture" },
  { value: "a_pied", label: "🚶 À pied" },
];

export default function CoursierRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    fullName: "", phone: "", email: "", password: "",
    city: "", zone: "",
    vehicleType: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("gp_profiles").select("id").eq("user_id", data.user.id).eq("gp_type", "express").maybeSingle()
          .then(({ data: gp }) => { if (gp) { navigate("/"); return; } setLoading(false); });
      } else { setLoading(false); }
    });
  }, []);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let userId: string;
      const { data: session } = await supabase.auth.getUser();
      if (session.user) {
        userId = session.user.id;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: { emailRedirectTo: `${window.location.origin}/coursier/inscription`, data: { full_name: form.fullName } }
        });
        if (error) throw error;
        userId = data.user!.id;
      }

      const { error: gpError } = await supabase.from("gp_profiles").insert({
        user_id: userId, business_name: form.fullName, phone: form.phone,
        city: form.city, country_code: "SN", gp_type: "express" as any,
        status: "pending" as any, kyc_status: "pending",
      });
      if (gpError) throw gpError;

      toast({ title: "Inscription réussie !", description: "Bienvenue dans Konnekt Coursier." });
      navigate("/");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (loading) return <TransportPageLoader />;

  const progress = ((step + 1) / STEPS.length) * 100;
  const canNext = step === 0 ? form.fullName && form.phone && form.email
    : step === 1 ? form.city
    : step === 2 ? form.vehicleType
    : true;

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium">Étape {step + 1}/{STEPS.length}</p>
          <Progress value={progress} className="h-1.5 mt-1" />
        </div>
      </div>

      <div className="flex-1 px-4 pb-6 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Coursier — {STEPS[step]}</h1>
            <p className="text-xs text-muted-foreground">Livraison express locale</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {step === 0 && (
              <>
                <div><Label>Nom complet</Label><Input value={form.fullName} onChange={e => set("fullName", e.target.value)} placeholder="Ex: Moussa Diallo" /></div>
                <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+221 77 000 00 00" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="moussa@email.com" /></div>
                <div className="relative"><Label>Mot de passe</Label><Input type={showPwd ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min. 6 caractères" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-8">{showPwd ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}</button>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <div><Label>Ville</Label><Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Ex: Dakar" /></div>
                <div><Label>Zone / Quartier principal</Label><Input value={form.zone} onChange={e => set("zone", e.target.value)} placeholder="Ex: Plateau, Almadies..." /></div>
              </>
            )}
            {step === 2 && (
              <div><Label>Type de véhicule</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {VEHICLE_TYPES.map(v => (
                    <button key={v.value} onClick={() => set("vehicleType", v.value)}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${form.vehicleType === v.value ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10" : "border-border bg-card"}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="text-center py-6 space-y-3">
                <CheckCircle className="w-12 h-12 text-orange-500 mx-auto" />
                <h2 className="text-lg font-bold">Bienvenue !</h2>
                <p className="text-sm text-muted-foreground">Votre profil coursier est créé</p>
                <div className="bg-muted/50 rounded-xl p-3 text-left text-xs space-y-1">
                  <p><strong>Nom:</strong> {form.fullName}</p>
                  <p><strong>Zone:</strong> {form.city} — {form.zone}</p>
                  <p><strong>Véhicule:</strong> {form.vehicleType}</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-4 pb-6" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
        <Button className="w-full h-12 rounded-xl font-bold text-base" disabled={!canNext || submitting}
          onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : handleSubmit()}>
          {submitting ? "Envoi..." : step === STEPS.length - 1 ? "Finaliser l'inscription" : "Continuer"}
          {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}
