import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Truck, ArrowRight, ArrowLeft, Lock, User, Package, 
  DollarSign, Calendar, Eye, EyeOff, Building2, CheckCircle, MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CurrencySelector, type CurrencyCode } from "@/components/ui/currency-selector";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { vehicleTypes, getCategoryLabel } from "@/lib/vehicleTypes";

// Vehicle form interface
interface VehicleData {
  id: string;
  type: string;
  name: string;
  maxWeight: string;
  maxVolume: string;
  protection: string;
  distance: string[];
  zones: string[];
}

// Freight types
const FREIGHT_TYPES = [
  { id: "colis", label: "Colis & Cartons" },
  { id: "mobilier", label: "Mobilier & Meubles" },
  { id: "materiaux", label: "Matériaux de construction" },
  { id: "machines", label: "Machines & Équipements" },
  { id: "vehicules", label: "Véhicules" },
  { id: "conteneurs", label: "Conteneurs" },
  { id: "vrac", label: "Vrac (sable, gravier...)" },
  { id: "denrees", label: "Denrées périssables" },
];

// Protection types
const PROTECTION_TYPES = [
  { id: "ouvert", label: "Ouvert" },
  { id: "bache", label: "Bâché" },
  { id: "couvert", label: "Couvert / Fermé" },
  { id: "frigorifique", label: "Frigorifique" },
];

// Distance types
const DISTANCE_TYPES = [
  { id: "urbain", label: "Urbain (ville)" },
  { id: "regional", label: "Régional" },
  { id: "longue", label: "Longue distance" },
  { id: "international", label: "International" },
];

// Senegal regions
const SENEGAL_REGIONS = [
  "Dakar", "Thiès", "Diourbel", "Fatick", "Kaolack", "Kaffrine",
  "Saint-Louis", "Louga", "Matam", "Tambacounda", "Kédougou",
  "Kolda", "Sédhiou", "Ziguinchor"
];

