import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Package, CheckCircle, AlertTriangle, Info,
  Smartphone, Laptop, Car, FileText, Gem, Tablet, Gamepad2, Wine,
  Scale, MapPin, Calendar, Plane, User, Star, Shield, Minus, Plus,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { EscrowPaymentFlow } from "@/components/escrow/EscrowPaymentFlow";
import { createAutoConversationAfterBooking } from "@/lib/autoChat";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Types
interface GPProfile {
  id: string;
  business_name: string;
  rating: number | null;
  total_deliveries: number | null;
  verified_at: string | null;
  gp_type: string;
  default_currency: string;
}

interface GPOffer {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  arrival_date: string | null;
  price_per_kg: number;
  currency: string;
  available_capacity: number;
  conditions: string | null;
  explicit_restrictions: string[] | null;
  baggage_restrictions: string | null;
}

interface FlatRateItem {
  id: string;
  object_type_id: string;
  name: string;
  label: string;
  price: number;
  quantity: number;
}

// Icons for flat-rate items
const OBJECT_ICONS: Record<string, any> = {
  telephone: Smartphone,
  ordinateur: Laptop,
  piece_auto: Car,
  document: FileText,
  bijoux: Gem,
  tablette: Tablet,
  console: Gamepad2,
  parfum: Wine,
};

// Restriction labels
const RESTRICTION_LABELS: Record<string, string> = {
  liquids: "Liquides",
  batteries: "Batteries/Piles",
  perfumes: "Parfums",
  electronics: "Électronique sensible",
  food_perishable: "Nourriture périssable",
  medications: "Médicaments",
  weapons: "Armes/Objets dangereux",
  flammable: "Produits inflammables",
  valuables: "Objets de valeur >500€",
  animals: "Animaux",
  plants: "Plantes",
  fragile_glass: "Verre/Céramique fragile",
  oversized: "Objets surdimensionnés",
  documents_official: "Documents officiels",
  currency: "Devises/Argent liquide",
};

