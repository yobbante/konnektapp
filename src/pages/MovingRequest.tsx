/**
 * MovingRequest - Formulaire de demande de déménagement
 * 
 * Parcours interactif mobile-first pour les demandes de déménagement
 * avec estimation automatique et fonctionnalités complètes
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Package, MapPin, Calendar, Clock, Home, Building2, ChevronRight, ChevronLeft, Check, ArrowRight, Plus, Minus, Shield, Star, Info, Camera, FileText, Phone, User, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { toast } from "@/hooks/use-toast";
import { MiniLoader } from "@/components/ui/MiniLoader";
interface RoomItem {
  id: string;
  name: string;
  quantity: number;
  icon: string;
}
interface MovingFormData {
  // Step 1 - Type de logement
  housingType: "apartment" | "house" | "studio" | "office";
  rooms: number;
  floor: number;
  hasElevator: boolean;

  // Step 2 - Adresses
  originAddress: string;
  originCity: string;
  originFloor: number;
  originElevator: boolean;
  destinationAddress: string;
  destinationCity: string;
  destinationFloor: number;
  destinationElevator: boolean;

  // Step 3 - Date et créneaux
  movingDate: string;
  timeSlot: string;
  isFlexible: boolean;

  // Step 4 - Inventaire
  items: RoomItem[];
  additionalNotes: string;

  // Step 5 - Services additionnels
  needPacking: boolean;
  needUnpacking: boolean;
  needFurnitureAssembly: boolean;
  needStorage: boolean;
  storageDuration?: number;

  // Contact
  contactName: string;
  contactPhone: string;
}
const defaultItems: RoomItem[] = [{
  id: "bed",
  name: "Lit",
  quantity: 0,
  icon: "🛏️"
}, {
  id: "sofa",
  name: "Canapé",
  quantity: 0,
  icon: "🛋️"
}, {
  id: "table",
  name: "Table",
  quantity: 0,
  icon: "🪑"
}, {
  id: "chair",
  name: "Chaise",
  quantity: 0,
  icon: "💺"
}, {
  id: "wardrobe",
  name: "Armoire",
  quantity: 0,
  icon: "🚪"
}, {
  id: "fridge",
  name: "Réfrigérateur",
  quantity: 0,
  icon: "❄️"
}, {
  id: "washer",
  name: "Machine à laver",
  quantity: 0,
  icon: "🧺"
}, {
  id: "tv",
  name: "TV",
  quantity: 0,
  icon: "📺"
}, {
  id: "boxes",
  name: "Cartons (estimés)",
  quantity: 0,
  icon: ""
}];
const timeSlots = [{
  id: "morning",
  label: "Matin",
  time: "8h - 12h"
}, {
  id: "afternoon",
  label: "Après-midi",
  time: "14h - 18h"
}, {
  id: "full",
  label: "Journée",
  time: "8h - 18h"
}];
const housingTypes = [{
  id: "studio",
  label: "Studio",
  icon: Home,
  rooms: 1
}, {
  id: "apartment",
  label: "Appartement",
  icon: Building2,
  rooms: 3
}, {
  id: "house",
  label: "Maison",
  icon: Home,
  rooms: 5
}, {
  id: "office",
  label: "Bureau",
  icon: Building2,
  rooms: 2
}];
export default function MovingRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MovingFormData>({
    housingType: "apartment",
    rooms: 2,
    floor: 0,
    hasElevator: false,
    originAddress: "",
    originCity: "",
    originFloor: 0,
    originElevator: false,
    destinationAddress: "",
    destinationCity: "",
    destinationFloor: 0,
    destinationElevator: false,
    movingDate: "",
    timeSlot: "morning",
    isFlexible: false,
    items: [...defaultItems],
    additionalNotes: "",
    needPacking: false,
    needUnpacking: false,
    needFurnitureAssembly: false,
    needStorage: false,
    contactName: "",
    contactPhone: ""
  });
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        sessionStorage.setItem("pending_booking_state", JSON.stringify({
          returnPath: "/demenagement",
          timestamp: Date.now()
        }));
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      // Load profile data
      const {
        data: profile
      } = await supabase.from("profiles").select("full_name, phone, city").eq("user_id", user.id).single();
      if (profile) {
        setFormData(prev => ({
          ...prev,
          contactName: profile.full_name || "",
          contactPhone: profile.phone || "",
          originCity: profile.city || ""
        }));
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };
  const updateItem = (itemId: string, delta: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === itemId ? {
        ...item,
        quantity: Math.max(0, item.quantity + delta)
      } : item)
    }));
  };
  const calculateEstimate = () => {
    // Base price by housing type
    const basePrices: Record<string, number> = {
      studio: 50000,
      apartment: 100000,
      house: 200000,
      office: 150000
    };
    let total = basePrices[formData.housingType] || 100000;

    // Add for rooms
    total += (formData.rooms - 2) * 25000;

    // Add for floors (if no elevator)
    if (!formData.originElevator && formData.originFloor > 0) {
      total += formData.originFloor * 5000;
    }
    if (!formData.destinationElevator && formData.destinationFloor > 0) {
      total += formData.destinationFloor * 5000;
    }

    // Add for items
    const itemCounts = formData.items.reduce((acc, item) => acc + item.quantity, 0);
    total += itemCounts * 2000;

    // Add for services
    if (formData.needPacking) total += 30000;
    if (formData.needUnpacking) total += 25000;
    if (formData.needFurnitureAssembly) total += 20000;
    if (formData.needStorage) total += (formData.storageDuration || 1) * 50000;
    return total;
  };
  const handleSubmit = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      // Create custom request for moving - handled by Konnekt internal team
      const requestData = {
        client_id: userId,
        shipment_type: "demenagement",
        transport_type: "interne",
        // Konnekt internal logistics
        origin_city: formData.originCity,
        origin_country: "Sénégal",
        destination_city: formData.destinationCity,
        destination_country: "Sénégal",
        description: `[DÉMÉNAGEMENT KONNEKT] ${housingTypes.find(h => h.id === formData.housingType)?.label} - ${formData.rooms} pièces. 
Adresse départ: ${formData.originAddress} (étage ${formData.originFloor}, ${formData.originElevator ? 'avec' : 'sans'} ascenseur)
Adresse arrivée: ${formData.destinationAddress} (étage ${formData.destinationFloor}, ${formData.destinationElevator ? 'avec' : 'sans'} ascenseur)
Inventaire: ${formData.items.filter(i => i.quantity > 0).map(i => `${i.name}: ${i.quantity}`).join(', ')}
${formData.additionalNotes ? `Notes: ${formData.additionalNotes}` : ''}`,
        pickup_date_from: formData.movingDate,
        pickup_date_to: formData.movingDate,
        volume_estimate: `${formData.rooms * 10}m³`,
        budget_min: Math.round(calculateEstimate() * 0.8),
        budget_max: Math.round(calculateEstimate() * 1.2),
        additional_services: [formData.needPacking && "Emballage", formData.needUnpacking && "Déballage", formData.needFurnitureAssembly && "Montage meubles", formData.needStorage && `Stockage ${formData.storageDuration}j`].filter(Boolean) as string[],
        request_number: `DEM-${Date.now().toString(36).toUpperCase()}`,
        status: "open"
      };
      const {
        data,
        error
      } = await supabase.from("custom_requests").insert(requestData).select().single();
      if (error) throw error;

      // Redirect to confirmation page
      navigate(`/demenagement/confirmation?id=${data.id}&price=${calculateEstimate()}`);
    } catch (error) {
      console.error("Error submitting:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };
  const totalSteps = 5;
  const progress = step / totalSteps * 100;
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <MiniLoader size="lg" />
      </div>;
  }
  return <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />
      
      <main className="px-4 pb-24" style={{
      paddingTop: 'calc(70px + env(safe-area-inset-top, 0px))'
    }}>
        <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Déménagement
              </h1>
              <p className="text-xs text-muted-foreground">Étape {step} sur {totalSteps}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              ~{(calculateEstimate() / 1000).toFixed(0)}K FCFA
            </Badge>
          </div>

          {/* Progress */}
          <div className="w-full h-1.5 bg-muted rounded-full mb-6 overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" initial={{
            width: 0
          }} animate={{
            width: `${progress}%`
          }} transition={{
            duration: 0.3
          }} />
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1 - Housing Type */}
            {step === 1 && <motion.div key="step1" initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: -20
          }} className="space-y-4">
                <h2 className="text-lg font-semibold">Type de logement</h2>
                
                <div className="grid grid-cols-2 gap-3">
                  {housingTypes.map(type => {
                const Icon = type.icon;
                const isSelected = formData.housingType === type.id;
                return <button key={type.id} onClick={() => setFormData({
                  ...formData,
                  housingType: type.id as any,
                  rooms: type.rooms
                })} className={`p-4 rounded-2xl border-2 transition-all text-left ${isSelected ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                        <Icon className={`w-6 h-6 mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="font-medium text-sm">{type.label}</p>
                      </button>;
              })}
                </div>

                <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
                  <div>
                    <Label className="text-sm">Nombre de pièces</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Button variant="outline" size="icon" className="rounded-full" onClick={() => setFormData({
                    ...formData,
                    rooms: Math.max(1, formData.rooms - 1)
                  })}>
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-2xl font-bold w-12 text-center">{formData.rooms}</span>
                      <Button variant="outline" size="icon" className="rounded-full" onClick={() => setFormData({
                    ...formData,
                    rooms: formData.rooms + 1
                  })}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Button className="w-full" onClick={() => setStep(2)}>
                  Continuer <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>}

            {/* Step 2 - Addresses */}
            {step === 2 && <motion.div key="step2" initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: -20
          }} className="space-y-4">
                <h2 className="text-lg font-semibold">Adresses</h2>
                
                {/* Origin */}
                <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">A</span>
                    </div>
                    Adresse de départ
                  </h3>
                  <div className="space-y-3">
                    <Input placeholder="Adresse complète" value={formData.originAddress} onChange={e => setFormData({
                  ...formData,
                  originAddress: e.target.value
                })} />
                    <Input placeholder="Ville" value={formData.originCity} onChange={e => setFormData({
                  ...formData,
                  originCity: e.target.value
                })} />
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label className="text-xs">Étage</Label>
                        <Input type="number" min="0" value={formData.originFloor} onChange={e => setFormData({
                      ...formData,
                      originFloor: parseInt(e.target.value) || 0
                    })} />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <Switch checked={formData.originElevator} onCheckedChange={checked => setFormData({
                      ...formData,
                      originElevator: checked
                    })} />
                        <Label className="text-xs">Ascenseur</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Destination */}
                <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-success">B</span>
                    </div>
                    Adresse d'arrivée
                  </h3>
                  <div className="space-y-3">
                    <Input placeholder="Adresse complète" value={formData.destinationAddress} onChange={e => setFormData({
                  ...formData,
                  destinationAddress: e.target.value
                })} />
                    <Input placeholder="Ville" value={formData.destinationCity} onChange={e => setFormData({
                  ...formData,
                  destinationCity: e.target.value
                })} />
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label className="text-xs">Étage</Label>
                        <Input type="number" min="0" value={formData.destinationFloor} onChange={e => setFormData({
                      ...formData,
                      destinationFloor: parseInt(e.target.value) || 0
                    })} />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <Switch checked={formData.destinationElevator} onCheckedChange={checked => setFormData({
                      ...formData,
                      destinationElevator: checked
                    })} />
                        <Label className="text-xs">Ascenseur</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <Button className="w-full" onClick={() => setStep(3)}>
                  Continuer <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>}

            {/* Step 3 - Date */}
            {step === 3 && <motion.div key="step3" initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: -20
          }} className="space-y-4">
                <h2 className="text-lg font-semibold">Date et créneau</h2>
                
                <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
                  <div>
                    <Label className="text-sm">Date souhaitée</Label>
                    <Input type="date" value={formData.movingDate} onChange={e => setFormData({
                  ...formData,
                  movingDate: e.target.value
                })} min={new Date().toISOString().split('T')[0]} className="mt-1" />
                  </div>

                  <div>
                    <Label className="text-sm">Créneau horaire</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {timeSlots.map(slot => <button key={slot.id} onClick={() => setFormData({
                    ...formData,
                    timeSlot: slot.id
                  })} className={`p-3 rounded-xl border-2 transition-all text-center ${formData.timeSlot === slot.id ? "border-primary bg-primary/5" : "border-border"}`}>
                          <p className="font-medium text-sm">{slot.label}</p>
                          <p className="text-[10px] text-muted-foreground">{slot.time}</p>
                        </button>)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Date flexible</p>
                      <p className="text-xs text-muted-foreground">±3 jours pour plus d'options</p>
                    </div>
                    <Switch checked={formData.isFlexible} onCheckedChange={checked => setFormData({
                  ...formData,
                  isFlexible: checked
                })} />
                  </div>
                </div>

                <Button className="w-full" onClick={() => setStep(4)} disabled={!formData.movingDate}>
                  Continuer <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>}

            {/* Step 4 - Inventory */}
            {step === 4 && <motion.div key="step4" initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: -20
          }} className="space-y-4">
                <h2 className="text-lg font-semibold">Inventaire</h2>
                
                <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                  {formData.items.map(item => <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium text-sm">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="w-8 h-8 rounded-full" onClick={() => updateItem(item.id, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center font-medium">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="w-8 h-8 rounded-full" onClick={() => updateItem(item.id, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>)}
                </div>

                <div>
                  <Label className="text-sm">Notes additionnelles</Label>
                  <Textarea placeholder="Objets fragiles, accès difficile, etc." value={formData.additionalNotes} onChange={e => setFormData({
                ...formData,
                additionalNotes: e.target.value
              })} className="mt-1" rows={3} />
                </div>

                <Button className="w-full" onClick={() => setStep(5)}>
                  Continuer <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>}

            {/* Step 5 - Services & Confirmation */}
            {step === 5 && <motion.div key="step5" initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: -20
          }} className="space-y-4">
                <h2 className="text-lg font-semibold">Services et confirmation</h2>
                
                {/* Additional Services */}
                <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                  <h3 className="font-medium text-sm mb-2">Services additionnels</h3>
                  
                  {[{
                key: "needPacking",
                label: "Emballage",
                desc: "On emballe vos affaires",
                price: "+30K"
              }, {
                key: "needUnpacking",
                label: "Déballage",
                desc: "On déballe à l'arrivée",
                price: "+25K"
              }, {
                key: "needFurnitureAssembly",
                label: "Montage meubles",
                desc: "Démontage et remontage",
                price: "+20K"
              }, {
                key: "needStorage",
                label: "Stockage temporaire",
                desc: "Garde-meuble sécurisé",
                price: "+50K/j"
              }].map(service => <div key={service.key} className="flex items-center justify-between py-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{service.label}</p>
                        <p className="text-xs text-muted-foreground">{service.desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{service.price}</Badge>
                        <Switch checked={formData[service.key as keyof MovingFormData] as boolean} onCheckedChange={checked => setFormData({
                    ...formData,
                    [service.key]: checked
                  })} />
                      </div>
                    </div>)}
                </div>

                {/* Contact */}
                <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                  <h3 className="font-medium text-sm">Coordonnées</h3>
                  <Input placeholder="Votre nom" value={formData.contactName} onChange={e => setFormData({
                ...formData,
                contactName: e.target.value
              })} />
                  <Input placeholder="Téléphone" value={formData.contactPhone} onChange={e => setFormData({
                ...formData,
                contactPhone: e.target.value
              })} />
                </div>

                {/* Estimate */}
                <div className="bg-gradient-to-r from-primary/10 to-success/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-primary" />
                      <span className="font-semibold">Estimation</span>
                    </div>
                    <Badge variant="secondary">Non contractuel</Badge>
                  </div>
                  <p className="text-3xl font-bold text-primary">
                    {(calculateEstimate() / 1000).toFixed(0)}K <span className="text-base font-normal">FCFA</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les transporteurs vous enverront leurs devis définitifs
                  </p>
                </div>

                {/* Trust */}
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4 text-success" />
                    <span>Assurance incluse</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning" />
                    <span>Équipe Yobbanté</span>
                  </div>
                </div>

                <Button className="w-full" onClick={handleSubmit} disabled={submitting || !formData.contactName || !formData.contactPhone}>
                  {submitting ? <MiniLoader size="sm" /> : <>
                      Envoyer la demande <ArrowRight className="w-4 h-4 ml-2" />
                    </>}
                </Button>
              </motion.div>}
          </AnimatePresence>
        </motion.div>
      </main>

      <MobileNav />
    </div>;
}