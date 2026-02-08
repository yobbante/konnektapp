import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, ArrowLeft, Luggage, 
  CheckCircle, Lock, Eye, EyeOff, Euro, AlertTriangle, Coins, Plane,
  Mail, User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DepartureCalendarView } from "@/components/gp/DepartureCalendarView";
import { RouteLinkedProfileForm, type RouteLinkedProfileData } from "@/components/gp/RouteLinkedProfileForm";
import { CurrencySelector, getCurrencySymbol, type CurrencyCode } from "@/components/ui/currency-selector";

// Flat rate object types (matching the database)
const DEFAULT_FLAT_RATE_OBJECTS = [
  { id: "telephone", label: "Téléphone", defaultPrice: 15 },
  { id: "ordinateur", label: "Ordinateur", defaultPrice: 25 },
  { id: "document", label: "Documents administratifs", defaultPrice: 10 },
  { id: "piece_auto", label: "Pièces auto", defaultPrice: 30 },
  { id: "bijoux", label: "Bijoux", defaultPrice: 20 },
];

// Weight tier interface
interface WeightTier {
  min_weight: number;
  max_weight: number;
  price_per_kg: number;
  currency: string;
  is_active: boolean;
}

export default function GPBagagesRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [existingUser, setExistingUser] = useState<{ id: string; email: string; fullName: string; phone: string } | null>(null);

  // Step 1: Account/Auth
  const [authData, setAuthData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Step 2: Profile + Route + Addresses (combined)
  const [profileData, setProfileData] = useState<RouteLinkedProfileData>({
    fullName: "",
    originCity: "Dakar",
    originCountry: "SN",
    destinationCity: "Paris",
    destinationCountry: "FR",
    originAddress: "",
    originPhone: "",
    destinationAddress: "",
    destinationPhone: "",
    whatsappPhone: "origin",
  });
  const [profileValid, setProfileValid] = useState(false);

  // Step 3: Voyages (calendrier)
  const [departures, setDepartures] = useState<any[]>([]);

  // Step 4: Pricing with weight tiers
  const [pricePerKg, setPricePerKg] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>("XOF");
  // PRV: Mandatory 6 weight tiers
  const [weightTiers, setWeightTiers] = useState<WeightTier[]>([
    { min_weight: 0, max_weight: 1, price_per_kg: 0, currency: "XOF", is_active: true },
    { min_weight: 1, max_weight: 5, price_per_kg: 0, currency: "XOF", is_active: true },
    { min_weight: 5, max_weight: 10, price_per_kg: 0, currency: "XOF", is_active: true },
    { min_weight: 10, max_weight: 15, price_per_kg: 0, currency: "XOF", is_active: true },
    { min_weight: 15, max_weight: 23, price_per_kg: 0, currency: "XOF", is_active: true },
    { min_weight: 23, max_weight: 23, price_per_kg: 0, currency: "XOF", is_active: true }, // Forfait valise 23kg
  ]);
  const [flatRatePricing, setFlatRatePricing] = useState<Map<string, { price: string; isActive: boolean }>>(
    new Map(DEFAULT_FLAT_RATE_OBJECTS.map(o => [o.id, { price: o.defaultPrice.toString(), isActive: false }]))
  );

  // Check for existing user and if already a GP
  useEffect(() => {
    const loadExistingProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if already a GP - redirect to dashboard
        const { data: gpProfile } = await supabase
          .from("gp_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (gpProfile) {
          toast({
            title: "Vous êtes déjà transporteur",
            description: "Accédez à votre dashboard pour gérer vos activités",
          });
          navigate("/gp/dashboard", { replace: true });
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          setExistingUser({
            id: user.id,
            email: user.email || "",
            fullName: profile.full_name || "",
            phone: profile.phone || "",
          });
          setProfileData(prev => ({
            ...prev,
            fullName: profile.full_name || "",
          }));
          // Skip auth step if already logged in
          setStep(2);
        }
      }
    };
    loadExistingProfile();
  }, [navigate, toast]);

  // New 4-step flow
  const steps = [
    { num: 1, label: "Accès", icon: Lock },
    { num: 2, label: "Profil & Trajet", icon: User },
    { num: 3, label: "Voyages", icon: Plane },
    { num: 4, label: "Tarifs", icon: Euro },
  ];

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (existingUser) return true;
        if (!authData.email) {
          toast({ title: "Email requis", description: "Veuillez entrer votre email", variant: "destructive" });
          return false;
        }
        if (!isLogin) {
          if (!authData.password || authData.password.length < 6) {
            toast({ title: "Mot de passe requis", description: "Minimum 6 caractères", variant: "destructive" });
            return false;
          }
          if (authData.password !== authData.confirmPassword) {
            toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
            return false;
          }
        } else {
          if (!authData.password) {
            toast({ title: "Mot de passe requis", description: "Veuillez entrer votre mot de passe", variant: "destructive" });
            return false;
          }
        }
        return true;

      case 2:
        if (!profileValid) {
          toast({ 
            title: "Profil incomplet", 
            description: "Veuillez remplir tous les champs obligatoires",
            variant: "destructive"
          });
          return false;
        }
        return true;

      case 3:
        if (departures.length === 0) {
          toast({ 
            title: "Conseil", 
            description: "Ajoutez au moins un voyage pour commencer à recevoir des demandes",
          });
        }
        return true;

      case 4:
        // PRV: price_per_kg is mandatory and at least one tier must have a price
        if (!pricePerKg || parseFloat(pricePerKg) <= 0) {
          toast({ 
            title: "Prix au kilo requis", 
            description: "Le prix au kilo est obligatoire et ne pourra plus être modifié", 
            variant: "destructive" 
          });
          return false;
        }
        const hasValidTiers = weightTiers.some(t => t.price_per_kg > 0);
        if (!hasValidTiers) {
          toast({ 
            title: "Paliers requis", 
            description: "Définissez au moins un palier de poids", 
            variant: "destructive" 
          });
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleAuthStep = async (): Promise<boolean> => {
    if (existingUser) return true;

    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authData.email,
          password: authData.password,
        });

        if (error) throw error;

        if (data.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", data.user.id)
            .maybeSingle();

          setExistingUser({
            id: data.user.id,
            email: data.user.email || "",
            fullName: profile?.full_name || "",
            phone: profile?.phone || "",
          });

          setProfileData(prev => ({
            ...prev,
            fullName: profile?.full_name || prev.fullName,
          }));

          toast({ title: "Connexion réussie", description: "Continuez votre inscription GP" });
        }
        return true;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authData.email,
          password: authData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/gp/bagages/inscription`,
          }
        });

        if (error) throw error;

        if (data.user) {
          setExistingUser({
            id: data.user.id,
            email: data.user.email || "",
            fullName: "",
            phone: "",
          });
          toast({ title: "Compte créé", description: "Continuez votre inscription GP" });
        }
        return true;
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let message = "Une erreur est survenue";
      if (error.message?.includes("already registered")) {
        message = "Cet email est déjà utilisé. Essayez de vous connecter.";
        setIsLogin(true);
      } else if (error.message?.includes("Invalid login credentials")) {
        message = "Email ou mot de passe incorrect";
      } else if (error.message) {
        message = error.message;
      }
      toast({ title: "Erreur", description: message, variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;

    if (step === 1 && !existingUser) {
      const success = await handleAuthStep();
      if (!success) return;
    }

    setStep(prev => Math.min(prev + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step === 1) {
      navigate("/gp/inscription");
    } else if (step === 2 && existingUser) {
      navigate("/gp/inscription");
    } else {
      setStep(prev => Math.max(prev - 1, 1));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddDeparture = async (data: any) => {
    setDepartures(prev => [...prev, {
      id: `temp-${Date.now()}`,
      date: data.date,
      originCity: data.originCity || profileData.originCity,
      originCountry: data.originCountry || profileData.originCountry,
      destinationCity: data.destinationCity || profileData.destinationCity,
      destinationCountry: data.destinationCountry || profileData.destinationCountry,
      capacity: data.capacity,
      availableCapacity: data.capacity,
      pricePerKg: data.pricePerKg,
      type: data.type,
      status: "open",
    }]);
    toast({ title: "Voyage ajouté", description: `${data.originCity || profileData.originCity} → ${data.destinationCity || profileData.destinationCity}` });
  };

  const handleFlatRateChange = (id: string, field: "price" | "isActive", value: string | boolean) => {
    setFlatRatePricing(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(id) || { price: "", isActive: false };
      newMap.set(id, { ...current, [field]: value });
      return newMap;
    });
  };

  const handleWeightTierChange = (index: number, field: keyof WeightTier, value: number | boolean) => {
    setWeightTiers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    if (!existingUser) {
      toast({ title: "Erreur", description: "Veuillez vous connecter d'abord", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Update profile
      await supabase
        .from("profiles")
        .update({
          phone: profileData.originPhone,
          full_name: profileData.fullName,
          is_gp: true,
        })
        .eq("user_id", existingUser.id);

      // Determine WhatsApp phone
      const whatsappPhone = profileData.whatsappPhone === "origin" 
        ? profileData.originPhone 
        : profileData.destinationPhone;

      // Create GP profile with route-linked contact fields + locked navette & price
      const basePricePerKg = parseFloat(pricePerKg) || 0;
      const { data: gpProfile, error: gpError } = await supabase
        .from("gp_profiles")
        .insert({
          user_id: existingUser.id,
          business_name: profileData.fullName,
          gp_type: "bagages_international",
          phone: profileData.originPhone,
          whatsapp: whatsappPhone,
          deposit_address: profileData.originAddress,
          reception_address: profileData.destinationAddress,
          phone_secondary: profileData.destinationPhone,
          whatsapp_phone: whatsappPhone,
          city: profileData.originCity,
          country_code: profileData.originCountry,
          status: "pending",
          default_currency: defaultCurrency,
          international_destinations: [`${profileData.destinationCity}, ${profileData.destinationCountry}`],
          zones_covered: [`${profileData.originCity}, ${profileData.originCountry}`],
          // PRV: Lock base price and navette at registration
          base_price_per_kg: basePricePerKg,
          base_origin_city: profileData.originCity,
          base_origin_country: profileData.originCountry,
          base_destination_city: profileData.destinationCity,
          base_destination_country: profileData.destinationCountry,
          price_locked_at: new Date().toISOString(),
          navette_locked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (gpError) throw gpError;

      // Save weight tiers
      const tiersToInsert = weightTiers
        .filter(t => t.price_per_kg > 0)
        .map(t => ({
          gp_id: gpProfile.id,
          min_weight: t.min_weight,
          max_weight: t.max_weight,
          price_per_kg: t.price_per_kg,
          currency: defaultCurrency,
          is_active: true,
        }));

      if (tiersToInsert.length > 0) {
        await supabase.from("gp_weight_tiers").insert(tiersToInsert);
      }

      // Create voyage offers
      for (const dep of departures) {
        const avgPrice = weightTiers.length > 0 && tiersToInsert.length > 0
          ? tiersToInsert.reduce((sum, t) => sum + t.price_per_kg, 0) / tiersToInsert.length
          : (pricePerKg ? parseFloat(pricePerKg) : 8);

        await supabase
          .from("gp_offers")
          .insert({
            gp_id: gpProfile.id,
            origin_city: dep.originCity,
            origin_country: dep.originCountry,
            destination_city: dep.destinationCity,
            destination_country: dep.destinationCountry,
            departure_date: dep.date,
            total_capacity: dep.capacity,
            available_capacity: dep.capacity,
            price_per_kg: avgPrice,
            currency: defaultCurrency,
            transport_type: "bagages_international",
            status: "active",
          });
      }

      // Save flat rate pricing
      const { data: objectTypes } = await supabase
        .from("flat_rate_object_types")
        .select("id, name")
        .eq("is_active", true);

      if (objectTypes && objectTypes.length > 0) {
        const objectTypeMap = new Map(objectTypes.map(t => [t.name, t.id]));
        
        for (const [key, value] of flatRatePricing.entries()) {
          if (value.price && parseFloat(value.price) > 0) {
            const objectTypeId = objectTypeMap.get(key);
            if (objectTypeId) {
              await supabase
                .from("gp_flat_rate_pricing")
                .upsert({
                  gp_id: gpProfile.id,
                  object_type_id: objectTypeId,
                  price: parseFloat(value.price),
                  is_active: value.isActive,
                  currency: defaultCurrency,
                }, { onConflict: 'gp_id,object_type_id' });
            }
          }
        }
      }

      toast({
        title: "✈️ Inscription réussie !",
        description: "Bienvenue dans l'espace GP Via Bagages",
      });

      navigate("/gp/dashboard");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="container max-w-lg px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Luggage className="w-8 h-8 text-white" />
            </div>
            <Badge variant="gold" className="mb-3">Inscription rapide</Badge>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Devenir GP Via Bagages
            </h1>
            <p className="text-sm text-muted-foreground">
              Inscription en moins de 2 minutes
            </p>
          </motion.div>

          {/* Progress - 4 steps now */}
          <div className="flex items-center justify-center gap-1 mb-6 overflow-x-auto pb-2">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      step >= s.num
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step > s.num ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] mt-1 whitespace-nowrap ${step >= s.num ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-1 mx-1 rounded ${step > s.num ? "bg-secondary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Account/Auth */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Lock className="w-5 h-5 text-secondary" />
                      <h2 className="text-lg font-semibold">
                        {isLogin ? "Connexion" : "Créer un compte GP"}
                      </h2>
                    </div>

                    {existingUser ? (
                      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Connecté en tant que {existingUser.fullName || existingUser.email}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="text-center mb-2">
                          <p className="text-sm text-muted-foreground">
                            {isLogin ? "Connectez-vous pour continuer" : "Créez votre compte GP"}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="votre@email.com"
                              className="pl-10 h-12"
                              value={authData.email}
                              onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="password">Mot de passe *</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="pl-10 pr-10 h-12"
                              value={authData.password}
                              onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {!isLogin && (
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10 h-12"
                                value={authData.confirmPassword}
                                onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                              />
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setIsLogin(!isLogin)}
                          className="text-sm text-primary hover:underline w-full text-center pt-2"
                        >
                          {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
                        </button>
                      </>
                    )}

                    <div className="flex justify-between pt-4">
                      <Button variant="ghost" onClick={handleBack}>
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        Retour
                      </Button>
                      <Button variant="gold" onClick={handleNext} disabled={loading}>
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            Continuer
                            <ArrowRight className="w-5 h-5 ml-1" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Combined Profile + Route + Addresses */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="space-y-4">
                  <RouteLinkedProfileForm
                    initialData={profileData}
                    onChange={(data, isValid) => {
                      setProfileData(data);
                      setProfileValid(isValid);
                    }}
                    showValidation={true}
                  />

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex justify-between">
                        <Button variant="ghost" onClick={handleBack}>
                          <ArrowLeft className="w-5 h-5 mr-1" />
                          Retour
                        </Button>
                        <Button variant="gold" onClick={handleNext}>
                          Continuer
                          <ArrowRight className="w-5 h-5 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Step 3: Voyages Calendar */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Plane className="w-5 h-5 text-secondary" />
                      <h2 className="text-lg font-semibold">Vos voyages</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Cliquez sur une date pour ajouter un départ
                    </p>

                    <DepartureCalendarView
                      departures={departures}
                      onAddDeparture={handleAddDeparture}
                      defaultRoute={{
                        originCity: profileData.originCity,
                        originCountry: profileData.originCountry,
                        destinationCity: profileData.destinationCity,
                        destinationCountry: profileData.destinationCountry,
                      }}
                    />

                    {departures.length === 0 && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Ajoutez au moins un voyage pour recevoir des demandes
                        </p>
                      </div>
                    )}

                    {departures.length > 0 && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {departures.length} voyage(s) programmé(s)
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <Button variant="ghost" onClick={handleBack}>
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        Retour
                      </Button>
                      <Button variant="gold" onClick={handleNext}>
                        Continuer
                        <ArrowRight className="w-5 h-5 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 4: Pricing */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Euro className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-semibold">Vos tarifs</h2>
                    </div>

                    {/* Currency selector */}
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium">Devise de facturation</p>
                          <p className="text-xs text-muted-foreground">Tous vos prix seront affichés dans cette devise</p>
                        </div>
                        <Coins className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <CurrencySelector
                        value={defaultCurrency}
                        onValueChange={(value) => setDefaultCurrency(value as CurrencyCode)}
                        className="w-full"
                      />
                    </div>

                    {/* Weight tiers */}
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium">Tarifs par palier de poids</p>
                        <p className="text-xs text-muted-foreground">Définissez vos prix selon le poids</p>
                      </div>

                      {weightTiers.map((tier, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {tier.min_weight}-{tier.max_weight} kg
                          </span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={tier.price_per_kg || ""}
                            onChange={(e) => handleWeightTierChange(index, "price_per_kg", parseFloat(e.target.value) || 0)}
                            className="h-10 flex-1"
                          />
                          <span className="text-xs text-muted-foreground">{getCurrencySymbol(defaultCurrency)}/kg</span>
                        </div>
                      ))}
                    </div>

                    {/* Flat rate pricing */}
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium">Forfaits par objet (optionnel)</p>
                        <p className="text-xs text-muted-foreground">Prix fixes pour certains objets</p>
                      </div>

                      {DEFAULT_FLAT_RATE_OBJECTS.map((obj) => {
                        const pricing = flatRatePricing.get(obj.id) || { price: "", isActive: false };
                        
                        return (
                          <div key={obj.id} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm flex-1">{obj.label}</span>
                            <Input
                              type="number"
                              placeholder={obj.defaultPrice.toString()}
                              value={pricing.price}
                              onChange={(e) => handleFlatRateChange(obj.id, "price", e.target.value)}
                              className="h-10 w-24"
                            />
                            <span className="text-xs text-muted-foreground">{getCurrencySymbol(defaultCurrency)}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button variant="ghost" onClick={handleBack}>
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        Retour
                      </Button>
                      <Button variant="gold" onClick={handleSubmit} disabled={loading}>
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            Terminer
                            <CheckCircle className="w-5 h-5 ml-1" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
