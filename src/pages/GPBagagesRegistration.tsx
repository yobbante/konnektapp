import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, ArrowLeft, User, Luggage, MapPin, 
  CheckCircle, Phone, Calendar, Weight, Plane
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

// Popular destinations for quick selection
const POPULAR_ROUTES = [
  { origin: "Paris", destination: "Dakar", originCountry: "FR", destCountry: "SN" },
  { origin: "Paris", destination: "Abidjan", originCountry: "FR", destCountry: "CI" },
  { origin: "Dakar", destination: "Paris", originCountry: "SN", destCountry: "FR" },
  { origin: "Paris", destination: "Douala", originCountry: "FR", destCountry: "CM" },
  { origin: "Dubaï", destination: "Dakar", originCountry: "AE", destCountry: "SN" },
  { origin: "Montréal", destination: "Dakar", originCountry: "CA", destCountry: "SN" },
];

// Baggage types accepted
const BAGGAGE_TYPES = [
  { value: "valise", label: "Valise" },
  { value: "sac", label: "Sac" },
  { value: "colis", label: "Petit colis" },
];

export default function GPBagagesRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [existingUser, setExistingUser] = useState<{ email: string; fullName: string; phone: string } | null>(null);

  // ESSENTIAL FIELDS ONLY (for matching)
  const [formData, setFormData] = useState({
    // Step 1: Identity
    fullName: "",
    phone: "",
    // Step 2: First voyage (matching)
    originCity: "",
    originCountry: "FR",
    destinationCity: "",
    destinationCountry: "SN",
    departureDate: "",
    returnDate: "",
    capacity: "",
    // Optional fields
    baggageTypes: ["valise", "sac", "colis"] as string[],
    pricePerKg: "",
    airline: "",
  });

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
            email: user.email || "",
            fullName: profile.full_name || "",
            phone: profile.phone || "",
          });
          setFormData(prev => ({
            ...prev,
            fullName: profile.full_name || "",
            phone: profile.phone || "",
          }));
        }
      }
    };
    loadExistingProfile();
  }, []);

  const steps = [
    { num: 1, label: "Identité", icon: User },
    { num: 2, label: "Premier voyage", icon: Plane },
    { num: 3, label: "Confirmation", icon: CheckCircle },
  ];

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.fullName || !formData.phone) {
          toast({ title: "Champs requis", description: "Nom et téléphone sont obligatoires", variant: "destructive" });
          return false;
        }
        return true;
      case 2:
        if (!formData.originCity || !formData.destinationCity || !formData.departureDate || !formData.capacity) {
          toast({ title: "Champs requis", description: "Ville départ, arrivée, date et capacité sont obligatoires", variant: "destructive" });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

  const selectRoute = (route: typeof POPULAR_ROUTES[0]) => {
    setFormData(prev => ({
      ...prev,
      originCity: route.origin,
      originCountry: route.originCountry,
      destinationCity: route.destination,
      destinationCountry: route.destCountry,
    }));
  };

  const toggleBaggageType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      baggageTypes: prev.baggageTypes.includes(type)
        ? prev.baggageTypes.filter(t => t !== type)
        : [...prev.baggageTypes, type]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        // Redirect to auth with return URL
        navigate(`/auth?redirect=/gp/bagages/inscription&mode=register`);
        return;
      }

      // Update profile
      await supabase
        .from("profiles")
        .update({
          phone: formData.phone,
          full_name: formData.fullName,
          is_gp: true,
        })
        .eq("user_id", currentUser.id);

      // Create GP profile
      const { data: gpProfile, error: gpError } = await supabase
        .from("gp_profiles")
        .insert({
          user_id: currentUser.id,
          business_name: formData.fullName,
          gp_type: "bagages_international",
          phone: formData.phone,
          whatsapp: formData.phone,
          city: formData.originCity,
          country_code: formData.originCountry,
          status: "pending",
        })
        .select()
        .single();

      if (gpError) throw gpError;

      // Create first voyage offer
      const { error: offerError } = await supabase
        .from("gp_offers")
        .insert({
          gp_id: gpProfile.id,
          origin_city: formData.originCity,
          origin_country: formData.originCountry,
          destination_city: formData.destinationCity,
          destination_country: formData.destinationCountry,
          departure_date: formData.departureDate,
          arrival_date: formData.returnDate || null,
          total_capacity: parseFloat(formData.capacity),
          available_capacity: parseFloat(formData.capacity),
          price_per_kg: formData.pricePerKg ? parseFloat(formData.pricePerKg) : 8,
          currency: "EUR",
          transport_type: "bagages_international",
          airline: formData.airline || null,
          baggage_types_accepted: formData.baggageTypes,
          status: "active",
        });

      if (offerError) throw offerError;

      toast({
        title: "✈️ Inscription réussie !",
        description: "Votre premier voyage est publié. Complétez votre profil après validation.",
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
              Inscription en moins de 2 minutes • Documents après validation
            </p>
          </motion.div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step >= s.num
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s.num ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-12 h-1 mx-1 rounded ${step > s.num ? "bg-secondary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Identity */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-secondary" />
                    <h2 className="text-lg font-semibold">Vos coordonnées</h2>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nom & Prénom *</Label>
                    <Input
                      id="fullName"
                      placeholder="Ex: Mamadou Diallo"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Les clients vous contacteront via WhatsApp
                    </p>
                  </div>

                  {!existingUser && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Vous devrez créer un compte ou vous connecter à l'étape finale
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <Link to="/gp">
                      <Button variant="ghost">
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        Retour
                      </Button>
                    </Link>
                    <Button variant="gold" onClick={handleNext}>
                      Continuer
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: First Voyage */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Plane className="w-5 h-5 text-secondary" />
                    <h2 className="text-lg font-semibold">Votre premier voyage</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Publiez votre prochain voyage pour commencer à recevoir des demandes
                  </p>

                  {/* Quick route selection */}
                  <div className="space-y-2">
                    <Label>Trajets populaires</Label>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_ROUTES.slice(0, 4).map((route, i) => (
                        <Badge
                          key={i}
                          variant={formData.originCity === route.origin && formData.destinationCity === route.destination ? "default" : "outline"}
                          className="cursor-pointer py-1.5"
                          onClick={() => selectRoute(route)}
                        >
                          {route.origin} → {route.destination}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Manual route input */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Ville départ *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Ex: Paris"
                          className="pl-9"
                          value={formData.originCity}
                          onChange={(e) => setFormData({ ...formData, originCity: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Ville arrivée *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Ex: Dakar"
                          className="pl-9"
                          value={formData.destinationCity}
                          onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Date aller *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="date"
                          className="pl-9"
                          value={formData.departureDate}
                          onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Date retour</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="date"
                          className="pl-9"
                          value={formData.returnDate}
                          onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                          min={formData.departureDate || new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className="space-y-2">
                    <Label>Capacité bagages (kg) *</Label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Ex: 30"
                        className="pl-9"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Poids total que vous pouvez transporter
                    </p>
                  </div>

                  {/* Optional: Baggage types */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Types acceptés (optionnel)</Label>
                    <div className="flex flex-wrap gap-2">
                      {BAGGAGE_TYPES.map((type) => (
                        <Badge
                          key={type.value}
                          variant={formData.baggageTypes.includes(type.value) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleBaggageType(type.value)}
                        >
                          {type.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Optional: Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Prix/kg (optionnel)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="Ex: 8 €"
                        value={formData.pricePerKg}
                        onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Compagnie (optionnel)</Label>
                      <Input
                        placeholder="Ex: Air France"
                        value={formData.airline}
                        onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                      />
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

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold">Récapitulatif</h2>
                  </div>

                  {/* Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nom</span>
                      <span className="font-medium">{formData.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Téléphone</span>
                      <span className="font-medium">{formData.phone}</span>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm font-semibold mb-2">Premier voyage</p>
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <Plane className="w-4 h-4" />
                        {formData.originCity} → {formData.destinationCity}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span>{formData.departureDate}</span>
                        <span>{formData.capacity} kg</span>
                        {formData.pricePerKg && <span>{formData.pricePerKg} €/kg</span>}
                      </div>
                    </div>
                  </div>

                  {/* What's next */}
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                    <p className="font-medium text-amber-700 dark:text-amber-400 mb-2">
                      Après inscription
                    </p>
                    <ul className="text-sm text-amber-700/80 dark:text-amber-400/80 space-y-1">
                      <li>• Ajoutez votre pièce d'identité pour vérification</li>
                      <li>• Configurez vos tarifs forfaitaires (téléphones, etc.)</li>
                      <li>• Recevez des demandes de bagages</li>
                    </ul>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="ghost" onClick={handleBack}>
                      <ArrowLeft className="w-5 h-5 mr-1" />
                      Retour
                    </Button>
                    <Button 
                      variant="gold" 
                      size="lg"
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? "Inscription..." : "Confirmer l'inscription"}
                      <CheckCircle className="w-5 h-5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
