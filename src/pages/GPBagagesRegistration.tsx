import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, ArrowLeft, Luggage, 
  CheckCircle, Lock, Eye, EyeOff, Euro, AlertTriangle, Plane,
  Mail, User, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { loadExchangeRates, convertFromFCFA, type ExchangeRate } from "@/lib/currencyUtils";
import { getEntryFlowData } from "@/lib/entryFlowData";
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

type RegistrationFlatRateItem = {
  id: string;
  label: string;
  defaultPrice: number;
  isActive: boolean;
};

type RegistrationPhase = "steps" | "pricing_gate";

export default function GPBagagesRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [phase, setPhase] = useState<RegistrationPhase>("steps");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [existingUser, setExistingUser] = useState<{ id: string; email: string; fullName: string; phone: string } | null>(null);
  const [pendingGpId, setPendingGpId] = useState<string | null>(null);

  const [authData, setAuthData] = useState({ email: "", password: "", confirmPassword: "" });
  // Read entry flow data from sessionStorage
  const entryFlow = getEntryFlowData();
  const entryPhone = entryFlow.phone;
  const entryCity = entryFlow.city;

  const [profileData, setProfileData] = useState<RouteLinkedProfileData>({
    fullName: "", 
    originCity: entryCity || "Dakar", 
    originCountry: entryFlow.countryCode,
    destinationCity: "Paris", destinationCountry: "FR",
    originAddress: "", 
    originPhone: entryPhone || "", 
    destinationAddress: "",
    destinationPhone: "", whatsappPhone: "origin",
  });
  const [profileValid, setProfileValid] = useState(false);
  const [departures, setDepartures] = useState<any[]>([]);
  const [pricePerKg, setPricePerKg] = useState("");
  const [forfaitValise, setForfaitValise] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>("XOF");
  const [flatRateItems, setFlatRateItems] = useState<RegistrationFlatRateItem[]>([]);
  const [flatRatePricing, setFlatRatePricing] = useState<Map<string, { price: string; isActive: boolean }>>(new Map());
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [flatRateDefaultsFCFA, setFlatRateDefaultsFCFA] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const loadExistingProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: gpProfile } = await supabase
          .from("gp_profiles")
          .select("id, price_locked_at, status")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (gpProfile) {
          // GP profile exists — check if registration is FULLY complete (pricing done)
          if (gpProfile.price_locked_at) {
            // Pricing done → registration complete, redirect to dashboard
            toast({ title: "Vous êtes déjà transporteur", description: "Accédez à votre dashboard" });
            navigate("/gp/dashboard", { replace: true });
            return;
          }
          // GP profile exists but pricing NOT done → resume pricing gate
          setPendingGpId(gpProfile.id);
          setPhase("pricing_gate");
          const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
          setExistingUser({ id: user.id, email: user.email || "", fullName: profile?.full_name || "", phone: profile?.phone || "" });
          return;
        }
        
        // No GP profile yet — resume at step 2
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

  // Load flat rate object types from DB
  useEffect(() => {
    const loadFlatRateTypes = async () => {
      const [{ data }, rates] = await Promise.all([
        supabase
          .from("flat_rate_object_types")
          .select("id, label, default_price")
          .eq("is_active", true)
          .order("label"),
        loadExchangeRates(),
      ]);
      setExchangeRates(rates);
      if (data) {
        // Store raw FCFA defaults
        const fcfaDefaults = new Map<string, number>();
        data.forEach(t => fcfaDefaults.set(t.id, t.default_price || 0));
        setFlatRateDefaultsFCFA(fcfaDefaults);

        // Convert defaults to current currency
        const convertedItems = data.map(t => {
          const fcfaPrice = t.default_price || 0;
          const converted = defaultCurrency === "XOF"
            ? fcfaPrice 
            : Math.round(convertFromFCFA(fcfaPrice, defaultCurrency, rates));
          return {
            id: t.id,
            label: t.label,
            defaultPrice: converted,
            isActive: false,
          };
        });
        setFlatRateItems(convertedItems);
        const priceMap = new Map<string, { price: string; isActive: boolean }>();
        convertedItems.forEach(t => {
          priceMap.set(t.id, { price: t.defaultPrice.toString(), isActive: false });
        });
        setFlatRatePricing(priceMap);
      }
    };
    loadFlatRateTypes();
  }, []);

  // Re-convert flat rate defaults when currency changes
  useEffect(() => {
    if (flatRateDefaultsFCFA.size === 0 || exchangeRates.length === 0) return;
    
    setFlatRateItems(prev => prev.map(item => {
      const fcfaPrice = flatRateDefaultsFCFA.get(item.id) || 0;
      const converted = defaultCurrency === "XOF"
        ? fcfaPrice
        : Math.round(convertFromFCFA(fcfaPrice, defaultCurrency, exchangeRates));
      return { ...item, defaultPrice: converted };
    }));
    
    setFlatRatePricing(prev => {
      const newMap = new Map(prev);
      newMap.forEach((value, id) => {
        if (!value.isActive) {
          // Only update price if user hasn't manually edited (not active = not confirmed)
          const fcfaPrice = flatRateDefaultsFCFA.get(id) || 0;
          const converted = defaultCurrency === "XOF"
            ? fcfaPrice
            : Math.round(convertFromFCFA(fcfaPrice, defaultCurrency, exchangeRates));
          newMap.set(id, { ...value, price: converted.toString() });
        }
      });
      return newMap;
    });
  }, [defaultCurrency, flatRateDefaultsFCFA, exchangeRates]);

  // 3 steps only now
  const steps = [
    { num: 1, label: "Accès", icon: Lock },
    { num: 2, label: "Profil", icon: User },
    { num: 3, label: "Voyages", icon: Plane },
  ];

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (existingUser) return true;
        if (!authData.email) { toast({ title: "Email requis", variant: "destructive" }); return false; }
        if (!isLogin) {
          if (!authData.password || authData.password.length < 8) { toast({ title: "Mot de passe min. 8 caractères", variant: "destructive" }); return false; }
          if (!/\d/.test(authData.password)) { toast({ title: "Le mot de passe doit contenir au moins un chiffre", variant: "destructive" }); return false; }
          if (!/[^a-zA-Z0-9]/.test(authData.password)) { toast({ title: "Le mot de passe doit contenir un caractère spécial (!@#$...)", variant: "destructive" }); return false; }
          if (authData.password !== authData.confirmPassword) { toast({ title: "Mots de passe différents", variant: "destructive" }); return false; }
        } else if (!authData.password) { toast({ title: "Mot de passe requis", variant: "destructive" }); return false; }
        return true;
      case 2:
        if (!profileValid) { toast({ title: "Profil incomplet", variant: "destructive" }); return false; }
        return true;
      case 3:
        if (departures.length === 0) { toast({ title: "Conseil", description: "Ajoutez au moins un voyage" }); }
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
    if (step === 3) {
      // Last step → submit profile & voyages, then show pricing gate
      await handleSubmitProfileAndVoyages();
      return;
    }
    setStep(prev => Math.min(prev + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (phase === "pricing_gate") {
      // Can't go back from pricing gate - must complete
      toast({ title: "Tarifs obligatoires", description: "Définissez vos tarifs pour continuer", variant: "destructive" });
      return;
    }
    if (step === 1) navigate("/transporteur/inscription");
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

  /** Step 1: Submit profile + voyages, creating the GP in "pending" state */
  const handleSubmitProfileAndVoyages = async () => {
    if (!existingUser) return;
    setLoading(true);
    try {
      // Check phone uniqueness before creating GP profile
      const { data: existingGP } = await supabase.from("gp_profiles").select("id").eq("phone", profileData.originPhone).maybeSingle();
      if (existingGP) {
        toast({ title: "Numéro déjà utilisé", description: "Ce numéro de téléphone est déjà associé à un transporteur.", variant: "destructive" });
        setLoading(false);
        return;
      }

      await supabase.from("profiles").update({ phone: profileData.originPhone, full_name: profileData.fullName, is_gp: true }).eq("user_id", existingUser.id);
      const whatsappPhone = profileData.whatsappPhone === "origin" ? profileData.originPhone : profileData.destinationPhone;
      
      const { data: gpProfile, error: gpError } = await supabase.from("gp_profiles").insert({
        user_id: existingUser.id, business_name: profileData.fullName,
        gp_type: "bagages_international", phone: profileData.originPhone,
        whatsapp: whatsappPhone, deposit_address: profileData.originAddress,
        reception_address: profileData.destinationAddress, phone_secondary: profileData.destinationPhone,
        whatsapp_phone: whatsappPhone, city: profileData.originCity, country_code: profileData.originCountry,
        status: "pending", default_currency: defaultCurrency,
        international_destinations: [`${profileData.destinationCity}, ${profileData.destinationCountry}`],
        zones_covered: [`${profileData.originCity}, ${profileData.originCountry}`],
        base_origin_city: profileData.originCity, base_origin_country: profileData.originCountry,
        base_destination_city: profileData.destinationCity, base_destination_country: profileData.destinationCountry,
        navette_locked_at: new Date().toISOString(),
      }).select().single();
      if (gpError) throw gpError;

      // Insert voyages
      for (const dep of departures) {
        await supabase.from("gp_offers").insert({
          gp_id: gpProfile.id, origin_city: dep.originCity, origin_country: dep.originCountry,
          destination_city: dep.destinationCity, destination_country: dep.destinationCountry,
          departure_date: dep.date, total_capacity: dep.capacity, available_capacity: dep.capacity,
          price_per_kg: 0, currency: defaultCurrency,
          transport_type: "bagages_international", status: "active",
        });
      }

      setPendingGpId(gpProfile.id);
      setPhase("pricing_gate");
      toast({ title: "Profil cree", description: "Definissez maintenant vos tarifs pour finaliser" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  /** Step 2: Finalize pricing — MANDATORY */
  const handleFinalizePricing = async () => {
    if (!pendingGpId) return;
    if (!pricePerKg || parseFloat(pricePerKg) <= 0) { toast({ title: "Prix au kilo requis", variant: "destructive" }); return; }
    const forfaitNum = parseFloat(forfaitValise) || 0;
    if (!forfaitNum) { toast({ title: "Forfait valise requis", variant: "destructive" }); return; }
    const activeFlatRates = Array.from(flatRatePricing.values()).filter(v => v.isActive && v.price && parseFloat(v.price) > 0);
    if (activeFlatRates.length < 1) { toast({ title: "Minimum 1 article forfaitaire", description: "Activez au moins un objet à tarif fixe", variant: "destructive" }); return; }
    const pv = validatePricingInputs(parseFloat(pricePerKg), forfaitNum);
    if (!pv.valid) { toast({ title: "Tarifs invalides", description: pv.error, variant: "destructive" }); return; }

    setLoading(true);
    try {
      const basePricePerKg = parseFloat(pricePerKg);
      // Update GP profile with locked pricing
      await supabase.from("gp_profiles").update({
        base_price_per_kg: basePricePerKg,
        price_locked_at: new Date().toISOString(),
        default_currency: defaultCurrency,
      }).eq("id", pendingGpId);

      // Update existing offers with correct price
      await supabase.from("gp_offers").update({
        price_per_kg: basePricePerKg,
        currency: defaultCurrency,
      }).eq("gp_id", pendingGpId);

      // Insert weight tiers
      const pricingConfig: GPPricingConfig = { basePricePerKg, forfaitValise23kg: forfaitNum, currency: defaultCurrency };
      const tiersToInsert = configToDbTiers(pricingConfig).map(t => ({ gp_id: pendingGpId, ...t }));
      if (tiersToInsert.length > 0) await supabase.from("gp_weight_tiers").insert(tiersToInsert);

      // Insert flat rate pricing (keys are now DB UUIDs directly)
      for (const [objectTypeId, value] of flatRatePricing.entries()) {
        if (value.isActive && value.price && parseFloat(value.price) > 0) {
          await supabase.from("gp_flat_rate_pricing").upsert({
            gp_id: pendingGpId, object_type_id: objectTypeId, price: parseFloat(value.price),
            is_active: true, currency: defaultCurrency,
          }, { onConflict: 'gp_id,object_type_id' });
        }
      }

      toast({ title: "Inscription finalisee", description: "Bienvenue dans l'espace GP Via Bagages" });
      navigate("/gp/dashboard");
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  // Pricing Gate Phase
  if (phase === "pricing_gate") {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <header 
          className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border flex-shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex items-center gap-3 px-4 h-12">
            <div className="w-8" />
            <div className="flex-1 min-w-0 text-center">
              <p className="text-sm font-semibold">Définir vos tarifs</p>
            </div>
            <Badge variant="destructive" className="text-[10px]">Requis</Badge>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full pb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="p-3 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Tarification obligatoire</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Définissez vos tarifs pour finaliser votre inscription.
                </p>
              </div>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Euro className="w-4 h-4 text-primary" /> Vos tarifs
                </h2>
                <PricingInputForm 
                  pricePerKg={pricePerKg} 
                  forfaitValise={forfaitValise} 
                  currency={defaultCurrency}
                  onPriceChange={setPricePerKg} 
                  onForfaitChange={setForfaitValise} 
                  onCurrencyChange={setDefaultCurrency}
                  flatRateItems={flatRateItems.map(item => ({
                    id: item.id,
                    label: item.label,
                    isActive: flatRatePricing.get(item.id)?.isActive || false,
                    price: parseFloat(flatRatePricing.get(item.id)?.price || "0") || item.defaultPrice || 0,
                  }))}
                  onFlatRateToggle={(id, active) => {
                    setFlatRatePricing(prev => {
                      const newMap = new Map(prev);
                      const current = newMap.get(id) || { price: String(flatRateItems.find(i => i.id === id)?.defaultPrice || 0), isActive: false };
                      newMap.set(id, { ...current, isActive: active });
                      return newMap;
                    });
                    setFlatRateItems(prev => prev.map(item => 
                      item.id === id ? { ...item, isActive: active } : item
                    ));
                  }}
                  onFlatRatePriceChange={(id, price) => {
                    setFlatRatePricing(prev => {
                      const newMap = new Map(prev);
                      const current = newMap.get(id) || { price: "0", isActive: true };
                      newMap.set(id, { ...current, price: String(price) });
                      return newMap;
                    });
                  }}
                />
              </CardContent>
            </Card>
          </motion.div>
        </main>

        {/* Fixed CTA footer */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
          <div className="max-w-lg mx-auto">
            <Button onClick={handleFinalizePricing} disabled={loading} className="w-full h-12 gap-2 text-sm font-semibold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Finaliser l'inscription <CheckCircle className="w-4 h-4" /></>}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header with back */}
      <header 
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border flex-shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center gap-3 px-4 h-12">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">GP Via Bagages</p>
          </div>
          <div className="flex items-center gap-1.5">
            {steps.map((s) => (
              <div key={s.num} className={`w-6 h-1.5 rounded-full transition-all ${step >= s.num ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full pb-24">
        <AnimatePresence mode="wait">
          {/* Step 1: Auth */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <div className="text-center mb-2">
                <div className="w-10 h-10 mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-2">
                  <Luggage className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-bold">Devenir GP Via Bagages</h1>
              </div>

              {existingUser ? (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Connecté: {existingUser.fullName || existingUser.email}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      {isLogin ? "Connexion" : "Créer un compte"}
                    </h2>
                    {/* Name */}
                    <div className="space-y-1">
                      <Label className="text-xs">Nom & Prénom *</Label>
                      <Input placeholder="Ex: Mamadou Diallo" value={profileData.fullName} onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))} className="h-10" />
                    </div>
                    {/* Email */}
                    <div className="space-y-1">
                      <Label className="text-xs">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="email" placeholder="votre@email.com" className="pl-10 h-10" value={authData.email} onChange={(e) => setAuthData({ ...authData, email: e.target.value })} />
                      </div>
                    </div>
                    {/* Password */}
                    <div className="space-y-1">
                      <Label className="text-xs">Mot de passe *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 h-10" value={authData.password} onChange={(e) => setAuthData({ ...authData, password: e.target.value })} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {!isLogin && authData.password.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-1">
                        <PasswordRule ok={authData.password.length >= 8} label="8+ car." />
                        <PasswordRule ok={/\d/.test(authData.password)} label="1 chiffre" />
                        <PasswordRule ok={/[^a-zA-Z0-9]/.test(authData.password)} label="1 spécial" />
                      </div>
                    )}
                    {!isLogin && (
                      <div className="space-y-1">
                        <Label className="text-xs">Confirmer *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 h-10" value={authData.confirmPassword} onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })} />
                        </div>
                      </div>
                    )}
                    <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-xs text-primary hover:underline w-full text-center mt-2">
                      {isLogin ? "Pas de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
                    </button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* Step 2: Profile */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <RouteLinkedProfileForm initialData={profileData} onChange={(data, isValid) => { setProfileData(data); setProfileValid(isValid); }} showValidation entryPhone={entryPhone} entryCity={entryCity} />
            </motion.div>
          )}

          {/* Step 3: Voyages */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Plane className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold">Vos voyages</h2>
              </div>
              <p className="text-xs text-muted-foreground">Cliquez sur une date pour ajouter un départ</p>
              <DepartureCalendarView departures={departures} onAddDeparture={handleAddDeparture}
                defaultRoute={{ originCity: profileData.originCity, originCountry: profileData.originCountry, destinationCity: profileData.destinationCity, destinationCountry: profileData.destinationCountry }}
                hidePrice={true} />
              {departures.length === 0 ? (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Ajoutez au moins un voyage
                </div>
              ) : (
                <div className="p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-xs text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5" /> {departures.length} voyage(s) programmé(s)
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── FIXED CTA FOOTER ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
        <div className="max-w-lg mx-auto">
          <Button onClick={handleNext} disabled={loading} className="w-full h-12 gap-2 text-sm font-semibold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              step === 3 
                ? <>Valider et définir mes tarifs <ArrowRight className="w-4 h-4" /></>
                : <>Continuer <ArrowRight className="w-4 h-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`text-[11px] flex items-center gap-1 ${ok ? "text-emerald-600" : "text-muted-foreground"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
      {label}
    </span>
  );
}
