import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, ArrowLeft, Luggage, 
  CheckCircle, Lock, Eye, EyeOff, Euro, AlertTriangle, Plane,
  Mail, User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DepartureCalendarView } from "@/components/gp/DepartureCalendarView";
import { RouteLinkedProfileForm, type RouteLinkedProfileData } from "@/components/gp/RouteLinkedProfileForm";
import { CurrencySelector, getCurrencySymbol, type CurrencyCode } from "@/components/ui/currency-selector";
import { PricingInputForm } from "@/components/gp/PricingInputForm";
import { configToDbTiers, validatePricingInputs, type GPPricingConfig } from "@/lib/gpPricingEngine";

const DEFAULT_FLAT_RATE_OBJECTS = [
  { id: "telephone", label: "Téléphone", defaultPrice: 15 },
  { id: "ordinateur", label: "Ordinateur", defaultPrice: 25 },
  { id: "document", label: "Documents administratifs", defaultPrice: 10 },
  { id: "piece_auto", label: "Pièces auto", defaultPrice: 30 },
  { id: "bijoux", label: "Bijoux", defaultPrice: 20 },
];

export default function GPBagagesRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [existingUser, setExistingUser] = useState<{ id: string; email: string; fullName: string; phone: string } | null>(null);

  const [authData, setAuthData] = useState({ email: "", password: "", confirmPassword: "" });
  const [profileData, setProfileData] = useState<RouteLinkedProfileData>({
    fullName: "", originCity: "Dakar", originCountry: "SN",
    destinationCity: "Paris", destinationCountry: "FR",
    originAddress: "", originPhone: "", destinationAddress: "",
    destinationPhone: "", whatsappPhone: "origin",
  });
  const [profileValid, setProfileValid] = useState(false);
  const [departures, setDepartures] = useState<any[]>([]);
  const [pricePerKg, setPricePerKg] = useState("");
  const [forfaitValise, setForfaitValise] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>("XOF");
  const [flatRatePricing, setFlatRatePricing] = useState<Map<string, { price: string; isActive: boolean }>>(
    new Map(DEFAULT_FLAT_RATE_OBJECTS.map(o => [o.id, { price: o.defaultPrice.toString(), isActive: false }]))
  );

  useEffect(() => {
    const loadExistingProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: gpProfile } = await supabase.from("gp_profiles").select("id").eq("user_id", user.id).maybeSingle();
        if (gpProfile) {
          toast({ title: "Vous êtes déjà transporteur", description: "Accédez à votre dashboard" });
          navigate("/gp/dashboard", { replace: true });
          return;
        }
        const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
        if (profile) {
          setExistingUser({ id: user.id, email: user.email || "", fullName: profile.full_name || "", phone: profile.phone || "" });
          setProfileData(prev => ({ ...prev, fullName: profile.full_name || "" }));
          setStep(2);
        }
      }
    };
    loadExistingProfile();
  }, [navigate, toast]);

  const steps = [
    { num: 1, label: "Accès", icon: Lock },
    { num: 2, label: "Profil", icon: User },
    { num: 3, label: "Voyages", icon: Plane },
    { num: 4, label: "Tarifs", icon: Euro },
  ];

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (existingUser) return true;
        if (!authData.email) { toast({ title: "Email requis", variant: "destructive" }); return false; }
        if (!isLogin) {
          if (!authData.password || authData.password.length < 6) { toast({ title: "Mot de passe min. 6 caractères", variant: "destructive" }); return false; }
          if (authData.password !== authData.confirmPassword) { toast({ title: "Mots de passe différents", variant: "destructive" }); return false; }
        } else if (!authData.password) { toast({ title: "Mot de passe requis", variant: "destructive" }); return false; }
        return true;
      case 2:
        if (!profileValid) { toast({ title: "Profil incomplet", variant: "destructive" }); return false; }
        return true;
      case 3:
        if (departures.length === 0) { toast({ title: "Conseil", description: "Ajoutez au moins un voyage" }); }
        return true;
      case 4:
        if (!pricePerKg || parseFloat(pricePerKg) <= 0) { toast({ title: "Prix au kilo requis", variant: "destructive" }); return false; }
        const forfaitNum = parseFloat(forfaitValise) || 0;
        if (!forfaitNum) { toast({ title: "Forfait valise requis", variant: "destructive" }); return false; }
        const pv = validatePricingInputs(parseFloat(pricePerKg), forfaitNum);
        if (!pv.valid) { toast({ title: "Tarifs invalides", description: pv.error, variant: "destructive" }); return false; }
        return true;
      default: return true;
    }
  };

  const handleAuthStep = async (): Promise<boolean> => {
    if (existingUser) return true;
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authData.email, password: authData.password });
        if (error) throw error;
        if (data.user) {
          const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", data.user.id).maybeSingle();
          setExistingUser({ id: data.user.id, email: data.user.email || "", fullName: profile?.full_name || "", phone: profile?.phone || "" });
          setProfileData(prev => ({ ...prev, fullName: profile?.full_name || prev.fullName }));
        }
        return true;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authData.email, password: authData.password,
          options: { emailRedirectTo: `${window.location.origin}/gp/bagages/inscription` }
        });
        if (error) throw error;
        if (data.user) {
          setExistingUser({ id: data.user.id, email: data.user.email || "", fullName: "", phone: "" });
        }
        return true;
      }
    } catch (error: any) {
      let message = error.message || "Erreur";
      if (message.includes("already registered")) { message = "Email déjà utilisé. Connectez-vous."; setIsLogin(true); }
      toast({ title: "Erreur", description: message, variant: "destructive" });
      return false;
    } finally { setLoading(false); }
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;
    if (step === 1 && !existingUser) { const ok = await handleAuthStep(); if (!ok) return; }
    setStep(prev => Math.min(prev + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step <= 2) navigate("/transporteur/inscription");
    else setStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddDeparture = async (data: any) => {
    setDepartures(prev => [...prev, {
      id: `temp-${Date.now()}`, date: data.date,
      originCity: data.originCity || profileData.originCity,
      originCountry: data.originCountry || profileData.originCountry,
      destinationCity: data.destinationCity || profileData.destinationCity,
      destinationCountry: data.destinationCountry || profileData.destinationCountry,
      capacity: data.capacity, availableCapacity: data.capacity,
      pricePerKg: data.pricePerKg, type: data.type, status: "open",
    }]);
    toast({ title: "Voyage ajouté" });
  };

  const handleFlatRateChange = (id: string, field: "price" | "isActive", value: string | boolean) => {
    setFlatRatePricing(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(id) || { price: "", isActive: false };
      newMap.set(id, { ...current, [field]: value });
      return newMap;
    });
  };

  const handleSubmit = async () => {
    if (!validateStep(4) || !existingUser) return;
    setLoading(true);
    try {
      await supabase.from("profiles").update({ phone: profileData.originPhone, full_name: profileData.fullName, is_gp: true }).eq("user_id", existingUser.id);
      const whatsappPhone = profileData.whatsappPhone === "origin" ? profileData.originPhone : profileData.destinationPhone;
      const basePricePerKg = parseFloat(pricePerKg) || 0;
      const { data: gpProfile, error: gpError } = await supabase.from("gp_profiles").insert({
        user_id: existingUser.id, business_name: profileData.fullName,
        gp_type: "bagages_international", phone: profileData.originPhone,
        whatsapp: whatsappPhone, deposit_address: profileData.originAddress,
        reception_address: profileData.destinationAddress, phone_secondary: profileData.destinationPhone,
        whatsapp_phone: whatsappPhone, city: profileData.originCity, country_code: profileData.originCountry,
        status: "pending", default_currency: defaultCurrency,
        international_destinations: [`${profileData.destinationCity}, ${profileData.destinationCountry}`],
        zones_covered: [`${profileData.originCity}, ${profileData.originCountry}`],
        base_price_per_kg: basePricePerKg,
        base_origin_city: profileData.originCity, base_origin_country: profileData.originCountry,
        base_destination_city: profileData.destinationCity, base_destination_country: profileData.destinationCountry,
        price_locked_at: new Date().toISOString(), navette_locked_at: new Date().toISOString(),
      }).select().single();
      if (gpError) throw gpError;

      const pricingConfig: GPPricingConfig = { basePricePerKg, forfaitValise23kg: parseFloat(forfaitValise) || 0, currency: defaultCurrency };
      const tiersToInsert = configToDbTiers(pricingConfig).map(t => ({ gp_id: gpProfile.id, ...t }));
      if (tiersToInsert.length > 0) await supabase.from("gp_weight_tiers").insert(tiersToInsert);

      for (const dep of departures) {
        await supabase.from("gp_offers").insert({
          gp_id: gpProfile.id, origin_city: dep.originCity, origin_country: dep.originCountry,
          destination_city: dep.destinationCity, destination_country: dep.destinationCountry,
          departure_date: dep.date, total_capacity: dep.capacity, available_capacity: dep.capacity,
          price_per_kg: parseFloat(pricePerKg) || 8, currency: defaultCurrency,
          transport_type: "bagages_international", status: "active",
        });
      }

      const { data: objectTypes } = await supabase.from("flat_rate_object_types").select("id, name").eq("is_active", true);
      if (objectTypes) {
        const objectTypeMap = new Map(objectTypes.map(t => [t.name, t.id]));
        for (const [key, value] of flatRatePricing.entries()) {
          if (value.price && parseFloat(value.price) > 0) {
            const objectTypeId = objectTypeMap.get(key);
            if (objectTypeId) {
              await supabase.from("gp_flat_rate_pricing").upsert({
                gp_id: gpProfile.id, object_type_id: objectTypeId, price: parseFloat(value.price),
                is_active: value.isActive, currency: defaultCurrency,
              }, { onConflict: 'gp_id,object_type_id' });
            }
          }
        }
      }

      toast({ title: "✈️ Inscription réussie !", description: "Bienvenue dans l'espace GP Via Bagages" });
      navigate("/gp/dashboard");
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Minimal header with back */}
      <header 
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">GP Via Bagages</p>
            <p className="text-[10px] text-muted-foreground">Étape {step}/4</p>
          </div>
          <Badge variant="secondary" className="text-xs">{steps[step - 1]?.label}</Badge>
        </div>
      </header>
      
      <main className="px-4 py-6 max-w-lg mx-auto">
        {/* Icon */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-6">
          <div className="w-14 h-14 mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <Luggage className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">Devenir GP Via Bagages</h1>
        </motion.div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {step > s.num ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                </div>
                <span className={`text-[9px] mt-1 ${step >= s.num ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`w-6 h-0.5 mx-0.5 rounded ${step > s.num ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Auth */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" />
                    {isLogin ? "Connexion" : "Créer un compte"}
                  </h2>
                  {existingUser ? (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Connecté: {existingUser.fullName || existingUser.email}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="email" placeholder="votre@email.com" className="pl-10 h-12" value={authData.email} onChange={(e) => setAuthData({ ...authData, email: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Mot de passe *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 h-12" value={authData.password} onChange={(e) => setAuthData({ ...authData, password: e.target.value })} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {!isLogin && (
                        <div className="space-y-2">
                          <Label>Confirmer *</Label>
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-12" value={authData.confirmPassword} onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })} />
                        </div>
                      )}
                      <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline w-full text-center">
                        {isLogin ? "Pas de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
                      </button>
                    </>
                  )}
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleNext} disabled={loading} className="gap-2">
                      {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <>Continuer <ArrowRight className="w-4 h-4" /></>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Profile */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-4">
                <RouteLinkedProfileForm initialData={profileData} onChange={(data, isValid) => { setProfileData(data); setProfileValid(isValid); }} showValidation />
                <div className="flex justify-end">
                  <Button onClick={handleNext} className="gap-2">Continuer <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Voyages */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Plane className="w-5 h-5 text-primary" /> Vos voyages
                  </h2>
                  <p className="text-sm text-muted-foreground">Cliquez sur une date pour ajouter un départ</p>
                  <DepartureCalendarView departures={departures} onAddDeparture={handleAddDeparture}
                    defaultRoute={{ originCity: profileData.originCity, originCountry: profileData.originCountry, destinationCity: profileData.destinationCity, destinationCountry: profileData.destinationCountry }} />
                  {departures.length === 0 ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Ajoutez au moins un voyage
                    </div>
                  ) : (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> {departures.length} voyage(s)
                    </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleNext} className="gap-2">Continuer <ArrowRight className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Pricing */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Euro className="w-5 h-5 text-primary" /> Vos tarifs
                  </h2>
                  <p className="text-sm text-muted-foreground">2 prix de référence. Paliers calculés automatiquement.</p>
                  <PricingInputForm pricePerKg={pricePerKg} forfaitValise={forfaitValise} currency={defaultCurrency}
                    onPriceChange={setPricePerKg} onForfaitChange={setForfaitValise} onCurrencyChange={setDefaultCurrency} />
                  
                  <div className="space-y-3 mt-4">
                    <p className="font-medium text-sm">Forfaits par objet (optionnel)</p>
                    {DEFAULT_FLAT_RATE_OBJECTS.map((obj) => {
                      const pricing = flatRatePricing.get(obj.id) || { price: "", isActive: false };
                      return (
                        <div key={obj.id} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm flex-1">{obj.label}</span>
                          <Input type="number" placeholder={obj.defaultPrice.toString()} value={pricing.price}
                            onChange={(e) => handleFlatRateChange(obj.id, "price", e.target.value)} className="h-10 w-24" />
                          <span className="text-xs text-muted-foreground">{getCurrencySymbol(defaultCurrency)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSubmit} disabled={loading} className="gap-2">
                      {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <>Terminer <CheckCircle className="w-4 h-4" /></>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
