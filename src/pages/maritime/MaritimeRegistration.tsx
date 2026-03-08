/**
 * MaritimeRegistration — Inscription transporteur maritime
 * Style GP Bagages : header sticky + barres d'étapes + footer fixe
 */
import { useState, useEffect } from "react";
import { getEntryFlowData } from "@/lib/entryFlowData";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Ship, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle, MapPin, Lock, Mail, Loader2 } from "lucide-react";
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
  { code: "FR", name: "🇫🇷 France", dialCode: "+33" },
  { code: "MA", name: "🇲🇦 Maroc", dialCode: "+212" },
  { code: "TG", name: "🇹🇬 Togo", dialCode: "+228" },
];

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  SN: ["Dakar", "Saint-Louis", "Ziguinchor"],
  CI: ["Abidjan", "San-Pédro"],
  FR: ["Marseille", "Le Havre", "Paris"],
  MA: ["Casablanca", "Tanger"],
  TG: ["Lomé"],
};

const PORTS = ["Dakar", "Marseille", "Le Havre", "Abidjan", "Casablanca", "New York", "Dubaï", "Cotonou", "Lomé", "Douala", "Conakry"];
const CONTAINER_TYPES = [
  { value: "20ft", label: "Conteneur 20ft" },
  { value: "40ft", label: "Conteneur 40ft" },
  { value: "lcl", label: "Groupage (LCL)" },
  { value: "roro", label: "RoRo (véhicules)" },
  { value: "bulk", label: "Vrac" },
];

const TOTAL_STEPS = 5;
const stepsConfig = [
  { num: 1, label: "Coordonnées" },
  { num: 2, label: "Identité" },
  { num: 3, label: "Corridor" },
  { num: 4, label: "Tarifs" },
  { num: 5, label: "Confirmation" },
];

