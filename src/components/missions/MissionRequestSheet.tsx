/**
 * MissionRequestSheet V2 — Specialized multi-modal mission request
 * 4 modes: Routier, Aérien, Maritime, Multi-corridor
 * Each mode has a tailored detail form with industry-specific fields.
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Truck, Ship, Plane, Package, MapPin, Calendar, Weight,
  ChevronRight, CheckCircle2, Info, Camera, ImageIcon, FileUp, Clock,
  Shield, Ruler, Container, Globe, Layers, Anchor, PlaneTakeoff,
  RotateCcw, AlertTriangle
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableCitySelect, WORLD_CITIES } from "@/components/gp/SearchableCitySelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ───
type TransportMode = "routier" | "maritime" | "aerien" | "multi";
type Step = "mode" | "details" | "confirm" | "success";
type SizeCategoryExt = "S" | "M" | "L" | "XL" | "FRET";
type FreightType = "lcl" | "fcl_20" | "fcl_40" | "roro";
type AirService = "standard" | "express" | "charter";

interface MissionRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Constants ───
import { GP_ONLY_MODE } from "@/config/featureFlags";

const ALL_MODES: { id: TransportMode; icon: React.ElementType; label: string; desc: string; color: string; bg: string }[] = [
  { id: "routier", icon: Truck, label: "Routier", desc: "Transport terrestre, colis & marchandises", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { id: "aerien", icon: Plane, label: "Aérien", desc: "Cargo express & fret aérien", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  { id: "maritime", icon: Ship, label: "Maritime", desc: "Conteneurs, groupage LCL & véhicules", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { id: "multi", icon: Globe, label: "Multi-corridor", desc: "Parcours combiné : Aérien + Routier, Maritime + Routier…", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
];

// In GP_ONLY_MODE, the mission sheet should not open (all modes disabled)
const MODES = GP_ONLY_MODE ? [] : ALL_MODES;

const SIZE_OPTIONS: { label: SizeCategoryExt; range: string; weight: string; color: string; bg: string }[] = [
  { label: "S", range: "0-50 kg", weight: "25", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700" },
  { label: "M", range: "50-200 kg", weight: "125", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700" },
  { label: "L", range: "200-500 kg", weight: "350", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700" },
  { label: "XL", range: "500-1000 kg", weight: "750", color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700" },
  { label: "FRET", range: "> 1000 kg", weight: "1500", color: "text-red-700 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700" },
];

const FREIGHT_TYPES: { id: FreightType; label: string; desc: string; icon: React.ElementType }[] = [
  { id: "lcl", label: "Groupage LCL", desc: "Partagez un conteneur (m³/kg)", icon: Package },
  { id: "fcl_20", label: "Conteneur 20ft", desc: "Conteneur complet 20 pieds", icon: Container },
  { id: "fcl_40", label: "Conteneur 40ft", desc: "Conteneur complet 40 pieds", icon: Container },
  { id: "roro", label: "Véhicule (RoRo)", desc: "Transport de véhicule par roulier", icon: Truck },
];

const AIR_SERVICES: { id: AirService; label: string; desc: string; delay: string }[] = [
  { id: "standard", label: "Standard", desc: "Fret aérien classique", delay: "5-10 jours" },
  { id: "express", label: "Express", desc: "Priorité de chargement", delay: "2-4 jours" },
  { id: "charter", label: "Charter / Dédié", desc: "Vol cargo dédié", delay: "Sur mesure" },
];

const INCOTERMS = ["EXW", "FOB", "CIF", "CFR", "DDP", "DAP", "FCA"];

const MAX_PHOTOS = 5;

const COUNTRY_MAP: Record<string, string> = {
  SN: "Sénégal", FR: "France", CI: "Côte d'Ivoire", CM: "Cameroun", ML: "Mali",
  US: "États-Unis", CA: "Canada", AE: "Émirats Arabes Unis", GB: "Royaume-Uni",
  BE: "Belgique", MA: "Maroc", TN: "Tunisie", GA: "Gabon", CG: "Congo",
  DE: "Allemagne", ES: "Espagne", IT: "Italie", CH: "Suisse", NL: "Pays-Bas",
  GN: "Guinée", BF: "Burkina Faso", TG: "Togo", BJ: "Bénin", GH: "Ghana",
  NG: "Nigeria", NE: "Niger", TD: "Tchad", CD: "RD Congo", GQ: "Guinée Équatoriale",
  TR: "Turquie", LB: "Liban", SA: "Arabie Saoudite", QA: "Qatar", EG: "Égypte",
  PT: "Portugal", DZ: "Algérie", CN: "Chine", HK: "Hong Kong", JP: "Japon",
  IN: "Inde", BR: "Brésil", AU: "Australie", ZA: "Afrique du Sud", MR: "Mauritanie",
  CV: "Cap-Vert", GM: "Gambie", GW: "Guinée-Bissau", SL: "Sierra Leone", LR: "Liberia",
};

// ─── Multi-corridor leg ───
interface CorridorLeg {
  mode: "routier" | "maritime" | "aerien";
  originCity: string;
  originCountry: string;
  destCity: string;
  destCountry: string;
}

// ─── Component ───
export function MissionRequestSheet({ open, onOpenChange }: MissionRequestSheetProps) {
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<TransportMode | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared fields
  const [originCity, setOriginCity] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [originAddress, setOriginAddress] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destCountry, setDestCountry] = useState("");
  const [destAddress, setDestAddress] = useState("");
  const [description, setDescription] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  // Maritime-specific
  const [freightType, setFreightType] = useState<FreightType | null>(null);
  const [volumeM3, setVolumeM3] = useState("");
  const [portOrigin, setPortOrigin] = useState("");
  const [portDest, setPortDest] = useState("");
  const [customsRequired, setCustomsRequired] = useState(false);
  const [insuranceRequired, setInsuranceRequired] = useState(false);
  const [incoterm, setIncoterm] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  // Vehicle fields (RoRo)
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleRunning, setVehicleRunning] = useState(true);

  // Aérien-specific
  const [airService, setAirService] = useState<AirService>("standard");
  const [dimensionsCm, setDimensionsCm] = useState("");
  const [merchandiseType, setMerchandiseType] = useState("");

  // Multi-corridor
  const [corridorLegs, setCorridorLegs] = useState<CorridorLeg[]>([
    { mode: "aerien", originCity: "", originCountry: "", destCity: "", destCountry: "" },
    { mode: "routier", originCity: "", originCountry: "", destCity: "", destCountry: "" },
  ]);

  const resetForm = () => {
    setStep("mode"); setMode(null);
    setOriginCity(""); setOriginCountry(""); setOriginAddress("");
    setDestCity(""); setDestCountry(""); setDestAddress("");
    setDescription(""); setWeightKg(""); setPickupDate(""); setEndDate("");
    setBudgetMax(""); setIsUrgent(false);
    setPhotos([]); setPhotoPreviews([]); setShowPhotoOptions(false);
    setFreightType(null); setVolumeM3(""); setPortOrigin(""); setPortDest("");
    setCustomsRequired(false); setInsuranceRequired(false); setIncoterm(""); setDeclaredValue("");
    setVehicleMake(""); setVehicleModel(""); setVehicleYear(""); setVehicleRunning(true);
    setAirService("standard"); setDimensionsCm(""); setMerchandiseType("");
    setCorridorLegs([
      { mode: "aerien", originCity: "", originCountry: "", destCity: "", destCountry: "" },
      { mode: "routier", originCity: "", originCountry: "", destCity: "", destCountry: "" },
    ]);
  };

  const handleClose = () => { onOpenChange(false); setTimeout(resetForm, 300); };

  const handleCitySelect = (type: "origin" | "dest", city: string, countryCode: string) => {
    const countryName = COUNTRY_MAP[countryCode] || countryCode;
    if (type === "origin") { setOriginCity(city); setOriginCountry(countryName); }
    else { setDestCity(city); setDestCountry(countryName); }
  };

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - photos.length;
    const newFiles = files.slice(0, remaining);
    setPhotos(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowPhotoOptions(false);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const openCamera = () => {
    if (fileInputRef.current) { fileInputRef.current.setAttribute("capture", "environment"); fileInputRef.current.click(); setTimeout(() => fileInputRef.current?.removeAttribute("capture"), 500); }
    setShowPhotoOptions(false);
  };
  const openLibrary = () => {
    if (fileInputRef.current) { fileInputRef.current.removeAttribute("capture"); fileInputRef.current.click(); }
    setShowPhotoOptions(false);
  };

  const uploadPhotos = async (userId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of photos) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("mission-photos").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("mission-photos").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const updateCorridorLeg = (index: number, field: keyof CorridorLeg, value: string) => {
    setCorridorLegs(prev => prev.map((leg, i) => i === index ? { ...leg, [field]: value } : leg));
  };

  const addCorridorLeg = () => {
    if (corridorLegs.length >= 4) return;
    setCorridorLegs(prev => [...prev, { mode: "routier", originCity: "", originCountry: "", destCity: "", destCountry: "" }]);
  };

  const removeCorridorLeg = (index: number) => {
    if (corridorLegs.length <= 2) return;
    setCorridorLegs(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Validation ───
  const canSubmit = (() => {
    if (!description.trim()) return false;
    if (mode === "multi") {
      return corridorLegs.every(l => l.originCity && l.destCity);
    }
    return originCity.trim() && destCity.trim();
  })();

  // ─── Submit ───
  const handleSubmit = async () => {
    if (!canSubmit || !mode) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { toast.error("Connectez-vous pour envoyer une demande"); return; }

      const photoUrls = photos.length > 0 ? await uploadPhotos(session.user.id) : [];
      const expiresAt = endDate ? new Date(endDate + "T23:59:59").toISOString() : null;

      if (mode === "routier") {
        const { error } = await supabase.from("routier_missions").insert([{
          client_id: session.user.id,
          origin_city: originCity.trim(), origin_country: originCountry.trim() || "Sénégal",
          origin_address: originAddress.trim() || null,
          destination_city: destCity.trim(), destination_country: destCountry.trim() || "Sénégal",
          destination_address: destAddress.trim() || null,
          freight_type: "Marchandise", merchandise_description: description.trim(),
          weight_kg: weightKg ? parseFloat(weightKg) : 0,
          pickup_date_start: pickupDate || new Date().toISOString().split("T")[0],
          pickup_date_end: endDate || null,
          client_budget: budgetMax ? parseFloat(budgetMax) : null,
          urgency: isUrgent ? "express" as const : "standard" as const,
          mission_number: `MSN-${Date.now()}`, status: "open",
          photo_urls: photoUrls, expires_at: expiresAt,
        }]);
        if (error) throw error;
      } else if (mode === "multi") {
        // Multi-corridor: create freight request with combined description
        const legsDesc = corridorLegs.map((l, i) => 
          `Étape ${i + 1} (${l.mode}): ${l.originCity} → ${l.destCity}`
        ).join(" | ");
        const { error } = await supabase.from("freight_requests").insert({
          client_id: session.user.id,
          origin_city: corridorLegs[0].originCity, origin_country: corridorLegs[0].originCountry || "France",
          destination_city: corridorLegs[corridorLegs.length - 1].destCity,
          destination_country: corridorLegs[corridorLegs.length - 1].destCountry || "Sénégal",
          freight_mode: "multi",
          merchandise_description: description.trim(),
          notes: legsDesc,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          pickup_date_from: pickupDate || null, pickup_date_to: endDate || null,
          declared_value: declaredValue ? parseFloat(declaredValue) : null,
          customs_required: customsRequired, insurance_required: insuranceRequired,
          is_urgent: isUrgent,
          request_number: `FRT-${Date.now()}`, status: "open",
        });
        if (error) throw error;
      } else {
        // Maritime / Aérien
        const isRoro = mode === "maritime" && freightType === "roro";
        const { error } = await supabase.from("freight_requests").insert({
          client_id: session.user.id,
          origin_city: originCity.trim(), origin_country: originCountry.trim() || "France",
          destination_city: destCity.trim(), destination_country: destCountry.trim() || "Sénégal",
          freight_mode: mode,
          merchandise_description: description.trim(),
          merchandise_type: mode === "aerien" ? merchandiseType : (freightType || null),
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          volume_m3: volumeM3 ? parseFloat(volumeM3) : null,
          dimensions_cm: dimensionsCm || null,
          origin_port_or_airport: portOrigin || null,
          destination_port_or_airport: portDest || null,
          customs_required: customsRequired, insurance_required: insuranceRequired,
          incoterm: incoterm || null,
          declared_value: declaredValue ? parseFloat(declaredValue) : null,
          pickup_date_from: pickupDate || null, pickup_date_to: endDate || null,
          is_urgent: isUrgent,
          is_vehicle: isRoro,
          vehicle_make: isRoro ? vehicleMake : null,
          vehicle_model: isRoro ? vehicleModel : null,
          vehicle_year: isRoro && vehicleYear ? parseInt(vehicleYear) : null,
          vehicle_running: isRoro ? vehicleRunning : null,
          urgency_level: airService !== "standard" ? airService : null,
          final_delivery_mode: mode === "maritime" ? (freightType === "lcl" ? "groupage" : "container") : null,
          request_number: `FRT-${Date.now()}`, status: "open",
        });
        if (error) throw error;
      }

      setStep("success");
      toast.success("Demande envoyée avec succès !");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  const selectedMode = MODES.find(m => m.id === mode);

  // ─── Render ───
  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 border-t border-border/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
          <div>
            <h2 className="text-lg font-bold text-foreground">Nouvelle mission</h2>
            <p className="text-xs text-muted-foreground">
              {step === "mode" && "Choisissez votre mode de transport"}
              {step === "details" && selectedMode && `Mission ${selectedMode.label}`}
              {step === "confirm" && "Vérifiez et envoyez"}
              {step === "success" && "Mission créée !"}
            </p>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Progress */}
        {step !== "success" && (
          <div className="flex gap-1.5 px-5 pt-3">
            {["mode", "details", "confirm"].map((s, i) => (
              <div key={s} className={cn("flex-1 h-1 rounded-full transition-colors", ["mode", "details", "confirm"].indexOf(step) >= i ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-5 py-4" style={{ maxHeight: "calc(92vh - 120px)" }}>
          <AnimatePresence mode="wait">

            {/* ═══════ STEP 1: Mode selection ═══════ */}
            {step === "mode" && (
              <motion.div key="mode" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
                  <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">Décrivez votre besoin et recevez des offres de transporteurs vérifiés.</p>
                </div>

                {MODES.map((m) => (
                  <motion.button
                    key={m.id} whileTap={{ scale: 0.98 }}
                    onClick={() => { setMode(m.id); setStep("details"); }}
                    className={cn("w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left", m.bg, "hover:shadow-sm")}
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", m.bg)}>
                      <m.icon className={cn("w-6 h-6", m.color)} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{m.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* ═══════ STEP 2: Details (mode-specific) ═══════ */}
            {step === "details" && selectedMode && (
              <motion.div key="details" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                {/* Mode badge */}
                <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold", selectedMode.bg, selectedMode.color)}>
                  <selectedMode.icon className="w-3.5 h-3.5" />
                  {selectedMode.label}
                </div>

                {/* ─── MULTI-CORRIDOR: Legs ─── */}
                {mode === "multi" && (
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Étapes du parcours
                    </label>
                    {corridorLegs.map((leg, i) => (
                      <div key={i} className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Étape {i + 1}</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={leg.mode}
                              onChange={(e) => updateCorridorLeg(i, "mode", e.target.value)}
                              className="text-xs bg-background border border-border rounded-lg px-2 py-1"
                            >
                              <option value="aerien">✈️ Aérien</option>
                              <option value="maritime">🚢 Maritime</option>
                              <option value="routier">🚛 Routier</option>
                            </select>
                            {corridorLegs.length > 2 && (
                              <button onClick={() => removeCorridorLeg(i)} className="text-destructive hover:text-destructive/80">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <SearchableCitySelect
                            value={leg.originCity}
                            countryCode={WORLD_CITIES.find(c => c.city === leg.originCity)?.country || "FR"}
                            onSelect={(city, code) => {
                              updateCorridorLeg(i, "originCity", city);
                              updateCorridorLeg(i, "originCountry", COUNTRY_MAP[code] || code);
                            }}
                            placeholder="Départ"
                            label={`Départ étape ${i + 1}`}
                          />
                          <SearchableCitySelect
                            value={leg.destCity}
                            countryCode={WORLD_CITIES.find(c => c.city === leg.destCity)?.country || "SN"}
                            onSelect={(city, code) => {
                              updateCorridorLeg(i, "destCity", city);
                              updateCorridorLeg(i, "destCountry", COUNTRY_MAP[code] || code);
                            }}
                            placeholder="Arrivée"
                            label={`Arrivée étape ${i + 1}`}
                          />
                        </div>
                      </div>
                    ))}
                    {corridorLegs.length < 4 && (
                      <Button variant="outline" size="sm" onClick={addCorridorLeg} className="w-full text-xs gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Ajouter une étape
                      </Button>
                    )}
                  </div>
                )}

                {/* ─── STANDARD CITIES (non-multi) ─── */}
                {mode !== "multi" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> {mode === "maritime" ? "Port / ville d'origine" : mode === "aerien" ? "Aéroport / ville d'origine" : "Ville de collecte"}
                      </label>
                      <SearchableCitySelect
                        value={originCity}
                        countryCode={WORLD_CITIES.find(c => c.city === originCity)?.country || "SN"}
                        onSelect={(city, code) => handleCitySelect("origin", city, code)}
                        placeholder="Rechercher ville de départ..."
                        label="Ville de départ"
                      />
                      {originCountry && <p className="text-[11px] text-muted-foreground ml-1">📍 {originCountry}</p>}
                      {mode === "routier" && (
                        <Input value={originAddress} onChange={(e) => setOriginAddress(e.target.value)} placeholder="Adresse de collecte (optionnel)" className="text-sm" />
                      )}
                      {(mode === "maritime" || mode === "aerien") && (
                        <Input value={portOrigin} onChange={(e) => setPortOrigin(e.target.value)} placeholder={mode === "maritime" ? "Port d'embarquement (optionnel)" : "Aéroport de départ (optionnel)"} className="text-sm" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> {mode === "maritime" ? "Port / ville de destination" : mode === "aerien" ? "Aéroport / ville de destination" : "Ville de livraison"}
                      </label>
                      <SearchableCitySelect
                        value={destCity}
                        countryCode={WORLD_CITIES.find(c => c.city === destCity)?.country || "SN"}
                        onSelect={(city, code) => handleCitySelect("dest", city, code)}
                        placeholder="Rechercher ville d'arrivée..."
                        label="Ville de destination"
                      />
                      {destCountry && <p className="text-[11px] text-muted-foreground ml-1">📍 {destCountry}</p>}
                      {mode === "routier" && (
                        <Input value={destAddress} onChange={(e) => setDestAddress(e.target.value)} placeholder="Adresse de livraison (optionnel)" className="text-sm" />
                      )}
                      {(mode === "maritime" || mode === "aerien") && (
                        <Input value={portDest} onChange={(e) => setPortDest(e.target.value)} placeholder={mode === "maritime" ? "Port de destination (optionnel)" : "Aéroport d'arrivée (optionnel)"} className="text-sm" />
                      )}
                    </div>
                  </>
                )}

                {/* ─── MARITIME: Freight type selection ─── */}
                {mode === "maritime" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Anchor className="w-3.5 h-3.5" /> Type de fret maritime
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {FREIGHT_TYPES.map((ft) => (
                        <button
                          key={ft.id}
                          onClick={() => setFreightType(ft.id)}
                          className={cn(
                            "flex flex-col items-start p-3 rounded-xl border transition-all text-left",
                            freightType === ft.id ? "bg-blue-500/10 border-blue-500/40 shadow-sm" : "bg-muted/30 border-border hover:bg-muted/50"
                          )}
                        >
                          <ft.icon className={cn("w-4 h-4 mb-1", freightType === ft.id ? "text-blue-500" : "text-muted-foreground")} />
                          <span className="text-xs font-semibold text-foreground">{ft.label}</span>
                          <span className="text-[10px] text-muted-foreground">{ft.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── MARITIME RoRo: Vehicle details ─── */}
                {mode === "maritime" && freightType === "roro" && (
                  <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/30">
                    <label className="text-xs font-semibold text-muted-foreground">Détails du véhicule</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} placeholder="Marque" className="text-sm" />
                      <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Modèle" className="text-sm" />
                      <Input value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} placeholder="Année" type="number" className="text-sm" />
                      <button
                        onClick={() => setVehicleRunning(!vehicleRunning)}
                        className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium",
                          vehicleRunning ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : "bg-orange-500/10 border-orange-500/30 text-orange-600"
                        )}
                      >
                        {vehicleRunning ? "✅ Roulant" : "🔧 Non roulant"}
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── AÉRIEN: Service type ─── */}
                {mode === "aerien" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <PlaneTakeoff className="w-3.5 h-3.5" /> Type de service
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {AIR_SERVICES.map((svc) => (
                        <button
                          key={svc.id}
                          onClick={() => setAirService(svc.id)}
                          className={cn(
                            "flex flex-col items-center py-3 px-2 rounded-xl border transition-all text-center",
                            airService === svc.id ? "bg-violet-500/10 border-violet-500/40 shadow-sm" : "bg-muted/30 border-border hover:bg-muted/50"
                          )}
                        >
                          <span className={cn("text-xs font-bold", airService === svc.id ? "text-violet-600 dark:text-violet-400" : "text-foreground")}>{svc.label}</span>
                          <span className="text-[9px] text-muted-foreground mt-0.5">{svc.delay}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── AÉRIEN: Dimensions & type ─── */}
                {mode === "aerien" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5" /> Dimensions (L × l × H en cm)
                      </label>
                      <Input value={dimensionsCm} onChange={(e) => setDimensionsCm(e.target.value)} placeholder="Ex: 120 × 80 × 60" className="text-sm" />
                      <p className="text-[10px] text-muted-foreground ml-1">
                        Poids taxable = max(poids réel, L×l×H / 6000)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Nature de la marchandise
                      </label>
                      <Input value={merchandiseType} onChange={(e) => setMerchandiseType(e.target.value)} placeholder="Ex: Pièces électroniques, textile..." className="text-sm" />
                    </div>
                  </>
                )}

                {/* ─── MARITIME: Volume ─── */}
                {mode === "maritime" && freightType === "lcl" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5" /> Volume estimé (m³)
                    </label>
                    <Input type="number" value={volumeM3} onChange={(e) => setVolumeM3(e.target.value)} placeholder="Ex: 2.5" className="text-sm" />
                  </div>
                )}

                {/* ─── Description (all modes) ─── */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" /> Description de la marchandise
                  </label>
                  <Textarea
                    value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      mode === "routier" ? "Ex: 2 palettes de matériaux, 50 cartons de vêtements..." :
                      mode === "maritime" ? "Ex: Conteneur d'effets personnels, véhicule Toyota..." :
                      mode === "aerien" ? "Ex: 500 kg de pièces automobiles, produits pharmaceutiques..." :
                      "Décrivez votre envoi multi-étapes..."
                    }
                    className="min-h-[70px] resize-none"
                  />
                </div>

                {/* ─── Photos (routier & multi) ─── */}
                {(mode === "routier" || mode === "multi") && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Photos ({photos.length}/{MAX_PHOTOS})
                    </label>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhotos} />
                    <div className="flex gap-2 flex-wrap">
                      {photoPreviews.map((src, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => handleRemovePhoto(i)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive/90 flex items-center justify-center">
                            <X className="w-3 h-3 text-destructive-foreground" />
                          </button>
                        </div>
                      ))}
                      {photos.length < MAX_PHOTOS && (
                        <div className="relative">
                          <button onClick={() => setShowPhotoOptions(!showPhotoOptions)} className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                            <Camera className="w-5 h-5" /><span className="text-[9px] mt-0.5">Ajouter</span>
                          </button>
                          <AnimatePresence>
                            {showPhotoOptions && (
                              <motion.div initial={{ opacity: 0, scale: 0.9, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 4 }} className="absolute bottom-full left-0 mb-2 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                                <button onClick={openCamera} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"><Camera className="w-4 h-4 text-primary" />Prendre une photo</button>
                                <div className="h-px bg-border" />
                                <button onClick={openLibrary} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"><ImageIcon className="w-4 h-4 text-primary" />Galerie photos</button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── Weight / Size (routier uses categories, others use input) ─── */}
                {mode === "routier" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Weight className="w-3.5 h-3.5" /> Taille du colis</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {SIZE_OPTIONS.map((size) => {
                        const isSelected = weightKg === size.weight;
                        return (
                          <button key={size.label} type="button" onClick={() => setWeightKg(size.weight)}
                            className={cn("flex flex-col items-center py-2 px-1 rounded-xl border transition-all text-center", isSelected ? `${size.bg} border-2 shadow-sm` : "bg-muted/30 border-border hover:bg-muted/60")}>
                            <span className={cn("text-sm font-extrabold", isSelected ? size.color : "text-foreground")}>{size.label}</span>
                            <span className="text-[8px] text-muted-foreground leading-tight mt-0.5">{size.range}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {(mode === "aerien" || mode === "maritime" || mode === "multi") && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Weight className="w-3.5 h-3.5" /> Poids estimé (kg)</label>
                    <Input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="Ex: 500" className="text-sm" />
                  </div>
                )}

                {/* ─── Dates ─── */}
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {mode === "maritime" ? "Date de dépôt souhaitée" : "Date de prise en charge"}
                    </label>
                    <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Date limite
                    </label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={pickupDate || new Date().toISOString().split("T")[0]} />
                  </div>
                </div>

                {/* ─── Maritime & Aérien: Logistics options ─── */}
                {(mode === "maritime" || mode === "aerien" || mode === "multi") && (
                  <div className="space-y-3">
                    {/* Incoterm */}
                    {(mode === "maritime" || mode === "aerien") && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Incoterm (optionnel)</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {INCOTERMS.map((inc) => (
                            <button key={inc} onClick={() => setIncoterm(incoterm === inc ? "" : inc)}
                              className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                incoterm === inc ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                              )}>
                              {inc}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Declared value */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">Valeur déclarée (FCFA)</label>
                      <Input type="number" value={declaredValue} onChange={(e) => setDeclaredValue(e.target.value)} placeholder="Pour l'assurance" className="text-sm" />
                    </div>

                    {/* Toggles */}
                    <div className="flex gap-2">
                      <button onClick={() => setCustomsRequired(!customsRequired)}
                        className={cn("flex-1 flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all",
                          customsRequired ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border text-muted-foreground"
                        )}>
                        <Globe className="w-4 h-4" /> Dédouanement
                      </button>
                      <button onClick={() => setInsuranceRequired(!insuranceRequired)}
                        className={cn("flex-1 flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all",
                          insuranceRequired ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border text-muted-foreground"
                        )}>
                        <Shield className="w-4 h-4" /> Assurance
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── Budget ─── */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Budget max (FCFA)</label>
                  <Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="Optionnel" />
                </div>

                {/* ─── Urgent ─── */}
                <button onClick={() => setIsUrgent(!isUrgent)}
                  className={cn("w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                    isUrgent ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-muted/50 border-border/50 text-muted-foreground"
                  )}>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", isUrgent ? "border-destructive bg-destructive" : "border-muted-foreground/30")}>
                    {isUrgent && <div className="w-2 h-2 rounded-full bg-destructive-foreground" />}
                  </div>
                  <span className="text-sm font-medium">⚡ Urgent</span>
                </button>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => { setStep("mode"); setMode(null); }} className="flex-1">Retour</Button>
                  <Button onClick={() => setStep("confirm")} disabled={!canSubmit} className="flex-1 gap-2">
                    Continuer <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ═══════ STEP 3: Confirm ═══════ */}
            {step === "confirm" && selectedMode && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <div className={cn("p-4 rounded-2xl border", selectedMode.bg)}>
                  <div className="flex items-center gap-3 mb-3">
                    <selectedMode.icon className={cn("w-6 h-6", selectedMode.color)} />
                    <span className={cn("font-bold", selectedMode.color)}>{selectedMode.label}</span>
                    {isUrgent && <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">⚡ Urgent</span>}
                  </div>

                  <div className="space-y-2 text-sm">
                    {mode === "multi" ? (
                      <div className="space-y-1.5">
                        {corridorLegs.map((leg, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                            <span className="text-muted-foreground">{leg.mode === "aerien" ? "✈️" : leg.mode === "maritime" ? "🚢" : "🚛"}</span>
                            <span className="font-medium text-foreground">{leg.originCity} → {leg.destCity}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trajet</span>
                        <span className="font-medium text-foreground">{originCity} → {destCity}</span>
                      </div>
                    )}

                    {mode === "maritime" && freightType && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type fret</span>
                        <span className="font-medium text-foreground">{FREIGHT_TYPES.find(f => f.id === freightType)?.label}</span>
                      </div>
                    )}
                    {mode === "aerien" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service</span>
                        <span className="font-medium text-foreground">{AIR_SERVICES.find(s => s.id === airService)?.label}</span>
                      </div>
                    )}
                    {weightKg && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Poids</span>
                        <span className="font-medium text-foreground">{weightKg} kg</span>
                      </div>
                    )}
                    {volumeM3 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Volume</span>
                        <span className="font-medium text-foreground">{volumeM3} m³</span>
                      </div>
                    )}
                    {dimensionsCm && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dimensions</span>
                        <span className="font-medium text-foreground">{dimensionsCm}</span>
                      </div>
                    )}
                    {incoterm && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Incoterm</span>
                        <span className="font-medium text-foreground">{incoterm}</span>
                      </div>
                    )}
                    {pickupDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium text-foreground">{new Date(pickupDate).toLocaleDateString("fr-FR")}</span>
                      </div>
                    )}
                    {budgetMax && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Budget max</span>
                        <span className="font-medium text-foreground">{parseInt(budgetMax).toLocaleString()} FCFA</span>
                      </div>
                    )}
                    {(customsRequired || insuranceRequired) && (
                      <div className="flex gap-2 mt-1">
                        {customsRequired && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Dedouanement</span>}
                        {insuranceRequired && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Assurance</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground">{description}</p>
                </div>

                {photoPreviews.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground">Photos ({photoPreviews.length})</p>
                    <div className="flex gap-2 overflow-x-auto">
                      {photoPreviews.map((src, i) => (
                        <img key={i} src={src} alt="" className="w-14 h-14 rounded-lg object-cover border border-border flex-shrink-0" />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep("details")} className="flex-1">Modifier</Button>
                  <Button onClick={handleSubmit} disabled={loading} className="flex-1 gap-2">
                    {loading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Envoyer</>}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ═══════ STEP 4: Success ═══════ */}
            {step === "success" && (
              <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4 py-10">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Demande envoyée !</h3>
                <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                  {mode === "multi"
                    ? "Votre demande multi-corridor a été transmise. Des prestataires spécialisés vous contacteront avec leurs offres combinées."
                    : "Les transporteurs vérifiés recevront votre demande et vous enverront leurs offres."}
                </p>
                <Button onClick={handleClose} className="mt-4 gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Terminé
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
