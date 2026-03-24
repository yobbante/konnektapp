/**
 * DeliveryConfirmation — Public page for external recipients
 * Route: /deliver/:orderId
 * 
 * Flow:
 * 1. Show order summary (sender, route, status)
 * 2. Ask for delivery code (displayed on GP's screen)
 * 3. Ask phone number for confirmation
 * 4. On success → incitation to create Konnekt account
 */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, CheckCircle, Shield, ArrowRight,
  Phone, KeyRound, Sparkles, User, MapPin, Plane
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneInputWithCode } from "@/components/ui/PhoneInputWithCode";

type Step = "loading" | "confirm" | "success" | "signup" | "error" | "already_confirmed";

export default function DeliveryConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const [step, setStep] = useState<Step>("loading");
  const [order, setOrder] = useState<any>(null);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) { setStep("error"); return; }

    const { data, error: err } = await supabase
      .from("orders")
      .select("id, order_number, origin_city, destination_city, status, delivery_code, delivery_confirmed_at, recipient_name")
      .eq("id", orderId)
      .maybeSingle();

    if (err || !data) {
      setStep("error");
      return;
    }

    setOrder(data);

    if (data.delivery_confirmed_at) {
      setStep("already_confirmed");
    } else {
      setStep("confirm");
    }
  };

  const handleConfirm = async () => {
    if (!code.trim()) { setError("Veuillez entrer le code de remise"); return; }
    if (!phone.trim() || phone.length < 8) { setError("Numéro de téléphone invalide"); return; }
    if (code.toUpperCase() !== order?.delivery_code?.toUpperCase()) {
      setError("Code incorrect. Vérifiez auprès du transporteur.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Update order as confirmed
      await supabase.from("orders").update({
        delivery_confirmed_at: new Date().toISOString(),
        delivery_confirmed_by_phone: phone.trim(),
      }).eq("id", orderId);

      // Log the confirmation
      await supabase.from("delivery_confirmations").insert({
        order_id: orderId!,
        confirmed_by_phone: phone.trim(),
        confirmed_by_name: name.trim() || null,
      });

      setStep("success");
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = () => {
    // Redirect to signup with phone pre-filled
    window.location.href = `/auth?mode=signup&phone=${encodeURIComponent(phone)}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Konnekt</h1>
            <p className="text-sm opacity-80">Confirmation de réception</p>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* Loading */}
          {step === "loading" && (
            <motion.div key="loading" className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </motion.div>
          )}

          {/* Error */}
          {step === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 space-y-4">
              <Package className="w-12 h-12 text-muted-foreground mx-auto" />
              <h2 className="text-lg font-bold">Commande introuvable</h2>
              <p className="text-sm text-muted-foreground">Ce lien n'est pas valide ou la commande n'est plus disponible.</p>
            </motion.div>
          )}

          {/* Already confirmed */}
          {step === "already_confirmed" && (
            <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">Déjà confirmé</h2>
              <p className="text-sm text-muted-foreground">La réception de ce colis a déjà été confirmée.</p>
            </motion.div>
          )}

          {/* Confirmation form */}
          {step === "confirm" && order && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Order info */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-mono">{order.order_number}</Badge>
                    <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs">
                      {order.status === "in_transit" ? "En transit" : "Prêt"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{order.origin_city}</span>
                    <Plane className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium">{order.destination_city}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Un colis vous attend ! Confirmez la réception ci-dessous.
                  </p>
                </CardContent>
              </Card>

              {/* Security notice */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Pour sécuriser la remise, entrez le code affiché sur l'écran du transporteur.
                </p>
              </div>

              {/* Code input */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" /> Code de remise *
                </Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: A3F9K2"
                  className="h-14 text-center text-2xl font-mono tracking-[0.3em] uppercase rounded-xl border-2 border-primary/30"
                  maxLength={6}
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" /> Votre téléphone *
                </Label>
                <PhoneInputWithCode
                  value={phone}
                  onChange={setPhone}
                  size="lg"
                  className="rounded-xl"
                />
              </div>

              {/* Name (optional) */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" /> Votre nom (optionnel)
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Prénom Nom"
                  className="h-12 rounded-xl"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center font-medium">{error}</p>
              )}

              <Button
                onClick={handleConfirm}
                disabled={loading || !code || !phone}
                className="w-full h-14 text-base rounded-xl gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirmer la réception
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Success + Signup Incitation */}
          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              {/* Confirmation */}
              <div className="text-center py-8 space-y-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto"
                >
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </motion.div>
                <h2 className="text-2xl font-bold">Colis reçu !</h2>
                <p className="text-muted-foreground">
                  La réception a été confirmée avec succès.
                </p>
              </div>

              {/* Signup CTA */}
              <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Rejoignez Konnekt</h3>
                      <p className="text-xs text-muted-foreground">Gratuit, 1 minute</p>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {[
                      "Recevez vos colis plus rapidement",
                      "Suivez vos envois en temps réel",
                      "Évitez les confirmations manuelles",
                      "Historique complet de vos réceptions",
                    ].map((text, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        {text}
                      </li>
                    ))}
                  </ul>

                  <Button onClick={handleSignup} className="w-full h-12 rounded-xl gap-2">
                    Créer mon compte
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <p className="text-[11px] text-center text-muted-foreground">
                    Votre numéro {phone} sera pré-rempli
                  </p>
                </CardContent>
              </Card>

              <button
                onClick={() => setStep("confirm")}
                className="text-sm text-muted-foreground text-center w-full hover:underline"
              >
                Non merci, peut-être plus tard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}