/**
 * AerienRegistration — Inscription transporteur aérien cargo
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Plane, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

const STEPS = ["Identité", "Corridor aérien", "Capacité", "Confirmation"];
const AIRPORTS = ["Paris CDG", "Paris Orly", "Dakar AIBD", "Abidjan FHB", "New York JFK", "Casablanca CMN", "Dubaï DXB", "Bruxelles BRU", "Conakry CKY", "Douala DLA"];
const AIR_ROLES = [
  { value: "independent", label: "Indépendant", desc: "Voyageur fréquent / consolidateur" },
  { value: "shipping_partner", label: "Shipping Partner", desc: "Agence cargo / agent IATA" },
];

export default function AerienRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    businessName: "", phone: "", email: "", password: "",
    airportOrigin: "", airportDest: "", city: "",
    airRole: "", capacityKg: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("gp_profiles").select("id").eq("user_id", data.user.id).eq("gp_type", "aerien").maybeSingle()
          .then(({ data: gp }) => { if (gp) { navigate("/aerien/apercu"); return; } setLoading(false); });
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
          options: { emailRedirectTo: `${window.location.origin}/aerien/inscription`, data: { full_name: form.businessName } }
        });
        if (error) throw error;
        userId = data.user!.id;
      }

      const { error: gpError } = await supabase.from("gp_profiles").insert({
        user_id: userId, business_name: form.businessName, phone: form.phone,
        city: form.city, country_code: "SN", gp_type: "aerien" as any,
        base_origin_city: form.airportOrigin, base_destination_city: form.airportDest,
        status: "pending" as any, kyc_status: "pending",
      });
      if (gpError) throw gpError;

      toast({ title: "Inscription réussie !", description: "Votre profil aérien cargo est en cours de vérification." });
      navigate("/aerien/apercu");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (loading) return <TransportPageLoader />;

  const progress = ((step + 1) / STEPS.length) * 100;
  const canNext = step === 0 ? form.businessName && form.phone && form.email
    : step === 1 ? form.airportOrigin && form.airportDest && form.city
    : step === 2 ? form.airRole && form.capacityKg
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
          <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Aérien Cargo — {STEPS[step]}</h1>
            <p className="text-xs text-muted-foreground">Inscription fret aérien</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {step === 0 && (
              <>
                <div><Label>Nom / Entreprise</Label><Input value={form.businessName} onChange={e => set("businessName", e.target.value)} placeholder="Ex: AirFret Express" /></div>
                <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+221 77 000 00 00" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="contact@airfret.com" /></div>
                <div className="relative"><Label>Mot de passe</Label><Input type={showPwd ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min. 6 caractères" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-8">{showPwd ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}</button>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <div><Label>Aéroport d'origine</Label>
                  <Select value={form.airportOrigin} onValueChange={v => set("airportOrigin", v)}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{AIRPORTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Aéroport de destination</Label>
                  <Select value={form.airportDest} onValueChange={v => set("airportDest", v)}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{AIRPORTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Ville de base</Label><Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Ex: Paris" /></div>
              </>
            )}
            {step === 2 && (
              <>
                <div><Label>Type de profil</Label>
                  <div className="grid grid-cols-1 gap-2 mt-1">
                    {AIR_ROLES.map(r => (
                      <button key={r.value} onClick={() => set("airRole", r.value)}
                        className={`p-3 rounded-xl border text-left transition-all ${form.airRole === r.value ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10" : "border-border bg-card"}`}>
                        <p className="text-sm font-semibold">{r.label}</p>
                        <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div><Label>Capacité moyenne (kg)</Label><Input type="number" value={form.capacityKg} onChange={e => set("capacityKg", e.target.value)} placeholder="Ex: 500" /></div>
              </>
            )}
            {step === 3 && (
              <div className="text-center py-6 space-y-3">
                <CheckCircle className="w-12 h-12 text-violet-600 mx-auto" />
                <h2 className="text-lg font-bold">Tout est prêt !</h2>
                <p className="text-sm text-muted-foreground">Votre profil aérien sera vérifié sous 24h</p>
                <div className="bg-muted/50 rounded-xl p-3 text-left text-xs space-y-1">
                  <p><strong>Entreprise:</strong> {form.businessName}</p>
                  <p><strong>Corridor:</strong> {form.airportOrigin} → {form.airportDest}</p>
                  <p><strong>Profil:</strong> {form.airRole === "independent" ? "Indépendant" : "Shipping Partner"}</p>
                  <p><strong>Capacité:</strong> {form.capacityKg} kg</p>
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
