/**
 * MaritimeBookingPage — 6-step client booking wizard for maritime transport
 * Steps: 1. Marchandise → 2. Origine → 3. Destination → 4. Documents → 5. Options → 6. Paiement
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ship, ArrowLeft, ArrowRight, Package, MapPin, FileText,
  Settings, CreditCard, Check, Loader2, Shield, Truck,
  Scale, ChevronLeft, Info, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Marchandise", icon: Package },
  { id: 2, label: "Origine", icon: MapPin },
  { id: 3, label: "Destination", icon: MapPin },
  { id: 4, label: "Documents", icon: FileText },
  { id: 5, label: "Options", icon: Settings },
  { id: 6, label: "Confirmation", icon: CreditCard },
];

const merchandiseTypes = [
  "Effets personnels", "Électronique", "Textile", "Pièces auto",
  "Alimentaire", "Matériaux construction", "Machines", "Véhicule", "Divers"
];

const freightModes = [
  { value: "lcl", label: "Groupage LCL", desc: "Volume partiel, au m³", icon: "📦" },
  { value: "fcl", label: "Conteneur FCL", desc: "20ft ou 40ft dédié", icon: "🏗️" },
  { value: "roro", label: "RoRo Véhicule", desc: "Transport de véhicule", icon: "🚗" },
];

export default function MaritimeBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Merchandise
  const [freightMode, setFreightMode] = useState("lcl");
  const [merchandiseType, setMerchandiseType] = useState("");
  const [merchandiseDesc, setMerchandiseDesc] = useState("");
  const [weight, setWeight] = useState("");
  const [volume, setVolume] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  const [isFragile, setIsFragile] = useState(false);
  // Vehicle fields
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleRunning, setVehicleRunning] = useState(true);

  // Step 2: Origin
  const [originPort, setOriginPort] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [originCountry, setOriginCountry] = useState("Chine");
  const [supplierAddress, setSupplierAddress] = useState("");

  // Step 3: Destination
  const [destPort, setDestPort] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destCountry, setDestCountry] = useState("Sénégal");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [finalDeliveryMode, setFinalDeliveryMode] = useState("port");

  // Step 4: Documents
  const [hasInvoice, setHasInvoice] = useState(false);
  const [hasPackingList, setHasPackingList] = useState(false);
  const [notes, setNotes] = useState("");

  // Step 5: Options
  const [customsRequired, setCustomsRequired] = useState(false);
  const [insuranceRequired, setInsuranceRequired] = useState(false);
  const [lastMileDelivery, setLastMileDelivery] = useState(false);
  const [pickupDateFrom, setPickupDateFrom] = useState("");
  const [pickupDateTo, setPickupDateTo] = useState("");
  const [containerType, setContainerType] = useState("20ft Standard");

  const isVehicle = freightMode === "roro";

  const canProceed = () => {
    switch (step) {
      case 1: return freightMode && (isVehicle ? vehicleMake : merchandiseType);
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
        freight_mode: "maritime",
        origin_city: originCity,
        origin_country: originCountry,
        origin_port_or_airport: originPort || null,
        destination_city: destCity,
        destination_country: destCountry,
        destination_port_or_airport: destPort || null,
        merchandise_type: isVehicle ? "vehicle" : merchandiseType.toLowerCase(),
        merchandise_description: merchandiseDesc || null,
        weight_kg: weight ? parseFloat(weight) : null,
        volume_m3: volume ? parseFloat(volume) : null,
        declared_value: declaredValue ? parseFloat(declaredValue) : null,
        is_fragile: isFragile,
        is_vehicle: isVehicle,
        vehicle_make: isVehicle ? vehicleMake : null,
        vehicle_model: isVehicle ? vehicleModel : null,
        vehicle_year: vehicleYear ? parseInt(vehicleYear) : null,
        vehicle_running: isVehicle ? vehicleRunning : null,
        customs_required: customsRequired,
        insurance_required: insuranceRequired,
        final_delivery_mode: lastMileDelivery ? "door" : "port",
        pickup_date_from: pickupDateFrom || null,
        pickup_date_to: pickupDateTo || null,
        notes: notes || null,
        incoterm: null,
        dimensions_cm: containerType !== "20ft Standard" ? containerType : null,
        status: "open",
      });

      if (error) throw error;

      toast({ title: "🚢 Demande envoyée !", description: "Les transitaires vont recevoir votre demande." });
      setStep(7); // success
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-primary to-primary/90 shadow-lg" style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}>
        <div className="px-3 py-2.5 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8" onClick={() => step > 1 && step < 7 ? setStep(step - 1) : navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-primary-foreground font-bold text-sm">Transport Maritime</h1>
            {step < 7 && <p className="text-primary-foreground/70 text-[10px]">Étape {step}/6 — {STEPS[step - 1]?.label}</p>}
          </div>
        </div>
        {/* Progress bar */}
        {step < 7 && (
          <div className="h-1 bg-primary-foreground/20">
            <div className="h-full bg-primary-foreground transition-all" style={{ width: `${(step / 6) * 100}%` }} />
          </div>
        )}
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto pb-32">
        <AnimatePresence mode="wait">
          {/* STEP 1: MERCHANDISE */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-base font-bold">Votre marchandise</h2>
                <p className="text-xs text-muted-foreground">Décrivez ce que vous souhaitez expédier</p>
              </div>

              {/* Freight mode selector */}
              <div className="space-y-2">
                <Label className="text-xs font-bold">Type d'expédition</Label>
                <div className="grid grid-cols-3 gap-2">
                  {freightModes.map(m => (
                    <button key={m.value} onClick={() => setFreightMode(m.value)}
                      className={cn("p-3 rounded-xl border-2 text-center transition-all active:scale-[0.98]",
                        freightMode === m.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/30")}>
                      <span className="text-xl">{m.icon}</span>
                      <p className="text-[10px] font-semibold mt-1">{m.label}</p>
                      <p className="text-[8px] text-muted-foreground">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {isVehicle ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-[10px]">Marque *</Label><Input value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} placeholder="Toyota" className="h-9 text-xs" /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Modèle</Label><Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Hilux" className="h-9 text-xs" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-[10px]">Année</Label><Input type="number" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} placeholder="2020" className="h-9 text-xs" /></div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                      <span className="text-xs">Roulant</span>
                      <Switch checked={vehicleRunning} onCheckedChange={setVehicleRunning} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
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
                    <div className="space-y-1"><Label className="text-[10px]">Poids (kg)</Label><Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="500" className="h-9 text-xs" /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Volume (m³)</Label><Input type="number" value={volume} onChange={e => setVolume(e.target.value)} placeholder="4" className="h-9 text-xs" /></div>
                  </div>
                  <div className="space-y-1"><Label className="text-[10px]">Valeur déclarée (FCFA)</Label><Input type="number" value={declaredValue} onChange={e => setDeclaredValue(e.target.value)} placeholder="2000000" className="h-9 text-xs" /></div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                    <span className="text-xs">Marchandise fragile</span>
                    <Switch checked={isFragile} onCheckedChange={setIsFragile} />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: ORIGIN */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-base font-bold">Origine</h2>
                <p className="text-xs text-muted-foreground">Port ou adresse du fournisseur</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-[10px]">Ville *</Label><Input value={originCity} onChange={e => setOriginCity(e.target.value)} placeholder="Guangzhou" className="h-9 text-xs" /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Pays *</Label><Input value={originCountry} onChange={e => setOriginCountry(e.target.value)} placeholder="Chine" className="h-9 text-xs" /></div>
                </div>
                <div className="space-y-1"><Label className="text-[10px]">Port d'embarquement</Label><Input value={originPort} onChange={e => setOriginPort(e.target.value)} placeholder="Port of Guangzhou" className="h-9 text-xs" /></div>
                <div className="space-y-1"><Label className="text-[10px]">Adresse fournisseur / entrepôt</Label><Textarea value={supplierAddress} onChange={e => setSupplierAddress(e.target.value)} placeholder="Adresse complète du lieu d'enlèvement" rows={2} className="text-xs" /></div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: DESTINATION */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-base font-bold">Destination</h2>
                <p className="text-xs text-muted-foreground">Port d'arrivée et livraison finale</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-[10px]">Ville *</Label><Input value={destCity} onChange={e => setDestCity(e.target.value)} placeholder="Dakar" className="h-9 text-xs" /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Pays *</Label><Input value={destCountry} onChange={e => setDestCountry(e.target.value)} placeholder="Sénégal" className="h-9 text-xs" /></div>
                </div>
                <div className="space-y-1"><Label className="text-[10px]">Port d'arrivée</Label><Input value={destPort} onChange={e => setDestPort(e.target.value)} placeholder="Port de Dakar" className="h-9 text-xs" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Livraison finale</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "port", label: "Retrait au port", desc: "Vous récupérez au port" },
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

          {/* STEP 4: DOCUMENTS */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-base font-bold">Documents</h2>
                <p className="text-xs text-muted-foreground">Documents nécessaires pour l'importation</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold">Facture commerciale</p>
                      <p className="text-[9px] text-muted-foreground">Invoice / proforma</p>
                    </div>
                  </div>
                  <Switch checked={hasInvoice} onCheckedChange={setHasInvoice} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold">Packing List</p>
                      <p className="text-[9px] text-muted-foreground">Liste de colisage</p>
                    </div>
                  </div>
                  <Switch checked={hasPackingList} onCheckedChange={setHasPackingList} />
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800 dark:text-amber-200">
                      Les documents pourront être téléchargés plus tard. Préparez facture, packing list et certificat d'origine si applicable.
                    </p>
                  </div>
                </div>
                <div className="space-y-1"><Label className="text-[10px]">Notes / instructions</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Informations complémentaires..." rows={3} className="text-xs" /></div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: OPTIONS */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <h2 className="text-base font-bold">Options</h2>
                <p className="text-xs text-muted-foreground">Services complémentaires</p>
              </div>
              <div className="space-y-3">
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
                    <div><p className="text-xs font-semibold">Assurance maritime</p><p className="text-[9px] text-muted-foreground">Protection marchandise</p></div>
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

                {freightMode === "fcl" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Type de conteneur</Label>
                    <Select value={containerType} onValueChange={setContainerType}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["20ft Standard", "40ft Standard", "40ft High Cube", "20ft Reefer", "40ft Reefer"].map(c => (
                          <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-[10px]">Enlèvement dès le</Label><Input type="date" value={pickupDateFrom} onChange={e => setPickupDateFrom(e.target.value)} className="h-9 text-xs" /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Jusqu'au</Label><Input type="date" value={pickupDateTo} onChange={e => setPickupDateTo(e.target.value)} className="h-9 text-xs" /></div>
                </div>
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
                    <Ship className="w-4 h-4 text-primary" />
                    {originCity || "Origine"} → {destCity || "Destination"}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-muted-foreground">Type:</span> {freightModes.find(f => f.value === freightMode)?.label}</div>
                    {isVehicle ? (
                      <div><span className="text-muted-foreground">Véhicule:</span> {vehicleMake} {vehicleModel}</div>
                    ) : (
                      <div><span className="text-muted-foreground">Marchandise:</span> {merchandiseType}</div>
                    )}
                    {weight && <div><span className="text-muted-foreground">Poids:</span> {weight} kg</div>}
                    {volume && <div><span className="text-muted-foreground">Volume:</span> {volume} m³</div>}
                    {originPort && <div><span className="text-muted-foreground">Port départ:</span> {originPort}</div>}
                    {destPort && <div><span className="text-muted-foreground">Port arrivée:</span> {destPort}</div>}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
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
                    Votre demande sera envoyée aux transitaires maritimes qui couvrent ce corridor.
                    Vous recevrez des propositions avec prix, délai de transit et services inclus.
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
                Les transitaires maritimes vont recevoir votre demande et vous envoyer leurs meilleures propositions.
              </p>
              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                <Button onClick={() => navigate("/reservations")} className="w-full">
                  Mes réservations
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                  Retour à l'accueil
                </Button>
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
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ship className="w-4 h-4 mr-2" />}
                Envoyer la demande
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
