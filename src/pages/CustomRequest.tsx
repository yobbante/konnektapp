import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, ArrowRight, Package, MapPin, Calendar, 
  Scale, FileText, CheckCircle, Truck, Ship, Plane, Briefcase,
  Home, Box, Car, Sparkles, AlertTriangle
} from "lucide-react";
import { MovingQuoteCalculator } from "@/components/quotes/MovingQuoteCalculator";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const shipmentTypes = [
  { value: "colis", label: "Colis / Petit paquet", icon: Package, description: "Documents, vêtements, petits objets", allowedTransports: ["voyageur", "routier", "maritime", "aerien"] },
  { value: "marchandise", label: "Marchandise", icon: Box, description: "Produits commerciaux, stocks", allowedTransports: ["routier", "maritime", "aerien"] },
  { value: "vehicule", label: "Véhicule", icon: Car, description: "Voiture, moto, engins", allowedTransports: ["routier", "maritime"] },
  { value: "autre", label: "Autre", icon: Sparkles, description: "Autres types d'envoi", allowedTransports: ["voyageur", "routier", "maritime", "aerien"] },
];

const transportOptions = [
  { type: "voyageur", icon: Briefcase, title: "GP / Voyageur", description: "Via bagages", maxWeight: 50 },
  { type: "routier", icon: Truck, title: "Routier", description: "Camion, fourgon", maxWeight: null },
  { type: "maritime", icon: Ship, title: "Maritime", description: "Conteneur, fret", maxWeight: null },
  { type: "aerien", icon: Plane, title: "Aérien", description: "Cargo aérien", maxWeight: 500 },
];

const additionalServices = [
  { value: "emballage", label: "Emballage professionnel" },
  { value: "manutention", label: "Manutention / Portage" },
  { value: "demontage", label: "Démontage / Remontage" },
  { value: "stockage", label: "Stockage temporaire" },
  { value: "assurance", label: "Assurance premium" },
];

const countries = [
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "GN", name: "Guinée", flag: "🇬🇳" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "AE", name: "Dubai", flag: "🇦🇪" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
];

