import { useState, useEffect } from "react";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Package, MapPin, Calendar, Clock, 
  AlertTriangle, Zap, CheckCircle, Info, CreditCard, MessageCircle, User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { EscrowPaymentFlow } from "@/components/escrow/EscrowPaymentFlow";
import { createAutoConversationAfterBooking } from "@/lib/autoChat";
import { TransporterInfoCard } from "@/components/booking/TransporterInfoCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const merchandiseTypes = [
  { value: "electronics", label: "Électronique" },
  { value: "clothing", label: "Vêtements & Textiles" },
  { value: "food", label: "Produits alimentaires" },
  { value: "documents", label: "Documents" },
  { value: "cosmetics", label: "Cosmétiques" },
  { value: "household", label: "Articles ménagers" },
  { value: "auto_parts", label: "Pièces auto" },
  { value: "other", label: "Autre" },
];

const timeSlots = [
  { value: "morning", label: "Matin (8h - 12h)" },
  { value: "afternoon", label: "Après-midi (12h - 17h)" },
  { value: "evening", label: "Soir (17h - 20h)" },
  { value: "flexible", label: "Flexible" },
];

interface OrderInfo {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  gp_id: string;
  total_price: number;
  price_per_kg: number;
  gp_name?: string;
  transport_type?: string;
}

