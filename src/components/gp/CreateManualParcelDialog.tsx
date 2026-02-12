/**
 * CreateManualParcelDialog — Form for GP to register a manual (off-platform) parcel
 * 
 * Commission: 3% fixed, deducted from wallet or added to debt.
 * No escrow, no insurance, no KTP bonus.
 * 
 * Route is locked to GP's existing scheduled departures (gp_offers).
 * If no upcoming departure exists, manual parcel creation is blocked.
 */
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Package, User, Phone, Scale, DollarSign,
  FileText, AlertTriangle, Loader2, CalendarDays, Plane
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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

interface Departure {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  arrival_date: string | null;
  available_capacity: number;
  currency: string;
}

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
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loadingDepartures, setLoadingDepartures] = useState(true);

  // Form state
  const [selectedDepartureId, setSelectedDepartureId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [weight, setWeight] = useState("");
  const [parcelType, setParcelType] = useState("kilo");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [declaredValue, setDeclaredValue] = useState("");
  const [notes, setNotes] = useState("");
  const [initialStatus, setInitialStatus] = useState("collected");

  const selectedDeparture = useMemo(
    () => departures.find(d => d.id === selectedDepartureId),
    [departures, selectedDepartureId]
  );

  const commission = Math.round(parseFloat(amountPaid || "0") * 0.03);

  // Fetch GP's upcoming departures
  useEffect(() => {
    if (!open || !gpId) return;
    setLoadingDepartures(true);
    supabase
      .from("gp_offers")
      .select("id, origin_city, origin_country, destination_city, destination_country, departure_date, arrival_date, available_capacity, currency")
      .eq("gp_id", gpId)
      .eq("status", "active")
      .gte("departure_date", new Date().toISOString())
      .order("departure_date", { ascending: true })
      .then(({ data }) => {
        setDepartures(data || []);
        setLoadingDepartures(false);
      });
  }, [open, gpId]);

  const resetForm = () => {
    setSelectedDepartureId("");
    setClientName("");
    setClientPhone("");
    setWeight("");
    setParcelType("kilo");
    setAmountPaid("");
    setPaymentMode("cash");
    setDeclaredValue("");
    setNotes("");
    setInitialStatus("collected");
  };

  const handleSubmit = async () => {
    if (!selectedDeparture || !clientName || !clientPhone || !weight || !amountPaid) {
      toast({ title: "Champs requis manquants", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(amountPaid);
      const commissionAmount = Math.round(amount * 0.03);

      const { data: parcel, error: parcelError } = await supabase
        .from("manual_parcels")
        .insert({
          gp_id: gpId,
          client_name: clientName,
          client_phone: clientPhone,
          origin_city: selectedDeparture.origin_city,
          destination_city: selectedDeparture.destination_city,
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

  const noDepartures = !loadingDepartures && departures.length === 0;

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

        {/* No departures blocker */}
        {noDepartures && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">Aucun départ programmé</p>
              <p className="text-xs text-muted-foreground mt-1">
                Vous devez avoir au moins un voyage actif pour enregistrer un colis manuel.
                Créez d'abord un départ depuis votre calendrier.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              Fermer
            </Button>
          </div>
        )}

        {loadingDepartures && (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement des départs…
          </div>
        )}

        {!noDepartures && !loadingDepartures && (
          <>
            <div className="space-y-4 pt-2">
              {/* Departure selector */}
              <div>
                <Label className="text-xs flex items-center gap-1 mb-1">
                  <Plane className="w-3 h-3" /> Départ associé *
                </Label>
                <Select value={selectedDepartureId} onValueChange={setSelectedDepartureId}>
                  <SelectTrigger className={cn(!selectedDepartureId && "text-muted-foreground")}>
                    <SelectValue placeholder="Choisir un départ programmé" />
                  </SelectTrigger>
                  <SelectContent>
                    {departures.map((dep) => (
                      <SelectItem key={dep.id} value={dep.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">
                            {dep.origin_city} → {dep.destination_city}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(dep.departure_date), "d MMM yyyy", { locale: fr })}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {dep.available_capacity} kg dispo
                          </Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected departure summary */}
              {selectedDeparture && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/5 border border-primary/20"
                >
                  <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">
                      {selectedDeparture.origin_city} → {selectedDeparture.destination_city}
                    </p>
                    <p className="text-muted-foreground">
                      Départ {format(new Date(selectedDeparture.departure_date), "EEEE d MMMM yyyy", { locale: fr })}
                      {selectedDeparture.arrival_date && (
                        <> · Arrivée {format(new Date(selectedDeparture.arrival_date), "d MMM", { locale: fr })}</>
                      )}
                      {" · "}{selectedDeparture.available_capacity} kg disponibles
                    </p>
                  </div>
                </motion.div>
              )}

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
              disabled={loading || !selectedDepartureId || !clientName || !clientPhone || !weight || !amountPaid}
              className="w-full mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />}
              Créer le colis manuel
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
