import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Truck, ArrowRight, ArrowLeft, User, MapPin,
  Eye, EyeOff, Building2, CheckCircle, Shield, Package
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

// ─── Routier-specific vehicle types ───
const ROUTIER_VEHICLES = [
  { value: "moto_cargo", label: "🏍️ Moto cargo" },
  { value: "tricycle", label: "🛺 Tricycle / Jakarta" },
  { value: "pickup", label: "🚙 Pick-up" },
  { value: "fourgonnette", label: "🚐 Fourgonnette" },
  { value: "fourgon", label: "🚐 Fourgon" },
  { value: "camion_3t", label: "🚛 Camion (< 3.5t)" },
  { value: "camion_10t", label: "🚛 Camion (3.5 – 10t)" },
  { value: "camion_benne", label: "🚛 Camion benne" },
  { value: "semi_remorque", label: "🚛 Semi-remorque" },
  { value: "plateau", label: "🚛 Plateau / Porte-char" },
  { value: "citerne", label: "🛢️ Citerne" },
  { value: "frigorifique", label: "❄️ Frigorifique" },
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

const PROTECTION_TYPES = [
  { id: "ouvert", label: "Ouvert" },
  { id: "bache", label: "Bâché" },
  { id: "couvert", label: "Fermé" },
  { id: "frigorifique", label: "Frigo" },
];

const SENEGAL_REGIONS = [
  "Dakar", "Thiès", "Diourbel", "Fatick", "Kaolack", "Kaffrine",
  "Saint-Louis", "Louga", "Matam", "Tambacounda", "Kédougou",
  "Kolda", "Sédhiou", "Ziguinchor"
];

interface VehicleData {
  id: string;
  type: string;
  name: string;
  maxWeight: string;
  maxVolume: string;
  protection: string;
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

  // Step 1: Identité
  const [transporterType, setTransporterType] = useState<"independant" | "entreprise">("independant");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: Véhicules & Fret
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(true);
  const [currentVehicle, setCurrentVehicle] = useState<VehicleData>({
    id: "", type: "", name: "", maxWeight: "", maxVolume: "", protection: "",
  });
  const [freightTypes, setFreightTypes] = useState<string[]>([]);

  // Step 3: Zones
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [acceptInternational, setAcceptInternational] = useState(false);

  // Check existing session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: gpProfile } = await supabase
          .from("gp_profiles")
          .select("id, gp_type")
          .eq("user_id", user.id)
          .maybeSingle();

        if (gpProfile?.gp_type === "routier") {
          navigate("/routier/demandes", { replace: true });
          return;
        }

        setExistingUser({ id: user.id, email: user.email || "" });
        setEmail(user.email || "");

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", user.id)
          .maybeSingle();

        setBusinessName(profile?.full_name || "");
        setPhone(profile?.phone || "");
        setStep(2);
      }
      setCheckingSession(false);
    };
    checkSession();
  }, [navigate]);

  const STEPS = [
    { num: 1, label: "Identité", icon: User },
    { num: 2, label: "Véhicules", icon: Truck },
    { num: 3, label: "Zones", icon: MapPin },
  ];
  const TOTAL_STEPS = 3;

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (existingUser) return true;
      if (!businessName) { toast({ title: "Nom requis", variant: "destructive" }); return false; }
      if (!phone) { toast({ title: "Téléphone requis", variant: "destructive" }); return false; }
      if (!email) { toast({ title: "Email requis", variant: "destructive" }); return false; }
      if (!isLogin && (!password || password.length < 6)) { toast({ title: "Mot de passe 6+ caractères", variant: "destructive" }); return false; }
      return true;
    }
    if (s === 2) {
      if (vehicles.length === 0) { toast({ title: "Ajoutez au moins un véhicule", variant: "destructive" }); return false; }
      return true;
    }
    if (s === 3) {
      if (selectedZones.length === 0) { toast({ title: "Sélectionnez au moins une zone", variant: "destructive" }); return false; }
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
    if (step === 1 && !existingUser) {
      if (!(await handleAuth())) return;
    }
    if (step === TOTAL_STEPS) {
      await handleSubmit();
      return;
    }
    setStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step <= 1 || (step === 2 && existingUser)) {
      navigate("/transporteur/inscription");
    } else {
      setStep(prev => prev - 1);
    }
  };

  const addVehicle = () => {
    if (!currentVehicle.type || !currentVehicle.name) {
      toast({ title: "Type et nom requis", variant: "destructive" });
      return;
    }
    setVehicles(prev => [...prev, { ...currentVehicle, id: `v-${Date.now()}` }]);
    setCurrentVehicle({ id: "", type: "", name: "", maxWeight: "", maxVolume: "", protection: "" });
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

      const { data: gpProfile, error: gpError } = await supabase
        .from("gp_profiles")
        .insert({
          user_id: existingUser.id,
          business_name: businessName,
          gp_type: "routier",
          road_type: "mission",
          phone,
          whatsapp: sameAsPhone ? phone : whatsapp,
          whatsapp_phone: sameAsPhone ? phone : whatsapp,
          city: selectedZones[0] || "Dakar",
          country_code: "SN",
          status: "verified",
          default_currency: "XOF",
          zones_covered: selectedZones,
          international_destinations: acceptInternational ? ["ML", "GN", "CI", "GM", "MR"] : [],
        })
        .select().single();

      if (gpError) throw gpError;

      // Insert vehicles
      for (const v of vehicles) {
        await supabase.from("vehicles").insert({
          gp_id: gpProfile.id,
          name: v.name,
          vehicle_type: v.type,
          transport_category: "routier",
          max_weight_kg: v.maxWeight ? parseFloat(v.maxWeight) * 1000 : null,
          max_volume_m3: v.maxVolume ? parseFloat(v.maxVolume) : null,
          specifications: { protection: v.protection, freight_types: freightTypes },
          is_active: true,
        });
      }

      toast({ title: "🚛 Inscription réussie !", description: "Votre compte routier est actif." });
      navigate("/routier/demandes");
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
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <Badge variant="secondary" className="mb-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Transport Routier
            </Badge>
            <h1 className="text-xl font-bold">Inscription Routier</h1>
            <p className="text-xs text-muted-foreground mt-1">Fret · Livraison · Déménagement</p>
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

          {/* Steps */}
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

              {/* ─── Step 1: Identité ─── */}
              {step === 1 && (
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" /> Identité
                    </h2>

                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { id: "independant", label: "Indépendant", icon: User },
                        { id: "entreprise", label: "Entreprise", icon: Building2 },
                      ] as const).map((t) => {
                        const TIcon = t.icon;
                        return (
                          <button key={t.id} type="button" onClick={() => setTransporterType(t.id)}
                            className={`p-3 rounded-xl border-2 transition-all text-center ${transporterType === t.id ? "border-primary bg-primary/5" : "border-border"}`}>
                            <TIcon className={`w-5 h-5 mx-auto mb-1 ${transporterType === t.id ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="text-sm font-medium">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <Label>{transporterType === "entreprise" ? "Raison sociale" : "Nom complet"}</Label>
                      <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder={transporterType === "entreprise" ? "Ma Société SARL" : "Moussa Diallo"} />
                    </div>

                    <div className="space-y-2">
                      <Label>Téléphone</Label>
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
                          <Label>Email</Label>
                          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
                        </div>
                        <div className="space-y-2">
                          <Label>Mot de passe</Label>
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

              {/* ─── Step 2: Véhicules & Fret ─── */}
              {step === 2 && (
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <Truck className="w-5 h-5 text-primary" /> Mes véhicules
                    </h2>

                    {/* Added vehicles */}
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
                                  {v.maxWeight && ` · ${v.maxWeight}t`}
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
                            <Label className="text-xs">Capacité (tonnes)</Label>
                            <Input type="number" value={currentVehicle.maxWeight} onChange={e => setCurrentVehicle(prev => ({ ...prev, maxWeight: e.target.value }))} placeholder="10" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Volume (m³)</Label>
                            <Input type="number" value={currentVehicle.maxVolume} onChange={e => setCurrentVehicle(prev => ({ ...prev, maxVolume: e.target.value }))} placeholder="30" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Protection</Label>
                          <div className="grid grid-cols-4 gap-2">
                            {PROTECTION_TYPES.map(p => (
                              <button key={p.id} type="button" onClick={() => setCurrentVehicle(prev => ({ ...prev, protection: p.id }))}
                                className={`p-2 text-xs rounded-lg border-2 transition-all ${currentVehicle.protection === p.id ? "border-primary bg-primary/5 font-medium" : "border-border"}`}>
                                {p.label}
                              </button>
                            ))}
                          </div>
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

                    {/* Freight types */}
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

              {/* ─── Step 3: Zones de couverture ─── */}
              {step === 3 && (
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" /> Zones de couverture
                    </h2>

                    <p className="text-xs text-muted-foreground">
                      Sélectionnez les régions où vous opérez. Vous recevrez uniquement les missions dans ces zones.
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {SENEGAL_REGIONS.map(zone => (
                        <button key={zone} type="button"
                          onClick={() => setSelectedZones(prev => prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone])}
                          className={`px-3 py-2 text-sm rounded-full border-2 transition-all ${selectedZones.includes(zone) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/50"}`}>
                          {zone}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Checkbox checked={acceptInternational} onCheckedChange={c => setAcceptInternational(c === true)} />
                      <div>
                        <p className="text-sm font-medium">International</p>
                        <p className="text-xs text-muted-foreground">Mali, Guinée, Côte d'Ivoire, Gambie, Mauritanie</p>
                      </div>
                    </div>

                    {/* Recap */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Récapitulatif</span>
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <p>👤 {businessName}</p>
                        <p>🚛 {vehicles.length} véhicule{vehicles.length > 1 ? "s" : ""}</p>
                        <p>📍 {selectedZones.length} zone{selectedZones.length > 1 ? "s" : ""} : {selectedZones.join(", ") || "—"}</p>
                        {freightTypes.length > 0 && <p>📦 {freightTypes.length} types de fret</p>}
                        <p>💰 Tarification automatique par le système</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t safe-area-bottom">
            <div className="max-w-lg mx-auto flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" /> Retour
              </Button>
              <Button onClick={handleNext} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={loading}>
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
