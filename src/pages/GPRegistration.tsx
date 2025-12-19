import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, ArrowLeft, User, Building, FileCheck, MapPin, 
  CheckCircle, Upload, Truck, Ship, Plane, Zap, Briefcase,
  Phone, Mail, Lock, Eye, EyeOff, AlertCircle
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
import { TransportTypeCard } from "@/components/TransportTypeCard";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ZoneSelector } from "@/components/ZoneSelector";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur";

const transportOptions = [
  { type: "express" as TransportType, title: "Express", description: "Livraison rapide de colis" },
  { type: "routier" as TransportType, title: "Routier", description: "Transport terrestre par camion" },
  { type: "maritime" as TransportType, title: "Maritime", description: "Fret maritime et conteneurs" },
  { type: "aerien" as TransportType, title: "Aérien", description: "Transport par avion cargo" },
  { type: "voyageur" as TransportType, title: "Voyageur", description: "Via capacité bagages voyageur" },
];

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
  
  const [zones, setZones] = useState<string[]>([]);
  const [internationalDestinations, setInternationalDestinations] = useState<string[]>([]);

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 5));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!accountData.email || !accountData.password || !accountData.fullName || !accountData.phone) {
          toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
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
        return true;
      case 2:
        if (!businessData.businessName || !businessData.gpType || !businessData.city) {
          toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
          return false;
        }
        return true;
      case 3:
        // Documents are now optional
        return true;
      case 4:
        if (zones.length === 0) {
          toast({ title: "Erreur", description: "Veuillez sélectionner au moins une zone de couverture", variant: "destructive" });
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
      // 1. Create user account
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

      // 2. Update profile with is_gp flag
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          phone: accountData.phone,
          is_gp: true,
        })
        .eq("user_id", authData.user.id);

      if (profileError) throw profileError;

      // 3. Create GP profile
      const { error: gpError } = await supabase
        .from("gp_profiles")
        .insert({
          user_id: authData.user.id,
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
          zones_covered: zones,
          international_destinations: internationalDestinations,
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
                Créez votre compte
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
              <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Building className="w-5 h-5 text-secondary" />
                  Type de transport *
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {transportOptions.map((option) => (
                    <TransportTypeCard
                      key={option.type}
                      type={option.type}
                      title={option.title}
                      description={option.description}
                      selected={businessData.gpType === option.type}
                      onClick={() => setBusinessData({ ...businessData, gpType: option.type })}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  Informations professionnelles
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="businessName">Nom commercial / Entreprise *</Label>
                    <Input
                      id="businessName"
                      placeholder="Ex: Mamadou Express Transport"
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
                    <Label htmlFor="country">Pays</Label>
                    <select
                      id="country"
                      className="w-full h-11 px-3 rounded-lg border border-input bg-background text-foreground"
                      value={businessData.countryCode}
                      onChange={(e) => setBusinessData({ ...businessData, countryCode: e.target.value })}
                    >
                      <option value="SN">🇸🇳 Sénégal</option>
                      <option value="CI">🇨🇮 Côte d'Ivoire</option>
                      <option value="ML">🇲🇱 Mali</option>
                      <option value="BF">🇧🇫 Burkina Faso</option>
                      <option value="GN">🇬🇳 Guinée</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      placeholder="Adresse de votre activité"
                      value={businessData.address}
                      onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      placeholder="+221 77 123 45 67"
                      value={businessData.whatsapp}
                      onChange={(e) => setBusinessData({ ...businessData, whatsapp: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience">Années d'expérience</Label>
                    <Input
                      id="experience"
                      type="number"
                      placeholder="Ex: 5"
                      value={businessData.yearsExperience}
                      onChange={(e) => setBusinessData({ ...businessData, yearsExperience: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fleetSize">Taille de la flotte</Label>
                    <Input
                      id="fleetSize"
                      type="number"
                      placeholder="Nombre de véhicules"
                      value={businessData.fleetSize}
                      onChange={(e) => setBusinessData({ ...businessData, fleetSize: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="description">Description de votre activité</Label>
                    <Textarea
                      id="description"
                      placeholder="Décrivez votre activité, vos spécialités, vos atouts..."
                      rows={4}
                      value={businessData.description}
                      onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                    />
                  </div>
                </div>
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

                {/* Business Registration */}
                <div className="p-6 rounded-xl bg-muted/50 border border-border">
                  <h3 className="font-medium text-foreground mb-4">Registre de commerce (optionnel)</h3>
                  <DocumentUpload
                    label="Document d'enregistrement de l'entreprise"
                    onUpload={(url) => setKycData({ ...kycData, businessRegistrationUrl: url })}
                    uploadedUrl={kycData.businessRegistrationUrl}
                  />
                </div>

                {/* Transport License */}
                <div className="p-6 rounded-xl bg-muted/50 border border-border">
                  <h3 className="font-medium text-foreground mb-4">Licence de transport (optionnel)</h3>
                  <DocumentUpload
                    label="Licence ou autorisation de transport"
                    onUpload={(url) => setKycData({ ...kycData, transportLicenseUrl: url })}
                    uploadedUrl={kycData.transportLicenseUrl}
                  />
                </div>

                {/* Insurance */}
                <div className="p-6 rounded-xl bg-muted/50 border border-border">
                  <h3 className="font-medium text-foreground mb-4">Assurance (optionnel)</h3>
                  <DocumentUpload
                    label="Attestation d'assurance transport"
                    onUpload={(url) => setKycData({ ...kycData, insuranceDocumentUrl: url })}
                    uploadedUrl={kycData.insuranceDocumentUrl}
                  />
                </div>
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

              <ZoneSelector
                selectedZones={zones}
                onZonesChange={setZones}
                selectedInternational={internationalDestinations}
                onInternationalChange={setInternationalDestinations}
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
                    <p className="text-sm text-muted-foreground">Entreprise</p>
                    <p className="font-semibold text-foreground">{businessData.businessName}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Type GP</p>
                    <p className="font-semibold text-foreground capitalize">{businessData.gpType}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Ville</p>
                    <p className="font-semibold text-foreground">{businessData.city}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 md:col-span-2">
                    <p className="text-sm text-muted-foreground">Zones desservies</p>
                    <p className="font-semibold text-foreground">{zones.join(", ") || "—"}</p>
                  </div>
                  {internationalDestinations.length > 0 && (
                    <div className="p-4 rounded-xl bg-muted/50 md:col-span-2">
                      <p className="text-sm text-muted-foreground">Destinations internationales</p>
                      <p className="font-semibold text-foreground">{internationalDestinations.join(", ")}</p>
                    </div>
                  )}
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
                  Modifier
                </Button>
                <Button 
                  variant="gold" 
                  size="lg" 
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? "Inscription en cours..." : "Soumettre mon inscription"}
                  <ArrowRight className="w-5 h-5" />
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
