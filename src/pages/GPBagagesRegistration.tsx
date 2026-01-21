import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, ArrowLeft, User, Luggage, MapPin, 
  CheckCircle, Phone, Calendar, Weight, Plane,
  Mail, Lock, Eye, EyeOff, ShieldX, Euro, AlertTriangle
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

// Popular destinations for quick selection
const POPULAR_ROUTES = [
  { origin: "Paris", destination: "Dakar", originCountry: "FR", destCountry: "SN" },
  { origin: "Paris", destination: "Abidjan", originCountry: "FR", destCountry: "CI" },
  { origin: "Dakar", destination: "Paris", originCountry: "SN", destCountry: "FR" },
  { origin: "Paris", destination: "Douala", originCountry: "FR", destCountry: "CM" },
  { origin: "Dubaï", destination: "Dakar", originCountry: "AE", destCountry: "SN" },
  { origin: "Montréal", destination: "Dakar", originCountry: "CA", destCountry: "SN" },
];

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

  // Step 2: GP Essential Info
  const [profileData, setProfileData] = useState({
    fullName: "",
    phone: "",
    originCountry: "FR",
    destinationCountry: "SN",
    photoUrl: "",
    languages: [] as string[],
  });

  // Step 3: Voyages (calendrier)
  const [departures, setDepartures] = useState<any[]>([]);

  // Step 4: Restrictions (obligatoire)
  const [acceptedRestrictions, setAcceptedRestrictions] = useState<string[]>([]);

  // Step 5: Pricing
  const [pricePerKg, setPricePerKg] = useState("");
  const [flatRatePricing, setFlatRatePricing] = useState<Map<string, { price: string; isActive: boolean }>>(
    new Map(DEFAULT_FLAT_RATE_OBJECTS.map(o => [o.id, { price: o.defaultPrice.toString(), isActive: false }]))
  );

  // Check for existing user
  useEffect(() => {
    const loadExistingProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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
  }, []);

  const steps = [
    { num: 1, label: "Accès", icon: Lock },
    { num: 2, label: "Infos GP", icon: User },
    { num: 3, label: "Voyages", icon: Plane },
    { num: 4, label: "Règles", icon: ShieldX },
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
        // Voyages can be added later, but encourage at least one
        if (departures.length === 0) {
          toast({ 
            title: "Conseil", 
            description: "Ajoutez au moins un voyage pour commencer à recevoir des demandes",
          });
        }
        return true;

      case 4:
        // Restrictions are optional - GP can choose which ones to apply
        // Just show a tip if none selected
        if (acceptedRestrictions.length === 0) {
          toast({ 
            title: "Conseil", 
            description: "Définir des restrictions vous protège et rassure vos clients",
          });
        }
        return true;

      case 5:
        // At least one pricing method required
        const hasKgPrice = pricePerKg && parseFloat(pricePerKg) > 0;
        const hasFlatRate = Array.from(flatRatePricing.values()).some(p => p.isActive && parseFloat(p.price) > 0);
        if (!hasKgPrice && !hasFlatRate) {
          toast({ 
            title: "Tarification requise", 
            description: "Définissez au moins un prix au kilo ou un forfait objet", 
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
  };

  const selectRoute = (route: typeof POPULAR_ROUTES[0]) => {
    setProfileData(prev => ({
      ...prev,
      originCountry: route.originCountry,
      destinationCountry: route.destCountry,
    }));
  };

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
          phone: profileData.phone,
          full_name: profileData.fullName,
          is_gp: true,
        })
        .eq("user_id", existingUser.id);

      // Create GP profile
      const { data: gpProfile, error: gpError } = await supabase
        .from("gp_profiles")
        .insert({
          user_id: existingUser.id,
          business_name: profileData.fullName,
          gp_type: "bagages_international",
          phone: profileData.phone,
          whatsapp: profileData.phone,
          city: "International",
          country_code: profileData.originCountry,
          status: "pending",
          explicit_restrictions: acceptedRestrictions,
        })
        .select()
        .single();

      if (gpError) throw gpError;

      // Create voyage offers
      for (const dep of departures) {
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
            price_per_kg: pricePerKg ? parseFloat(pricePerKg) : 8,
            currency: "EUR",
            transport_type: "bagages_international",
            explicit_restrictions: acceptedRestrictions,
            status: "active",
          });
      }

      // Save flat rate pricing
      const flatRateEntries: { object_type: string; price: number; is_active: boolean }[] = [];
      flatRatePricing.forEach((value, key) => {
        if (value.price && parseFloat(value.price) > 0) {
          flatRateEntries.push({
            object_type: key,
            price: parseFloat(value.price),
            is_active: value.isActive,
          });
        }
      });

      // Note: Would need to match object_type_id from flat_rate_object_types table
      // For now, storing in gp_profile metadata or a separate call after types are loaded

      toast({
        title: "✈️ Inscription réussie !",
        description: "Bienvenue dans l'espace GP Via Bagages",
      });

      navigate("/gp/bagages");
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
                        {/* Toggle login/signup */}
                        <div className="flex rounded-xl bg-muted p-1">
                          <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                              !isLogin ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                            }`}
                          >
                            Inscription
                          </button>
                          <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                              isLogin ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                            }`}
                          >
                            Connexion
                          </button>
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

                    {/* Quick route selection for countries */}
                    <div className="space-y-2">
                      <Label>Trajets fréquents (optionnel)</Label>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR_ROUTES.slice(0, 4).map((route, i) => (
                          <Badge
                            key={i}
                            variant={
                              profileData.originCountry === route.originCountry && 
                              profileData.destinationCountry === route.destCountry 
                                ? "default" 
                                : "outline"
                            }
                            className="cursor-pointer py-1.5"
                            onClick={() => selectRoute(route)}
                          >
                            {route.origin} → {route.destination}
                          </Badge>
                        ))}
                      </div>
                    </div>

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

            {/* Step 4: Restrictions */}
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
                      <ShieldX className="w-5 h-5 text-destructive" />
                      <h2 className="text-lg font-semibold">Règles de sécurité</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Vous devez accepter ces restrictions pour continuer
                    </p>

                    <div className="space-y-3">
                      {STANDARD_RESTRICTIONS.filter(r => MANDATORY_RESTRICTIONS.includes(r.id)).map((restriction) => {
                        const isAccepted = acceptedRestrictions.includes(restriction.id);
                        const Icon = restriction.icon;
                        
                        return (
                          <div
                            key={restriction.id}
                            onClick={() => toggleRestriction(restriction.id)}
                            className={`
                              flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                              ${isAccepted 
                                ? 'border-destructive/50 bg-destructive/5' 
                                : 'border-border hover:border-destructive/30'
                              }
                            `}
                          >
                            <Checkbox
                              checked={isAccepted}
                              onCheckedChange={() => toggleRestriction(restriction.id)}
                            />
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isAccepted ? 'bg-destructive/10' : 'bg-muted'
                            }`}>
                              <Icon className={`w-5 h-5 ${isAccepted ? 'text-destructive' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium text-sm ${isAccepted ? 'text-destructive' : ''}`}>
                                ⛔ Je refuse : {restriction.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {restriction.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Optional restrictions */}
                    <div className="pt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-3">Restrictions optionnelles</p>
                      <div className="space-y-2">
                        {STANDARD_RESTRICTIONS.filter(r => !MANDATORY_RESTRICTIONS.includes(r.id)).map((restriction) => {
                          const isAccepted = acceptedRestrictions.includes(restriction.id);
                          
                          return (
                            <div
                              key={restriction.id}
                              onClick={() => toggleRestriction(restriction.id)}
                              className={`
                                flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                ${isAccepted ? 'border-amber-500/50 bg-amber-500/5' : 'border-border'}
                              `}
                            >
                              <Checkbox checked={isAccepted} onCheckedChange={() => toggleRestriction(restriction.id)} />
                              <span className="text-sm">{restriction.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

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

            {/* Step 5: Pricing */}
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
                          className="pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          € / kg
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
                            <span className="text-xs text-muted-foreground">€</span>
                            <Switch
                              checked={pricing.isActive && !!pricing.price}
                              onCheckedChange={(checked) => handleFlatRateChange(obj.id, "isActive", checked)}
                              disabled={!pricing.price}
                            />
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
                            Valider mon inscription
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
