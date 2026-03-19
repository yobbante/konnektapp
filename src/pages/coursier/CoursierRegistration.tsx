/**
 * CoursierRegistration — Inscription coursier express local
 * Style GP Bagages : header sticky + barres d'étapes + footer fixe
 */
import { useState, useEffect, useMemo } from "react";
import { useActiveCities } from "@/hooks/useActiveCities";
import { getEntryFlowData } from "@/lib/entryFlowData";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Package, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle, MapPin, Lock, Mail, Loader2 } from "lucide-react";
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

// Cities are now loaded dynamically from platform_active_cities via useActiveCities hook
// Keeping minimal fallback for offline
const CITIES_BY_COUNTRY: Record<string, string[]> = {
  SN: ["Dakar"],
  CI: ["Abidjan"],
  ML: ["Bamako"],
  BF: ["Ouagadougou"],
  GN: ["Conakry"],
};

const VEHICLE_TYPES = [
  { value: "moto", label: "🏍️ Moto" },
  { value: "velo", label: "🚲 Vélo" },
  { value: "scooter", label: "🛵 Scooter" },
  { value: "voiture", label: "🚗 Voiture" },
  { value: "a_pied", label: "🚶 À pied" },
];

const TOTAL_STEPS = 4;
const stepsConfig = [
  { num: 1, label: "Coordonnées" },
  { num: 2, label: "Identité" },
  { num: 3, label: "Véhicule" },
  { num: 4, label: "Confirmation" },
];

export default function CoursierRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneUnique, setPhoneUnique] = useState<boolean | null>(null);

  const entryFlow = getEntryFlowData();
  const [country, setCountry] = useState(entryFlow.countryCode || "SN");
  const [city, setCity] = useState(entryFlow.city || "");
  const [form, setForm] = useState({
    fullName: "", phone: entryFlow.phone || "", email: "", password: "",
    zone: "", vehicleType: "",
  });
  const { cities: activeCities } = useActiveCities();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("gp_profiles").select("id").eq("user_id", data.user.id).eq("gp_type", "express").maybeSingle()
          .then(({ data: gp }) => { if (gp) { navigate("/"); return; } setLoading(false); });
      } else { setLoading(false); }
    });
  }, []);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  // Phone uniqueness
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
          options: { emailRedirectTo: `${window.location.origin}/coursier/inscription`, data: { full_name: form.fullName } }
        });
        if (error) throw error;
        userId = data.user!.id;
      }

      const { error: gpError } = await supabase.from("gp_profiles").insert({
        user_id: userId, business_name: form.fullName, phone: form.phone.replace(/\s+/g, ""),
        city, country_code: country, gp_type: "express" as any,
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

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const { cities: activeCities } = useActiveCities();
  const cities = useMemo(() => {
    const fromDb = activeCities.filter(c => c.country_code === country).map(c => c.city);
    return fromDb.length > 0 ? fromDb : (CITIES_BY_COUNTRY[country] || []);
  }, [country, activeCities]);

  const canNext = step === 1 ? country && city && form.phone && phoneUnique !== false
    : step === 2 ? form.fullName && form.email
    : step === 3 ? form.vehicleType
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
            <p className="text-sm font-semibold truncate">Coursier Express</p>
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
                <div className="w-10 h-10 mx-auto bg-orange-500 rounded-xl flex items-center justify-center mb-2">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-bold">Devenir Coursier</h1>
                <p className="text-xs text-muted-foreground">Livraison express locale</p>
              </div>
              <Card><CardContent className="p-4 space-y-3">
                <h2 className="text-base font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Vos coordonnées</h2>
                <div className="space-y-1"><Label className="text-xs">Pays *</Label>
                  {entryFlow.hasCity ? (
                    <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">{selectedCountry?.name || country}<span className="ml-auto text-[10px] text-primary">✓ Déjà renseigné</span></div>
                  ) : (
                    <Select value={country} onValueChange={setCountry}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>{COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent></Select>
                  )}
                </div>
                <div className="space-y-1"><Label className="text-xs">Ville *</Label>
                  {entryFlow.hasCity ? (
                    <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">{city}<span className="ml-auto text-[10px] text-primary">✓ Déjà renseigné</span></div>
                  ) : (
                    <Select value={city} onValueChange={setCity}><SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                  )}
                </div>
                <div className="space-y-1"><Label className="text-xs">Téléphone *</Label>
                  {entryFlow.hasPhone ? (
                    <>
                      <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">{form.phone}<span className="ml-auto text-[10px] text-primary">✓ Déjà renseigné</span></div>
                      <p className="text-[11px] text-muted-foreground">Ce numéro a été vérifié lors de votre inscription</p>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">{selectedCountry?.dialCode}</span>
                        <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="77 123 45 67" className="pl-14 h-10" />
                        {phoneChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                        {!phoneChecking && phoneUnique === true && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                      </div>
                      {phoneUnique === false && <p className="text-[11px] text-destructive">Ce numéro est déjà utilisé</p>}
                    </>
                  )}
                </div>
              </CardContent></Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card><CardContent className="p-4 space-y-3">
                <h2 className="text-base font-semibold">Votre identité</h2>
                <div className="space-y-1"><Label className="text-xs">Nom complet *</Label><Input value={form.fullName} onChange={e => set("fullName", e.target.value)} className="h-10" placeholder="Moussa Diallo" /></div>
                <div className="space-y-1"><Label className="text-xs">Zone / Quartier</Label><Input value={form.zone} onChange={e => set("zone", e.target.value)} className="h-10" placeholder="Plateau, Almadies..." /></div>
                <div className="space-y-1"><Label className="text-xs">Email *</Label>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="pl-10 h-10" placeholder="votre@email.com" /></div>
                </div>
                <div className="space-y-1"><Label className="text-xs">Mot de passe *</Label>
                  <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type={showPwd ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} className="pl-10 pr-10 h-10" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button></div>
                </div>
              </CardContent></Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card><CardContent className="p-4 space-y-3">
                <h2 className="text-base font-semibold">Type de véhicule</h2>
                <div className="grid grid-cols-2 gap-2">
                  {VEHICLE_TYPES.map(v => (
                    <button key={v.value} onClick={() => set("vehicleType", v.value)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${form.vehicleType === v.value ? "border-primary bg-primary/5 shadow-md" : "border-border"}`}>
                      {v.label}
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
                <h2 className="text-lg font-bold">Tout est prêt !</h2>
                <p className="text-sm text-muted-foreground">Votre profil coursier va être créé</p>
                <div className="bg-muted/50 rounded-xl p-3 text-left text-xs space-y-1">
                  <p><strong>Nom:</strong> {form.fullName}</p>
                  <p><strong>Zone:</strong> {city} — {form.zone}</p>
                  <p><strong>Véhicule:</strong> {VEHICLE_TYPES.find(v => v.value === form.vehicleType)?.label}</p>
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