export default function PostBookingForm() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [step, setStep] = useState(1);
  const [showEscrow, setShowEscrow] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isBagagesInternational, setIsBagagesInternational] = useState(false);
  
  const [formData, setFormData] = useState({
    // A. Marchandise
    merchandiseType: "",
    merchandiseDescription: "",
    estimatedWeight: "",
    estimatedVolume: "",
    declaredValue: "",
    
    // B. Conditions
    isFragile: false,
    isUrgent: false,
    specialConditions: "",
    
    // C. Logistique
    pickupAddress: "",
    deliveryAddress: "",
    pickupDate: "",
    pickupTimeSlot: "",
  });

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      if (!orderId) {
        navigate("/client/dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, origin_city, destination_city, gp_id, logistics_status, total_price, price_per_kg")
        .eq("id", orderId)
        .eq("client_id", user.id)
        .single();

      if (error || !data) {
        toast({ title: "Commande non trouvée", variant: "destructive" });
        navigate("/client/dashboard");
        return;
      }

      if (data.logistics_status !== "pending_info") {
        toast({ title: "Formulaire déjà soumis" });
        navigate("/client/dashboard");
        return;
      }

      // Get GP name for auto chat
      const { data: gpData } = await supabase
        .from("gp_profiles")
        .select("business_name, gp_type")
        .eq("id", data.gp_id)
        .single();

      setOrder({
        ...data,
        gp_name: gpData?.business_name || "Transporteur",
        transport_type: gpData?.gp_type,
      });
      
      // Check if this is a bagages_international GP for escrow
      setIsBagagesInternational(gpData?.gp_type === "bagages_international");
    } catch (error) {
      console.error("Error loading order:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (stepNumber: number): boolean => {
    if (stepNumber === 1) {
      return !!formData.merchandiseType && !!formData.estimatedWeight;
    }
    if (stepNumber === 2) {
      return true; // Conditions are optional
    }
    if (stepNumber === 3) {
      return !!formData.pickupAddress && !!formData.deliveryAddress && !!formData.pickupDate;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      toast({ title: "Veuillez remplir les champs obligatoires", variant: "destructive" });
      return;
    }
    setStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      toast({ title: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }

    // Pour les bagages internationaux, montrer le flux escrow
    if (isBagagesInternational && !showEscrow) {
      setShowEscrow(true);
      return;
    }

    await completeBooking();
  };

  const completeBooking = async () => {
    setSubmitting(true);
    try {
      // Insert logistics data
      const { error: logisticsError } = await supabase
        .from("order_logistics")
        .insert({
          order_id: orderId,
          merchandise_type: formData.merchandiseType,
          merchandise_description: formData.merchandiseDescription || null,
          estimated_weight: parseFloat(formData.estimatedWeight),
          estimated_volume: formData.estimatedVolume || null,
          declared_value: formData.declaredValue ? parseInt(formData.declaredValue) : null,
          is_fragile: formData.isFragile,
          is_urgent: formData.isUrgent,
          special_conditions: formData.specialConditions || null,
          pickup_address: formData.pickupAddress,
          delivery_address: formData.deliveryAddress,
          pickup_date: new Date(formData.pickupDate).toISOString(),
          pickup_time_slot: formData.pickupTimeSlot || null,
          validated_at: new Date().toISOString(),
        });

      if (logisticsError) throw logisticsError;

      // Update order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          logistics_status: "submitted",
          weight: parseFloat(formData.estimatedWeight),
          total_price: Math.round(parseFloat(formData.estimatedWeight) * (order?.price_per_kg || 0)),
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Créer la conversation automatique avec message d'accroche
      if (userId && order) {
        await createAutoConversationAfterBooking(
          userId,
          order.gp_id,
          order.id,
          {
            orderNumber: order.order_number,
            originCity: order.origin_city,
            destinationCity: order.destination_city,
            gpName: order.gp_name || "Transporteur",
          }
        );
      }

      toast({ 
        title: "🎉 Réservation confirmée !", 
        description: "Téléchargez votre feuille logistique." 
      });
      navigate(`/order/${orderId}/qrcode`);
    } catch (error) {
      console.error("Submit error:", error);
      toast({ title: "Erreur lors de l'envoi", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscrowComplete = async () => {
    setShowEscrow(false);
    await completeBooking();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MiniLoader size="lg" showText text="Chargement..." />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Compléter la réservation</h1>
            <p className="text-sm text-muted-foreground">{order.order_number}</p>
          </div>
        </div>

        {/* Alert */}
        <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-xl mb-6">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            Ces informations sont <strong>obligatoires</strong> pour que le transporteur puisse traiter votre demande.
          </p>
        </div>

        {/* Transporter Info Card for Bagages International */}
        {isBagagesInternational && order && step === 1 && (
          <div className="mb-6">
            <TransporterInfoCard
              gpId={order.gp_id}
              originCity={order.origin_city}
              destinationCity={order.destination_city}
            />
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-6 h-1 mx-1 rounded ${step > s ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Marchandise */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Marchandise</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Type de marchandise *</Label>
                <Select
                  value={formData.merchandiseType}
                  onValueChange={(v) => handleInputChange("merchandiseType", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    {merchandiseTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Décrivez votre colis..."
                  className="mt-1"
                  value={formData.merchandiseDescription}
                  onChange={(e) => handleInputChange("merchandiseDescription", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Poids estimé (kg) *</Label>
                  <Input
                    type="number"
                    placeholder="0.5"
                    className="mt-1"
                    value={formData.estimatedWeight}
                    onChange={(e) => handleInputChange("estimatedWeight", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Volume (optionnel)</Label>
                  <Input
                    placeholder="ex: 30x20x15 cm"
                    className="mt-1"
                    value={formData.estimatedVolume}
                    onChange={(e) => handleInputChange("estimatedVolume", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Valeur déclarée (FCFA)</Label>
                <Input
                  type="number"
                  placeholder="Optionnel"
                  className="mt-1"
                  value={formData.declaredValue}
                  onChange={(e) => handleInputChange("declaredValue", e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Conditions */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Conditions</h2>
            </div>

            <div className="space-y-4">
              <div className="mobile-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">Fragile</p>
                    <p className="text-xs text-muted-foreground">Manipulation délicate requise</p>
                  </div>
                </div>
                <Switch
                  checked={formData.isFragile}
                  onCheckedChange={(v) => handleInputChange("isFragile", v)}
                />
              </div>

              <div className="mobile-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium">Urgent</p>
                    <p className="text-xs text-muted-foreground">Livraison prioritaire</p>
                  </div>
                </div>
                <Switch
                  checked={formData.isUrgent}
                  onCheckedChange={(v) => handleInputChange("isUrgent", v)}
                />
              </div>

              <div>
                <Label>Spécificités transport (optionnel)</Label>
                <Textarea
                  placeholder="Conditions particulières de transport..."
                  className="mt-1"
                  value={formData.specialConditions}
                  onChange={(e) => handleInputChange("specialConditions", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: température contrôlée, position verticale, etc.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Logistique */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Logistique</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Adresse de chargement *</Label>
                <Textarea
                  placeholder="Adresse complète de prise en charge..."
                  className="mt-1"
                  value={formData.pickupAddress}
                  onChange={(e) => handleInputChange("pickupAddress", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ville: {order.origin_city}
                </p>
              </div>

              <div>
                <Label>Adresse de livraison *</Label>
                <Textarea
                  placeholder="Adresse complète de livraison..."
                  className="mt-1"
                  value={formData.deliveryAddress}
                  onChange={(e) => handleInputChange("deliveryAddress", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ville: {order.destination_city}
                </p>
              </div>

              <div>
                <Label>Date de prise en charge *</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={formData.pickupDate}
                  onChange={(e) => handleInputChange("pickupDate", e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label>Plage horaire (optionnel)</Label>
                <Select
                  value={formData.pickupTimeSlot}
                  onValueChange={(v) => handleInputChange("pickupTimeSlot", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner une plage" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Récapitulatif */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Récapitulatif</h2>
            </div>

            <div className="mobile-card space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Marchandise</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Type:</span>
                <span>{merchandiseTypes.find(t => t.value === formData.merchandiseType)?.label}</span>
                <span className="text-muted-foreground">Poids:</span>
                <span>{formData.estimatedWeight} kg</span>
                {formData.declaredValue && (
                  <>
                    <span className="text-muted-foreground">Valeur:</span>
                    <span>{parseInt(formData.declaredValue).toLocaleString()} FCFA</span>
                  </>
                )}
              </div>
            </div>

            <div className="mobile-card space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Conditions</h3>
              <div className="flex gap-2">
                {formData.isFragile && (
                  <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded-full">
                    Fragile
                  </span>
                )}
                {formData.isUrgent && (
                  <span className="px-2 py-1 bg-warning/10 text-warning text-xs rounded-full">
                    Urgent
                  </span>
                )}
                {!formData.isFragile && !formData.isUrgent && (
                  <span className="text-sm text-muted-foreground">Standard</span>
                )}
              </div>
            </div>

            <div className="mobile-card space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Logistique</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  <div>
                    <p className="font-medium">{order.origin_city}</p>
                    <p className="text-xs text-muted-foreground">{formData.pickupAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5" />
                  <div>
                    <p className="font-medium">{order.destination_city}</p>
                    <p className="text-xs text-muted-foreground">{formData.deliveryAddress}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{new Date(formData.pickupDate).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}</span>
                </div>
                {formData.pickupTimeSlot && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{timeSlots.find(s => s.value === formData.pickupTimeSlot)?.label}</span>
                  </div>
                )}
              </div>
            </div>

            {isBagagesInternational && (
              <div className="p-4 bg-primary/10 rounded-xl flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Paiement sécurisé par séquestre</p>
                  <p className="text-xs text-muted-foreground">
                    Votre paiement sera conservé en sécurité et libéré au transporteur une fois la livraison confirmée.
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="text-sm text-muted-foreground text-center">
                ⚠️ Après validation, ces informations seront transmises au transporteur. 
                Vous ne pourrez plus les modifier après son acceptation.
              </p>
            </div>
          </motion.div>
        )}

        {/* Escrow Payment Flow */}
        {showEscrow && order && userId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Paiement sécurisé</h2>
            </div>
            
            <EscrowPaymentFlow
              orderId={order.id}
              amount={parseFloat(formData.estimatedWeight) * order.price_per_kg}
              gpId={order.gp_id}
              onPaymentComplete={handleEscrowComplete}
              onCancel={() => setShowEscrow(false)}
            />
          </motion.div>
        )}

        {/* Navigation - Hide when showing escrow */}
        {!showEscrow && (
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Retour
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={handleNext} className="flex-1">
                Continuer
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                className="flex-1 gap-2"
              >
                {isBagagesInternational && <CreditCard className="w-4 h-4" />}
                {submitting ? "Envoi..." : isBagagesInternational ? "Passer au paiement" : "Valider et transmettre"}
              </Button>
            )}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
