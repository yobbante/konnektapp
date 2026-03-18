/**
 * VoyageGagneSheet — "Voyage & Gagne" flow
 * Allows any client to publish a trip and become a GP Occasionnel.
 * 3 steps: Intro → Trip details (with deposit/reception info) → Summary & Publish
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plane, MapPin, Calendar, Weight, DollarSign, Luggage, 
  ChevronRight, ChevronLeft, Sparkles, ArrowRight, Info, Check, Phone, MapPinned
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { SearchableCitySelect } from "@/components/gp/SearchableCitySelect";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle
} from "@/components/ui/drawer";

interface VoyageGagneSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "intro" | "details" | "summary";

const SUGGESTED_PRICE = 8;
const SUGGESTED_CAPACITY = 20;
const BAGGAGE_PRESETS = [
  { label: "1 bagage (23kg)", count: 1, capacity: 20 },
  { label: "2 bagages (46kg)", count: 2, capacity: 40 },
  { label: "3 bagages (69kg)", count: 3, capacity: 60 },
];

export function VoyageGagneSheet({ open, onOpenChange }: VoyageGagneSheetProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<Step>("intro");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [originCity, setOriginCity] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destCountry, setDestCountry] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [baggageCount, setBaggageCount] = useState(1);
  const [capacity, setCapacity] = useState(SUGGESTED_CAPACITY);
  const [pricePerKg, setPricePerKg] = useState(SUGGESTED_PRICE);
  const [currency] = useState("EUR");
  
  // Deposit & Reception info
  const [depositPhone, setDepositPhone] = useState("");
  const [depositAddress, setDepositAddress] = useState("");
  const [receptionPhone, setReceptionPhone] = useState("");
  const [receptionAddress, setReceptionAddress] = useState("");
  
  // Pre-fill user country
  const [userProfile, setUserProfile] = useState<any>(null);
  
  useEffect(() => {
    if (!open) return;
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, country")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) {
        setUserProfile(data);
        // Pre-fill phones with user's phone
        if (data.phone) {
          setDepositPhone(data.phone);
          setReceptionPhone(data.phone);
        }
      }
    };
    loadProfile();
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("intro");
        setOriginCity("");
        setOriginCountry("");
        setDestCity("");
        setDestCountry("");
        setDepartureDate("");
        setBaggageCount(1);
        setCapacity(SUGGESTED_CAPACITY);
        setPricePerKg(SUGGESTED_PRICE);
        setDepositPhone("");
        setDepositAddress("");
        setReceptionPhone("");
        setReceptionAddress("");
      }, 300);
    }
  }, [open]);

  // Update capacity when baggage count changes
  useEffect(() => {
    const preset = BAGGAGE_PRESETS.find(p => p.count === baggageCount);
    if (preset) setCapacity(preset.capacity);
  }, [baggageCount]);

  const estimatedEarnings = capacity * pricePerKg;
  const minDate = new Date().toISOString().split("T")[0];

  const canSubmitDetails = originCity && destCity && departureDate && capacity > 0 && pricePerKg > 0 && depositPhone && receptionPhone && depositAddress && receptionAddress;

  const handleCitySelect = (city: string, country: string, field: "origin" | "dest") => {
    if (field === "origin") {
      setOriginCity(city);
      setOriginCountry(country);
    } else {
      setDestCity(city);
      setDestCountry(country);
    }
  };

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

      // If no GP profile, create an occasional one
      if (!gpId) {
        const businessName = userProfile?.full_name || "GP Occasionnel";
        // Use a unique phone to avoid constraint violation
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
          })
          .select("id")
          .single();

        if (gpError) {
          // If unique constraint on user_id, re-fetch existing profile
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
        // Update existing GP profile with deposit/reception addresses if occasionnel
        if (existingGP.gp_type === "occasionnel") {
          await supabase
            .from("gp_profiles")
            .update({
              deposit_address: depositAddress,
              reception_address: receptionAddress,
            })
            .eq("id", gpId);
        }
      }

      // Create the offer — always as "occasionnel" transport type for voyage flow
      const { error: offerError } = await supabase
        .from("gp_offers")
        .insert({
          gp_id: gpId,
          origin_city: originCity,
          origin_country: originCountry || "France",
          destination_city: destCity,
          destination_country: destCountry || "Sénégal",
          departure_date: departureDate,
          total_capacity: capacity,
          available_capacity: capacity,
          price_per_kg: pricePerKg,
          currency: currency,
          transport_type: "occasionnel" as any,
          status: "active" as any,
          description: `Dépôt: ${depositAddress} (${depositPhone}) | Réception: ${receptionAddress} (${receptionPhone})`,
        });

      if (offerError) throw offerError;

      toast({
        title: "🎉 Trajet publié !",
        description: `${originCity} → ${destCity} · Gains potentiels : ${estimatedEarnings}€`,
      });

      onOpenChange(false);
      navigate("/reservations");
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Luggage className="w-4 h-4 text-white" />
            </div>
            Voyage & Gagne
          </DrawerTitle>
        </DrawerHeader>

        {/* Progress indicator */}
        <div className="px-6 pb-3">
          <div className="flex gap-1.5">
            {(["intro", "details", "summary"] as Step[]).map((s, i) => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${
                i <= ["intro", "details", "summary"].indexOf(step) 
                  ? "bg-gradient-to-r from-amber-400 to-orange-500" 
                  : "bg-muted"
              }`} />
            ))}
          </div>
        </div>

        <div className="px-6 pb-8 overflow-y-auto max-h-[70vh]">
          <AnimatePresence mode="wait">
            {/* ── STEP 1: INTRO ── */}
            {step === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mb-4">
                    <Plane className="w-8 h-8 text-amber-500" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    Tu voyages ? 
                  </h2>
                  <p className="text-base text-amber-600 font-semibold mb-1">
                    Gagne de l'argent avec ton bagage 💰
                  </p>
                  <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                    Publie ton trajet en 30 secondes. Des clients réservent ton espace bagage et tu gagnes à chaque voyage.
                  </p>
                </div>

                {/* How it works */}
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

                <div className="space-y-2 pt-2">
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
                    Comment ça marche ?
                  </button>
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
                className="space-y-3"
              >
                <p className="text-xs text-muted-foreground font-medium">Étape 2/3 · Détails du voyage</p>

                {/* Origin & Destination */}
                <div className="space-y-2.5">
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

                {/* Date */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Date du voyage
                  </label>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    min={minDate}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
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

                {/* Capacity & Price row */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <Weight className="w-3 h-3" /> Capacité (kg)
                    </label>
                    <input
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 0))}
                      min={1}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Prix/kg (€)
                      </label>
                    </div>
                    <input
                      type="number"
                      value={pricePerKg}
                      onChange={(e) => setPricePerKg(Math.max(1, parseInt(e.target.value) || 0))}
                      min={1}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
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
                      placeholder="+33 6 12 34 56 78"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Adresse de dépôt</label>
                    <input
                      type="text"
                      value={depositAddress}
                      onChange={(e) => setDepositAddress(e.target.value)}
                      placeholder="Ex: 12 rue de la Paix, Paris"
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
                      placeholder="+221 77 123 45 67"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Adresse de réception</label>
                    <input
                      type="text"
                      value={receptionAddress}
                      onChange={(e) => setReceptionAddress(e.target.value)}
                      placeholder="Ex: Quartier Médina, Dakar"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Estimated earnings */}
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Gains estimés</span>
                    <span className="text-lg font-bold text-amber-600">{estimatedEarnings.toLocaleString()}€</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setStep("intro")} className="h-11">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={() => setStep("summary")}
                    disabled={!canSubmitDetails}
                    className="flex-1 h-11 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  >
                    Continuer
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: SUMMARY ── */}
            {step === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-xs text-muted-foreground font-medium">Étape 3/3 · Confirmation</p>

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
                      <p className="text-[10px] text-muted-foreground mb-0.5">Date</p>
                      <p className="text-sm font-semibold">{departureDate ? new Date(departureDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "-"}</p>
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
                      <p className="text-sm font-semibold">{pricePerKg}€</p>
                    </div>
                  </div>

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
                    <p className="text-2xl font-bold text-amber-600">{estimatedEarnings.toLocaleString()}€</p>
                  </div>
                </div>

                {/* Info notice */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/20 border border-border/30">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Ton trajet sera visible par les clients. Tu recevras des notifications pour chaque demande. Le paiement est sécurisé par escrow.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setStep("details")} className="h-11">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
