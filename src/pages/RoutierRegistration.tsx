/**
 * RoutierRegistration — Inscription transporteur routier
 * Style GP Bagages : header sticky + barres d'étapes + footer fixe
 * Flow: Pays/Ville/Téléphone → Entité → Véhicule → Tarifs
 */
import { useState, useEffect } from "react";
import { getEntryFlowData } from "@/lib/entryFlowData";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Truck, ArrowRight, ArrowLeft, MapPin,
  Eye, EyeOff, Building2, CheckCircle, Shield, Package,
  Route, Home, UserCircle, Lock, Mail, User, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

const COUNTRIES = [
  { code: "SN", name: "🇸🇳 Sénégal", dialCode: "+221" },
  { code: "CI", name: "🇨🇮 Côte d'Ivoire", dialCode: "+225" },
  { code: "ML", name: "🇲🇱 Mali", dialCode: "+223" },
  { code: "BF", name: "🇧🇫 Burkina Faso", dialCode: "+226" },
  { code: "GN", name: "🇬🇳 Guinée", dialCode: "+224" },
];

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  SN: ["Dakar", "Thiès", "Saint-Louis", "Kaolack", "Touba", "Ziguinchor", "Tambacounda", "Kolda", "Matam", "Louga", "Fatick", "Kédougou", "Sédhiou", "Kaffrine", "Diourbel", "Mbour", "Rufisque", "Richard-Toll"],
  CI: ["Abidjan", "Yamoussoukro", "Bouaké", "San-Pédro", "Daloa", "Korhogo", "Man"],
  ML: ["Bamako", "Sikasso", "Ségou", "Mopti", "Koulikoro", "Kayes", "Gao"],
  BF: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora", "Ouahigouya"],
  GN: ["Conakry", "Kankan", "Kindia", "Labé", "Nzérékoré"],
};

const ROUTIER_VEHICLES = [
  { value: "moto", label: "Moto", category: "light" },
  { value: "tricycle", label: "Tricycle / Jakarta", category: "light" },
  { value: "pickup", label: "🚙 Pick-up", category: "light" },
  { value: "fourgonnette", label: "🚐 Fourgonnette", category: "medium" },
  { value: "fourgon", label: "Fourgon", category: "medium" },
  { value: "camionnette", label: "Camionnette", category: "medium" },
  { value: "camion_3t", label: "Camion 3T", category: "heavy" },
  { value: "camion_10t", label: "Camion 10T", category: "heavy" },
  { value: "camion_benne", label: "Camion benne", category: "heavy" },
  { value: "semi_remorque", label: "Semi-remorque", category: "heavy" },
  { value: "plateau", label: "Plateau", category: "heavy" },
  { value: "porte_conteneur", label: "Porte-conteneur", category: "heavy" },
  { value: "citerne", label: "🛢️ Citerne", category: "heavy" },
  { value: "frigorifique", label: "❄️ Frigorifique", category: "heavy" },
];

