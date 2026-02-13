import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, CheckCircle, AlertTriangle, Info, Smartphone, Laptop, Car, FileText, Gem, Tablet, Gamepad2, Wine, Scale, MapPin, Calendar, Plane, User, Star, Shield, Minus, Plus, ChevronRight, Truck, TrendingDown } from "lucide-react";
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
import { MandatoryInsuranceChoice, type InsuranceChoice } from "@/components/booking/MandatoryInsuranceChoice";
import { LocalLogisticsOptions, type LogisticsOptions } from "@/components/booking/LocalLogisticsOptions";
import { DualCurrencyDisplay, DualCurrencyCompact, CurrencyInfoBanner } from "@/components/booking/DualCurrencyDisplay";
import { FloatingRecap } from "@/components/booking/FloatingRecap";
import { KTPBadge } from "@/components/ktp/KTPBadge";
import { useKTPPublic, type KTPLevel } from "@/hooks/useKTPStatus";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { convertFromFCFA, loadExchangeRates, type ExchangeRate } from "@/lib/currencyUtils";
import { createAutoConversationAfterBooking } from "@/lib/autoChat";
import { normalizeDecimalInput, parseDecimalInput, roundTo2Decimals, formatDecimalDisplay, roundForDatabase } from "@/lib/decimalUtils";
import { useSelfBookingGuard } from "@/hooks/useSelfBookingGuard";
import { getRegressiveInfo } from "@/lib/gpPricingEngine";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RecipientField } from "@/components/booking/RecipientField";
import { MiniLoader } from "@/components/ui/MiniLoader";

