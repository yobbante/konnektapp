/**
 * RoutierBookingPage — 4-step booking flow for road transport
 * Step 1: Colis (size, weight, dimensions, type)
 * Step 2: Adresses (pickup mode, pickup/delivery addresses, recipient)
 * Step 3: Options (speed, handling, insurance)
 * Step 4: Résumé & Paiement
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Package, MapPin, Settings, CreditCard,
  CheckCircle, Truck, Shield, Scale, Ruler, AlertTriangle,
  Home, Building2, Phone, User, MessageSquare, Zap, HandMetal,
  Loader2, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { getAllSizeCategories, formatPriceFCFA } from "@/lib/routierUtils";

// ─── Constants ───
const SIZE_CATEGORIES = getAllSizeCategories();

const PACKAGE_TYPES = [
  { id: "documents", label: "📄 Documents", icon: "📄" },
  { id: "vetements", label: "👕 Vêtements", icon: "👕" },
  { id: "electronique", label: "💻 Électronique", icon: "💻" },
  { id: "alimentaire", label: "🍎 Alimentaire", icon: "🍎" },
  { id: "pieces_auto", label: "🔧 Pièces auto", icon: "🔧" },
  { id: "fragile", label: "🥚 Fragile", icon: "🥚" },
  { id: "mobilier", label: "🪑 Mobilier", icon: "🪑" },
  { id: "autre", label: "📦 Autre", icon: "📦" },
];

type PickupMode = "depot" | "collecte";
type SpeedOption = "standard" | "prioritaire";

const STEPS = [
  { num: 1, label: "Colis", icon: Package },
  { num: 2, label: "Adresses", icon: MapPin },
  { num: 3, label: "Options", icon: Settings },
  { num: 4, label: "Résumé", icon: CreditCard },
];

export default function RoutierBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const offerId = searchParams.get("offer");
  const gpId = searchParams.get("gp");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Offer & GP data
  const [offer, setOffer] = useState<any>(null);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Step 1: Colis
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [estimatedWeight, setEstimatedWeight] = useState("");
  const [dimensionL, setDimensionL] = useState("");
  const [dimensionW, setDimensionW] = useState("");
  const [dimensionH, setDimensionH] = useState("");
  const [packageType, setPackageType] = useState("");

  // Step 2: Adresses
  const [pickupMode, setPickupMode] = useState<PickupMode>("depot");
  const [pickupCity, setPickupCity] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupLandmark, setPickupLandmark] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  // Step 3: Options
  const [speed, setSpeed] = useState<SpeedOption>("standard");
  const [isFragile, setIsFragile] = useState(false);
  const [isHeavy, setIsHeavy] = useState(false);
  const [needsLoadingHelp, setNeedsLoadingHelp] = useState(false);
  const [wantInsurance, setWantInsurance] = useState(false);
  const [declaredValue, setDeclaredValue] = useState("");

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setCurrentUser(user);

      // Load user profile for pre-fill
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", user.id)
        .maybeSingle();
      setUserProfile(profile);

      if (offerId) {
        const { data: offerData } = await supabase
          .from("gp_offers")
          .select("*")
          .eq("id", offerId)
          .single();
        if (offerData) {
          setOffer(offerData);
          setPickupCity(offerData.origin_city || "");
          setDeliveryCity(offerData.destination_city || "");

          const { data: gp } = await supabase
            .from("gp_profiles")
            .select("id, business_name, phone, deposit_address, rating, total_deliveries")
            .eq("id", offerData.gp_id)
            .single();
          setGpProfile(gp);
        }
      } else if (gpId) {
        const { data: gp } = await supabase
          .from("gp_profiles")
          .select("id, business_name, phone, deposit_address, rating, total_deliveries")
          .eq("id", gpId)
          .single();
        setGpProfile(gp);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Price calculation
  const getSizePrice = (): number => {
    if (!offer || !selectedSize) return 0;
    const priceMap: Record<string, number> = {
      S: offer.price_s || 0,
      M: offer.price_m || 0,
      L: offer.price_l || 0,
      XL: offer.price_xl || 0,
    };
    return priceMap[selectedSize] || 0;
  };

  const getInsuranceFee = (): number => {
    if (!wantInsurance || !declaredValue) return 0;
    const value = parseFloat(declaredValue) || 0;
    // 2% of declared value, min 500 FCFA
    return Math.max(500, Math.round(value * 0.02));
  };

  const getPriorityFee = (): number => {
    if (speed !== "prioritaire") return 0;
    return Math.round(getSizePrice() * 0.25); // 25% surcharge
  };

  const getServiceFee = (): number => {
    return Math.round(getSizePrice() * 0.05); // 5% platform fee
  };

  const getTotalPrice = (): number => {
    return getSizePrice() + getInsuranceFee() + getPriorityFee() + getServiceFee();
  };

  // Validation
  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!selectedSize) { toast({ title: "Sélectionnez une taille", variant: "destructive" }); return false; }
      if (!estimatedWeight || parseFloat(estimatedWeight) <= 0) { toast({ title: "Poids estimé requis", variant: "destructive" }); return false; }
      if (!packageType) { toast({ title: "Choisissez un type de colis", variant: "destructive" }); return false; }
      return true;
    }
    if (s === 2) {
      if (pickupMode === "collecte" && !pickupAddress) { toast({ title: "Adresse de collecte requise", variant: "destructive" }); return false; }
      if (!deliveryAddress) { toast({ title: "Adresse de livraison requise", variant: "destructive" }); return false; }
      if (!recipientName) { toast({ title: "Nom du destinataire requis", variant: "destructive" }); return false; }
      if (!recipientPhone || recipientPhone.length < 8) { toast({ title: "Téléphone destinataire requis", variant: "destructive" }); return false; }
      return true;
    }
    if (s === 3) {
      if (wantInsurance && (!declaredValue || parseFloat(declaredValue) <= 0)) {
        toast({ title: "Valeur estimée requise pour l'assurance", variant: "destructive" }); return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step === 4) { handleSubmit(); return; }
    setStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (step === 1) navigate(-1);
    else setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!currentUser || !offer || !gpProfile) return;
    setSubmitting(true);
    try {
      const orderNumber = "KNK-" + Date.now().toString(36).toUpperCase();
      const weight = parseFloat(estimatedWeight) || 0;

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          client_id: currentUser.id,
          gp_id: gpProfile.id,
          offer_id: offer.id,
          order_number: orderNumber,
          origin_city: pickupCity,
          origin_country: offer.origin_country || "SN",
          destination_city: deliveryCity,
          destination_country: offer.destination_country || "SN",
          weight,
          price_per_kg: sizePrice / Math.max(weight, 1),
          total_price: getTotalPrice(),
          currency: "XOF",
          status: "pending" as any,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          size_category: selectedSize,
          declared_value: wantInsurance ? parseFloat(declaredValue) || 0 : null,
          has_insurance: wantInsurance,
          insurance_amount: wantInsurance ? getInsuranceFee() : 0,
          dimensions: (dimensionL || dimensionW || dimensionH) ? `${dimensionL || 0}x${dimensionW || 0}x${dimensionH || 0}` : null,
          description: [
            `${PACKAGE_TYPES.find(t => t.id === packageType)?.label || packageType} - Taille ${selectedSize}`,
            pickupMode === "collecte" ? `Collecte: ${pickupAddress}` : "Dépôt chez transporteur",
            `Livraison: ${deliveryAddress}`,
            deliveryInstructions ? `Instructions: ${deliveryInstructions}` : "",
            isFragile ? "⚠️ Fragile" : "",
            isHeavy ? "⚠️ Lourd" : "",
            needsLoadingHelp ? "🤝 Assistance chargement" : "",
            speed === "prioritaire" ? "⚡ Prioritaire" : "",
          ].filter(Boolean).join(" | "),
          content_nature: [packageType].filter(Boolean),
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "✅ Réservation confirmée !" });
      navigate(`/tracking/${order.id}`);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <MiniLoader />;
  if (!offer || !gpProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card><CardContent className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="font-semibold">Offre introuvable</p>
          <Button variant="outline" className="mt-3" onClick={() => navigate(-1)}>Retour</Button>
        </CardContent></Card>
      </div>
    );
  }

  const sizePrice = getSizePrice();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center gap-3 px-4 h-12">
          <button onClick={handleBack} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold">Réservation Transport</p>
            <p className="text-[10px] text-muted-foreground">
              {offer.origin_city} → {offer.destination_city}
            </p>
          </div>
          <div className="w-8" />
        </div>
        {/* Progress */}
        <div className="flex px-4 pb-2 gap-1">
          {STEPS.map((s) => (
            <div key={s.num} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className={`h-1 w-full rounded-full transition-all ${
                  step >= s.num ? "bg-primary" : "bg-muted"
                }`}
              />
              <span className={`text-[9px] ${step >= s.num ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full pb-28">
        <AnimatePresence mode="wait">
          {/* ─── STEP 1: Colis ─── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Size selection */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Taille du colis *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SIZE_CATEGORIES.map((size) => {
                    const isSelected = selectedSize === size.label;
                    const price = offer[`price_${size.label.toLowerCase()}`] || 0;
                    return (
                      <button
                        key={size.label}
                        onClick={() => setSelectedSize(size.label)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge className={`${size.bg} ${size.color} border-0 text-xs font-bold`}>
                            {size.label}
                          </Badge>
                          {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{size.description}</p>
                        {price > 0 && (
                          <p className="text-sm font-bold text-primary mt-1">{formatPriceFCFA(price)}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weight */}
              <div>
                <Label className="text-sm font-semibold">Poids estimé (kg) *</Label>
                <div className="relative mt-1">
                  <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={estimatedWeight}
                    onChange={(e) => setEstimatedWeight(e.target.value)}
                    placeholder="Ex: 25"
                    className="pl-10 h-11"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5" /> Dimensions (cm)
                  <span className="text-muted-foreground font-normal text-xs ml-1">optionnel</span>
                </Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <Input type="number" value={dimensionL} onChange={(e) => setDimensionL(e.target.value)} placeholder="L" className="h-10 text-center" />
                  <Input type="number" value={dimensionW} onChange={(e) => setDimensionW(e.target.value)} placeholder="l" className="h-10 text-center" />
                  <Input type="number" value={dimensionH} onChange={(e) => setDimensionH(e.target.value)} placeholder="H" className="h-10 text-center" />
                </div>
              </div>

              {/* Package type */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Type de colis *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PACKAGE_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setPackageType(type.id)}
                      className={`p-2.5 rounded-xl border text-left text-sm transition-all flex items-center gap-2 ${
                        packageType === type.id
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span>{type.icon}</span>
                      <span className="text-xs">{type.label.replace(/^. /, "")}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 2: Adresses ─── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Pickup mode */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Mode de récupération</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPickupMode("depot")}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      pickupMode === "depot" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <Building2 className={`w-5 h-5 mx-auto mb-1 ${pickupMode === "depot" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-xs font-medium">Dépôt chez transporteur</p>
                  </button>
                  <button
                    onClick={() => setPickupMode("collecte")}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      pickupMode === "collecte" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <Home className={`w-5 h-5 mx-auto mb-1 ${pickupMode === "collecte" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-xs font-medium">Collecte à domicile</p>
                  </button>
                </div>
              </div>

              {/* Pickup info */}
              {pickupMode === "depot" && gpProfile?.deposit_address && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-3 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">Adresse de dépôt</p>
                      <p className="text-xs text-muted-foreground">{gpProfile.deposit_address}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {pickupMode === "collecte" && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Ville de départ</Label>
                  <Input value={pickupCity} onChange={(e) => setPickupCity(e.target.value)} className="h-10" />
                  <Label className="text-xs font-semibold">Adresse complète *</Label>
                  <Input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Rue, quartier..." className="h-10" />
                  <Label className="text-xs font-semibold">Point de repère</Label>
                  <Input value={pickupLandmark} onChange={(e) => setPickupLandmark(e.target.value)} placeholder="Près de..." className="h-10" />
                </div>
              )}

              {/* Delivery address */}
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" /> Livraison
                </p>
                <Label className="text-xs font-semibold">Ville d'arrivée</Label>
                <Input value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} className="h-10" />
                <Label className="text-xs font-semibold">Adresse précise *</Label>
                <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Rue, quartier..." className="h-10" />
              </div>

              {/* Recipient */}
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" /> Destinataire
                </p>
                <Label className="text-xs font-semibold">Nom complet *</Label>
                <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Nom du destinataire" className="h-10" />
                <Label className="text-xs font-semibold">Téléphone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="77 123 45 67" className="h-10 pl-10" />
                </div>
                <Label className="text-xs font-semibold">Instructions livraison</Label>
                <Input value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} placeholder="Sonner au portail..." className="h-10" />
              </div>
            </motion.div>
          )}

          {/* ─── STEP 3: Options ─── */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Speed */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Vitesse de livraison</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSpeed("standard")}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      speed === "standard" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <Truck className={`w-5 h-5 mx-auto mb-1 ${speed === "standard" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-xs font-medium">Standard</p>
                    <p className="text-[10px] text-muted-foreground">Délai normal</p>
                  </button>
                  <button
                    onClick={() => setSpeed("prioritaire")}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      speed === "prioritaire" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <Zap className={`w-5 h-5 mx-auto mb-1 ${speed === "prioritaire" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-xs font-medium">Prioritaire</p>
                    <p className="text-[10px] text-muted-foreground">+25% • Plus rapide</p>
                  </button>
                </div>
              </div>

              {/* Handling */}
              <Card>
                <CardContent className="p-3 space-y-3">
                  <p className="text-sm font-semibold">Manipulation spéciale</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox checked={isFragile} onCheckedChange={(v) => setIsFragile(!!v)} />
                    <div>
                      <p className="text-xs font-medium">🥚 Fragile</p>
                      <p className="text-[10px] text-muted-foreground">Manipulation avec précaution</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox checked={isHeavy} onCheckedChange={(v) => setIsHeavy(!!v)} />
                    <div>
                      <p className="text-xs font-medium">🏋️ Lourd</p>
                      <p className="text-[10px] text-muted-foreground">Nécessite équipement spécial</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox checked={needsLoadingHelp} onCheckedChange={(v) => setNeedsLoadingHelp(!!v)} />
                    <div>
                      <p className="text-xs font-medium">🤝 Assistance chargement</p>
                      <p className="text-[10px] text-muted-foreground">Aide pour charger/décharger</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Insurance */}
              <Card className="border-primary/20">
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <p className="text-sm font-semibold">Assurer votre colis</p>
                    </div>
                    <Switch checked={wantInsurance} onCheckedChange={setWantInsurance} />
                  </div>
                  {wantInsurance && (
                    <div className="space-y-2 pt-1">
                      <Label className="text-xs">Valeur estimée du contenu (FCFA) *</Label>
                      <Input
                        type="number"
                        value={declaredValue}
                        onChange={(e) => setDeclaredValue(e.target.value)}
                        placeholder="Ex: 100000"
                        className="h-10"
                      />
                      {declaredValue && parseFloat(declaredValue) > 0 && (
                        <p className="text-xs text-primary font-medium">
                          Prime d'assurance : {formatPriceFCFA(getInsuranceFee())}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── STEP 4: Résumé ─── */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              {/* Route */}
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Trajet</p>
                  <p className="text-sm font-bold">{pickupCity} → {deliveryCity}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    🚚 {gpProfile.business_name}
                  </p>
                </CardContent>
              </Card>

              {/* Colis */}
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Colis</p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary border-0 font-bold">{selectedSize}</Badge>
                    <span className="text-sm">{estimatedWeight} kg</span>
                    <span className="text-xs text-muted-foreground">• {PACKAGE_TYPES.find(t => t.id === packageType)?.label}</span>
                  </div>
                  {(dimensionL || dimensionW || dimensionH) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      📐 {dimensionL || "–"} × {dimensionW || "–"} × {dimensionH || "–"} cm
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Addresses */}
              <Card>
                <CardContent className="p-3 space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Récupération</p>
                    <p className="text-sm">
                      {pickupMode === "depot" ? "📍 Dépôt chez transporteur" : `📍 ${pickupAddress}`}
                    </p>
                  </div>
                  <div className="border-t border-border pt-2">
                    <p className="text-xs font-semibold text-muted-foreground">Livraison</p>
                    <p className="text-sm">📍 {deliveryAddress}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      👤 {recipientName} • {recipientPhone}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Options */}
              {(speed === "prioritaire" || isFragile || isHeavy || needsLoadingHelp) && (
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Options</p>
                    <div className="flex flex-wrap gap-1.5">
                      {speed === "prioritaire" && <Badge variant="secondary" className="text-[10px]">⚡ Prioritaire</Badge>}
                      {isFragile && <Badge variant="secondary" className="text-[10px]">🥚 Fragile</Badge>}
                      {isHeavy && <Badge variant="secondary" className="text-[10px]">🏋️ Lourd</Badge>}
                      {needsLoadingHelp && <Badge variant="secondary" className="text-[10px]">🤝 Assistance</Badge>}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Price breakdown */}
              <Card className="border-primary/30">
                <CardContent className="p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Détail du prix</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span>Transport ({selectedSize})</span>
                      <span className="font-medium">{formatPriceFCFA(getSizePrice())}</span>
                    </div>
                    {speed === "prioritaire" && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Supplément prioritaire</span>
                        <span>{formatPriceFCFA(getPriorityFee())}</span>
                      </div>
                    )}
                    {wantInsurance && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Assurance</span>
                        <span>{formatPriceFCFA(getInsuranceFee())}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>Frais de service Konnekt</span>
                      <span>{formatPriceFCFA(getServiceFee())}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border text-base font-bold text-primary">
                      <span>Total</span>
                      <span>{formatPriceFCFA(getTotalPrice())}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground">
                  En confirmant, votre paiement sera sécurisé et transmis au transporteur après livraison confirmée.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fixed bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
      >
        <div className="max-w-lg mx-auto">
          {step === 4 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-primary">{formatPriceFCFA(getTotalPrice())}</span>
              </div>
              <Button onClick={handleNext} disabled={submitting} className="w-full h-12 gap-2 text-sm font-semibold">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {submitting ? "Traitement..." : "Confirmer et payer"}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {sizePrice > 0 && step >= 1 && (
                <div className="flex-1 flex items-center">
                  <span className="text-xs text-muted-foreground mr-1">
                    {selectedSize ? `Taille ${selectedSize} :` : "À partir de"}
                  </span>
                  <span className="font-bold text-primary">{formatPriceFCFA(sizePrice || getSizePrice())}</span>
                </div>
              )}
              <Button onClick={handleNext} className="flex-1 h-11 gap-2 text-sm font-semibold">
                Continuer <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
