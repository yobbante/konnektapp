/**
 * AgenceRegistration — Inscription agence / transitaire
 * Style GP Bagages : header sticky + barres d'étapes + footer fixe
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Building, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle, MapPin, Lock, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

const COUNTRIES = [
  { code: "SN", name: "🇸🇳 Sénégal", dialCode: "+221" },
  { code: "CI", name: "🇨🇮 Côte d'Ivoire", dialCode: "+225" },
  { code: "ML", name: "🇲🇱 Mali", dialCode: "+223" },
  { code: "BF", name: "🇧🇫 Burkina Faso", dialCode: "+226" },
  { code: "GN", name: "🇬🇳 Guinée", dialCode: "+224" },
];

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  SN: ["Dakar", "Thiès", "Saint-Louis", "Kaolack", "Touba", "Ziguinchor", "Mbour"],
  CI: ["Abidjan", "Yamoussoukro", "Bouaké", "San-Pédro"],
  ML: ["Bamako", "Sikasso", "Ségou"],
  BF: ["Ouagadougou", "Bobo-Dioulasso"],
  GN: ["Conakry", "Kankan"],
};

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

const TOTAL_STEPS = 4;
const stepsConfig = [
  { num: 1, label: "Coordonnées" },
  { num: 2, label: "Identité" },
  { num: 3, label: "Services" },
  { num: 4, label: "Confirmation" },
];

export default function AgenceRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneUnique, setPhoneUnique] = useState<boolean | null>(null);

  const [country, setCountry] = useState("SN");
  const [city, setCity] = useState("");
  const [form, setForm] = useState({
    businessName: "", phone: "", email: "", password: "",
    address: "", registrationNumber: "",
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

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!form.phone || form.phone.length < 8) { setPhoneUnique(null); return; }
      setPhoneChecking(true);
      const clean = form.phone.replace(/\s+/g, "");
      const { data } = await supabase.from("profiles").select("user_id").eq("phone", clean).maybeSingle();
      setPhoneUnique(!data);
      setPhoneChecking(false);
    }, 600);
    return () => clearTimeout(t);
  }, [form.phone]);

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
        user_id: userId, business_name: form.businessName, phone: form.phone.replace(/\s+/g, ""),
        city, address: form.address, country_code: country,
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

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const cities = CITIES_BY_COUNTRY[country] || [];

  const canNext = step === 1 ? country && city && form.phone && phoneUnique !== false
    : step === 2 ? form.businessName && form.email
    : step === 3 ? form.services.length > 0
    : true;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border flex-shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-3 px-4 h-12">
          <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)} className="h-8 w-8 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Agence / Transitaire</p>
          </div>
          <div className="flex items-center gap-1.5">
            {stepsConfig.map((s) => (
              <div key={s.num} className={`w-6 h-1.5 rounded-full transition-all ${step >= s.num ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full pb-24">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <div className="text-center mb-2">
                <div className="w-10 h-10 mx-auto bg-emerald-600 rounded-xl flex items-center justify-center mb-2">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-bold">Devenir Agence</h1>
                <p className="text-xs text-muted-foreground">Transitaire & logistique</p>
              </div>
              <Card><CardContent className="p-4 space-y-3">
                <h2 className="text-base font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Coordonnées</h2>
                <div className="space-y-1"><Label className="text-xs">Pays *</Label>
                  <Select value={country} onValueChange={setCountry}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Ville *</Label>
                  <Select value={city} onValueChange={setCity}><SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Téléphone *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">{selectedCountry?.dialCode}</span>
                    <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="33 000 00 00" className="pl-14 h-10" />
                    {phoneChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                    {!phoneChecking && phoneUnique === true && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                  </div>
                  {phoneUnique === false && <p className="text-[11px] text-destructive">Ce numéro est déjà utilisé</p>}
                </div>
              </CardContent></Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card><CardContent className="p-4 space-y-3">
                <h2 className="text-base font-semibold">Informations de l'agence</h2>
                <div className="space-y-1"><Label className="text-xs">Raison sociale *</Label><Input value={form.businessName} onChange={e => set("businessName", e.target.value)} className="h-10" placeholder="Transit Express SARL" /></div>
                <div className="space-y-1"><Label className="text-xs">Adresse</Label><Input value={form.address} onChange={e => set("address", e.target.value)} className="h-10" placeholder="Rue, quartier..." /></div>
                <div className="space-y-1"><Label className="text-xs">N° registre commerce</Label><Input value={form.registrationNumber} onChange={e => set("registrationNumber", e.target.value)} className="h-10" placeholder="NINEA / RC" /></div>
                <div className="space-y-1"><Label className="text-xs">Email *</Label>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="pl-10 h-10" placeholder="contact@transit.sn" /></div>
                </div>
                <div className="space-y-1"><Label className="text-xs">Mot de passe *</Label>
                  <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type={showPwd ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} className="pl-10 pr-10 h-10" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                </div>
              </CardContent></Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card><CardContent className="p-4 space-y-3">
                <h2 className="text-base font-semibold">Services proposés</h2>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICES.map(s => (
                    <button key={s.id} onClick={() => toggleService(s.id)}
                      className={`p-2.5 rounded-xl border-2 text-xs font-medium transition-all text-left ${form.services.includes(s.id) ? "border-primary bg-primary/5 shadow-md" : "border-border"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </CardContent></Card>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center py-6 space-y-3">
                <CheckCircle className="w-12 h-12 text-primary mx-auto" />
                <h2 className="text-lg font-bold">Inscription soumise !</h2>
                <p className="text-sm text-muted-foreground">Vérification sous 48h</p>
                <div className="bg-muted/50 rounded-xl p-3 text-left text-xs space-y-1">
                  <p><strong>Agence:</strong> {form.businessName}</p>
                  <p><strong>Siège:</strong> {city}</p>
                  <p><strong>Services:</strong> {form.services.length} activités</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
        <div className="max-w-lg mx-auto">
          <Button className="w-full h-12 gap-2 text-sm font-semibold" disabled={!canNext || submitting}
            onClick={() => step < TOTAL_STEPS ? setStep(s => s + 1) : handleSubmit()}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : step === TOTAL_STEPS ? (
              <><CheckCircle className="w-4 h-4" /> Finaliser</>
            ) : (
              <>Continuer <ArrowRight className="w-4 h-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
