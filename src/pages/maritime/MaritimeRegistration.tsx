/**
 * MaritimeRegistration — Inscription transporteur maritime
 * Formulaire multi-étape : Identité → Corridor → Capacité → Tarification → Confirmation
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Ship, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

const STEPS = ["Identité", "Corridor", "Capacité", "Tarification", "Confirmation"];

const PORTS = [
  "Dakar", "Marseille", "Le Havre", "Abidjan", "Casablanca", "New York", "Dubaï", "Cotonou", "Lomé", "Douala", "Conakry"
];

const CONTAINER_TYPES = [
  { value: "20ft", label: "Conteneur 20ft" },
  { value: "40ft", label: "Conteneur 40ft" },
  { value: "lcl", label: "Groupage (LCL)" },
  { value: "roro", label: "RoRo (véhicules)" },
  { value: "bulk", label: "Vrac" },
];

export default function MaritimeRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    businessName: "", phone: "", email: "", password: "",
    portOrigin: "", portDest: "", city: "",
    containerTypes: [] as string[], capacityM3: "",
    // Pricing maritime
    priceLclPerM3: "",
    priceLclPerKg: "",
    forfaitContainer20ft: "",
    forfaitContainer40ft: "",
    forfaitRoRo: "",
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
        toast({ title: "Profil existant", description: "Vous avez déjà un profil transporteur." });
        navigate("/gp/dashboard");
        return;
      }

      const cleanPhone = form.phone.replace(/\s+/g, "").replace(/^\+/, "");
      const { error: gpError } = await supabase.from("gp_profiles").insert({
        user_id: userId, business_name: form.businessName, phone: cleanPhone,
        city: form.city, country_code: "SN", gp_type: "maritime" as any,
        base_origin_city: form.portOrigin, base_destination_city: form.portDest,
        base_price_per_kg: form.priceLclPerKg ? parseFloat(form.priceLclPerKg) : null,
        default_currency: form.currency,
        status: "pending" as any, kyc_status: "pending",
      });
      if (gpError) throw gpError;

      toast({ title: "Inscription réussie !", description: "Votre profil maritime est en cours de vérification." });
      navigate("/maritime/apercu");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (loading) return <TransportPageLoader />;

  const progress = ((step + 1) / STEPS.length) * 100;
  const canNext = step === 0 ? form.businessName && form.phone && form.email
    : step === 1 ? form.portOrigin && form.portDest && form.city
    : step === 2 ? form.capacityM3
    : step === 3 ? (form.priceLclPerM3 || form.forfaitContainer20ft)
    : true;

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
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
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Maritime — {STEPS[step]}</h1>
            <p className="text-xs text-muted-foreground">Inscription transporteur maritime</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {step === 0 && (
              <>
                <div><Label>Nom de l'entreprise</Label><Input value={form.businessName} onChange={e => set("businessName", e.target.value)} placeholder="Ex: Konnekt Maritime SARL" /></div>
                <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+221 77 000 00 00" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="contact@maritime.sn" /></div>
                <div className="relative"><Label>Mot de passe</Label><Input type={showPwd ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min. 6 caractères" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-8">{showPwd ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}</button>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <div><Label>Port d'origine</Label>
                  <Select value={form.portOrigin} onValueChange={v => set("portOrigin", v)}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{PORTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Port de destination</Label>
                  <Select value={form.portDest} onValueChange={v => set("portDest", v)}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{PORTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Ville de base</Label><Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Ex: Dakar" /></div>
              </>
            )}
            {step === 2 && (
              <>
                <div><Label>Capacité totale (m³)</Label><Input type="number" value={form.capacityM3} onChange={e => set("capacityM3", e.target.value)} placeholder="Ex: 30" /></div>
                <div><Label>Types de conteneurs</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {CONTAINER_TYPES.map(ct => (
                      <button key={ct.value} onClick={() => set("containerTypes", form.containerTypes.includes(ct.value) ? form.containerTypes.filter(x => x !== ct.value) : [...form.containerTypes, ct.value])}
                        className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${form.containerTypes.includes(ct.value) ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "border-border bg-card"}`}>
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ─── Tarification Maritime ─── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold">Grille tarifaire maritime</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Définissez vos tarifs selon les types de service que vous proposez.
                </p>

                {/* LCL Groupage */}
                {form.containerTypes.includes("lcl") && (
                  <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 space-y-3">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">📦 Groupage (LCL)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Prix par m³</Label>
                        <div className="relative">
                          <Input type="number" value={form.priceLclPerM3} onChange={e => set("priceLclPerM3", e.target.value)} placeholder="150000" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.currency}/m³</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prix par kg vol.</Label>
                        <div className="relative">
                          <Input type="number" value={form.priceLclPerKg} onChange={e => set("priceLclPerKg", e.target.value)} placeholder="500" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.currency}/kg</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Le système facture le maximum entre poids et volume</p>
                  </div>
                )}

                {/* Conteneur FCL */}
                {(form.containerTypes.includes("20ft") || form.containerTypes.includes("40ft")) && (
                  <div className="p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 space-y-3">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">🚢 Conteneur complet (FCL)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {form.containerTypes.includes("20ft") && (
                        <div className="space-y-1">
                          <Label className="text-xs">Forfait 20ft</Label>
                          <div className="relative">
                            <Input type="number" value={form.forfaitContainer20ft} onChange={e => set("forfaitContainer20ft", e.target.value)} placeholder="1500000" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.currency}</span>
                          </div>
                        </div>
                      )}
                      {form.containerTypes.includes("40ft") && (
                        <div className="space-y-1">
                          <Label className="text-xs">Forfait 40ft</Label>
                          <div className="relative">
                            <Input type="number" value={form.forfaitContainer40ft} onChange={e => set("forfaitContainer40ft", e.target.value)} placeholder="2500000" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.currency}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Prix fixe tout compris par conteneur</p>
                  </div>
                )}

                {/* RoRo */}
                {form.containerTypes.includes("roro") && (
                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 space-y-3">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">🚗 Véhicules (RoRo)</p>
                    <div className="space-y-1">
                      <Label className="text-xs">Forfait par véhicule</Label>
                      <div className="relative">
                        <Input type="number" value={form.forfaitRoRo} onChange={e => set("forfaitRoRo", e.target.value)} placeholder="800000" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.currency}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Tarif de base par véhicule, ajustable selon le gabarit</p>
                  </div>
                )}

                {/* No container types selected fallback */}
                {form.containerTypes.length === 0 && (
                  <div className="p-4 rounded-xl border border-muted bg-muted/30 space-y-3">
                    <p className="text-sm font-semibold">Tarif général</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Prix par m³</Label>
                        <Input type="number" value={form.priceLclPerM3} onChange={e => set("priceLclPerM3", e.target.value)} placeholder="150000" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prix par kg</Label>
                        <Input type="number" value={form.priceLclPerKg} onChange={e => set("priceLclPerKg", e.target.value)} placeholder="500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Simulation */}
                {(form.priceLclPerM3 || form.forfaitContainer20ft) && (
                  <div className="p-3 bg-muted/50 rounded-xl border text-xs space-y-1">
                    <p className="font-semibold">📊 Aperçu</p>
                    {form.priceLclPerM3 && <p>• 5 m³ LCL : <strong>{(parseInt(form.priceLclPerM3) * 5).toLocaleString()} {form.currency}</strong></p>}
                    {form.forfaitContainer20ft && <p>• 1× Conteneur 20ft : <strong>{parseInt(form.forfaitContainer20ft).toLocaleString()} {form.currency}</strong></p>}
                    {form.forfaitContainer40ft && <p>• 1× Conteneur 40ft : <strong>{parseInt(form.forfaitContainer40ft).toLocaleString()} {form.currency}</strong></p>}
                    {form.forfaitRoRo && <p>• 1× Véhicule RoRo : <strong>{parseInt(form.forfaitRoRo).toLocaleString()} {form.currency}</strong></p>}
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-6 space-y-3">
                <CheckCircle className="w-12 h-12 text-blue-600 mx-auto" />
                <h2 className="text-lg font-bold">Tout est prêt !</h2>
                <p className="text-sm text-muted-foreground">Votre profil maritime sera vérifié sous 24h</p>
                <div className="bg-muted/50 rounded-xl p-3 text-left text-xs space-y-1">
                  <p><strong>Entreprise:</strong> {form.businessName}</p>
                  <p><strong>Corridor:</strong> {form.portOrigin} → {form.portDest}</p>
                  <p><strong>Capacité:</strong> {form.capacityM3} m³</p>
                  <p><strong>Services:</strong> {form.containerTypes.map(ct => CONTAINER_TYPES.find(c => c.value === ct)?.label).join(", ") || "Général"}</p>
                  {form.priceLclPerM3 && <p><strong>LCL:</strong> {parseInt(form.priceLclPerM3).toLocaleString()} {form.currency}/m³</p>}
                  {form.forfaitContainer20ft && <p><strong>20ft:</strong> {parseInt(form.forfaitContainer20ft).toLocaleString()} {form.currency}</p>}
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