const FREIGHT_TYPES = [
  { id: "colis", label: "Colis & Cartons" },
  { id: "mobilier", label: "🪑 Mobilier & Meubles" },
  { id: "materiaux", label: "🧱 Matériaux BTP" },
  { id: "machines", label: "Machines & Équipements" },
  { id: "vehicules", label: "Véhicules" },
  { id: "vrac", label: "🪨 Vrac (sable, gravier)" },
  { id: "denrees", label: "Denrées périssables" },
  { id: "conteneurs", label: "Conteneurs" },
];

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
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneUnique, setPhoneUnique] = useState<boolean | null>(null);

  // Entry flow data
  const entryFlow = getEntryFlowData();

  // Step 1: Country, City, Phone
  const [country, setCountry] = useState(entryFlow.countryCode || "SN");
  const [city, setCity] = useState(entryFlow.city || "");
  const [phone, setPhone] = useState(entryFlow.phone || "");

  // Step 2: Entity + Auth
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");

  // Step 3: Véhicules
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(true);
  const [currentVehicle, setCurrentVehicle] = useState<VehicleData>({
    id: "", type: "", name: "", maxWeightKg: "", maxVolumeM3: "", hasInsurance: false, homeDelivery: false,
  });
  const [freightTypes, setFreightTypes] = useState<string[]>([]);

  const TOTAL_STEPS = 3;
  const steps = [
    { num: 1, label: "Coordonnées" },
    { num: 2, label: "Profil" },
    { num: 3, label: "Véhicule" },
  ];

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
        if (profile?.full_name) setBusinessName(profile.full_name);
        if (profile?.phone) setPhone(profile.phone);
      }
      setCheckingSession(false);
    };
    checkSession();
  }, [navigate]);

  // Phone uniqueness check
  const checkPhoneUniqueness = async (phoneVal: string) => {
    if (!phoneVal || phoneVal.length < 8) { setPhoneUnique(null); return; }
    setPhoneChecking(true);
    const cleanPhone = phoneVal.replace(/\s+/g, "");
    const { data } = await supabase.from("profiles").select("user_id").eq("phone", cleanPhone).maybeSingle();
    const { data: gpData } = await supabase.from("gp_profiles").select("id").eq("phone", cleanPhone).maybeSingle();
    setPhoneUnique(!data && !gpData);
    setPhoneChecking(false);
  };

  useEffect(() => {
    const t = setTimeout(() => checkPhoneUniqueness(phone), 600);
    return () => clearTimeout(t);
  }, [phone]);

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!country) { toast({ title: "Sélectionnez un pays", variant: "destructive" }); return false; }
      if (!city) { toast({ title: "Sélectionnez une ville", variant: "destructive" }); return false; }
      if (!phone || phone.length < 8) { toast({ title: "Téléphone invalide", variant: "destructive" }); return false; }
      if (phoneUnique === false) { toast({ title: "Ce numéro est déjà utilisé", variant: "destructive" }); return false; }
      return true;
    }
    if (s === 2) {
      if (!entityType) { toast({ title: "Choisissez votre type", variant: "destructive" }); return false; }
      if (!businessName) { toast({ title: "Nom requis", variant: "destructive" }); return false; }
      if (!existingUser) {
        if (!email) { toast({ title: "Email requis", variant: "destructive" }); return false; }
        if (!password || password.length < 8) { toast({ title: "Mot de passe min. 8 caractères", variant: "destructive" }); return false; }
        if (!/\d/.test(password)) { toast({ title: "Le mot de passe doit contenir un chiffre", variant: "destructive" }); return false; }
        if (!/[^a-zA-Z0-9]/.test(password)) { toast({ title: "Caractère spécial requis", variant: "destructive" }); return false; }
      }
      if (entityType === "entreprise" && !registrationNumber) { toast({ title: "N° registre commerce requis", variant: "destructive" }); return false; }
      return true;
    }
    if (s === 3) {
      if (vehicles.length === 0) { toast({ title: "Ajoutez au moins un véhicule", variant: "destructive" }); return false; }
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
    setStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step <= 1) navigate("/transporteur/inscription");
    else setStep(prev => prev - 1);
  };

  const addVehicle = () => {
    if (!currentVehicle.type || !currentVehicle.name) {
      toast({ title: "Type et nom requis", variant: "destructive" }); return;
    }
    setVehicles(prev => [...prev, { ...currentVehicle, id: `v-${Date.now()}` }]);
    setCurrentVehicle({ id: "", type: "", name: "", maxWeightKg: "", maxVolumeM3: "", hasInsurance: false, homeDelivery: false });
    setShowVehicleForm(false);
    toast({ title: "Véhicule ajouté" });
  };

  const handleSubmit = async () => {
    if (!existingUser) return;
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\s+/g, "");
      await supabase.from("profiles").update({
        phone: cleanPhone, full_name: businessName, is_gp: true, country_code: country, city,
      }).eq("user_id", existingUser.id);

      const { data: gpProfile, error: gpError } = await supabase
        .from("gp_profiles")
        .insert({
          user_id: existingUser.id,
          business_name: businessName,
          gp_type: "routier" as any,
          road_type: "shuttle" as any,
          phone: cleanPhone,
          whatsapp: sameAsPhone ? cleanPhone : whatsapp,
          whatsapp_phone: sameAsPhone ? cleanPhone : whatsapp,
          city: city || "Dakar",
          country_code: country,
          status: "verified" as any,
          default_currency: "XOF",
          base_origin_city: city || null,
          address: entityType === "entreprise" ? companyAddress : null,
          zones_covered: [city].filter(Boolean),
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

      toast({ title: "Inscription réussie !" });
      navigate("/routier/apercu");
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (checkingSession) return <TransportPageLoader message="Vérification..." vehicle="truck" />;

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const cities = CITIES_BY_COUNTRY[country] || [];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* ── HEADER GP STYLE ── */}
      <header 
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border flex-shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center gap-3 px-4 h-12">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Transporteur Routier</p>
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
          {/* ─── Step 1: Pays, Ville, Téléphone ─── */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <div className="text-center mb-2">
                <div className="w-10 h-10 mx-auto bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center mb-2">
                  <Truck className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-lg font-bold">Devenir Transporteur Routier</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Rejoignez le réseau Konnekt</p>
              </div>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Vos coordonnées
                  </h2>

                  {/* Country */}
                  <div className="space-y-1">
                    <Label className="text-xs">Pays *</Label>
                    {entryFlow.hasCity ? (
                      <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                        {selectedCountry?.name || country}
                        <span className="ml-auto text-[10px] text-primary">✓ Déjà renseigné</span>
                      </div>
                    ) : (
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* City */}
                  <div className="space-y-1">
                    <Label className="text-xs">Ville *</Label>
                    {entryFlow.hasCity ? (
                      <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                        {city}
                        <span className="ml-auto text-[10px] text-primary">✓ Déjà renseigné</span>
                      </div>
                    ) : (
                      <Select value={city} onValueChange={setCity}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner votre ville" /></SelectTrigger>
                        <SelectContent>
                          {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <Label className="text-xs">Téléphone *</Label>
                    {entryFlow.hasPhone ? (
                      <>
                        <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                          {phone}
                          <span className="ml-auto text-[10px] text-primary">✓ Déjà renseigné</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Ce numéro a été vérifié lors de votre inscription</p>
                      </>
                    ) : (
                      <>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">{selectedCountry?.dialCode}</span>
                          <Input 
                            value={phone} 
                            onChange={e => setPhone(e.target.value)} 
                            placeholder="77 123 45 67" 
                            className="pl-14 h-10" 
                          />
                          {phoneChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                          {!phoneChecking && phoneUnique === true && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                        </div>
                        {phoneUnique === false && (
                          <p className="text-[11px] text-destructive flex items-center gap-1">
                            Ce numéro est déjà associé à un compte
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── Step 2: Entité + Auth ─── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              {/* Entity selection */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setEntityType("particulier")}
                  className={`p-3 rounded-2xl border-2 text-center transition-all ${entityType === "particulier" ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40"}`}>
                  <div className={`w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center ${entityType === "particulier" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <UserCircle className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-xs">Particulier</h3>
                  <p className="text-[10px] text-muted-foreground">Indépendant</p>
                </button>
                <button type="button" onClick={() => setEntityType("entreprise")}
                  className={`p-3 rounded-2xl border-2 text-center transition-all ${entityType === "entreprise" ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40"}`}>
                  <div className={`w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center ${entityType === "entreprise" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-xs">Entreprise</h3>
                  <p className="text-[10px] text-muted-foreground">Société de transport</p>
                </button>
              </div>

              <AnimatePresence>
                {entityType && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                          {entityType === "entreprise" ? <Building2 className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-primary" />}
                          {entityType === "entreprise" ? "Infos entreprise" : "Vos informations"}
                        </h2>

                        <div className="space-y-1">
                          <Label className="text-xs">{entityType === "entreprise" ? "Raison sociale *" : "Nom complet *"}</Label>
                          <Input value={businessName} onChange={e => setBusinessName(e.target.value)} className="h-10"
                            placeholder={entityType === "entreprise" ? "SARL Transport Express" : "Moussa Diallo"} />
                        </div>

                        {entityType === "entreprise" && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">N° Registre de Commerce (NINEA/RC) *</Label>
                              <Input value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} className="h-10" placeholder="RC-SN-DKR-2024-A-12345" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Adresse du siège</Label>
                              <Input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} className="h-10" placeholder="123 Rue des Transports" />
                            </div>
                          </>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Checkbox checked={sameAsPhone} onCheckedChange={c => setSameAsPhone(c === true)} />
                            <Label className="font-normal text-xs">WhatsApp = téléphone</Label>
                          </div>
                          {!sameAsPhone && <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="h-10" placeholder="WhatsApp" />}
                        </div>

                        {existingUser ? (
                          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-700 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Connecté: {existingUser.email}
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">Email *</Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-10" placeholder="votre@email.com" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Mot de passe *</Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 h-10" placeholder="••••••••" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                            {!isLogin && password.length > 0 && (
                              <div className="flex flex-wrap gap-2 px-1">
                                <PasswordRule ok={password.length >= 8} label="8+ car." />
                                <PasswordRule ok={/\d/.test(password)} label="1 chiffre" />
                                <PasswordRule ok={/[^a-zA-Z0-9]/.test(password)} label="1 spécial" />
                              </div>
                            )}
                            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-xs text-primary hover:underline w-full text-center mt-1">
                              {isLogin ? "Pas de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
                            </button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ─── Step 3: Véhicules ─── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    {entityType === "entreprise" ? "Flotte de véhicules" : "Mon véhicule"}
                  </h2>

                  {vehicles.length > 0 && (
                    <div className="space-y-2">
                      {vehicles.map(v => (
                        <div key={v.id} className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-primary" />
                            <div>
                              <p className="font-medium text-xs">{v.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {ROUTIER_VEHICLES.find(rv => rv.value === v.type)?.label || v.type}
                                {v.maxWeightKg && ` · ${v.maxWeightKg} kg`}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setVehicles(prev => prev.filter(x => x.id !== v.id))} className="text-destructive h-7 px-2 text-xs">×</Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showVehicleForm && (
                    <div className="space-y-2.5 border border-border rounded-lg p-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Type de véhicule *</Label>
                        <Select value={currentVehicle.type} onValueChange={v => setCurrentVehicle(prev => ({ ...prev, type: v }))}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            {ROUTIER_VEHICLES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nom / Immatriculation *</Label>
                        <Input value={currentVehicle.name} onChange={e => setCurrentVehicle(prev => ({ ...prev, name: e.target.value }))} className="h-10" placeholder="Camion 01 ou AA-123-SN" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Capacité max (kg)</Label>
                          <Input type="number" value={currentVehicle.maxWeightKg} onChange={e => setCurrentVehicle(prev => ({ ...prev, maxWeightKg: e.target.value }))} className="h-9" placeholder="5000" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Volume max (m³)</Label>
                          <Input type="number" value={currentVehicle.maxVolumeM3} onChange={e => setCurrentVehicle(prev => ({ ...prev, maxVolumeM3: e.target.value }))} className="h-9" placeholder="30" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <Label className="text-[10px] font-normal">Assurance incluse</Label>
                        <Switch checked={currentVehicle.hasInsurance} onCheckedChange={v => setCurrentVehicle(prev => ({ ...prev, hasInsurance: v }))} />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <Label className="text-[10px] font-normal">Livraison à domicile</Label>
                        <Switch checked={currentVehicle.homeDelivery} onCheckedChange={v => setCurrentVehicle(prev => ({ ...prev, homeDelivery: v }))} />
                      </div>
                      <Button onClick={addVehicle} className="w-full h-9 text-xs" size="sm">
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Ajouter
                      </Button>
                    </div>
                  )}

                  {!showVehicleForm && (
                    <Button variant="outline" className="w-full h-9 text-xs" onClick={() => setShowVehicleForm(true)}>
                      + Ajouter un véhicule
                    </Button>
                  )}

                  <div className="space-y-1.5 pt-2 border-t">
                    <Label className="text-xs">Types de fret acceptés</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {FREIGHT_TYPES.map(f => (
                        <button key={f.id} type="button"
                          onClick={() => setFreightTypes(prev => prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id])}
                          className={`px-2.5 py-1 text-[10px] rounded-full border-2 transition-all ${freightTypes.includes(f.id) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}


        </AnimatePresence>
      </main>

      {/* ── FIXED CTA FOOTER ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
        <div className="max-w-lg mx-auto">
          <Button onClick={handleNext} disabled={loading || (step === 1 && phoneUnique === false)} className="w-full h-12 gap-2 text-sm font-semibold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : step === TOTAL_STEPS ? (
              <><CheckCircle className="w-4 h-4" /> Valider l'inscription</>
            ) : (
              <>Continuer <ArrowRight className="w-4 h-4" /></>
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
