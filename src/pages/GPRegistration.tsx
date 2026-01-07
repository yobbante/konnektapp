import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, ArrowLeft, User, Building, FileCheck, MapPin, 
  CheckCircle, Phone, Mail, Lock, Eye, EyeOff, AlertCircle,
  Truck, Ship, Plane, Zap, Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ZoneCoverageManager, CoverageZone } from "@/components/gp/ZoneCoverageManager";
import { transportTypes, TransportType, transportConfig } from "@/lib/transportTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const idTypes = [
  { value: "cni", label: "Carte Nationale d'Identité" },
  { value: "passport", label: "Passeport" },
  { value: "permis", label: "Permis de conduire" },
  { value: "carte_sejour", label: "Carte de séjour" },
];

// Services spécifiques aux agences de voyage
const agencyServices = [
  { value: "billetterie", label: "Billetterie aérienne/maritime" },
  { value: "fret_accompagne", label: "Fret accompagné" },
  { value: "groupage", label: "Groupage passagers/colis" },
  { value: "reservation", label: "Réservations voyages" },
  { value: "visa", label: "Services visa" },
  { value: "assurance_voyage", label: "Assurance voyage" },
];

// Services Express
const expressServices = [
  { value: "coursier", label: "Service coursier" },
  { value: "livraison_express", label: "Livraison express" },
  { value: "b2b", label: "Livraisons B2B" },
  { value: "b2c", label: "Livraisons B2C" },
  { value: "same_day", label: "Livraison même jour" },
];

