/**
 * AerienRegistration — Inscription transporteur aérien cargo
 * Style GP Bagages : header sticky + barres d'étapes + footer fixe
 */
import { useState, useEffect } from "react";
import { getEntryFlowData } from "@/lib/entryFlowData";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Plane, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle, MapPin, Lock, Mail, Loader2, DollarSign, Shield } from "lucide-react";
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
  { code: "US", name: "🇺🇸 États-Unis", dialCode: "+1" },
  { code: "MA", name: "🇲🇦 Maroc", dialCode: "+212" },
];

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  SN: ["Dakar", "Thiès", "Saint-Louis"],
  CI: ["Abidjan", "Yamoussoukro"],
  FR: ["Paris", "Lyon", "Marseille"],
  US: ["New York", "Los Angeles", "Chicago"],
  MA: ["Casablanca", "Rabat", "Marrakech"],
};

const AIRPORTS = ["Paris CDG", "Paris Orly", "Dakar AIBD", "Abidjan FHB", "New York JFK", "Casablanca CMN", "Dubaï DXB", "Bruxelles BRU", "Conakry CKY", "Douala DLA"];
const AIR_ROLES = [
  { value: "independent", label: "Indépendant", desc: "Voyageur fréquent / consolidateur" },
  { value: "shipping_partner", label: "Shipping Partner", desc: "Agence cargo / agent IATA" },
];

const TOTAL_STEPS = 5;
const stepsConfig = [
  { num: 1, label: "Coordonnées" },
  { num: 2, label: "Identité" },
  { num: 3, label: "Corridor" },
  { num: 4, label: "Tarifs" },
  { num: 5, label: "Confirmation" },
];