export default function SmartBookingPage() {
  const { gpId } = useParams();
  const [searchParams] = useSearchParams();
  const offerId = searchParams.get("offer");
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [showEscrow, setShowEscrow] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Data
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [offer, setOffer] = useState<GPOffer | null>(null);
  const [flatRateItems, setFlatRateItems] = useState<FlatRateItem[]>([]);

  // Form State - Section A: Colis au kilo
  const [kiloWeight, setKiloWeight] = useState<string>("");
  const [kiloNatures, setKiloNatures] = useState<string[]>([]); // alimentaire, vetements, tissus, autres
  const [autresNature, setAutresNature] = useState<string>("");

  // Form State - Section B: Articles forfaitaires (quantities stored in flatRateItems)

  // Form State - Step 3: Validation
  const [acceptedRestrictions, setAcceptedRestrictions] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [gpId, offerId]);

  const loadData = async () => {
    try {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        sessionStorage.setItem("pending_booking_state", JSON.stringify({
          gpId,
          offerId,
          returnPath: `/reservation/gp/${gpId}${offerId ? `?offer=${offerId}` : ""}`,
          timestamp: Date.now(),
        }));
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      if (!gpId) {
        navigate("/offres");
        return;
      }

      // Fetch GP profile
      const { data: gpData, error: gpError } = await supabase
        .from("gp_profiles")
        .select("id, business_name, rating, total_deliveries, verified_at, gp_type, default_currency")
        .eq("id", gpId)
        .single();

      if (gpError || !gpData) {
        toast({ title: "Transporteur non trouvé", variant: "destructive" });
        navigate("/offres");
        return;
      }
      setGpProfile(gpData);

      // Fetch offer (either specific or most recent active)
      let offerQuery = supabase
        .from("gp_offers")
        .select("*")
        .eq("gp_id", gpId)
        .eq("status", "active");

      if (offerId) {
        offerQuery = offerQuery.eq("id", offerId);
      } else {
        offerQuery = offerQuery.order("departure_date", { ascending: true }).limit(1);
      }

      const { data: offerData } = await offerQuery.single();
      if (offerData) {
        setOffer(offerData);
      }

      // Fetch GP's flat-rate pricing
      const { data: flatRates } = await supabase
        .from("gp_flat_rate_pricing")
        .select(`
          id,
          object_type_id,
          price,
          flat_rate_object_types!inner(name, label)
        `)
        .eq("gp_id", gpId)
        .eq("is_active", true);

      if (flatRates) {
        setFlatRateItems(flatRates.map((fr: any) => ({
          id: fr.id,
          object_type_id: fr.object_type_id,
          name: fr.flat_rate_object_types.name,
          label: fr.flat_rate_object_types.label,
          price: fr.price,
          quantity: 0,
        })));
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Erreur de chargement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const calculations = useMemo(() => {
    const pricePerKg = offer?.price_per_kg || 0;
    const weight = parseFloat(kiloWeight) || 0;
    const kiloTotal = weight * pricePerKg;

    const flatRateTotal = flatRateItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const flatRateCount = flatRateItems.reduce((sum, item) => sum + item.quantity, 0);

    const grandTotal = kiloTotal + flatRateTotal;

    return {
      weight,
      kiloTotal,
      flatRateTotal,
      flatRateCount,
      grandTotal,
      hasKiloItems: weight > 0,
      hasFlatRateItems: flatRateCount > 0,
      hasAnyItems: weight > 0 || flatRateCount > 0,
    };
  }, [kiloWeight, flatRateItems, offer?.price_per_kg]);

  // Update flat-rate quantity
  const updateFlatRateQuantity = (id: string, delta: number) => {
    setFlatRateItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Validation
  const canProceed = (currentStep: number): boolean => {
    if (currentStep === 1) {
      // Must have items AND if kilo items, must have nature selected
      if (!calculations.hasAnyItems) return false;
      if (calculations.hasKiloItems && kiloNatures.length === 0) return false;
      if (kiloNatures.includes("autres") && !autresNature.trim()) return false;
      return true;
    }
    if (currentStep === 2) {
      return true; // Calculation is auto
    }
    if (currentStep === 3) {
      return acceptedRestrictions;
    }
    return true;
  };

  // Toggle kilo nature
  const toggleKiloNature = (nature: string) => {
    setKiloNatures(prev => 
      prev.includes(nature) 
        ? prev.filter(n => n !== nature)
        : [...prev, nature]
    );
  };

  // Navigation
  const handleNext = () => {
    if (!canProceed(step)) {
      if (step === 1) {
        if (!calculations.hasAnyItems) {
          toast({ title: "Déclaration requise", description: "Ajoutez au moins un colis au kilo ou un article forfaitaire", variant: "destructive" });
        } else if (calculations.hasKiloItems && kiloNatures.length === 0) {
          toast({ title: "Nature requise", description: "Sélectionnez le type de contenu de vos colis au kilo", variant: "destructive" });
        } else if (kiloNatures.includes("autres") && !autresNature.trim()) {
          toast({ title: "Précision requise", description: "Veuillez préciser la nature de vos articles", variant: "destructive" });
        }
      } else if (step === 3) {
        toast({ title: "Acceptation requise", description: "Vous devez accepter les règles du transporteur", variant: "destructive" });
      }
      return;
    }
    setStep(prev => Math.min(prev + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Submit
  const handleSubmit = async () => {
    if (!canProceed(3)) {
      toast({ title: "Veuillez accepter les conditions", variant: "destructive" });
      return;
    }

    // For bagages_international, show escrow first
    if (gpProfile?.gp_type === "bagages_international" && !showEscrow) {
      setShowEscrow(true);
      return;
    }

    await completeBooking();
  };

  const completeBooking = async () => {
    if (!userId || !gpProfile || !offer) return;

    setSubmitting(true);
    try {
      // Create order
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
      
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          client_id: userId,
          gp_id: gpProfile.id,
          offer_id: offer.id,
          origin_city: offer.origin_city,
          origin_country: offer.origin_country,
          destination_city: offer.destination_city,
          destination_country: offer.destination_country,
          price_per_kg: offer.price_per_kg,
          weight: calculations.weight || 0,
          total_price: calculations.grandTotal,
          currency: offer.currency,
          status: "pending" as const,
          logistics_status: "submitted",
          order_number: orderNumber,
          description: buildOrderDescription(),
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      // Create order logistics
      const { error: logisticsError } = await supabase
        .from("order_logistics")
        .insert({
          order_id: orderData.id,
          merchandise_type: getMerchandiseType(),
          merchandise_description: buildOrderDescription(),
          estimated_weight: calculations.weight || 0,
          is_fragile: false,
          is_urgent: false,
          pickup_address: "À confirmer",
          delivery_address: "À confirmer",
          pickup_date: offer.departure_date,
          validated_at: new Date().toISOString(),
        });

      if (logisticsError) throw logisticsError;

      // Create auto conversation
      await createAutoConversationAfterBooking(
        userId,
        gpProfile.id,
        orderData.id,
        {
          orderNumber,
          originCity: offer.origin_city,
          destinationCity: offer.destination_city,
          gpName: gpProfile.business_name,
        }
      );

      toast({
        title: "🎉 Réservation confirmée !",
        description: "Le transporteur a été notifié. Consultez vos messages.",
      });
      navigate("/messages");
    } catch (error) {
      console.error("Booking error:", error);
      toast({ title: "Erreur de réservation", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscrowComplete = async () => {
    setShowEscrow(false);
    await completeBooking();
  };

  // Helpers
  const getKiloNatureLabels = (): string => {
    const labels: Record<string, string> = {
      alimentaire: "Alimentaire",
      vetements: "Vêtements",
      tissus: "Tissus",
      autres: autresNature || "Autres",
    };
    return kiloNatures.map(n => labels[n]).join(", ");
  };

  const buildOrderDescription = (): string => {
    const parts: string[] = [];
    
    if (calculations.hasKiloItems) {
      parts.push(`${calculations.weight}kg (${getKiloNatureLabels()})`);
    }
    
    flatRateItems.filter(i => i.quantity > 0).forEach(item => {
      parts.push(`${item.quantity}x ${item.label}`);
    });

    return parts.join(", ");
  };

  const getMerchandiseType = (): string => {
    if (calculations.hasFlatRateItems && !calculations.hasKiloItems) {
      return "electronics";
    }
    if (calculations.hasKiloItems && !calculations.hasFlatRateItems) {
      return "clothing";
    }
    return "other";
  };

  const currency = offer?.currency || gpProfile?.default_currency || "FCFA";
  const currencySymbol = getCurrencySymbol(currency);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!gpProfile || !offer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Offre non disponible</p>
          <Button onClick={() => navigate("/offres")} className="mt-4">
            Voir les offres
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: 'calc(100px + var(--safe-bottom, 0px))' }}>
      <MobileHeader />

      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Réservation intelligente</h1>
            <p className="text-sm text-muted-foreground">{gpProfile.business_name}</p>
          </div>
        </div>

        {/* Route Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 mb-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{gpProfile.business_name}</span>
                {gpProfile.verified_at && <Shield className="w-4 h-4 text-primary" />}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="w-3 h-3 text-warning fill-warning" />
                <span>{gpProfile.rating || 0}</span>
                <span>•</span>
                <span>{gpProfile.total_deliveries || 0} livraisons</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium">{offer.origin_city}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="font-medium">{offer.destination_city}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-primary/10 text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Départ: {format(new Date(offer.departure_date), "d MMMM", { locale: fr })}</span>
            </div>
            {offer.arrival_date && (
              <div className="flex items-center gap-1.5">
                <Plane className="w-4 h-4 text-muted-foreground" />
                <span>Arrivée: {format(new Date(offer.arrival_date), "d MMM", { locale: fr })}</span>
              </div>
            )}
          </div>
        </motion.div>

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
                <div className={`w-6 h-1 mx-1 rounded ${step > s ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Escrow Flow */}
        {showEscrow && offer && (
          <EscrowPaymentFlow
            orderId=""
            amount={calculations.grandTotal}
            currency={currency}
            gpId={gpProfile.id}
            onPaymentComplete={handleEscrowComplete}
            onCancel={() => setShowEscrow(false)}
          />
        )}

        {!showEscrow && (
          <AnimatePresence mode="wait">
            {/* STEP 1: Content Declaration */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg">Déclaration du contenu</h2>
                </div>

                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Déclarez le contenu de votre envoi. Le système calcule automatiquement le prix selon le type d'article.
                  </p>
                </div>

                {/* Section A: Colis au kilo */}
                <div className="p-4 bg-card border rounded-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-primary" />
                    <h3 className="font-medium">Colis au kilo</h3>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {offer.price_per_kg.toLocaleString()} {currencySymbol}/kg
                    </Badge>
                  </div>

                  <div>
                    <Label className="text-sm">Poids total estimé (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Ex: 5.5"
                      value={kiloWeight}
                      onChange={(e) => setKiloWeight(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* Nature selection - Only show when weight is entered */}
                  {calculations.hasKiloItems && (
                    <div className="space-y-3 pt-3 border-t">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        Nature du contenu <span className="text-destructive">*</span>
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "alimentaire", label: "🍲 Alimentaire" },
                          { id: "vetements", label: "👕 Vêtements" },
                          { id: "tissus", label: "🧵 Tissus" },
                          { id: "autres", label: "📦 Autres" },
                        ].map((nature) => (
                          <button
                            key={nature.id}
                            type="button"
                            onClick={() => toggleKiloNature(nature.id)}
                            className={`
                              flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium
                              ${kiloNatures.includes(nature.id)
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                              }
                            `}
                          >
                            {nature.label}
                            {kiloNatures.includes(nature.id) && (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                        ))}
                      </div>
                      
                      {/* Autres input field */}
                      {kiloNatures.includes("autres") && (
                        <div className="mt-2">
                          <Label className="text-sm text-muted-foreground">Précisez la nature *</Label>
                          <Input
                            placeholder="Ex: jouets, livres, accessoires..."
                            value={autresNature}
                            onChange={(e) => setAutresNature(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      )}

                      {kiloNatures.length === 0 && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Sélectionnez au moins un type de contenu
                        </p>
                      )}
                    </div>
                  )}

                  {calculations.hasKiloItems && kiloNatures.length > 0 && (
                    <div className="flex justify-between items-center pt-3 border-t text-sm">
                      <div>
                        <span className="text-muted-foreground">{calculations.weight} kg × {offer.price_per_kg.toLocaleString()} {currencySymbol}</span>
                        <p className="text-xs text-muted-foreground">{getKiloNatureLabels()}</p>
                      </div>
                      <span className="font-semibold text-primary">{calculations.kiloTotal.toLocaleString()} {currencySymbol}</span>
                    </div>
                  )}
                </div>

                {/* Section B: Articles forfaitaires */}
                {flatRateItems.length > 0 && (
                  <div className="p-4 bg-card border rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-primary" />
                      <h3 className="font-medium">Articles forfaitaires</h3>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Prix fixe par unité — le poids n'est pas pris en compte
                    </p>

                    <div className="space-y-2">
                      {flatRateItems.map((item) => {
                        const Icon = OBJECT_ICONS[item.name] || Package;
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                              item.quantity > 0
                                ? "border-primary/50 bg-primary/5"
                                : "border-border"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              item.quantity > 0 ? "bg-primary/10" : "bg-muted"
                            }`}>
                              <Icon className={`w-5 h-5 ${item.quantity > 0 ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.label}</p>
                              <p className="text-xs text-primary">{item.price.toLocaleString()} {currencySymbol}/unité</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateFlatRateQuantity(item.id, -1)}
                                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                                disabled={item.quantity === 0}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center font-semibold">{item.quantity}</span>
                              <button
                                onClick={() => updateFlatRateQuantity(item.id, 1)}
                                className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {calculations.hasFlatRateItems && (
                      <div className="flex justify-between items-center pt-2 border-t text-sm">
                        <span className="text-muted-foreground">{calculations.flatRateCount} article(s)</span>
                        <span className="font-semibold text-primary">{calculations.flatRateTotal.toLocaleString()} {currencySymbol}</span>
                      </div>
                    )}
                  </div>
                )}

                {!calculations.hasAnyItems && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <p className="text-sm text-destructive">Au moins une des deux sections doit être remplie</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2: Calculation */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg">Calcul automatique</h2>
                </div>

                <div className="p-4 bg-card border rounded-xl space-y-4">
                  {/* Kilo items breakdown */}
                  {calculations.hasKiloItems && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="font-medium">Colis au kilo</p>
                        <p className="text-xs text-muted-foreground">{calculations.weight} kg × {offer.price_per_kg.toLocaleString()} {currencySymbol}</p>
                      </div>
                      <p className="font-semibold">{calculations.kiloTotal.toLocaleString()} {currencySymbol}</p>
                    </div>
                  )}

                  {/* Flat rate items breakdown */}
                  {flatRateItems.filter(i => i.quantity > 0).map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} × {item.price.toLocaleString()} {currencySymbol}</p>
                      </div>
                      <p className="font-semibold">{(item.quantity * item.price).toLocaleString()} {currencySymbol}</p>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2">
                    <p className="text-lg font-bold">Total</p>
                    <p className="text-2xl font-bold text-primary">{calculations.grandTotal.toLocaleString()} {currencySymbol}</p>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground text-center">
                    Formule: <strong>(kg × prix/kg) + Σ(quantité × prix forfaitaire)</strong>
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Restrictions & Validation */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg">Restrictions & validation</h2>
                </div>

                {/* Restrictions list */}
                {(offer.explicit_restrictions?.length || offer.baggage_restrictions) ? (
                  <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl space-y-3">
                    <p className="font-medium text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Articles interdits par ce transporteur
                    </p>
                    
                    {offer.explicit_restrictions && (
                      <div className="flex flex-wrap gap-2">
                        {offer.explicit_restrictions.map((r) => (
                          <Badge key={r} variant="destructive" className="text-xs">
                            {RESTRICTION_LABELS[r] || r}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {offer.baggage_restrictions && (
                      <p className="text-sm text-destructive/80">{offer.baggage_restrictions}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Aucune restriction spécifique pour ce transporteur
                    </p>
                  </div>
                )}

                {/* Conditions */}
                {offer.conditions && (
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="font-medium mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Conditions du transporteur
                    </p>
                    <p className="text-sm text-muted-foreground">{offer.conditions}</p>
                  </div>
                )}

                {/* Acceptance checkbox */}
                <div className="p-4 bg-card border rounded-xl">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={acceptedRestrictions}
                      onCheckedChange={(v) => setAcceptedRestrictions(v === true)}
                      className="mt-0.5"
                    />
                    <span className="text-sm">
                      J'accepte les règles du transporteur et confirme que mon colis respecte les restrictions mentionnées.
                    </span>
                  </label>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Recap */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg">Récapitulatif</h2>
                </div>

                <div className="p-4 bg-card border rounded-xl space-y-4">
                  {/* Route */}
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Trajet</p>
                      <p className="font-semibold">{offer.origin_city} → {offer.destination_city}</p>
                    </div>
                    <Plane className="w-5 h-5 text-primary" />
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Date de départ</p>
                      <p className="font-semibold">{format(new Date(offer.departure_date), "d MMMM yyyy", { locale: fr })}</p>
                    </div>
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {/* Content */}
                  <div className="pb-3 border-b">
                    <p className="text-sm text-muted-foreground mb-2">Contenu déclaré</p>
                    <div className="space-y-1">
                      {calculations.hasKiloItems && (
                        <p className="text-sm">• {calculations.weight} kg (alimentaire/vêtements/tissus)</p>
                      )}
                      {flatRateItems.filter(i => i.quantity > 0).map((item) => (
                        <p key={item.id} className="text-sm">• {item.quantity}× {item.label}</p>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">Total à payer</p>
                    <p className="text-2xl font-bold text-primary">{calculations.grandTotal.toLocaleString()} {currencySymbol}</p>
                  </div>

                  {/* Conditions accepted */}
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Conditions acceptées
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Bottom Navigation */}
      {!showEscrow && (
        <div 
          className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4"
          style={{ paddingBottom: 'calc(16px + var(--safe-bottom, 0px))' }}
        >
          <div className="flex gap-3 max-w-lg mx-auto">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1 h-12">
                Retour
              </Button>
            )}
            
            {step < 4 ? (
              <Button onClick={handleNext} disabled={!canProceed(step)} className="flex-1 h-12">
                Continuer
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 h-12">
                {submitting ? "Réservation..." : "Confirmer la réservation"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
