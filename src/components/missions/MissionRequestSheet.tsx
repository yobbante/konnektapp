/**
 * MissionRequestSheet — Full mission request form
 * Supports: Routier, Maritime, Aérien (not GP bagages)
 * Features: SearchableCitySelect, auto country, addresses, end date, smart photo picker
 */
import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Send, Truck, Ship, Plane, Package, MapPin, Calendar, Weight, 
  ChevronRight, CheckCircle2, Info, Camera, ImageIcon, FileUp, Clock
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableCitySelect, WORLD_CITIES } from "@/components/gp/SearchableCitySelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { type SizeCategory } from "@/lib/routierUtils";

const SIZE_OPTIONS: { label: SizeCategory; range: string; weight: string; color: string; bg: string }[] = [
  { label: "S", range: "0-50 kg", weight: "25", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700" },
  { label: "M", range: "50-100 kg", weight: "75", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700" },
  { label: "L", range: "100-200 kg", weight: "150", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700" },
  { label: "XL", range: "200-300 kg", weight: "250", color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700" },
  { label: "FRET", range: "> 300 kg", weight: "500", color: "text-red-700 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700" },
];

interface MissionRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TransportMode = "routier" | "maritime" | "aerien";
type Step = "mode" | "details" | "confirm" | "success";

const MODES: { id: TransportMode; icon: React.ElementType; label: string; desc: string; color: string; bg: string }[] = [
  { id: "routier", icon: Truck, label: "Routier", desc: "Transport terrestre national & régional", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { id: "maritime", icon: Ship, label: "Maritime", desc: "Conteneurs & fret maritime international", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { id: "aerien", icon: Plane, label: "Aérien", desc: "Cargo & fret aérien express", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
];

const MAX_PHOTOS = 5;

// Country code to full name
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

export function MissionRequestSheet({ open, onOpenChange }: MissionRequestSheetProps) {
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<TransportMode | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
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

  const resetForm = () => {
    setStep("mode");
    setMode(null);
    setOriginCity(""); setOriginCountry(""); setOriginAddress("");
    setDestCity(""); setDestCountry(""); setDestAddress("");
    setDescription(""); setWeightKg(""); setPickupDate(""); setEndDate("");
    setBudgetMax(""); setIsUrgent(false);
    setPhotos([]); setPhotoPreviews([]); setShowPhotoOptions(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 300);
  };

  const handleCitySelect = (type: "origin" | "dest", city: string, countryCode: string) => {
    const countryName = COUNTRY_MAP[countryCode] || countryCode;
    if (type === "origin") {
      setOriginCity(city);
      setOriginCountry(countryName);
    } else {
      setDestCity(city);
      setDestCountry(countryName);
    }
  };

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - photos.length;
    const newFiles = files.slice(0, remaining);
    
    setPhotos(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      };
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
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
      // Remove capture after click so library mode works next time
      setTimeout(() => fileInputRef.current?.removeAttribute("capture"), 500);
    }
    setShowPhotoOptions(false);
  };

  const openLibrary = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
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

  const canSubmit = originCity.trim() && destCity.trim() && description.trim();

  const handleSubmit = async () => {
    if (!canSubmit || !mode) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Connectez-vous pour envoyer une demande");
        return;
      }

      const photoUrls = photos.length > 0 ? await uploadPhotos(session.user.id) : [];

      // Calculate expires_at from endDate
      const expiresAt = endDate ? new Date(endDate + "T23:59:59").toISOString() : null;

      if (mode === "routier") {
        const { error } = await supabase.from("routier_missions").insert([{
          client_id: session.user.id,
          origin_city: originCity.trim(),
          origin_country: originCountry.trim() || "Sénégal",
          origin_address: originAddress.trim() || null,
          destination_city: destCity.trim(),
          destination_country: destCountry.trim() || "Sénégal",
          destination_address: destAddress.trim() || null,
          freight_type: "Marchandise",
          merchandise_description: description.trim(),
          weight_kg: weightKg ? parseFloat(weightKg) : 0,
          pickup_date_start: pickupDate || new Date().toISOString().split("T")[0],
          pickup_date_end: endDate || null,
          client_budget: budgetMax ? parseFloat(budgetMax) : null,
          urgency: isUrgent ? "express" as const : "standard" as const,
          mission_number: `MSN-${Date.now()}`,
          status: "open",
          photo_urls: photoUrls,
          expires_at: expiresAt,
        }]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("freight_requests").insert({
          client_id: session.user.id,
          origin_city: originCity.trim(),
          origin_country: originCountry.trim() || "France",
          destination_city: destCity.trim(),
          destination_country: destCountry.trim() || "Sénégal",
          freight_mode: mode === "maritime" ? "maritime" : "aerien",
          merchandise_description: description.trim(),
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          pickup_date_from: pickupDate || null,
          pickup_date_to: endDate || null,
          declared_value: budgetMax ? parseFloat(budgetMax) : null,
          is_urgent: isUrgent,
          request_number: `FRT-${Date.now()}`,
          status: "open",
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

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 border-t border-border/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
          <div>
            <h2 className="text-lg font-bold text-foreground">Nouvelle mission</h2>
            <p className="text-xs text-muted-foreground">
              {step === "mode" && "Choisissez votre mode de transport"}
              {step === "details" && `Mission ${selectedMode?.label}`}
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
              <div key={s} className={cn(
                "flex-1 h-1 rounded-full transition-colors",
                ["mode", "details", "confirm"].indexOf(step) >= i ? "bg-primary" : "bg-muted"
              )} />
            ))}
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-5 py-4" style={{ maxHeight: "calc(92vh - 120px)" }}>
          <AnimatePresence mode="wait">
            {/* STEP 1: Mode selection */}
            {step === "mode" && (
              <motion.div
                key="mode"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
                  <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Décrivez votre besoin et recevez des offres de transporteurs vérifiés.
                  </p>
                </div>

                {MODES.map((m) => (
                  <motion.button
                    key={m.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setMode(m.id); setStep("details"); }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                      m.bg, "hover:shadow-sm"
                    )}
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

            {/* STEP 2: Details form */}
            {step === "details" && selectedMode && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="space-y-4"
              >
                {/* Mode badge */}
                <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold", selectedMode.bg, selectedMode.color)}>
                  <selectedMode.icon className="w-3.5 h-3.5" />
                  {selectedMode.label}
                </div>

                {/* Origin city + address */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Ville de collecte
                  </label>
                  <SearchableCitySelect
                    value={originCity}
                    countryCode={WORLD_CITIES.find(c => c.city === originCity)?.country || "SN"}
                    onSelect={(city, code) => handleCitySelect("origin", city, code)}
                    placeholder="Rechercher ville de départ..."
                    label="Ville de collecte"
                  />
                  {originCountry && (
                    <p className="text-[11px] text-muted-foreground ml-1">📍 {originCountry}</p>
                  )}
                  <Input
                    value={originAddress}
                    onChange={(e) => setOriginAddress(e.target.value)}
                    placeholder="Adresse de collecte (optionnel)"
                    className="text-sm"
                  />
                </div>

                {/* Destination city + address */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Ville de livraison
                  </label>
                  <SearchableCitySelect
                    value={destCity}
                    countryCode={WORLD_CITIES.find(c => c.city === destCity)?.country || "SN"}
                    onSelect={(city, code) => handleCitySelect("dest", city, code)}
                    placeholder="Rechercher ville d'arrivée..."
                    label="Ville de livraison"
                  />
                  {destCountry && (
                    <p className="text-[11px] text-muted-foreground ml-1">📍 {destCountry}</p>
                  )}
                  <Input
                    value={destAddress}
                    onChange={(e) => setDestAddress(e.target.value)}
                    placeholder="Adresse de livraison (optionnel)"
                    className="text-sm"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" /> Description de la marchandise
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: 2 palettes de matériaux de construction, 50 cartons de vêtements..."
                    className="min-h-[80px] resize-none"
                  />
                </div>

                {/* Smart Photo Picker — below description */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" /> Photos ({photos.length}/{MAX_PHOTOS})
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleAddPhotos}
                  />

                  <div className="flex gap-2 flex-wrap">
                    {photoPreviews.map((src, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleRemovePhoto(i)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive/90 flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-destructive-foreground" />
                        </button>
                      </div>
                    ))}

                    {photos.length < MAX_PHOTOS && (
                      <div className="relative">
                        <button
                          onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                          className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                        >
                          <Camera className="w-5 h-5" />
                          <span className="text-[9px] mt-0.5">Ajouter</span>
                        </button>

                        {/* Smart photo options popover */}
                        <AnimatePresence>
                          {showPhotoOptions && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 4 }}
                              className="absolute bottom-full left-0 mb-2 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px]"
                            >
                              <button
                                onClick={openCamera}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <Camera className="w-4 h-4 text-primary" />
                                Prendre une photo
                              </button>
                              <div className="h-px bg-border" />
                              <button
                                onClick={openLibrary}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <ImageIcon className="w-4 h-4 text-primary" />
                                Galerie photos
                              </button>
                              <div className="h-px bg-border" />
                              <button
                                onClick={openLibrary}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <FileUp className="w-4 h-4 text-primary" />
                                Fichiers
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>

                {/* Size + Date row */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Weight className="w-3.5 h-3.5" /> Taille du colis
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {SIZE_OPTIONS.map((size) => {
                        const isSelected = weightKg === size.weight;
                        return (
                          <button
                            key={size.label}
                            type="button"
                            onClick={() => setWeightKg(size.weight)}
                            className={cn(
                              "flex flex-col items-center py-2 px-1 rounded-xl border transition-all text-center",
                              isSelected
                                ? `${size.bg} border-2 shadow-sm`
                                : "bg-muted/30 border-border hover:bg-muted/60"
                            )}
                          >
                            <span className={cn("text-sm font-extrabold", isSelected ? size.color : "text-foreground")}>{size.label}</span>
                            <span className="text-[8px] text-muted-foreground leading-tight mt-0.5">{size.range}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Date début
                      </label>
                      <Input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* End date */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Date de fin (expiration de l'annonce)
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={pickupDate || new Date().toISOString().split("T")[0]}
                  />
                  <p className="text-[10px] text-muted-foreground ml-1">
                    L'annonce sera automatiquement désactivée à cette date. Les négociations en cours pourront continuer.
                  </p>
                </div>

                {/* Budget */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Budget max (FCFA)</label>
                  <Input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="Optionnel"
                  />
                </div>

                {/* Urgent toggle */}
                <button
                  onClick={() => setIsUrgent(!isUrgent)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                    isUrgent 
                      ? "bg-destructive/10 border-destructive/30 text-destructive" 
                      : "bg-muted/50 border-border/50 text-muted-foreground"
                  )}
                >
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", isUrgent ? "border-destructive bg-destructive" : "border-muted-foreground/30")}>
                    {isUrgent && <div className="w-2 h-2 rounded-full bg-destructive-foreground" />}
                  </div>
                  <span className="text-sm font-medium">⚡ Urgent</span>
                </button>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => { setStep("mode"); setMode(null); }} className="flex-1">
                    Retour
                  </Button>
                  <Button 
                    onClick={() => setStep("confirm")} 
                    disabled={!canSubmit}
                    className="flex-1 gap-2"
                  >
                    Continuer <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Confirm */}
            {step === "confirm" && selectedMode && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="space-y-4"
              >
                <div className={cn("p-4 rounded-2xl border", selectedMode.bg)}>
                  <div className="flex items-center gap-3 mb-3">
                    <selectedMode.icon className={cn("w-6 h-6", selectedMode.color)} />
                    <span className={cn("font-bold", selectedMode.color)}>{selectedMode.label}</span>
                    {isUrgent && <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">⚡ Urgent</span>}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trajet</span>
                      <span className="font-medium text-foreground">{originCity} → {destCity}</span>
                    </div>
                    {(originAddress || destAddress) && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {originAddress && <p>📦 Collecte : {originAddress}</p>}
                        {destAddress && <p>🏠 Livraison : {destAddress}</p>}
                      </div>
                    )}
                    {weightKg && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Poids</span>
                        <span className="font-medium text-foreground">{weightKg} kg</span>
                      </div>
                    )}
                    {pickupDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date début</span>
                        <span className="font-medium text-foreground">{new Date(pickupDate).toLocaleDateString("fr-FR")}</span>
                      </div>
                    )}
                    {endDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date fin</span>
                        <span className="font-medium text-foreground">{new Date(endDate).toLocaleDateString("fr-FR")}</span>
                      </div>
                    )}
                    {budgetMax && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Budget max</span>
                        <span className="font-medium text-foreground">{parseInt(budgetMax).toLocaleString()} FCFA</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground">{description}</p>
                </div>

                {/* Photo previews in confirm */}
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
                  <Button variant="outline" onClick={() => setStep("details")} className="flex-1">
                    Modifier
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className="flex-1 gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <><Send className="w-4 h-4" /> Envoyer</>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Success */}
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4 py-10"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Demande envoyée !</h3>
                <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                  Les transporteurs vérifiés recevront votre demande et vous enverront leurs offres.
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