export default function AerienRegistration() {
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
    businessName: "", phone: entryFlow.phone || "", email: "", password: "",
    airportOrigin: "", airportDest: "",
    airRole: "", capacityKg: "",
    pricePerKg: "", forfaitMinimum: "",
    surchargeCarburant: "", forfaitExpress: "",
    currency: "XOF",
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
          options: { emailRedirectTo: `${window.location.origin}/aerien/inscription`, data: { full_name: form.businessName } }
        });
        if (error) throw error;
        userId = data.user!.id;
      }

      const cleanPhone = form.phone.replace(/\s+/g, "").replace(/^\+/, "");
      const { error: gpError } = await supabase.from("gp_profiles").insert({
        user_id: userId, business_name: form.businessName, phone: cleanPhone,
        city, country_code: country, gp_type: "aerien" as any,
        base_origin_city: form.airportOrigin, base_destination_city: form.airportDest,
        base_price_per_kg: form.pricePerKg ? parseFloat(form.pricePerKg) : null,
        default_currency: form.currency,
        status: "pending" as any, kyc_status: "pending",
      });
      if (gpError) throw gpError;

      toast({ title: "Inscription réussie !", description: "Profil aérien cargo en vérification." });
      navigate("/aerien/apercu");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (loading) return <TransportPageLoader />;

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const cities = CITIES_BY_COUNTRY[country] || [];

  const canNext = step === 1 ? country && city && form.phone && phoneUnique !== false
    : step === 2 ? form.businessName && form.email
    : step === 3 ? form.airportOrigin && form.airportDest && form.airRole && form.capacityKg
    : step === 4 ? form.pricePerKg
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
            <p className="text-sm font-semibold truncate">Aérien Cargo</p>
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
                <div className="w-10 h-10 mx-auto bg-violet-600 rounded-xl flex items-center justify-center mb-2">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-bold">Aérien Cargo</h1>
                <p className="text-xs text-muted-foreground">Inscription fret aérien</p>
              </div>
              <Card><CardContent className="p-4 space-y-3">
                <h2 className="text-base font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Coordonnées</h2>
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
                        <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="77 000 00 00" className="pl-14 h-10" />
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
                <div className="space-y-1"><Label className="text-xs">Nom / Entreprise *</Label><Input value={form.businessName} onChange={e => set("businessName", e.target.value)} className="h-10" placeholder="AirFret Express" /></div>
                <div className="space-y-1"><Label className="text-xs">Email *</Label>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="pl-10 h-10" placeholder="contact@airfret.com" /></div>
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
                <h2 className="text-base font-semibold">Corridor aérien</h2>
                <div className="space-y-1"><Label className="text-xs">Aéroport d'origine *</Label>
                  <Select value={form.airportOrigin} onValueChange={v => set("airportOrigin", v)}><SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{AIRPORTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Aéroport de destination *</Label>
                  <Select value={form.airportDest} onValueChange={v => set("airportDest", v)}><SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{AIRPORTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Type de profil *</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {AIR_ROLES.map(r => (
                      <button key={r.value} onClick={() => set("airRole", r.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${form.airRole === r.value ? "border-primary bg-primary/5 shadow-md" : "border-border"}`}>
                        <p className="text-sm font-semibold">{r.label}</p>
                        <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1"><Label className="text-xs">Capacité moyenne (kg) *</Label><Input type="number" value={form.capacityKg} onChange={e => set("capacityKg", e.target.value)} className="h-10" placeholder="500" /></div>
              </CardContent></Card>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-4 py-3 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <Plane className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-sm">Tarification aérien cargo</h2>
                      <p className="text-white/80 text-[10px]">Prix/kg · Forfait minimum · Express</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="p-3 rounded-xl border-2 border-violet-500/30 bg-violet-500/5 space-y-2">
                    <Label className="text-xs font-semibold">Prix par kilogramme *</Label>
                    <div className="relative">
                      <Input type="number" value={form.pricePerKg} onChange={e => set("pricePerKg", e.target.value)} placeholder="3500" className="h-10 text-base font-medium" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.currency}/kg</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
                    <Label className="text-xs font-semibold">Forfait minimum</Label>
                    <div className="relative">
                      <Input type="number" value={form.forfaitMinimum} onChange={e => set("forfaitMinimum", e.target.value)} placeholder="25000" className="h-10" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.currency}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
                    <Label className="text-xs font-semibold">Options</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Surcharge carburant</Label>
                        <div className="relative">
                          <Input type="number" value={form.surchargeCarburant} onChange={e => set("surchargeCarburant", e.target.value)} placeholder="5" className="h-9" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Express J+1</Label>
                        <div className="relative">
                          <Input type="number" value={form.forfaitExpress} onChange={e => set("forfaitExpress", e.target.value)} placeholder="15000" className="h-9" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.currency}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {form.pricePerKg && (
                    <div className="p-3 rounded-xl bg-muted/50 border space-y-1.5">
                      <p className="text-[10px] font-bold">📊 Simulation</p>
                      <div className="text-[11px] space-y-1">
                        <div className="flex justify-between py-0.5 border-b border-border/50">
                          <span className="text-muted-foreground">10 kg</span>
                          <span className="font-bold">{Math.max(parseInt(form.pricePerKg) * 10, parseInt(form.forfaitMinimum || "0")).toLocaleString()} {form.currency}</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-muted-foreground">50 kg</span>
                          <span className="font-bold">{Math.max(parseInt(form.pricePerKg) * 50, parseInt(form.forfaitMinimum || "0")).toLocaleString()} {form.currency}</span>
                        </div>
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
                <h2 className="text-lg font-bold">Tout est prêt !</h2>
                <p className="text-sm text-muted-foreground">Profil vérifié sous 24h</p>
                <div className="bg-muted/50 rounded-xl p-3 text-left text-xs space-y-1">
                  <p><strong>Entreprise:</strong> {form.businessName}</p>
                  <p><strong>Corridor:</strong> {form.airportOrigin} → {form.airportDest}</p>
                  <p><strong>Profil:</strong> {form.airRole === "independent" ? "Indépendant" : "Shipping Partner"}</p>
                  <p><strong>Tarif:</strong> {form.pricePerKg ? `${parseInt(form.pricePerKg).toLocaleString()} ${form.currency}/kg` : "—"}</p>
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
