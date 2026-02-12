/**
 * CreateManualParcelDialog — Form for GP to register a manual (off-platform) parcel
 * 
 * Commission: 3% fixed, deducted from wallet or added to debt.
 * No escrow, no insurance, no KTP bonus.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Package, User, Phone, MapPin, Scale, DollarSign,
  FileText, AlertTriangle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CreateManualParcelDialogProps {
  open: boolean;
  onClose: () => void;
  gpId: string;
  gpCurrency?: string;
  onSuccess?: () => void;
}

export function CreateManualParcelDialog({
  open, onClose, gpId, gpCurrency = "XOF", onSuccess
}: CreateManualParcelDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [weight, setWeight] = useState("");
  const [parcelType, setParcelType] = useState("kilo");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [declaredValue, setDeclaredValue] = useState("");
  const [notes, setNotes] = useState("");
  const [initialStatus, setInitialStatus] = useState("collected");

  const commission = Math.round(parseFloat(amountPaid || "0") * 0.03);

  const resetForm = () => {
    setClientName("");
    setClientPhone("");
    setOriginCity("");
    setDestinationCity("");
    setWeight("");
    setParcelType("kilo");
    setAmountPaid("");
    setPaymentMode("cash");
    setDeclaredValue("");
    setNotes("");
    setInitialStatus("collected");
  };

  const handleSubmit = async () => {
    if (!clientName || !clientPhone || !originCity || !destinationCity || !weight || !amountPaid) {
      toast({ title: "Champs requis manquants", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(amountPaid);
      const commissionAmount = Math.round(amount * 0.03);

      // 1. Create manual parcel
      const { data: parcel, error: parcelError } = await supabase
        .from("manual_parcels")
        .insert({
          gp_id: gpId,
          client_name: clientName,
          client_phone: clientPhone,
          origin_city: originCity,
          destination_city: destinationCity,
          weight: parseFloat(weight),
          parcel_type: parcelType,
          amount_paid: amount,
          currency: gpCurrency,
          payment_mode: paymentMode,
          declared_value: declaredValue ? parseFloat(declaredValue) : null,
          notes: notes || null,
          status: initialStatus,
          commission_amount: commissionAmount,
        })
        .select("id, order_number")
        .single();

      if (parcelError) throw parcelError;

      // 2. Log commission in ledger
      await supabase.from("konnekt_ledger").insert({
        type: "manual_commission",
        order_id: null,
        gp_id: gpId,
        amount_fcfa: commissionAmount,
        amount_display: commissionAmount,
        currency_display: gpCurrency,
        status: "completed",
        description: `Commission 3% colis manuel ${parcel.order_number}`,
        reference: parcel.id,
      });

      // 3. Try to deduct from wallet
      const { data: wallet } = await supabase
        .from("gp_wallets")
        .select("balance, commission_due")
        .eq("gp_id", gpId)
        .maybeSingle();

      if (wallet && wallet.balance >= commissionAmount) {
        await supabase.from("gp_wallets").update({
          balance: wallet.balance - commissionAmount,
        }).eq("gp_id", gpId);

        await supabase.from("manual_parcels").update({
          commission_deducted: true,
        }).eq("id", parcel.id);
      } else if (wallet) {
        // Add to commission debt
        await supabase.from("gp_wallets").update({
          commission_due: (wallet.commission_due || 0) + commissionAmount,
        }).eq("gp_id", gpId);
      }

      toast({
        title: "Colis manuel créé",
        description: `${parcel.order_number} · Commission ${commissionAmount} ${gpCurrency}`,
      });

      resetForm();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            Nouveau colis manuel
          </DialogTitle>
          <DialogDescription>
            Enregistrez un colis pris hors plateforme. Commission 3% automatique.
          </DialogDescription>
        </DialogHeader>

        {/* Warning banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Hors protection Konnekt</p>
            <p className="mt-0.5">Pas d'assurance, pas de litige, pas de bonus KTP.</p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {/* Client info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <User className="w-3 h-3" /> Nom client *
              </Label>
              <Input
                placeholder="Amadou Diallo"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Phone className="w-3 h-3" /> Téléphone *
              </Label>
              <Input
                placeholder="+221 77 000 0000"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Route */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Ville départ *
              </Label>
              <Input
                placeholder="Dakar"
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Ville arrivée *
              </Label>
              <Input
                placeholder="Paris"
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Parcel details */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Scale className="w-3 h-3" /> Poids (kg) *
              </Label>
              <Input
                type="number"
                placeholder="5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={parcelType} onValueChange={setParcelType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kilo">Kilo</SelectItem>
                  <SelectItem value="forfait_23kg">Forfait 23kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Statut initial</Label>
              <Select value={initialStatus} onValueChange={setInitialStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collected">Collecté</SelectItem>
                  <SelectItem value="accepted">Prévu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Montant payé ({gpCurrency}) *
              </Label>
              <Input
                type="number"
                placeholder="15000"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Mode paiement</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="transfer">Transfert</SelectItem>
                  <SelectItem value="unpaid">Non payé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional fields */}
          <div>
            <Label className="text-xs">Valeur déclarée (optionnel)</Label>
            <Input
              type="number"
              placeholder="Ex: 50000"
              value={declaredValue}
              onChange={(e) => setDeclaredValue(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">
              <FileText className="w-3 h-3" /> Notes internes
            </Label>
            <Textarea
              placeholder="Notes sur le colis..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 min-h-[60px]"
            />
          </div>

          {/* Commission preview */}
          {parseFloat(amountPaid || "0") > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border"
            >
              <span className="text-sm text-muted-foreground">Commission 3%</span>
              <span className="font-bold text-foreground">{commission.toLocaleString()} {gpCurrency}</span>
            </motion.div>
          )}
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={loading || !clientName || !clientPhone || !originCity || !destinationCity || !weight || !amountPaid}
          className="w-full mt-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />}
          Créer le colis manuel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
