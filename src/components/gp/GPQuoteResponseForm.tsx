import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Send, MapPin, Calendar, Clock, Truck, 
  CreditCard, FileText, CheckCircle, Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CustomRequest {
  id: string;
  request_number: string;
  shipment_type: string;
  description: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  weight_estimate: number | null;
  volume_estimate: string | null;
  transport_type: string | null;
  pickup_date_from: string | null;
  pickup_date_to: string | null;
  budget_min: number | null;
  budget_max: number | null;
  is_urgent: boolean;
  is_fragile: boolean;
  additional_services: string[] | null;
}

interface GPQuoteResponseFormProps {
  request: CustomRequest;
  gpId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function GPQuoteResponseForm({ 
  request, 
  gpId, 
  open, 
  onOpenChange,
  onSuccess 
}: GPQuoteResponseFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    price: "",
    currency: "FCFA",
    pickupDate: "",
    deliveryDays: "",
    transportType: request.transport_type || "",
    includeInsurance: false,
    insuranceAmount: "",
    includePackaging: false,
    packagingDetails: "",
    doorToDoor: true,
    specialConditions: "",
    message: "",
  });

  const shipmentTypeLabels: Record<string, string> = {
    parcel: "Colis",
    moving: "Déménagement",
    goods: "Marchandises",
    vehicle: "Véhicule",
    other: "Autre",
  };

  const handleSubmit = async () => {
    if (!formData.price) {
      toast({
        title: "Erreur",
        description: "Veuillez indiquer un prix",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Build comprehensive message
      let fullMessage = formData.message || "";
      
      if (formData.includeInsurance && formData.insuranceAmount) {
        fullMessage += `\n• Assurance incluse: ${formData.insuranceAmount} ${formData.currency}`;
      }
      if (formData.includePackaging && formData.packagingDetails) {
        fullMessage += `\n• Emballage: ${formData.packagingDetails}`;
      }
      if (formData.doorToDoor) {
        fullMessage += `\n• Service porte-à-porte inclus`;
      }
      if (formData.specialConditions) {
        fullMessage += `\n• Conditions spéciales: ${formData.specialConditions}`;
      }

      const { error } = await supabase.from("custom_request_responses").insert({
        request_id: request.id,
        gp_id: gpId,
        price_proposed: parseInt(formData.price),
        currency: formData.currency,
        message: fullMessage.trim() || null,
        available_pickup_date: formData.pickupDate || null,
        estimated_delivery_days: formData.deliveryDays ? parseInt(formData.deliveryDays) : null,
      });

      if (error) throw error;

      toast({ 
        title: "Devis envoyé", 
        description: "Le client a été notifié de votre proposition" 
      });
      
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setFormData({
        price: "",
        currency: "FCFA",
        pickupDate: "",
        deliveryDays: "",
        transportType: "",
        includeInsurance: false,
        insuranceAmount: "",
        includePackaging: false,
        packagingDetails: "",
        doorToDoor: true,
        specialConditions: "",
        message: "",
      });
    } catch (error: any) {
      console.error("Error submitting quote:", error);
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible d'envoyer le devis",
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Proposer un devis détaillé
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request Summary */}
          <Card className="bg-muted/50">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{shipmentTypeLabels[request.shipment_type] || request.shipment_type}</Badge>
                {request.is_urgent && <Badge className="bg-red-100 text-red-700">Urgent</Badge>}
                {request.is_fragile && <Badge className="bg-yellow-100 text-yellow-700">Fragile</Badge>}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">{request.origin_city}</span>
                <span>→</span>
                <span className="font-medium">{request.destination_city}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{request.description}</p>
              
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                {request.weight_estimate && <span>~{request.weight_estimate} kg</span>}
                {request.volume_estimate && <span>• {request.volume_estimate}</span>}
              </div>
              
              {request.budget_min && request.budget_max && (
                <p className="text-sm mt-2">
                  <span className="text-muted-foreground">Budget client:</span>{" "}
                  <span className="font-medium">{request.budget_min.toLocaleString()} - {request.budget_max.toLocaleString()} FCFA</span>
                </p>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Price Section */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Prix proposé *</Label>
              <div className="relative mt-1">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Ex: 25000"
                  className="pl-10"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Devise</Label>
              <Select 
                value={formData.currency} 
                onValueChange={(v) => setFormData({ ...formData, currency: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FCFA">FCFA</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Delivery */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Date de collecte</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-10"
                  value={formData.pickupDate}
                  onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Délai (jours)</Label>
              <div className="relative mt-1">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Ex: 3"
                  className="pl-10"
                  value={formData.deliveryDays}
                  onChange={(e) => setFormData({ ...formData, deliveryDays: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Transport Type */}
          <div>
            <Label className="text-sm font-medium">Type de transport</Label>
            <Select 
              value={formData.transportType} 
              onValueChange={(v) => setFormData({ ...formData, transportType: v })}
            >
              <SelectTrigger className="mt-1">
                <Truck className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="express">Express</SelectItem>
                <SelectItem value="routier">Routier</SelectItem>
                <SelectItem value="maritime">Maritime</SelectItem>
                <SelectItem value="aerien">Aérien</SelectItem>
                <SelectItem value="voyageur">Voyageur GP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Services inclus */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Services inclus</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="doorToDoor" 
                checked={formData.doorToDoor}
                onCheckedChange={(checked) => setFormData({ ...formData, doorToDoor: !!checked })}
              />
              <label htmlFor="doorToDoor" className="text-sm">
                Service porte-à-porte
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="insurance" 
                  checked={formData.includeInsurance}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeInsurance: !!checked })}
                />
                <label htmlFor="insurance" className="text-sm">
                  Assurance incluse
                </label>
              </div>
              {formData.includeInsurance && (
                <Input
                  type="number"
                  placeholder="Montant assurance (optionnel)"
                  value={formData.insuranceAmount}
                  onChange={(e) => setFormData({ ...formData, insuranceAmount: e.target.value })}
                  className="ml-6"
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="packaging" 
                  checked={formData.includePackaging}
                  onCheckedChange={(checked) => setFormData({ ...formData, includePackaging: !!checked })}
                />
                <label htmlFor="packaging" className="text-sm">
                  Emballage professionnel
                </label>
              </div>
              {formData.includePackaging && (
                <Input
                  placeholder="Détails emballage..."
                  value={formData.packagingDetails}
                  onChange={(e) => setFormData({ ...formData, packagingDetails: e.target.value })}
                  className="ml-6"
                />
              )}
            </div>
          </div>

          {/* Conditions spéciales */}
          <div>
            <Label className="text-sm font-medium">Conditions spéciales</Label>
            <Input
              placeholder="Manutention, horaires spéciaux..."
              className="mt-1"
              value={formData.specialConditions}
              onChange={(e) => setFormData({ ...formData, specialConditions: e.target.value })}
            />
          </div>

          {/* Message */}
          <div>
            <Label className="text-sm font-medium">Message au client</Label>
            <Textarea
              placeholder="Présentez votre offre, vos atouts..."
              className="mt-1"
              rows={3}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.price || submitting}>
            {submitting ? (
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer le devis
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
