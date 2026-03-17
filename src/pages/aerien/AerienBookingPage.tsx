/**
 * AerienBookingPage — 6-step client booking wizard for air cargo
 * Steps: 1. Colis → 2. Origine → 3. Destination → 4. Options → 5. Documents → 6. Confirmation
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plane, ArrowLeft, ArrowRight, Package, MapPin, FileText,
  Settings, CreditCard, Check, Loader2, Shield, Truck,
  Scale, ChevronLeft, Info, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Colis", icon: Package },
  { id: 2, label: "Origine", icon: MapPin },
  { id: 3, label: "Destination", icon: MapPin },
  { id: 4, label: "Options", icon: Settings },
  { id: 5, label: "Documents", icon: FileText },
  { id: 6, label: "Confirmation", icon: CreditCard },
];

const merchandiseTypes = [
  "Documents urgents", "Électronique", "E-commerce", "Textile",
  "Pièces détachées", "Échantillons", "Pharmaceutique", "Divers"
];

export default function AerienBookingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Package
  const [merchandiseType, setMerchandiseType] = useState("");
  const [merchandiseDesc, setMerchandiseDesc] = useState("");
  const [weight, setWeight] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  const [isFragile, setIsFragile] = useState(false);

  // Step 2: Origin
  const [originAirport, setOriginAirport] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [originCountry, setOriginCountry] = useState("France");
  const [pickupAddress, setPickupAddress] = useState("");

  // Step 3: Destination
  const [destAirport, setDestAirport] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destCountry, setDestCountry] = useState("Sénégal");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [finalDeliveryMode, setFinalDeliveryMode] = useState("airport");

  // Step 4: Options
  const [isExpress, setIsExpress] = useState(false);
  const [customsRequired, setCustomsRequired] = useState(false);
  const [insuranceRequired, setInsuranceRequired] = useState(false);
  const [lastMileDelivery, setLastMileDelivery] = useState(false);
  const [pickupDateFrom, setPickupDateFrom] = useState("");
  const [pickupDateTo, setPickupDateTo] = useState("");

  // Step 5: Documents
  const [hasInvoice, setHasInvoice] = useState(false);
  const [notes, setNotes] = useState("");

  const canProceed = () => {
    switch (step) {
      case 1: return merchandiseType && weight;
      case 2: return originCity && originCountry;
      case 3: return destCity && destCountry;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { error } = await supabase.from("freight_requests").insert({
        client_id: session.user.id,
        request_number: "FRT-TEMP",
        freight_mode: "air",
        origin_city: originCity,
        origin_country: originCountry,
        origin_port_or_airport: originAirport || null,
        destination_city: destCity,
        destination_country: destCountry,
        destination_port_or_airport: destAirport || null,
        merchandise_type: merchandiseType.toLowerCase(),
        merchandise_description: merchandiseDesc || null,
        weight_kg: weight ? parseFloat(weight) : null,
        dimensions_cm: dimensions || null,
        declared_value: declaredValue ? parseFloat(declaredValue) : null,
        is_fragile: isFragile,
        is_urgent: isExpress,
        urgency_level: isExpress ? "express" : "standard",
        customs_required: customsRequired,
        insurance_required: insuranceRequired,
        final_delivery_mode: lastMileDelivery ? "door" : "airport",
        pickup_date_from: pickupDateFrom || null,
        pickup_date_to: pickupDateTo || null,
        notes: notes || null,
        status: "open",
      });

      if (error) throw error;
      toast({ title: "Demande envoyee", description: "Les transporteurs cargo vont recevoir votre demande." });
      setStep(7);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-violet-600 to-violet-500 shadow-lg" style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}>
        <div className="px-3 py-2.5 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8" onClick={() => step > 1 && step < 7 ? setStep(step - 1) : navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-white font-bold text-sm">Cargo Aérien</h1>
            {step < 7 && <p className="text-white/70 text-[10px]">Étape {step}/6 — {STEPS[step - 1]?.label}</p>}
          </div>
        </div>
        {step < 7 && (
          <div className="h-1 bg-white/20">
            <div className="h-full bg-white transition-all" style={{ width: `${(step / 6) * 100}%` }} />
          </div>
        )}
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto pb-32">
        <AnimatePresence mode="wait">
          {/* STEP 1: PACKAGE */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-base font-bold">Votre colis</h2>
                <p className="text-xs text-muted-foreground">Décrivez le contenu de votre envoi</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Type de marchandise *</Label>
                <div className="flex flex-wrap gap-1.5">
                  {merchandiseTypes.map(t => (
                    <button key={t} onClick={() => setMerchandiseType(t)}
                      className={cn("text-[11px] px-2.5 py-1.5 rounded-lg border transition-all",
                        merchandiseType === t ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50")}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1"><Label className="text-[10px]">Description</Label><Textarea value={merchandiseDesc} onChange={e => setMerchandiseDesc(e.target.value)} placeholder="Nature, quantité..." rows={2} className="text-xs" /></div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-[10px]">Poids (kg) *</Label><Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="20" className="h-9 text-xs" /></div>
                <div className="space-y-1"><Label className="text-[10px]">Dimensions (LxlxH cm)</Label><Input value={dimensions} onChange={e => setDimensions(e.target.value)} placeholder="60x40x30" className="h-9 text-xs" /></div>
              </div>

              <div className="space-y-1"><Label className="text-[10px]">Valeur déclarée (FCFA)</Label><Input type="number" value={declaredValue} onChange={e => setDeclaredValue(e.target.value)} placeholder="500000" className="h-9 text-xs" /></div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <span className="text-xs">Marchandise fragile</span>
                <Switch checked={isFragile} onCheckedChange={setIsFragile} />
              </div>
            </motion.div>
          )}

          {/* STEP 2: ORIGIN */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-base font-bold">Origine</h2>
                <p className="text-xs text-muted-foreground">Aéroport de départ ou adresse de collecte</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-[10px]">Ville *</Label><Input value={originCity} onChange={e => setOriginCity(e.target.value)} placeholder="Paris" className="h-9 text-xs" /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Pays *</Label><Input value={originCountry} onChange={e => setOriginCountry(e.target.value)} className="h-9 text-xs" /></div>
                </div>
                <div className="space-y-1"><Label className="text-[10px]">Aéroport (optionnel)</Label><Input value={originAirport} onChange={e => setOriginAirport(e.target.value)} placeholder="Charles de Gaulle (CDG)" className="h-9 text-xs" /></div>
                <div className="space-y-1"><Label className="text-[10px]">Adresse de collecte</Label><Textarea value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} placeholder="Adresse où récupérer le colis" rows={2} className="text-xs" /></div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: DESTINATION */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-base font-bold">Destination</h2>
                <p className="text-xs text-muted-foreground">Aéroport d'arrivée et livraison finale</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-[10px]">Ville *</Label><Input value={destCity} onChange={e => setDestCity(e.target.value)} placeholder="Dakar" className="h-9 text-xs" /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Pays *</Label><Input value={destCountry} onChange={e => setDestCountry(e.target.value)} className="h-9 text-xs" /></div>
                </div>
                <div className="space-y-1"><Label className="text-[10px]">Aéroport d'arrivée</Label><Input value={destAirport} onChange={e => setDestAirport(e.target.value)} placeholder="Blaise Diagne (DSS)" className="h-9 text-xs" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Livraison finale</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "airport", label: "Retrait aéroport", desc: "Vous récupérez à l'aéroport" },
                      { value: "door", label: "Livraison porte", desc: "Livraison à domicile" },
                    ].map(o => (
                      <button key={o.value} onClick={() => setFinalDeliveryMode(o.value)}
                        className={cn("p-3 rounded-xl border-2 text-left transition-all active:scale-[0.98]",
                          finalDeliveryMode === o.value ? "border-primary bg-primary/10" : "border-border")}>
                        <p className="text-[11px] font-semibold">{o.label}</p>
                        <p className="text-[9px] text-muted-foreground">{o.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                {finalDeliveryMode === "door" && (
                  <div className="space-y-1"><Label className="text-[10px]">Adresse de livraison</Label><Textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Adresse complète" rows={2} className="text-xs" /></div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 4: OPTIONS */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-base font-bold">Options</h2>
                <p className="text-xs text-muted-foreground">Services complémentaires</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/60 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <div><p className="text-xs font-semibold">Express</p><p className="text-[9px] text-muted-foreground">Livraison prioritaire 24-48h</p></div>
                  </div>
                  <Switch checked={isExpress} onCheckedChange={setIsExpress} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <div><p className="text-xs font-semibold">Dédouanement</p><p className="text-[9px] text-muted-foreground">Prise en charge douane</p></div>
                  </div>
                  <Switch checked={customsRequired} onCheckedChange={setCustomsRequired} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <div><p className="text-xs font-semibold">Assurance cargo</p><p className="text-[9px] text-muted-foreground">Protection marchandise</p></div>
                  </div>
                  <Switch checked={insuranceRequired} onCheckedChange={setInsuranceRequired} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <div><p className="text-xs font-semibold">Livraison finale</p><p className="text-[9px] text-muted-foreground">Dernier kilomètre</p></div>
                  </div>
                  <Switch checked={lastMileDelivery} onCheckedChange={setLastMileDelivery} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-[10px]">Enlèvement dès le</Label><Input type="date" value={pickupDateFrom} onChange={e => setPickupDateFrom(e.target.value)} className="h-9 text-xs" /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Jusqu'au</Label><Input type="date" value={pickupDateTo} onChange={e => setPickupDateTo(e.target.value)} className="h-9 text-xs" /></div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: DOCUMENTS */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-base font-bold">Documents</h2>
                <p className="text-xs text-muted-foreground">Documents nécessaires pour le transport</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <div><p className="text-xs font-semibold">Facture / Description</p><p className="text-[9px] text-muted-foreground">Description de la marchandise</p></div>
                  </div>
                  <Switch checked={hasInvoice} onCheckedChange={setHasInvoice} />
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800 dark:text-amber-200">
                      Les documents pourront être envoyés ultérieurement. Préparez facture et description marchandise si applicable.
                    </p>
                  </div>
                </div>
                <div className="space-y-1"><Label className="text-[10px]">Notes / instructions</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Informations complémentaires..." rows={3} className="text-xs" /></div>
              </div>
            </motion.div>
          )}

          {/* STEP 6: CONFIRMATION */}
          {step === 6 && (
            <motion.div key="s6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-base font-bold">Récapitulatif</h2>
                <p className="text-xs text-muted-foreground">Vérifiez votre demande avant envoi</p>
              </div>

              <Card>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Plane className="w-4 h-4 text-violet-600" />
                    {originCity || "Origine"} → {destCity || "Destination"}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-muted-foreground">Type:</span> {merchandiseType}</div>
                    {weight && <div><span className="text-muted-foreground">Poids:</span> {weight} kg</div>}
                    {dimensions && <div><span className="text-muted-foreground">Dimensions:</span> {dimensions}</div>}
                    {originAirport && <div><span className="text-muted-foreground">Départ:</span> {originAirport}</div>}
                    {destAirport && <div><span className="text-muted-foreground">Arrivée:</span> {destAirport}</div>}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {isExpress && <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30">Express</Badge>}
                    {customsRequired && <Badge variant="secondary" className="text-[10px]">Dédouanement</Badge>}
                    {insuranceRequired && <Badge variant="secondary" className="text-[10px]">Assurance</Badge>}
                    {lastMileDelivery && <Badge variant="secondary" className="text-[10px]">Livraison finale</Badge>}
                    {isFragile && <Badge variant="secondary" className="text-[10px]">Fragile</Badge>}
                  </div>
                </CardContent>
              </Card>

              <div className="bg-muted/50 rounded-xl p-3 border border-border">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground">
                    Votre demande sera envoyée aux transporteurs aériens qui couvrent ce corridor.
                    Vous recevrez des propositions avec prix, délai et services inclus.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* SUCCESS */}
          {step === 7 && (
            <motion.div key="s7" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold">Demande envoyée !</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Les transporteurs cargo vont recevoir votre demande et vous envoyer leurs meilleures propositions.
              </p>
              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                <Button onClick={() => navigate("/reservations")} className="w-full">Mes réservations</Button>
                <Button variant="outline" onClick={() => navigate("/")} className="w-full">Retour à l'accueil</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      {step >= 1 && step <= 6 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border p-3 pb-safe z-50">
          <div className="flex gap-3 max-w-lg mx-auto">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 h-12">
                <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
              </Button>
            )}
            {step < 6 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="flex-1 h-12">
                Suivant <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 h-12 bg-violet-600 hover:bg-violet-700">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plane className="w-4 h-4 mr-2" />}
                Envoyer la demande
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}