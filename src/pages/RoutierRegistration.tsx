import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Truck, ArrowRight, ArrowLeft, User, MapPin,
  Eye, EyeOff, Building2, CheckCircle, Shield, Package,
  Route, Home, DollarSign, Briefcase, UserCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { Textarea } from "@/components/ui/textarea";

const ROUTIER_VEHICLES = [
  { value: "moto", label: "🏍️ Moto", category: "light" },
  { value: "tricycle", label: "🛺 Tricycle / Jakarta", category: "light" },
  { value: "pickup", label: "🚙 Pick-up", category: "light" },
  { value: "fourgonnette", label: "🚐 Fourgonnette", category: "medium" },
  { value: "fourgon", label: "🚐 Fourgon", category: "medium" },
  { value: "camionnette", label: "🚐 Camionnette", category: "medium" },
  { value: "camion_3t", label: "🚛 Camion 3T", category: "heavy" },
  { value: "camion_10t", label: "🚛 Camion 10T", category: "heavy" },
  { value: "camion_benne", label: "🚛 Camion benne", category: "heavy" },
  { value: "semi_remorque", label: "🚛 Semi-remorque", category: "heavy" },
  { value: "plateau", label: "🚛 Plateau", category: "heavy" },
  { value: "porte_conteneur", label: "📦 Porte-conteneur", category: "heavy" },
  { value: "citerne", label: "🛢️ Citerne", category: "heavy" },
  { value: "frigorifique", label: "❄️ Frigorifique", category: "heavy" },
];

const FREIGHT_TYPES = [
  { id: "colis", label: "📦 Colis & Cartons" },
  { id: "mobilier", label: "🪑 Mobilier & Meubles" },
  { id: "materiaux", label: "🧱 Matériaux BTP" },
  { id: "machines", label: "⚙️ Machines & Équipements" },
  { id: "vehicules", label: "🚗 Véhicules" },
  { id: "vrac", label: "🪨 Vrac (sable, gravier)" },
  { id: "denrees", label: "🍎 Denrées périssables" },
  { id: "conteneurs", label: "📦 Conteneurs" },
];

const SENEGAL_CITIES = [
  "Dakar", "Thiès", "Saint-Louis", "Kaolack", "Touba",
  "Ziguinchor", "Tambacounda", "Kolda", "Matam", "Louga",
  "Fatick", "Kédougou", "Sédhiou", "Kaffrine", "Diourbel",
  "Mbour", "Rufisque", "Richard-Toll"
];

type RoadType = "shuttle" | "mission" | "both";
type EntityType = "particulier" | "entreprise";

interface VehicleData {
  id: string;
  type: string;
  name: string;
  maxWeightKg: string;
  maxVolumeM3: string;
  hasInsurance: boolean;
  homeDelivery: boolean;
}

