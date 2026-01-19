import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Shield, Lock, CheckCircle, AlertCircle, CreditCard, 
  Wallet, ArrowRight, Clock, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface EscrowPaymentFlowProps {
  orderId: string;
  amount: number;
  currency?: string;
  gpId: string;
  onPaymentComplete?: () => void;
  onCancel?: () => void;
}

const paymentMethods = [
  { id: "mobile_money", label: "Mobile Money", icon: Wallet, description: "Orange Money, MTN, Wave" },
  { id: "card", label: "Carte bancaire", icon: CreditCard, description: "Visa, Mastercard" },
];

export function EscrowPaymentFlow({
  orderId,
  amount,
  currency = "XOF",
  gpId,
  onPaymentComplete,
  onCancel,
}: EscrowPaymentFlowProps) {
  const [step, setStep] = useState<"method" | "confirm" | "processing" | "success">("method");
  const [selectedMethod, setSelectedMethod] = useState<string>("mobile_money");
  const [loading, setLoading] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  const handlePayment = async () => {
    setLoading(true);
    setStep("processing");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Create escrow transaction
      const { data: escrow, error: escrowError } = await supabase
        .from("escrow_transactions")
        .insert({
          order_id: orderId,
          client_id: user.id,
          gp_id: gpId,
          amount: amount,
          currency: currency,
          status: "held",
          payment_method: selectedMethod,
          payment_reference: `ESC-${Date.now()}`,
          held_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (escrowError) throw escrowError;

      // Update order with payment status
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          payment_status: "held",
          escrow_id: escrow.id,
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      setStep("success");
      toast({
        title: "Paiement sécurisé",
        description: "Votre paiement est en séquestre jusqu'à la livraison.",
      });

      setTimeout(() => {
        onPaymentComplete?.();
      }, 2000);

    } catch (error: any) {
      console.error("Payment error:", error);
      setStep("method");
      toast({
        title: "Erreur de paiement",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <CardTitle>Paiement sécurisé par séquestre</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Votre argent est protégé jusqu'à la livraison
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Amount Display */}
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">Montant à payer</p>
          <p className="text-3xl font-bold text-foreground">
            {formatPrice(amount)} <span className="text-lg">{currency}</span>
          </p>
        </div>

        {/* Step: Select Payment Method */}
        {step === "method" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <RadioGroup
              value={selectedMethod}
              onValueChange={setSelectedMethod}
              className="space-y-3"
            >
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div
                    key={method.id}
                    className={`relative flex items-center space-x-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                      selectedMethod === method.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedMethod(method.id)}
                  >
                    <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={method.id} className="font-medium cursor-pointer">
                        {method.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                    {selectedMethod === method.id && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                );
              })}
            </RadioGroup>

            {/* Security Info */}
            <div className="bg-success/10 border border-success/20 rounded-lg p-3 flex gap-3">
              <Lock className="w-5 h-5 text-success shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-success">Protection garantie</p>
                <p className="text-muted-foreground">
                  Fonds libérés au GP uniquement après confirmation de livraison
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={() => setStep("confirm")}>
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Mode de paiement</span>
                <span className="font-medium">
                  {paymentMethods.find(m => m.id === selectedMethod)?.label}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-medium">{formatPrice(amount)} {currency}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Frais de service</span>
                <Badge variant="success">Gratuit</Badge>
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex gap-3">
              <Info className="w-5 h-5 text-warning shrink-0" />
              <p className="text-sm text-muted-foreground">
                En confirmant, vous acceptez de bloquer ce montant jusqu'à la livraison effective de votre colis.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("method")}>
                Retour
              </Button>
              <Button className="flex-1" onClick={handlePayment} disabled={loading}>
                <Lock className="w-4 h-4 mr-2" />
                Payer en séquestre
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-8 text-center"
          >
            <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <p className="font-medium">Traitement en cours...</p>
            <p className="text-sm text-muted-foreground">Veuillez patienter</p>
          </motion.div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <p className="font-medium text-lg">Paiement sécurisé !</p>
            <p className="text-sm text-muted-foreground mt-2">
              Vos fonds sont en séquestre. Le GP sera payé après la livraison.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Redirection automatique...
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
