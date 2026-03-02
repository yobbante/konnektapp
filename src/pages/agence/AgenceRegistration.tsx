/**
 * AgenceRegistration — Inscription agence / transitaire
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Building, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

const STEPS = ["Identité", "Services", "Documents", "Confirmation"];
const SERVICES = [
  { id: "aerien", label: "✈️ Fret aérien" },
  { id: "maritime", label: "🚢 Fret maritime" },
  { id: "routier", label: "🚛 Transport routier" },
  { id: "douane", label: "📋 Dédouanement" },
  { id: "entreposage", label: "🏭 Entreposage" },
  { id: "assurance", label: "🛡️ Assurance transport" },
  { id: "multimodal", label: "🔄 Multimodal" },
  { id: "last_mile", label: "📦 Dernier kilomètre" },
];

export default function AgenceRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    businessName: "", phone: "", email: "", password: "",
    city: "", address: "", registrationNumber: "",
    services: [] as string[],
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("gp_profiles").select("id").eq("user_id", data.user.id).eq("gp_type", "agence").maybeSingle()
          .then(({ data: gp }) => { if (gp) { navigate("/"); return; } setLoading(false); });
      } else { setLoading(false); }
    });
  }, []);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const toggleService = (id: string) => set("services", form.services.includes(id) ? form.services.filter(s => s !== id) : [...form.services, id]);

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
          options: { emailRedirectTo: `${window.location.origin}/agence/inscription`, data: { full_name: form.businessName } }
        });
        if (error) throw error;
        userId = data.user!.id;
      }

      const { error: gpError } = await supabase.from("gp_profiles").insert({
        user_id: userId, business_name: form.businessName, phone: form.phone,
        city: form.city, address: form.address, country_code: "SN",
        gp_type: "agence" as any,
        status: "pending" as any, kyc_status: "pending",
        id_number: form.registrationNumber,
      });
      if (gpError) throw gpError;

      toast({ title: "Inscription réussie !", description: "Votre agence sera vérifiée sous 48h." });
      navigate("/");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (loading) return <TransportPageLoader />;

  const progress = ((step + 1) / STEPS.length) * 100;
  const canNext = step === 0 ? form.businessName && form.phone && form.email
    : step === 1 ? form.services.length > 0
    : step === 2 ? form.city
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
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Agence — {STEPS[step]}</h1>
            <p className="text-xs text-muted-foreground">Transitaire & logistique</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {step === 0 && (
              <>
                <div><Label>Raison sociale</Label><Input value={form.businessName} onChange={e => set("businessName", e.target.value)} placeholder="Ex: Transit Express SARL" /></div>
                <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+221 33 000 00 00" /></div>
                <div><Label>Email professionnel</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="contact@transit.sn" /></div>
                <div className="relative"><Label>Mot de passe</Label><Input type={showPwd ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min. 6 caractères" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-8">{showPwd ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}</button>
                </div>
              </>
            )}
            {step === 1 && (
              <div><Label>Services proposés</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {SERVICES.map(s => (
                    <button key={s.id} onClick={() => toggleService(s.id)}
                      className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${form.services.includes(s.id) ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "border-border bg-card"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step === 2 && (
              <>
                <div><Label>Ville du siège</Label><Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Ex: Dakar" /></div>
                <div><Label>Adresse</Label><Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Rue, quartier..." /></div>
                <div><Label>N° registre commerce (optionnel)</Label><Input value={form.registrationNumber} onChange={e => set("registrationNumber", e.target.value)} placeholder="NINEA / RC" /></div>
              </>
            )}
            {step === 3 && (
              <div className="text-center py-6 space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                <h2 className="text-lg font-bold">Inscription soumise !</h2>
                <p className="text-sm text-muted-foreground">Vérification sous 48h</p>
                <div className="bg-muted/50 rounded-xl p-3 text-left text-xs space-y-1">
                  <p><strong>Agence:</strong> {form.businessName}</p>
                  <p><strong>Siège:</strong> {form.city}</p>
                  <p><strong>Services:</strong> {form.services.length} activités</p>
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