export default function RoutierRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [existingUser, setExistingUser] = useState<{ id: string; email: string } | null>(null);
  const [isLogin, setIsLogin] = useState(false);

  // Step 1: Entity type + Road type
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [roadType, setRoadType] = useState<RoadType | null>(null);

  // Step 2: Identité
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Enterprise-specific
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  // Step 3: Véhicule
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(true);
  const [currentVehicle, setCurrentVehicle] = useState<VehicleData>({
    id: "", type: "", name: "", maxWeightKg: "", maxVolumeM3: "", hasInsurance: false, homeDelivery: false,
  });
  const [freightTypes, setFreightTypes] = useState<string[]>([]);

  // Step 4: Trajet
  const [originCity, setOriginCity] = useState("");
  const [originAddress, setOriginAddress] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [homeDeliveryEnabled, setHomeDeliveryEnabled] = useState(false);

  // Step 5: Tarification
  const [routierMinPrice, setRoutierMinPrice] = useState("");
  const [routierPricePerKm, setRoutierPricePerKm] = useState("");
  const [routierPricePerKg, setRoutierPricePerKg] = useState("");
  const [routierPricePerM3, setRoutierPricePerM3] = useState("");
  const [routierCurrency, setRoutierCurrency] = useState("XOF");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: gpProfile } = await supabase
          .from("gp_profiles").select("id, gp_type").eq("user_id", user.id).maybeSingle();
        if (gpProfile?.gp_type === "routier") {
          navigate("/routier/apercu", { replace: true });
          return;
        }
        setExistingUser({ id: user.id, email: user.email || "" });
        setEmail(user.email || "");
        const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle();
        setBusinessName(profile?.full_name || "");
        setPhone(profile?.phone || "");
      }
      setCheckingSession(false);
    };
    checkSession();
  }, [navigate]);

  const STEPS = [
    { num: 1, label: "Profil", icon: Briefcase },
    { num: 2, label: "Identité", icon: User },
    { num: 3, label: "Véhicule", icon: Truck },
    { num: 4, label: "Trajet", icon: MapPin },
    { num: 5, label: "Tarifs", icon: DollarSign },
  ];
  const TOTAL_STEPS = 5;

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!entityType) { toast({ title: "Choisissez votre type d'entité", variant: "destructive" }); return false; }
      if (!roadType) { toast({ title: "Choisissez votre mode de transport", variant: "destructive" }); return false; }
      return true;
    }
    if (s === 2) {
      if (existingUser) return true;
      if (!businessName) { toast({ title: "Nom requis", variant: "destructive" }); return false; }
      if (!phone) { toast({ title: "Téléphone requis", variant: "destructive" }); return false; }
      if (!email) { toast({ title: "Email requis", variant: "destructive" }); return false; }
      if (!isLogin && (!password || password.length < 6)) { toast({ title: "Mot de passe 6+ caractères", variant: "destructive" }); return false; }
      if (entityType === "entreprise" && !registrationNumber) { toast({ title: "N° registre commerce requis", variant: "destructive" }); return false; }
      return true;
    }
    if (s === 3) {
      if (vehicles.length === 0) { toast({ title: "Ajoutez au moins un véhicule", variant: "destructive" }); return false; }
      return true;
    }
    if (s === 4) {
      if (!originCity) { toast({ title: "Ville de départ requise", variant: "destructive" }); return false; }
      return true;
    }
    if (s === 5) {
      if (!routierMinPrice || parseFloat(routierMinPrice) <= 0) { toast({ title: "Prix minimum requis", variant: "destructive" }); return false; }
      return true;
    }
    return true;
  };

  const handleAuth = async (): Promise<boolean> => {
    if (existingUser) return true;
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) setExistingUser({ id: data.user.id, email: data.user.email || "" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/routier/inscription`, data: { full_name: businessName } }
        });
        if (error) throw error;
        if (data.user) setExistingUser({ id: data.user.id, email: data.user.email || "" });
      }
      return true;
    } catch (error: any) {
      let msg = "Erreur";
      if (error.message?.includes("already registered")) { msg = "Email déjà utilisé"; setIsLogin(true); }
      else if (error.message?.includes("Invalid login")) msg = "Identifiants incorrects";
      toast({ title: msg, variant: "destructive" });
      return false;
    } finally { setLoading(false); }
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;
    if (step === 2 && !existingUser) {
      if (!(await handleAuth())) return;
    }
    if (step === TOTAL_STEPS) { await handleSubmit(); return; }
    if (step === 1 && existingUser) { setStep(3); return; }
    setStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step <= 1) navigate("/transporteur/inscription");
    else if (step === 3 && existingUser) setStep(1);
    else setStep(prev => prev - 1);
  };

  const addVehicle = () => {
    if (!currentVehicle.type || !currentVehicle.name) {
      toast({ title: "Type et nom requis", variant: "destructive" }); return;
    }
    setVehicles(prev => [...prev, { ...currentVehicle, id: `v-${Date.now()}` }]);
    setCurrentVehicle({ id: "", type: "", name: "", maxWeightKg: "", maxVolumeM3: "", hasInsurance: false, homeDelivery: false });
    setShowVehicleForm(false);
    toast({ title: "✅ Véhicule ajouté" });
  };

  const handleSubmit = async () => {
    if (!existingUser) return;
    setLoading(true);
    try {
      await supabase.from("profiles").update({
        phone, full_name: businessName, is_gp: true,
      }).eq("user_id", existingUser.id);

      const dbRoadType = roadType === "shuttle" ? "shuttle" : roadType === "mission" ? "mission" : "shuttle";

      const { data: gpProfile, error: gpError } = await supabase
        .from("gp_profiles")
        .insert({
          user_id: existingUser.id,
          business_name: businessName,
          gp_type: "routier" as any,
          road_type: dbRoadType as any,
          phone,
          whatsapp: sameAsPhone ? phone : whatsapp,
          whatsapp_phone: sameAsPhone ? phone : whatsapp,
          city: originCity || "Dakar",
          country_code: "SN",
          status: "verified" as any,
          default_currency: routierCurrency,
          base_price_per_kg: routierPricePerKg ? parseFloat(routierPricePerKg) : null,
          base_origin_city: originCity || null,
          base_destination_city: destinationCity || null,
          address: entityType === "entreprise" ? companyAddress : originAddress || null,
          deposit_address: destinationAddress || null,
          reception_address: homeDeliveryEnabled ? "home_delivery" : destinationAddress || null,
          zones_covered: [originCity, destinationCity].filter(Boolean),
          description: entityType === "entreprise" ? `Entreprise · RC: ${registrationNumber}` : null,
        })
        .select().single();

      if (gpError) throw gpError;

      for (const v of vehicles) {
        await supabase.from("vehicles").insert({
          gp_id: gpProfile.id,
          name: v.name,
          vehicle_type: v.type,
          transport_category: "routier",
          max_weight_kg: v.maxWeightKg ? parseFloat(v.maxWeightKg) : null,
          max_volume_m3: v.maxVolumeM3 ? parseFloat(v.maxVolumeM3) : null,
          specifications: { freight_types: freightTypes, has_insurance: v.hasInsurance, home_delivery: v.homeDelivery },
          is_active: true,
        });
      }

      if ((roadType === "shuttle" || roadType === "both") && originCity && destinationCity) {
        await supabase.from("gp_offers").insert({
          gp_id: gpProfile.id,
          origin_city: originCity, origin_country: "Sénégal",
          destination_city: destinationCity, destination_country: "Sénégal",
          departure_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
          total_capacity: vehicles[0]?.maxWeightKg ? parseFloat(vehicles[0].maxWeightKg) : 5000,
          available_capacity: vehicles[0]?.maxWeightKg ? parseFloat(vehicles[0].maxWeightKg) : 5000,
          price_per_kg: routierPricePerKg ? parseFloat(routierPricePerKg) : 500,
          currency: "XOF",
          transport_type: "routier" as any,
          status: "active" as any,
          description: `Navette ${originCity} → ${destinationCity}`,
        });
      }

      toast({ title: "🚛 Inscription réussie !" });
      navigate("/routier/apercu");
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (checkingSession) return <TransportPageLoader message="Vérification..." vehicle="truck" />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showNotifications={false} />
      <main className="pt-4 pb-24 px-4">
        <div className="max-w-lg mx-auto">
          {/* Corporate Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
              <Truck className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">Devenir Transporteur Routier</h1>
            <p className="text-xs text-muted-foreground mt-1">Rejoignez le réseau Konnekt · Navette · Fret · Livraison</p>
          </motion.div>

          {/* Progress */}
          <div className="mb-6">
            <Progress value={(step / TOTAL_STEPS) * 100} className="h-2 mb-3" />
            <div className="flex justify-between">
              {STEPS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.num} className={`flex flex-col items-center ${step >= s.num ? "text-primary" : "text-muted-foreground"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {step > s.num ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className="text-[10px]">{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

              {/* ─── Step 1: Profil Type ─── */}
              {step === 1 && (
                <div className="space-y-5">
                  {/* Entity Type Selection */}
                  <div className="space-y-3">
                    <h2 className="font-semibold text-lg text-center">Vous êtes...</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setEntityType("particulier")}
                        className={`p-4 rounded-2xl border-2 text-center transition-all ${entityType === "particulier" ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40"}`}>
                        <div className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center ${entityType === "particulier" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <UserCircle className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-sm">Particulier</h3>
                        <p className="text-[10px] text-muted-foreground mt-1">Chauffeur indépendant</p>
                      </button>
                      <button type="button" onClick={() => setEntityType("entreprise")}
                        className={`p-4 rounded-2xl border-2 text-center transition-all ${entityType === "entreprise" ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40"}`}>
                        <div className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center ${entityType === "entreprise" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <Building2 className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-sm">Entreprise</h3>
                        <p className="text-[10px] text-muted-foreground mt-1">Société de transport</p>
                      </button>
                    </div>
                  </div>

                  {/* Road Type Selection */}
                  <AnimatePresence>
                    {entityType && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <h2 className="font-semibold text-lg text-center">Mode de transport</h2>
                        <p className="text-xs text-muted-foreground text-center">Combinez les deux modes si vous le souhaitez</p>

                        <div className="space-y-3">
                          <button type="button" onClick={() => setRoadType(roadType === "shuttle" ? null : roadType === "both" ? "mission" : roadType === "mission" ? "both" : "shuttle")}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${roadType === "shuttle" || roadType === "both" ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/30"}`}>
                            <div className="flex items-start gap-3">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${roadType === "shuttle" || roadType === "both" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                <Route className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-sm">🚌 Navette</h3>
                                  {(roadType === "shuttle" || roadType === "both") && <CheckCircle className="w-4 h-4 text-primary" />}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Lignes fixes · Départs réguliers · Horaires définis</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {["Route publiée", "Capacité restante", "Prix/kg"].map(t => (
                                    <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </button>

                          <button type="button" onClick={() => setRoadType(roadType === "mission" ? null : roadType === "both" ? "shuttle" : roadType === "shuttle" ? "both" : "mission")}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${roadType === "mission" || roadType === "both" ? "border-accent bg-accent/5 shadow-md" : "border-border hover:border-accent/30"}`}>
                            <div className="flex items-start gap-3">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${roadType === "mission" || roadType === "both" ? "bg-accent text-accent-foreground" : "bg-muted"}`}>
                                <Package className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-sm">🚛 Mission</h3>
                                  {(roadType === "mission" || roadType === "both") && <CheckCircle className="w-4 h-4 text-accent" />}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">À la demande · Marketplace · Négociation prix</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {["Missions dynamiques", "Négociation", "Notifications"].map(t => (
                                    <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>

                        {roadType === "both" && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-center">
                            <p className="text-sm font-semibold text-primary">✅ Mode hybride</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Navette + Missions activés</p>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ─── Step 2: Identité ─── */}
              {step === 2 && (
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      {entityType === "entreprise" ? <Building2 className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />}
                      {entityType === "entreprise" ? "Informations de l'entreprise" : "Vos informations"}
                    </h2>

                    <Badge variant="outline" className="text-xs">
                      {entityType === "entreprise" ? "🏢 Entreprise" : "👤 Particulier"}
                    </Badge>

                    <div className="space-y-2">
                      <Label>{entityType === "entreprise" ? "Raison sociale *" : "Nom complet *"}</Label>
                      <Input value={businessName} onChange={e => setBusinessName(e.target.value)}
                        placeholder={entityType === "entreprise" ? "SARL Transport Express" : "Moussa Diallo"} />
                    </div>

                    {entityType === "entreprise" && (
                      <>
                        <div className="space-y-2">
                          <Label>N° Registre de Commerce (NINEA/RC) *</Label>
                          <Input value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)}
                            placeholder="RC-SN-DKR-2024-A-12345" />
                        </div>
                        <div className="space-y-2">
                          <Label>Adresse du siège</Label>
                          <Input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)}
                            placeholder="123 Rue des Transports, Dakar" />
                        </div>
                        <div className="space-y-2">
                          <Label>Personne de contact</Label>
                          <Input value={contactPerson} onChange={e => setContactPerson(e.target.value)}
                            placeholder="Responsable logistique" />
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label>Téléphone *</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+221 77 123 45 67" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={sameAsPhone} onCheckedChange={c => setSameAsPhone(c === true)} />
                        <Label className="font-normal text-sm">WhatsApp = téléphone</Label>
                      </div>
                      {!sameAsPhone && <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="WhatsApp" />}
                    </div>

                    {!existingUser && (
                      <>
                        <div className="space-y-2">
                          <Label>Email *</Label>
                          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
                        </div>
                        <div className="space-y-2">
                          <Label>Mot de passe *</Label>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
                          {isLogin ? "Créer un compte" : "Déjà inscrit ? Se connecter"}
                        </button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ─── Step 3: Véhicule ─── */}
              {step === 3 && (
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <Truck className="w-5 h-5 text-primary" />
                      {entityType === "entreprise" ? "Flotte de véhicules" : "Mon véhicule"}
                    </h2>
                    {entityType === "entreprise" && (
                      <p className="text-xs text-muted-foreground">Ajoutez tous les véhicules de votre flotte</p>
                    )}

                    {vehicles.length > 0 && (
                      <div className="space-y-2">
                        {vehicles.map(v => (
                          <div key={v.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <Truck className="w-4 h-4 text-primary" />
                              <div>
                                <p className="font-medium text-sm">{v.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {ROUTIER_VEHICLES.find(rv => rv.value === v.type)?.label || v.type}
                                  {v.maxWeightKg && ` · ${v.maxWeightKg} kg`}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setVehicles(prev => prev.filter(x => x.id !== v.id))} className="text-destructive">×</Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {showVehicleForm && (
                      <div className="space-y-3 border border-border rounded-lg p-4">
                        <div className="space-y-2">
                          <Label>Type de véhicule *</Label>
                          <Select value={currentVehicle.type} onValueChange={v => setCurrentVehicle(prev => ({ ...prev, type: v }))}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              {ROUTIER_VEHICLES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Nom / Immatriculation *</Label>
                          <Input value={currentVehicle.name} onChange={e => setCurrentVehicle(prev => ({ ...prev, name: e.target.value }))} placeholder="Camion 01 ou AA-123-SN" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Capacité max (kg)</Label>
                            <Input type="number" value={currentVehicle.maxWeightKg} onChange={e => setCurrentVehicle(prev => ({ ...prev, maxWeightKg: e.target.value }))} placeholder="5000" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Volume max (m³)</Label>
                            <Input type="number" value={currentVehicle.maxVolumeM3} onChange={e => setCurrentVehicle(prev => ({ ...prev, maxVolumeM3: e.target.value }))} placeholder="30" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <Label className="text-xs font-normal">Assurance incluse</Label>
                          <Switch checked={currentVehicle.hasInsurance} onCheckedChange={v => setCurrentVehicle(prev => ({ ...prev, hasInsurance: v }))} />
                        </div>
                        <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <div>
                            <Label className="text-xs font-normal">Livraison à domicile</Label>
                            <p className="text-[10px] text-muted-foreground">Le client peut demander la livraison chez lui</p>
                          </div>
                          <Switch checked={currentVehicle.homeDelivery} onCheckedChange={v => setCurrentVehicle(prev => ({ ...prev, homeDelivery: v }))} />
                        </div>
                        <Button onClick={addVehicle} className="w-full" size="sm">
                          <CheckCircle className="w-4 h-4 mr-2" /> Ajouter ce véhicule
                        </Button>
                      </div>
                    )}

                    {!showVehicleForm && (
                      <Button variant="outline" className="w-full" onClick={() => setShowVehicleForm(true)}>
                        + Ajouter un autre véhicule
                      </Button>
                    )}

                    <div className="space-y-2 pt-3 border-t">
                      <Label>Types de fret acceptés</Label>
                      <div className="flex flex-wrap gap-2">
                        {FREIGHT_TYPES.map(f => (
                          <button key={f.id} type="button"
                            onClick={() => setFreightTypes(prev => prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id])}
                            className={`px-3 py-1.5 text-xs rounded-full border-2 transition-all ${freightTypes.includes(f.id) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ─── Step 4: Trajet ─── */}
              {step === 4 && (
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      {roadType === "mission" ? "Zone d'opération" : "Définir votre trajet"}
                    </h2>

                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-primary" />
                          <Label className="text-sm font-semibold">Départ</Label>
                        </div>
                        <Select value={originCity} onValueChange={setOriginCity}>
                          <SelectTrigger><SelectValue placeholder="Ville de départ" /></SelectTrigger>
                          <SelectContent>{SENEGAL_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input value={originAddress} onChange={e => setOriginAddress(e.target.value)} placeholder="Adresse / Dépôt" className="mt-2" />
                      </div>

                      {roadType !== "mission" && (
                        <div className="p-3 rounded-xl bg-accent/5 border border-accent/20">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full bg-accent" />
                            <Label className="text-sm font-semibold">Arrivée</Label>
                          </div>
                          <Select value={destinationCity} onValueChange={setDestinationCity}>
                            <SelectTrigger><SelectValue placeholder="Ville d'arrivée" /></SelectTrigger>
                            <SelectContent>{SENEGAL_CITIES.filter(c => c !== originCity).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                          <Input value={destinationAddress} onChange={e => setDestinationAddress(e.target.value)} placeholder="Adresse hub / dépôt" className="mt-2" />
                        </div>
                      )}

                      <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium">Livraison à domicile</p>
                            <p className="text-[10px] text-muted-foreground">Le client renseigne son adresse finale</p>
                          </div>
                        </div>
                        <Switch checked={homeDeliveryEnabled} onCheckedChange={setHomeDeliveryEnabled} />
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-xl border space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Récapitulatif</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>{entityType === "entreprise" ? "🏢" : "👤"} {businessName}</p>
                        <p>📋 Mode: {roadType === "both" ? "Navette + Mission" : roadType === "shuttle" ? "Navette" : "Mission"}</p>
                        <p>🚛 {vehicles.length} véhicule{vehicles.length > 1 ? "s" : ""}</p>
                        {originCity && <p>📍 Départ: {originCity}</p>}
                        {destinationCity && roadType !== "mission" && <p>📍 Arrivée: {destinationCity}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ─── Step 5: Tarification ─── */}
              {step === 5 && (
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-primary/80 px-5 py-4 text-primary-foreground">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base">Tarification routière</h2>
                        <p className="text-primary-foreground/80 text-[11px]">Grille combinée : distance + poids + volume</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <Shield className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <Label className="font-semibold text-sm">Prix minimum par course *</Label>
                      </div>
                      <div className="relative">
                        <Input type="number" value={routierMinPrice} onChange={e => setRoutierMinPrice(e.target.value)} placeholder="15000" className="h-11 text-base font-medium" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">{routierCurrency}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-2"><Route className="w-4 h-4" /> Distance</p>
                      <div className="relative">
                        <Input type="number" value={routierPricePerKm} onChange={e => setRoutierPricePerKm(e.target.value)} placeholder="500" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{routierCurrency}/km</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                      <p className="text-sm font-semibold flex items-center gap-2"><Package className="w-4 h-4" /> Chargement</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Prix / kg</Label>
                          <div className="relative">
                            <Input type="number" value={routierPricePerKg} onChange={e => setRoutierPricePerKg(e.target.value)} placeholder="100" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{routierCurrency}/kg</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Prix / m³</Label>
                          <div className="relative">
                            <Input type="number" value={routierPricePerM3} onChange={e => setRoutierPricePerM3(e.target.value)} placeholder="5000" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{routierCurrency}/m³</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {routierMinPrice && (
                      <div className="p-4 rounded-xl bg-muted/50 border space-y-2.5">
                        <p className="text-xs font-bold">📊 Simulation tarifaire</p>
                        <div className="grid grid-cols-1 gap-1.5 text-xs">
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Course minimum</span>
                            <span className="font-bold">{parseInt(routierMinPrice || "0").toLocaleString()} {routierCurrency}</span>
                          </div>
                          {routierPricePerKm && (
                            <div className="flex justify-between py-1 border-b border-border/50">
                              <span className="text-muted-foreground">70 km (Dakar → Thiès)</span>
                              <span className="font-bold">{Math.max(parseInt(routierMinPrice || "0"), parseInt(routierPricePerKm) * 70).toLocaleString()} {routierCurrency}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                      <p className="text-xs text-foreground">
                        <strong>💡</strong> Prix = max(minimum, km × prix/km + kg × prix/kg + m³ × prix/m³)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Footer */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t safe-area-bottom">
            <div className="max-w-lg mx-auto flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" /> Retour
              </Button>
              <Button onClick={handleNext} className="flex-1" disabled={loading || (step === 1 && (!roadType || !entityType))}>
                {loading ? "..." : step === TOTAL_STEPS ? (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Valider</>
                ) : (
                  <>Suivant <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
