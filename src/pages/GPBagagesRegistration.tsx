import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, ArrowLeft, User, Luggage, MapPin, 
  CheckCircle, Phone, Calendar, Weight, Plane,
  Mail, Lock, Eye, EyeOff, ShieldX, Euro, AlertTriangle, Coins, Building
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { DepartureCalendarView } from "@/components/gp/DepartureCalendarView";
import { STANDARD_RESTRICTIONS } from "@/components/gp/BaggageRestrictions";
import { InteractiveRouteSelector } from "@/components/gp/InteractiveRouteSelector";
import { GPContactAddressesForm } from "@/components/gp/GPContactAddressesForm";
import { WeightTiersPricing } from "@/components/gp/WeightTiersPricing";
import { CurrencySelector, getCurrencySymbol, type CurrencyCode } from "@/components/ui/currency-selector";

// Mandatory restrictions (must be accepted)
const MANDATORY_RESTRICTIONS = ["marques", "objets_precieux", "contrefacons"];

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

// Contact addresses interface
interface ContactAddresses {
  deposit_address: string;
  reception_address: string;
  phone: string;
  phone_secondary: string;
  whatsapp_phone: string;
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

  // Step 2: GP Essential Info + Contact Addresses (V1 mandatory)
  const [profileData, setProfileData] = useState({
    fullName: "",
    phone: "",
    originCity: "Dakar",
    originCountry: "SN",
    destinationCity: "Paris",
    destinationCountry: "FR",
    photoUrl: "",
    languages: [] as string[],
  });

  // Contact addresses (PRD V1 Section 9 - mandatory)
  const [contactAddresses, setContactAddresses] = useState<ContactAddresses>({
    deposit_address: "",
    reception_address: "",
    phone: "",
    phone_secondary: "",
    whatsapp_phone: "primary",
  });
  const [contactAddressesValid, setContactAddressesValid] = useState(false);

  // Step 3: Voyages (calendrier)
  const [departures, setDepartures] = useState<any[]>([]);

  // Step 4: Restrictions (obligatoire)
  const [acceptedRestrictions, setAcceptedRestrictions] = useState<string[]>([]);