export default function MaritimeRegistration() {
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
    portOrigin: "", portDest: "",
    containerTypes: [] as string[], capacityM3: "",
    priceLclPerM3: "", priceLclPerKg: "",
    forfaitContainer20ft: "", forfaitContainer40ft: "", forfaitRoRo: "",
    currency: "XOF",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("gp_profiles").select("id").eq("user_id", data.user.id).maybeSingle()
          .then(({ data: gp }) => { if (gp) { navigate("/gp/dashboard"); return; } setLoading(false); });
      } else { setLoading(false); }
    });
  }, []);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

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
          options: { emailRedirectTo: `${window.location.origin}/maritime/inscription`, data: { full_name: form.businessName } }
        });
        if (error) throw error;
        userId = data.user!.id;
      }

      const { data: existingGp } = await supabase.from("gp_profiles").select("id").eq("user_id", userId).maybeSingle();
      if (existingGp) {
        toast({ title: "Profil existant" });
        navigate("/gp/dashboard");
        return;
      }

      const cleanPhone = form.phone.replace(/\s+/g, "").replace(/^\+/, "");
      const { error: gpError } = await supabase.from("gp_profiles").insert({
        user_id: userId, business_name: form.businessName, phone: cleanPhone,
        city, country_code: country, gp_type: "maritime" as any,
        base_origin_city: form.portOrigin, base_destination_city: form.portDest,
        base_price_per_kg: form.priceLclPerKg ? parseFloat(form.priceLclPerKg) : null,
        default_currency: form.currency,
        status: "pending" as any, kyc_status: "pending",
      });
      if (gpError) throw gpError;

      toast({ title: "Inscription réussie !", description: "Profil maritime en vérification." });
      navigate("/maritime/apercu");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (loading) return <TransportPageLoader />;

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const cities = CITIES_BY_COUNTRY[country] || [];

  const canNext = step === 1 ? country && city && form.phone && phoneUnique !== false
    : step === 2 ? form.businessName && form.email
    : step === 3 ? form.portOrigin && form.portDest && form.capacityM3
    : step === 4 ? (form.priceLclPerM3 || form.forfaitContainer20ft)
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
            <p className="text-sm font-semibold truncate">Maritime</p>
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
                <div className="w-10 h-10 mx-auto bg-blue-600 rounded-xl flex items-center justify-center mb-2">
                  <Ship className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-bold">Maritime</h1>
                <p className="text-xs text-muted-foreground">Conteneurs & groupage</p>
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
                    <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="77 000 00 00" className="pl-14 h-10" />
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
                <h2 className="text-base font-semibold">Votre identité</h2>
                <div className="space-y-1"><Label className="text-xs">Nom de l'entreprise *</Label><Input value={form.businessName} onChange={e => set("businessName", e.target.value)} className="h-10" placeholder="Konnekt Maritime SARL" /></div>
                <div className="space-y-1"><Label className="text-xs">Email *</Label>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="pl-10 h-10" placeholder="contact@maritime.sn" /></div>
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
                <h2 className="text-base font-semibold">Corridor maritime</h2>
                <div className="space-y-1"><Label className="text-xs">Port d'origine *</Label>
                  <Select value={form.portOrigin} onValueChange={v => set("portOrigin", v)}><SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{PORTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Port de destination *</Label>
                  <Select value={form.portDest} onValueChange={v => set("portDest", v)}><SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{PORTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Capacité totale (m³) *</Label><Input type="number" value={form.capacityM3} onChange={e => set("capacityM3", e.target.value)} className="h-10" placeholder="30" /></div>
                <div className="space-y-1"><Label className="text-xs">Types de conteneurs</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CONTAINER_TYPES.map(ct => (
                      <button key={ct.value} onClick={() => set("containerTypes", form.containerTypes.includes(ct.value) ? form.containerTypes.filter(x => x !== ct.value) : [...form.containerTypes, ct.value])}
                        className={`p-2 rounded-xl border-2 text-xs font-medium transition-all ${form.containerTypes.includes(ct.value) ? "border-primary bg-primary/5 shadow-md" : "border-border"}`}>
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent></Card>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-3 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Ship className="w-5 h-5" /></div>
                    <div>
                      <h2 className="font-bold text-sm">Grille tarifaire maritime</h2>
                      <p className="text-white/80 text-[10px]">LCL · FCL · RoRo</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  {(form.containerTypes.includes("lcl") || form.containerTypes.length === 0) && (
                    <div className="p-3 rounded-xl border-2 border-sky-500/30 bg-sky-500/5 space-y-2">
                      <p className="text-xs font-bold">📦 Groupage (LCL)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><Label className="text-[10px]">Prix / m³</Label>
                          <div className="relative"><Input type="number" value={form.priceLclPerM3} onChange={e => set("priceLclPerM3", e.target.value)} className="h-9" placeholder="150000" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.currency}/m³</span></div>
                        </div>
                        <div className="space-y-1"><Label className="text-[10px]">Prix / kg vol.</Label>
                          <div className="relative"><Input type="number" value={form.priceLclPerKg} onChange={e => set("priceLclPerKg", e.target.value)} className="h-9" placeholder="500" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.currency}/kg</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {(form.containerTypes.includes("20ft") || form.containerTypes.includes("40ft")) && (
                    <div className="p-3 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 space-y-2">
                      <p className="text-xs font-bold">🚢 FCL</p>
                      <div className="grid grid-cols-2 gap-2">
                        {form.containerTypes.includes("20ft") && (
                          <div className="space-y-1"><Label className="text-[10px]">Forfait 20ft</Label>
                            <div className="relative"><Input type="number" value={form.forfaitContainer20ft} onChange={e => set("forfaitContainer20ft", e.target.value)} className="h-9" placeholder="1500000" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.currency}</span></div></div>
                        )}
                        {form.containerTypes.includes("40ft") && (
                          <div className="space-y-1"><Label className="text-[10px]">Forfait 40ft</Label>
                            <div className="relative"><Input type="number" value={form.forfaitContainer40ft} onChange={e => set("forfaitContainer40ft", e.target.value)} className="h-9" placeholder="2500000" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.currency}</span></div></div>
                        )}
                      </div>
                    </div>
                  )}
                  {form.containerTypes.includes("roro") && (
                    <div className="p-3 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 space-y-2">
                      <p className="text-xs font-bold">🚗 RoRo</p>
                      <div className="space-y-1"><Label className="text-[10px]">Forfait / véhicule</Label>
                        <div className="relative"><Input type="number" value={form.forfaitRoRo} onChange={e => set("forfaitRoRo", e.target.value)} className="h-9" placeholder="800000" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.currency}</span></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center py-6 space-y-3">
                <CheckCircle className="w-12 h-12 text-primary mx-auto" />
                <h2 className="text-lg font-bold">Inscription soumise !</h2>
                <p className="text-sm text-muted-foreground">Vérification en cours</p>
                <div className="bg-muted/50 rounded-xl p-3 text-left text-xs space-y-1">
                  <p><strong>Entreprise:</strong> {form.businessName}</p>
                  <p><strong>Corridor:</strong> {form.portOrigin} → {form.portDest}</p>
                  <p><strong>Capacité:</strong> {form.capacityM3} m³</p>
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
