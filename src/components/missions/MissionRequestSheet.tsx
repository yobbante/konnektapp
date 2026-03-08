/**
 * MissionRequestSheet — Full mission request form
 * Supports: Routier, Maritime, Aérien (not GP bagages)
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Send, Truck, Ship, Plane, Package, MapPin, Calendar, Weight, 
  ChevronRight, CheckCircle2, Info
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

export function MissionRequestSheet({ open, onOpenChange }: MissionRequestSheetProps) {
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<TransportMode | null>(null);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [originCity, setOriginCity] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destCountry, setDestCountry] = useState("");
  const [description, setDescription] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  const resetForm = () => {
    setStep("mode");
    setMode(null);
    setOriginCity(""); setOriginCountry(""); setDestCity(""); setDestCountry("");
    setDescription(""); setWeightKg(""); setPickupDate(""); setBudgetMax("");
    setIsUrgent(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 300);
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

      if (mode === "routier") {
        const { error } = await supabase.from("routier_missions").insert([{
          client_id: session.user.id,
          origin_city: originCity.trim(),
          origin_country: originCountry.trim() || "Sénégal",
          destination_city: destCity.trim(),
          destination_country: destCountry.trim() || "Sénégal",
          freight_type: "Marchandise",
          merchandise_description: description.trim(),
          weight_kg: weightKg ? parseFloat(weightKg) : 0,
          pickup_date_start: pickupDate || new Date().toISOString().split("T")[0],
          client_budget: budgetMax ? parseFloat(budgetMax) : null,
          urgency: isUrgent ? "express" as const : "normal" as const,
          mission_number: `MSN-${Date.now()}`,
          status: "open",
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

                {/* Origin */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Départ
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={originCity}
                      onChange={(e) => setOriginCity(e.target.value)}
                      placeholder="Ville"
                      className="flex-1"
                    />
                    <Input
                      value={originCountry}
                      onChange={(e) => setOriginCountry(e.target.value)}
                      placeholder="Pays"
                      className="w-28"
                    />
                  </div>
                </div>

                {/* Destination */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Destination
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={destCity}
                      onChange={(e) => setDestCity(e.target.value)}
                      placeholder="Ville"
                      className="flex-1"
                    />
                    <Input
                      value={destCountry}
                      onChange={(e) => setDestCountry(e.target.value)}
                      placeholder="Pays"
                      className="w-28"
                    />
                  </div>
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

                {/* Weight + Date row */}
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Weight className="w-3.5 h-3.5" /> Poids (kg)
                    </label>
                    <Input
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="Estimé"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Date souhaitée
                    </label>
                    <Input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                    />
                  </div>
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
                    {weightKg && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Poids</span>
                        <span className="font-medium text-foreground">{weightKg} kg</span>
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
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground">{description}</p>
                </div>

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