  // Step 5: Pricing with weight tiers (PRD V1 Section 5.1)
  const [pricePerKg, setPricePerKg] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>("XOF");
  const [weightTiers, setWeightTiers] = useState<WeightTier[]>([]);
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
            phone: profile.phone || "",
          }));
          // Skip auth step if already logged in
          setStep(2);
        }
      }
    };
    loadExistingProfile();
  }, [navigate, toast]);

  const steps = [
    { num: 1, label: "Accès", icon: Lock },
    { num: 2, label: "Profil", icon: User },
    { num: 3, label: "Adresses", icon: Building },
    { num: 4, label: "Voyages", icon: Plane },
    { num: 5, label: "Tarifs", icon: Euro },
  ];

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (existingUser) return true; // Already logged in
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
        if (!profileData.fullName || !profileData.phone) {
          toast({ title: "Champs requis", description: "Nom et téléphone sont obligatoires", variant: "destructive" });
          return false;
        }
        return true;

      case 3:
        // Contact addresses are MANDATORY per PRD V1 Section 9
        if (!contactAddressesValid) {
          toast({ 
            title: "Adresses incomplètes", 
            description: "Veuillez remplir toutes les adresses et numéros de téléphone obligatoires",
            variant: "destructive"
          });
          return false;
        }
        return true;

      case 4:
        // Voyages can be added later, but encourage at least one
        if (departures.length === 0) {
          toast({ 
            title: "Conseil", 
            description: "Ajoutez au moins un voyage pour commencer à recevoir des demandes",
          });
        }
        return true;

      case 5:
        // Weight tiers validation - at least some prices should be set
        const hasValidTiers = weightTiers.some(t => t.price_per_kg > 0);
        if (!hasValidTiers && (!pricePerKg || parseFloat(pricePerKg) <= 0)) {
          toast({ 
            title: "Tarifs requis", 
            description: "Définissez au moins un prix au kilo ou des paliers de poids", 
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
        // Login
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
            phone: profile?.phone || prev.phone,
          }));

          toast({ title: "Connexion réussie", description: "Continuez votre inscription GP" });
        }
        return true;
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email: authData.email,
          password: authData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/gp/bagages`,
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

    // Special handling for auth step
    if (step === 1 && !existingUser) {
      const success = await handleAuthStep();
      if (!success) return;
    }

    setStep(prev => Math.min(prev + 1, 5));
    // Scroll to top on step change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step === 1) {
      navigate("/gp/inscription");
    } else if (step === 2 && existingUser) {
      // If logged in, go back to registration selection
      navigate("/gp/inscription");
    } else {
      setStep(prev => Math.max(prev - 1, 1));
    }
    // Scroll to top on step change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // Route selection now handled by InteractiveRouteSelector component

  const handleAddDeparture = async (data: any) => {
    // Store departure locally for now, will save to DB on final submit
    setDepartures(prev => [...prev, {
      id: `temp-${Date.now()}`,
      date: data.date,
      originCity: data.originCity,
      originCountry: data.originCountry,
      destinationCity: data.destinationCity,
      destinationCountry: data.destinationCountry,
      capacity: data.capacity,
      availableCapacity: data.capacity,
      pricePerKg: data.pricePerKg,
      type: data.type,
      status: "open",
    }]);
    toast({ title: "Voyage ajouté", description: `${data.originCity} → ${data.destinationCity}` });
  };

  const toggleRestriction = (id: string) => {
    setAcceptedRestrictions(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleFlatRateChange = (id: string, field: "price" | "isActive", value: string | boolean) => {
    setFlatRatePricing(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(id) || { price: "", isActive: false };
      newMap.set(id, { 
        ...current, 
        [field]: value 
      });
      return newMap;
    });
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;
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
          phone: contactAddresses.phone || profileData.phone,
          full_name: profileData.fullName,
          is_gp: true,
        })
        .eq("user_id", existingUser.id);

      // Create GP profile with V1 mandatory fields (PRD Section 9)
      const whatsappPhone = contactAddresses.whatsapp_phone === "primary" 
        ? contactAddresses.phone 
        : contactAddresses.phone_secondary;

      const { data: gpProfile, error: gpError } = await supabase
        .from("gp_profiles")
        .insert({
          user_id: existingUser.id,
          business_name: profileData.fullName,
          gp_type: "bagages_international",
          phone: contactAddresses.phone || profileData.phone,
          whatsapp: whatsappPhone,
          // V1 mandatory contact fields
          deposit_address: contactAddresses.deposit_address,
          reception_address: contactAddresses.reception_address || contactAddresses.deposit_address,
          phone_secondary: contactAddresses.phone_secondary,
          whatsapp_phone: whatsappPhone,
          city: profileData.originCity || "International",
          country_code: profileData.originCountry,
          status: "pending",
          explicit_restrictions: acceptedRestrictions,
          default_currency: defaultCurrency,
        })
        .select()
        .single();

      if (gpError) throw gpError;

      // Save weight tiers (PRD V1 Section 5.1)
      if (weightTiers.length > 0) {
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
      }

      // Create voyage offers
      for (const dep of departures) {
        // Use average price from tiers or fallback to pricePerKg
        const avgPrice = weightTiers.length > 0 
          ? weightTiers.reduce((sum, t) => sum + t.price_per_kg, 0) / weightTiers.length
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
            explicit_restrictions: acceptedRestrictions,
            status: "active",
          });
      }

      // Save flat rate pricing - sync with gp_flat_rate_pricing table
      // First, load object type IDs from flat_rate_object_types
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
        <div className="container max-w-lg">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4">
              <Luggage className="w-8 h-8 text-white" />
            </div>
            <Badge variant="gold" className="mb-3">Inscription rapide</Badge>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Devenir GP Via Bagages
            </h1>
            <p className="text-sm text-muted-foreground">
              Inscription en moins de 2 minutes
            </p>
          </motion.div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-1 mb-8 overflow-x-auto pb-2">
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
                  <span className={`text-[10px] mt-1 ${step >= s.num ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-6 h-1 mx-0.5 rounded ${step > s.num ? "bg-secondary" : "bg-muted"}`} />
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
                        {/* Only show Inscription for non-connected users */}
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
                              className="pl-10"
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
                              className="pl-10 pr-10"
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
                                className="pl-10"
                                value={authData.confirmPassword}
                                onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                              />
                            </div>
                          </div>
                        )}
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

            {/* Step 2: GP Essential Info */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-5 h-5 text-secondary" />
                      <h2 className="text-lg font-semibold">Vos informations</h2>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nom & Prénom *</Label>
                      <Input
                        id="fullName"
                        placeholder="Ex: Mamadou Diallo"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone (WhatsApp) *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+33 6 12 34 56 78"
                          className="pl-10"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Les clients vous contacteront via WhatsApp
                      </p>
                    </div>

                    {/* Interactive Route Selector with dropdowns and flags */}
                    <InteractiveRouteSelector
                      originCity={profileData.originCity}
                      originCountry={profileData.originCountry}
                      destinationCity={profileData.destinationCity}
                      destinationCountry={profileData.destinationCountry}
                      onOriginChange={(city, country) => setProfileData({ ...profileData, originCity: city, originCountry: country })}
                      onDestinationChange={(city, country) => setProfileData({ ...profileData, destinationCity: city, destinationCountry: country })}
                    />

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

            {/* Step 3: Contact Addresses (V1 Mandatory) */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="space-y-4">
                  <GPContactAddressesForm
                    initialData={contactAddresses}
                    onChange={(data, isValid) => {
                      setContactAddresses(data);
                      setContactAddressesValid(isValid);
                    }}
                    showValidation={true}
                  />

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex justify-between pt-2">
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

            {/* Step 4: Voyages Calendar */}
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
                      <Plane className="w-5 h-5 text-secondary" />
                      <h2 className="text-lg font-semibold">Vos voyages</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Cliquez sur une date pour ajouter un départ
                    </p>

                    <DepartureCalendarView
                      departures={departures}
                      onAddDeparture={handleAddDeparture}
                    />

                    {departures.length === 0 && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Ajoutez au moins un voyage pour recevoir des demandes
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

            {/* Step 5: Pricing with Weight Tiers (PRD V1 Section 5) */}
            {step === 5 && (
              <motion.div
                key="step5"
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

                    {/* Price per kg */}
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium">Prix au kilo</p>
                          <p className="text-xs text-muted-foreground">Tarif standard par kilogramme</p>
                        </div>
                        <Weight className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="8"
                          value={pricePerKg}
                          onChange={(e) => setPricePerKg(e.target.value)}
                          className="pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {getCurrencySymbol(defaultCurrency)} / kg
                        </span>
                      </div>
                    </div>

                    {/* Flat rate pricing */}
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium">Forfaits par objet</p>
                        <p className="text-xs text-muted-foreground">Prix fixes pour certains objets</p>
                      </div>

                      {DEFAULT_FLAT_RATE_OBJECTS.map((obj) => {
                        const pricing = flatRatePricing.get(obj.id) || { price: "", isActive: false };
                        
                        return (
                          <div
                            key={obj.id}
                            className={`
                              flex items-center gap-3 p-3 rounded-lg border transition-all
                              ${pricing.isActive && pricing.price ? 'border-primary/50 bg-primary/5' : 'border-border'}
                            `}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{obj.label}</p>
                            </div>
                            <Input
                              type="number"
                              placeholder={obj.defaultPrice.toString()}
                              value={pricing.price}
                              onChange={(e) => handleFlatRateChange(obj.id, "price", e.target.value)}
                              className="w-20 h-8 text-sm text-center"
                            />
                            <span className="text-xs text-muted-foreground">{getCurrencySymbol(defaultCurrency)}</span>
                            <Switch
                              checked={pricing.isActive && !!pricing.price}
                              onCheckedChange={(checked) => handleFlatRateChange(obj.id, "isActive", checked)}
                              disabled={!pricing.price}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4">
                      <Button variant="ghost" onClick={handleBack} className="w-full sm:w-auto">
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        Retour
                      </Button>
                      <Button variant="gold" onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            S'inscrire
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
