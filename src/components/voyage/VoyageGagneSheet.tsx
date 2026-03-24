/**
 * VoyageGagneSheet — "Voyage & Gagne" flow
 * Allows any client to publish a trip and become a GP Occasionnel.
 * 4 steps: Intro → Trip details → Pricing (kg + flat-rate) → Summary & Publish
 * Persists form data to localStorage for pre-fill on next use.
 * Syncs data to GP profile on creation/update.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plane, MapPin, Calendar, Weight, DollarSign, Luggage, 
  ChevronRight, ChevronLeft, Sparkles, ArrowRight, Info, Check, Phone, MapPinned, Shield,
  ArrowUpDown, Package, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { SearchableCitySelect } from "@/components/gp/SearchableCitySelect";
import { canPublishDepartureDate } from "@/lib/premiumGating";
import { getPhoneIndicatifForCity, getAddressPlaceholder, getPricePlaceholder, getCurrencySymbol } from "@/lib/cityUtils";
import { CurrencySelector, type CurrencyCode } from "@/components/ui/currency-selector";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle
} from "@/components/ui/drawer";

interface VoyageGagneSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skipIntro?: boolean;
}

type Step = "intro" | "details" | "pricing" | "summary";
import { AirlineSelect } from "@/components/gp/AirlineSelect";

const STEPS: Step[] = ["intro", "details", "pricing", "summary"];

const SUGGESTED_PRICE = 8;
const SUGGESTED_CAPACITY = 20;
const BAGGAGE_PRESETS = [
  { label: "1 bagage (23kg)", count: 1, capacity: 20 },
  { label: "2 bagages (46kg)", count: 2, capacity: 40 },
  { label: "3 bagages (69kg)", count: 3, capacity: 60 },
];

const STORAGE_KEY = "voyage_gagne_saved_data";

interface FlatRateItem {
  id: string;
  label: string;
  defaultPrice: number | null;
  price: string;
  isActive: boolean;
}

interface SavedVoyageData {
  originCity: string;
  originCountry: string;
  destCity: string;
  destCountry: string;
  depositPhone: string;
  depositAddress: string;
  receptionPhone: string;
  receptionAddress: string;
  pricePerKg: number;
  baggageCount: number;
  selectedRestrictions: string[];
  flatRatePrices: Record<string, { price: string; isActive: boolean }>;
  suitcasePrice: string;
}

function loadSavedData(): SavedVoyageData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function savePersistentData(data: SavedVoyageData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function VoyageGagneSheet({ open, onOpenChange, skipIntro = false }: VoyageGagneSheetProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<Step>(skipIntro ? "details" : "intro");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  
  // Form state
  const saved = loadSavedData();
  const [originCity, setOriginCity] = useState(saved?.originCity || "");
  const [originCountry, setOriginCountry] = useState(saved?.originCountry || "");
  const [destCity, setDestCity] = useState(saved?.destCity || "");
  const [destCountry, setDestCountry] = useState(saved?.destCountry || "");
  const [departureDate, setDepartureDate] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [airline, setAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [baggageCount, setBaggageCount] = useState(saved?.baggageCount || 1);
  const [capacity, setCapacity] = useState(SUGGESTED_CAPACITY);
  const [pricePerKg, setPricePerKg] = useState(saved?.pricePerKg || SUGGESTED_PRICE);
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");
  
  // Deposit & Reception info
  const [depositPhone, setDepositPhone] = useState(saved?.depositPhone || "");
  const [depositAddress, setDepositAddress] = useState(saved?.depositAddress || "");
  const [receptionPhone, setReceptionPhone] = useState(saved?.receptionPhone || "");
  const [receptionAddress, setReceptionAddress] = useState(saved?.receptionAddress || "");
  
  // Restrictions
  const RESTRICTION_OPTIONS = [
    "Pas de liquides", "Pas de nourriture", "Pas de batteries/piles",
    "Pas d'appareils electroniques", "Pas de produits chimiques", "Pas de parfums",
    "Pas de cosmetiques", "Pas de medicaments"
  ];
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>(saved?.selectedRestrictions || []);
  
  // Flat-rate pricing
  const [flatRateItems, setFlatRateItems] = useState<FlatRateItem[]>([]);
  const [suitcasePrice, setSuitcasePrice] = useState(saved?.suitcasePrice || "");
  const [flatRateLoaded, setFlatRateLoaded] = useState(false);
  
  // Pre-fill user country
  const [userProfile, setUserProfile] = useState<any>(null);
  
  useEffect(() => {
    if (!open) return;
    setLimitReached(false);
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, country_code")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) {
        setUserProfile(data);
        if (data.phone && !saved?.depositPhone) {
          setDepositPhone(data.phone);
          setReceptionPhone(data.phone);
        }
      }
      // Check departure limit for occasional GPs
      const { data: gpData } = await supabase
        .from("gp_profiles")
        .select("id, gp_type")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (gpData?.gp_type === "occasionnel") {
        const { count } = await supabase
          .from("gp_offers")
          .select("id", { count: "exact", head: true })
          .eq("gp_id", gpData.id)
          .eq("status", "active" as any);
        if ((count || 0) >= 3) {
          setLimitReached(true);
        }
      }
    };
    loadProfile();
  }, [open]);

  // Load flat-rate object types
  useEffect(() => {
    if (!open || flatRateLoaded) return;
    const loadFlatRates = async () => {
      const { data } = await supabase
        .from("flat_rate_object_types")
        .select("id, label, default_price")
        .eq("is_active", true);
      if (data) {
        const savedPrices = saved?.flatRatePrices || {};
        setFlatRateItems(data.map(item => ({
          id: item.id,
          label: item.label,
          defaultPrice: item.default_price,
          price: savedPrices[item.id]?.price || (item.default_price ? String(item.default_price) : ""),
          isActive: savedPrices[item.id]?.isActive ?? false,
        })));
        setFlatRateLoaded(true);
      }
    };
    loadFlatRates();
  }, [open, flatRateLoaded]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(skipIntro ? "details" : "intro");
        setOriginCity("");
        setOriginCountry("");
        setDestCity("");
        setDestCountry("");
        setDepartureDate("");
        setArrivalDate("");
        setAirline("");
        setFlightNumber("");
      }, 300);
    }
  }, [open, skipIntro]);

  // Update capacity when baggage count changes
  useEffect(() => {
    const preset = BAGGAGE_PRESETS.find(p => p.count === baggageCount);
    if (preset) setCapacity(preset.capacity);
  }, [baggageCount]);

  const estimatedEarnings = capacity * pricePerKg;
  const minDate = new Date().toISOString().split("T")[0];

  // Dynamic phone indicatifs based on selected cities
  const depositPhoneIndicatif = getPhoneIndicatifForCity(originCity);
  const receptionPhoneIndicatif = getPhoneIndicatifForCity(destCity);
  const depositAddrPlaceholder = getAddressPlaceholder(originCity) || "Ex: 12 rue de la Paix";
  const receptionAddrPlaceholder = getAddressPlaceholder(destCity) || "Ex: Quartier Médina";
  const currSymbol = getCurrencySymbol(currency);

  const canSubmitDetails = originCity && destCity && departureDate && capacity > 0 && depositPhone && receptionPhone && depositAddress && receptionAddress;
  const canSubmitPricing = pricePerKg > 0 && suitcasePrice && parseFloat(suitcasePrice) > 0;

  // 24h departure validation
  const departureCheck = departureDate ? canPublishDepartureDate(departureDate) : { allowed: true };

  const handleCitySelect = (city: string, country: string, field: "origin" | "dest") => {
    if (field === "origin") {
      setOriginCity(city);
      setOriginCountry(country);
    } else {
      setDestCity(city);
      setDestCountry(country);
    }
  };

  // Swap origin ↔ destination
  const handleSwapCities = () => {
    const tmpCity = originCity;
    const tmpCountry = originCountry;
    const tmpPhone = depositPhone;
    const tmpAddress = depositAddress;
    setOriginCity(destCity);
    setOriginCountry(destCountry);
    setDestCity(tmpCity);
    setDestCountry(tmpCountry);
    setDepositPhone(receptionPhone);
    setDepositAddress(receptionAddress);
    setReceptionPhone(tmpPhone);
    setReceptionAddress(tmpAddress);
  };

  const updateFlatRateItem = (id: string, field: "price" | "isActive", value: string | boolean) => {
    setFlatRateItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Save persistent data
  const persistData = useCallback(() => {
    const flatRatePrices: Record<string, { price: string; isActive: boolean }> = {};
    flatRateItems.forEach(item => {
      flatRatePrices[item.id] = { price: item.price, isActive: item.isActive };
    });
    savePersistentData({
      originCity, originCountry, destCity, destCountry,
      depositPhone, depositAddress, receptionPhone, receptionAddress,
      pricePerKg, baggageCount, selectedRestrictions,
      flatRatePrices, suitcasePrice,
    });
  }, [originCity, originCountry, destCity, destCountry, depositPhone, depositAddress, receptionPhone, receptionAddress, pricePerKg, baggageCount, selectedRestrictions, flatRateItems, suitcasePrice]);

  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Connexion requise", description: "Connectez-vous pour publier un trajet", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const userId = session.user.id;

      // Check if user already has a gp_profile
      const { data: existingGP } = await supabase
        .from("gp_profiles")
        .select("id, gp_type")
        .eq("user_id", userId)
        .maybeSingle();

      let gpId = existingGP?.id;

      // If existing occasional GP, check departure limit (max 3)
      if (existingGP?.gp_type === "occasionnel" && gpId) {
        const { count } = await supabase
          .from("gp_offers")
          .select("id", { count: "exact", head: true })
          .eq("gp_id", gpId)
          .eq("status", "active" as any);
        
        if ((count || 0) >= 3) {
          toast({
            title: "Limite atteinte",
            description: "Les GP Occasionnels peuvent publier maximum 3 départs actifs. Passez GP Pro pour publier plus !",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // If no GP profile, create an occasional one
      if (!gpId) {
        const businessName = userProfile?.full_name || "GP Occasionnel";
        const phone = userProfile?.phone || `occasionnel-${userId.slice(0, 8)}`;
        
        const { data: newGP, error: gpError } = await supabase
          .from("gp_profiles")
          .insert({
            user_id: userId,
            business_name: businessName,
            phone: phone,
            city: originCity,
            country_code: originCountry === "France" ? "FR" : originCountry === "Sénégal" ? "SN" : "CI",
            gp_type: "occasionnel" as any,
            status: "verified" as any,
            base_origin_city: originCity,
            base_origin_country: originCountry,
            base_destination_city: destCity,
            base_destination_country: destCountry,
            base_price_per_kg: pricePerKg,
            default_currency: currency,
            deposit_address: depositAddress,
            reception_address: receptionAddress,
            whatsapp_phone: depositPhone,
          })
          .select("id")
          .single();

        if (gpError) {
          if (gpError.code === "23505") {
            const { data: retryGP } = await supabase
              .from("gp_profiles")
              .select("id")
              .eq("user_id", userId)
              .maybeSingle();
            gpId = retryGP?.id;
            if (!gpId) throw gpError;
          } else {
            throw gpError;
          }
        } else {
          gpId = newGP.id;
        }
      } else {
        // Sync profile data on every publish for occasional GPs
        if (existingGP.gp_type === "occasionnel") {
          await supabase
            .from("gp_profiles")
            .update({
              deposit_address: depositAddress,
              reception_address: receptionAddress,
              base_origin_city: originCity,
              base_origin_country: originCountry,
              base_destination_city: destCity,
              base_destination_country: destCountry,
              base_price_per_kg: pricePerKg,
              default_currency: currency,
            })
            .eq("id", gpId);
        }
      }

      // Save flat-rate pricing for this GP
      const activeFlatRates = flatRateItems.filter(i => i.isActive && i.price && parseFloat(i.price) > 0);
      if (gpId && activeFlatRates.length > 0) {
        for (const item of activeFlatRates) {
          await supabase
            .from("gp_flat_rate_pricing")
            .upsert({
              gp_id: gpId,
              object_type_id: item.id,
              price: parseFloat(item.price),
              currency: currency,
              is_active: true,
            }, { onConflict: "gp_id,object_type_id" as any });
        }
      }

      // Create the offer
      const { error: offerError } = await supabase
        .from("gp_offers")
        .insert({
          gp_id: gpId,
          origin_city: originCity,
          origin_country: originCountry || "France",
          destination_city: destCity,
          destination_country: destCountry || "Sénégal",
          departure_date: departureDate,
          arrival_date: arrivalDate || null,
          total_capacity: capacity,
          available_capacity: capacity,
          price_per_kg: pricePerKg,
          currency: currency,
          transport_type: "occasionnel" as any,
          status: "active" as any,
          description: `Dépôt: ${depositAddress} (${depositPhone}) | Réception: ${receptionAddress} (${receptionPhone})`,
          explicit_restrictions: selectedRestrictions.length > 0 ? selectedRestrictions : null,
        });

      if (offerError) throw offerError;

      // Persist data for next time
      persistData();

      toast({
        title: "Trajet publié !",
        description: `${originCity} → ${destCity} · Gains potentiels : ${estimatedEarnings} ${currSymbol}`,
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error("Publish error:", err);
      toast({ 
        title: "Erreur", 
        description: err.message || "Impossible de publier le trajet", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepIndex = STEPS.indexOf(step);

  const goNext = () => {
    if (step === "details") {
      // Validate 24h rule
      if (!departureCheck.allowed) {
        toast({ title: "Départ trop proche", description: departureCheck.reason, variant: "destructive" });
        return;
      }
      persistData(); 
      setStep("pricing"); 
    }
    else if (step === "pricing") { persistData(); setStep("summary"); }
  };

  const goBack = () => {
    if (step === "details") setStep("intro");
    else if (step === "pricing") setStep("details");
    else if (step === "summary") setStep("pricing");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95vh] flex flex-col">
        <DrawerHeader className="pb-2 flex-shrink-0">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Luggage className="w-4 h-4 text-white" />
            </div>
            Voyage & Gagne
          </DrawerTitle>
        </DrawerHeader>

        {/* Progress indicator */}
        <div className="px-6 pb-3 flex-shrink-0">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${
                i <= stepIndex 
                  ? "bg-gradient-to-r from-amber-400 to-orange-500" 
                  : "bg-muted"
              }`} />
            ))}
          </div>
        </div>

        {/* Limit reached CTA */}
        {limitReached ? (
          <div className="flex-1 px-6 flex flex-col items-center justify-center gap-4 pb-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-foreground">Limite atteinte</h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Vous avez atteint la limite de 3 départs actifs pour les GP Occasionnels.
              </p>
            </div>
            <div className="w-full max-w-[300px] p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-400/20 space-y-3">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-500" />
                Passez GP Pro
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-500" /> Départs illimités</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-500" /> Dashboard professionnel complet</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-500" /> Visibilité prioritaire</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-500" /> Auto-acceptation des commandes</li>
              </ul>
              <Button
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/gp/upgrade");
                }}
              >
                Devenir GP Pro
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => onOpenChange(false)}>
              Plus tard
            </Button>
          </div>
        ) : (
        <>
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6">
          <AnimatePresence mode="wait">
            {/* ── STEP 1: INTRO ── */}
            {step === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5 pb-24"
              >
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mb-4">
                    <Plane className="w-8 h-8 text-amber-500" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    Tu voyages ?
                  </h2>
                  <p className="text-base text-amber-600 font-semibold mb-1">
                    Gagne de l'argent avec ton bagage
                  </p>
                  <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                    Publie ton trajet en 30 secondes. Des clients réservent ton espace bagage et tu gagnes à chaque voyage.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { icon: MapPin, text: "Indique ton trajet et ta date", color: "text-primary bg-primary/10" },
                    { icon: Weight, text: "Choisis ta capacité disponible", color: "text-emerald-500 bg-emerald-500/10" },
                    { icon: DollarSign, text: "Fixe ton prix — on te suggère le meilleur", color: "text-amber-500 bg-amber-500/10" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                      <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{item.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: DETAILS ── */}
            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 pb-24"
              >
                <p className="text-xs text-muted-foreground font-medium">Étape 2/4 · Détails du voyage</p>

                {/* Origin & Destination with Swap */}
                <div className="space-y-2.5 relative">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary" /> Ville de départ
                    </label>
                    <SearchableCitySelect
                      value={originCity}
                      countryCode={originCountry}
                      onSelect={(city, country) => handleCitySelect(city, country, "origin")}
                      placeholder="Ex: Paris"
                      className="h-10"
                    />
                  </div>

                  {/* Swap button */}
                  <div className="flex justify-center -my-1 relative z-10">
                    <button
                      type="button"
                      onClick={handleSwapCities}
                      className="w-8 h-8 rounded-full bg-card border-2 border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
                      title="Intervertir départ et arrivée"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-500" /> Ville d'arrivée
                    </label>
                    <SearchableCitySelect
                      value={destCity}
                      countryCode={destCountry}
                      onSelect={(city, country) => handleCitySelect(city, country, "dest")}
                      placeholder="Ex: Dakar"
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Date de départ
                    </label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => {
                        setDepartureDate(e.target.value);
                        // Clear arrival if before departure
                        if (arrivalDate && e.target.value > arrivalDate) setArrivalDate("");
                      }}
                      min={minDate}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {/* 24h warning */}
                    {departureDate && !departureCheck.allowed && (
                      <p className="text-[10px] text-destructive flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3" /> {departureCheck.reason}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-500" /> Date d'arrivée
                    </label>
                    <input
                      type="date"
                      value={arrivalDate}
                      onChange={(e) => setArrivalDate(e.target.value)}
                      min={departureDate || minDate}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Baggage count */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Luggage className="w-3 h-3" /> Nombre de bagages
                  </label>
                  <div className="flex gap-2">
                    {BAGGAGE_PRESETS.map((preset) => (
                      <button
                        key={preset.count}
                        onClick={() => setBaggageCount(preset.count)}
                        className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                          baggageCount === preset.count
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-600"
                            : "bg-muted/30 border-border/50 text-muted-foreground"
                        }`}
                      >
                        {preset.count} bag.
                        <br />
                        <span className="text-[10px] font-normal">{preset.capacity}kg</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Capacity */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <Weight className="w-3 h-3" /> Capacité disponible (kg)
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 0))}
                    min={1}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Deposit Info */}
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-2.5">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPinned className="w-3.5 h-3.5 text-primary" /> Point de dépôt (départ)
                  </p>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Téléphone dépôt</label>
                    <input
                      type="tel"
                      value={depositPhone}
                      onChange={(e) => setDepositPhone(e.target.value)}
                      placeholder={depositPhoneIndicatif ? `${depositPhoneIndicatif} 6 12 34 56 78` : "+33 6 12 34 56 78"}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Adresse de dépôt</label>
                    <input
                      type="text"
                      value={depositAddress}
                      onChange={(e) => setDepositAddress(e.target.value)}
                      placeholder={depositAddrPlaceholder}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Reception Info */}
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-2.5">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPinned className="w-3.5 h-3.5 text-amber-500" /> Point de réception (arrivée)
                  </p>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Téléphone réception</label>
                    <input
                      type="tel"
                      value={receptionPhone}
                      onChange={(e) => setReceptionPhone(e.target.value)}
                      placeholder={receptionPhoneIndicatif ? `${receptionPhoneIndicatif} 77 123 45 67` : "+221 77 123 45 67"}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Adresse de réception</label>
                    <input
                      type="text"
                      value={receptionAddress}
                      onChange={(e) => setReceptionAddress(e.target.value)}
                      placeholder={receptionAddrPlaceholder}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Restrictions */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/30 space-y-2">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-destructive" /> Restrictions (ce que vous refusez)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {RESTRICTION_OPTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRestrictions(prev => 
                          prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
                        )}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                          selectedRestrictions.includes(r)
                            ? "bg-destructive/10 border-destructive/30 text-destructive"
                            : "bg-background border-border/50 text-muted-foreground"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: PRICING ── */}
            {step === "pricing" && (
              <motion.div
                key="pricing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 pb-24"
              >
                <p className="text-xs text-muted-foreground font-medium">Étape 3/4 · Tarification</p>

                {/* Currency selector */}
                <div className="p-3 rounded-xl bg-card border border-border">
                  <label className="text-[11px] text-muted-foreground mb-1.5 block">Devise</label>
                  <CurrencySelector value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)} />
                </div>

                {/* Price per kg */}
                <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" /> Prix au kilogramme
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={pricePerKg}
                      onChange={(e) => setPricePerKg(Math.max(1, parseInt(e.target.value) || 0))}
                      min={1}
                      placeholder={getPricePlaceholder(currency, "per_kg")}
                      className="flex-1 h-11 px-3 rounded-xl border border-border bg-background text-lg font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/30 text-center"
                    />
                    <span className="text-xs font-semibold text-muted-foreground w-12 text-center">{currSymbol}/kg</span>
                  </div>
                </div>

                {/* Suitcase forfait */}
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-2">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Luggage className="w-4 h-4 text-amber-500" /> Forfait valise 23kg
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={suitcasePrice}
                      onChange={(e) => setSuitcasePrice(e.target.value)}
                      placeholder={getPricePlaceholder(currency, "suitcase")}
                      min={1}
                      className="flex-1 h-11 px-3 rounded-xl border border-border bg-background text-lg font-bold text-foreground outline-none focus:ring-2 focus:ring-amber-500/30 text-center"
                    />
                    <span className="text-xs font-semibold text-muted-foreground w-12 text-center">{currSymbol}</span>
                  </div>
                </div>

                {/* Flat-rate objects */}
                {flatRateItems.length > 0 && (
                  <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" /> Tarifs forfaitaires
                    </p>
                    <div className="space-y-1.5">
                      {flatRateItems.map((item) => (
                        <div key={item.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                          item.isActive ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border/50"
                        }`}>
                          <Switch
                            checked={item.isActive}
                            onCheckedChange={(checked) => updateFlatRateItem(item.id, "isActive", checked)}
                            className="scale-75"
                          />
                          <span className={`flex-1 text-xs font-medium ${item.isActive ? "text-foreground" : "text-muted-foreground"}`}>
                            {item.label}
                          </span>
                          {item.isActive && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateFlatRateItem(item.id, "price", e.target.value)}
                                placeholder="Prix"
                                className="w-16 h-7 px-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground text-center outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <span className="text-[10px] text-muted-foreground">{currSymbol}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Estimated earnings */}
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Gains estimés</span>
                    <span className="text-lg font-bold text-amber-600">{estimatedEarnings.toLocaleString()} {currSymbol}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: SUMMARY ── */}
            {step === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 pb-24"
              >
                <p className="text-xs text-muted-foreground font-medium">Étape 4/4 · Confirmation</p>

                <div className="p-4 rounded-2xl bg-card border border-border space-y-4">
                  {/* Route */}
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-primary shadow-sm" />
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{originCity}</p>
                      <p className="text-[11px] text-muted-foreground">{originCountry}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 text-right">
                      <p className="font-bold text-foreground">{destCity}</p>
                      <p className="text-[11px] text-muted-foreground">{destCountry}</p>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
                  </div>

                  <div className="h-px bg-border/50" />

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-muted/30">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Départ</p>
                      <p className="text-sm font-semibold">{departureDate ? new Date(departureDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "-"}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/30">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Arrivée</p>
                      <p className="text-sm font-semibold">{arrivalDate ? new Date(arrivalDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "Non précisée"}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/30">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Bagages</p>
                      <p className="text-sm font-semibold">{baggageCount} bagage{baggageCount > 1 ? "s" : ""}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/30">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Capacité</p>
                      <p className="text-sm font-semibold">{capacity} kg</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/30">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Prix/kg</p>
                      <p className="text-sm font-semibold">{pricePerKg} {currSymbol}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/30">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Forfait valise</p>
                      <p className="text-sm font-semibold">{suitcasePrice ? `${suitcasePrice} ${currSymbol}` : "-"}</p>
                    </div>
                  </div>

                  {/* Active flat-rate items summary */}
                  {flatRateItems.filter(i => i.isActive && i.price).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground font-medium">Articles forfaitaires</p>
                      <div className="flex flex-wrap gap-1.5">
                        {flatRateItems.filter(i => i.isActive && i.price).map(item => (
                          <Badge key={item.id} variant="secondary" className="text-[10px] gap-1">
                            {item.label} · {item.price} {currSymbol}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deposit & Reception summary */}
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                        <MapPinned className="w-3 h-3" /> Dépôt
                      </p>
                      <p className="text-xs font-semibold">{depositAddress}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" /> {depositPhone}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                        <MapPinned className="w-3 h-3" /> Réception
                      </p>
                      <p className="text-xs font-semibold">{receptionAddress}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" /> {receptionPhone}
                      </p>
                    </div>
                  </div>

                  {/* Earnings highlight */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Gains potentiels</p>
                    <p className="text-2xl font-bold text-amber-600">{estimatedEarnings.toLocaleString()} {currSymbol}</p>
                  </div>
                </div>

                {/* Info notice */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/20 border border-border/30">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Ton trajet sera visible par les clients. Tu recevras des notifications pour chaque demande. Le paiement est sécurisé par escrow.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── FIXED BOTTOM BUTTONS ── */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-background safe-area-bottom">
          {step === "intro" && (
            <div className="space-y-2">
              <Button 
                onClick={() => setStep("details")} 
                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
              >
                Publier mon trajet
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
              <button 
                onClick={() => onOpenChange(false)} 
                className="w-full text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
              >
                Plus tard
              </button>
            </div>
          )}

          {step === "details" && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={goBack} className="h-11 px-4">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                onClick={goNext}
                disabled={!canSubmitDetails}
                className="flex-1 h-11 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                Continuer
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}

          {step === "pricing" && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={goBack} className="h-11 px-4">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                onClick={goNext}
                disabled={!canSubmitPricing}
                className="flex-1 h-11 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                Continuer
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}

          {step === "summary" && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={goBack} className="h-11 px-4">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                onClick={handlePublish}
                disabled={isSubmitting}
                className="flex-1 h-12 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-1" />
                    Publier mon trajet
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
