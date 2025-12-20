import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, ArrowLeft, User, Building, FileCheck, MapPin, 
  CheckCircle, Phone, Mail, Lock, Eye, EyeOff, AlertCircle
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

const idTypes = [
  { value: "cni", label: "Carte Nationale d'Identité" },
  { value: "passport", label: "Passeport" },
  { value: "permis", label: "Permis de conduire" },
  { value: "carte_sejour", label: "Carte de séjour" },
];

export default function GPRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [existingUser, setExistingUser] = useState<{
    email: string;
    fullName: string;
    phone: string;
  } | null>(null);
  
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
    gpType: null as TransportType | null,
    city: "",
    countryCode: "SN",
    address: "",
    whatsapp: "",
    yearsExperience: "",
    fleetSize: "",
    description: "",
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
        // Récupérer le profil existant
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
          
          // Pré-remplir les données
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

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 5));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!accountData.email || !accountData.fullName || !accountData.phone) {
          toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
          return false;
        }
        // Ne pas valider le mot de passe si l'utilisateur est déjà connecté
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
      case 2:
        if (!businessData.businessName || !businessData.gpType || !businessData.city) {
          toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
          return false;
        }
        return true;
      case 3:
        return true;
      case 4:
        if (coverageZones.length === 0) {
          toast({ title: "Erreur", description: "Veuillez ajouter au moins une zone de couverture", variant: "destructive" });
          return false;
        }
        // Vérifier que chaque zone a au moins un pays et une ville/des villes
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

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    
    setLoading(true);
    try {
      let userId: string;

      // Si l'utilisateur est déjà connecté, utiliser son ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        userId = currentUser.id;
      } else {
        // Créer un nouveau compte
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

      // Mettre à jour le profil avec is_gp flag
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
          gp_type: businessData.gpType,
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

  const steps = [
    { num: 1, label: "Compte", icon: User },
    { num: 2, label: "Activité", icon: Building },
    { num: 3, label: "Documents", icon: FileCheck },
    { num: 4, label: "Zones", icon: MapPin },
    { num: 5, label: "Confirmation", icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="container max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <Badge variant="gold" className="mb-4">Devenir GP</Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Inscription Transporteur
            </h1>
            <p className="text-muted-foreground">
              Rejoignez le réseau Yobbanté-GP et développez votre activité
            </p>
            {existingUser && (
              <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg inline-block">
                <p className="text-sm text-success">
                  ✓ Connecté en tant que {existingUser.fullName || existingUser.email}
                </p>
              </div>
            )}
          </motion.div>

          {/* Progress Steps */}
          <div className="mb-10 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[500px] md:min-w-0">
              {steps.map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        step >= s.num
                          ? "bg-secondary text-secondary-foreground shadow-md"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step > s.num ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <s.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-2 ${step >= s.num ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`h-1 w-12 md:w-20 mx-2 rounded ${
                        step > s.num ? "bg-secondary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Account */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card"
            >
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-secondary" />
                {existingUser ? "Vérifiez vos informations" : "Créez votre compte"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          placeholder="Minimum 6 caractères"
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
                      <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirmer le mot de passe"
                          className="pl-10"
                          value={accountData.confirmPassword}
                          onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <Link to="/gp">
                  <Button variant="ghost">
                    <ArrowLeft className="w-5 h-5" />
                    Retour
                  </Button>
                </Link>
                <Button variant="gold" size="lg" onClick={handleNextWithValidation}>
                  Continuer
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Business Info */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {/* Type de transport - Sélection en grille responsive */}
              <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Building className="w-5 h-5 text-secondary" />
                  Type de transport *
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {transportTypes.map((option) => {
                    const IconComponent = option.icon;
                    const isSelected = businessData.gpType === option.type;
                    
                    return (
                      <motion.button
                        key={option.type}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setBusinessData({ ...businessData, gpType: option.type })}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          isSelected
                            ? "bg-secondary text-secondary-foreground border-secondary shadow-lg"
                            : option.bgColor + " hover:shadow-md"
                        }`}
                      >
                        <IconComponent className={`w-8 h-8 mx-auto mb-2 ${isSelected ? 'text-secondary-foreground' : option.color}`} />
                        <p className="font-semibold text-sm">{option.title}</p>
                        <p className={`text-xs mt-1 ${isSelected ? 'text-secondary-foreground/80' : 'text-muted-foreground'}`}>
                          {option.description}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Formulaire adapté au type de transport */}
              {businessData.gpType && (
                <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card">
                  <h2 className="text-xl font-semibold text-foreground mb-6">
                    Informations {businessData.gpType === 'voyageur' ? 'voyageur' : businessData.gpType === 'agence' ? "de l'agence" : 'professionnelles'}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="businessName">
                        {businessData.gpType === 'voyageur' ? 'Votre nom / Pseudo *' : businessData.gpType === 'agence' ? "Nom de l'agence *" : 'Nom commercial / Entreprise *'}
                      </Label>
                      <Input
                        id="businessName"
                        placeholder={businessData.gpType === 'voyageur' ? 'Ex: Moussa GP' : businessData.gpType === 'agence' ? 'Ex: Yobbanté Express' : 'Ex: Mamadou Express Transport'}
                        value={businessData.businessName}
                        onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">Ville de base *</Label>
                      <Input
                        id="city"
                        placeholder="Ex: Dakar"
                        value={businessData.city}
                        onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Pays</Label>
                      <Select
                        value={businessData.countryCode}
                        onValueChange={(value) => setBusinessData({ ...businessData, countryCode: value })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          <SelectItem value="SN">🇸🇳 Sénégal</SelectItem>
                          <SelectItem value="CI">🇨🇮 Côte d'Ivoire</SelectItem>
                          <SelectItem value="ML">🇲🇱 Mali</SelectItem>
                          <SelectItem value="BF">🇧🇫 Burkina Faso</SelectItem>
                          <SelectItem value="GN">🇬🇳 Guinée</SelectItem>
                          <SelectItem value="CM">🇨🇲 Cameroun</SelectItem>
                          <SelectItem value="TG">🇹🇬 Togo</SelectItem>
                          <SelectItem value="BJ">🇧🇯 Bénin</SelectItem>
                          <SelectItem value="GH">🇬🇭 Ghana</SelectItem>
                          <SelectItem value="NG">🇳🇬 Nigeria</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp (recommandé)</Label>
                      <Input
                        id="whatsapp"
                        placeholder="+221 77 123 45 67"
                        value={businessData.whatsapp}
                        onChange={(e) => setBusinessData({ ...businessData, whatsapp: e.target.value })}
                      />
                    </div>

                    {/* Champs spécifiques selon le type */}
                    {businessData.gpType !== 'voyageur' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="experience">Années d'expérience</Label>
                          <Select
                            value={businessData.yearsExperience}
                            onValueChange={(value) => setBusinessData({ ...businessData, yearsExperience: value })}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Sélectionnez" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border border-border z-50">
                              <SelectItem value="1">Moins d'1 an</SelectItem>
                              <SelectItem value="2">1-2 ans</SelectItem>
                              <SelectItem value="5">3-5 ans</SelectItem>
                              <SelectItem value="10">5-10 ans</SelectItem>
                              <SelectItem value="15">Plus de 10 ans</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {businessData.gpType === 'agence' && (
                          <div className="space-y-2">
                            <Label htmlFor="address">Adresse de l'agence</Label>
                            <Input
                              id="address"
                              placeholder="Ex: 123 Rue Moussé Diop, Dakar"
                              value={businessData.address}
                              onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                            />
                          </div>
                        )}

                        {(businessData.gpType === 'routier' || businessData.gpType === 'express') && (
                          <div className="space-y-2">
                            <Label htmlFor="fleetSize">Nombre de véhicules</Label>
                            <Select
                              value={businessData.fleetSize}
                              onValueChange={(value) => setBusinessData({ ...businessData, fleetSize: value })}
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Sélectionnez" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border border-border z-50">
                                <SelectItem value="1">1 véhicule</SelectItem>
                                <SelectItem value="3">2-3 véhicules</SelectItem>
                                <SelectItem value="5">4-5 véhicules</SelectItem>
                                <SelectItem value="10">6-10 véhicules</SelectItem>
                                <SelectItem value="20">Plus de 10 véhicules</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}

                    {businessData.gpType === 'voyageur' && (
                      <div className="space-y-2">
                        <Label>Fréquence des voyages</Label>
                        <Select
                          value={businessData.yearsExperience}
                          onValueChange={(value) => setBusinessData({ ...businessData, yearsExperience: value })}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Sélectionnez" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border z-50">
                            <SelectItem value="1">Occasionnel (1-2x/an)</SelectItem>
                            <SelectItem value="3">Régulier (3-6x/an)</SelectItem>
                            <SelectItem value="6">Fréquent (Mensuel)</SelectItem>
                            <SelectItem value="12">Très fréquent (Hebdo)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="description">
                        {businessData.gpType === 'voyageur' 
                          ? 'Présentez-vous en quelques mots'
                          : businessData.gpType === 'agence'
                          ? "Description de l'agence"
                          : 'Description de votre activité'
                        }
                      </Label>
                      <Textarea
                        id="description"
                        placeholder={businessData.gpType === 'voyageur'
                          ? 'Ex: Je voyage régulièrement entre Dakar et Paris...'
                          : businessData.gpType === 'agence'
                          ? "Ex: Notre agence spécialisée dans l'envoi de colis vers l'Afrique de l'Ouest..."
                          : 'Décrivez votre activité, vos spécialités, vos atouts...'
                        }
                        rows={3}
                        value={businessData.description}
                        onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft className="w-5 h-5" />
                  Retour
                </Button>
                <Button variant="gold" size="lg" onClick={handleNextWithValidation} disabled={!businessData.gpType}>
                  Continuer
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: KYC Documents */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card"
            >
              <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-secondary" />
                Documents KYC/KYB
              </h2>
              <p className="text-muted-foreground mb-6">
                Ces documents sont nécessaires pour valider votre compte et sécuriser la plateforme.
              </p>

              <div className="space-y-8">
                {/* Identity Document */}
                <div className="p-6 rounded-xl bg-muted/50 border border-border">
                  <h3 className="font-medium text-foreground mb-4">Pièce d'identité *</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="idType">Type de document</Label>
                      <select
                        id="idType"
                        className="w-full h-11 px-3 rounded-lg border border-input bg-background text-foreground"
                        value={kycData.idType}
                        onChange={(e) => setKycData({ ...kycData, idType: e.target.value })}
                      >
                        {idTypes.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="idNumber">Numéro du document *</Label>
                      <Input
                        id="idNumber"
                        placeholder="Ex: 1234567890123"
                        value={kycData.idNumber}
                        onChange={(e) => setKycData({ ...kycData, idNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Business Registration - seulement pour agence */}
                {businessData.gpType === 'agence' && (
                  <div className="p-6 rounded-xl bg-muted/50 border border-border">
                    <h3 className="font-medium text-foreground mb-4">Registre de commerce</h3>
                    <DocumentUpload
                      label="Document d'enregistrement de l'entreprise"
                      onUpload={(url) => setKycData({ ...kycData, businessRegistrationUrl: url })}
                      uploadedUrl={kycData.businessRegistrationUrl}
                    />
                  </div>
                )}

                {/* Transport License - seulement pour routier/express */}
                {(businessData.gpType === 'routier' || businessData.gpType === 'express') && (
                  <div className="p-6 rounded-xl bg-muted/50 border border-border">
                    <h3 className="font-medium text-foreground mb-4">Licence de transport (optionnel)</h3>
                    <DocumentUpload
                      label="Licence ou autorisation de transport"
                      onUpload={(url) => setKycData({ ...kycData, transportLicenseUrl: url })}
                      uploadedUrl={kycData.transportLicenseUrl}
                    />
                  </div>
                )}

                {/* Insurance */}
                {businessData.gpType !== 'voyageur' && (
                  <div className="p-6 rounded-xl bg-muted/50 border border-border">
                    <h3 className="font-medium text-foreground mb-4">Assurance (optionnel)</h3>
                    <DocumentUpload
                      label="Attestation d'assurance transport"
                      onUpload={(url) => setKycData({ ...kycData, insuranceDocumentUrl: url })}
                      uploadedUrl={kycData.insuranceDocumentUrl}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft className="w-5 h-5" />
                  Retour
                </Button>
                <Button variant="gold" size="lg" onClick={handleNextWithValidation}>
                  Continuer
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Zones */}
          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card"
            >
              <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-secondary" />
                Zones de couverture
              </h2>
              <p className="text-muted-foreground mb-6">
                Sélectionnez les zones géographiques que vous desservez.
              </p>

              <ZoneCoverageManager
                zones={coverageZones}
                onZonesChange={setCoverageZones}
                transportType={businessData.gpType}
              />

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft className="w-5 h-5" />
                  Retour
                </Button>
                <Button variant="gold" size="lg" onClick={handleNextWithValidation}>
                  Continuer
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Confirmation */}
          {step === 5 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-secondary" />
                  Récapitulatif de votre inscription
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Nom</p>
                    <p className="font-semibold text-foreground">{accountData.fullName}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold text-foreground">{accountData.email}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-semibold text-foreground">{accountData.phone}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">{businessData.gpType === 'agence' ? 'Agence' : 'Entreprise'}</p>
                    <p className="font-semibold text-foreground">{businessData.businessName}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Type GP</p>
                    <p className="font-semibold text-foreground capitalize">{transportConfig[businessData.gpType!]?.title}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Ville</p>
                    <p className="font-semibold text-foreground">{businessData.city}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 md:col-span-2">
                    <p className="text-sm text-muted-foreground">Zones desservies</p>
                    <p className="font-semibold text-foreground">
                      {coverageZones.length > 0 
                        ? coverageZones.map(z => {
                            const cities = z.cities?.length ? z.cities.join(", ") : z.city;
                            return cities || z.country;
                          }).join(" • ")
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-secondary/10 border border-secondary/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Documents téléchargés</p>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        <li>✓ Pièce d'identité</li>
                        {kycData.businessRegistrationUrl && <li>✓ Registre de commerce</li>}
                        {kycData.transportLicenseUrl && <li>✓ Licence de transport</li>}
                        {kycData.insuranceDocumentUrl && <li>✓ Assurance</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-success">Prochaine étape</p>
                    <p className="text-sm text-muted-foreground">
                      Après soumission, notre équipe examinera votre dossier sous 24-48h. 
                      Vous recevrez un email de confirmation dès validation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft className="w-5 h-5" />
                  Retour
                </Button>
                <Button variant="gold" size="lg" onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Inscription en cours...
                    </>
                  ) : (
                    <>
                      Valider mon inscription
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