export default function CustomRequest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showMovingCalculator, setShowMovingCalculator] = useState(false);
  
  const [formData, setFormData] = useState({
    shipmentType: "",
    transportType: null as string | null,
    originCity: "",
    originCountry: "SN",
    destinationCity: "",
    destinationCountry: "CI",
    pickupDateFrom: "",
    pickupDateTo: "",
    weightEstimate: "",
    volumeEstimate: "",
    description: "",
    budgetMin: "",
    budgetMax: "",
    isUrgent: false,
    isFragile: false,
    additionalServices: [] as string[],
  });

  // Handle moving quote submission
  const handleMovingQuote = async (quoteData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Connexion requise", description: "Veuillez vous connecter" });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("custom_requests")
        .insert([{
          client_id: user.id,
          shipment_type: "demenagement",
          transport_type: "routier",
          origin_city: quoteData.originCity,
          origin_country: "SN",
          destination_city: quoteData.destinationCity,
          destination_country: "SN",
          weight_estimate: quoteData.weight,
          volume_estimate: `${quoteData.volume}m³`,
          description: `Déménagement - Volume: ${quoteData.volume}m³, Poids: ${quoteData.weight}kg. Services: ${quoteData.services.join(", ")}`,
          budget_min: Math.floor(quoteData.totalPrice * 0.9),
          budget_max: Math.floor(quoteData.totalPrice * 1.1),
          is_urgent: false,
          is_fragile: true,
          additional_services: quoteData.services,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          request_number: `REQ-${Date.now()}`,
        }] as any)
        .select()
        .single();

      if (error) throw error;

      setShowMovingCalculator(false);
      navigate(`/quote-confirmation?id=${data.id}`);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 4));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.shipmentType) {
          toast({ title: "Erreur", description: "Sélectionnez un type d'envoi", variant: "destructive" });
          return false;
        }
        return true;
      case 2:
        if (!formData.originCity || !formData.destinationCity) {
          toast({ title: "Erreur", description: "Renseignez les villes de départ et destination", variant: "destructive" });
          return false;
        }
        return true;
      case 3:
        if (!formData.description.trim()) {
          toast({ title: "Erreur", description: "Décrivez votre envoi", variant: "destructive" });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNextWithValidation = () => {
    if (validateStep(step)) handleNext();
  };

  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      additionalServices: prev.additionalServices.includes(service)
        ? prev.additionalServices.filter(s => s !== service)
        : [...prev.additionalServices, service]
    }));
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Connexion requise",
          description: "Veuillez vous connecter pour envoyer une demande",
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("custom_requests")
        .insert([{
          client_id: user.id,
          shipment_type: formData.shipmentType,
          transport_type: formData.transportType,
          origin_city: formData.originCity,
          origin_country: formData.originCountry,
          destination_city: formData.destinationCity,
          destination_country: formData.destinationCountry,
          pickup_date_from: formData.pickupDateFrom || null,
          pickup_date_to: formData.pickupDateTo || null,
          weight_estimate: formData.weightEstimate ? parseFloat(formData.weightEstimate) : null,
          volume_estimate: formData.volumeEstimate || null,
          description: formData.description,
          budget_min: formData.budgetMin ? parseInt(formData.budgetMin) : null,
          budget_max: formData.budgetMax ? parseInt(formData.budgetMax) : null,
          is_urgent: formData.isUrgent,
          is_fragile: formData.isFragile,
          additional_services: formData.additionalServices,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          request_number: `REQ-${Date.now()}`, // Will be overwritten by trigger
        }] as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Demande envoyée !",
        description: "Les transporteurs vont vous envoyer leurs offres.",
      });

      navigate(`/quote-confirmation?id=${data.id}`);
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la demande",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      <div className="px-4 py-4">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-8 h-1 mx-1 rounded ${step > s ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Type d'envoi */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold mb-1">Type d'envoi</h1>
              <p className="text-sm text-muted-foreground">Que souhaitez-vous envoyer ?</p>
            </div>

            <div className="space-y-3 mb-6">
              {shipmentTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    setFormData({ ...formData, shipmentType: type.value, transportType: null });
                  }}
                  className={`w-full mobile-card flex items-center gap-4 p-4 text-left transition-all ${
                    formData.shipmentType === type.value
                      ? "ring-2 ring-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    formData.shipmentType === type.value ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <type.icon className={`w-6 h-6 ${
                      formData.shipmentType === type.value ? "text-primary" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{type.label}</p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Link to dedicated moving page */}
            <div className="mb-6 p-3 bg-amber-500/10 rounded-xl border border-amber-200/50">
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                🚚 Besoin d'un déménagement complet ?
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/demenagement")}
                className="w-full"
              >
                Faire une demande de déménagement
              </Button>
            </div>

            {/* Transport préféré - with smart filtering */}
            <div className="mb-6">
              <Label className="mb-3 block">Mode de transport préféré (optionnel)</Label>
              {(() => {
                const selectedType = shipmentTypes.find(t => t.value === formData.shipmentType);
                const allowedTransports = selectedType?.allowedTransports || transportOptions.map(t => t.type);
                
                return (
                  <div className="grid grid-cols-2 gap-2">
                    {transportOptions.map((option) => {
                      const isAllowed = allowedTransports.includes(option.type);
                      
                      return (
                        <button
                          key={option.type}
                          onClick={() => {
                            if (!isAllowed) {
                              toast({
                                title: "Transport non compatible",
                                description: `Le transport ${option.title} n'est pas adapté pour ce type d'envoi`,
                                variant: "destructive"
                              });
                              return;
                            }
                            setFormData({ 
                              ...formData, 
                              transportType: formData.transportType === option.type ? null : option.type 
                            });
                          }}
                          disabled={!isAllowed}
                          className={`mobile-card flex flex-col items-center text-center p-3 transition-all ${
                            !isAllowed 
                              ? "opacity-40 cursor-not-allowed bg-muted/50"
                              : formData.transportType === option.type
                                ? "ring-2 ring-secondary bg-secondary/5"
                                : ""
                          }`}
                        >
                          <option.icon className={`w-6 h-6 mb-1 ${
                            !isAllowed 
                              ? "text-muted-foreground"
                              : formData.transportType === option.type 
                                ? "text-secondary" 
                                : "text-muted-foreground"
                          }`} />
                          <span className="text-sm font-medium">{option.title}</span>
                          {!isAllowed && (
                            <span className="text-[10px] text-muted-foreground">Non disponible</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => navigate(-1)} className="flex-1">
                <ArrowLeft className="w-5 h-5" />
                Retour
              </Button>
              <Button variant="default" onClick={handleNextWithValidation} className="flex-1">
                Continuer
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Trajet */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold mb-1">Trajet</h1>
              <p className="text-sm text-muted-foreground">D'où à où ?</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Ville de départ *
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Dakar"
                    value={formData.originCity}
                    onChange={(e) => setFormData({ ...formData, originCity: e.target.value })}
                    className="flex-1"
                  />
                  <select
                    value={formData.originCountry}
                    onChange={(e) => setFormData({ ...formData, originCountry: e.target.value })}
                    className="w-20 h-11 px-2 rounded-lg border border-input bg-background"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent" />
                  Ville de destination *
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Abidjan"
                    value={formData.destinationCity}
                    onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                    className="flex-1"
                  />
                  <select
                    value={formData.destinationCountry}
                    onChange={(e) => setFormData({ ...formData, destinationCountry: e.target.value })}
                    className="w-20 h-11 px-2 rounded-lg border border-input bg-background"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date souhaitée (début)
                  </Label>
                  <Input
                    type="date"
                    value={formData.pickupDateFrom}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, pickupDateFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date limite</Label>
                  <Input
                    type="date"
                    value={formData.pickupDateTo}
                    min={formData.pickupDateFrom || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, pickupDateTo: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Button variant="default" onClick={handleNextWithValidation} className="flex-1">
                Continuer
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Détails */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold mb-1">Détails de l'envoi</h1>
              <p className="text-sm text-muted-foreground">Décrivez votre envoi</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  placeholder="Décrivez ce que vous envoyez, le nombre d'articles, dimensions approximatives..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    Poids estimé (kg)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Ex: 25"
                    value={formData.weightEstimate}
                    onChange={(e) => setFormData({ ...formData, weightEstimate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Volume (optionnel)</Label>
                  <Input
                    placeholder="Ex: 2m³"
                    value={formData.volumeEstimate}
                    onChange={(e) => setFormData({ ...formData, volumeEstimate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Budget min (FCFA)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 5000"
                    value={formData.budgetMin}
                    onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Budget max (FCFA)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 15000"
                    value={formData.budgetMax}
                    onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 mobile-card">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <div>
                      <p className="font-medium">Envoi urgent</p>
                      <p className="text-xs text-muted-foreground">Priorité haute</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.isUrgent}
                    onCheckedChange={(checked) => setFormData({ ...formData, isUrgent: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 mobile-card">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Contenu fragile</p>
                      <p className="text-xs text-muted-foreground">Manipulation avec soin</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.isFragile}
                    onCheckedChange={(checked) => setFormData({ ...formData, isFragile: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Button variant="default" onClick={handleNextWithValidation} className="flex-1">
                Continuer
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Services & Confirmation */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold mb-1">Services additionnels</h1>
              <p className="text-sm text-muted-foreground">Optionnel - Sélectionnez vos besoins</p>
            </div>

            <div className="space-y-2 mb-6">
              {additionalServices.map((service) => (
                <button
                  key={service.value}
                  onClick={() => toggleService(service.value)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    formData.additionalServices.includes(service.value)
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{service.label}</span>
                    {formData.additionalServices.includes(service.value) && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Récapitulatif */}
            <div className="mobile-card mb-6">
              <h3 className="font-semibold mb-3">Récapitulatif</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{shipmentTypes.find(t => t.value === formData.shipmentType)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trajet</span>
                  <span>{formData.originCity} → {formData.destinationCity}</span>
                </div>
                {formData.weightEstimate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Poids</span>
                    <span>~{formData.weightEstimate} kg</span>
                  </div>
                )}
                {formData.isUrgent && (
                  <Badge variant="warning" className="mt-2">Urgent</Badge>
                )}
              </div>
            </div>

            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg mb-6">
              <p className="text-sm text-primary">
                <Sparkles className="w-4 h-4 inline mr-1" />
                Les transporteurs seront notifiés et vous enverront leurs offres. 
                Vous recevrez une notification pour chaque réponse.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Button 
                variant="gold" 
                onClick={handleSubmit} 
                className="flex-1"
                disabled={loading}
              >
                {loading ? "Envoi..." : "Envoyer la demande"}
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