// Types
interface GPProfile {
  id: string;
  business_name: string;
  rating: number | null;
  total_deliveries: number | null;
  verified_at: string | null;
  gp_type: string;
  default_currency: string;
  explicit_restrictions: string[] | null;
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
  parfum: Wine
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
  marques: "Marques",
  objets_precieux: "Objets précieux",
  contrefacons: "Contrefaçons",
  liquides: "Liquides",
  perissables: "Périssables",
  dangereux: "Dangereux"
};
export default function SmartBookingPage() {
  const {
    gpId
  } = useParams();
  const [searchParams] = useSearchParams();
  const offerId = searchParams.get("offer");
  const navigate = useNavigate();
  const {
    toast
  } = useToast();

  // PRV Rule 8: Block GP from booking their own departure
  const { isSelfBooking, checking: checkingSelfBooking } = useSelfBookingGuard({ gpId });

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [showEscrow, setShowEscrow] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [recipientData, setRecipientData] = useState<{ name: string; phone: string; userId: string | null }>({ name: "", phone: "", userId: null });

  // Data
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [offer, setOffer] = useState<GPOffer | null>(null);
  const [flatRateItems, setFlatRateItems] = useState<FlatRateItem[]>([]);
  const [weightTiers, setWeightTiers] = useState<{
    min_weight: number;
    max_weight: number;
    price_per_kg: number;
  }[]>([]);

  // Form State - Section A: Colis au kilo
  const [kiloWeight, setKiloWeight] = useState<string>("");
  const [kiloNatures, setKiloNatures] = useState<string[]>([]); // alimentaire, vetements, tissus, autres
  const [autresNature, setAutresNature] = useState<string>("");

  // Form State - Section B: Articles forfaitaires (quantities stored in flatRateItems)

  // Form State - Step 3: Insurance (RÈGLE INS-01)
  const [insuranceChoice, setInsuranceChoice] = useState<InsuranceChoice>({
    hasInsurance: false,
    insuranceAmount: 0,
    tierId: null,
    declaredValue: 0,
    choiceMade: false
  });

  // Form State - Step 4: Validation
  const [acceptedRestrictions, setAcceptedRestrictions] = useState(false);

  // Form State - Logistics Options (Konnekt Logistique)
  const [logisticsOptions, setLogisticsOptions] = useState<LogisticsOptions>({
    pickupEnabled: false,
    deliveryEnabled: false,
    pickupAddress: "",
    pickupCity: "Dakar",
    pickupContactName: "",
    pickupPhone: "",
    pickupWhatsapp: "",
    pickupTimeSlot: "",
    deliveryAddress: "",
    deliveryCity: "Dakar",
    deliveryContactName: "",
    deliveryPhone: "",
    deliveryWhatsapp: "",
    deliveryInstructions: "",
    pickupPrice: 0,
    deliveryPrice: 0,
    totalLogisticsPrice: 0,
    termsAccepted: true
  });

  // Load data
  useEffect(() => {
    loadData();
    restoreBookingState();
  }, [gpId, offerId]);

  // V2: Restore booking state after auth redirect
  const restoreBookingState = () => {
    const saved = sessionStorage.getItem("pending_booking_complete");
    if (!saved) return;
    try {
      const state = JSON.parse(saved);
      // Check if it's for this GP
      if (state.gpId === gpId && Date.now() - state.timestamp < 30 * 60 * 1000) {
        // Restore form state
        if (state.kiloWeight) setKiloWeight(state.kiloWeight);
        if (state.kiloNatures) setKiloNatures(state.kiloNatures);
        if (state.autresNature) setAutresNature(state.autresNature);
        if (state.insuranceChoice) setInsuranceChoice(state.insuranceChoice);
        if (state.logisticsOptions) setLogisticsOptions(state.logisticsOptions);
        if (state.acceptedRestrictions) setAcceptedRestrictions(state.acceptedRestrictions);

        // Restore flat rate quantities
        if (state.flatRateItems && state.flatRateItems.length > 0) {
          setFlatRateItems(prev => prev.map(item => {
            const savedItem = state.flatRateItems.find((s: any) => s.id === item.id);
            return savedItem ? {
              ...item,
              quantity: savedItem.quantity
            } : item;
          }));
        }

        // Jump to final step
        setStep(5);

        // Clean up
        sessionStorage.removeItem("pending_booking_complete");
        toast({
          title: "Réservation restaurée",
          description: "Finalisez votre paiement pour confirmer"
        });
      }
    } catch {
      sessionStorage.removeItem("pending_booking_complete");
    }
  };
  const loadData = async () => {
    try {
      // Check auth
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        // V2: Allow guest browsing - auth required only at final step
        setIsGuest(true);
      }
      if (!gpId) {
        navigate("/offres");
        return;
      }

      // Fetch GP profile
      const {
        data: gpData,
        error: gpError
      } = await supabase.from("gp_profiles").select("id, business_name, rating, total_deliveries, verified_at, gp_type, default_currency, explicit_restrictions").eq("id", gpId).single();
      if (gpError || !gpData) {
        toast({
          title: "Transporteur non trouvé",
          variant: "destructive"
        });
        navigate("/offres");
        return;
      }
      setGpProfile(gpData);

      // Fetch offer (either specific or most recent active)
      let offerQuery = supabase.from("gp_offers").select("*").eq("gp_id", gpId).eq("status", "active");
      if (offerId) {
        offerQuery = offerQuery.eq("id", offerId);
      } else {
        offerQuery = offerQuery.order("departure_date", {
          ascending: true
        }).limit(1);
      }
      const {
        data: offerData
      } = await offerQuery.single();
      if (offerData) {
        setOffer(offerData);
      }

      // Fetch GP's flat-rate pricing
      const {
        data: flatRates
      } = await supabase.from("gp_flat_rate_pricing").select(`
          id,
          object_type_id,
          price,
          flat_rate_object_types!inner(name, label)
        `).eq("gp_id", gpId).eq("is_active", true);
      if (flatRates) {
        setFlatRateItems(flatRates.map((fr: any) => ({
          id: fr.id,
          object_type_id: fr.object_type_id,
          name: fr.flat_rate_object_types.name,
          label: fr.flat_rate_object_types.label,
          price: fr.price,
          quantity: 0
        })));
      }

      // Fetch GP's weight tiers for tiered pricing
      const {
        data: tiersData
      } = await supabase.from("gp_weight_tiers").select("min_weight, max_weight, price_per_kg").eq("gp_id", gpId).eq("is_active", true).order("min_weight", {
        ascending: true
      });
      if (tiersData && tiersData.length > 0) {
        setWeightTiers(tiersData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erreur de chargement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals - TARIFICATION V2 avec paliers de poids
  // Formule: Prix = getWeightPrice(Poids) + Σ(Quantité × Prix forfaitaire) + Assurance + Logistique
  // V3: Support des décimales à 2 chiffres
  const calculations = useMemo(() => {
    const weight = parseDecimalInput(kiloWeight);

    let pricePerKg = offer?.price_per_kg || 0;
    let appliedTier = null;
    const basePricePerKg = offer?.price_per_kg || 0;

    if (weightTiers.length > 0 && weight > 0) {
      const tier = weightTiers.find(t => weight >= t.min_weight && weight <= t.max_weight);
      if (tier && tier.price_per_kg > 0) {
        pricePerKg = tier.price_per_kg;
        appliedTier = tier;
      } else if (weight > 23) {
        // 23kg+ packages: coefficient x0.80
        pricePerKg = Math.round(basePricePerKg * 0.80);
        appliedTier = { min_weight: 23, max_weight: 999, price_per_kg: pricePerKg };
      }
    } else if (weight > 23 && basePricePerKg > 0) {
      // Fallback: apply x0.80 coefficient for 23kg+
      pricePerKg = Math.round(basePricePerKg * 0.80);
      appliedTier = { min_weight: 23, max_weight: 999, price_per_kg: pricePerKg };
    }

    // Regressive pricing info for display
    const regressiveInfo = weight > 0 && basePricePerKg > 0
      ? getRegressiveInfo(weight, basePricePerKg)
      : null;

    const kiloTotal = roundTo2Decimals(weight * pricePerKg);
    const flatRateTotal = flatRateItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const flatRateCount = flatRateItems.reduce((sum, item) => sum + item.quantity, 0);
    const transportTotal = roundTo2Decimals(kiloTotal + flatRateTotal);

    const rawInsurance = insuranceChoice.hasInsurance ? insuranceChoice.insuranceAmount : 0;
    const insuranceTotal = rawInsurance;
    const logisticsTotal = logisticsOptions.totalLogisticsPrice;
    const grandTotal = roundTo2Decimals(transportTotal + insuranceTotal + logisticsTotal);

    return {
      weight,
      kiloTotal,
      flatRateTotal,
      flatRateCount,
      transportTotal,
      insuranceTotal,
      logisticsTotal,
      grandTotal,
      hasKiloItems: weight > 0,
      hasFlatRateItems: flatRateCount > 0,
      hasAnyItems: weight > 0 || flatRateCount > 0,
      hasLogistics: logisticsOptions.pickupEnabled || logisticsOptions.deliveryEnabled,
      pricePerKg,
      appliedTier,
      basePricePerKg,
      regressiveInfo,
    };
  }, [kiloWeight, flatRateItems, offer?.price_per_kg, insuranceChoice, logisticsOptions, weightTiers]);

  // Update flat-rate quantity
  const updateFlatRateQuantity = (id: string, delta: number) => {
    setFlatRateItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return {
          ...item,
          quantity: newQty
        };
      }
      return item;
    }));
  };

  // Get all selected content types for insurance
  const getAllContentTypes = (): string[] => {
    const types = [...kiloNatures];
    flatRateItems.filter(i => i.quantity > 0).forEach(i => types.push(i.name));
    return types;
  };

  // Validation - Updated for 4 steps (merged calculation+insurance)
  const canProceed = (currentStep: number): boolean => {
    if (currentStep === 1) {
      // Must have items AND if kilo items, must have nature selected
      if (!calculations.hasAnyItems) return false;
      if (calculations.hasKiloItems && kiloNatures.length === 0) return false;
      if (kiloNatures.includes("autres") && !autresNature.trim()) return false;
      return true;
    }
    if (currentStep === 2) {
      // RÈGLE INS-01: Choix assurance obligatoire
      return insuranceChoice.choiceMade;
    }
    if (currentStep === 3) {
      return acceptedRestrictions;
    }
    return true;
  };

  // Toggle kilo nature
  const toggleKiloNature = (nature: string) => {
    setKiloNatures(prev => prev.includes(nature) ? prev.filter(n => n !== nature) : [...prev, nature]);
  };

  // Navigation - 4 steps now (merged calc+insurance)
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
      } else if (step === 2) {
        toast({ title: "Choix d'assurance requis", description: "Vous devez faire un choix d'assurance pour continuer", variant: "destructive" });
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
    // PRV Rule 8: Block self-booking
    if (isSelfBooking) {
      toast({
        title: "Action impossible",
        description: "Vous ne pouvez pas réserver votre propre départ",
        variant: "destructive"
      });
      return;
    }

    if (!canProceed(3)) {
      toast({ title: "Veuillez accepter les conditions", variant: "destructive" });
      return;
    }

    // V2: If guest, require auth now (at the very end)
    if (isGuest || !userId) {
      // Save complete booking state for post-auth resume
      sessionStorage.setItem("pending_booking_complete", JSON.stringify({
        gpId,
        offerId,
        kiloWeight,
        kiloNatures,
        autresNature,
        flatRateItems: flatRateItems.filter(i => i.quantity > 0),
        insuranceChoice,
        logisticsOptions,
        acceptedRestrictions,
        returnPath: `/reservation/gp/${gpId}${offerId ? `?offer=${offerId}` : ""}`,
        timestamp: Date.now()
      }));
      toast({
        title: "Connexion requise",
        description: "Créez un compte ou connectez-vous pour finaliser votre réservation"
      });
      navigate("/auth?returnBooking=true");
      return;
    }

    // Complete booking first, then show escrow if needed
    await completeBooking();
  };
  const completeBooking = async () => {
    if (!userId || !gpProfile || !offer) return;
    setSubmitting(true);
    try {
      // Create order with insurance info
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const {
        data: orderData,
        error: orderError
      } = await supabase.from("orders").insert({
        client_id: userId,
        gp_id: gpProfile.id,
        offer_id: offer.id,
        origin_city: offer.origin_city,
        origin_country: offer.origin_country,
        destination_city: offer.destination_city,
        destination_country: offer.destination_country,
        price_per_kg: offer.price_per_kg,
        // V3 FIX DÉFINITIF: PostgreSQL integer columns require integer values
        // weight is NUMERIC (accepts decimals), but total_price/insurance_amount are INTEGER
        weight: calculations.weight,
        // NUMERIC column - keep decimal precision
        total_price: Math.round(displayGrandTotal),
        // INTEGER column - must be whole number
        currency: offer.currency,
        status: "pending" as const,
        logistics_status: "submitted",
        order_number: orderNumber,
        description: buildOrderDescription(),
        // Insurance fields
        has_insurance: insuranceChoice.hasInsurance,
        insurance_amount: Math.round(displayInsuranceAmount || 0),
        // INTEGER column
        insurance_tier_id: insuranceChoice.tierId,
        declared_value: insuranceChoice.declaredValue ? Math.round(insuranceChoice.declaredValue) : null,
        // INTEGER column
        content_nature: kiloNatures,
        content_nature_other: kiloNatures.includes("autres") ? autresNature : null,
        recipient_name: recipientData?.name || null,
        recipient_phone: recipientData?.phone || null,
        recipient_user_id: recipientData?.userId || null,
      }).select("id").single();
      if (orderError) throw orderError;

      // Save the order ID for escrow
      setCreatedOrderId(orderData.id);

      // Create order logistics
      const {
        error: logisticsError
      } = await supabase.from("order_logistics").insert({
        order_id: orderData.id,
        merchandise_type: getMerchandiseType(),
        merchandise_description: buildOrderDescription(),
        estimated_weight: calculations.weight,
        // NUMERIC column - keep decimal
        is_fragile: false,
        is_urgent: false,
        pickup_address: logisticsOptions.pickupEnabled ? logisticsOptions.pickupAddress : "À confirmer",
        delivery_address: logisticsOptions.deliveryEnabled ? logisticsOptions.deliveryAddress : "À confirmer",
        pickup_date: offer.departure_date,
        validated_at: new Date().toISOString()
      });
      if (logisticsError) throw logisticsError;

      // Create logistics options if enabled (Konnekt Logistique)
      if (logisticsOptions.pickupEnabled || logisticsOptions.deliveryEnabled) {
        const {
          error: logOptError
        } = await supabase.from("order_logistics_options").insert({
          order_id: orderData.id,
          pickup_enabled: logisticsOptions.pickupEnabled,
          pickup_address: logisticsOptions.pickupAddress || null,
          pickup_city: logisticsOptions.pickupCity,
          pickup_contact_name: logisticsOptions.pickupContactName || null,
          pickup_phone: logisticsOptions.pickupPhone || null,
          pickup_whatsapp: logisticsOptions.pickupWhatsapp || null,
          pickup_time_slot: logisticsOptions.pickupTimeSlot || null,
          pickup_price: logisticsOptions.pickupPrice,
          delivery_enabled: logisticsOptions.deliveryEnabled,
          delivery_address: logisticsOptions.deliveryAddress || null,
          delivery_city: logisticsOptions.deliveryCity,
          delivery_contact_name: logisticsOptions.deliveryContactName || null,
          delivery_phone: logisticsOptions.deliveryPhone || null,
          delivery_whatsapp: logisticsOptions.deliveryWhatsapp || null,
          delivery_instructions: logisticsOptions.deliveryInstructions || null,
          delivery_price: logisticsOptions.deliveryPrice,
          total_logistics_price: logisticsOptions.totalLogisticsPrice,
          currency: offer.currency,
          terms_accepted_at: new Date().toISOString()
        });
        if (logOptError) {
          console.error("Logistics options error:", logOptError);
          // Don't fail the whole booking for this
        }
      }

      // For bagages_international, show escrow payment after order creation
      if (gpProfile.gp_type === "bagages_international") {
        setShowEscrow(true);
        setSubmitting(false);
        return;
      }

      // Create auto conversation
      await createAutoConversationAfterBooking(userId, gpProfile.id, orderData.id, {
        orderNumber,
        originCity: offer.origin_city,
        destinationCity: offer.destination_city,
        gpName: gpProfile.business_name
      });
      toast({
        title: "🎉 Réservation confirmée !",
        description: "Redirection vers la confirmation..."
      });

      // Redirect to confirmation page instead of messages
      navigate(`/booking/confirmation/${orderData.id}`);
    } catch (error) {
      console.error("Booking error:", error);
      toast({
        title: "Erreur de réservation",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };
  const handleEscrowComplete = async () => {
    if (!userId || !gpProfile || !createdOrderId) return;
    setShowEscrow(false);

    // Create auto conversation after escrow payment
    await createAutoConversationAfterBooking(userId, gpProfile.id, createdOrderId, {
      orderNumber: `ORD-${createdOrderId.slice(0, 8).toUpperCase()}`,
      originCity: offer?.origin_city || "",
      destinationCity: offer?.destination_city || "",
      gpName: gpProfile.business_name
    });
    toast({
      title: "🎉 Réservation confirmée !",
      description: "Paiement sécurisé. Redirection..."
    });

    // Redirect to confirmation page instead of messages
    navigate(`/booking/confirmation/${createdOrderId}`);
  };

  // Helpers
  const getKiloNatureLabels = (): string => {
    const labels: Record<string, string> = {
      alimentaire: "Alimentaire",
      vetements: "Vêtements",
      tissus: "Tissus",
      autres: autresNature || "Autres"
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

  // V1.2: La devise est imposée par le GP - Le client ne peut pas la modifier
  const currency = offer?.currency || gpProfile?.default_currency || "XOF";
  const currencySymbol = getCurrencySymbol(currency);

  // Hook for currency conversion with dual display
  const {
    formatDual,
    getFCFAEquivalent,
    fromFCFA,
    isFCFA,
    rates
  } = useCurrencyConversion({
    gpCurrency: currency
  });

  /**
   * V1.3 FIX: L'assurance et la logistique sont stockées en FCFA
   * Cette fonction convertit un montant FCFA vers la devise GP pour affichage
   * V3: Garde les décimales pour l'affichage
   */
  const convertFCFAtoGP = (amountFCFA: number): number => {
    if (isFCFA || !amountFCFA) return roundTo2Decimals(amountFCFA);
    return roundTo2Decimals(fromFCFA(amountFCFA));
  };

  /**
   * V1.3: Montants d'assurance et logistique convertis pour l'affichage
   * - insuranceTotal est en FCFA (stocké)
   * - logisticsTotal est en FCFA (stocké)
   * On les convertit en devise GP pour l'affichage
   * V3: Garde les décimales pour l'affichage
   */
  const displayInsuranceAmount = convertFCFAtoGP(calculations.insuranceTotal);
  const displayLogisticsAmount = convertFCFAtoGP(calculations.logisticsTotal);

  /**
   * V1.3 FIX: Le total doit être recalculé avec les montants convertis
   * Transport est DÉJÀ en devise GP
   * Assurance + Logistique doivent être convertis de FCFA vers GP
   * V3: Garde les décimales pour l'affichage, arrondi uniquement pour la DB
   */
  const displayGrandTotal = roundTo2Decimals(calculations.transportTotal + displayInsuranceAmount + displayLogisticsAmount);
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <MiniLoader size="lg" showText text="Chargement..." />
      </div>;
  }
  if (!gpProfile || !offer) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Offre non disponible</p>
          <Button onClick={() => navigate("/offres")} className="mt-4">
            Voir les offres
          </Button>
        </div>
      </div>;
  }
    return <div className="min-h-screen bg-background" style={{
    paddingBottom: `calc(${step === 4 ? 100 : 220}px + var(--safe-bottom, 0px))`
  }}>
      <MobileHeader showScanButton={false} />

      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Réservation intelligente</h1>
            <p className="text-sm text-muted-foreground">{gpProfile.business_name}</p>
          </div>
        </div>

        {/* Progress - 4 steps */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {[1, 2, 3, 4].map(s => <div key={s} className="flex items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {step > s ? <CheckCircle className="w-3 h-3" /> : s}
              </div>
              {s < 4 && <div className={`w-6 h-0.5 mx-0.5 rounded ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>)}
        </div>

        {/* Escrow Flow */}
        {showEscrow && offer && createdOrderId && <EscrowPaymentFlow orderId={createdOrderId} amount={displayGrandTotal} currency={currency} gpId={gpProfile.id} onPaymentComplete={handleEscrowComplete} onCancel={() => {
        setShowEscrow(false);
        navigate("/messages");
      }} />}

        {!showEscrow && <AnimatePresence mode="wait">
            {/* STEP 1: Content Declaration */}
            {step === 1 && <motion.div key="step1" initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} exit={{
          opacity: 0,
          x: -20
        }} className="space-y-6">
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
                      {!isFCFA ? <DualCurrencyCompact amount={offer.price_per_kg} currency={currency} fcfaEquivalent={getFCFAEquivalent(offer.price_per_kg)} /> : <span>{offer.price_per_kg.toLocaleString()} FCFA/kg</span>}
                    </Badge>
                  </div>

                  <div>
                    <Label className="text-sm">Poids total estimé (kg)</Label>
                    <Input type="text" inputMode="decimal" placeholder="Ex: 5,5 ou 5.5" value={kiloWeight} onChange={e => setKiloWeight(normalizeDecimalInput(e.target.value))} className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Accepte virgule (5,5) ou point (5.5) comme séparateur décimal
                    </p>
                  </div>

                  {/* Nature selection - Only show when weight is entered */}
                  {calculations.hasKiloItems && <div className="space-y-3 pt-3 border-t">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        Nature du contenu <span className="text-destructive">*</span>
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[{
                  id: "alimentaire",
                  label: "🍲 Alimentaire"
                }, {
                  id: "vetements",
                  label: "👕 Vêtements"
                }, {
                  id: "tissus",
                  label: "🧵 Tissus"
                }, {
                  id: "autres",
                  label: "📦 Autres"
                }].map(nature => <button key={nature.id} type="button" onClick={() => toggleKiloNature(nature.id)} className={`
                              flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium
                              ${kiloNatures.includes(nature.id) ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"}
                            `}>
                            {nature.label}
                            {kiloNatures.includes(nature.id) && <CheckCircle className="w-4 h-4" />}
                          </button>)}
                      </div>
                      
                      {/* Autres input field */}
                      {kiloNatures.includes("autres") && <div className="mt-2">
                          <Label className="text-sm text-muted-foreground">Précisez la nature *</Label>
                          <Input placeholder="Ex: jouets, livres, accessoires..." value={autresNature} onChange={e => setAutresNature(e.target.value)} className="mt-1" />
                        </div>}

                      {kiloNatures.length === 0 && <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Sélectionnez au moins un type de contenu
                        </p>}
                    </div>}

                  {calculations.hasKiloItems && kiloNatures.length > 0 && <div className="flex justify-between items-center pt-3 border-t text-sm">
                      <div>
                        <span className="text-muted-foreground">{calculations.weight} kg × {offer.price_per_kg.toLocaleString()} {currencySymbol}</span>
                        <p className="text-xs text-muted-foreground">{getKiloNatureLabels()}</p>
                      </div>
                      <DualCurrencyDisplay amount={calculations.kiloTotal} currency={currency} fcfaEquivalent={getFCFAEquivalent(calculations.kiloTotal)} size="md" variant="primary" />
                    </div>}
                </div>

                {/* Section B: Articles forfaitaires */}
                {flatRateItems.length > 0 && <div className="p-4 bg-card border rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-primary" />
                      <h3 className="font-medium">Articles forfaitaires</h3>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Prix fixe par unité — le poids n'est pas pris en compte
                    </p>

                    <div className="space-y-2">
                      {flatRateItems.map(item => {
                const Icon = OBJECT_ICONS[item.name] || Package;
                return <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${item.quantity > 0 ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.quantity > 0 ? "bg-primary/10" : "bg-muted"}`}>
                              <Icon className={`w-5 h-5 ${item.quantity > 0 ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.label}</p>
                              <p className="text-xs text-primary">{item.price.toLocaleString()} {currencySymbol}/unité</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button onClick={() => updateFlatRateQuantity(item.id, -1)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" disabled={item.quantity === 0}>
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center font-semibold">{item.quantity}</span>
                              <button onClick={() => updateFlatRateQuantity(item.id, 1)} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>;
              })}
                    </div>

                    {calculations.hasFlatRateItems && <div className="flex justify-between items-center pt-2 border-t text-sm">
                        <span className="text-muted-foreground">{calculations.flatRateCount} article(s)</span>
                        <DualCurrencyDisplay amount={calculations.flatRateTotal} currency={currency} fcfaEquivalent={getFCFAEquivalent(calculations.flatRateTotal)} size="md" variant="primary" />
                      </div>}
                  </div>}

                {/* Route Summary Card - Moved here, after articles forfaitaires */}
                <motion.div initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
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
                      <span>Départ: {format(new Date(offer.departure_date), "d MMMM", {
                    locale: fr
                  })}</span>
                    </div>
                    {offer.arrival_date && <div className="flex items-center gap-1.5">
                        <Plane className="w-4 h-4 text-muted-foreground" />
                        <span>Arrivée: {format(new Date(offer.arrival_date), "d MMM", {
                    locale: fr
                  })}</span>
                      </div>}
                  </div>
                </motion.div>

                {!calculations.hasAnyItems && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <p className="text-sm text-destructive">Au moins une des deux sections doit être remplie</p>
                  </div>}
              </motion.div>}

            {/* STEP 2: Calcul + Assurance + Logistique (merged) */}
            {step === 2 && <motion.div key="step2" initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} exit={{
          opacity: 0,
          x: -20
        }} className="space-y-6">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg">Calcul & protection</h2>
                </div>

                {/* Price breakdown */}
                <div className="p-4 bg-card border rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">Sous-total transport</p>
                    <p className="text-xs text-muted-foreground">
                      {calculations.hasKiloItems && `${calculations.weight}kg`}
                      {calculations.hasKiloItems && calculations.flatRateCount > 0 && ' + '}
                      {calculations.flatRateCount > 0 && `${calculations.flatRateCount} article${calculations.flatRateCount > 1 ? 's' : ''}`}
                      {' · Détails dans le récap ↓'}
                    </p>
                  </div>
                  <DualCurrencyCompact amount={calculations.transportTotal} currency={currency} fcfaEquivalent={getFCFAEquivalent(calculations.transportTotal)} />
                </div>

                {/* Logistics Options */}
                <LocalLogisticsOptions weight={calculations.weight} isFragile={false} originCity={offer.origin_city} destinationCity={offer.destination_city} currency={currency} onChange={setLogisticsOptions} />

                {/* Insurance - inline */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Assurance</h3>
                    <Badge variant="outline" className="text-[10px] ml-auto">Obligatoire</Badge>
                  </div>
                  <MandatoryInsuranceChoice selectedContentTypes={getAllContentTypes()} currency={currency as any} onChoiceChange={setInsuranceChoice} />
                </div>

                {/* Total preview */}
                {insuranceChoice.choiceMade && <div className="p-4 bg-card border rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Transport</span>
                      <DualCurrencyCompact amount={calculations.transportTotal} currency={currency} fcfaEquivalent={getFCFAEquivalent(calculations.transportTotal)} />
                    </div>
                    {insuranceChoice.hasInsurance && <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Assurance</span>
                      <DualCurrencyCompact amount={displayInsuranceAmount} currency={currency} fcfaEquivalent={calculations.insuranceTotal} />
                    </div>}
                    {calculations.hasLogistics && <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Logistique</span>
                      <DualCurrencyCompact amount={displayLogisticsAmount} currency={currency} fcfaEquivalent={calculations.logisticsTotal} />
                    </div>}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Total</span>
                      <DualCurrencyDisplay amount={displayGrandTotal} currency={currency} fcfaEquivalent={calculations.transportTotal > 0 ? getFCFAEquivalent(calculations.transportTotal) + calculations.insuranceTotal + calculations.logisticsTotal : 0} size="xl" variant="primary" />
                    </div>
                    <CurrencyInfoBanner className="mt-2" />
                  </div>}
              </motion.div>}

            {/* STEP 3: Restrictions & Validation */}
            {step === 3 && <motion.div key="step3" initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} exit={{
          opacity: 0,
          x: -20
        }} className="space-y-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg">Restrictions & validation</h2>
                </div>

                {/* Restrictions list */}
               {gpProfile.explicit_restrictions?.length || offer.explicit_restrictions?.length || offer.baggage_restrictions ? <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl space-y-3">
                    <p className="font-medium text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Articles interdits par ce transporteur
                    </p>
                    
                   {/* Restrictions from GP profile */}
                   {gpProfile.explicit_restrictions && gpProfile.explicit_restrictions.length > 0 && <div className="flex flex-wrap gap-2">
                       {gpProfile.explicit_restrictions.map(r => <Badge key={r} variant="destructive" className="text-xs">
                           {RESTRICTION_LABELS[r] || r}
                         </Badge>)}
                     </div>}
                   
                   {/* Restrictions from offer */}
                   {offer.explicit_restrictions && offer.explicit_restrictions.length > 0 && <div className="flex flex-wrap gap-2">
                        {offer.explicit_restrictions.map(r => <Badge key={r} variant="destructive" className="text-xs">
                            {RESTRICTION_LABELS[r] || r}
                          </Badge>)}
                      </div>}

                    {offer.baggage_restrictions && <p className="text-sm text-destructive/80">{offer.baggage_restrictions}</p>}
                  </div> : <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Aucune restriction spécifique pour ce transporteur
                    </p>
                  </div>}

                {/* Conditions */}
                {offer.conditions && <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="font-medium mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Conditions du transporteur
                    </p>
                    <p className="text-sm text-muted-foreground">{offer.conditions}</p>
                  </div>}

                {/* Acceptance checkbox */}
                <div className="p-4 bg-card border rounded-xl">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={acceptedRestrictions} onCheckedChange={v => setAcceptedRestrictions(v === true)} className="mt-0.5" />
                    <span className="text-sm">
                      J'accepte les règles du transporteur et confirme que mon colis respecte les restrictions mentionnées.
                    </span>
                  </label>
                </div>
              </motion.div>}

            {/* STEP 4: Recap */}
            {step === 4 && <motion.div key="step4" initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} exit={{
          opacity: 0,
          x: -20
        }} className="space-y-6">
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
                      <p className="font-semibold">{format(new Date(offer.departure_date), "d MMMM yyyy", {
                    locale: fr
                  })}</p>
                    </div>
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {/* Content */}
                  <div className="pb-3 border-b">
                    <p className="text-sm text-muted-foreground mb-2">Contenu déclaré</p>
                    <div className="space-y-1">
                      {calculations.hasKiloItems && <p className="text-sm">• {calculations.weight} kg ({getKiloNatureLabels()})</p>}
                      {flatRateItems.filter(i => i.quantity > 0).map(item => <p key={item.id} className="text-sm">• {item.quantity}× {item.label}</p>)}
                    </div>
                  </div>

                  {/* Insurance status */}
                  <div className="pb-3 border-b">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${insuranceChoice.hasInsurance ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-sm">
                        {insuranceChoice.hasInsurance ? `Assurance Konnekt: ${displayInsuranceAmount.toLocaleString()} ${currencySymbol} (≈ ${calculations.insuranceTotal.toLocaleString()} FCFA)` : "Sans assurance"}
                      </span>
                    </div>
                  </div>

                  {/* Logistics status */}
                  {calculations.hasLogistics && <div className="pb-3 border-b">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Konnekt Logistique</span>
                      </div>
                      <div className="ml-6 text-xs text-muted-foreground space-y-1 mt-1">
                        {logisticsOptions.pickupEnabled && <p>• Enlèvement: {logisticsOptions.pickupAddress}</p>}
                        {logisticsOptions.deliveryEnabled && <p>• Livraison: {logisticsOptions.deliveryAddress}</p>}
                      </div>
                    </div>}

                  {/* Price breakdown with dual currency */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Transport</span>
                      <DualCurrencyCompact amount={calculations.transportTotal} currency={currency} fcfaEquivalent={getFCFAEquivalent(calculations.transportTotal)} />
                    </div>
                    {insuranceChoice.hasInsurance && <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Assurance</span>
                        <DualCurrencyCompact amount={displayInsuranceAmount} currency={currency} fcfaEquivalent={calculations.insuranceTotal} />
                      </div>}
                    {calculations.hasLogistics && <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Logistique locale</span>
                        <DualCurrencyCompact amount={displayLogisticsAmount} currency={currency} fcfaEquivalent={calculations.logisticsTotal} />
                      </div>}
                  </div>

                  {/* Total with dual currency */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <p className="font-semibold">Total à payer</p>
                    <DualCurrencyDisplay amount={displayGrandTotal} currency={currency} fcfaEquivalent={calculations.transportTotal > 0 ? getFCFAEquivalent(calculations.transportTotal) + calculations.insuranceTotal + calculations.logisticsTotal : 0} size="xl" variant="primary" />
                  </div>
                  
                  {/* Currency info */}
                  <CurrencyInfoBanner className="mt-3" />

                  {/* Conditions accepted */}
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Conditions acceptées
                  </div>
                </div>
              </motion.div>}
          </AnimatePresence>}
      </div>

      {/* Recipient Field - integrated in step 1 area */}
      {!showEscrow && step === 1 && (
        <div className="px-4 pb-2">
          <RecipientField
            recipientName={recipientData.name}
            recipientPhone={recipientData.phone}
            recipientUserId={recipientData.userId}
            onRecipientChange={setRecipientData}
          />
        </div>
      )}

      {/* Floating Recap - Always visible except step 4 */}
      {!showEscrow && <FloatingRecap weight={calculations.weight} flatRateCount={calculations.flatRateCount} transportTotal={calculations.transportTotal} insuranceTotal={displayInsuranceAmount} logisticsTotal={displayLogisticsAmount} grandTotal={displayGrandTotal} currency={currency} getFCFAEquivalent={getFCFAEquivalent} hasInsurance={insuranceChoice.hasInsurance} hasLogistics={calculations.hasLogistics} currentStep={step} pricePerKg={offer?.price_per_kg} flatRateItems={flatRateItems.filter(i => i.quantity > 0)} />}

      {/* Bottom Navigation */}
      {!showEscrow && <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50" style={{
      paddingBottom: 'calc(16px + var(--safe-bottom, 0px))'
    }}>
          <div className="flex gap-3 max-w-lg mx-auto">
            {step > 1 && <Button variant="outline" onClick={handleBack} className="flex-1 h-12">
                Retour
              </Button>}
            
            {step < 4 ? <Button onClick={handleNext} disabled={!canProceed(step)} className="flex-1 h-12">
                Continuer
              </Button> : <Button onClick={handleSubmit} disabled={submitting} className="flex-1 h-12">
                {submitting ? "Réservation..." : "Confirmer la réservation"}
              </Button>}
          </div>
        </div>}
    </div>;
}