export default function GPRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [idTypeSheetOpen, setIdTypeSheetOpen] = useState(false);
  const [existingUser, setExistingUser] = useState<{
    email: string;
    fullName: string;
    phone: string;
  } | null>(null);
  
  // Étape 1: Type d'activité (OBLIGATOIRE EN PREMIER)
  const [activityType, setActivityType] = useState<TransportType | null>(null);
  
  // Form data
  const [accountData, setAccountData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
  });
  
  const [businessData, setBusinessData] = useState({
    businessName: "",
    city: "",
    countryCode: "SN",
    address: "",
    whatsapp: "",
    yearsExperience: "",
    fleetSize: "",
    description: "",
    // Services spécifiques
    selectedServices: [] as string[],
  });
  
  const [kycData, setKycData] = useState({
    idType: "cni",
    idNumber: "",
    idDocumentUrl: "",
    businessRegistrationUrl: "",
    transportLicenseUrl: "",
    insuranceDocumentUrl: "",
  });
  
  const [coverageZones, setCoverageZones] = useState<CoverageZone[]>([]);

  // Charger les données du profil existant si connecté
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
            email: user.email || "",
            fullName: profile.full_name || "",
            phone: profile.phone || "",
          });
          
          setAccountData(prev => ({
            ...prev,
            email: user.email || "",
            fullName: profile.full_name || "",
            phone: profile.phone || "",
          }));

          if (profile.city) {
            setBusinessData(prev => ({
              ...prev,
              city: profile.city || "",
            }));
          }
        }
      }
    };

    loadExistingProfile();
  }, []);

  // Étapes dynamiques selon l'activité
  const getSteps = () => {
    const baseSteps = [
      { num: 1, label: "Activité", icon: Building },
      { num: 2, label: "Compte", icon: User },
      { num: 3, label: "Entreprise", icon: Building },
      { num: 4, label: "Documents", icon: FileCheck },
      { num: 5, label: "Zones", icon: MapPin },
      { num: 6, label: "Confirmation", icon: CheckCircle },
    ];
    return baseSteps;
  };

  const steps = getSteps();
  const totalSteps = steps.length;

  const handleNext = () => setStep((prev) => Math.min(prev + 1, totalSteps));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!activityType) {
          toast({ title: "Erreur", description: "Veuillez sélectionner votre activité", variant: "destructive" });
          return false;
        }
        return true;
      case 2:
        if (!accountData.email || !accountData.fullName || !accountData.phone) {
          toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
          return false;
        }
        if (!existingUser) {
          if (!accountData.password) {
            toast({ title: "Erreur", description: "Veuillez entrer un mot de passe", variant: "destructive" });
            return false;
          }
          if (accountData.password !== accountData.confirmPassword) {
            toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
            return false;
          }
          if (accountData.password.length < 6) {
            toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères", variant: "destructive" });
            return false;
          }
        }
        return true;
      case 3:
        if (!businessData.businessName || !businessData.city) {
          toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
          return false;
        }
        return true;
      case 4:
        return true;
      case 5:
        if (coverageZones.length === 0) {
          toast({ title: "Erreur", description: "Veuillez ajouter au moins une zone de couverture", variant: "destructive" });
          return false;
        }
        const hasValidZone = coverageZones.some(z => 
          z.country && (z.city || (z.cities && z.cities.length > 0))
        );
        if (!hasValidZone) {
          toast({ title: "Erreur", description: "Veuillez compléter au moins une zone avec un pays et une ville", variant: "destructive" });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNextWithValidation = () => {
    if (validateStep(step)) {
      handleNext();
    }
  };

  const toggleService = (service: string) => {
    setBusinessData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(service)
        ? prev.selectedServices.filter(s => s !== service)
        : [...prev.selectedServices, service]
    }));
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    
    setLoading(true);
    try {
      let userId: string;

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        userId = currentUser.id;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: accountData.email,
          password: accountData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: accountData.fullName,
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Erreur lors de la création du compte");
        userId = authData.user.id;
      }

      // Mettre à jour le profil
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          phone: accountData.phone,
          full_name: accountData.fullName,
          is_gp: true,
          city: businessData.city,
        })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Créer le profil GP
      const { error: gpError } = await supabase
        .from("gp_profiles")
        .insert({
          user_id: userId,
          business_name: businessData.businessName,
          gp_type: activityType,
          phone: accountData.phone,
          whatsapp: businessData.whatsapp || null,
          address: businessData.address || null,
          city: businessData.city,
          country_code: businessData.countryCode,
          id_type: kycData.idType,
          id_number: kycData.idNumber,
          id_document_url: kycData.idDocumentUrl,
          business_registration_url: kycData.businessRegistrationUrl || null,
          transport_license_url: kycData.transportLicenseUrl || null,
          insurance_document_url: kycData.insuranceDocumentUrl || null,
          years_experience: parseInt(businessData.yearsExperience) || 0,
          fleet_size: parseInt(businessData.fleetSize) || 1,
          description: businessData.description || null,
          zones_covered: coverageZones
            .filter(z => z.country && (z.city || (z.cities && z.cities.length > 0)))
            .map(z => z.city || z.cities?.join(", ") || z.country)
            .filter(Boolean),
          international_destinations: coverageZones
            .filter(z => z.country && !["SN", "CI", "ML", "BF", "GN", "CM", "TG", "BJ", "GH", "NG"].includes(z.country))
            .map(z => z.country),
        });

      if (gpError) throw gpError;

      toast({
        title: "Inscription réussie !",
        description: "Votre demande est en cours de validation. Vous serez notifié par email.",
      });

      navigate("/gp/dashboard");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'inscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Documents requis selon l'activité
  const getRequiredDocs = () => {
    if (!activityType) return [];
    return transportConfig[activityType]?.requiredDocs || [];
  };

  const requiredDocs = getRequiredDocs();

  // Services selon l'activité
  const getAvailableServices = () => {
    if (activityType === "agence") return agencyServices;
    if (activityType === "express") return expressServices;
    return [];
  };

  const getActivityIcon = (type: TransportType) => {
    switch (type) {
      case "routier": return Truck;
      case "maritime": return Ship;
      case "aerien": return Plane;
      case "express": return Zap;
      case "agence": return Building2;
      default: return Truck;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-20 px-4 md:px-0">
        <div className="container max-w-4xl">
          {/* Header - Compact on mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6 md:mb-10"
          >
            <Badge variant="gold" className="mb-3">Devenir Transporteur</Badge>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">
              Rejoignez Yobbanté Connect
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Accédez à des demandes qualifiées
            </p>
            {existingUser && (
              <div className="mt-3 p-2 bg-success/10 border border-success/20 rounded-lg inline-block">
                <p className="text-xs text-success">
                  ✓ Connecté: {existingUser.fullName || existingUser.email}
                </p>
              </div>
            )}
          </motion.div>

          {/* Progress Steps - Compact on mobile */}
          <div className="mb-6 md:mb-10 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex items-center justify-between min-w-max md:min-w-0 gap-1">
              {steps.map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                        step >= s.num
                          ? "bg-secondary text-secondary-foreground shadow-md"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step > s.num ? (
                        <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                      ) : (
                        <s.icon className="w-4 h-4 md:w-5 md:h-5" />
                      )}
                    </div>
                    <span className={`text-[10px] md:text-xs mt-1.5 whitespace-nowrap ${step >= s.num ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`h-0.5 md:h-1 w-4 md:w-12 mx-1 md:mx-2 rounded ${
                        step > s.num ? "bg-secondary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Type d'activité (PREMIER) */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl border border-border p-4 md:p-8 shadow-card"
            >
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
                <Building className="w-5 h-5 text-secondary" />
                Quelle est votre activité ?
              </h2>
              <p className="text-sm text-muted-foreground mb-4 md:mb-6">
                Sélectionnez votre type de transport
              </p>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                {transportTypes.map((transport) => {
                  const Icon = transport.icon;
                  const isSelected = activityType === transport.type;
                  return (
                    <button
                      key={transport.type}
                      onClick={() => setActivityType(transport.type)}
                      className={`p-4 md:p-6 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-secondary bg-secondary/10 shadow-md"
                          : "border-border hover:border-secondary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 md:items-start md:gap-4">
                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-secondary text-secondary-foreground" : "bg-muted"
                        }`}>
                          <Icon className="w-6 h-6 md:w-7 md:h-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-sm md:text-base">{transport.title}</h3>
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{transport.description}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-secondary flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between mt-6 md:mt-8">
                <Link to="/gp">
                  <Button variant="ghost" size="sm" className="md:size-default">
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden sm:inline">Retour</span>
                  </Button>
                </Link>
                <Button variant="gold" onClick={handleNextWithValidation}>
                  Continuer
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Account */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl border border-border p-4 md:p-8 shadow-card"
            >
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4 md:mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-secondary" />
                {existingUser ? "Vérifiez vos informations" : "Créez votre compte"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="fullName">Nom complet *</Label>
                  <Input
                    id="fullName"
                    placeholder="Ex: Mamadou Diallo"
                    value={accountData.fullName}
                    onChange={(e) => setAccountData({ ...accountData, fullName: e.target.value })}
                  />
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
                      value={accountData.email}
                      onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                      disabled={!!existingUser}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+221 77 123 45 67"
                      className="pl-10"
                      value={accountData.phone}
                      onChange={(e) => setAccountData({ ...accountData, phone: e.target.value })}
                    />
                  </div>
                </div>

                {!existingUser && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Min. 6 caractères"
                          className="pl-10 pr-10"
                          value={accountData.password}
                          onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmer *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirmer"
                          className="pl-10"
                          value={accountData.confirmPassword}
                          onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between mt-6 md:mt-8">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Retour</span>
                </Button>
                <Button variant="gold" onClick={handleNextWithValidation}>
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Business Info */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl border border-border p-4 md:p-8 shadow-card"
            >
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4 md:mb-6 flex items-center gap-2">
                <Building className="w-5 h-5 text-secondary" />
                Informations professionnelles
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="businessName">
                    {activityType === "agence" ? "Nom de l'agence *" : "Nom commercial *"}
                  </Label>
                  <Input
                    id="businessName"
                    placeholder={activityType === "agence" ? "Ex: Agence Voyages" : "Ex: Transport Express"}
                    value={businessData.businessName}
                    onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Ville *</Label>
                  <Input
                    id="city"
                    placeholder="Ex: Dakar"
                    value={businessData.city}
                    onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    placeholder="+221 77 000 00 00"
                    value={businessData.whatsapp}
                    onChange={(e) => setBusinessData({ ...businessData, whatsapp: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearsExperience">Expérience (années)</Label>
                  <Input
                    id="yearsExperience"
                    type="number"
                    placeholder="5"
                    value={businessData.yearsExperience}
                    onChange={(e) => setBusinessData({ ...businessData, yearsExperience: e.target.value })}
                  />
                </div>

                {activityType !== "agence" && activityType !== "express" && (
                  <div className="space-y-2">
                    <Label htmlFor="fleetSize">Taille flotte</Label>
                    <Input
                      id="fleetSize"
                      type="number"
                      placeholder="Nb véhicules"
                      value={businessData.fleetSize}
                      onChange={(e) => setBusinessData({ ...businessData, fleetSize: e.target.value })}
                    />
                  </div>
                )}

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    placeholder="Adresse complète"
                    value={businessData.address}
                    onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez vos services..."
                    value={businessData.description}
                    onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Services spécifiques selon l'activité */}
                {getAvailableServices().length > 0 && (
                  <div className="md:col-span-2 space-y-3">
                    <Label>Services proposés</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {getAvailableServices().map((service) => (
                        <div
                          key={service.value}
                          className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleService(service.value)}
                        >
                          <Checkbox
                            id={service.value}
                            checked={businessData.selectedServices.includes(service.value)}
                            onCheckedChange={() => toggleService(service.value)}
                          />
                          <label htmlFor={service.value} className="text-sm cursor-pointer">
                            {service.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-6 md:mt-8">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Retour</span>
                </Button>
                <Button variant="gold" onClick={handleNextWithValidation}>
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Documents */}
          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl border border-border p-4 md:p-8 shadow-card"
            >
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-secondary" />
                Documents justificatifs
              </h2>
              <p className="text-sm text-muted-foreground mb-4 md:mb-6">
                Ces documents seront vérifiés
              </p>

              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type de pièce d'identité</Label>
                    
                    {/* Sheet for mobile - hidden on desktop */}
                    <div className="block md:hidden">
                      <Sheet open={idTypeSheetOpen} onOpenChange={setIdTypeSheetOpen}>
                        <SheetTrigger asChild>
                          <Button variant="outline" className="w-full justify-between text-sm">
                            {idTypes.find(t => t.value === kycData.idType)?.label || "Sélectionner"}
                            <ArrowRight className="w-4 h-4 rotate-90" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="rounded-t-2xl">
                          <SheetHeader>
                            <SheetTitle>Type de pièce d'identité</SheetTitle>
                          </SheetHeader>
                          <div className="py-4 space-y-2">
                            {idTypes.map((type) => (
                              <button
                                key={type.value}
                                onClick={() => {
                                  setKycData({ ...kycData, idType: type.value });
                                  setIdTypeSheetOpen(false);
                                }}
                                className={`w-full p-4 rounded-xl text-left transition-all ${
                                  kycData.idType === type.value
                                    ? "bg-secondary/10 border-2 border-secondary"
                                    : "bg-muted hover:bg-muted/80 border-2 border-transparent"
                                }`}
                              >
                                <span className="font-medium">{type.label}</span>
                              </button>
                            ))}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                    
                    {/* Select for desktop - hidden on mobile */}
                    <div className="hidden md:block">
                      <Select
                        value={kycData.idType}
                        onValueChange={(value) => setKycData({ ...kycData, idType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {idTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idNumber">Numéro de la pièce</Label>
                    <Input
                      id="idNumber"
                      placeholder="Ex: 1234567890"
                      value={kycData.idNumber}
                      onChange={(e) => setKycData({ ...kycData, idNumber: e.target.value })}
                    />
                  </div>
                </div>

                {/* Document d'identité - toujours requis */}
                <DocumentUpload
                  label="Pièce d'identité"
                  required
                  onUpload={(url) => setKycData({ ...kycData, idDocumentUrl: url })}
                  uploadedUrl={kycData.idDocumentUrl}
                />

                {/* Registre de commerce */}
                {requiredDocs.includes("business_registration") && (
                  <DocumentUpload
                    label="Registre de commerce (NINEA/RC)"
                    required
                    onUpload={(url) => setKycData({ ...kycData, businessRegistrationUrl: url })}
                    uploadedUrl={kycData.businessRegistrationUrl}
                  />
                )}

                {/* Licence de transport */}
                {requiredDocs.includes("transport_license") && (
                  <DocumentUpload
                    label={activityType === "agence" ? "Licence agence" : "Licence transport"}
                    required
                    onUpload={(url) => setKycData({ ...kycData, transportLicenseUrl: url })}
                    uploadedUrl={kycData.transportLicenseUrl}
                  />
                )}

                {/* Assurance */}
                {requiredDocs.includes("insurance") && (
                  <DocumentUpload
                    label="Assurance RC Pro"
                    required
                    onUpload={(url) => setKycData({ ...kycData, insuranceDocumentUrl: url })}
                    uploadedUrl={kycData.insuranceDocumentUrl}
                  />
                )}
              </div>

              <div className="flex justify-between mt-6 md:mt-8">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Retour</span>
                </Button>
                <Button variant="gold" onClick={handleNextWithValidation}>
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Zones */}
          {step === 5 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl border border-border p-4 md:p-8 shadow-card"
            >
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-secondary" />
                Zones de couverture
              </h2>
              <p className="text-sm text-muted-foreground mb-4 md:mb-6">
                Définissez vos zones de desserte
              </p>

              <ZoneCoverageManager
                zones={coverageZones}
                onZonesChange={setCoverageZones}
                transportType={activityType}
              />

              <div className="flex justify-between mt-6 md:mt-8">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Retour</span>
                </Button>
                <Button variant="gold" onClick={handleNextWithValidation}>
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 6: Confirmation */}
          {step === 6 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card"
            >
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-secondary" />
                Confirmation
              </h2>

              <div className="space-y-6">
                {/* Résumé de l'activité */}
                <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/20">
                  <h3 className="font-semibold text-foreground mb-2">Activité</h3>
                  <div className="flex items-center gap-3">
                    {activityType && (
                      <>
                        {(() => {
                          const Icon = getActivityIcon(activityType);
                          return <Icon className="w-6 h-6 text-secondary" />;
                        })()}
                        <span className="font-medium">{transportConfig[activityType]?.title}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Résumé compte */}
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h3 className="font-semibold text-foreground mb-3">Compte</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nom:</span>
                      <p className="font-medium">{accountData.fullName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{accountData.email}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Téléphone:</span>
                      <p className="font-medium">{accountData.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Résumé entreprise */}
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h3 className="font-semibold text-foreground mb-3">Entreprise</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nom:</span>
                      <p className="font-medium">{businessData.businessName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ville:</span>
                      <p className="font-medium">{businessData.city}</p>
                    </div>
                    {businessData.selectedServices.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Services:</span>
                        <p className="font-medium">{businessData.selectedServices.join(", ")}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Résumé zones */}
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h3 className="font-semibold text-foreground mb-3">Zones de couverture</h3>
                  <div className="flex flex-wrap gap-2">
                    {coverageZones
                      .filter(z => z.country && (z.city || (z.cities && z.cities.length > 0)))
                      .map((zone, i) => (
                        <Badge key={i} variant="secondary">
                          {zone.city || zone.cities?.join(", ")} ({zone.country})
                        </Badge>
                      ))}
                  </div>
                </div>

                {/* Avertissement */}
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-warning mb-1">Validation en cours</p>
                    <p className="text-muted-foreground">
                      Votre inscription sera examinée par notre équipe. Vous recevrez une notification
                      dès que votre profil sera validé.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft className="w-5 h-5" />
                  Retour
                </Button>
                <Button 
                  variant="gold" 
                  size="lg" 
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Inscription...
                    </>
                  ) : (
                    <>
                      Valider l'inscription
                      <CheckCircle className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}