export default function RoutierRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [existingUser, setExistingUser] = useState<{ id: string; email: string } | null>(null);
  const [isLogin, setIsLogin] = useState(false);

  // Step 1: Identity
  const [transporterType, setTransporterType] = useState<"independant" | "entreprise">("independant");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: Vehicles
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(true);
  const [currentVehicle, setCurrentVehicle] = useState<VehicleData>({
    id: `v-${Date.now()}`,
    type: "",
    name: "",
    maxWeight: "",
    maxVolume: "",
    protection: "",
    distance: [],
    zones: [],
  });
  const [freightTypes, setFreightTypes] = useState<string[]>([]);

  // Step 3: Pricing
  const [pricingBase, setPricingBase] = useState<"poids" | "volume" | "distance">("poids");
  const [minPrice, setMinPrice] = useState("");
  const [pricePerKm, setPricePerKm] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");

  // Step 4: Availability
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeDays, setActiveDays] = useState<string[]>(["lun", "mar", "mer", "jeu", "ven"]);

  // Check existing session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if already a transporter
        const { data: gpProfile } = await supabase
          .from("gp_profiles")
          .select("id, gp_type")
          .eq("user_id", user.id)
          .maybeSingle();

        if (gpProfile?.gp_type === "routier") {
          navigate("/routier/dashboard", { replace: true });
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        setExistingUser({
          id: user.id,
          email: user.email || "",
        });
        setEmail(user.email || "");
        setBusinessName(profile?.full_name || "");
        setPhone(profile?.phone || "");
        setStep(2); // Skip auth step
      }
      setCheckingSession(false);
    };
    checkSession();
  }, [navigate]);

  const steps = [
    { num: 1, label: "Identité", icon: User },
    { num: 2, label: "Véhicules", icon: Truck },
    { num: 3, label: "Tarifs", icon: DollarSign },
    { num: 4, label: "Disponibilité", icon: Calendar },
  ];

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (existingUser) return true;
        if (!businessName) {
          toast({ title: "Nom requis", variant: "destructive" });
          return false;
        }
        if (!phone) {
          toast({ title: "Téléphone requis", variant: "destructive" });
          return false;
        }
        if (!email) {
          toast({ title: "Email requis", variant: "destructive" });
          return false;
        }
        if (!isLogin && (!password || password.length < 6)) {
          toast({ title: "Mot de passe requis (6+ caractères)", variant: "destructive" });
          return false;
        }
        return true;

      case 2:
        if (vehicles.length === 0) {
          toast({ title: "Ajoutez au moins un véhicule", variant: "destructive" });
          return false;
        }
        return true;

      case 3:
        if (!minPrice) {
          toast({ title: "Prix minimum requis", variant: "destructive" });
          return false;
        }
        return true;

      case 4:
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
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          setExistingUser({ id: data.user.id, email: data.user.email || "" });
        }
        return true;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/routier/inscription`,
            data: { full_name: businessName }
          }
        });
        if (error) throw error;
        if (data.user) {
          setExistingUser({ id: data.user.id, email: data.user.email || "" });
        }
        return true;
      }
    } catch (error: any) {
      let msg = "Une erreur est survenue";
      if (error.message?.includes("already registered")) {
        msg = "Email déjà utilisé. Essayez de vous connecter.";
        setIsLogin(true);
      } else if (error.message?.includes("Invalid login credentials")) {
        msg = "Email ou mot de passe incorrect";
      }
      toast({ title: "Erreur", description: msg, variant: "destructive" });
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

    setStep(prev => Math.min(prev + 1, 5));
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

  const addVehicle = () => {
    if (!currentVehicle.type || !currentVehicle.name) {
      toast({ title: "Type et nom requis", variant: "destructive" });
      return;
    }
    setVehicles(prev => [...prev, { ...currentVehicle, id: `v-${Date.now()}` }]);
    setCurrentVehicle({
      id: `v-${Date.now()}`,
      type: "",
      name: "",
      maxWeight: "",
      maxVolume: "",
      protection: "",
      distance: [],
      zones: [],
    });
    setShowVehicleForm(false);
    toast({ title: "Véhicule ajouté" });
  };

  const removeVehicle = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    if (!existingUser) {
      toast({ title: "Erreur d'authentification", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Update profile
      await supabase
        .from("profiles")
        .update({
          phone: phone,
          full_name: businessName,
          is_gp: true,
        })
        .eq("user_id", existingUser.id);

      // Create GP profile for routier - set verified for prototype
      const { data: gpProfile, error: gpError } = await supabase
        .from("gp_profiles")
        .insert({
          user_id: existingUser.id,
          business_name: businessName,
          gp_type: "routier",
          road_type: "mission",
          phone: phone,
          whatsapp: sameAsPhone ? phone : whatsapp,
          whatsapp_phone: sameAsPhone ? phone : whatsapp,
          city: currentVehicle.zones[0] || "Dakar",
          country_code: "SN",
          status: "verified",
          default_currency: currency,
          zones_covered: vehicles.flatMap(v => v.zones),
          base_price_per_kg: minPrice ? parseFloat(minPrice) : null,
        })
        .select()
        .single();

      if (gpError) throw gpError;

      // Insert vehicles
      for (const vehicle of vehicles) {
        await supabase.from("vehicles").insert({
          gp_id: gpProfile.id,
          name: vehicle.name,
          vehicle_type: vehicle.type,
          transport_category: "routier",
          max_weight_kg: vehicle.maxWeight ? parseFloat(vehicle.maxWeight) * 1000 : null,
          max_volume_m3: vehicle.maxVolume ? parseFloat(vehicle.maxVolume) : null,
          specifications: {
            protection: vehicle.protection,
            distance_types: vehicle.distance,
            zones: vehicle.zones,
            freight_types: freightTypes,
          },
          is_active: true,
        });
      }

      toast({
        title: "🚛 Inscription réussie !",
        description: "Votre compte est actif. Bienvenue !",
      });

      navigate("/routier/demandes");
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

  if (checkingSession) {
    return <TransportPageLoader message="Vérification..." vehicle="truck" />;
  }

  const routierVehicles = vehicleTypes.routier;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showNotifications={false} />

      <main className="pt-4 pb-24 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <Badge variant="secondary" className="mb-3">Inscription Pro</Badge>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Transporteur Routier
            </h1>
            <p className="text-sm text-muted-foreground">
              Inscrivez-vous en quelques étapes
            </p>
          </motion.div>

          {/* Progress */}
          <div className="mb-6">
            <Progress value={(step / 4) * 100} className="h-2 mb-3" />
            <div className="flex justify-between">
              {steps.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.num}
                    className={`flex flex-col items-center ${
                      step >= s.num ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                      step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px]">{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 1: Identity */}
              {step === 1 && (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Identité transporteur
                    </h2>

                    {/* Type */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "independant", label: "Indépendant", icon: User },
                        { id: "entreprise", label: "Entreprise", icon: Building2 },
                      ].map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setTransporterType(type.id as any)}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              transporterType === type.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <Icon className={`w-6 h-6 mx-auto mb-2 ${
                              transporterType === type.id ? "text-primary" : "text-muted-foreground"
                            }`} />
                            <span className="text-sm font-medium">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                      <Label>
                        {transporterType === "entreprise" ? "Raison sociale" : "Nom complet"}
                      </Label>
                      <Input
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder={transporterType === "entreprise" ? "Ma Société SARL" : "Moussa Diallo"}
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label>Téléphone principal</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+221 77 123 45 67"
                      />
                    </div>

                    {/* WhatsApp */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={sameAsPhone}
                          onCheckedChange={(checked) => setSameAsPhone(checked === true)}
                        />
                        <Label className="font-normal">WhatsApp identique au téléphone</Label>
                      </div>
                      {!sameAsPhone && (
                        <Input
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="WhatsApp"
                        />
                      )}
                    </div>

                    {!existingUser && (
                      <>
                        {/* Email */}
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@example.com"
                          />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                          <Label>Mot de passe</Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsLogin(!isLogin)}
                          className="text-sm text-primary hover:underline"
                        >
                          {isLogin ? "Créer un compte" : "Déjà inscrit ? Se connecter"}
                        </button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Vehicles */}
              {step === 2 && (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <Truck className="w-5 h-5 text-primary" />
                      Mes véhicules
                    </h2>

                    {/* Added vehicles */}
                    {vehicles.length > 0 && (
                      <div className="space-y-2">
                        {vehicles.map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Truck className="w-5 h-5 text-primary" />
                              <div>
                                <p className="font-medium text-sm">{v.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {v.type.replace(/_/g, " ")}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVehicle(v.id)}
                              className="text-destructive"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Vehicle form */}
                    {showVehicleForm && (
                      <div className="space-y-4 border border-border rounded-lg p-4">
                        {/* Vehicle type */}
                        <div className="space-y-2">
                          <Label>Type de véhicule</Label>
                          <Select
                            value={currentVehicle.type}
                            onValueChange={(v) => setCurrentVehicle(prev => ({ ...prev, type: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent>
                              {routierVehicles.map((v) => (
                                <SelectItem key={v.value} value={v.value}>
                                  {v.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Vehicle name */}
                        <div className="space-y-2">
                          <Label>Identifiant / Immatriculation</Label>
                          <Input
                            value={currentVehicle.name}
                            onChange={(e) => setCurrentVehicle(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Camion 01 ou AA-123-SN"
                          />
                        </div>

                        {/* Capacity */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Capacité (tonnes)</Label>
                            <Input
                              type="number"
                              value={currentVehicle.maxWeight}
                              onChange={(e) => setCurrentVehicle(prev => ({ ...prev, maxWeight: e.target.value }))}
                              placeholder="10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Volume (m³)</Label>
                            <Input
                              type="number"
                              value={currentVehicle.maxVolume}
                              onChange={(e) => setCurrentVehicle(prev => ({ ...prev, maxVolume: e.target.value }))}
                              placeholder="30"
                            />
                          </div>
                        </div>

                        {/* Protection */}
                        <div className="space-y-2">
                          <Label>Protection</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {PROTECTION_TYPES.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setCurrentVehicle(prev => ({ ...prev, protection: p.id }))}
                                className={`p-2 text-sm rounded-lg border-2 transition-all ${
                                  currentVehicle.protection === p.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border"
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Distance */}
                        <div className="space-y-2">
                          <Label>Distance acceptée</Label>
                          <div className="flex flex-wrap gap-2">
                            {DISTANCE_TYPES.map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  setCurrentVehicle(prev => ({
                                    ...prev,
                                    distance: prev.distance.includes(d.id)
                                      ? prev.distance.filter(x => x !== d.id)
                                      : [...prev.distance, d.id]
                                  }));
                                }}
                                className={`px-3 py-1.5 text-xs rounded-full border-2 transition-all ${
                                  currentVehicle.distance.includes(d.id)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border"
                                }`}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Zones */}
                        <div className="space-y-2">
                          <Label>Zone(s) principale(s)</Label>
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {SENEGAL_REGIONS.map((zone) => (
                              <button
                                key={zone}
                                type="button"
                                onClick={() => {
                                  setCurrentVehicle(prev => ({
                                    ...prev,
                                    zones: prev.zones.includes(zone)
                                      ? prev.zones.filter(x => x !== zone)
                                      : [...prev.zones, zone]
                                  }));
                                }}
                                className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                                  currentVehicle.zones.includes(zone)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background"
                                }`}
                              >
                                {zone}
                              </button>
                            ))}
                          </div>
                        </div>

                        <Button onClick={addVehicle} className="w-full">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Ajouter ce véhicule
                        </Button>
                      </div>
                    )}

                    {!showVehicleForm && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowVehicleForm(true)}
                      >
                        + Ajouter un autre véhicule
                      </Button>
                    )}

                    {/* Freight types */}
                    <div className="space-y-2 pt-4 border-t">
                      <Label>Types de fret acceptés</Label>
                      <div className="flex flex-wrap gap-2">
                        {FREIGHT_TYPES.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setFreightTypes(prev =>
                                prev.includes(f.id)
                                  ? prev.filter(x => x !== f.id)
                                  : [...prev, f.id]
                              );
                            }}
                            className={`px-3 py-1.5 text-xs rounded-full border-2 transition-all ${
                              freightTypes.includes(f.id)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Pricing */}
              {step === 3 && (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      Tarification
                    </h2>

                    {/* Currency */}
                    <div className="space-y-2">
                      <Label>Devise</Label>
                      <CurrencySelector value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)} />
                    </div>

                    {/* Pricing base */}
                    <div className="space-y-2">
                      <Label>Base de calcul</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "poids", label: "Poids" },
                          { id: "volume", label: "Volume" },
                          { id: "distance", label: "Distance" },
                        ].map((base) => (
                          <button
                            key={base.id}
                            type="button"
                            onClick={() => setPricingBase(base.id as any)}
                            className={`p-3 text-sm rounded-lg border-2 transition-all ${
                              pricingBase === base.id
                                ? "border-primary bg-primary/5"
                                : "border-border"
                            }`}
                          >
                            {base.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Min price */}
                    <div className="space-y-2">
                      <Label>Prix minimum par course</Label>
                      <Input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="15000"
                      />
                    </div>

                    {/* Price per km */}
                    <div className="space-y-2">
                      <Label>Coefficient distance (par km)</Label>
                      <Input
                        type="number"
                        value={pricePerKm}
                        onChange={(e) => setPricePerKm(e.target.value)}
                        placeholder="500"
                      />
                    </div>

                    <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                      💡 Le système calculera automatiquement le prix en fonction du poids, volume et distance. Vous ne négociez pas à la main.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Availability */}
              {step === 4 && (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Disponibilité
                    </h2>

                    {/* Available now */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Disponible maintenant</p>
                        <p className="text-xs text-muted-foreground">Recevez des demandes dès validation</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAvailable(!isAvailable)}
                        className={`w-12 h-6 rounded-full transition-all ${
                          isAvailable ? "bg-green-500" : "bg-muted-foreground/30"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-all ${
                          isAvailable ? "translate-x-6" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>

                    {/* Active days */}
                    <div className="space-y-2">
                      <Label>Jours actifs</Label>
                      <div className="flex gap-2 flex-wrap">
                        {["lun", "mar", "mer", "jeu", "ven", "sam", "dim"].map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              setActiveDays(prev =>
                                prev.includes(day)
                                  ? prev.filter(d => d !== day)
                                  : [...prev, day]
                              );
                            }}
                            className={`w-10 h-10 rounded-full text-xs font-medium transition-all ${
                              activeDays.includes(day)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* CGU */}
                    <div className="pt-4 border-t">
                      <div className="flex items-start gap-2">
                        <Checkbox id="cgu" />
                        <label htmlFor="cgu" className="text-xs text-muted-foreground">
                          J'accepte les <a href="/cgu" className="text-primary underline">Conditions Générales</a> et l'annexe Transport Routier
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>

            {step < 4 ? (
              <Button onClick={handleNext} className="flex-1" disabled={loading}>
                Suivant
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
                {loading ? "Inscription..." : "Finaliser"}
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
